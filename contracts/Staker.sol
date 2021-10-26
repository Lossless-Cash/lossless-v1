pragma solidity ^0.8.0;

import "@openzeppelin/contracts-upgradeable/utils/ContextUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/security/PausableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "hardhat/console.sol";

interface IRewardToken {
    function totalSupply() external view returns (uint256);
    function balanceOf(address account) external view returns (uint256);
    function transfer(address recipient, uint256 amount) external returns (bool);
    function allowance(address owner, address spender) external view returns (uint256);
    function increaseAllowance(address spender, uint256 addedValue) external returns (bool);
    function approve(address spender, uint256 amount) external returns (bool);
    function transferFrom(address sender, address recipient, uint256 amount) external returns (bool);
    function admin() external view returns (address);
    function getRewardPeriod() external view returns (uint256);
    function getDepositFee() external view returns(uint64);
    function getwithdrawFee() external view returns(uint64);
}

/// @title Staking contract for RewardToken
/// @notice The controller contract is in charge of the communication and senstive data among all Lossless Environment Smart Contracts
contract LosslessControllerV3 is Initializable, ContextUpgradeable, PausableUpgradeable {

    address public _admin;
    address public _rewardTokenAddress;

    IRewardToken public _rewardToken;

    struct Staking {
        uint256 amount;
        uint256 timestamp;
    }


    /// @notice Initializes the Staker Contract
    /// @dev It sets up default values
    /// @param rewardToken_ Address of the reward Token
    function initialize(address rewardToken_) public initializer {
        _rewardToken = IRewardToken(rewardToken_);
        _rewardTokenAddress = rewardToken_;
        _admin = _rewardToken.admin();
    }


    // MODIFIERS

    /// @notice Only allows admin to execute function
    modifier onlyAdmin() {
        require(msg.sender == _admin, "STAKER: Must be admin");
        _;
    }

    // GETTERS

    /// @notice This functions returns the contract version
    function getVersion() public pure returns(uint256){
        return 1;
    }

    // SETTERS

    // STAKING
}