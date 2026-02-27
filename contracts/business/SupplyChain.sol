// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "../interfaces/ISupplyChain.sol";
import "../interfaces/IRoleRegistry.sol";

contract SupplyChain is ISupplyChain {

    // ==================== DEPENDENCY ====================
    IRoleRegistry public roleRegistry;

    // ==================== STRUCT ====================
    struct Product {
        uint256 id;
        string name;
        address importer;          // Buyer / LC applicant
        ProductStatus status;
        uint256 createdAt;
        uint256 lastUpdated;
    }

    mapping(uint256 => Product) public products;
    uint256 public productCount;

    // ==================== MODIFIERS ====================
    modifier onlyRole(IRoleRegistry.Role role) {
        require(roleRegistry.hasRole(msg.sender, role), "Wrong role");
        _;
    }

    modifier productExists(uint256 id) {
        require(id < productCount, "Product not exist");
        _;
    }

    modifier onlyImporter(uint256 productId) {
        require(products[productId].importer == msg.sender, "Not product importer");
        _;
    }

    constructor(address registry) {
        roleRegistry = IRoleRegistry(registry);
    }

    // ======================================================
    // CORE FLOW
    // ======================================================

    /// Importer creates product (before LC or during LC)
    function createProduct(string memory name)
        external
        onlyRole(IRoleRegistry.Role.IMPORTER)
        returns (uint256)
    {
        uint256 id = productCount++;

        products[id] = Product({
            id: id,
            name: name,
            importer: msg.sender,
            status: ProductStatus.Created,
            createdAt: block.timestamp,
            lastUpdated: block.timestamp
        });

        return id;
    }

    /// Logistics confirms physical delivery
    /// ➜ maps to LC.DELIVERED_PENDING
    function markDelivered(uint256 productId)
        external
        onlyRole(IRoleRegistry.Role.LOGISTICS)
        productExists(productId)
    {
        Product storage p = products[productId];
        require(p.status == ProductStatus.Created, "Invalid state");

        p.status = ProductStatus.Delivered;
        p.lastUpdated = block.timestamp;

        emit ProductDelivered(productId, p.importer, block.timestamp);
    }

    /// Importer confirms received
    /// ➜ maps to LC.DELIVERED_CONFIRMED
    function confirmReceived(uint256 productId)
        external
        onlyRole(IRoleRegistry.Role.IMPORTER)
        productExists(productId)
        onlyImporter(productId)
    {
        Product storage p = products[productId];
        require(p.status == ProductStatus.Delivered, "Not delivered");

        p.status = ProductStatus.Received;
        p.lastUpdated = block.timestamp;

        emit ProductReceived(productId, p.importer, block.timestamp);
    }

    // ======================================================
    // VIEW FUNCTIONS (USED BY LC)
    // ======================================================

    function getProductStatus(uint256 id)
        external
        view
        override
        returns (ProductStatus)
    {
        return products[id].status;
    }

    function isProductDelivered(uint256 id)
        external
        view
        override
        returns (bool)
    {
        ProductStatus s = products[id].status;
        return s == ProductStatus.Delivered || s == ProductStatus.Received;
    }

    function isProductReceived(uint256 id)
        external
        view
        override
        returns (bool)
    {
        return products[id].status == ProductStatus.Received;
    }
}

