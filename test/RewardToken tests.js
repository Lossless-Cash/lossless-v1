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

describe('ERC20 Tests', () => {
    beforeEach(async () => {
        adr = await setupAddresses();
        env = await setupEnvironment();
        erc20Token = await setupToken(  initialSupply,
                                        name,
                                        symbol,
                                        adr.tokenDeployer
                                        );
    });

    describe("ERC20", ()=>{
        describe("when transfering between users", () =>{
            it("should not revert", async ()=>{
                await expect(
                    erc20Token.connect(adr.tokenDeployer).transfer(adr.regularUser1.address, 100),
                ).to.not.be.reverted;

                expect(
                    await erc20Token.balanceOf(adr.regularUser1.address),
                ).to.be.equal(100);

                await expect(
                    erc20Token.connect(adr.regularUser1).transfer(adr.regularUser2.address, 50),
                ).to.not.be.reverted;

                expect(
                    await erc20Token.balanceOf(adr.regularUser2.address),
                ).to.be.equal(50);

                await expect(
                    erc20Token.connect(adr.regularUser2).transfer(adr.regularUser3.address, 50),
                ).to.not.be.reverted;

                expect(
                    await erc20Token.balanceOf(adr.regularUser3.address),
                ).to.be.equal(50);
            });

            it("should revert when transfering more than balance", async ()=>{
                await expect(
                    erc20Token.connect(adr.regularUser1).transfer(adr.regularUser2.address, 200),
                ).to.be.revertedWith("ERC20: transfer amount exceeds balance");
            });
        });

        describe("when minting tokens", ()=>{
            it("should let admin mint new tokens", async ()=>{
                await expect(
                    erc20Token.connect(adr.tokenDeployer).mint(1000),
                ).to.not.be.reverted;

                expect(
                    await erc20Token.totalSupply(),
                ).to.be.equal(initialSupply + 1000);

                expect(
                    await erc20Token.balanceOf(adr.tokenDeployer.address),
                ).to.be.equal(initialSupply + 1000);
            })

            it("should revert when not executed by admin", async ()=>{
                await expect(
                    erc20Token.connect(adr.regularUser1).mint(1000),
                ).to.be.revertedWith("ERC20: Must be admin");
            })
        });

        describe("when managing fees", ()=>{
            it("should set deposit fee", async()=>{
                await expect(
                    erc20Token.connect(adr.tokenDeployer).setDepositFee(2),
                ).to.not.be.reverted;

                expect(
                    await erc20Token.getDepositFee(),
                ).to.be.equal(2);
            });
            it("should set withdraw fee", async()=>{
                await expect(
                    erc20Token.connect(adr.tokenDeployer).setWithdrawFee(2),
                ).to.not.be.reverted;

                expect(
                    await erc20Token.getWithdrawFee(),
                ).to.be.equal(2);
            });
            it("should disable deposit fee", async()=>{
                await expect(
                    erc20Token.connect(adr.tokenDeployer).disableDepositFee(),
                ).to.not.be.reverted;

                expect(
                    await erc20Token.getDepositFee(),
                ).to.be.equal(0);
            });
            it("should disable withdraw fee", async()=>{
                await expect(
                    erc20Token.connect(adr.tokenDeployer).disableWithdrawFee(),
                ).to.not.be.reverted;

                expect(
                    await erc20Token.getWithdrawFee(),
                ).to.be.equal(0);
            });
            it("should restore deposit fee", async()=>{
                await erc20Token.connect(adr.tokenDeployer).setDepositFee(2);
                await erc20Token.connect(adr.tokenDeployer).disableDepositFee();

                await expect(
                    erc20Token.connect(adr.tokenDeployer).restoreDepositFee(),
                ).to.not.be.reverted;

                expect(
                    await erc20Token.getDepositFee(),
                ).to.be.equal(2);
            });
            it("should restore withdraw fee", async()=>{
                await erc20Token.connect(adr.tokenDeployer).setWithdrawFee(2);
                await erc20Token.connect(adr.tokenDeployer).disableWithdrawFee();

                await expect(
                    erc20Token.connect(adr.tokenDeployer).restoreWithdrawFee(),
                ).to.not.be.reverted;

                expect(
                    await erc20Token.getWithdrawFee(),
                ).to.be.equal(2);
            });
        });
    });
});