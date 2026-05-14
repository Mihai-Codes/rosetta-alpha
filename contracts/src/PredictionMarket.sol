// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";

import {IPriceOracle} from "./IPriceOracle.sol";

/**
 * @title PredictionMarket
 * @notice Resolves Rosetta Alpha reasoning traces against price oracles.
 *         Closes the accountability loop: wrong predictions get slashed,
 *         correct predictions earn rewards from the pool.
 *
 * Lifecycle (per traceHash):
 *   createMarket → PENDING → resolve → RESOLVED → settle → SETTLED
 *
 * Settlement math:
 *   priceChangeBp = (exitPrice - entryPrice) * 10000 / entryPrice   (signed)
 *   threshold     = thresholdBp                                      (default 100 = 1%)
 *
 *   correct =
 *     (LONG    && priceChangeBp >  threshold)  ||
 *     (SHORT   && priceChangeBp < -threshold)  ||
 *     (NEUTRAL && |priceChangeBp| <= threshold)
 *
 *   slashAmount  = stakeAmount * confidenceBp / 10000   // wrong
 *   rewardAmount = stakeAmount * confidenceBp / 10000   // correct
 *
 * Integration:
 *   - ReasoningRegistry: traceHash must exist (validated at createMarket).
 *   - RosettaToken:      this contract MUST be granted slasher role.
 *   - IPriceOracle:      pluggable — OwnerPriceOracle for hackathon, swap later.
 *
 * Security (per AGENTS.md §6):
 *   - OZ Ownable + ReentrancyGuard.
 *   - Custom errors (gas-efficient).
 *   - Reentrancy guard on settle (external slash + transfer).
 *   - One market per traceHash (idempotent createMarket).
 *   - Permissionless settle — outcome is deterministic.
 */

interface IReasoningRegistryView {
    /// @dev Returns just enough fields to know the trace exists.
    function traces(bytes32 traceHash)
        external
        view
        returns (
            bytes32, // traceHash echo
            string memory, // ipfsCid
            uint8,  // region
            uint8,  // assetClass
            uint256, // timestamp
            address  // submitter
        );
}

interface IRosettaTokenSlasher {
    function slash(address agent, uint256 amount) external;
    function transfer(address to, uint256 amount) external returns (bool);
}

contract PredictionMarket is Ownable, ReentrancyGuard {
    // -----------------------------------------------------------------------
    // Types
    // -----------------------------------------------------------------------

    enum Direction { LONG, SHORT, NEUTRAL }
    enum Status    { PENDING, RESOLVED, SETTLED }

    struct Market {
        address agent;
        uint256 stakeAmount;
        uint256 entryPrice;       // 1e8 fixed-point
        uint256 exitPrice;        // set at resolve()
        uint64  createdAt;
        uint64  resolvesAt;       // earliest time resolve() can be called
        uint64  resolvedAt;       // when resolve() was actually called
        uint16  confidenceBp;     // 0..10000
        Direction direction;
        Status    status;
        bytes32  assetKey;        // keccak256(ticker) used for oracle lookup
        bool     wasCorrect;      // set at resolve()
    }

    // -----------------------------------------------------------------------
    // Storage
    // -----------------------------------------------------------------------

    IReasoningRegistryView public immutable registry;
    IRosettaTokenSlasher  public immutable token;
    IPriceOracle          public oracle;

    mapping(bytes32 => Market) public markets;
    bytes32[] public marketHashes;

    /// @notice Neutrality band in basis points (1bp = 0.01%). Default 1% = 100bp.
    uint16 public thresholdBp = 100;

    /// @notice Seconds between resolve() and settle() — gives time to dispute oracle.
    uint32 public disputeWindowSec = 1 hours;

    /// @notice Reward pool — funded by owner, drained by correct settlements.
    uint256 public rewardPool;

    // -----------------------------------------------------------------------
    // Events
    // -----------------------------------------------------------------------

    event MarketCreated(
        bytes32 indexed traceHash,
        address indexed agent,
        bytes32 indexed assetKey,
        Direction direction,
        uint16 confidenceBp,
        uint256 entryPrice,
        uint256 stakeAmount,
        uint64 resolvesAt
    );

    event MarketResolved(
        bytes32 indexed traceHash,
        uint256 exitPrice,
        int256 priceChangeBp,
        bool wasCorrect
    );

    event MarketSettled(
        bytes32 indexed traceHash,
        address indexed agent,
        bool wasCorrect,
        uint256 amount   // slashed if wrong, rewarded if correct
    );

    event ThresholdUpdated(uint16 oldBp, uint16 newBp);
    event DisputeWindowUpdated(uint32 oldSec, uint32 newSec);
    event OracleUpdated(address oldOracle, address newOracle);
    event RewardPoolFunded(uint256 amount, uint256 newTotal);
    event RewardPoolWithdrawn(uint256 amount, uint256 remaining);

    // -----------------------------------------------------------------------
    // Errors
    // -----------------------------------------------------------------------

    error TraceNotRegistered(bytes32 traceHash);
    error MarketAlreadyExists(bytes32 traceHash);
    error MarketDoesNotExist(bytes32 traceHash);
    error InvalidStatus(Status expected, Status actual);
    error TooEarlyToResolve(uint64 resolvesAt, uint64 nowTs);
    error TooEarlyToSettle(uint64 settlesAt, uint64 nowTs);
    error ZeroAmount();
    error ZeroPrice();
    error ConfidenceOutOfRange(uint16 bp);
    error InsufficientRewardPool(uint256 requested, uint256 available);

    // -----------------------------------------------------------------------
    // Constructor
    // -----------------------------------------------------------------------

    constructor(
        address initialOwner,
        address registryAddr,
        address tokenAddr,
        address oracleAddr
    ) Ownable(initialOwner) {
        require(registryAddr != address(0), "registry=0");
        require(tokenAddr   != address(0), "token=0");
        require(oracleAddr  != address(0), "oracle=0");
        registry = IReasoningRegistryView(registryAddr);
        token    = IRosettaTokenSlasher(tokenAddr);
        oracle   = IPriceOracle(oracleAddr);
    }

    // -----------------------------------------------------------------------
    // Admin
    // -----------------------------------------------------------------------

    function setThresholdBp(uint16 newBp) external onlyOwner {
        require(newBp <= 5000, "threshold > 50%"); // sanity cap
        emit ThresholdUpdated(thresholdBp, newBp);
        thresholdBp = newBp;
    }

    function setDisputeWindow(uint32 newSec) external onlyOwner {
        require(newSec <= 7 days, "window > 7d");
        emit DisputeWindowUpdated(disputeWindowSec, newSec);
        disputeWindowSec = newSec;
    }

    function setOracle(address newOracle) external onlyOwner {
        require(newOracle != address(0), "oracle=0");
        emit OracleUpdated(address(oracle), newOracle);
        oracle = IPriceOracle(newOracle);
    }

    /// @notice Owner deposits ROSETTA into the reward pool. Caller must approve first.
    function fundRewardPool(uint256 amount) external onlyOwner {
        if (amount == 0) revert ZeroAmount();
        // Pull tokens from owner — uses standard ERC20 transferFrom via IERC20.
        IERC20(address(token)).transferFrom(msg.sender, address(this), amount);
        rewardPool += amount;
        emit RewardPoolFunded(amount, rewardPool);
    }

    /// @notice Owner withdraws unused reward pool (e.g. wind-down).
    function withdrawRewardPool(uint256 amount) external onlyOwner {
        if (amount == 0) revert ZeroAmount();
        if (amount > rewardPool) revert InsufficientRewardPool(amount, rewardPool);
        rewardPool -= amount;
        require(token.transfer(msg.sender, amount), "transfer failed");
        emit RewardPoolWithdrawn(amount, rewardPool);
    }

    // -----------------------------------------------------------------------
    // Market lifecycle
    // -----------------------------------------------------------------------

    /**
     * @notice Create a market against an existing reasoning trace.
     * @dev Called by the Python pipeline AFTER the trace is recorded in the
     *      ReasoningRegistry and AFTER the agent stakes ROSETTA. The Python
     *      side reads its own thesis to fill in direction/confidence/horizon.
     *
     * @param traceHash      Hash of the reasoning trace in ReasoningRegistry.
     * @param agent          Address whose ROSETTA bond is at stake.
     * @param stakeAmount    Bond size (must match what was staked in token).
     * @param assetKey       keccak256(ticker) — used for oracle lookup.
     * @param direction      Bull/Bear/Neutral claim.
     * @param confidenceBp   Confidence in basis points (0–10000).
     * @param entryPrice     Asset price at trace creation, 1e8 fixed-point.
     * @param horizonDays    Days until resolve() may be called.
     */
    function createMarket(
        bytes32 traceHash,
        address agent,
        uint256 stakeAmount,
        bytes32 assetKey,
        Direction direction,
        uint16 confidenceBp,
        uint256 entryPrice,
        uint32 horizonDays
    ) external {
        if (markets[traceHash].createdAt != 0) revert MarketAlreadyExists(traceHash);
        if (stakeAmount == 0) revert ZeroAmount();
        if (entryPrice == 0)  revert ZeroPrice();
        if (confidenceBp > 10000) revert ConfidenceOutOfRange(confidenceBp);

        // Validate the trace exists in the registry (reverts internally if not).
        // We only need the submitter field as a smoke check.
        (, , , , uint256 ts, address submitter) = registry.traces(traceHash);
        if (ts == 0 || submitter == address(0)) revert TraceNotRegistered(traceHash);

        uint64 nowTs = uint64(block.timestamp);
        uint64 resolveTs = nowTs + uint64(horizonDays) * 1 days;

        markets[traceHash] = Market({
            agent:         agent,
            stakeAmount:   stakeAmount,
            entryPrice:    entryPrice,
            exitPrice:     0,
            createdAt:     nowTs,
            resolvesAt:    resolveTs,
            resolvedAt:    0,
            confidenceBp:  confidenceBp,
            direction:     direction,
            status:        Status.PENDING,
            assetKey:      assetKey,
            wasCorrect:    false
        });
        marketHashes.push(traceHash);

        emit MarketCreated(
            traceHash, agent, assetKey, direction, confidenceBp,
            entryPrice, stakeAmount, resolveTs
        );
    }

    /**
     * @notice Resolve a market — fetches exit price from oracle, computes correctness.
     *         Permissionless: anyone can call once `resolvesAt` has elapsed.
     */
    function resolve(bytes32 traceHash) external {
        Market storage m = markets[traceHash];
        if (m.createdAt == 0) revert MarketDoesNotExist(traceHash);
        if (m.status != Status.PENDING) revert InvalidStatus(Status.PENDING, m.status);

        uint64 nowTs = uint64(block.timestamp);
        if (nowTs < m.resolvesAt) revert TooEarlyToResolve(m.resolvesAt, nowTs);

        (uint256 exitPrice, ) = oracle.getPrice(m.assetKey);
        if (exitPrice == 0) revert ZeroPrice();

        // Compute signed price change in basis points: (exit - entry) * 10000 / entry
        int256 changeBp = (int256(exitPrice) - int256(m.entryPrice)) * 10000 / int256(m.entryPrice);
        int256 thr = int256(uint256(thresholdBp));

        bool correct;
        if (m.direction == Direction.LONG) {
            correct = changeBp > thr;
        } else if (m.direction == Direction.SHORT) {
            correct = changeBp < -thr;
        } else {
            // NEUTRAL: |change| <= threshold
            correct = (changeBp >= -thr) && (changeBp <= thr);
        }

        m.exitPrice  = exitPrice;
        m.resolvedAt = nowTs;
        m.wasCorrect = correct;
        m.status     = Status.RESOLVED;

        emit MarketResolved(traceHash, exitPrice, changeBp, correct);
    }

    /**
     * @notice Settle a resolved market — slash if wrong, reward if correct.
     *         Permissionless; can be called once dispute window has elapsed.
     */
    function settle(bytes32 traceHash) external nonReentrant {
        Market storage m = markets[traceHash];
        if (m.createdAt == 0) revert MarketDoesNotExist(traceHash);
        if (m.status != Status.RESOLVED) revert InvalidStatus(Status.RESOLVED, m.status);

        uint64 settlesAt = m.resolvedAt + uint64(disputeWindowSec);
        uint64 nowTs = uint64(block.timestamp);
        if (nowTs < settlesAt) revert TooEarlyToSettle(settlesAt, nowTs);

        // Confidence-scaled amount: high-conviction = bigger reward AND bigger slash.
        uint256 amount = (m.stakeAmount * uint256(m.confidenceBp)) / 10000;
        m.status = Status.SETTLED;

        if (m.wasCorrect) {
            // Reward from pool. Clamp to available pool size (graceful).
            uint256 payout = amount > rewardPool ? rewardPool : amount;
            if (payout > 0) {
                rewardPool -= payout;
                require(token.transfer(m.agent, payout), "reward transfer failed");
            }
            emit MarketSettled(traceHash, m.agent, true, payout);
        } else {
            // Slash agent's staked bond. Token contract clamps internally.
            if (amount > 0) {
                token.slash(m.agent, amount);
            }
            emit MarketSettled(traceHash, m.agent, false, amount);
        }
    }

    // -----------------------------------------------------------------------
    // Views
    // -----------------------------------------------------------------------

    function totalMarkets() external view returns (uint256) {
        return marketHashes.length;
    }

    function getMarket(bytes32 traceHash) external view returns (Market memory) {
        return markets[traceHash];
    }

    /// @notice Compute when settle() becomes callable (0 if not yet resolved).
    function settleableAt(bytes32 traceHash) external view returns (uint64) {
        Market memory m = markets[traceHash];
        if (m.resolvedAt == 0) return 0;
        return m.resolvedAt + uint64(disputeWindowSec);
    }
}
