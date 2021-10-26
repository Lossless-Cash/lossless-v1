/* eslint-disable no-unused-vars */
/* eslint-disable prefer-destructuring */
const { time, constants } = require('@openzeppelin/test-helpers');
const { expect } = require('chai');
const { setupAddresses, setupEnvironment, setupToken, mineBlocks } = require('./utils');

let adr;
let env;

let rewardPool = 10000;
let stakersInitialBalance = 100;

const initialSupply = 2000000;
const name = "Random Token";
const symbol = "RAND";

describe('Staking Contract Tests', () => {
    beforeEach(async () => {
        adr = await setupAddresses();
        erc20Token = await setupToken(  initialSupply,
                                        name,
                                        symbol,
                                        adr.tokenDeployer
                                        );

        env = await setupEnvironment(erc20Token.address);

        await erc20Token.connect(adr.tokenDeployer).transfer(adr.staker1.address, stakersInitialBalance);
        await erc20Token.connect(adr.tokenDeployer).transfer(adr.staker2.address, stakersInitialBalance);
        await erc20Token.connect(adr.tokenDeployer).transfer(adr.staker3.address, stakersInitialBalance);
        await erc20Token.connect(adr.tokenDeployer).transfer(adr.staker4.address, stakersInitialBalance);
        await erc20Token.connect(adr.tokenDeployer).transfer(adr.staker5.address, stakersInitialBalance);

        await erc20Token.connect(adr.staker1).approve(env.stakerContract.address, stakersInitialBalance);
        await erc20Token.connect(adr.staker2).approve(env.stakerContract.address, stakersInitialBalance);
        await erc20Token.connect(adr.staker3).approve(env.stakerContract.address, stakersInitialBalance);
        await erc20Token.connect(adr.staker4).approve(env.stakerContract.address, stakersInitialBalance);
        await erc20Token.connect(adr.staker5).approve(env.stakerContract.address, stakersInitialBalance);

        await erc20Token.connect(adr.tokenDeployer).transfer(env.stakerContract.address, rewardPool);

        await erc20Token.connect(adr.tokenDeployer).setNewPeriod(100);
    });

    describe("when doing deposits", ()=>{
        it("should deposit to contract correctly", async ()=>{
            await env.stakerContract.connect(adr.staker1).deposit(50);

            expect(
                await erc20Token.balanceOf(env.stakerContract.address)
            ).to.be.equal(rewardPool + 50)
        });

        it("should revert when trying to stake more than once", async ()=>{
            await env.stakerContract.connect(adr.staker1).deposit(50);

            await expect(
                env.stakerContract.connect(adr.staker1).deposit(50)
            ).to.be.revertedWith("STAKER: You're already staking");
        });

        it("should revert when depositing more than available", async ()=>{
            await expect(
                env.stakerContract.connect(adr.staker1).deposit(1000),
            ).to.be.revertedWith("ERC20: transfer amount exceeds balance");
        });

        it("should allow multiple deposits form different stakers", async () =>{
            await env.stakerContract.connect(adr.staker1).deposit(50);
            await env.stakerContract.connect(adr.staker2).deposit(50);
            await env.stakerContract.connect(adr.staker3).deposit(50);
            await env.stakerContract.connect(adr.staker4).deposit(50);
            await env.stakerContract.connect(adr.staker5).deposit(50);

            expect(
                await erc20Token.balanceOf(env.stakerContract.address)
            ).to.be.equal(rewardPool + (50*5));
        });
    });

    describe("when withdrawing", ()=>{
        beforeEach(async ()=>{
            await env.stakerContract.connect(adr.staker1).deposit(50);
            await env.stakerContract.connect(adr.staker2).deposit(50);
            await env.stakerContract.connect(adr.staker3).deposit(50);
            await env.stakerContract.connect(adr.staker4).deposit(50);
            await env.stakerContract.connect(adr.staker5).deposit(50);

            await mineBlocks(100);
        });

        it("should let withdraw funds correctly", async ()=>{
            await expect(
                env.stakerContract.connect(adr.staker1).withdraw(),
            ).to.not.be.reverted;
            
            expect(
                await erc20Token.balanceOf(adr.staker1.address),  
            ).to.be.equal(100);

        });

        it("should increase rewards per period", async ()=>{
            await mineBlocks(100);

            await expect(
                env.stakerContract.connect(adr.staker1).withdraw(),
            ).to.not.be.reverted;
            
            expect(
                await erc20Token.balanceOf(adr.staker1.address),  
            ).to.be.equal(150);
        });

        it("should let everyone withdraw", async ()=>{

            await expect(
                env.stakerContract.connect(adr.staker1).withdraw(),
            ).to.not.be.reverted;
            
            expect(
                await erc20Token.balanceOf(adr.staker1.address),  
            ).to.be.equal(100);

            await expect(
                env.stakerContract.connect(adr.staker2).withdraw(),
            ).to.not.be.reverted;
            
            expect(
                await erc20Token.balanceOf(adr.staker2.address),  
            ).to.be.equal(100);

            await expect(
                env.stakerContract.connect(adr.staker3).withdraw(),
            ).to.not.be.reverted;
            
            expect(
                await erc20Token.balanceOf(adr.staker3.address),  
            ).to.be.equal(100);

            await expect(
                env.stakerContract.connect(adr.staker4).withdraw(),
            ).to.not.be.reverted;
            
            expect(
                await erc20Token.balanceOf(adr.staker4.address),  
            ).to.be.equal(100);

            await expect(
                env.stakerContract.connect(adr.staker5).withdraw(),
            ).to.not.be.reverted;
            
            expect(
                await erc20Token.balanceOf(adr.staker5.address),  
            ).to.be.equal(100);
            
        });
    });

    describe("when depositing and withdrawing with fees", ()=>{
        beforeEach(async ()=>{
            await erc20Token.connect(adr.tokenDeployer).setDepositFee(2);
            await erc20Token.connect(adr.tokenDeployer).setWithdrawFee(2);
        });

        it("should deposit to contract correctly", async ()=>{
            await env.stakerContract.connect(adr.staker1).deposit(50);

            expect(
                await erc20Token.balanceOf(env.stakerContract.address)
            ).to.be.equal(rewardPool + 50 + (50*0.02))
        });

        it("should let withdraw funds correctly", async ()=>{
            await env.stakerContract.connect(adr.staker1).deposit(50);

            await mineBlocks(101);
            
            await expect(
                env.stakerContract.connect(adr.staker1).withdraw(),
            ).to.not.be.reverted;
            
            expect(
                await erc20Token.balanceOf(adr.staker1.address),  
            ).to.be.equal(89);

        });
    });
});
