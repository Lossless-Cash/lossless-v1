require('@nomiclabs/hardhat-waffle');
require('@openzeppelin/hardhat-upgrades');
require('solidity-coverage');
// require('hardhat-gas-reporter');

module.exports = {
  solidity: '0.8.0',
  paths: {
    artifacts: './src/artifacts',
  },
  networks: {
    hardhat: {
      chainId: 1337,
    },
  },
  gasReporter: {
    currency: 'EUR',
    gasPrice: 21,
  },
};
