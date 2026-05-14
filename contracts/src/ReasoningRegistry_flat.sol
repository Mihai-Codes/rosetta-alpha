// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20 ^0.8.24;

// lib/openzeppelin-contracts/contracts/utils/Context.sol

// OpenZeppelin Contracts (last updated v5.0.1) (utils/Context.sol)

/**
 * @dev Provides information about the current execution context, including the
 * sender of the transaction and its data. While these are generally available
 * via msg.sender and msg.data, they should not be accessed in such a direct
 * manner, since when dealing with meta-transactions the account sending and
 * paying for execution may not be the actual sender (as far as an application
 * is concerned).
 *
 * This contract is only required for intermediate, library-like contracts.
 */
abstract contract Context {
    function _msgSender() internal view virtual returns (address) {
        return msg.sender;
    }

    function _msgData() internal view virtual returns (bytes calldata) {
        return msg.data;
    }

    function _contextSuffixLength() internal view virtual returns (uint256) {
        return 0;
    }
}

// lib/openzeppelin-contracts/contracts/utils/StorageSlot.sol

// OpenZeppelin Contracts (last updated v5.1.0) (utils/StorageSlot.sol)
// This file was procedurally generated from scripts/generate/templates/StorageSlot.js.

/**
 * @dev Library for reading and writing primitive types to specific storage slots.
 *
 * Storage slots are often used to avoid storage conflict when dealing with upgradeable contracts.
 * This library helps with reading and writing to such slots without the need for inline assembly.
 *
 * The functions in this library return Slot structs that contain a `value` member that can be used to read or write.
 *
 * Example usage to set ERC-1967 implementation slot:
 * ```solidity
 * contract ERC1967 {
 *     // Define the slot. Alternatively, use the SlotDerivation library to derive the slot.
 *     bytes32 internal constant _IMPLEMENTATION_SLOT = 0x360894a13ba1a3210667c828492db98dca3e2076cc3735a920a3ca505d382bbc;
 *
 *     function _getImplementation() internal view returns (address) {
 *         return StorageSlot.getAddressSlot(_IMPLEMENTATION_SLOT).value;
 *     }
 *
 *     function _setImplementation(address newImplementation) internal {
 *         require(newImplementation.code.length > 0);
 *         StorageSlot.getAddressSlot(_IMPLEMENTATION_SLOT).value = newImplementation;
 *     }
 * }
 * ```
 *
 * TIP: Consider using this library along with {SlotDerivation}.
 */
library StorageSlot {
    struct AddressSlot {
        address value;
    }

    struct BooleanSlot {
        bool value;
    }

    struct Bytes32Slot {
        bytes32 value;
    }

    struct Uint256Slot {
        uint256 value;
    }

    struct Int256Slot {
        int256 value;
    }

    struct StringSlot {
        string value;
    }

    struct BytesSlot {
        bytes value;
    }

    /**
     * @dev Returns an `AddressSlot` with member `value` located at `slot`.
     */
    function getAddressSlot(bytes32 slot) internal pure returns (AddressSlot storage r) {
        assembly ("memory-safe") {
            r.slot := slot
        }
    }

    /**
     * @dev Returns a `BooleanSlot` with member `value` located at `slot`.
     */
    function getBooleanSlot(bytes32 slot) internal pure returns (BooleanSlot storage r) {
        assembly ("memory-safe") {
            r.slot := slot
        }
    }

    /**
     * @dev Returns a `Bytes32Slot` with member `value` located at `slot`.
     */
    function getBytes32Slot(bytes32 slot) internal pure returns (Bytes32Slot storage r) {
        assembly ("memory-safe") {
            r.slot := slot
        }
    }

    /**
     * @dev Returns a `Uint256Slot` with member `value` located at `slot`.
     */
    function getUint256Slot(bytes32 slot) internal pure returns (Uint256Slot storage r) {
        assembly ("memory-safe") {
            r.slot := slot
        }
    }

    /**
     * @dev Returns a `Int256Slot` with member `value` located at `slot`.
     */
    function getInt256Slot(bytes32 slot) internal pure returns (Int256Slot storage r) {
        assembly ("memory-safe") {
            r.slot := slot
        }
    }

    /**
     * @dev Returns a `StringSlot` with member `value` located at `slot`.
     */
    function getStringSlot(bytes32 slot) internal pure returns (StringSlot storage r) {
        assembly ("memory-safe") {
            r.slot := slot
        }
    }

    /**
     * @dev Returns an `StringSlot` representation of the string storage pointer `store`.
     */
    function getStringSlot(string storage store) internal pure returns (StringSlot storage r) {
        assembly ("memory-safe") {
            r.slot := store.slot
        }
    }

    /**
     * @dev Returns a `BytesSlot` with member `value` located at `slot`.
     */
    function getBytesSlot(bytes32 slot) internal pure returns (BytesSlot storage r) {
        assembly ("memory-safe") {
            r.slot := slot
        }
    }

    /**
     * @dev Returns an `BytesSlot` representation of the bytes storage pointer `store`.
     */
    function getBytesSlot(bytes storage store) internal pure returns (BytesSlot storage r) {
        assembly ("memory-safe") {
            r.slot := store.slot
        }
    }
}

// lib/openzeppelin-contracts/contracts/access/Ownable.sol

// OpenZeppelin Contracts (last updated v5.0.0) (access/Ownable.sol)

/**
 * @dev Contract module which provides a basic access control mechanism, where
 * there is an account (an owner) that can be granted exclusive access to
 * specific functions.
 *
 * The initial owner is set to the address provided by the deployer. This can
 * later be changed with {transferOwnership}.
 *
 * This module is used through inheritance. It will make available the modifier
 * `onlyOwner`, which can be applied to your functions to restrict their use to
 * the owner.
 */
abstract contract Ownable is Context {
    address private _owner;

    /**
     * @dev The caller account is not authorized to perform an operation.
     */
    error OwnableUnauthorizedAccount(address account);

    /**
     * @dev The owner is not a valid owner account. (eg. `address(0)`)
     */
    error OwnableInvalidOwner(address owner);

    event OwnershipTransferred(address indexed previousOwner, address indexed newOwner);

    /**
     * @dev Initializes the contract setting the address provided by the deployer as the initial owner.
     */
    constructor(address initialOwner) {
        if (initialOwner == address(0)) {
            revert OwnableInvalidOwner(address(0));
        }
        _transferOwnership(initialOwner);
    }

    /**
     * @dev Throws if called by any account other than the owner.
     */
    modifier onlyOwner() {
        _checkOwner();
        _;
    }

    /**
     * @dev Returns the address of the current owner.
     */
    function owner() public view virtual returns (address) {
        return _owner;
    }

    /**
     * @dev Throws if the sender is not the owner.
     */
    function _checkOwner() internal view virtual {
        if (owner() != _msgSender()) {
            revert OwnableUnauthorizedAccount(_msgSender());
        }
    }

    /**
     * @dev Leaves the contract without owner. It will not be possible to call
     * `onlyOwner` functions. Can only be called by the current owner.
     *
     * NOTE: Renouncing ownership will leave the contract without an owner,
     * thereby disabling any functionality that is only available to the owner.
     */
    function renounceOwnership() public virtual onlyOwner {
        _transferOwnership(address(0));
    }

    /**
     * @dev Transfers ownership of the contract to a new account (`newOwner`).
     * Can only be called by the current owner.
     */
    function transferOwnership(address newOwner) public virtual onlyOwner {
        if (newOwner == address(0)) {
            revert OwnableInvalidOwner(address(0));
        }
        _transferOwnership(newOwner);
    }

    /**
     * @dev Transfers ownership of the contract to a new account (`newOwner`).
     * Internal function without access restriction.
     */
    function _transferOwnership(address newOwner) internal virtual {
        address oldOwner = _owner;
        _owner = newOwner;
        emit OwnershipTransferred(oldOwner, newOwner);
    }
}

// lib/openzeppelin-contracts/contracts/utils/ReentrancyGuard.sol

// OpenZeppelin Contracts (last updated v5.5.0) (utils/ReentrancyGuard.sol)

/**
 * @dev Contract module that helps prevent reentrant calls to a function.
 *
 * Inheriting from `ReentrancyGuard` will make the {nonReentrant} modifier
 * available, which can be applied to functions to make sure there are no nested
 * (reentrant) calls to them.
 *
 * Note that because there is a single `nonReentrant` guard, functions marked as
 * `nonReentrant` may not call one another. This can be worked around by making
 * those functions `private`, and then adding `external` `nonReentrant` entry
 * points to them.
 *
 * TIP: If EIP-1153 (transient storage) is available on the chain you're deploying at,
 * consider using {ReentrancyGuardTransient} instead.
 *
 * TIP: If you would like to learn more about reentrancy and alternative ways
 * to protect against it, check out our blog post
 * https://blog.openzeppelin.com/reentrancy-after-istanbul/[Reentrancy After Istanbul].
 *
 * IMPORTANT: Deprecated. This storage-based reentrancy guard will be removed and replaced
 * by the {ReentrancyGuardTransient} variant in v6.0.
 *
 * @custom:stateless
 */
abstract contract ReentrancyGuard {
    using StorageSlot for bytes32;

    // keccak256(abi.encode(uint256(keccak256("openzeppelin.storage.ReentrancyGuard")) - 1)) & ~bytes32(uint256(0xff))
    bytes32 private constant REENTRANCY_GUARD_STORAGE =
        0x9b779b17422d0df92223018b32b4d1fa46e071723d6817e2486d003becc55f00;

    // Booleans are more expensive than uint256 or any type that takes up a full
    // word because each write operation emits an extra SLOAD to first read the
    // slot's contents, replace the bits taken up by the boolean, and then write
    // back. This is the compiler's defense against contract upgrades and
    // pointer aliasing, and it cannot be disabled.

    // The values being non-zero value makes deployment a bit more expensive,
    // but in exchange the refund on every call to nonReentrant will be lower in
    // amount. Since refunds are capped to a percentage of the total
    // transaction's gas, it is best to keep them low in cases like this one, to
    // increase the likelihood of the full refund coming into effect.
    uint256 private constant NOT_ENTERED = 1;
    uint256 private constant ENTERED = 2;

    /**
     * @dev Unauthorized reentrant call.
     */
    error ReentrancyGuardReentrantCall();

    constructor() {
        _reentrancyGuardStorageSlot().getUint256Slot().value = NOT_ENTERED;
    }

    /**
     * @dev Prevents a contract from calling itself, directly or indirectly.
     * Calling a `nonReentrant` function from another `nonReentrant`
     * function is not supported. It is possible to prevent this from happening
     * by making the `nonReentrant` function external, and making it call a
     * `private` function that does the actual work.
     */
    modifier nonReentrant() {
        _nonReentrantBefore();
        _;
        _nonReentrantAfter();
    }

    /**
     * @dev A `view` only version of {nonReentrant}. Use to block view functions
     * from being called, preventing reading from inconsistent contract state.
     *
     * CAUTION: This is a "view" modifier and does not change the reentrancy
     * status. Use it only on view functions. For payable or non-payable functions,
     * use the standard {nonReentrant} modifier instead.
     */
    modifier nonReentrantView() {
        _nonReentrantBeforeView();
        _;
    }

    function _nonReentrantBeforeView() private view {
        if (_reentrancyGuardEntered()) {
            revert ReentrancyGuardReentrantCall();
        }
    }

    function _nonReentrantBefore() private {
        // On the first call to nonReentrant, _status will be NOT_ENTERED
        _nonReentrantBeforeView();

        // Any calls to nonReentrant after this point will fail
        _reentrancyGuardStorageSlot().getUint256Slot().value = ENTERED;
    }

    function _nonReentrantAfter() private {
        // By storing the original value once again, a refund is triggered (see
        // https://eips.ethereum.org/EIPS/eip-2200)
        _reentrancyGuardStorageSlot().getUint256Slot().value = NOT_ENTERED;
    }

    /**
     * @dev Returns true if the reentrancy guard is currently set to "entered", which indicates there is a
     * `nonReentrant` function in the call stack.
     */
    function _reentrancyGuardEntered() internal view returns (bool) {
        return _reentrancyGuardStorageSlot().getUint256Slot().value == ENTERED;
    }

    function _reentrancyGuardStorageSlot() internal pure virtual returns (bytes32) {
        return REENTRANCY_GUARD_STORAGE;
    }
}

// src/ReasoningRegistry.sol

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

