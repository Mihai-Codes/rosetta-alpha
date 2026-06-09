// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Test} from "forge-std/Test.sol";
import {RosettaToken} from "../src/RosettaToken.sol";

/**
 * @title RosettaTokenHandler
 * @notice Bounded handler for RosettaToken invariant fuzzing.
 *         Uses vm.prank to ensure staking/unstaking/slashing happens
 *         from the fuzzer-selected sender, not from the handler.
 */
contract RosettaTokenHandler is Test {
    RosettaToken public token;
    address[] public actors;

    constructor(RosettaToken _token) {
        token = _token;
    }

    function addActor(address actor) external {
        if (actor == address(0) || actor == address(token)) return;
        for (uint256 i; i < actors.length; ++i) {
            if (actors[i] == actor) return;
        }
        actors.push(actor);
    }

    function setActors(address a1, address a2, address a3) external {
        if (actors.length > 0) return; // only set once
        actors.push(a1);
        actors.push(a2);
        actors.push(a3);
    }

    function stake(uint256 amount) external {
        amount = bound(amount, 1, token.balanceOf(msg.sender));
        if (amount == 0) return;
        vm.prank(msg.sender);
        token.stake(amount);
    }

    function unstake(uint256 amount) external {
        amount = bound(amount, 1, token.stakedBalance(msg.sender));
        if (amount == 0) return;
        vm.prank(msg.sender);
        token.unstake(amount);
    }

    function slash(address agent, uint256 amount) external {
        amount = bound(amount, 1, 100 ether);
        token.slash(agent, amount);
    }

    function getActorCount() external view returns (uint256) {
        return actors.length;
    }
}

/**
 * @title RosettaTokenInvariantTest
 * @notice Invariant tests for RosettaToken staking/slashing conservation.
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
        handler.setActors(agent1, agent2, agent3);
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
