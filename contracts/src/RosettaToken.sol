// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/**
 * @title RosettaToken
 * @notice ERC-20 performance bond token for the Rosetta Alpha multi-agent system.
 *
 * Mechanics:
 *   1. Agent pipelines **stake** ROSETTA before submitting a reasoning trace.
 *   2. When a prediction resolves correctly, the agent **claims** a reward.
 *   3. When a prediction is provably wrong (resolved by PredictionMarket.sol),
 *      the agent's stake is **slashed** — tokens are burned.
 *
 * Roles:
 *   - owner     : deploy-time admin (can mint, grant slasher role).
 *   - slasher   : PredictionMarket.sol address(es) allowed to call slash().
 *
 * Security (per AGENTS.md §6):
 *   - OpenZeppelin ERC20 + Ownable + ReentrancyGuard.
 *   - No tx.origin.
 *   - Reentrancy guard on stake/unstake/slash.
 *   - Slashing is role-gated, not open to arbitrary callers.
 */
contract RosettaToken is ERC20, Ownable, ReentrancyGuard {
    // -----------------------------------------------------------------------
    // State
    // -----------------------------------------------------------------------

    /// @notice Addresses permitted to call slash() (e.g. PredictionMarket).
    mapping(address => bool) public slashers;

    /// @notice Staked balance per agent address.
    mapping(address => uint256) public stakedBalance;

    /// @notice Total tokens currently staked across all agents.
    uint256 public totalStaked;

    // -----------------------------------------------------------------------
    // Events
    // -----------------------------------------------------------------------

    event Staked(address indexed agent, uint256 amount, uint256 newTotal);
    event Unstaked(address indexed agent, uint256 amount, uint256 remaining);
    event Slashed(address indexed agent, uint256 amount, address indexed slasher);
    event SlasherUpdated(address indexed account, bool isSlasher);
    event Minted(address indexed to, uint256 amount);

    // -----------------------------------------------------------------------
    // Errors
    // -----------------------------------------------------------------------

    error NotSlasher(address caller);
    error InsufficientStake(address agent, uint256 requested, uint256 available);
    error ZeroAmount();

    // -----------------------------------------------------------------------
    // Constructor
    // -----------------------------------------------------------------------

    /**
     * @param initialOwner  Deployer / admin wallet.
     * @param initialSupply Tokens minted to deployer at launch (18 decimals).
     *                      Suggested: 1_000_000 * 1e18 for hackathon.
     */
    constructor(address initialOwner, uint256 initialSupply)
        ERC20("RosettaToken", "ROSETTA")
        Ownable(initialOwner)
    {
        if (initialSupply > 0) {
            _mint(initialOwner, initialSupply);
            emit Minted(initialOwner, initialSupply);
        }
    }

    // -----------------------------------------------------------------------
    // Admin
    // -----------------------------------------------------------------------

    /// @notice Mint additional tokens (owner only — for rewards pool top-ups).
    function mint(address to, uint256 amount) external onlyOwner {
        if (amount == 0) revert ZeroAmount();
        _mint(to, amount);
        emit Minted(to, amount);
    }

    /// @notice Grant or revoke slasher role (owner only).
    function setSlasher(address account, bool isSlasher) external onlyOwner {
        slashers[account] = isSlasher;
        emit SlasherUpdated(account, isSlasher);
    }

    // -----------------------------------------------------------------------
    // Staking
    // -----------------------------------------------------------------------

    /**
     * @notice Lock `amount` tokens as a performance bond.
     *         Caller must have approved this contract for `amount` first.
     * @param amount Tokens to stake (must be > 0).
     */
    function stake(uint256 amount) external nonReentrant {
        if (amount == 0) revert ZeroAmount();
        // Pull tokens from caller into this contract.
        _transfer(msg.sender, address(this), amount);
        stakedBalance[msg.sender] += amount;
        totalStaked += amount;
        emit Staked(msg.sender, amount, stakedBalance[msg.sender]);
    }

    /**
     * @notice Withdraw `amount` tokens from your stake (no lockup for hackathon).
     * @param amount Tokens to unstake.
     */
    function unstake(uint256 amount) external nonReentrant {
        if (amount == 0) revert ZeroAmount();
        uint256 available = stakedBalance[msg.sender];
        if (available < amount) revert InsufficientStake(msg.sender, amount, available);
        stakedBalance[msg.sender] -= amount;
        totalStaked -= amount;
        _transfer(address(this), msg.sender, amount);
        emit Unstaked(msg.sender, amount, stakedBalance[msg.sender]);
    }

    // -----------------------------------------------------------------------
    // Slashing
    // -----------------------------------------------------------------------

    /**
     * @notice Burn `amount` from an agent's stake (called by PredictionMarket).
     *         Slashed tokens are permanently destroyed — not redistributed.
     * @param agent  The agent whose bond is slashed.
     * @param amount Tokens to burn.
     */
    function slash(address agent, uint256 amount) external nonReentrant {
        if (!slashers[msg.sender]) revert NotSlasher(msg.sender);
        if (amount == 0) revert ZeroAmount();
        uint256 available = stakedBalance[agent];
        // Clamp to available stake — never revert on over-slash.
        uint256 actual = amount > available ? available : amount;
        if (actual == 0) return;
        stakedBalance[agent] -= actual;
        totalStaked -= actual;
        _burn(address(this), actual);
        emit Slashed(agent, actual, msg.sender);
    }

    // -----------------------------------------------------------------------
    // View helpers
    // -----------------------------------------------------------------------

    /// @notice Liquid (unstaked) balance of an account.
    function liquidBalance(address account) external view returns (uint256) {
        return balanceOf(account);
    }

    /// @notice Combined liquid + staked balance.
    function totalBalanceOf(address account) external view returns (uint256) {
        return balanceOf(account) + stakedBalance[account];
    }
}
