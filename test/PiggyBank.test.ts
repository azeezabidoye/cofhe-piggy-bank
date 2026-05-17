import { loadFixture } from "@nomicfoundation/hardhat-toolbox/network-helpers";
import hre from "hardhat";
import { Encryptable, FheTypes } from "@cofhe/sdk";
import { PermitUtils } from "@cofhe/sdk/permits";
import { expect } from "chai";

const TASK_COFHE_MOCKS_DEPLOY = "task:cofhe-mocks:deploy";

describe("PiggyBank", function () {
  async function deployPiggyBankFixture() {
    await hre.run(TASK_COFHE_MOCKS_DEPLOY);

    const [signer, bob, alice] = await hre.ethers.getSigners();

    const PiggyBank = await hre.ethers.getContractFactory("PiggyBank");
    const piggyBank = await PiggyBank.connect(bob).deploy();

    // Each user gets their own client so permits are scoped to their address.
    const bobClient = await hre.cofhe.createClientWithBatteries(bob);
    const aliceClient = await hre.cofhe.createClientWithBatteries(alice);

    return { piggyBank, signer, bob, alice, bobClient, aliceClient };
  }

  // ─── Deposit ─────────────────────────────────────────────────────────────────

  describe("Deposit", function () {
    it("Should increase balance after a single deposit", async function () {
      const { piggyBank, bob, bobClient } = await loadFixture(deployPiggyBankFixture);

      const encrypted = await bobClient
        .encryptInputs([Encryptable.uint64(100n)])
        .execute();
      await piggyBank.connect(bob).deposit(encrypted[0]);

      const balanceHandle = await piggyBank.connect(bob).getBalance();
      const balance = await bobClient
        .decryptForView(balanceHandle, FheTypes.Uint64)
        .execute();
      expect(balance).to.equal(100n);
    });

    it("Should accumulate balance across multiple deposits", async function () {
      const { piggyBank, bob, bobClient } = await loadFixture(deployPiggyBankFixture);

      const enc1 = await bobClient.encryptInputs([Encryptable.uint64(100n)]).execute();
      await piggyBank.connect(bob).deposit(enc1[0]);

      const enc2 = await bobClient.encryptInputs([Encryptable.uint64(250n)]).execute();
      await piggyBank.connect(bob).deposit(enc2[0]);

      const enc3 = await bobClient.encryptInputs([Encryptable.uint64(50n)]).execute();
      await piggyBank.connect(bob).deposit(enc3[0]);

      const balanceHandle = await piggyBank.connect(bob).getBalance();
      const balance = await bobClient
        .decryptForView(balanceHandle, FheTypes.Uint64)
        .execute();
      expect(balance).to.equal(400n);
    });
  });

  // ─── Withdraw ────────────────────────────────────────────────────────────────

  describe("Withdraw", function () {
    it("Should decrease balance after a valid withdrawal", async function () {
      const { piggyBank, bob, bobClient } = await loadFixture(deployPiggyBankFixture);

      // Deposit 200, withdraw 75 → expect 125
      const encDeposit = await bobClient.encryptInputs([Encryptable.uint64(200n)]).execute();
      await piggyBank.connect(bob).deposit(encDeposit[0]);

      const encWithdraw = await bobClient.encryptInputs([Encryptable.uint64(75n)]).execute();
      await piggyBank.connect(bob).withdraw(encWithdraw[0]);

      const balanceHandle = await piggyBank.connect(bob).getBalance();
      const balance = await bobClient
        .decryptForView(balanceHandle, FheTypes.Uint64)
        .execute();
      expect(balance).to.equal(125n);
    });

    it("Should leave balance unchanged when withdrawal exceeds balance", async function () {
      const { piggyBank, bob, bobClient } = await loadFixture(deployPiggyBankFixture);

      // Deposit 50, try to withdraw 200 — FHE.select keeps the old balance
      const encDeposit = await bobClient.encryptInputs([Encryptable.uint64(50n)]).execute();
      await piggyBank.connect(bob).deposit(encDeposit[0]);

      const encWithdraw = await bobClient.encryptInputs([Encryptable.uint64(200n)]).execute();
      await piggyBank.connect(bob).withdraw(encWithdraw[0]);

      const balanceHandle = await piggyBank.connect(bob).getBalance();
      const balance = await bobClient
        .decryptForView(balanceHandle, FheTypes.Uint64)
        .execute();
      expect(balance).to.equal(50n);
    });

    it("Should handle a sequence of deposits and withdrawals correctly", async function () {
      const { piggyBank, bob, bobClient } = await loadFixture(deployPiggyBankFixture);

      // deposit 500 → withdraw 100 → deposit 200 → withdraw 50 → expect 550
      const enc1 = await bobClient.encryptInputs([Encryptable.uint64(500n)]).execute();
      await piggyBank.connect(bob).deposit(enc1[0]);

      const enc2 = await bobClient.encryptInputs([Encryptable.uint64(100n)]).execute();
      await piggyBank.connect(bob).withdraw(enc2[0]);

      const enc3 = await bobClient.encryptInputs([Encryptable.uint64(200n)]).execute();
      await piggyBank.connect(bob).deposit(enc3[0]);

      const enc4 = await bobClient.encryptInputs([Encryptable.uint64(50n)]).execute();
      await piggyBank.connect(bob).withdraw(enc4[0]);

      const balanceHandle = await piggyBank.connect(bob).getBalance();
      const balance = await bobClient
        .decryptForView(balanceHandle, FheTypes.Uint64)
        .execute();
      expect(balance).to.equal(550n);
    });
  });

  // ─── Multi-user isolation ────────────────────────────────────────────────────

  describe("Multi-user isolation", function () {
    it("Each user's balance is independent and private", async function () {
      const { piggyBank, bob, alice, bobClient, aliceClient } =
        await loadFixture(deployPiggyBankFixture);

      // Bob deposits 300
      const encBob = await bobClient.encryptInputs([Encryptable.uint64(300n)]).execute();
      await piggyBank.connect(bob).deposit(encBob[0]);

      // Alice deposits 700
      const encAlice = await aliceClient.encryptInputs([Encryptable.uint64(700n)]).execute();
      await piggyBank.connect(alice).deposit(encAlice[0]);

      // Each reads only their own balance
      const bobHandle = await piggyBank.connect(bob).getBalance();
      const bobBalance = await bobClient
        .decryptForView(bobHandle, FheTypes.Uint64)
        .execute();
      expect(bobBalance).to.equal(300n);

      const aliceHandle = await piggyBank.connect(alice).getBalance();
      const aliceBalance = await aliceClient
        .decryptForView(aliceHandle, FheTypes.Uint64)
        .execute();
      expect(aliceBalance).to.equal(700n);
    });

    it("One user's withdrawal does not affect another user's balance", async function () {
      const { piggyBank, bob, alice, bobClient, aliceClient } =
        await loadFixture(deployPiggyBankFixture);

      const encBob = await bobClient.encryptInputs([Encryptable.uint64(500n)]).execute();
      await piggyBank.connect(bob).deposit(encBob[0]);

      const encAlice = await aliceClient.encryptInputs([Encryptable.uint64(500n)]).execute();
      await piggyBank.connect(alice).deposit(encAlice[0]);

      // Bob withdraws 200 — Alice's balance must stay at 500
      const encWithdraw = await bobClient.encryptInputs([Encryptable.uint64(200n)]).execute();
      await piggyBank.connect(bob).withdraw(encWithdraw[0]);

      const aliceHandle = await piggyBank.connect(alice).getBalance();
      const aliceBalance = await aliceClient
        .decryptForView(aliceHandle, FheTypes.Uint64)
        .execute();
      expect(aliceBalance).to.equal(500n);
    });
  });

  // ─── On-chain Decryption (3-step flow) ───────────────────────────────────────

  describe("On-chain Decryption", function () {
    it("Should revert getDecryptedBalance before a decryption result is published", async function () {
      const { piggyBank, bob, bobClient } = await loadFixture(deployPiggyBankFixture);

      const encrypted = await bobClient.encryptInputs([Encryptable.uint64(42n)]).execute();
      await piggyBank.connect(bob).deposit(encrypted[0]);

      await expect(piggyBank.connect(bob).getDecryptedBalance()).to.be.revertedWith(
        "Balance is not ready"
      );
    });

    it("Should return the correct balance after the full 3-step decrypt flow", async function () {
      const { piggyBank, bob, bobClient } = await loadFixture(deployPiggyBankFixture);

      const encrypted = await bobClient.encryptInputs([Encryptable.uint64(350n)]).execute();
      await piggyBank.connect(bob).deposit(encrypted[0]);

      // Step 1: allow public decryption of this user's balance ciphertext
      await piggyBank.connect(bob).allowBalancePublicly();

      // Step 2: decrypt off-chain via the SDK (returns plaintext + Threshold Network signature)
      const ctHash = await piggyBank.connect(bob).getBalance();
      const result = await bobClient
        .decryptForTx(ctHash)
        .withoutPermit()
        .execute();

      // Step 3: publish the verified plaintext + signature back on-chain
      await piggyBank.connect(bob).revealBalance(result.decryptedValue, result.signature);

      const decryptedValue = await piggyBank.connect(bob).getDecryptedBalance();
      expect(decryptedValue).to.equal(350n);
    });

    it("Should reflect the correct balance after deposit then reveal", async function () {
      const { piggyBank, bob, bobClient } = await loadFixture(deployPiggyBankFixture);

      const enc1 = await bobClient.encryptInputs([Encryptable.uint64(200n)]).execute();
      await piggyBank.connect(bob).deposit(enc1[0]);

      const enc2 = await bobClient.encryptInputs([Encryptable.uint64(100n)]).execute();
      await piggyBank.connect(bob).deposit(enc2[0]);

      await piggyBank.connect(bob).allowBalancePublicly();

      const ctHash = await piggyBank.connect(bob).getBalance();
      const result = await bobClient.decryptForTx(ctHash).withoutPermit().execute();

      await piggyBank.connect(bob).revealBalance(result.decryptedValue, result.signature);

      const decryptedValue = await piggyBank.connect(bob).getDecryptedBalance();
      expect(decryptedValue).to.equal(300n);
    });
  });

  // ─── Mock Logging ─────────────────────────────────────────────────────────────

  describe("Mock Logging", function () {
    it("Should log FHE operations during deposit via withLogs", async function () {
      const { piggyBank, bob, bobClient } = await loadFixture(deployPiggyBankFixture);

      const encrypted = await bobClient.encryptInputs([Encryptable.uint64(100n)]).execute();

      await hre.cofhe.mocks.withLogs("piggyBank.deposit()", async () => {
        await piggyBank.connect(bob).deposit(encrypted[0]);
      });

      const plaintext = await hre.cofhe.mocks.getPlaintext(
        await piggyBank.connect(bob).getBalance()
      );
      expect(plaintext).to.equal(100n);
    });

    it("Should assert plaintext balance directly via mocks.expectPlaintext", async function () {
      const { piggyBank, bob, bobClient } = await loadFixture(deployPiggyBankFixture);

      const enc1 = await bobClient.encryptInputs([Encryptable.uint64(400n)]).execute();
      await piggyBank.connect(bob).deposit(enc1[0]);

      const enc2 = await bobClient.encryptInputs([Encryptable.uint64(150n)]).execute();
      await piggyBank.connect(bob).withdraw(enc2[0]);

      const balanceHandle = await piggyBank.connect(bob).getBalance();
      await hre.cofhe.mocks.expectPlaintext(balanceHandle, 250n);
    });
  });

  // ─── Permits ──────────────────────────────────────────────────────────────────

  describe("Permits", function () {
    it("Self permit should be valid on chain", async function () {
      const { bob, bobClient } = await loadFixture(deployPiggyBankFixture);

      const permit = await bobClient.permits.createSelf({
        issuer: bob.address,
        name: "PiggyBank Permit",
      });

      const isValid = await PermitUtils.checkValidityOnChain(
        permit,
        bobClient.getSnapshot().publicClient!
      );

      expect(isValid).to.be.true;
    });

    it("Expired permit should revert with PermissionInvalid_Expired", async function () {
      const { bob, bobClient } = await loadFixture(deployPiggyBankFixture);

      const permit = await bobClient.permits.createSelf({
        issuer: bob.address,
        name: "Expired Permit",
        expiration: Math.floor(Date.now() / 1000) - 3600,
      });

      try {
        await PermitUtils.checkValidityOnChain(
          permit,
          bobClient.getSnapshot().publicClient!
        );
        expect.fail("Expected PermitUtils.checkValidityOnChain to throw for expired permit");
      } catch (error) {
        expect(error).to.be.instanceOf(Error);
        expect((error as Error).message).to.equal("PermissionInvalid_Expired");
      }
    });

    it("Tampered issuer signature should revert with PermissionInvalid_IssuerSignature", async function () {
      const { bob, bobClient } = await loadFixture(deployPiggyBankFixture);

      const permit = await bobClient.permits.createSelf({
        issuer: bob.address,
        name: "Tampered Permit",
      });

      permit.issuerSignature =
        "0xAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA";

      try {
        await PermitUtils.checkValidityOnChain(
          permit,
          bobClient.getSnapshot().publicClient!
        );
        expect.fail("Expected PermitUtils.checkValidityOnChain to throw for invalid signature");
      } catch (error) {
        expect(error).to.be.instanceOf(Error);
        expect((error as Error).message).to.equal("PermissionInvalid_IssuerSignature");
      }
    });
  });
});
