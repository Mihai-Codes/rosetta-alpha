// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Test, console2} from "forge-std/Test.sol";
import {PredictionMarket} from "../src/PredictionMarket.sol";
import {OwnerPriceOracle} from "../src/OwnerPriceOracle.sol";
import {RosettaToken} from "../src/RosettaToken.sol";
import {ReasoningRegistry} from "../src/ReasoningRegistry.sol";

contract PredictionMarketTest is Test {
    PredictionMarket   market;
    OwnerPriceOracle   oracle;
    RosettaToken       token;
    ReasoningRegistry  registry;

    address owner   = address(0xA1);
    address agent   = address(0xB1);
    address agent2  = address(0xB2);
    address keeper  = address(0xC1); // permissionless caller

    bytes32 constant ASSET_AAPL = keccak256("AAPL");
    bytes32 constant ASSET_BTC  = keccak256("BTC");

    bytes32 constant TRACE_1 = keccak256("trace-1");
    bytes32 constant TRACE_2 = keccak256("trace-2");
    bytes32 constant TRACE_3 = keccak256("trace-3");

    string  constant CID_1 = "bafkreitest1";
    uint256 constant ENTRY = 100 * 1e8;             // $100
    uint256 constant STAKE = 1_000 * 1e18;
    uint16  constant CONF_HIGH = 9000;              // 90%
    uint16  constant CONF_LOW  = 3000;              // 30%

    function setUp() public {
        // Deploy registry, token, oracle, market
        vm.startPrank(owner);
        registry = new ReasoningRegistry(owner, owner); // owner is also submitter
        token    = new RosettaToken(owner, 10_000_000 * 1e18);
        oracle   = new OwnerPriceOracle(owner);
        market   = new PredictionMarket(owner, address(registry), address(token), address(oracle));

        // Wire token slasher
        token.setSlasher(address(market), true);

        // Fund agents with ROSETTA
        token.transfer(agent,  100_000 * 1e18);
        token.transfer(agent2, 100_000 * 1e18);

        // Fund reward pool
        token.approve(address(market), 50_000 * 1e18);
        market.fundRewardPool(50_000 * 1e18);
        vm.stopPrank();

        // Agents stake bonds
        vm.prank(agent);
        token.stake(STAKE);
        vm.prank(agent2);
        token.stake(STAKE);

        // Record traces in registry
        vm.startPrank(owner); // owner is the authorized submitter
        registry.record(TRACE_1, CID_1, ReasoningRegistry.Region.US,     ReasoningRegistry.AssetClass.EQUITY);
        registry.record(TRACE_2, "cid2", ReasoningRegistry.Region.CRYPTO, ReasoningRegistry.AssetClass.CRYPTO);
        registry.record(TRACE_3, "cid3", ReasoningRegistry.Region.US,     ReasoningRegistry.AssetClass.EQUITY);
        vm.stopPrank();

        // Initial oracle price
        vm.prank(owner);
        oracle.setPrice(ASSET_AAPL, ENTRY);
    }

    // -----------------------------------------------------------------------
    // Helpers
    // -----------------------------------------------------------------------

    function _create(bytes32 traceHash, address a, PredictionMarket.Direction dir, uint16 conf) internal {
        market.createMarket(traceHash, a, STAKE, ASSET_AAPL, dir, conf, ENTRY, 7);
    }

    function _warpToResolve() internal {
        vm.warp(block.timestamp + 7 days + 1);
    }

    function _warpToSettle() internal {
        vm.warp(block.timestamp + 1 hours + 1);
    }

    // -----------------------------------------------------------------------
    // Deployment
    // -----------------------------------------------------------------------

    function test_deployment_state() public view {
        assertEq(address(market.registry()), address(registry));
        assertEq(address(market.token()), address(token));
        assertEq(address(market.oracle()), address(oracle));
        assertEq(market.thresholdBp(), 100);
        assertEq(market.disputeWindowSec(), 1 hours);
        assertEq(market.rewardPool(), 50_000 * 1e18);
    }

    // -----------------------------------------------------------------------
    // createMarket
    // -----------------------------------------------------------------------

    function test_createMarket_basic() public {
        _create(TRACE_1, agent, PredictionMarket.Direction.LONG, CONF_HIGH);
        PredictionMarket.Market memory m = market.getMarket(TRACE_1);
        assertEq(m.agent, agent);
        assertEq(m.stakeAmount, STAKE);
        assertEq(m.entryPrice, ENTRY);
        assertEq(m.confidenceBp, CONF_HIGH);
        assertEq(uint8(m.direction), uint8(PredictionMarket.Direction.LONG));
        assertEq(uint8(m.status), uint8(PredictionMarket.Status.PENDING));
    }

    function test_createMarket_revertsOnDuplicate() public {
        _create(TRACE_1, agent, PredictionMarket.Direction.LONG, CONF_HIGH);
        vm.expectRevert(abi.encodeWithSelector(PredictionMarket.MarketAlreadyExists.selector, TRACE_1));
        _create(TRACE_1, agent, PredictionMarket.Direction.SHORT, CONF_LOW);
    }

    function test_createMarket_revertsIfTraceNotRegistered() public {
        bytes32 ghost = keccak256("ghost-trace");
        vm.expectRevert(abi.encodeWithSelector(PredictionMarket.TraceNotRegistered.selector, ghost));
        market.createMarket(ghost, agent, STAKE, ASSET_AAPL, PredictionMarket.Direction.LONG, CONF_HIGH, ENTRY, 7);
    }

    function test_createMarket_revertsOnZeroStake() public {
        vm.expectRevert(PredictionMarket.ZeroAmount.selector);
        market.createMarket(TRACE_1, agent, 0, ASSET_AAPL, PredictionMarket.Direction.LONG, CONF_HIGH, ENTRY, 7);
    }

    function test_createMarket_revertsOnZeroPrice() public {
        vm.expectRevert(PredictionMarket.ZeroPrice.selector);
        market.createMarket(TRACE_1, agent, STAKE, ASSET_AAPL, PredictionMarket.Direction.LONG, CONF_HIGH, 0, 7);
    }

    function test_createMarket_revertsOnConfidenceOverflow() public {
        vm.expectRevert(abi.encodeWithSelector(PredictionMarket.ConfidenceOutOfRange.selector, uint16(10001)));
        market.createMarket(TRACE_1, agent, STAKE, ASSET_AAPL, PredictionMarket.Direction.LONG, 10001, ENTRY, 7);
    }

    // -----------------------------------------------------------------------
    // resolve — LONG outcomes
    // -----------------------------------------------------------------------

    function test_resolve_LONG_correct_priceUp5pct() public {
        _create(TRACE_1, agent, PredictionMarket.Direction.LONG, CONF_HIGH);
        _warpToResolve();
        // Price up 5% — LONG correct
        vm.prank(owner);
        oracle.setPrice(ASSET_AAPL, ENTRY * 105 / 100);

        market.resolve(TRACE_1);
        PredictionMarket.Market memory m = market.getMarket(TRACE_1);
        assertTrue(m.wasCorrect);
        assertEq(uint8(m.status), uint8(PredictionMarket.Status.RESOLVED));
    }

    function test_resolve_LONG_wrong_priceDown5pct() public {
        _create(TRACE_1, agent, PredictionMarket.Direction.LONG, CONF_HIGH);
        _warpToResolve();
        vm.prank(owner);
        oracle.setPrice(ASSET_AAPL, ENTRY * 95 / 100);

        market.resolve(TRACE_1);
        assertFalse(market.getMarket(TRACE_1).wasCorrect);
    }

    function test_resolve_LONG_wrong_inNeutralBand() public {
        _create(TRACE_1, agent, PredictionMarket.Direction.LONG, CONF_HIGH);
        _warpToResolve();
        // Price up 0.5% — within 1% threshold, LONG wrong
        vm.prank(owner);
        oracle.setPrice(ASSET_AAPL, ENTRY * 1005 / 1000);

        market.resolve(TRACE_1);
        assertFalse(market.getMarket(TRACE_1).wasCorrect);
    }

    // -----------------------------------------------------------------------
    // resolve — SHORT outcomes
    // -----------------------------------------------------------------------

    function test_resolve_SHORT_correct_priceDown5pct() public {
        _create(TRACE_1, agent, PredictionMarket.Direction.SHORT, CONF_HIGH);
        _warpToResolve();
        vm.prank(owner);
        oracle.setPrice(ASSET_AAPL, ENTRY * 95 / 100);

        market.resolve(TRACE_1);
        assertTrue(market.getMarket(TRACE_1).wasCorrect);
    }

    function test_resolve_SHORT_wrong_priceUp() public {
        _create(TRACE_1, agent, PredictionMarket.Direction.SHORT, CONF_HIGH);
        _warpToResolve();
        vm.prank(owner);
        oracle.setPrice(ASSET_AAPL, ENTRY * 105 / 100);

        market.resolve(TRACE_1);
        assertFalse(market.getMarket(TRACE_1).wasCorrect);
    }

    // -----------------------------------------------------------------------
    // resolve — NEUTRAL outcomes
    // -----------------------------------------------------------------------

    function test_resolve_NEUTRAL_correct_flatPrice() public {
        _create(TRACE_1, agent, PredictionMarket.Direction.NEUTRAL, CONF_HIGH);
        _warpToResolve();
        // Price up 0.5% — within band, NEUTRAL correct
        vm.prank(owner);
        oracle.setPrice(ASSET_AAPL, ENTRY * 1005 / 1000);

        market.resolve(TRACE_1);
        assertTrue(market.getMarket(TRACE_1).wasCorrect);
    }

    function test_resolve_NEUTRAL_wrong_priceMovedUp() public {
        _create(TRACE_1, agent, PredictionMarket.Direction.NEUTRAL, CONF_HIGH);
        _warpToResolve();
        vm.prank(owner);
        oracle.setPrice(ASSET_AAPL, ENTRY * 105 / 100);

        market.resolve(TRACE_1);
        assertFalse(market.getMarket(TRACE_1).wasCorrect);
    }

    function test_resolve_NEUTRAL_wrong_priceMovedDown() public {
        _create(TRACE_1, agent, PredictionMarket.Direction.NEUTRAL, CONF_HIGH);
        _warpToResolve();
        vm.prank(owner);
        oracle.setPrice(ASSET_AAPL, ENTRY * 95 / 100);

        market.resolve(TRACE_1);
        assertFalse(market.getMarket(TRACE_1).wasCorrect);
    }

    // -----------------------------------------------------------------------
    // resolve — guards
    // -----------------------------------------------------------------------

    function test_resolve_revertsBeforeResolveTime() public {
        _create(TRACE_1, agent, PredictionMarket.Direction.LONG, CONF_HIGH);
        // Don't warp
        vm.expectRevert();
        market.resolve(TRACE_1);
    }

    function test_resolve_revertsOnNonexistent() public {
        vm.expectRevert(abi.encodeWithSelector(PredictionMarket.MarketDoesNotExist.selector, TRACE_1));
        market.resolve(TRACE_1);
    }

    function test_resolve_revertsOnDoubleResolve() public {
        _create(TRACE_1, agent, PredictionMarket.Direction.LONG, CONF_HIGH);
        _warpToResolve();
        vm.prank(owner);
        oracle.setPrice(ASSET_AAPL, ENTRY * 105 / 100);
        market.resolve(TRACE_1);

        vm.expectRevert();
        market.resolve(TRACE_1);
    }

    // -----------------------------------------------------------------------
    // settle — slash on wrong
    // -----------------------------------------------------------------------

    function test_settle_wrong_slashesProportionalToConfidence() public {
        _create(TRACE_1, agent, PredictionMarket.Direction.LONG, CONF_HIGH); // 90% conf
        _warpToResolve();
        vm.prank(owner);
        oracle.setPrice(ASSET_AAPL, ENTRY * 90 / 100); // -10%, LONG wrong

        market.resolve(TRACE_1);
        _warpToSettle();

        uint256 stakeBefore = token.stakedBalance(agent);
        uint256 supplyBefore = token.totalSupply();

        // Permissionless settle by keeper
        vm.prank(keeper);
        market.settle(TRACE_1);

        uint256 expectedSlash = (STAKE * CONF_HIGH) / 10000; // 900 ROSETTA
        assertEq(token.stakedBalance(agent), stakeBefore - expectedSlash);
        assertEq(token.totalSupply(), supplyBefore - expectedSlash);
    }

    function test_settle_wrong_lowConfidenceSmallerSlash() public {
        _create(TRACE_1, agent, PredictionMarket.Direction.LONG, CONF_LOW); // 30%
        _warpToResolve();
        vm.prank(owner);
        oracle.setPrice(ASSET_AAPL, ENTRY * 90 / 100);

        market.resolve(TRACE_1);
        _warpToSettle();

        uint256 stakeBefore = token.stakedBalance(agent);
        market.settle(TRACE_1);

        uint256 expectedSlash = (STAKE * CONF_LOW) / 10000; // 300 ROSETTA
        assertEq(token.stakedBalance(agent), stakeBefore - expectedSlash);
    }

    // -----------------------------------------------------------------------
    // settle — reward on correct
    // -----------------------------------------------------------------------

    function test_settle_correct_paysFromRewardPool() public {
        _create(TRACE_1, agent, PredictionMarket.Direction.LONG, CONF_HIGH);
        _warpToResolve();
        vm.prank(owner);
        oracle.setPrice(ASSET_AAPL, ENTRY * 110 / 100); // +10%, LONG correct

        market.resolve(TRACE_1);
        _warpToSettle();

        uint256 liquidBefore = token.balanceOf(agent);
        uint256 poolBefore = market.rewardPool();
        uint256 expectedReward = (STAKE * CONF_HIGH) / 10000;

        market.settle(TRACE_1);

        assertEq(token.balanceOf(agent), liquidBefore + expectedReward);
        assertEq(market.rewardPool(), poolBefore - expectedReward);
    }

    function test_settle_correct_clampsToPoolSize() public {
        // Drain pool to a tiny remainder
        vm.prank(owner);
        market.withdrawRewardPool(50_000 * 1e18 - 100); // leave 100 wei

        _create(TRACE_1, agent, PredictionMarket.Direction.LONG, CONF_HIGH);
        _warpToResolve();
        vm.prank(owner);
        oracle.setPrice(ASSET_AAPL, ENTRY * 110 / 100);

        market.resolve(TRACE_1);
        _warpToSettle();

        uint256 liquidBefore = token.balanceOf(agent);
        market.settle(TRACE_1);

        // Got 100 wei (clamped, not the full 900e18)
        assertEq(token.balanceOf(agent), liquidBefore + 100);
        assertEq(market.rewardPool(), 0);
    }

    // -----------------------------------------------------------------------
    // settle — guards
    // -----------------------------------------------------------------------

    function test_settle_revertsBeforeDisputeWindow() public {
        _create(TRACE_1, agent, PredictionMarket.Direction.LONG, CONF_HIGH);
        _warpToResolve();
        vm.prank(owner);
        oracle.setPrice(ASSET_AAPL, ENTRY * 110 / 100);
        market.resolve(TRACE_1);

        // Don't warp — should fail
        vm.expectRevert();
        market.settle(TRACE_1);
    }

    function test_settle_revertsBeforeResolved() public {
        _create(TRACE_1, agent, PredictionMarket.Direction.LONG, CONF_HIGH);
        _warpToResolve();
        // Skip resolve
        vm.expectRevert();
        market.settle(TRACE_1);
    }

    function test_settle_revertsOnDoubleSettle() public {
        _create(TRACE_1, agent, PredictionMarket.Direction.LONG, CONF_HIGH);
        _warpToResolve();
        vm.prank(owner);
        oracle.setPrice(ASSET_AAPL, ENTRY * 110 / 100);
        market.resolve(TRACE_1);
        _warpToSettle();
        market.settle(TRACE_1);

        vm.expectRevert();
        market.settle(TRACE_1);
    }

    // -----------------------------------------------------------------------
    // Admin
    // -----------------------------------------------------------------------

    function test_setThresholdBp_onlyOwner() public {
        vm.prank(owner);
        market.setThresholdBp(200);
        assertEq(market.thresholdBp(), 200);
    }

    function test_setThresholdBp_revertsAbove50pct() public {
        vm.prank(owner);
        vm.expectRevert();
        market.setThresholdBp(5001);
    }

    function test_setThresholdBp_revertsIfNotOwner() public {
        vm.prank(agent);
        vm.expectRevert();
        market.setThresholdBp(200);
    }

    function test_setDisputeWindow_onlyOwner() public {
        vm.prank(owner);
        market.setDisputeWindow(2 hours);
        assertEq(market.disputeWindowSec(), 2 hours);
    }

    function test_fundRewardPool_increasesBalance() public {
        vm.startPrank(owner);
        token.approve(address(market), 1_000 * 1e18);
        uint256 before = market.rewardPool();
        market.fundRewardPool(1_000 * 1e18);
        assertEq(market.rewardPool(), before + 1_000 * 1e18);
        vm.stopPrank();
    }

    function test_withdrawRewardPool_decreasesBalance() public {
        vm.prank(owner);
        market.withdrawRewardPool(1_000 * 1e18);
        assertEq(market.rewardPool(), 49_000 * 1e18);
    }

    // -----------------------------------------------------------------------
    // Views
    // -----------------------------------------------------------------------

    function test_totalMarkets() public {
        assertEq(market.totalMarkets(), 0);
        _create(TRACE_1, agent, PredictionMarket.Direction.LONG, CONF_HIGH);
        _create(TRACE_2, agent, PredictionMarket.Direction.SHORT, CONF_LOW);
        assertEq(market.totalMarkets(), 2);
    }

    function test_settleableAt_zeroBeforeResolve() public {
        _create(TRACE_1, agent, PredictionMarket.Direction.LONG, CONF_HIGH);
        assertEq(market.settleableAt(TRACE_1), 0);
    }

    function test_settleableAt_setAfterResolve() public {
        _create(TRACE_1, agent, PredictionMarket.Direction.LONG, CONF_HIGH);
        _warpToResolve();
        vm.prank(owner);
        oracle.setPrice(ASSET_AAPL, ENTRY * 110 / 100);
        uint64 ts = uint64(block.timestamp);
        market.resolve(TRACE_1);
        assertEq(market.settleableAt(TRACE_1), ts + 1 hours);
    }

    // -----------------------------------------------------------------------
    // Fuzz: settlement math invariants
    // -----------------------------------------------------------------------

    function testFuzz_slashNeverExceedsStakeTimesConfidence(uint16 conf, uint8 priceMovePct) public {
        conf = uint16(bound(conf, 1, 10000));
        priceMovePct = uint8(bound(priceMovePct, 5, 50)); // 5–50% drop

        _create(TRACE_1, agent, PredictionMarket.Direction.LONG, conf);
        _warpToResolve();

        vm.prank(owner);
        oracle.setPrice(ASSET_AAPL, ENTRY * (100 - priceMovePct) / 100);

        market.resolve(TRACE_1);
        _warpToSettle();

        uint256 stakeBefore = token.stakedBalance(agent);
        market.settle(TRACE_1);
        uint256 burned = stakeBefore - token.stakedBalance(agent);

        // Burn ≤ stake * conf / 10000 (math identity, never more)
        uint256 maxBurn = (STAKE * uint256(conf)) / 10000;
        assertLe(burned, maxBurn);
    }

    function testFuzz_correctRewardNeverExceedsPoolOrFormula(uint16 conf) public {
        conf = uint16(bound(conf, 1, 10000));

        _create(TRACE_1, agent, PredictionMarket.Direction.LONG, conf);
        _warpToResolve();
        vm.prank(owner);
        oracle.setPrice(ASSET_AAPL, ENTRY * 120 / 100); // +20%, LONG correct

        market.resolve(TRACE_1);
        _warpToSettle();

        uint256 liquidBefore = token.balanceOf(agent);
        uint256 poolBefore = market.rewardPool();
        market.settle(TRACE_1);
        uint256 paid = token.balanceOf(agent) - liquidBefore;

        uint256 expectedFormula = (STAKE * uint256(conf)) / 10000;
        // Paid is min(formula, pool)
        assertLe(paid, expectedFormula);
        assertLe(paid, poolBefore);
    }
}
