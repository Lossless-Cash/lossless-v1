/* eslint-disable no-unused-vars */
/* eslint-disable prefer-destructuring */
const { time, constants } = require('@openzeppelin/test-helpers');
const { expect } = require('chai');
const { setupAddresses, setupEnvironment, setupToken } = require('./utils');

let adr;
let env;

const initialSupply = 2000000;
const name = "Random Token";
const symbol = "RAND";

describe('Environment Tests', () => {
    beforeEach(async () => {
        adr = await setupAddresses();
        erc20Token = await setupToken(  initialSupply,
                                        name,
                                        symbol,
                                        adr.tokenDeployer
                                        );

        env = await setupEnvironment(erc20Token.address);
    });

    describe("when setting up the environment", () =>{
        describe("when setting up a random token", ()=>{
            it("should setup name correctly", async ()=>{
                expect(
                    await erc20Token.name(),
                ).to.be.equal(name);

            });
            it("should setup symbol correctly", async ()=>{
                expect(
                    await erc20Token.symbol(),
                ).to.be.equal(symbol);
            });

            it("should setup initialSupply correctly", async ()=>{
                expect(
                    await erc20Token.totalSupply(),
                ).to.be.equal(initialSupply);
            });

            it("should send the balance to deployer", async ()=>{
                expect(
                    await erc20Token.balanceOf(adr.tokenDeployer.address),
                ).to.be.equal(initialSupply);
            });
        });
        describe("when setting up a the staker token", ()=>{
            it("should deploy correctly", async ()=>{
                expect(
                    await env.stakerContract.getVersion(),
                ).to.be.equal(1);

            });
        });
    });
});