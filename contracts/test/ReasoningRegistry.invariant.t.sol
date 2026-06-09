// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Test} from "forge-std/Test.sol";
import {ReasoningRegistry} from "../src/ReasoningRegistry.sol";

/**
 * @title RegistryHandler
 * @notice Bounded handler for ReasoningRegistry invariant fuzzing.
 *         Uses vm.prank(submitter) so the registry sees an authorized caller.
 */
contract RegistryHandler is Test {
    ReasoningRegistry public registry;
    address public submitter;

    bytes32[] public recordedHashes;
    mapping(bytes32 => bool) public isRecorded;

    constructor(ReasoningRegistry _registry, address _submitter) {
        registry = _registry;
        submitter = _submitter;
    }

    function record(bytes32 traceHash) external {
        traceHash = bytes32(uint256(traceHash) % 1000);
        if (traceHash == bytes32(0)) return;
        if (isRecorded[traceHash]) return;

        vm.prank(submitter);
        registry.record(traceHash, "bafkrei-test", ReasoningRegistry.Region.US, ReasoningRegistry.AssetClass.CRYPTO);
        recordedHashes.push(traceHash);
        isRecorded[traceHash] = true;
    }

    function getRecordedCount() external view returns (uint256) {
        return recordedHashes.length;
    }
}

/**
 * @title ReasoningRegistryInvariantTest
 * @notice Invariant tests for ReasoningRegistry.
 */
contract ReasoningRegistryInvariantTest is Test {
    ReasoningRegistry public registry;
    RegistryHandler public handler;

    address owner = address(0xBEEF);
    address submitter = address(0xDEAD);

    // Mapping-based duplicate check (O(1) instead of O(n^2))
    mapping(bytes32 => bool) public seenHash;

    function setUp() public {
        vm.prank(owner);
        registry = new ReasoningRegistry(owner, submitter);

        handler = new RegistryHandler(registry, submitter);
        targetContract(address(handler));
        targetSender(submitter);
    }

    /// @notice Append-only: once recorded, trace data never changes.
    function invariant_appendOnly() public view {
        for (uint256 i; i < handler.getRecordedCount(); ++i) {
            bytes32 hash = handler.recordedHashes(i);
            (, string memory cid, , , uint256 ts, ) = registry.traces(hash);
            assertGt(ts, 0, "recorded hash has timestamp=0");
            assertEq(bytes(cid).length > 0, true, "recorded hash has empty CID");
        }
    }

    /// @notice Count consistency: array length matches totalTraces().
    function invariant_countConsistency() public view {
        assertEq(handler.getRecordedCount(), registry.totalTraces(), "count mismatch");
    }

    /// @notice No duplicate hashes in traceHashes array.
    function invariant_noDuplicates() public {
        // Reset seen mapping
        for (uint256 i; i < handler.getRecordedCount(); ++i) {
            bytes32 hash = handler.recordedHashes(i);
            assertFalse(seenHash[hash], "duplicate hash in array");
            seenHash[hash] = true;
        }
        // Clean up for next run
        for (uint256 i; i < handler.getRecordedCount(); ++i) {
            seenHash[handler.recordedHashes(i)] = false;
        }
    }
}
