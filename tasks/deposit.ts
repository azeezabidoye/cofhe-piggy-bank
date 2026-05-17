import { task, types } from 'hardhat/config'
import { HardhatRuntimeEnvironment } from 'hardhat/types'
import { PiggyBank } from '../typechain-types'
import { Encryptable, FheTypes } from '@cofhe/sdk'
import { getDeployment, createCofheClient } from './utils'

task('deposit', 'Deposit an encrypted amount into your PiggyBank')
	.addOptionalParam('amount', 'Amount to deposit (as a plain number)', '100', types.string)
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
		console.log(`Depositing from account: ${signer.address}`)
		const client = await createCofheClient(hre, signer)

		const PiggyBankFactory = await ethers.getContractFactory('PiggyBank')
		const piggyBank = PiggyBankFactory.attach(piggyBankAddress) as unknown as PiggyBank

		const depositAmount = BigInt(taskArgs.amount)
		console.log(`Encrypting deposit amount: ${depositAmount}`)
		const encrypted = await client.encryptInputs([Encryptable.uint64(depositAmount)]).execute()

		console.log('Submitting deposit...')
		const tx = await piggyBank.connect(signer).deposit(encrypted[0])
		await tx.wait()
		console.log(`Transaction hash: ${tx.hash}`)

		const balanceHandle = await piggyBank.connect(signer).getBalance()
		const balance = await client.decryptForView(balanceHandle, FheTypes.Uint64).execute()
		console.log(`Your new encrypted balance (decrypted for view): ${balance}`)
	})
