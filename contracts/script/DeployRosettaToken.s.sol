// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Script, console2} from "forge-std/Script.sol";
import {RosettaToken} from "../src/RosettaToken.sol";

/**
 * @title DeployRosettaToken
 * @notice Foundry deploy script for RosettaToken (ERC-20 performance bond).
 *
 * Usage (Arc testnet):
 *   forge script script/DeployRosettaToken.s.sol:DeployRosettaToken \
 *     --rpc-url $ARC_RPC_URL \
 *     --broadcast \
 *     --private-key $DEPLOYER_PRIVATE_KEY \
 *     -vvvv
 *
 * Environment variables required:
 *   DEPLOYER_PRIVATE_KEY  — 0x-prefixed private key of the deployer wallet
 *   DEPLOYER_ADDRESS      — deployer/owner address
 */
contract DeployRosettaToken is Script {
    uint256 constant INITIAL_SUPPLY = 1_000_000 * 1e18; // 1M ROSETTA

    function run() external {
        address deployer = vm.envAddress("DEPLOYER_ADDRESS");

        vm.startBroadcast();

        RosettaToken token = new RosettaToken(deployer, INITIAL_SUPPLY);

        console2.log("RosettaToken deployed at:", address(token));
        console2.log("Owner/Receiver:          ", deployer);
        console2.log("Initial supply:          ", INITIAL_SUPPLY / 1e18, "ROSETTA");

        vm.stopBroadcast();
    }
}
