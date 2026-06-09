// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Test, console2} from "forge-std/Test.sol";
import {RosettaToken} from "../src/RosettaToken.sol";

/**
 * @title RosettaTokenHandler
 * @notice Bounded handler for RosettaToken invariant fuzzing.
 *         Tracks actors and amounts to verify conservation invariants.
 */
contract RosettaTokenHandler is Test {
    RosettaToken public token;
    address[] public actors;
    uint256[] public actorStakes;

    // Ghost variables — mirror state for delta checks
    uint256 public ghost_totalStaked;

    constructor(RosettaToken _token) {
        token = _token;
        actors.push(address(this));
        actorStakes.push(0);
    }

    function addActor(address actor) external {
        if (actor == address(0) || actor == address(token)) return;
        for (uint256 i; i < actors.length; ++i) {
            if (actors[i] == actor) return;
        }
        actors.push(actor);
        actorStakes.push(0);
    }

    function stake(uint256 amount) external {
        amount = bound(amount, 1, token.balanceOf(msg.sender));
        if (amount == 0) return;
        token.stake(amount);
        _syncBalance(msg.sender);
    }

    function unstake(uint256 amount) external {
        amount = bound(amount, 1, token.stakedBalance(msg.sender));
        if (amount == 0) return;
        token.unstake(amount);
        _syncBalance(msg.sender);
    }

    function slash(address agent, uint256 amount) external {
        amount = bound(amount, 1, 100 ether);
        token.slash(agent, amount);
        _syncBalance(agent);
    }

    function _syncBalance(address actor) internal {
        for (uint256 i; i < actors.length; ++i) {
            if (actors[i] == actor) {
                actorStakes[i] = token.stakedBalance(actor);
                return;
            }
        }
    }

    function getActorCount() external view returns (uint256) {
        return actors.length;
    }
}

/**
 * @title RosettaTokenInvariantTest
 * @notice Invariant tests for RosettaToken staking/slashing conservation.
 *
 * Invariants:
 *   1. Conservation: totalStaked == sum of all stakedBalance[]
 *   2. Slash never creates tokens (totalStaked <= totalSupply)
 *   3. Individual stake never exceeds totalStaked
 */
contract RosettaTokenInvariantTest is Test {
    RosettaToken public token;
    RosettaTokenHandler public handler;

    address owner = address(0xBEEF);
    address agent1 = address(0x1111);
    address agent2 = address(0x2222);
    address agent3 = address(0x3333);

    function setUp() public {
        vm.startPrank(owner);
        token = new RosettaToken(owner, 1_000_000 ether);
        token.setSlasher(address(this), true);

        // Fund actors
        token.transfer(agent1, 100_000 ether);
        token.transfer(agent2, 100_000 ether);
        token.transfer(agent3, 100_000 ether);
        vm.stopPrank();

        handler = new RosettaTokenHandler(token);
        targetContract(address(handler));
        targetSender(agent1);
        targetSender(agent2);
        targetSender(agent3);
    }

    /// @notice Conservation: totalStaked must equal sum of all individual stakes.
    function invariant_totalStakedConservation() public view {
        uint256 sum;
        for (uint256 i; i < handler.getActorCount(); ++i) {
            sum += token.stakedBalance(handler.actors(i));
        }
        assertEq(sum, token.totalStaked(), "conservation: sum != totalStaked");
    }

    /// @notice Slash never creates tokens out of thin air.
    function invariant_totalStakedNeverExceedsSupply() public view {
        assertLe(token.totalStaked(), token.totalSupply(), "totalStaked > totalSupply");
    }

    /// @notice Individual stake never exceeds total staked.
    function invariant_individualStakeBounded() public view {
        for (uint256 i; i < handler.getActorCount(); ++i) {
            assertLe(
                token.stakedBalance(handler.actors(i)),
                token.totalStaked(),
                "individual stake > totalStaked"
            );
        }
    }
}
