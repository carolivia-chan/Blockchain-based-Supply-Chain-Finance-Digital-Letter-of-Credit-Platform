// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";

/**
 * @title USDToken
 * @dev Mock USD token cho Letter of Credit demo
 * @notice KHÔNG dùng production
 */
contract USDToken is ERC20, AccessControl {

    bytes32 public constant MINTER_ROLE = keccak256("MINTER_ROLE");

    constructor() ERC20("Mock USD", "mUSD") {
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(MINTER_ROLE, msg.sender);

        // Mint sẵn cho deployer để test
        _mint(msg.sender, 1_000_000 * 10 ** decimals());
    }

    /**
     * @dev Mint USD token (chỉ Bank/Admin)
     */
    function mint(address to, uint256 amount)
        external
        onlyRole(MINTER_ROLE)
    {
        _mint(to, amount);
    }
}

