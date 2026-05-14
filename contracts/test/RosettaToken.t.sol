// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Test, console2} from "forge-std/Test.sol";
import {RosettaToken} from "../src/RosettaToken.sol";

contract RosettaTokenTest is Test {
    RosettaToken public token;

    address owner   = address(0xA1);
    address agent1  = address(0xB1);
    address agent2  = address(0xB2);
    address market  = address(0xC1); // PredictionMarket mock

    uint256 constant INITIAL_SUPPLY = 1_000_000 * 1e18;
    uint256 constant STAKE_AMOUNT   = 1_000 * 1e18;

    function setUp() public {
        vm.prank(owner);
        token = new RosettaToken(owner, INITIAL_SUPPLY);

        // Fund agents with liquid tokens
        vm.startPrank(owner);
        token.transfer(agent1, 10_000 * 1e18);
        token.transfer(agent2, 10_000 * 1e18);
        vm.stopPrank();
    }

    // -----------------------------------------------------------------------
    // Deployment
    // -----------------------------------------------------------------------

    function test_initialSupply() public view {
        // Owner got initial supply minus what was transferred to agents
        assertEq(token.totalSupply(), INITIAL_SUPPLY);
        assertEq(token.name(), "RosettaToken");
        assertEq(token.symbol(), "ROSETTA");
    }

    function test_ownerBalance() public view {
        assertEq(token.balanceOf(owner), INITIAL_SUPPLY - 20_000 * 1e18);
    }

    // -----------------------------------------------------------------------
    // Mint
    // -----------------------------------------------------------------------

    function test_mint_onlyOwner() public {
        vm.prank(owner);
        token.mint(agent1, 500 * 1e18);
        assertEq(token.balanceOf(agent1), 10_000 * 1e18 + 500 * 1e18);
    }

    function test_mint_revertsIfNotOwner() public {
        vm.prank(agent1);
        vm.expectRevert();
        token.mint(agent1, 500 * 1e18);
    }

    function test_mint_revertsOnZero() public {
        vm.prank(owner);
        vm.expectRevert(RosettaToken.ZeroAmount.selector);
        token.mint(agent1, 0);
    }

    // -----------------------------------------------------------------------
    // Staking
    // -----------------------------------------------------------------------

    function test_stake_basic() public {
        vm.prank(agent1);
        token.stake(STAKE_AMOUNT);

        assertEq(token.stakedBalance(agent1), STAKE_AMOUNT);
        assertEq(token.totalStaked(), STAKE_AMOUNT);
        assertEq(token.balanceOf(agent1), 10_000 * 1e18 - STAKE_AMOUNT);
        assertEq(token.balanceOf(address(token)), STAKE_AMOUNT);
    }

    function test_stake_revertsOnZero() public {
        vm.prank(agent1);
        vm.expectRevert(RosettaToken.ZeroAmount.selector);
        token.stake(0);
    }

    function test_totalBalanceOf_includesStaked() public {
        vm.prank(agent1);
        token.stake(STAKE_AMOUNT);
        assertEq(token.totalBalanceOf(agent1), 10_000 * 1e18);
    }

    // -----------------------------------------------------------------------
    // Unstaking
    // -----------------------------------------------------------------------

    function test_unstake_basic() public {
        vm.startPrank(agent1);
        token.stake(STAKE_AMOUNT);
        token.unstake(STAKE_AMOUNT / 2);
        vm.stopPrank();

        assertEq(token.stakedBalance(agent1), STAKE_AMOUNT / 2);
        assertEq(token.balanceOf(agent1), 10_000 * 1e18 - STAKE_AMOUNT / 2);
    }

    function test_unstake_revertsOnInsufficientStake() public {
        vm.prank(agent1);
        token.stake(STAKE_AMOUNT);

        vm.prank(agent1);
        vm.expectRevert(
            abi.encodeWithSelector(
                RosettaToken.InsufficientStake.selector,
                agent1,
                STAKE_AMOUNT * 2,
                STAKE_AMOUNT
            )
        );
        token.unstake(STAKE_AMOUNT * 2);
    }

    function test_unstake_revertsOnZero() public {
        vm.prank(agent1);
        vm.expectRevert(RosettaToken.ZeroAmount.selector);
        token.unstake(0);
    }

    // -----------------------------------------------------------------------
    // Slashing
    // -----------------------------------------------------------------------

    function test_setSlasher_onlyOwner() public {
        vm.prank(owner);
        token.setSlasher(market, true);
        assertTrue(token.slashers(market));
    }

    function test_setSlasher_revertsIfNotOwner() public {
        vm.prank(agent1);
        vm.expectRevert();
        token.setSlasher(market, true);
    }

    function test_slash_basic() public {
        // Setup
        vm.prank(owner);
        token.setSlasher(market, true);

        vm.prank(agent1);
        token.stake(STAKE_AMOUNT);

        uint256 supplyBefore = token.totalSupply();

        // Slash half the stake
        vm.prank(market);
        token.slash(agent1, STAKE_AMOUNT / 2);

        assertEq(token.stakedBalance(agent1), STAKE_AMOUNT / 2);
        assertEq(token.totalStaked(), STAKE_AMOUNT / 2);
        // Burned: supply decreases
        assertEq(token.totalSupply(), supplyBefore - STAKE_AMOUNT / 2);
    }

    function test_slash_clampsToAvailable() public {
        vm.prank(owner);
        token.setSlasher(market, true);

        vm.prank(agent1);
        token.stake(STAKE_AMOUNT);

        // Try to slash more than staked — should clamp, not revert
        vm.prank(market);
        token.slash(agent1, STAKE_AMOUNT * 10);

        assertEq(token.stakedBalance(agent1), 0);
        assertEq(token.totalStaked(), 0);
    }

    function test_slash_revertsIfNotSlasher() public {
        vm.prank(agent1);
        token.stake(STAKE_AMOUNT);

        vm.prank(agent2);
        vm.expectRevert(abi.encodeWithSelector(RosettaToken.NotSlasher.selector, agent2));
        token.slash(agent1, STAKE_AMOUNT);
    }

    function test_slash_revertsOnZero() public {
        vm.prank(owner);
        token.setSlasher(market, true);

        vm.prank(agent1);
        token.stake(STAKE_AMOUNT);

        vm.prank(market);
        vm.expectRevert(RosettaToken.ZeroAmount.selector);
        token.slash(agent1, 0);
    }

    // -----------------------------------------------------------------------
    // Fuzz
    // -----------------------------------------------------------------------

    function testFuzz_stakeUnstake(uint96 amount) public {
        vm.assume(amount > 0 && amount <= 10_000 * 1e18);
        vm.prank(agent1);
        token.stake(amount);
        assertEq(token.stakedBalance(agent1), amount);

        vm.prank(agent1);
        token.unstake(amount);
        assertEq(token.stakedBalance(agent1), 0);
        assertEq(token.balanceOf(agent1), 10_000 * 1e18);
    }

    function testFuzz_slashNeverExceedsStake(uint96 stakeAmt, uint96 slashAmt) public {
        vm.assume(stakeAmt > 0 && stakeAmt <= 10_000 * 1e18);
        vm.assume(slashAmt > 0);

        vm.prank(owner);
        token.setSlasher(market, true);

        vm.prank(agent1);
        token.stake(stakeAmt);

        uint256 supplyBefore = token.totalSupply();

        vm.prank(market);
        token.slash(agent1, slashAmt);

        // Staked balance never goes negative
        uint256 expectedStake = uint256(slashAmt) >= uint256(stakeAmt) ? 0 : uint256(stakeAmt) - uint256(slashAmt);
        assertEq(token.stakedBalance(agent1), expectedStake);
        // Supply only decreased by at most stakeAmt
        assertTrue(token.totalSupply() >= supplyBefore - uint256(stakeAmt));
    }
}
