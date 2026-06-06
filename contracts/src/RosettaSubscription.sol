// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

/**
 * @title RosettaSubscription
 * @notice USDC-based subscription contract for Rosetta Alpha tiered access.
 *
 * Tiers:
 *   0 = None (free / expired)
 *   1 = Premium ($29 USDC/month) — real-time theses, provenance, alerts
 *   2 = Pro Trader ($99 USDC/month) — API access, builder rewards, priority
 *
 * Mechanics:
 *   - User calls `subscribe(tier)` with USDC pre-approved.
 *   - Contract pulls exact tier price via `transferFrom`.
 *   - Subscription valid for 30 days from payment timestamp.
 *   - Renewals extend from current expiry (not from now) if still active.
 *   - Owner receives all subscription revenue (treasury).
 *
 * Security (per AGENTS.md §8):
 *   - OpenZeppelin SafeERC20 (handles USDC's non-standard approve).
 *   - ReentrancyGuard on subscribe.
 *   - No tx.origin. No unchecked calls.
 *   - Tier pricing immutable after deploy (no admin rug on price).
 */
contract RosettaSubscription is Ownable, ReentrancyGuard {
    using SafeERC20 for IERC20;

    // -----------------------------------------------------------------------
    // Constants
    // -----------------------------------------------------------------------

    /// @notice Subscription period: 30 days.
    uint256 public constant PERIOD = 30 days;

    /// @notice USDC uses 6 decimals on Arc.
    uint256 public constant USDC_DECIMALS = 6;

    // -----------------------------------------------------------------------
    // Immutables
    // -----------------------------------------------------------------------

    /// @notice USDC token address on Arc testnet.
    IERC20 public immutable usdc;

    /// @notice Price per tier in USDC atomic units (6 decimals).
    /// @dev Set at construction, immutable — no admin price manipulation.
    uint256 public immutable premiumPrice;
    uint256 public immutable proPrice;

    // -----------------------------------------------------------------------
    // State
    // -----------------------------------------------------------------------

    struct Subscription {
        uint8 tier;       // 0=none, 1=premium, 2=pro
        uint256 expiresAt; // unix timestamp
    }

    /// @notice Active subscriptions by address.
    mapping(address => Subscription) public subscriptions;

    /// @notice Total revenue collected (accounting only).
    uint256 public totalRevenue;

    // -----------------------------------------------------------------------
    // Events
    // -----------------------------------------------------------------------

    event Subscribed(address indexed subscriber, uint8 tier, uint256 expiresAt, uint256 paid);
    event Unsubscribed(address indexed subscriber, uint8 previousTier);
    event TreasuryWithdrawn(address indexed to, uint256 amount);

    // -----------------------------------------------------------------------
    // Errors
    // -----------------------------------------------------------------------

    error InvalidTier(uint8 tier);
    error AlreadySubscribedHigherTier(address subscriber, uint8 current, uint8 requested);
    error NotSubscribed(address subscriber);
    error ZeroAddress();

    // -----------------------------------------------------------------------
    // Constructor
    // -----------------------------------------------------------------------

    /**
     * @param _owner       Treasury / admin address.
     * @param _usdc        USDC ERC-20 address on Arc (6 decimals).
     * @param _premiumPrice Price for tier 1 in USDC atomic units (29 * 10^6 = 29_000_000).
     * @param _proPrice     Price for tier 2 in USDC atomic units (99 * 10^6 = 99_000_000).
     */
    constructor(
        address _owner,
        address _usdc,
        uint256 _premiumPrice,
        uint256 _proPrice
    ) Ownable(_owner) {
        if (_usdc == address(0)) revert ZeroAddress();
        usdc = IERC20(_usdc);
        premiumPrice = _premiumPrice;
        proPrice = _proPrice;
    }

    // -----------------------------------------------------------------------
    // Core
    // -----------------------------------------------------------------------

    /**
     * @notice Subscribe or upgrade to a tier. Caller must have approved USDC.
     * @param tier 1 = Premium, 2 = Pro.
     *
     * Renewal logic:
     *   - If subscription is still active, new period extends from current expiresAt.
     *   - If expired or new, period starts from block.timestamp.
     *   - Upgrading tier mid-period: pays full new-tier price, expiry extends 30d from now.
     */
    function subscribe(uint8 tier) external nonReentrant {
        if (tier == 0 || tier > 2) revert InvalidTier(tier);

        uint256 price = _tierPrice(tier);
        Subscription storage sub = subscriptions[msg.sender];

        // Prevent downgrade — user must unsubscribe first.
        if (sub.tier > tier && sub.expiresAt > block.timestamp) {
            revert AlreadySubscribedHigherTier(msg.sender, sub.tier, tier);
        }

        // Calculate new expiry: extend if active, else start fresh.
        uint256 baseTime;
        if (sub.tier == tier && sub.expiresAt > block.timestamp) {
            // Same-tier renewal: extend from current expiry.
            baseTime = sub.expiresAt;
        } else {
            // New subscription or upgrade: start from now.
            baseTime = block.timestamp;
        }

        sub.tier = tier;
        sub.expiresAt = baseTime + PERIOD;
        totalRevenue += price;

        // Pull USDC from subscriber → this contract.
        usdc.safeTransferFrom(msg.sender, owner(), price);

        emit Subscribed(msg.sender, tier, sub.expiresAt, price);
    }

    /**
     * @notice Voluntarily cancel subscription. Does NOT refund remaining time.
     *         Access revokes immediately (getTier returns 0). No grace period.
     */
    function unsubscribe() external {
        Subscription storage sub = subscriptions[msg.sender];
        if (sub.tier == 0) revert NotSubscribed(msg.sender);

        uint8 previousTier = sub.tier;
        sub.tier = 0;
        // expiresAt left unchanged — effectively marks "cancelled, access until expiry"
        // but getTier() will return 0 immediately since we set tier=0.

        emit Unsubscribed(msg.sender, previousTier);
    }

    // -----------------------------------------------------------------------
    // View helpers (DRY: single source of truth for tier status)
    // -----------------------------------------------------------------------

    /**
     * @notice Get effective tier for an address (0 if expired or unsubscribed).
     * @dev This is THE canonical check — used by frontend, middleware, and other contracts.
     */
    function getTier(address subscriber) external view returns (uint8) {
        Subscription memory sub = subscriptions[subscriber];
        if (sub.tier == 0 || sub.expiresAt <= block.timestamp) return 0;
        return sub.tier;
    }

    /**
     * @notice Full subscription details.
     * @return tier Effective tier (0 if expired).
     * @return expiresAt Expiry timestamp (0 if never subscribed).
     * @return active Whether subscription is currently active.
     */
    function getSubscription(address subscriber)
        external
        view
        returns (uint8 tier, uint256 expiresAt, bool active)
    {
        Subscription memory sub = subscriptions[subscriber];
        active = sub.tier > 0 && sub.expiresAt > block.timestamp;
        tier = active ? sub.tier : 0;
        expiresAt = sub.expiresAt;
    }

    /**
     * @notice Check if address has at least the required tier.
     * @param subscriber Address to check.
     * @param requiredTier Minimum tier needed (1 or 2).
     */
    function isSubscriber(address subscriber, uint8 requiredTier) external view returns (bool) {
        Subscription memory sub = subscriptions[subscriber];
        if (sub.tier == 0 || sub.expiresAt <= block.timestamp) return false;
        return sub.tier >= requiredTier;
    }

    // -----------------------------------------------------------------------
    // Internal
    // -----------------------------------------------------------------------

    /// @dev DRY price lookup — single mapping from tier to price.
    function _tierPrice(uint8 tier) internal view returns (uint256) {
        if (tier == 1) return premiumPrice;
        if (tier == 2) return proPrice;
        revert InvalidTier(tier);
    }

    /// @notice Get price for a tier (public view for frontend display).
    function tierPrice(uint8 tier) external view returns (uint256) {
        return _tierPrice(tier);
    }
}
