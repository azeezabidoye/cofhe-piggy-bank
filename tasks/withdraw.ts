import { task, types } from 'hardhat/config'
import { HardhatRuntimeEnvironment } from 'hardhat/types'
import { PiggyBank } from '../typechain-types'
import { Encryptable, FheTypes } from '@cofhe/sdk'
import { getDeployment, createCofheClient } from './utils'

task('withdraw', 'Withdraw an encrypted amount from your PiggyBank')
	.addOptionalParam('amount', 'Amount to withdraw (as a plain number)', '50', types.string)
	.setAction(async (taskArgs: { amount: string }, hre: HardhatRuntimeEnvironment) => {
		const { ethers, network } = hre

		const piggyBankAddress = getDeployment(network.name, 'PiggyBank')
		if (!piggyBankAddress) {
			console.error(`No PiggyBank deployment found for network ${network.name}`)
			console.error(`Deploy first: npx hardhat deploy-piggy-bank --network ${network.name}`)
			return
		}

		console.log(`Using PiggyBank at ${piggyBankAddress} on ${network.name}`)

		const [signer] = await ethers.getSigners()
		console.log(`Withdrawing from account: ${signer.address}`)
		const client = await createCofheClient(hre, signer)

		const PiggyBankFactory = await ethers.getContractFactory('PiggyBank')
		const piggyBank = PiggyBankFactory.attach(piggyBankAddress) as unknown as PiggyBank

		const withdrawAmount = BigInt(taskArgs.amount)
		console.log(`Encrypting withdrawal amount: ${withdrawAmount}`)
		const encrypted = await client.encryptInputs([Encryptable.uint64(withdrawAmount)]).execute()

		// The contract uses FHE.select internally: if the balance is insufficient
		// the balance stays unchanged — no revert, no information leak.
		console.log('Submitting withdrawal...')
		const tx = await piggyBank.connect(signer).withdraw(encrypted[0])
		await tx.wait()
		console.log(`Transaction hash: ${tx.hash}`)

		const balanceHandle = await piggyBank.connect(signer).getBalance()
		const balance = await client.decryptForView(balanceHandle, FheTypes.Uint64).execute()
		console.log(`Your new encrypted balance (decrypted for view): ${balance}`)
	})
