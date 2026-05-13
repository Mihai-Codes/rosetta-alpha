// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Script, console2} from "forge-std/Script.sol";
import {ReasoningRegistry} from "../src/ReasoningRegistry.sol";

/**
 * @title DeployReasoningRegistry
 * @notice Foundry deploy script for ReasoningRegistry.
 *
 * Usage (Arc testnet):
 *   forge script script/DeployReasoningRegistry.s.sol:DeployReasoningRegistry \
 *     --rpc-url $ARC_RPC_URL \
 *     --broadcast \
 *     --private-key $DEPLOYER_PRIVATE_KEY \
 *     -vvvv
 *
 * Environment variables required:
 *   DEPLOYER_PRIVATE_KEY  — 0x-prefixed private key of the deployer wallet
 *   INITIAL_SUBMITTER     — address of the Python pipeline wallet (submitter)
 */
contract DeployReasoningRegistry is Script {
    function run() external {
        address deployer   = vm.envAddress("DEPLOYER_ADDRESS");
        address submitter  = vm.envAddress("INITIAL_SUBMITTER");

        vm.startBroadcast();

        ReasoningRegistry registry = new ReasoningRegistry(deployer, submitter);

        console2.log("ReasoningRegistry deployed at:", address(registry));
        console2.log("Owner:    ", deployer);
        console2.log("Submitter:", submitter);

        vm.stopBroadcast();
    }
}
