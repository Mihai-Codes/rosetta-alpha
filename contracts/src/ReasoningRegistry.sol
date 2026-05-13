// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/**
 * @title ReasoningRegistry
 * @notice Immutable, append-only registry of AI reasoning traces for Rosetta Alpha.
 *
 * Every regional agent (US, CN, CRYPTO, EU …) produces an InvestmentThesis.
 * The Python pipeline:
 *   1. Canonically hashes the thesis JSON (SHA-256, sorted keys, UTF-8).
 *   2. Pins the raw JSON to IPFS and obtains a CIDv1.
 *   3. Calls `record()` here, committing the (hash, CID, metadata) triple on-chain.
 *
 * Why on-chain?
 * - Tamper-evidence: the hash is sealed in a block.
 * - Discoverability: any wallet can enumerate traces for a region or asset class.
 * - Future: PredictionMarket.sol resolves against traces stored here.
 *
 * Security non-negotiables (per AGENTS.md §6):
 * - OpenZeppelin Ownable + ReentrancyGuard (no rolling our own).
 * - No tx.origin.
 * - No unchecked low-level calls.
 * - Traces are append-only: once recorded a hash cannot be overwritten.
 *
 * @dev Inherits Ownable (deployer is initial owner) and ReentrancyGuard.
 *      `record()` is gated behind an `authorized` mapping so only approved
 *      submitters (Python pipeline wallets) can write traces.
 */
contract ReasoningRegistry is Ownable, ReentrancyGuard {
    // -----------------------------------------------------------------------
    // Types
    // -----------------------------------------------------------------------

    enum Region {
        US,     // 0
        CN,     // 1
        EU,     // 2
        JP,     // 3
        CRYPTO  // 4
    }

    enum AssetClass {
        EQUITY,        // 0
        FIXED_INCOME,  // 1
        COMMODITY,     // 2
        CRYPTO,        // 3
        FX,            // 4
        REAL_ESTATE    // 5
    }

    /**
     * @dev On-chain footprint of one reasoning trace. Mirrors
     *      `reasoning.trace_schema.TraceMetadata` in the Python layer.
     *      Field order is part of the ABI — do not reorder.
     */
    struct TraceMetadata {
        bytes32 traceHash;      // SHA-256 of canonical thesis JSON (0x-prefixed in Python)
        string  ipfsCid;        // CIDv1, e.g. "bafkrei..."
        Region  region;
        AssetClass assetClass;
        uint256 timestamp;      // block.timestamp at record time
        address submitter;      // authorised pipeline wallet
    }

    // -----------------------------------------------------------------------
    // State
    // -----------------------------------------------------------------------

    /// @notice Hash → full metadata. The primary lookup.
    mapping(bytes32 => TraceMetadata) public traces;

    /// @notice Ordered list of all recorded hashes (for enumeration).
    bytes32[] public traceHashes;

    /// @notice Wallets authorised to call `record()`.
    mapping(address => bool) public authorized;

    // -----------------------------------------------------------------------
    // Events
    // -----------------------------------------------------------------------

    /// @dev Emitted on every successful `record()`. Index traceHash for fast lookups.
    event TraceRecorded(
        bytes32 indexed traceHash,
        string          ipfsCid,
        Region          region,
        AssetClass      assetClass,
        address indexed submitter,
        uint256         timestamp
    );

    /// @dev Emitted when an address is granted/revoked authorization.
    event AuthorizationUpdated(address indexed account, bool authorized);

    // -----------------------------------------------------------------------
    // Errors
    // -----------------------------------------------------------------------

    error NotAuthorized();
    error TraceAlreadyExists(bytes32 traceHash);
    error EmptyCid();
    error ZeroHash();

    // -----------------------------------------------------------------------
    // Constructor
    // -----------------------------------------------------------------------

    /**
     * @param initialOwner Address that becomes the Ownable owner (deployer in prod).
     * @param initialSubmitter First authorized submitter (Python pipeline wallet).
     */
    constructor(address initialOwner, address initialSubmitter)
        Ownable(initialOwner)
    {
        _setAuthorized(initialSubmitter, true);
    }

    // -----------------------------------------------------------------------
    // Core write
    // -----------------------------------------------------------------------

    /**
     * @notice Record an AI reasoning trace on-chain.
     *
     * Callable only by authorized submitters (Python pipeline wallet).
     * Traces are append-only: recording the same hash twice reverts.
     *
     * Reentrancy guard is present because future versions may call out to
     * token contracts (staking, slashing) from this function.
     *
     * @param traceHash  SHA-256 of the canonical thesis JSON, as bytes32.
     * @param ipfsCid    IPFS CIDv1 where the full thesis JSON is pinned.
     * @param region     Region enum value (US=0, CN=1, EU=2, JP=3, CRYPTO=4).
     * @param assetClass AssetClass enum value.
     */
    function record(
        bytes32    traceHash,
        string calldata ipfsCid,
        Region     region,
        AssetClass assetClass
    ) external nonReentrant {
        // --- access control ---
        if (!authorized[msg.sender]) revert NotAuthorized();

        // --- input validation ---
        if (traceHash == bytes32(0)) revert ZeroHash();
        if (bytes(ipfsCid).length == 0) revert EmptyCid();

        // --- append-only guard ---
        if (traces[traceHash].timestamp != 0) revert TraceAlreadyExists(traceHash);

        // --- write ---
        TraceMetadata memory meta = TraceMetadata({
            traceHash:  traceHash,
            ipfsCid:    ipfsCid,
            region:     region,
            assetClass: assetClass,
            timestamp:  block.timestamp,
            submitter:  msg.sender
        });

        traces[traceHash] = meta;
        traceHashes.push(traceHash);

        emit TraceRecorded(traceHash, ipfsCid, region, assetClass, msg.sender, block.timestamp);
    }

    // -----------------------------------------------------------------------
    // Views
    // -----------------------------------------------------------------------

    /// @notice Returns the total number of recorded traces.
    function totalTraces() external view returns (uint256) {
        return traceHashes.length;
    }

    /**
     * @notice Paginated enumeration of trace hashes.
     * @param offset Starting index (0-based).
     * @param limit  Maximum number of hashes to return.
     */
    function getTraceHashes(uint256 offset, uint256 limit)
        external
        view
        returns (bytes32[] memory page)
    {
        uint256 total = traceHashes.length;
        if (offset >= total) return new bytes32[](0);
        uint256 end = offset + limit;
        if (end > total) end = total;
        page = new bytes32[](end - offset);
        for (uint256 i = offset; i < end; i++) {
            page[i - offset] = traceHashes[i];
        }
    }

    // -----------------------------------------------------------------------
    // Owner-only admin
    // -----------------------------------------------------------------------

    /**
     * @notice Grant or revoke submitter authorization.
     * @param account   Address to update.
     * @param isAuthorized True to grant, false to revoke.
     */
    function setAuthorized(address account, bool isAuthorized) external onlyOwner {
        _setAuthorized(account, isAuthorized);
    }

    function _setAuthorized(address account, bool isAuthorized) internal {
        authorized[account] = isAuthorized;
        emit AuthorizationUpdated(account, isAuthorized);
    }
}
