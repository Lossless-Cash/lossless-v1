const { expect } = require('chai');
const { time } = require('@openzeppelin/test-helpers');
const { duration } = require('@openzeppelin/test-helpers/src/time');

let initialHolder;
let anotherAccount;
let admin;
let recoveryAdmin;
let lssAdmin;
let lssRecoveryAdmin;
let oneMoreAccount;
let pauser;

let losslessController;
let erc20;

const name = 'My Token';
const symbol = 'MTKN';

const initialSupply = 100;

const getTimestamp = async (timeToAdd) => {
  const blockNum = await ethers.provider.getBlockNumber();
  const block = await ethers.provider.getBlock(blockNum);
  return block.timestamp + Number(timeToAdd);
};

describe('LERC20', () => {
  beforeEach(async () => {
    [
      initialHolder,
      anotherAccount,
      admin,
      recoveryAdmin,
      lssAdmin,
      lssRecoveryAdmin,
      oneMoreAccount,
      pauser,
    ] = await ethers.getSigners();

    const LosslessController = await ethers.getContractFactory(
      'LosslessControllerV1',
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
      Number(time.duration.days(1)),
    );
  });

  describe('setLosslessAdmin', () => {
    describe('when sender is not recovery admin', () => {
      it('should revert', async () => {
        await expect(
          erc20
            .connect(oneMoreAccount)
            .setLosslessAdmin(oneMoreAccount.address),
        ).to.be.revertedWith('LERC20: Must be recovery admin');
      });
    });

    describe('when sender is regular admin', () => {
      it('should revert', async () => {
        await expect(
          erc20.connect(admin).setLosslessAdmin(oneMoreAccount.address),
        ).to.be.revertedWith('LERC20: Must be recovery admin');
      });
    });

    describe('when lossless is turned off', () => {
      it('should change admin', async () => {
        await erc20
          .connect(recoveryAdmin)
          .setLosslessAdmin(oneMoreAccount.address);
        expect(await erc20.getAdmin()).to.eq(oneMoreAccount.address);
      });
    });

    describe('when sender is recovery admin', () => {
      it('should change admin', async () => {
        await erc20
          .connect(recoveryAdmin)
          .setLosslessAdmin(oneMoreAccount.address);
        expect(await erc20.getAdmin()).to.eq(oneMoreAccount.address);
      });

      it('should emit AdminChanged event', async () => {
        await expect(
          erc20.connect(recoveryAdmin).setLosslessAdmin(oneMoreAccount.address),
        )
          .to.emit(erc20, 'AdminChanged')
          .withArgs(admin.address, oneMoreAccount.address);
      });
    });
  });

  describe('transferRecoveryAdminOwnership', () => {
    describe('when sender is not recovery admin', () => {
      it('should revert', async () => {
        it('should revert', async () => {
          await expect(
            erc20
              .connect(oneMoreAccount)
              .transferRecoveryAdminOwnership(
                oneMoreAccount.address,
                ethers.utils.keccak256(ethers.utils.toUtf8Bytes('test-key')),
              ),
          ).to.be.revertedWith('LERC20: Must be recoveryAdmin');
        });
      });
    });

    describe('when sender is regular admin', () => {
      it('should revert', async () => {
        await expect(
          erc20
            .connect(admin)
            .transferRecoveryAdminOwnership(
              oneMoreAccount.address,
              ethers.utils.keccak256(ethers.utils.toUtf8Bytes('test-key')),
            ),
        ).to.be.revertedWith('LERC20: Must be recovery admin');
      });
    });

    describe('when sender is recovery admin', () => {
      it('should emit RecoveryAdminChangeProposed event', async () => {
        await expect(
          erc20
            .connect(recoveryAdmin)
            .transferRecoveryAdminOwnership(
              oneMoreAccount.address,
              ethers.utils.keccak256(ethers.utils.toUtf8Bytes('test-key')),
            ),
        )
          .to.emit(erc20, 'RecoveryAdminChangeProposed')
          .withArgs(oneMoreAccount.address);
      });

      describe('when new admin is proposed', () => {
        beforeEach(async () => {
          await erc20
            .connect(recoveryAdmin)
            .transferRecoveryAdminOwnership(
              oneMoreAccount.address,
              ethers.utils.keccak256(ethers.utils.toUtf8Bytes('test-key')),
            );
        });

        describe('when accepting admin is canditate', () => {
          describe('when key is correct', () => {
            it('should change admin', async () => {
              await erc20
                .connect(oneMoreAccount)
                .acceptRecoveryAdminOwnership(
                  ethers.utils.toUtf8Bytes('test-key'),
                );

              expect(await erc20.recoveryAdmin()).to.equal(
                oneMoreAccount.address,
              );
            });

            it('should emit RecoveryAdminChanged event', async () => {
              await expect(
                erc20
                  .connect(oneMoreAccount)
                  .acceptRecoveryAdminOwnership(
                    ethers.utils.toUtf8Bytes('test-key'),
                  ),
              )
                .to.emit(erc20, 'RecoveryAdminChanged')
                .withArgs(recoveryAdmin.address, oneMoreAccount.address);
            });
          });

          describe('when key is incorrect', () => {
            it('should revert', async () => {
              await expect(
                erc20
                  .connect(oneMoreAccount)
                  .acceptRecoveryAdminOwnership(
                    ethers.utils.toUtf8Bytes('test-key-2'),
                  ),
              ).to.be.revertedWith('LERC20: Invalid key');
            });
          });
        });

        describe('when accepting admin is not canditate', () => {
          it('should revert', async () => {
            await expect(
              erc20
                .connect(anotherAccount)
                .acceptRecoveryAdminOwnership(
                  ethers.utils.toUtf8Bytes('test-key'),
                ),
            ).to.be.revertedWith('LERC20: Must be canditate');
          });
        });
      });

      describe('when new recovery admin is not proposed', () => {
        it('should revert', async () => {
          await expect(
            erc20
              .connect(oneMoreAccount)
              .acceptRecoveryAdminOwnership(
                ethers.utils.toUtf8Bytes('test-key'),
              ),
          ).to.be.revertedWith('LERC20: Must be canditate');
        });
      });
    });
  });

  describe('proposeLosslessTurnOff', () => {
    describe('when sender is not recovery admin', () => {
      it('should revert', async () => {
        await expect(
          erc20.connect(anotherAccount).proposeLosslessTurnOff(),
        ).to.be.revertedWith('LERC20: Must be recovery admin');
      });
    });

    describe('when sender is regular admin', () => {
      it('should revert', async () => {
        await expect(
          erc20.connect(admin).proposeLosslessTurnOff(),
        ).to.be.revertedWith('LERC20: Must be recovery admin');
      });
    });

    describe('when sender is recovery admin', () => {
      it('should set losslessTurnOffTimestamp and isLosslessTurnOffProposed', async () => {
        await erc20.connect(recoveryAdmin).proposeLosslessTurnOff();

        const losslessTurnOffTimestamp = await erc20.losslessTurnOffTimestamp();
        const isLosslessTurnOffProposed = await erc20.isLosslessTurnOffProposed();
        expect(losslessTurnOffTimestamp).to.be.equal(
          await getTimestamp(duration.days(1)),
        );
        expect(isLosslessTurnOffProposed).to.equal(true);
      });

      it('should emit LosslessTurnOffProposed event', async () => {
        await expect(erc20.connect(recoveryAdmin).proposeLosslessTurnOff())
          .to.emit(erc20, 'LosslessTurnOffProposed')
          .withArgs((await getTimestamp(duration.days(1))) + 1);
      });
    });
  });

  describe('executeLosslessTurnOff', () => {
    describe('when sender is not recovery admin', () => {
      it('should revert', async () => {
        await expect(
          erc20.connect(initialHolder).executeLosslessTurnOff(),
        ).to.be.revertedWith('LERC20: Must be recovery admin');
      });
    });

    describe('when sender is regular admin', () => {
      it('should revert', async () => {
        await expect(
          erc20.connect(admin).executeLosslessTurnOff(),
        ).to.be.revertedWith('LERC20: Must be recovery admin');
      });
    });

    describe('when sender is recovery admin', () => {
      describe('when there is no proposal', () => {
        it('should revert', async () => {
          await expect(
            erc20.connect(recoveryAdmin).executeLosslessTurnOff(),
          ).to.be.revertedWith('LERC20: TurnOff not proposed');
        });
      });

      describe('when proposal timelock is not over', () => {
        it('should revert in the same block', async () => {
          await erc20.connect(recoveryAdmin).proposeLosslessTurnOff();

          await expect(
            erc20.connect(recoveryAdmin).executeLosslessTurnOff(),
          ).to.be.revertedWith('LERC20: Time lock in progress');
        });

        it('should revert after half a day', async () => {
          await erc20.connect(recoveryAdmin).proposeLosslessTurnOff();
          await ethers.provider.send('evm_increaseTime', [
            Number(duration.hours(12)),
          ]);
          await expect(
            erc20.connect(recoveryAdmin).executeLosslessTurnOff(),
          ).to.be.revertedWith('LERC20: Time lock in progress');
        });
      });

      describe('when proposal timelock is over and sender', () => {
        it('should succeed', async () => {
          await erc20.connect(recoveryAdmin).proposeLosslessTurnOff();
          await ethers.provider.send('evm_increaseTime', [
            Number(duration.hours(24)) + 1,
          ]);
          await erc20.connect(recoveryAdmin).executeLosslessTurnOff();
          expect(await erc20.isLosslessOn()).to.eq(false);
          expect(await erc20.isLosslessTurnOffProposed()).to.eq(false);
        });

        it('should emit LosslessTurnedOff event ', async () => {
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
      it('should revert', async () => {
        await erc20.connect(recoveryAdmin).proposeLosslessTurnOff();
        await ethers.provider.send('evm_increaseTime', [
          Number(duration.hours(24)) + 1,
        ]);
        await expect(
          erc20.connect(initialHolder).executeLosslessTurnOn(),
        ).to.be.revertedWith('LERC20: Must be recovery admin');
      });
    });

    describe('when sender is regular admin', () => {
      it('should revert', async () => {
        await erc20.connect(recoveryAdmin).proposeLosslessTurnOff();
        await ethers.provider.send('evm_increaseTime', [
          Number(duration.hours(24)) + 1,
        ]);
        await expect(
          erc20.connect(admin).executeLosslessTurnOn(),
        ).to.be.revertedWith('LERC20: Must be recovery admin');
      });
    });

    describe('when sender is recovery admin', () => {
      it('should set isLosslessOn and isLosslessTurnOffProposed', async () => {
        await erc20.connect(recoveryAdmin).proposeLosslessTurnOff();
        await ethers.provider.send('evm_increaseTime', [
          Number(duration.hours(24)) + 1,
        ]);
        await erc20.connect(recoveryAdmin).executeLosslessTurnOff();
        await erc20.connect(recoveryAdmin).executeLosslessTurnOn();
        expect(await erc20.isLosslessOn()).to.eq(true);
        expect(await erc20.isLosslessTurnOffProposed()).to.eq(false);
      });

      it('should emit LosslessTurnedOn event', async () => {
        await erc20.connect(recoveryAdmin).proposeLosslessTurnOff();
        await ethers.provider.send('evm_increaseTime', [
          Number(duration.hours(24)) + 1,
        ]);
        await erc20.connect(recoveryAdmin).executeLosslessTurnOff();

        await expect(
          erc20.connect(recoveryAdmin).executeLosslessTurnOn(),
        ).to.emit(erc20, 'LosslessTurnedOn');
      });

      it('should cancel active proposal', async () => {
        await erc20.connect(recoveryAdmin).proposeLosslessTurnOff();
        expect(await erc20.isLosslessTurnOffProposed.call()).to.eq(true);
        await erc20.connect(recoveryAdmin).executeLosslessTurnOn();
        expect(await erc20.isLosslessOn.call()).to.eq(true);
        expect(await erc20.isLosslessTurnOffProposed.call()).to.eq(false);
      });
    });
  });

  describe('transferOutBlacklistedFunds', () => {
    describe('when sender is not lossless contract', () => {
      it('should revert', async () => {
        await expect(
          erc20
            .connect(recoveryAdmin)
            .transferOutBlacklistedFunds([anotherAccount.address]),
        ).to.be.revertedWith('LERC20: Only lossless contract');
      });
    });
  });
});
