const { expect } = require('chai');

let lssAdmin;
let lssRecoveryAdmin;
let oneMoreAccount;
let pauseAdmin;

let losslessController;

describe('LosslessControllerV1', () => {
  beforeEach(async () => {
    [
      lssAdmin,
      lssRecoveryAdmin,
      oneMoreAccount,
      pauseAdmin,
    ] = await ethers.getSigners();

    const LosslessController = await ethers.getContractFactory(
      'LosslessControllerV1',
    );

    losslessController = await upgrades.deployProxy(LosslessController, [
      lssAdmin.address,
      lssRecoveryAdmin.address,
      pauseAdmin.address,
    ]);
  });

  describe('getVersion', () => {
    it('should get version', async () => {
      expect(
        await losslessController.connect(oneMoreAccount).getVersion(),
      ).to.be.equal(1);
    });
  });

  describe('pause', () => {
    describe('when sender is not pause admin', () => {
      it('should revert', async () => {
        await expect(
          losslessController.connect(oneMoreAccount).pause(),
        ).to.be.revertedWith('LOSSLESS: Must be pauseAdmin');
      });
    });

    describe('when sender is pause admin', () => {
      it('should change admin', async () => {
        await losslessController.connect(pauseAdmin).pause();
        expect(await losslessController.paused()).to.eq(true);
      });

      it('should emit Paused event', async () => {
        await expect(losslessController.connect(pauseAdmin).pause())
          .to.emit(losslessController, 'Paused')
          .withArgs(pauseAdmin.address);
      });
    });
  });

  describe('unpause', () => {
    describe('when is not paused', () => {
      it('should revert', async () => {
        await expect(
          losslessController.connect(pauseAdmin).unpause(),
        ).to.be.revertedWith('Pausable: not paused');
      });
    });

    describe('when sender is not pause admin', () => {
      it('should revert', async () => {
        await losslessController.connect(pauseAdmin).pause();
        await expect(
          losslessController.connect(oneMoreAccount).unpause(),
        ).to.be.revertedWith('LOSSLESS: Must be pauseAdmin');
      });
    });

    describe('when sender is pause admin', () => {
      it('should change admin', async () => {
        await losslessController.connect(pauseAdmin).pause();
        await losslessController.connect(pauseAdmin).unpause();
        expect(await losslessController.paused()).to.eq(false);
      });

      it('should emit Unpaused event', async () => {
        await losslessController.connect(pauseAdmin).pause();
        await expect(losslessController.connect(pauseAdmin).unpause())
          .to.emit(losslessController, 'Unpaused')
          .withArgs(pauseAdmin.address);
      });
    });
  });

  describe('setAdmin', () => {
    describe('when sender is not recovery admin', () => {
      it('should revert', async () => {
        it('should revert', async () => {
          await expect(
            losslessController
              .connect(oneMoreAccount)
              .setAdmin(oneMoreAccount.address),
          ).to.be.revertedWith('LOSSLESS: Must be recoveryAdmin');
        });
      });
    });

    describe('when contract is paused', () => {
      it('should change admin', async () => {
        await losslessController.connect(pauseAdmin).pause();
        await losslessController
          .connect(lssRecoveryAdmin)
          .setAdmin(oneMoreAccount.address);

        const newAdmin = await losslessController.admin();
        expect(newAdmin).to.eq(oneMoreAccount.address);
      });
    });

    describe('when sender is recovery admin', () => {
      it('should change admin', async () => {
        await losslessController
          .connect(lssRecoveryAdmin)
          .setAdmin(oneMoreAccount.address);

        const newAdmin = await losslessController.admin();
        expect(newAdmin).to.eq(oneMoreAccount.address);
      });

      it('should emit AdminChanged event', async () => {
        await expect(
          losslessController
            .connect(lssRecoveryAdmin)
            .setAdmin(oneMoreAccount.address),
        )
          .to.emit(losslessController, 'AdminChanged')
          .withArgs(lssAdmin.address, oneMoreAccount.address);
      });
    });

    describe('when sender is regular admin', () => {
      it('should revert', async () => {
        await expect(
          losslessController.connect(lssAdmin).setAdmin(oneMoreAccount.address),
        ).to.be.revertedWith('LOSSLESS: Must be recoveryAdmin');
      });
    });
  });

  describe('transferRecoveryAdminOwnership', () => {
    describe('when sender is not recovery admin', () => {
      it('should revert', async () => {
        it('should revert', async () => {
          await expect(
            losslessController
              .connect(oneMoreAccount)
              .transferRecoveryAdminOwnership(
                oneMoreAccount.address,
                ethers.utils.keccak256(ethers.utils.toUtf8Bytes('test-key')),
              ),
          ).to.be.revertedWith('LOSSLESS: Must be recoveryAdmin');
        });
      });
    });

    describe('when sender is regular admin', () => {
      it('should revert', async () => {
        await expect(
          losslessController
            .connect(lssAdmin)
            .transferRecoveryAdminOwnership(
              oneMoreAccount.address,
              ethers.utils.keccak256(ethers.utils.toUtf8Bytes('test-key')),
            ),
        ).to.be.revertedWith('LOSSLESS: Must be recoveryAdmin');
      });
    });

    describe('when contract is paused', () => {
      it('should set canditate admin', async () => {
        await losslessController.connect(pauseAdmin).pause();
        await losslessController
          .connect(lssRecoveryAdmin)
          .transferRecoveryAdminOwnership(
            oneMoreAccount.address,
            ethers.utils.keccak256(ethers.utils.toUtf8Bytes('test-key')),
          );

        await losslessController
          .connect(oneMoreAccount)
          .acceptRecoveryAdminOwnership(ethers.utils.toUtf8Bytes('test-key'));

        expect(await losslessController.recoveryAdmin()).to.equal(
          oneMoreAccount.address,
        );
      });
    });

    describe('when sender is recovery admin', () => {
      it('should emit RecoveryAdminChangeProposed event', async () => {
        await expect(
          losslessController
            .connect(lssRecoveryAdmin)
            .transferRecoveryAdminOwnership(
              oneMoreAccount.address,
              ethers.utils.keccak256(ethers.utils.toUtf8Bytes('test-key')),
            ),
        )
          .to.emit(losslessController, 'RecoveryAdminChangeProposed')
          .withArgs(oneMoreAccount.address);
      });

      describe('when new admin is proposed', () => {
        beforeEach(async () => {
          await losslessController
            .connect(lssRecoveryAdmin)
            .transferRecoveryAdminOwnership(
              oneMoreAccount.address,
              ethers.utils.keccak256(ethers.utils.toUtf8Bytes('test-key')),
            );
        });

        describe('when accepting admin is canditate', () => {
          describe('when key is correct', () => {
            it('should change admin', async () => {
              await losslessController
                .connect(oneMoreAccount)
                .acceptRecoveryAdminOwnership(
                  ethers.utils.toUtf8Bytes('test-key'),
                );

              expect(await losslessController.recoveryAdmin()).to.equal(
                oneMoreAccount.address,
              );
            });

            it('should emit RecoveryAdminChanged event', async () => {
              await expect(
                losslessController
                  .connect(oneMoreAccount)
                  .acceptRecoveryAdminOwnership(
                    ethers.utils.toUtf8Bytes('test-key'),
                  ),
              )
                .to.emit(losslessController, 'RecoveryAdminChanged')
                .withArgs(lssRecoveryAdmin.address, oneMoreAccount.address);
            });
          });

          describe('when key is incorrect', () => {
            it('should revert', async () => {
              await expect(
                losslessController
                  .connect(oneMoreAccount)
                  .acceptRecoveryAdminOwnership(
                    ethers.utils.toUtf8Bytes('test-key-2'),
                  ),
              ).to.be.revertedWith('LOSSLESS: Invalid key');
            });
          });
        });

        describe('when accepting admin is not canditate', () => {
          it('should revert', async () => {
            await expect(
              losslessController
                .connect(lssAdmin)
                .acceptRecoveryAdminOwnership(
                  ethers.utils.toUtf8Bytes('test-key'),
                ),
            ).to.be.revertedWith('LOSSLESS: Must be canditate');
          });
        });
      });

      describe('when new recovery admin is not proposed', () => {
        it('should revert', async () => {
          await expect(
            losslessController
              .connect(oneMoreAccount)
              .acceptRecoveryAdminOwnership(
                ethers.utils.toUtf8Bytes('test-key'),
              ),
          ).to.be.revertedWith('LOSSLESS: Must be canditate');
        });
      });
    });
  });

  describe('setPauseAdmin', () => {
    describe('when sender is not recovery admin', () => {
      it('should revert', async () => {
        it('should revert', async () => {
          await expect(
            losslessController
              .connect(oneMoreAccount)
              .setPauseAdmin(oneMoreAccount.address),
          ).to.be.revertedWith('LOSSLESS: Must be recoveryAdmin');
        });
      });
    });

    describe('when contract is paused', () => {
      it('should change admin', async () => {
        await losslessController.connect(pauseAdmin).pause();
        await losslessController
          .connect(lssRecoveryAdmin)
          .setPauseAdmin(oneMoreAccount.address);

        expect(await losslessController.pauseAdmin()).to.equal(
          oneMoreAccount.address,
        );
      });
    });

    describe('when sender is regular admin', () => {
      it('should revert', async () => {
        await expect(
          losslessController
            .connect(lssAdmin)
            .setPauseAdmin(oneMoreAccount.address),
        ).to.be.revertedWith('LOSSLESS: Must be recoveryAdmin');
      });
    });

    describe('when sender is recovery admin', () => {
      it('should change admin', async () => {
        await losslessController
          .connect(lssRecoveryAdmin)
          .setPauseAdmin(oneMoreAccount.address);

        expect(await losslessController.pauseAdmin()).to.equal(
          oneMoreAccount.address,
        );
      });

      it('should emit RecoveryAdminChanged event', async () => {
        await expect(
          losslessController
            .connect(lssRecoveryAdmin)
            .setPauseAdmin(oneMoreAccount.address),
        )
          .to.emit(losslessController, 'PauseAdminChanged')
          .withArgs(pauseAdmin.address, oneMoreAccount.address);
      });
    });
  });
});
