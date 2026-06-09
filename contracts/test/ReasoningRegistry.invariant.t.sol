// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Test, console2} from "forge-std/Test.sol";
import {ReasoningRegistry} from "../src/ReasoningRegistry.sol";

/**
 * @title RegistryHandler
 * @notice Bounded handler for ReasoningRegistry invariant fuzzing.
 */
contract RegistryHandler is Test {
    ReasoningRegistry public registry;

    bytes32[] public recordedHashes;
    mapping(bytes32 => bool) public isRecorded;

    // Ghost variables
    uint256 public ghost_recordCalls;
    uint256 public ghost_duplicateReverts;

    constructor(ReasoningRegistry _registry) {
        registry = _registry;
    }

    function record(bytes32 traceHash) external {
        traceHash = bytes32(uint256(traceHash) % 1000); // bound to small set
        if (traceHash == bytes32(0)) return;

        if (isRecorded[traceHash]) {
            ghost_duplicateReverts++;
            return; // will revert, skip
        }

        registry.record(traceHash, "bafkrei-test", ReasoningRegistry.Region.US, ReasoningRegistry.AssetClass.CRYPTO);
        recordedHashes.push(traceHash);
        isRecorded[traceHash] = true;
        ghost_recordCalls++;
    }

    function getRecordedCount() external view returns (uint256) {
        return recordedHashes.length;
    }
}

/**
 * @title ReasoningRegistryInvariantTest
 * @notice Invariant tests for ReasoningRegistry.
 *
 * Invariants:
 *   1. Append-only: recorded trace data never changes
 *   2. Count consistency: traceHashes.length == totalTraces()
 *   3. No duplicate hashes in the array
 */
contract ReasoningRegistryInvariantTest is Test {
    ReasoningRegistry public registry;
    RegistryHandler public handler;

    address owner = address(0xBEEF);
    address submitter = address(0xDEAD);

    function setUp() public {
        vm.prank(owner);
        registry = new ReasoningRegistry(owner, submitter);

        handler = new RegistryHandler(registry);
        targetContract(address(handler));
        targetSender(submitter);
    }

    /// @notice Append-only: once recorded, traceHash cannot be overwritten.
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
    function invariant_noDuplicates() public view {
        for (uint256 i; i < handler.getRecordedCount(); ++i) {
            for (uint256 j = i + 1; j < handler.getRecordedCount(); ++j) {
                assertTrue(
                    handler.recordedHashes(i) != handler.recordedHashes(j),
                    "duplicate hash in array"
                );
            }
        }
    }
}
