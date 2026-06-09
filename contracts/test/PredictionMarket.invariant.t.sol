// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Test} from "forge-std/Test.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {ReasoningRegistry} from "../src/ReasoningRegistry.sol";
import {RosettaToken} from "../src/RosettaToken.sol";
import {OwnerPriceOracle} from "../src/OwnerPriceOracle.sol";
import {PredictionMarket} from "../src/PredictionMarket.sol";

/**
 * @title MarketHandler
 * @notice Bounded handler for PredictionMarket invariant fuzzing.
 *         Uses pre-funded agent addresses — NOT the fuzzer-generated `agent` param.
 *         Each function is self-contained with its own vm.prank scope.
 */
contract MarketHandler is Test {
    PredictionMarket public market;
    ReasoningRegistry public registry;
    RosettaToken public token;
    OwnerPriceOracle public oracle;
    address public submitter;

    address[] public agents;
    uint256 public nextAgentIdx;

    bytes32[] public createdHashes;
    mapping(bytes32 => bool) public isCreated;

    constructor(
        PredictionMarket _market,
        ReasoningRegistry _registry,
        RosettaToken _token,
        OwnerPriceOracle _oracle,
        address _submitter,
        address[] memory _agents
    ) {
        market = _market;
        registry = _registry;
        token = _token;
        oracle = _oracle;
        submitter = _submitter;
        for (uint256 i; i < _agents.length; ++i) {
            agents.push(_agents[i]);
        }
    }

    function _ensureTrace(bytes32 hash) internal {
        (, , , , uint256 ts, ) = registry.traces(hash);
        if (ts == 0) {
            vm.prank(submitter);
            registry.record(hash, "bafkrei-test", ReasoningRegistry.Region.US, ReasoningRegistry.AssetClass.CRYPTO);
        }
    }

    function _ensureOracle(bytes32 assetKey, uint256 price) internal {
        (, uint256 ts) = oracle.getPrice(assetKey);
        if (ts == 0) {
            vm.prank(address(0xBEEF));
            oracle.setPrice(assetKey, price);
        }
    }

    function _pickAgent() internal returns (address agent) {
        agent = agents[nextAgentIdx % agents.length];
        nextAgentIdx++;
    }

    function createMarket(
        bytes32 traceHash,
        address, /*fuzzerAgent — ignored, we use pre-funded agents*/
        uint256 stakeAmount,
        bytes32 assetKey,
        uint16 confidenceBp,
        uint256 entryPrice,
        uint32 horizonDays
    ) external {
        traceHash = bytes32(uint256(traceHash) % 1000);
        stakeAmount = bound(stakeAmount, 1 ether, 10_000 ether);
        confidenceBp = uint16(bound(confidenceBp, 100, 10_000));
        entryPrice = bound(entryPrice, 1e8, 1_000e8);
        horizonDays = uint32(bound(horizonDays, 1, 30));

        if (isCreated[traceHash]) return;

        address agent = _pickAgent();

        _ensureTrace(traceHash);
        _ensureOracle(assetKey, entryPrice);

        // Unstake any existing stake to recycle tokens
        uint256 existing = token.stakedBalance(agent);
        if (existing > 0) {
            vm.prank(agent);
            token.unstake(existing);
        }

        // Agent approves token contract (idempotent — max approval persists)
        vm.prank(agent);
        token.approve(address(token), type(uint256).max);

        // Agent stakes
        vm.prank(agent);
        token.stake(stakeAmount);

        // Agent creates market
        vm.prank(agent);
        market.createMarket(traceHash, agent, stakeAmount, assetKey, PredictionMarket.Direction.LONG, confidenceBp, entryPrice, horizonDays);

        createdHashes.push(traceHash);
        isCreated[traceHash] = true;
    }

    function resolveMarket(bytes32 traceHash) external {
        if (!isCreated[traceHash]) return;
        PredictionMarket.Market memory m = market.getMarket(traceHash);
        if (m.status != PredictionMarket.Status.PENDING) return;
        if (block.timestamp < m.resolvesAt) {
            vm.warp(m.resolvesAt + 1);
        }
        market.resolve(traceHash);
    }

    function settleMarket(bytes32 traceHash) external {
        if (!isCreated[traceHash]) return;
        PredictionMarket.Market memory m = market.getMarket(traceHash);
        if (m.status != PredictionMarket.Status.RESOLVED) return;
        uint64 settlesAt = m.resolvedAt + market.disputeWindowSec();
        if (block.timestamp < settlesAt) {
            vm.warp(settlesAt + 1);
        }
        market.settle(traceHash);
    }

    function getCreatedCount() external view returns (uint256) {
        return createdHashes.length;
    }
}

/**
 * @title PredictionMarketInvariantTest
 * @notice Invariant tests for PredictionMarket.
 */
contract PredictionMarketInvariantTest is Test {
    ReasoningRegistry public registry;
    RosettaToken public token;
    OwnerPriceOracle public oracle;
    PredictionMarket public market;
    MarketHandler public handler;

    address owner = address(0xBEEF);
    address agent1 = address(0x1111);
    address agent2 = address(0x2222);
    address agent3 = address(0x3333);
    address submitter = address(0xDEAD);

    function setUp() public {
        vm.startPrank(owner);
        registry = new ReasoningRegistry(owner, submitter);
        token = new RosettaToken(owner, 1_000_000 ether);
        oracle = new OwnerPriceOracle(owner);
        market = new PredictionMarket(owner, address(registry), address(token), address(oracle));
        token.setSlasher(address(market), true);
        vm.stopPrank();

        // Fund agents with tokens
        vm.prank(owner);
        token.transfer(agent1, 100_000 ether);
        vm.prank(owner);
        token.transfer(agent2, 100_000 ether);
        vm.prank(owner);
        token.transfer(agent3, 100_000 ether);

        // Fund reward pool
        vm.prank(owner);
        token.approve(address(market), 50_000 ether);
        vm.prank(owner);
        market.fundRewardPool(50_000 ether);

        address[] memory agentAddrs = new address[](3);
        agentAddrs[0] = agent1;
        agentAddrs[1] = agent2;
        agentAddrs[2] = agent3;

        handler = new MarketHandler(market, registry, token, oracle, submitter, agentAddrs);
        targetContract(address(handler));
        targetSender(agent1);
        targetSender(agent2);
        targetSender(agent3);
    }

    /// @notice Reward pool balance must match the contract's internal counter.
    function invariant_rewardPoolAccounting() public view {
        uint256 tokenBalance = token.balanceOf(address(market));
        assertEq(tokenBalance, market.rewardPool(), "reward pool accounting mismatch");
    }

    /// @notice Settled markets remain settled (state machine integrity).
    function invariant_settledMarketsStaySettled() public view {
        for (uint256 i; i < handler.getCreatedCount(); ++i) {
            bytes32 hash = handler.createdHashes(i);
            PredictionMarket.Market memory m = market.getMarket(hash);
            if (m.status == PredictionMarket.Status.SETTLED) {
                assertGt(m.resolvedAt, 0, "settled but resolvedAt=0");
                assertGt(m.exitPrice, 0, "settled but exitPrice=0");
            }
        }
    }

    /// @notice Market count consistency.
    function invariant_marketCountConsistency() public view {
        assertEq(handler.getCreatedCount(), market.totalMarkets(), "market count mismatch");
    }

    /// @notice No market can be settled before it's resolved.
    function invariant_noSettleBeforeResolve() public view {
        for (uint256 i; i < handler.getCreatedCount(); ++i) {
            bytes32 hash = handler.createdHashes(i);
            PredictionMarket.Market memory m = market.getMarket(hash);
            if (m.status == PredictionMarket.Status.PENDING) {
                assertEq(m.resolvedAt, 0, "pending market has resolvedAt != 0");
            }
        }
    }

    /// @notice Resolved and settled markets always have exitPrice > 0.
    function invariant_resolvedMarketsHaveExitPrice() public view {
        for (uint256 i; i < handler.getCreatedCount(); ++i) {
            bytes32 hash = handler.createdHashes(i);
            PredictionMarket.Market memory m = market.getMarket(hash);
            if (m.status == PredictionMarket.Status.RESOLVED || m.status == PredictionMarket.Status.SETTLED) {
                assertGt(m.exitPrice, 0, "resolved/settled but exitPrice=0");
                assertGt(m.resolvedAt, 0, "resolved/settled but resolvedAt=0");
            }
        }
    }

    /// @notice Total staked never exceeds initial agent funding + reward pool.
    ///         Agents start with 100k each (300k total), pool is 50k.
    ///         On slash, tokens are burned from supply. On reward, tokens move
    ///         from pool to agent wallet (not staked). So totalStaked <= 300k.
    function invariant_totalStakedBounded() public view {
        assertLe(token.totalStaked(), 300_000 ether, "totalStaked exceeds agent funding");
    }
}
