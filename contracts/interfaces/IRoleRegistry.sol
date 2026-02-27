// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

interface IRoleRegistry {

    enum Role {
        NONE,
        ADMIN,
        BANK,
        EXPORTER,
        IMPORTER,
        LOGISTICS
    }

    function hasRole(address account, Role role)
        external
        view
        returns (bool);

    function getRole(address account)
        external
        view
        returns (Role);

    function isBank(address account) external view returns (bool);
    function isExporter(address account) external view returns (bool);
    function isImporter(address account) external view returns (bool);
    function isLogistics(address account) external view returns (bool);
}
