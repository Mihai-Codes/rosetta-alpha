// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Test, console2} from "forge-std/Test.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {RosettaSubscription} from "../src/RosettaSubscription.sol";

/**
 * @title MockUSDC
 * @notice Minimal ERC-20 for testing subscription payments.
 */
contract MockUSDC is IERC20 {
    string public name = "MockUSDC";
    string public symbol = "USDC";
    uint8 public decimals = 6;
    uint256 public totalSupply;
    mapping(address => uint256) public balanceOf;
    mapping(address => mapping(address => uint256)) public allowance;

    function mint(address to, uint256 amount) external {
        balanceOf[to] += amount;
        totalSupply += amount;
    }

    function approve(address spender, uint256 amount) external returns (bool) {
        allowance[msg.sender][spender] = amount;
        return true;
    }

    function transfer(address to, uint256 amount) external returns (bool) {
        balanceOf[msg.sender] -= amount;
        balanceOf[to] += amount;
        return true;
    }

    function transferFrom(address from, address to, uint256 amount) external returns (bool) {
        allowance[from][msg.sender] -= amount;
        balanceOf[from] -= amount;
        balanceOf[to] += amount;
        return true;
    }
}

/**
 * @title SubscriptionHandler
 * @notice Bounded handler for RosettaSubscription invariant fuzzing.
 */
contract SubscriptionHandler is Test {
    RosettaSubscription public sub;
    MockUSDC public usdc;

    address[] public users;
    mapping(address => bool) public isUser;

    // Ghost variables
    uint256 public ghost_totalRevenue;
    uint256 public ghost_subscribeCalls;
    uint256 public ghost_unsubscribeCalls;

    constructor(RosettaSubscription _sub, MockUSDC _usdc) {
        sub = _sub;
        usdc = _usdc;
    }

    function addUser(address user) external {
        if (user == address(0) || user == address(sub) || isUser[user]) return;
        users.push(user);
        isUser[user] = true;
        usdc.mint(user, 1_000_000 ether);
        vm.prank(user);
        usdc.approve(address(sub), type(uint256).max);
    }

    function subscribe(uint8 tier) external {
        tier = uint8(bound(tier, 1, 2));
        if (!isUser[msg.sender]) return;
        uint256 ownerBalBefore = usdc.balanceOf(address(0xBEEF));
        vm.prank(msg.sender);
        sub.subscribe(tier);
        ghost_totalRevenue += usdc.balanceOf(address(0xBEEF)) - ownerBalBefore;
        ghost_subscribeCalls++;
    }

    function unsubscribe() external {
        if (!isUser[msg.sender]) return;
        vm.prank(msg.sender);
        sub.unsubscribe();
        ghost_unsubscribeCalls++;
    }

    function getUserCount() external view returns (uint256) {
        return users.length;
    }
}

/**
 * @title RosettaSubscriptionInvariantTest
 * @notice Invariant tests for RosettaSubscription.
 *
 * Invariants:
 *   1. Tier validity: getTier() returns 0, 1, or 2 only
 *   2. Revenue accounting: totalRevenue == sum of all USDC transferred
 *   3. Expiry consistency: active subscribers have expiresAt > block.timestamp
 */
contract RosettaSubscriptionInvariantTest is Test {
    RosettaSubscription public sub;
    MockUSDC public usdc;
    SubscriptionHandler public handler;

    address owner = address(0xBEEF);
    address user1 = address(0x1111);
    address user2 = address(0x2222);
    address user3 = address(0x3333);

    function setUp() public {
        usdc = new MockUSDC();
        vm.prank(owner);
        usdc.mint(owner, 10_000_000 ether);

        vm.startPrank(owner);
        sub = new RosettaSubscription(owner, address(usdc), 29e6, 99e6);
        vm.stopPrank();

        handler = new SubscriptionHandler(sub, usdc);
        handler.addUser(user1);
        handler.addUser(user2);
        handler.addUser(user3);
        targetContract(address(handler));
        targetSender(user1);
        targetSender(user2);
        targetSender(user3);
    }

    /// @notice Tier validity: getTier() always returns 0, 1, or 2.
    function invariant_tierValidity() public view {
        for (uint256 i; i < handler.getUserCount(); ++i) {
            uint8 tier = sub.getTier(handler.users(i));
            assertLe(tier, 2, "invalid tier");
        }
    }

    /// @notice Revenue accounting: totalRevenue tracks USDC inflow.
    function invariant_revenueAccounting() public view {
        assertEq(sub.totalRevenue(), handler.ghost_totalRevenue(), "revenue mismatch");
    }

    /// @notice Expiry consistency: if tier > 0, expiresAt must be in the future.
    function invariant_expiryConsistency() public view {
        for (uint256 i; i < handler.getUserCount(); ++i) {
            (uint8 tier, uint256 expiresAt, bool active) = sub.getSubscription(handler.users(i));
            if (active) {
                assertGt(tier, 0, "active but tier=0");
                assertGt(expiresAt, block.timestamp, "active but expired");
            } else {
                // Either tier=0 or expired (or both)
                assertTrue(tier == 0 || expiresAt <= block.timestamp, "inactive but valid");
            }
        }
    }
}
