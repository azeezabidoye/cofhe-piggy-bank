import { task } from 'hardhat/config'
import { HardhatRuntimeEnvironment } from 'hardhat/types'
import { saveDeployment } from './utils'

task('deploy-piggy-bank', 'Deploy the PiggyBank contract to the selected network').setAction(async (_, hre: HardhatRuntimeEnvironment) => {
	const { ethers, network } = hre

	console.log(`Deploying PiggyBank to ${network.name}...`)

	const [deployer] = await ethers.getSigners()
	console.log(`Deploying with account: ${deployer.address}`)

	const PiggyBank = await ethers.getContractFactory('PiggyBank')
	const piggyBank = await PiggyBank.deploy()
	await piggyBank.waitForDeployment()

	const piggyBankAddress = await piggyBank.getAddress()
	console.log(`PiggyBank deployed to: ${piggyBankAddress}`)

	saveDeployment(network.name, 'PiggyBank', piggyBankAddress)

	return piggyBankAddress
})
