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
 *         Agents are funded and approve the token contract in setUp.
 *         Uses vm.prank to stake/create markets on behalf of agents.
 */
contract MarketHandler is Test {
    PredictionMarket public market;
    ReasoningRegistry public registry;
    RosettaToken public token;
    OwnerPriceOracle public oracle;

    bytes32[] public createdHashes;
    mapping(bytes32 => bool) public isCreated;

    constructor(
        PredictionMarket _market,
        ReasoningRegistry _registry,
        RosettaToken _token,
        OwnerPriceOracle _oracle
    ) {
        market = _market;
        registry = _registry;
        token = _token;
        oracle = _oracle;
    }

    function _recordTrace(bytes32 hash) internal {
        (, , , , uint256 ts, ) = registry.traces(hash);
        if (ts == 0) {
            vm.prank(address(0xDEAD));
            registry.record(hash, "bafkrei-test", ReasoningRegistry.Region.US, ReasoningRegistry.AssetClass.CRYPTO);
        }
    }

    function createMarket(
        bytes32 traceHash,
        address agent,
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

        _recordTrace(traceHash);
        (, uint256 oracleTs) = oracle.getPrice(assetKey);
        if (oracleTs == 0) {
            vm.prank(address(0xBEEF));
            oracle.setPrice(assetKey, entryPrice);
        }

        if (isCreated[traceHash]) return;

        // Unstake first if agent has existing stake (recycle tokens)
        uint256 existingStake = token.stakedBalance(agent);
        if (existingStake > 0) {
            vm.prank(agent);
            token.unstake(existingStake);
        }

        // Agent stakes then creates market — both from agent's perspective
        vm.startPrank(agent);
        token.stake(stakeAmount);
        market.createMarket(traceHash, agent, stakeAmount, assetKey, PredictionMarket.Direction.LONG, confidenceBp, entryPrice, horizonDays);
        vm.stopPrank();

        createdHashes.push(traceHash);
        isCreated[traceHash] = true;
    }

    function resolveMarket(bytes32 traceHash) external {
        if (!isCreated[traceHash]) return;
        PredictionMarket.Market memory m = market.getMarket(traceHash);
        if (m.status != PredictionMarket.Status.PENDING) return;

        vm.warp(m.resolvesAt + 1);
        market.resolve(traceHash);
    }

    function settleMarket(bytes32 traceHash) external {
        if (!isCreated[traceHash]) return;
        PredictionMarket.Market memory m = market.getMarket(traceHash);
        if (m.status != PredictionMarket.Status.RESOLVED) return;

        uint64 settlesAt = m.resolvedAt + market.disputeWindowSec();
        vm.warp(settlesAt + 1);
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

    function setUp() public {
        vm.startPrank(owner);
        registry = new ReasoningRegistry(owner, address(0xDEAD));
        token = new RosettaToken(owner, 1_000_000 ether);
        oracle = new OwnerPriceOracle(owner);
        market = new PredictionMarket(owner, address(registry), address(token), address(oracle));
        token.setSlasher(address(market), true);

        // Fund agents AND approve token contract for staking
        vm.stopPrank();

        vm.prank(owner);
        token.transfer(agent1, 100_000 ether);
        vm.prank(owner);
        token.transfer(agent2, 100_000 ether);

        vm.prank(agent1);
        token.approve(address(token), type(uint256).max);
        vm.prank(agent2);
        token.approve(address(token), type(uint256).max);

        // Fund reward pool
        vm.prank(owner);
        token.approve(address(market), 50_000 ether);
        vm.prank(owner);
        market.fundRewardPool(50_000 ether);

        handler = new MarketHandler(market, registry, token, oracle);
        targetContract(address(handler));
        targetSender(agent1);
        targetSender(agent2);
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
}
