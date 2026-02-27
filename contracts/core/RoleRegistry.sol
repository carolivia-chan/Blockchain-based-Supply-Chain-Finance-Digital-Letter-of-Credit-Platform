// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "../interfaces/IRoleRegistry.sol";

contract RoleRegistry is IRoleRegistry {

    mapping(address => Role) private roles;
    address public admin;

    // ==================== EVENTS ====================
    event RoleGranted(
        address indexed account,
        Role indexed role,
        address indexed grantedBy,
        uint256 timestamp
    );

    event RoleRevoked(
        address indexed account,
        Role indexed oldRole,
        address indexed revokedBy,
        uint256 timestamp
    );

    // ==================== MODIFIER ====================
    modifier onlyAdmin() {
        require(msg.sender == admin, "Only admin");
        _;
    }

    // ==================== CONSTRUCTOR ====================
    constructor() {
        admin = msg.sender;
        roles[msg.sender] = Role.ADMIN;

        emit RoleGranted(msg.sender, Role.ADMIN, msg.sender, block.timestamp);
    }

    // ==================== ADMIN FUNCTIONS ====================
    function grantRole(address account, Role role)
        external
        onlyAdmin
    {
        require(account != address(0), "Invalid address");
        require(
            role == Role.BANK ||
            role == Role.EXPORTER ||
            role == Role.IMPORTER ||
            role == Role.LOGISTICS,
            "Invalid role"
        );

        roles[account] = role;
        emit RoleGranted(account, role, msg.sender, block.timestamp);
    }

    function revokeRole(address account)
        external
        onlyAdmin
    {
        Role oldRole = roles[account];
        require(oldRole != Role.NONE, "No role");

        roles[account] = Role.NONE;
        emit RoleRevoked(account, oldRole, msg.sender, block.timestamp);
    }

    // ==================== VIEW FUNCTIONS ====================
    function hasRole(address account, Role role)
        external
        view
        override
        returns (bool)
    {
        return roles[account] == role;
    }

    function getRole(address account)
        external
        view
        override
        returns (Role)
    {
        return roles[account];
    }

    function isBank(address account)
        external
        view
        override
        returns (bool)
    {
        return roles[account] == Role.BANK;
    }

    function isExporter(address account)
        external
        view
        override
        returns (bool)
    {
        return roles[account] == Role.EXPORTER;
    }

    function isImporter(address account)
        external
        view
        override
        returns (bool)
    {
        return roles[account] == Role.IMPORTER;
    }

    function isLogistics(address account)
        external
        view
        override
        returns (bool)
    {
        return roles[account] == Role.LOGISTICS;
    }
}

