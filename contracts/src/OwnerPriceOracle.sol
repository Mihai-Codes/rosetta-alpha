// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {IPriceOracle} from "./IPriceOracle.sol";

/**
 * @title OwnerPriceOracle
 * @notice Hackathon-grade IPriceOracle: owner posts prices manually.
 *         Swap for ChainlinkPriceOracle / PythPriceOracle in production.
 *
 * Prices use 1e8 precision (Chainlink convention).
 * Asset keys are keccak256 of the ticker (e.g. keccak256("AAPL")).
 */
contract OwnerPriceOracle is IPriceOracle, Ownable {
    struct PricePoint {
        uint256 price;     // 1e8 fixed-point
        uint256 timestamp; // unix seconds
    }

    mapping(bytes32 => PricePoint) private _prices;

    event PriceSet(bytes32 indexed assetKey, uint256 price, uint256 timestamp);

    error PriceNotSet(bytes32 assetKey);
    error ZeroPrice();

    constructor(address initialOwner) Ownable(initialOwner) {}

    /// @notice Owner posts a price for `assetKey`.
    function setPrice(bytes32 assetKey, uint256 price) external onlyOwner {
        if (price == 0) revert ZeroPrice();
        _prices[assetKey] = PricePoint({price: price, timestamp: block.timestamp});
        emit PriceSet(assetKey, price, block.timestamp);
    }

    /// @notice Batch helper — useful for resolving many markets in one tx.
    function setPrices(bytes32[] calldata keys, uint256[] calldata vals) external onlyOwner {
        require(keys.length == vals.length, "length mismatch");
        for (uint256 i = 0; i < keys.length; i++) {
            if (vals[i] == 0) revert ZeroPrice();
            _prices[keys[i]] = PricePoint({price: vals[i], timestamp: block.timestamp});
            emit PriceSet(keys[i], vals[i], block.timestamp);
        }
    }

    /// @inheritdoc IPriceOracle
    function getPrice(bytes32 assetKey) external view returns (uint256 price, uint256 timestamp) {
        PricePoint memory p = _prices[assetKey];
        if (p.timestamp == 0) revert PriceNotSet(assetKey);
        return (p.price, p.timestamp);
    }
}
