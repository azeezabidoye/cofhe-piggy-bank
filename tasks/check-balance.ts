import { task } from "hardhat/config";
import { HardhatRuntimeEnvironment } from "hardhat/types";
import { PiggyBank } from "../typechain-types";
import { FheTypes } from "@cofhe/sdk";
import { getDeployment, createCofheClient } from "./utils";

// Decrypts and displays the caller's balance off-chain using a wallet permit.
// This does NOT write to the blockchain — it is a read-only view.
task("check-balance", "Decrypt and display your PiggyBank balance").setAction(
  async (_, hre: HardhatRuntimeEnvironment) => {
    const { ethers, network } = hre;

    const piggyBankAddress = getDeployment(network.name, "PiggyBank");
    if (!piggyBankAddress) {
      console.error(
        `No PiggyBank deployment found for network ${network.name}`,
      );
      console.error(
        `Deploy first: npx hardhat deploy-piggy-bank --network ${network.name}`,
      );
      return;
    }

    console.log(
      `Using PiggyBank at ${piggyBankAddress} on ${network.name} network`,
    );

    const [signer] = await ethers.getSigners();
    console.log(`Checking balance for account: ${signer.address}`);
    const client = await createCofheClient(hre, signer);

    const PiggyBankFactory = await ethers.getContractFactory("PiggyBank");
    const piggyBank = PiggyBankFactory.attach(
      piggyBankAddress,
    ) as unknown as PiggyBank;

    const balanceHandle = await piggyBank.connect(signer).getBalance();
    console.log(`Encrypted balance handle: ${balanceHandle}`);

    console.log("Decrypting balance off-chain with your wallet permit...");
    const balance = await client
      .decryptForView(balanceHandle, FheTypes.Uint64)
      .execute();
    console.log(`Your current balance is: ${balance}`);
  },
);
