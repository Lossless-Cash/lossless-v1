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
    function getWithdrawFee() external view returns(uint64);
}

/// @title Staking contract for RewardToken
/// @notice The controller contract is in charge of the communication and senstive data among all Lossless Environment Smart Contracts
contract Staker is Initializable, ContextUpgradeable, PausableUpgradeable {

    uint256 totalStaking;

    address public _admin;
    address public _rewardTokenAddress;

    IRewardToken public _rewardToken;

    struct Staking {
        uint256 amount;
        uint256 blockStamp;
        bool staking;
    }

    mapping (address => Staking) stakingInfo;


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

    // STAKING

    /// @notice This funciton let's a user stake
    /// @param amount Amount to Stke
    function deposit(uint256 amount) public {

        require(!stakingInfo[msg.sender].staking, "STAKER: You're already staking");

        uint64 depositFee = _rewardToken.getDepositFee();
        uint256 feeAmount;

        feeAmount = (amount * depositFee) / 10**2;

        _rewardToken.transferFrom(msg.sender, address(this), amount + feeAmount);

        stakingInfo[msg.sender].amount = amount;
        stakingInfo[msg.sender].blockStamp = block.number;
        stakingInfo[msg.sender].staking = true;

        totalStaking += amount;
    }

    /// @notice This funciton let's a user withdraw staking + rewards
    function withdraw() public {

        require(stakingInfo[msg.sender].staking, "STAKER: You're not staking");

        uint256 rewardsPeriod;
        uint256 stakedStamp;

        rewardsPeriod =  _rewardToken.getRewardPeriod();
        stakedStamp = stakingInfo[msg.sender].blockStamp;

        require(block.number - stakedStamp > rewardsPeriod, "STAKER: Wait one reward period");

        uint256 totalBalance;
        uint256 amountOfPeriods;
        uint256 claimableReward;
        uint256 amountStaked;
        uint256 rewardsAllocated;
        uint256 rewardsPercentage;

        amountOfPeriods = (block.number - stakedStamp)/100;
        amountStaked = stakingInfo[msg.sender].amount;
        totalBalance = _rewardToken.balanceOf(address(this));
        rewardsAllocated = totalBalance - totalStaking;

        rewardsPercentage = ((amountStaked * 10**3 / rewardsAllocated) * amountOfPeriods);

        claimableReward = (rewardsAllocated * rewardsPercentage)/10**3;

        uint64 withdrawFee = _rewardToken.getWithdrawFee();
        uint256 feeAmount;

        feeAmount = (claimableReward * withdrawFee) / 10**2;
        
        _rewardToken.transfer(msg.sender, claimableReward - feeAmount);

        totalStaking -= amountStaked;

        stakingInfo[msg.sender].amount = 0;
        stakingInfo[msg.sender].blockStamp = type(uint256).max;
        stakingInfo[msg.sender].staking = false;
    }
}