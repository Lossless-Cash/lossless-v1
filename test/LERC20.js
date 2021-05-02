const { expect } = require('chai');
const {
  BN,
  constants,
  expectEvent,
  expectRevert,
  time,
} = require('@openzeppelin/test-helpers');
const { duration } = require('@openzeppelin/test-helpers/src/time');

const oneDay = 60 * 60 * 24;

let initialHolder,
  recipient,
  anotherAccount,
  admin,
  adminBackup,
  lssAdmin,
  lssRecoveryAdmin,
  oneMoreAccount,
  pauser;

let losslessController;
let erc20;

const name = 'My Token';
const symbol = 'MTKN';

const initialSupply = 100;
const fiveMinutes = time.duration.minutes(5);

beforeEach(async function () {
  [
    initialHolder,
    recipient,
    anotherAccount,
    admin,
    recoveryAdmin,
    lssAdmin,
    lssRecoveryAdmin,
    oneMoreAccount,
    pauser,
  ] = await ethers.getSigners();

  const LosslessController = await ethers.getContractFactory(
    'LosslessController',
  );

  losslessController = await upgrades.deployProxy(LosslessController, [
    lssAdmin.address,
    lssRecoveryAdmin.address,
    pauser.address,
  ]);

  const LERC20Mock = await ethers.getContractFactory('LERC20Mock');
  erc20 = await LERC20Mock.deploy(
    0,
    name,
    symbol,
    initialHolder.address,
    initialSupply,
    losslessController.address,
    admin.address,
    recoveryAdmin.address,
    oneDay,
  );
});

const getTimestamp = async (timeToAdd) => {
  const blockNum = await ethers.provider.getBlockNumber();
  const block = await ethers.provider.getBlock(blockNum);
  return block.timestamp + Number(timeToAdd);
};

const increaseTime = async (timeToAdd) => {
  await ethers.provider.send('evm_increaseTime', [
    Number(duration.hours(timeToAdd)),
  ]);
};

describe('LERC20', () => {
  beforeEach(async function () {
    [
      initialHolder,
      recipient,
      anotherAccount,
      admin,
      recoveryAdmin,
      lssAdmin,
      lssRecoveryAdmin,
      oneMoreAccount,
      pauser,
    ] = await ethers.getSigners();

    const LosslessController = await ethers.getContractFactory(
      'LosslessController',
    );

    losslessController = await upgrades.deployProxy(LosslessController, [
      lssAdmin.address,
      lssRecoveryAdmin.address,
      pauser.address,
    ]);

    const LERC20Mock = await ethers.getContractFactory('LERC20Mock');
    erc20 = await LERC20Mock.deploy(
      0,
      name,
      symbol,
      initialHolder.address,
      initialSupply,
      losslessController.address,
      admin.address,
      recoveryAdmin.address,
      oneDay,
    );
  });

  describe('setLosslessAdmin', () => {
    describe('when sender is not recovery admin', () => {
      it('should revert', async function () {
        await expect(
          erc20
            .connect(oneMoreAccount)
            .setLosslessAdmin(oneMoreAccount.address),
        ).to.be.revertedWith('Sender must be recovery admin');
      });
    });

    describe('when sender is regular admin', () => {
      it('should revert', async function () {
        await expect(
          erc20.connect(admin).setLosslessAdmin(oneMoreAccount.address),
        ).to.be.revertedWith('Sender must be recovery admin');
      });
    });

    describe('when lossless is turned off', () => {
      it('should revert', async function () {
        await erc20.connect(recoveryAdmin).proposeLosslessTurnOff();
        await ethers.provider.send('evm_increaseTime', [
          Number(duration.hours(24)) + 1,
        ]);
        await erc20.connect(recoveryAdmin).executeLosslessTurnOff();

        await expect(
          erc20.connect(recoveryAdmin).setLosslessAdmin(oneMoreAccount.address),
        ).to.be.revertedWith('LERC20: lossless is turned off');
      });
    });

    describe('when sender is recovery admin', () => {
      it('should change admin', async function () {
        await erc20
          .connect(recoveryAdmin)
          .setLosslessAdmin(oneMoreAccount.address);
        expect(await losslessController.getTokenAdmin(erc20.address)).to.eq(
          oneMoreAccount.address,
        );
      });

      it('should emit AdminChanged event', async function () {
        await expect(
          erc20.connect(recoveryAdmin).setLosslessAdmin(oneMoreAccount.address),
        )
          .to.emit(erc20, 'AdminChanged')
          .withArgs(admin.address, oneMoreAccount.address);
      });
    });
  });

  describe('setLosslessRecoveryAdmin', () => {
    describe('when sender is not recovery admin', () => {
      it('should revert', async function () {
        it('should revert', async function () {
          await expect(
            erc20
              .connect(admin)
              .setLosslessRecoveryAdmin(oneMoreAccount.address),
          ).to.be.revertedWith('Sender must be recovery admin');
        });
      });
    });

    describe('when sender is regular admin', () => {
      it('should revert', async function () {
        await expect(
          erc20.connect(admin).setLosslessRecoveryAdmin(oneMoreAccount.address),
        ).to.be.revertedWith('Sender must be recovery admin');
      });
    });

    describe('when sender is recovery admin', () => {
      it('should change admin', async function () {
        await erc20
          .connect(recoveryAdmin)
          .setLosslessRecoveryAdmin(oneMoreAccount.address);
        expect(await erc20.recoveryAdmin()).to.eq(oneMoreAccount.address);
      });

      it('should emit RecoveryAdminChanged event', async function () {
        await expect(
          erc20
            .connect(recoveryAdmin)
            .setLosslessRecoveryAdmin(oneMoreAccount.address),
        )
          .to.emit(erc20, 'RecoveryAdminChanged')
          .withArgs(recoveryAdmin.address, oneMoreAccount.address);
      });
    });
  });

  describe('proposeLosslessTurnOff', () => {
    describe('when sender is not recovery admin', () => {
      it('should revert', async function () {
        await expect(
          erc20.connect(anotherAccount).proposeLosslessTurnOff(),
        ).to.be.revertedWith('Sender must be recovery admin');
      });
    });

    describe('when sender is regular admin', () => {
      it('should revert', async function () {
        await expect(
          erc20.connect(admin).proposeLosslessTurnOff(),
        ).to.be.revertedWith('Sender must be recovery admin');
      });
    });

    describe('when sender is recovery admin', () => {
      it('should set losslessTurnOffDate and isLosslessTurnOffProposed', async function () {
        await erc20.connect(recoveryAdmin).proposeLosslessTurnOff();

        const losslessTurnOffDate = await erc20.losslessTurnOffDate();
        const isLosslessTurnOffProposed = await erc20.isLosslessTurnOffProposed();
        expect(losslessTurnOffDate).to.be.equal(
          await getTimestamp(duration.days(1)),
        );
        expect(isLosslessTurnOffProposed).to.equal(true);
      });

      it('should emit LosslessTurnOffProposed event', async function () {
        await expect(erc20.connect(recoveryAdmin).proposeLosslessTurnOff())
          .to.emit(erc20, 'LosslessTurnOffProposed')
          .withArgs((await getTimestamp(duration.days(1))) + 1);
      });
    });
  });

  describe('executeLosslessTurnOff', () => {
    describe('when sender is not recovery admin', () => {
      it('should revert', async function () {
        await expect(
          erc20.connect(initialHolder).executeLosslessTurnOff(),
        ).to.be.revertedWith('LERC20: Sender must be recovery admin');
      });
    });

    describe('when sender is regular admin', () => {
      it('should revert', async function () {
        await expect(
          erc20.connect(admin).executeLosslessTurnOff(),
        ).to.be.revertedWith('LERC20: Sender must be recovery admin');
      });
    });

    describe('when sender is recovery admin', () => {
      describe('when there is no proposal', () => {
        it('should revert', async function () {
          await expect(
            erc20.connect(recoveryAdmin).executeLosslessTurnOff(),
          ).to.be.revertedWith('LERC20: Lossless turn off is not proposed');
        });
      });

      describe('when proposal timelock is not over', () => {
        it('should revert in the same block', async function () {
          await erc20.connect(recoveryAdmin).proposeLosslessTurnOff();

          await expect(
            erc20.connect(recoveryAdmin).executeLosslessTurnOff(),
          ).to.be.revertedWith('LERC20: Time lock is still in progress');
        });

        it('should revert after half a day', async function () {
          await erc20.connect(recoveryAdmin).proposeLosslessTurnOff();
          await ethers.provider.send('evm_increaseTime', [
            Number(duration.hours(12)),
          ]);
          await expect(
            erc20.connect(recoveryAdmin).executeLosslessTurnOff(),
          ).to.be.revertedWith('LERC20: Time lock is still in progress');
        });
      });

      describe('when proposal timelock is over and sender', () => {
        it('should succeed', async function () {
          await erc20.connect(recoveryAdmin).proposeLosslessTurnOff();
          await ethers.provider.send('evm_increaseTime', [
            Number(duration.hours(24)) + 1,
          ]);
          await erc20.connect(recoveryAdmin).executeLosslessTurnOff();
          expect(await erc20.isLosslessOn()).to.eq(false);
          expect(await erc20.isLosslessTurnOffProposed()).to.eq(false);
        });

        it('should emit LosslessTurnedOff event ', async function () {
          await erc20.connect(recoveryAdmin).proposeLosslessTurnOff();
          await ethers.provider.send('evm_increaseTime', [
            Number(duration.hours(24)) + 1,
          ]);
          await expect(
            erc20.connect(recoveryAdmin).executeLosslessTurnOff(),
          ).to.emit(erc20, 'LosslessTurnedOff');
        });
      });
    });
  });

  describe('executeLosslessTurnOn', () => {
    describe('when sender is not recovery admin', () => {
      it('should revert', async function () {
        await erc20.connect(recoveryAdmin).proposeLosslessTurnOff();
        await ethers.provider.send('evm_increaseTime', [
          Number(duration.hours(24)) + 1,
        ]);
        await expect(
          erc20.connect(initialHolder).executeLosslessTurnOn(),
        ).to.be.revertedWith('LERC20: Sender must be recovery admin');
      });
    });

    describe('when sender is regular admin', () => {
      it('should revert', async function () {
        await erc20.connect(recoveryAdmin).proposeLosslessTurnOff();
        await ethers.provider.send('evm_increaseTime', [
          Number(duration.hours(24)) + 1,
        ]);
        await expect(
          erc20.connect(admin).executeLosslessTurnOn(),
        ).to.be.revertedWith('LERC20: Sender must be recovery admin');
      });
    });

    describe('when sender is recovery admin', () => {
      it('should set isLosslessOn and isLosslessTurnOffProposed', async function () {
        await erc20.connect(recoveryAdmin).proposeLosslessTurnOff();
        await ethers.provider.send('evm_increaseTime', [
          Number(duration.hours(24)) + 1,
        ]);
        await erc20.connect(recoveryAdmin).executeLosslessTurnOff();
        await erc20.connect(recoveryAdmin).executeLosslessTurnOn();
        expect(await erc20.isLosslessOn()).to.eq(true);
        expect(await erc20.isLosslessTurnOffProposed()).to.eq(false);
      });

      it('should emit LosslessTurnedOn event', async function () {
        await erc20.connect(recoveryAdmin).proposeLosslessTurnOff();
        await ethers.provider.send('evm_increaseTime', [
          Number(duration.hours(24)) + 1,
        ]);
        await erc20.connect(recoveryAdmin).executeLosslessTurnOff();

        await expect(
          erc20.connect(recoveryAdmin).executeLosslessTurnOn(),
        ).to.emit(erc20, 'LosslessTurnedOn');
      });

      it('should cancel active proposal', async function () {
        await erc20.connect(recoveryAdmin).proposeLosslessTurnOff();
        expect(await erc20.isLosslessTurnOffProposed.call()).to.eq(true);
        await erc20.connect(recoveryAdmin).executeLosslessTurnOn();
        expect(await erc20.isLosslessOn.call()).to.eq(true);
        expect(await erc20.isLosslessTurnOffProposed.call()).to.eq(false);
      });
    });
  });
});
