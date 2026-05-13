// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Test, console2} from "forge-std/Test.sol";
import {ReasoningRegistry} from "../src/ReasoningRegistry.sol";

/**
 * @title ReasoningRegistry Tests
 * @dev Run with: forge test --match-path test/ReasoningRegistry.t.sol -vv
 */
contract ReasoningRegistryTest is Test {
    ReasoningRegistry public registry;

    address constant OWNER     = address(0x1);
    address constant SUBMITTER = address(0x2);
    address constant STRANGER  = address(0x3);

    bytes32 constant HASH_A = keccak256("thesis_A");
    bytes32 constant HASH_B = keccak256("thesis_B");
    string  constant CID_A  = "bafkreiclvmdpzjtn4pu2hfq3dm3lydfgdcmons5hqb7lx5qvt4ha7agw4q";
    string  constant CID_B  = "bafkreiank6mdwodj2he3l76dk3a5ye5bwpf2uzdo5a6utht5jj6kuwojjm";

    function setUp() public {
        registry = new ReasoningRegistry(OWNER, SUBMITTER);
    }

    // -----------------------------------------------------------------------
    // Deployment
    // -----------------------------------------------------------------------

    function test_OwnerIsSet() public view {
        assertEq(registry.owner(), OWNER);
    }

    function test_InitialSubmitterIsAuthorized() public view {
        assertTrue(registry.authorized(SUBMITTER));
    }

    function test_StrangerNotAuthorized() public view {
        assertFalse(registry.authorized(STRANGER));
    }

    function test_TotalTracesStartsAtZero() public view {
        assertEq(registry.totalTraces(), 0);
    }

    // -----------------------------------------------------------------------
    // record() — happy path
    // -----------------------------------------------------------------------

    function test_RecordSucceeds() public {
        vm.prank(SUBMITTER);
        registry.record(HASH_A, CID_A, ReasoningRegistry.Region.US, ReasoningRegistry.AssetClass.EQUITY);

        assertEq(registry.totalTraces(), 1);

        (
            bytes32 hash,
            string memory cid,
            ReasoningRegistry.Region region,
            ReasoningRegistry.AssetClass assetClass,
            uint256 ts,
            address submitter
        ) = _getTrace(HASH_A);

        assertEq(hash, HASH_A);
        assertEq(cid, CID_A);
        assertEq(uint8(region), uint8(ReasoningRegistry.Region.US));
        assertEq(uint8(assetClass), uint8(ReasoningRegistry.AssetClass.EQUITY));
        assertEq(submitter, SUBMITTER);
        assertGt(ts, 0);
    }

    function test_RecordEmitsEvent() public {
        vm.expectEmit(true, true, false, true);
        emit ReasoningRegistry.TraceRecorded(
            HASH_A,
            CID_A,
            ReasoningRegistry.Region.US,
            ReasoningRegistry.AssetClass.EQUITY,
            SUBMITTER,
            block.timestamp
        );

        vm.prank(SUBMITTER);
        registry.record(HASH_A, CID_A, ReasoningRegistry.Region.US, ReasoningRegistry.AssetClass.EQUITY);
    }

    function test_RecordMultipleTraces() public {
        vm.startPrank(SUBMITTER);
        registry.record(HASH_A, CID_A, ReasoningRegistry.Region.US,     ReasoningRegistry.AssetClass.EQUITY);
        registry.record(HASH_B, CID_B, ReasoningRegistry.Region.CRYPTO,  ReasoningRegistry.AssetClass.CRYPTO);
        vm.stopPrank();

        assertEq(registry.totalTraces(), 2);
        assertEq(registry.traceHashes(0), HASH_A);
        assertEq(registry.traceHashes(1), HASH_B);
    }

    // -----------------------------------------------------------------------
    // record() — reverts
    // -----------------------------------------------------------------------

    function test_RevertIfNotAuthorized() public {
        vm.prank(STRANGER);
        vm.expectRevert(ReasoningRegistry.NotAuthorized.selector);
        registry.record(HASH_A, CID_A, ReasoningRegistry.Region.US, ReasoningRegistry.AssetClass.EQUITY);
    }

    function test_RevertOnDuplicateHash() public {
        vm.startPrank(SUBMITTER);
        registry.record(HASH_A, CID_A, ReasoningRegistry.Region.US, ReasoningRegistry.AssetClass.EQUITY);
        vm.expectRevert(abi.encodeWithSelector(ReasoningRegistry.TraceAlreadyExists.selector, HASH_A));
        registry.record(HASH_A, CID_B, ReasoningRegistry.Region.US, ReasoningRegistry.AssetClass.EQUITY);
        vm.stopPrank();
    }

    function test_RevertOnZeroHash() public {
        vm.prank(SUBMITTER);
        vm.expectRevert(ReasoningRegistry.ZeroHash.selector);
        registry.record(bytes32(0), CID_A, ReasoningRegistry.Region.US, ReasoningRegistry.AssetClass.EQUITY);
    }

    function test_RevertOnEmptyCid() public {
        vm.prank(SUBMITTER);
        vm.expectRevert(ReasoningRegistry.EmptyCid.selector);
        registry.record(HASH_A, "", ReasoningRegistry.Region.US, ReasoningRegistry.AssetClass.EQUITY);
    }

    // -----------------------------------------------------------------------
    // Authorization management
    // -----------------------------------------------------------------------

    function test_OwnerCanAuthorizeNewSubmitter() public {
        vm.prank(OWNER);
        registry.setAuthorized(STRANGER, true);
        assertTrue(registry.authorized(STRANGER));
    }

    function test_OwnerCanRevokeSubmitter() public {
        vm.prank(OWNER);
        registry.setAuthorized(SUBMITTER, false);
        assertFalse(registry.authorized(SUBMITTER));
    }

    function test_NonOwnerCannotSetAuthorized() public {
        vm.prank(STRANGER);
        vm.expectRevert();
        registry.setAuthorized(STRANGER, true);
    }

    function test_AuthorizationEventEmitted() public {
        vm.expectEmit(true, false, false, true);
        emit ReasoningRegistry.AuthorizationUpdated(STRANGER, true);

        vm.prank(OWNER);
        registry.setAuthorized(STRANGER, true);
    }

    function test_RevokedSubmitterCannotRecord() public {
        vm.prank(OWNER);
        registry.setAuthorized(SUBMITTER, false);

        vm.prank(SUBMITTER);
        vm.expectRevert(ReasoningRegistry.NotAuthorized.selector);
        registry.record(HASH_A, CID_A, ReasoningRegistry.Region.US, ReasoningRegistry.AssetClass.EQUITY);
    }

    // -----------------------------------------------------------------------
    // getTraceHashes() pagination
    // -----------------------------------------------------------------------

    function test_PaginationReturnsCorrectSlice() public {
        // Record 3 traces
        bytes32[3] memory hashes = [
            keccak256("h1"), keccak256("h2"), keccak256("h3")
        ];
        vm.startPrank(SUBMITTER);
        for (uint i = 0; i < 3; i++) {
            registry.record(hashes[i], CID_A, ReasoningRegistry.Region.US, ReasoningRegistry.AssetClass.EQUITY);
        }
        vm.stopPrank();

        bytes32[] memory page = registry.getTraceHashes(1, 2);
        assertEq(page.length, 2);
        assertEq(page[0], hashes[1]);
        assertEq(page[1], hashes[2]);
    }

    function test_PaginationBeyondEndReturnsEmpty() public {
        bytes32[] memory page = registry.getTraceHashes(99, 10);
        assertEq(page.length, 0);
    }

    function test_PaginationClampsAtEnd() public {
        vm.prank(SUBMITTER);
        registry.record(HASH_A, CID_A, ReasoningRegistry.Region.US, ReasoningRegistry.AssetClass.EQUITY);

        bytes32[] memory page = registry.getTraceHashes(0, 100);
        assertEq(page.length, 1);
    }

    // -----------------------------------------------------------------------
    // Helper
    // -----------------------------------------------------------------------

    function _getTrace(bytes32 h) internal view returns (
        bytes32, string memory, ReasoningRegistry.Region,
        ReasoningRegistry.AssetClass, uint256, address
    ) {
        // Public mapping getter for structs returns a tuple, not the struct type.
        (bytes32 traceHash, string memory ipfsCid, ReasoningRegistry.Region region,
         ReasoningRegistry.AssetClass assetClass, uint256 ts, address submitter) = registry.traces(h);
        return (traceHash, ipfsCid, region, assetClass, ts, submitter);
    }
}
