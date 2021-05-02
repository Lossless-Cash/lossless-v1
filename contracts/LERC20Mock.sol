//SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.3;

import "./LERC20.sol";
import "./LosslessController.sol";

contract LERC20Mock is LERC20 {
    constructor (
        uint256 totalSupply,
        string memory name,
        string memory symbol,
        address initialAccount,
        uint256 initialBalance,
        address lssAddress,
        address admin,
        address adminBackup,
         uint256 _timelockPeriod
    ) payable LERC20(totalSupply,name, symbol, lssAddress, admin, adminBackup, _timelockPeriod) {
        _mint(initialAccount, initialBalance);
    }

    function _constructor(address lssAddress, address _losslessAdmin, address _losslessAdminBackup,uint256 _timelockPeriod) public {
        LosslessController lossless = LosslessController(lssAddress);
        lossless.setTokenAdmin(_losslessAdmin);
    }

    function mint(address account, uint256 amount) public {
        _mint(account, amount);
    }

    function burn(address account, uint256 amount) public {
        _burn(account, amount);
    }

    function transferInternal(address from, address to, uint256 value) public {
        _transfer(from, to, value);
    }

    function approveInternal(address owner, address spender, uint256 value) public {
        _approve(owner, spender, value);
    }
}