// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Script, console2} from "forge-std/Script.sol";
import {PredictionMarket} from "../src/PredictionMarket.sol";
import {OwnerPriceOracle} from "../src/OwnerPriceOracle.sol";
import {RosettaToken} from "../src/RosettaToken.sol";

/**
 * @title DeployPredictionMarket
 * @notice Deploys OwnerPriceOracle + PredictionMarket, then wires the slasher
 *         role on the existing RosettaToken so the market can slash bonds.
 *
 * Usage (Arc testnet):
 *   forge script script/DeployPredictionMarket.s.sol:DeployPredictionMarket \
 *     --rpc-url $ARC_RPC_URL \
 *     --broadcast \
 *     --private-key $ARC_DEPLOYER_PRIVATE_KEY \
 *     --legacy \
 *     -vvv
 *
 * Required env vars:
 *   DEPLOYER_ADDRESS              — owner/deployer
 *   REASONING_REGISTRY_ADDRESS    — already deployed
 *   ROSETTA_TOKEN_ADDRESS         — already deployed
 */
contract DeployPredictionMarket is Script {
    function run() external {
        address deployer       = vm.envAddress("DEPLOYER_ADDRESS");
        address registryAddr   = vm.envAddress("REASONING_REGISTRY_ADDRESS");
        address tokenAddr      = vm.envAddress("ROSETTA_TOKEN_ADDRESS");

        vm.startBroadcast();

        // 1. Deploy oracle
        OwnerPriceOracle oracle = new OwnerPriceOracle(deployer);

        // 2. Deploy market
        PredictionMarket market = new PredictionMarket(
            deployer, registryAddr, tokenAddr, address(oracle)
        );

        // 3. Wire slasher role on token (deployer must be token owner)
        RosettaToken(tokenAddr).setSlasher(address(market), true);

        console2.log("OwnerPriceOracle deployed at: ", address(oracle));
        console2.log("PredictionMarket deployed at: ", address(market));
        console2.log("Slasher role granted on token:", tokenAddr);

        vm.stopBroadcast();
    }
}
