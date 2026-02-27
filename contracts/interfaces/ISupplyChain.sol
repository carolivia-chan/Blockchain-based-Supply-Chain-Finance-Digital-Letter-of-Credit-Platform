// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

interface ISupplyChain {

    enum ProductStatus {
        Created,
        Delivered,
        Received
    }

    event ProductDelivered(uint256 indexed productId, address indexed buyer, uint256 timestamp);
    event ProductReceived(uint256 indexed productId, address indexed buyer, uint256 timestamp);

    function getProductStatus(uint256 _productId) external view returns (ProductStatus);
    function isProductDelivered(uint256 _productId) external view returns (bool);
    function isProductReceived(uint256 _productId) external view returns (bool);
}

