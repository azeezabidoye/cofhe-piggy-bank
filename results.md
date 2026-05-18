COMPILATION RESULT

```bash
Generating typings for: 19 artifacts in dir: typechain-types for target: ethers-v6
Successfully generated 34 typings!
Compiled 9 Solidity files successfully (evm target: cancun).
azeezabidoyemac@Azeezs-MacBook-Air cofhe-piggy-bank %
```

DEPLOYMENT RESULT

```bash
> hardhat deploy-piggy-bank --network eth-sepolia

Deploying PiggyBank to eth-sepolia...
Deploying with account: 0xCD30EA918A09FbdCB7421f5227d5eEB97fBBC25c
PiggyBank deployed to: 0xFcF11aFF1C5152220a43b3bBE2f002075A36d39C
Deployment saved to /Users/azeezabidoyemac/Desktop/projects/web3/fhenix/cofhe-piggy-bank/deployments/eth-sepolia.json

```

DEPOSIT RESULT

```bash
Using PiggyBank at 0xFcF11aFF1C5152220a43b3bBE2f002075A36d39C on eth-sepolia
Depositing from account: 0xCD30EA918A09FbdCB7421f5227d5eEB97fBBC25c
Encrypting deposit amount: 500
Submitting deposit...
Transaction hash: 0x7628ff86c844d4de90bfbf19f481f6830d78df341a0e3cc84ba8391943304d40
Your new encrypted balance (decrypted for view): 500
```

AFTER DEPOSIT BALANCE CHECK

```bash
Using PiggyBank at 0xFcF11aFF1C5152220a43b3bBE2f002075A36d39C on eth-sepolia
Checking balance for account: 0xCD30EA918A09FbdCB7421f5227d5eEB97fBBC25c
Encrypted balance handle: 0x35ccb83b458aa0a4e051aa2ea332ca267fc4a3a1993efc3109f1014b923d0500
Decrypting balance off-chain with your wallet permit...
Your current balance is: 500
```

WITHDRAW RESULT

```bash
Using PiggyBank at 0xFcF11aFF1C5152220a43b3bBE2f002075A36d39C on eth-sepolia
Withdrawing from account: 0xCD30EA918A09FbdCB7421f5227d5eEB97fBBC25c
Encrypting withdrawal amount: 300
Submitting withdrawal...
Transaction hash: 0x19d6abe137cac1cfa9c46496b5c098f33188d8362304f38820e6ad40bfb24ce3
Your new encrypted balance (decrypted for view): 200
```

WITHDRAW BALANCE CHECK

```bash
Using PiggyBank at 0xFcF11aFF1C5152220a43b3bBE2f002075A36d39C on eth-sepolia
Checking balance for account: 0xCD30EA918A09FbdCB7421f5227d5eEB97fBBC25c
Encrypted balance handle: 0x224b32f39e89d6dce1b343adfb25bfd1de520fa961cba7c46fb99833f6ce0500
Decrypting balance off-chain with your wallet permit...
Your current balance is: 200
```
