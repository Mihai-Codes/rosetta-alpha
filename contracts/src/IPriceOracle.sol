// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/**
 * @title IPriceOracle
 * @notice Minimal price oracle interface for PredictionMarket resolution.
 *
 * Implementations:
 *   - OwnerPriceOracle (hackathon): owner posts prices manually.
 *   - ChainlinkPriceOracle (future): wraps AggregatorV3Interface.
 *   - PythPriceOracle (future): wraps Pyth IPyth.getPriceUnsafe().
 *
 * Convention: prices are returned with 1e8 precision (Chainlink standard).
 */
interface IPriceOracle {
    /// @notice Latest price for `assetKey`, scaled to 1e8.
    /// @param assetKey  bytes32 identifier (e.g. keccak256("AAPL"), keccak256("BTC")).
    /// @return price    Price * 1e8.
    /// @return timestamp Unix seconds when this price was set/observed.
    function getPrice(bytes32 assetKey) external view returns (uint256 price, uint256 timestamp);
}
