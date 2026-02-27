// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "../interfaces/ISupplyChain.sol";
import "../interfaces/IRoleRegistry.sol";
import "../tokens/USDToken.sol";

contract LetterOfCredit {

    // ==================== DEPENDENCIES ====================
    IRoleRegistry public roleRegistry;
    ISupplyChain public supplyChain;
    USDToken public usdToken;

    // ==================== SLA CONFIG ====================
    uint256 public constant BANK_APPROVAL_DEADLINE = 3 days;
    uint256 public constant DELIVERY_CONFIRM_DEADLINE = 7 days;

    // ==================== LC STATE ====================
    enum LCStatus {
        OPENED,              // Importer opens LC
        APPROVED,            // Bank approves
        SHIPPED,             // Exporter ships
        DELIVERED_PENDING,   // Logistics confirms delivery
        DELIVERED_CONFIRMED, // Importer / Bank confirms
        UNDER_REVIEW,        // Dispute / SLA breach
        PAID,
        CANCELLED
    }

    struct LC {
        uint256 productId;
        address buyer;
        address seller;
        address bank;
        uint256 amount;
        LCStatus status;

        uint256 openedAt;
        uint256 approvedAt;
        uint256 deliveredAt;

        bool disputeRaised;
    }

    mapping(uint256 => LC) public lcs;
    uint256 public lcCounter;

    // ==================== EVENTS ====================
    event LCCreated(uint256 lcId);
    event LCApproved(uint256 lcId);
    event LCShipped(uint256 lcId);
    event LCDeliveredPending(uint256 lcId);
    event LCDeliveredConfirmed(uint256 lcId);
    event LCDisputed(uint256 lcId, address by);
    event LCResolved(uint256 lcId, bool approved);
    event LCPaid(uint256 lcId);

    constructor(
        address usdAddress,
        address roleRegistryAddress,
        address supplyChainAddress
    ) {
        usdToken = USDToken(usdAddress);
        roleRegistry = IRoleRegistry(roleRegistryAddress);
        supplyChain = ISupplyChain(supplyChainAddress);
    }

    // ======================================================
    // CORE FLOW
    // ======================================================

    /// Importer opens LC
    function openLC(
        uint256 productId,
        address seller,
        uint256 amount
    ) external {
        require(roleRegistry.hasRole(msg.sender, IRoleRegistry.Role.IMPORTER), "Only Importer");
        require(roleRegistry.hasRole(seller, IRoleRegistry.Role.EXPORTER), "Seller not Exporter");

        lcCounter++;
        lcs[lcCounter] = LC({
            productId: productId,
            buyer: msg.sender,
            seller: seller,
            bank: address(0),
            amount: amount,
            status: LCStatus.OPENED,
            openedAt: block.timestamp,
            approvedAt: 0,
            deliveredAt: 0,
            disputeRaised: false
        });

        emit LCCreated(lcCounter);
    }

    /// Bank approves LC (with SLA)
    function approveLC(uint256 lcId) external {
        LC storage lc = lcs[lcId];

        require(roleRegistry.hasRole(msg.sender, IRoleRegistry.Role.BANK), "Only Bank");
        require(lc.status == LCStatus.OPENED, "Invalid state");
        require(block.timestamp <= lc.openedAt + BANK_APPROVAL_DEADLINE, "Approval SLA missed");

        lc.bank = msg.sender;
        lc.status = LCStatus.APPROVED;
        lc.approvedAt = block.timestamp;

        emit LCApproved(lcId);
    }

    /// Exporter confirms shipment
    function confirmShipment(uint256 lcId) external {
        LC storage lc = lcs[lcId];

        require(msg.sender == lc.seller, "Only Exporter");
        require(lc.status == LCStatus.APPROVED, "Not approved");

        lc.status = LCStatus.SHIPPED;
        emit LCShipped(lcId);
    }

    /// Logistics confirms delivery (NOT final)
    function markDeliveredPending(uint256 lcId) external {
        LC storage lc = lcs[lcId];

        require(roleRegistry.hasRole(msg.sender, IRoleRegistry.Role.LOGISTICS), "Only Logistics");
        require(lc.status == LCStatus.SHIPPED, "Not shipped");

        lc.status = LCStatus.DELIVERED_PENDING;
        lc.deliveredAt = block.timestamp;

        emit LCDeliveredPending(lcId);
    }

    /// Importer or Bank confirms delivery
    function confirmDelivered(uint256 lcId) external {
        LC storage lc = lcs[lcId];

        require(
            msg.sender == lc.buyer || msg.sender == lc.bank,
            "Only Importer or Bank"
        );
        require(lc.status == LCStatus.DELIVERED_PENDING, "Invalid state");
        require(block.timestamp <= lc.deliveredAt + DELIVERY_CONFIRM_DEADLINE, "Delivery SLA missed");
        require(supplyChain.isProductReceived(lc.productId), "Product not received");

        lc.status = LCStatus.DELIVERED_CONFIRMED;
        emit LCDeliveredConfirmed(lcId);
    }

    /// Bank releases payment
    function releasePayment(uint256 lcId) external {
        LC storage lc = lcs[lcId];

        require(msg.sender == lc.bank, "Only Bank");
        require(lc.status == LCStatus.DELIVERED_CONFIRMED, "Not confirmed");

        lc.status = LCStatus.PAID;

        require(
            usdToken.transferFrom(lc.buyer, lc.seller, lc.amount),
            "Transfer failed"
        );

        emit LCPaid(lcId);
    }

    // ======================================================
    // DISPUTE & EXCEPTION FLOW
    // ======================================================

    /// Any party can raise dispute
    function raiseDispute(uint256 lcId) external {
        LC storage lc = lcs[lcId];

        require(
            msg.sender == lc.buyer ||
            msg.sender == lc.seller ||
            msg.sender == lc.bank,
            "Not LC party"
        );
        require(lc.status != LCStatus.PAID, "Already paid");

        lc.status = LCStatus.UNDER_REVIEW;
        lc.disputeRaised = true;

        emit LCDisputed(lcId, msg.sender);
    }

    /// Bank resolves dispute
    function resolveDispute(uint256 lcId, bool approve) external {
        LC storage lc = lcs[lcId];

        require(msg.sender == lc.bank, "Only Bank");
        require(lc.status == LCStatus.UNDER_REVIEW, "Not under review");

        lc.disputeRaised = false;

        if (approve) {
            lc.status = LCStatus.DELIVERED_CONFIRMED;
        } else {
            lc.status = LCStatus.CANCELLED;
        }

        emit LCResolved(lcId, approve);
    }
}

