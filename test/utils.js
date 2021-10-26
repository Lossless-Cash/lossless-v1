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

const setupEnvironment = async () => {
    return {};
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

module.exports = {
    setupAddresses,
    setupEnvironment,
    setupToken,
};