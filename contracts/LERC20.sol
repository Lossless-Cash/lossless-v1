//SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.3;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

import "./LosslessController.sol";

contract LERC20 is ERC20 {
    LosslessController private lossless;
    address public recoveryAdmin;
    uint256 public timelockPeriod;
    uint256 public losslessTurnOffDate;
    bool public isLosslessTurnOffProposed = false;
    bool public isLosslessOn = true;

    event AdminChanged(address indexed previousAdmin, address indexed newAdmin);
    event RecoveryAdminChanged(address indexed previousAdmin, address indexed newAdmin);
    event LosslessTurnOffProposed(uint256 turnOffDate);
    event LosslessTurnedOff();
    event LosslessTurnedOn();

    constructor(uint256 totalSupply, string memory name, string memory symbol, address lssAddress, address _admin, address _recoveryAdmin, uint256 _timelockPeriod) ERC20(name, symbol) {
        _mint(_msgSender(), totalSupply);
        recoveryAdmin = _recoveryAdmin;
        timelockPeriod = _timelockPeriod;
        lossless = LosslessController(lssAddress);
        lossless.setTokenAdmin(_admin);
    }

    // --- LOSSLESS modifiers ---

    modifier lssAprove(address spender, uint256 amount) {
        if (isLosslessOn) {
            lossless.beforeApprove(_msgSender(), spender, amount);
        }
        _;
        if (isLosslessOn) {
            lossless.afterApprove(_msgSender(), spender, amount);
        }
    }

    modifier lssTransfer(address recipient, uint256 amount) {
        if (isLosslessOn) {
            lossless.beforeTransfer(_msgSender(), recipient, amount);
        }
        _;
        if (isLosslessOn) {
            lossless.afterTransfer(_msgSender(), recipient, amount);
        }
    }

    modifier lssTransferFrom(address sender, address recipient, uint256 amount) {
        if (isLosslessOn) {
            lossless.beforeTransferFrom(_msgSender(),sender, recipient, amount);
        }
        _;
        if (isLosslessOn) {
            lossless.afterTransferFrom(_msgSender(), sender, recipient, amount);
        }
    }

    modifier lssIncreaseAllowance(address spender, uint256 subtractedValue) {
        if (isLosslessOn) {
            lossless.beforeIncreaseAllowance(_msgSender(), spender, subtractedValue);
        }
        _;
        if (isLosslessOn) {
            lossless.afterIncreaseAllowance(_msgSender(), spender, subtractedValue);
        }
    }

    modifier lssDecreaseAllowance(address spender, uint256 subtractedValue) {
        if (isLosslessOn) {
            lossless.beforeDecreaseAllowance(_msgSender(), spender, subtractedValue);
        }
        _;
        if (isLosslessOn) {
            lossless.afterDecreaseAllowance(_msgSender(), spender, subtractedValue);
        }
    }

    modifier onlyRecoveryAdmin() {
        require(_msgSender() == recoveryAdmin, "LERC20: Sender must be recovery admin");
        _;
    }

    // --- LOSSLESS management ---

    function transferOutBlacklistedFunds(address[] calldata from) external {
        require(_msgSender() == address(lossless), "LERC20: Sender must be lossless contract");
        for (uint i = 0; i < from.length; i++) {
            _transfer(from[i], address(lossless), balanceOf(from[i]));
        }
    }

    function setLosslessAdmin(address newAdmin) public onlyRecoveryAdmin {
        require(isLosslessOn, "LERC20: lossless is turned off");
        emit AdminChanged(lossless.getTokenAdmin(address(this)), newAdmin);
        lossless.setTokenAdmin(newAdmin);
    }

    function setLosslessRecoveryAdmin(address newRecoveryAdmin) public onlyRecoveryAdmin {
        emit RecoveryAdminChanged(recoveryAdmin, newRecoveryAdmin);
        recoveryAdmin = newRecoveryAdmin;
    }

    function proposeLosslessTurnOff() public onlyRecoveryAdmin {
        losslessTurnOffDate = block.timestamp + timelockPeriod;
        isLosslessTurnOffProposed = true;
        emit LosslessTurnOffProposed(losslessTurnOffDate);
    }

    function executeLosslessTurnOff() public onlyRecoveryAdmin {
        require(isLosslessTurnOffProposed, "LERC20: Lossless turn off is not proposed");
        require(losslessTurnOffDate <= block.timestamp, "LERC20: Time lock is still in progress");
        isLosslessOn = false;
        isLosslessTurnOffProposed = false;
        emit LosslessTurnedOff();
    }

    function executeLosslessTurnOn() public onlyRecoveryAdmin {
        isLosslessTurnOffProposed = false;
        isLosslessOn = true;
        emit LosslessTurnedOn();
    }

    // --- ERC20 methods ---

    function approve(address spender, uint256 amount) public virtual override lssAprove(spender, amount) returns (bool) {
        _approve(_msgSender(), spender, amount);
        return true;
    }

    function transfer(address recipient, uint256 amount) public virtual override lssTransfer(recipient, amount) returns (bool) {
        _transfer(_msgSender(), recipient, amount);
        return true;
    }

    function transferFrom(address sender, address recipient, uint256 amount) public virtual override lssTransferFrom(sender, recipient, amount) returns (bool) {
        bool result = super.transferFrom(sender, recipient, amount);
        return result;
    }

    function increaseAllowance(address spender, uint256 addedValue) public virtual override lssIncreaseAllowance(spender, addedValue) returns (bool) {
        bool result = super.increaseAllowance(spender, addedValue);
        return result;
    }

    function decreaseAllowance(address spender, uint256 subtractedValue) public virtual override lssDecreaseAllowance(spender, subtractedValue) returns (bool) {
        bool result = super.decreaseAllowance(spender, subtractedValue);
        return result;
    }
}