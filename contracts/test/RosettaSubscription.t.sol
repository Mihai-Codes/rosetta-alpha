// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Test, console2} from "forge-std/Test.sol";
import {RosettaSubscription} from "../src/RosettaSubscription.sol";
import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";

/// @dev Mock USDC with 6 decimals (matches Arc testnet).
contract MockUSDC is ERC20 {
    constructor() ERC20("USD Coin", "USDC") {}

    function decimals() public pure override returns (uint8) {
        return 6;
    }

    function mint(address to, uint256 amount) external {
        _mint(to, amount);
    }
}

contract RosettaSubscriptionTest is Test {
    RosettaSubscription public sub;
    MockUSDC public usdc;

    address public owner = makeAddr("owner");
    address public alice = makeAddr("alice");
    address public bob = makeAddr("bob");

    uint256 public constant PREMIUM_PRICE = 29_000_000; // 29 USDC
    uint256 public constant PRO_PRICE = 99_000_000;     // 99 USDC
    uint256 public constant PERIOD = 30 days;

    function setUp() public {
        usdc = new MockUSDC();
        sub = new RosettaSubscription(owner, address(usdc), PREMIUM_PRICE, PRO_PRICE);

        // Fund test users.
        usdc.mint(alice, 1000_000_000); // 1000 USDC
        usdc.mint(bob, 1000_000_000);

        // Pre-approve subscription contract.
        vm.prank(alice);
        usdc.approve(address(sub), type(uint256).max);
        vm.prank(bob);
        usdc.approve(address(sub), type(uint256).max);
    }

    // -----------------------------------------------------------------------
    // Construction
    // -----------------------------------------------------------------------

    function test_constructor_setsImmutables() public view {
        assertEq(address(sub.usdc()), address(usdc));
        assertEq(sub.premiumPrice(), PREMIUM_PRICE);
        assertEq(sub.proPrice(), PRO_PRICE);
        assertEq(sub.owner(), owner);
    }

    function test_constructor_revertsZeroUsdc() public {
        vm.expectRevert(RosettaSubscription.ZeroAddress.selector);
        new RosettaSubscription(owner, address(0), PREMIUM_PRICE, PRO_PRICE);
    }

    // -----------------------------------------------------------------------
    // Subscribe
    // -----------------------------------------------------------------------

    function test_subscribe_premium() public {
        vm.prank(alice);
        sub.subscribe(1);

        (uint8 tier, uint256 expiresAt, bool active) = sub.getSubscription(alice);
        assertEq(tier, 1);
        assertEq(expiresAt, block.timestamp + PERIOD);
        assertTrue(active);
        assertEq(sub.getTier(alice), 1);
        assertTrue(sub.isSubscriber(alice, 1));
        assertFalse(sub.isSubscriber(alice, 2));

        // Owner received USDC.
        assertEq(usdc.balanceOf(owner), PREMIUM_PRICE);
        assertEq(sub.totalRevenue(), PREMIUM_PRICE);
    }

    function test_subscribe_pro() public {
        vm.prank(bob);
        sub.subscribe(2);

        assertEq(sub.getTier(bob), 2);
        assertTrue(sub.isSubscriber(bob, 1)); // Pro satisfies Premium check.
        assertTrue(sub.isSubscriber(bob, 2));
        assertEq(usdc.balanceOf(owner), PRO_PRICE);
    }

    function test_subscribe_invalidTier_reverts() public {
        vm.prank(alice);
        vm.expectRevert(abi.encodeWithSelector(RosettaSubscription.InvalidTier.selector, 0));
        sub.subscribe(0);

        vm.prank(alice);
        vm.expectRevert(abi.encodeWithSelector(RosettaSubscription.InvalidTier.selector, 3));
        sub.subscribe(3);
    }

    function test_subscribe_renewal_extendsPeriod() public {
        vm.prank(alice);
        sub.subscribe(1);

        (, uint256 firstExpiry,) = sub.getSubscription(alice);

        // Warp 15 days — still active.
        vm.warp(block.timestamp + 15 days);

        vm.prank(alice);
        sub.subscribe(1);

        (, uint256 newExpiry,) = sub.getSubscription(alice);
        // Should extend from first expiry, not from now.
        assertEq(newExpiry, firstExpiry + PERIOD);
    }

    function test_subscribe_afterExpiry_startsFresh() public {
        vm.prank(alice);
        sub.subscribe(1);

        (, uint256 firstExpiry,) = sub.getSubscription(alice);

        // Warp past expiry.
        vm.warp(firstExpiry + 1);
        assertEq(sub.getTier(alice), 0);

        vm.prank(alice);
        sub.subscribe(1);

        (, uint256 newExpiry,) = sub.getSubscription(alice);
        // Fresh start: new expiry = warpedTimestamp + PERIOD.
        assertEq(newExpiry, firstExpiry + 1 + PERIOD);
    }

    function test_subscribe_upgrade_premiumToPro() public {
        vm.prank(alice);
        sub.subscribe(1);

        vm.prank(alice);
        sub.subscribe(2); // Upgrade.

        assertEq(sub.getTier(alice), 2);
        // Paid both prices.
        assertEq(usdc.balanceOf(owner), PREMIUM_PRICE + PRO_PRICE);
    }

    function test_subscribe_downgrade_reverts() public {
        vm.prank(alice);
        sub.subscribe(2);

        vm.prank(alice);
        vm.expectRevert(
            abi.encodeWithSelector(
                RosettaSubscription.AlreadySubscribedHigherTier.selector,
                alice, 2, 1
            )
        );
        sub.subscribe(1);
    }

    // -----------------------------------------------------------------------
    // Unsubscribe
    // -----------------------------------------------------------------------

    function test_unsubscribe() public {
        vm.prank(alice);
        sub.subscribe(1);

        vm.prank(alice);
        sub.unsubscribe();

        // Tier immediately drops to 0.
        assertEq(sub.getTier(alice), 0);
        assertFalse(sub.isSubscriber(alice, 1));
    }

    function test_unsubscribe_notSubscribed_reverts() public {
        vm.prank(alice);
        vm.expectRevert(abi.encodeWithSelector(RosettaSubscription.NotSubscribed.selector, alice));
        sub.unsubscribe();
    }

    // -----------------------------------------------------------------------
    // View helpers
    // -----------------------------------------------------------------------

    function test_tierPrice_view() public view {
        assertEq(sub.tierPrice(1), PREMIUM_PRICE);
        assertEq(sub.tierPrice(2), PRO_PRICE);
    }

    function test_tierPrice_invalidTier_reverts() public {
        vm.expectRevert(abi.encodeWithSelector(RosettaSubscription.InvalidTier.selector, 0));
        sub.tierPrice(0);
    }

    function test_getTier_expired_returnsZero() public {
        vm.prank(alice);
        sub.subscribe(1);

        vm.warp(block.timestamp + PERIOD + 1);
        assertEq(sub.getTier(alice), 0);
    }

    // -----------------------------------------------------------------------
    // Fuzz tests
    // -----------------------------------------------------------------------

    function testFuzz_subscribe_validTier(uint8 tier) public {
        vm.assume(tier >= 1 && tier <= 2);

        vm.prank(alice);
        sub.subscribe(tier);

        assertEq(sub.getTier(alice), tier);
    }

    function testFuzz_expiry_correctAfterWarp(uint256 warpTime) public {
        warpTime = bound(warpTime, 0, 365 days);

        vm.prank(alice);
        sub.subscribe(1);
        uint256 expiresAt = block.timestamp + PERIOD;

        vm.warp(block.timestamp + warpTime);

        if (block.timestamp >= expiresAt) {
            assertEq(sub.getTier(alice), 0);
        } else {
            assertEq(sub.getTier(alice), 1);
        }
    }

    function testFuzz_multipleRenewals(uint8 renewals) public {
        renewals = uint8(bound(renewals, 1, 10));

        uint256 expectedExpiry = block.timestamp;
        for (uint8 i = 0; i < renewals; i++) {
            vm.prank(alice);
            sub.subscribe(1);
            expectedExpiry += PERIOD;
        }

        (, uint256 actualExpiry,) = sub.getSubscription(alice);
        assertEq(actualExpiry, expectedExpiry);
        assertEq(sub.totalRevenue(), uint256(renewals) * PREMIUM_PRICE);
    }

    // -----------------------------------------------------------------------
    // Events
    // -----------------------------------------------------------------------

    function test_subscribe_emitsEvent() public {
        vm.prank(alice);
        vm.expectEmit(true, false, false, true);
        emit RosettaSubscription.Subscribed(alice, 1, block.timestamp + PERIOD, PREMIUM_PRICE);
        sub.subscribe(1);
    }

    function test_unsubscribe_emitsEvent() public {
        vm.prank(alice);
        sub.subscribe(2);

        vm.prank(alice);
        vm.expectEmit(true, false, false, true);
        emit RosettaSubscription.Unsubscribed(alice, 2);
        sub.unsubscribe();
    }
}
