// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title ILetterOfCredit
 * @dev Interface cho Letter of Credit (LC)
 * @notice Loose coupling – KHÔNG depend implementation
 */
interface ILetterOfCredit {

    // ==================== ENUMS ====================

    enum LCStatus {
        Created,
        Funded,
        Shipped,
        Delivered,
        Released,
        Cancelled
    }

    // ==================== EVENTS ====================

    event LCCreated(
        uint256 indexed lcId,
        address indexed buyer,
        address indexed seller,
        uint256 amount
    );

    event LCFunded(uint256 indexed lcId);
    event LCReleased(uint256 indexed lcId, uint256 amount);
    event LCCancelled(uint256 indexed lcId);

    // ==================== VIEW FUNCTIONS ====================

    function getLCStatus(uint256 _lcId)
        external
        view
        returns (LCStatus);

    function getLCAmount(uint256 _lcId)
        external
        view
        returns (uint256);

    function getLCParties(uint256 _lcId)
        external
        view
        returns (
            address buyer,
            address seller,
            address bank
        );

    // ==================== CORE ACTIONS ====================

    function createLC(
        address _buyer,
        address _seller,
        uint256 _amount,
        uint256 _productId
    ) external returns (uint256);

    function fundLC(uint256 _lcId) external;

    function releasePayment(uint256 _lcId) external;

    function cancelLC(uint256 _lcId) external;
}

