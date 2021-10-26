/* eslint-disable arrow-body-style */
/* eslint-disable no-await-in-loop */
const { time, constants } = require('@openzeppelin/test-helpers');

const setupAddresses = async () => {
  const [
    tokenDeployer,
    staker1,
    staker2,
    staker3,
    staker4,
    staker5,
    regularUser1,
    regularUser2,
    regularUser3,
    regularUser4,
    regularUser5,
  ] = await ethers.getSigners();


  return {
    tokenDeployer,
    staker1,
    staker2,
    staker3,
    staker4,
    staker5,
    regularUser1,
    regularUser2,
    regularUser3,
    regularUser4,
    regularUser5,
  };
};

const setupEnvironment = async (rewardToken) => {

    const StakerContract = await ethers.getContractFactory(
      'Staker',
    );

    const stakerContract = await upgrades.deployProxy(StakerContract, [
      rewardToken
    ]);

    return {stakerContract};
};

const setupToken = async (supply, name, symbol, deployer) => {

    const token = await ethers.getContractFactory('ERC20');

    let deployedToken = await token.connect(deployer).deploy(
        supply,
        name,
        symbol
        );

     return deployedToken;
};

async function mineBlocks(count) {
  for (let i = 0; i < count; i += 1) {
    await ethers.provider.send('evm_mine');
  }
}

module.exports = {
    setupAddresses,
    setupEnvironment,
    setupToken,
    mineBlocks,
};