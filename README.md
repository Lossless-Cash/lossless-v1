Created the code using as a base the Ethereum Development Environment Package modified with some modules I use regularly.

New code on ERC20 is added at the bottom for visibility porpoises only.
Staking was done from a scratch.
In order to run the tests:

Run npm i

Create a config.js file at root with the following format:

module.exports = {
    ROPSTEN_PRIVATE_KEY : '',
    //INFURA_KEY : '',
    //ETHERSCAN_KEY : '',
    //COINMARKETCAP : '',
  };

Just ROPSTEN_PRIVATE_KEY is needed, the other ones are for extra testing functionality like translating gas cost into fiat.

Finally run npm tst
