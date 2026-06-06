// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Script, console2} from "forge-std/Script.sol";
import {RosettaSubscription} from "../src/RosettaSubscription.sol";

/**
 * @title DeployRosettaSubscription
 * @notice Foundry deploy script for RosettaSubscription (USDC tier access).
 *
 * Usage (Arc testnet):
 *   source contracts/.env && forge script script/DeployRosettaSubscription.s.sol:DeployRosettaSubscription \
 *     --rpc-url $ARC_RPC_URL \
 *     --broadcast \
 *     --private-key $ARC_DEPLOYER_PRIVATE_KEY \
 *     -vvvv
 *
 * Environment variables required:
 *   ARC_DEPLOYER_PRIVATE_KEY — 0x-prefixed private key
 *   DEPLOYER_ADDRESS         — deployer/owner/treasury address
 */
contract DeployRosettaSubscription is Script {
    // Arc testnet USDC (6 decimals ERC-20 interface).
    address constant ARC_USDC = 0x3600000000000000000000000000000000000000;

    // Tier pricing in USDC atomic units (6 decimals).
    uint256 constant PREMIUM_PRICE = 29_000_000;  // 29 USDC
    uint256 constant PRO_PRICE = 99_000_000;      // 99 USDC

    function run() external {
        address deployer = vm.envAddress("DEPLOYER_ADDRESS");

        vm.startBroadcast();

        RosettaSubscription sub = new RosettaSubscription(
            deployer,
            ARC_USDC,
            PREMIUM_PRICE,
            PRO_PRICE
        );

        console2.log("RosettaSubscription deployed at:", address(sub));
        console2.log("Owner/Treasury:                 ", deployer);
        console2.log("USDC address:                   ", ARC_USDC);
        console2.log("Premium price:                   29 USDC");
        console2.log("Pro price:                       99 USDC");

        vm.stopBroadcast();
    }
}
