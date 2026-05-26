# The Private Piggy Bank: A Beginner's Guide to Confidential Smart Contracts with CoFHE

---

## Before We Begin: What Problem Are We Solving?

Imagine you have a regular piggy bank sitting on your desk. You know how much money is inside. Nobody else does — because they cannot see through the ceramic.

Now imagine putting that piggy bank on a giant public billboard in the middle of a city. Suddenly, everyone walking past can see exactly how much you have saved. That is exactly what happens when you store financial data on a public blockchain like Ethereum. Every single number — every deposit, every balance, every transaction — is visible to anyone in the world, forever.

This is not just an inconvenience. It is a real problem for real people:

- A business cannot hide its revenue from competitors
- A person cannot shield their savings from bad actors
- A protocol cannot run fair auctions without participants gaming the system

For years, blockchain developers worked around this by keeping money off-chain or using complicated workarounds. But none of those solutions felt natural. They all came with tradeoffs.

**FHE changes that completely.**

---

## What Is FHE and Why Does It Matter?

FHE stands for **Fully Homomorphic Encryption**. That is a big phrase, so let's break it down with a simple story.

Picture a locked glass box. You put a number inside and lock it. You hand the box to a stranger. The stranger can do math on the number inside — add to it, subtract from it, compare it — all **without ever opening the box**. When you finally unlock it, the result of all that math is sitting there, correct, and the stranger never learned what the original number was.

That is FHE. It is a type of encryption that lets computers perform calculations on data **while the data is still encrypted**. The computer never sees the actual value. It only works with the scrambled, locked version.

This makes something previously impossible now completely possible: **a smart contract that does math on private data without ever knowing what that data is.**

---

## What Is Fhenix CoFHE?

Fhenix built a system called **CoFHE** (Co-processor for Fully Homomorphic Encryption). Think of it as a powerful behind-the-scenes assistant that handles all the heavy FHE operations for your smart contract.

When your smart contract needs to add two encrypted numbers, it does not do it alone. It asks the CoFHE network to perform the computation. The CoFHE network does the work, returns the encrypted result, and nobody — not the network, not the blockchain, not any observer — ever sees the actual numbers involved.

This means you can write smart contracts that handle private balances, private votes, private bids, or any kind of private data, and it all runs on the public Ethereum blockchain without exposing anything.

---

## What Is the PiggyBank Contract?

The PiggyBank contract is a savings account that lives on the blockchain. Each user can:

- **Deposit** an amount into their personal piggy bank
- **Withdraw** an amount from their piggy bank
- **Check their balance** — privately, only they can read it

What makes it special: every single number involved — the deposit amount, the withdrawal amount, the balance — is **always encrypted on-chain**. Even the miners processing the transactions, the validators running the network, and anyone staring at the blockchain data cannot tell how much money you have or how much you moved.

Only you, using your private wallet key, can decrypt and read your own balance.

Let's walk through the entire contract, line by line.

---

## The Full Contract, Explained Line by Line

```javascript
// SPDX-License-Identifier: UNLICENSED
```

This is a legal label. It tells anyone reading the code what the license is. `UNLICENSED` means the author has not granted others the right to reuse this code freely. Every Solidity file starts with one of these.

---

```javascript
pragma solidity ^0.8.25;
```

This tells the Solidity compiler which version of the Solidity language to use when turning this code into something the blockchain can run. Think of it like saying "this recipe was written for a specific oven model — please use that model." The `^` means "this version or anything newer that is still compatible."

---

```javascript
import "@fhenixprotocol/cofhe-contracts/FHE.sol";
```

This line brings in Fhenix's FHE toolkit. It is like importing a library of special tools. Without this line, the contract would have no idea what encrypted numbers are or how to do math on them. Everything prefixed with `FHE.` in the rest of the contract comes from this import.

---

```javascript
contract PiggyBank {
```

This declares the smart contract itself. The word `contract` in Solidity is like the word `class` in other programming languages — it is a container that holds all the data and functions that belong together. Everything between the opening `{` and the closing `}` at the very bottom is part of the PiggyBank.

---

### The Storage: Where Data Lives

```javascript
mapping(address => euint64) private balances;
```

This is where every user's balance is stored. Let's unpack it:

- A `mapping` is like a dictionary or a lookup table. You give it a key and it gives you a value. Here, the key is a wallet address and the value is a balance.
- `address` is a wallet address — the unique identifier for every user on Ethereum, like an account number.
- `euint64` is the encrypted version of a 64-bit integer. A regular `uint64` would be a plain number visible to everyone. The `e` prefix means it is encrypted — it is a locked version of the number that only FHE operations can work with.
- `private` means this storage slot cannot be read by other contracts. However, note that `private` on a blockchain does **not** mean the raw data is hidden from people inspecting the blockchain's storage — it would just look like meaningless scrambled data. In this case, it is genuinely private because the number is encrypted by FHE before it is stored.

So this line creates a lookup table where: `wallet address → encrypted balance`.

---

```javascript
mapping(address => bool) private initialized;
```

This is a simple yes/no tracker. It records whether a user has ever interacted with the contract before. `bool` means it is either `true` or `false`. 

This exists because FHE math requires a valid encrypted number to start with. You cannot add something to nothing — you need an encrypted zero as a starting point. This flag keeps track of whether that starting point has been created for each user yet.

---

### Function 1: `_ensureInitialized` — Setting Up a New User's Account

```javascript
function _ensureInitialized() internal {
```

This is a helper function. The underscore at the start is a naming convention that signals to other developers that this is an internal utility — not meant to be called directly from outside the contract. `internal` confirms that: only this contract itself can call this function.

---

```javascript
    if (!initialized[msg.sender]) {
```

`msg.sender` is automatically filled in by the blockchain. It is the wallet address of whoever is currently calling the contract. The `!` means "not." So this reads as: "If this user has NOT been initialized yet, do the following."

---

```javascript
        balances[msg.sender] = FHE.asEuint64(0);
```

This creates an encrypted zero and stores it as the user's starting balance. `FHE.asEuint64(0)` takes the plain number zero and converts it into an encrypted form — a locked, scrambled representation of zero. This is the blank canvas that all future FHE math will build upon.

---

```javascript
        FHE.allowThis(balances[msg.sender]);
```

Encrypted numbers in CoFHE have a permission system. Just because a number is stored in this contract does not automatically mean the contract can use it for further calculations. This line gives the PiggyBank contract itself permission to work with this encrypted balance in future operations. Without this, the very next deposit would fail because the contract would not be allowed to touch the balance it just created.

---

```javascript
        FHE.allow(balances[msg.sender], msg.sender);
```

This gives the **user** permission to decrypt and read their own balance. Without this line, even the owner of the money would not be able to see how much they have. This is what makes it possible for you to run `check-balance` and actually see your number.

---

```javascript
        initialized[msg.sender] = true;
    }
}
```

Mark this user as set up. Next time they call `deposit` or `withdraw`, the `if` check at the top will skip all of this because `initialized[msg.sender]` will already be `true`.

---

### Function 2: `deposit` — Putting Money In

```javascript
function deposit(InEuint64 memory encryptedAmount) public {
```

This is the deposit function. Let's look at the input:

- `InEuint64` is a special type that represents an encrypted number coming **in from outside the contract** — from the user's wallet, via the CoFHE SDK. When you ran `pnpm eth-sepolia:deposit -- --amount 500`, the SDK encrypted your 500 into this type before sending it to the contract.
- `memory` means this data is temporarily held in memory while the function runs, not permanently stored on the blockchain in this raw form.
- `public` means anyone — any wallet address on the internet — is allowed to call this function.

---

```javascript
    _ensureInitialized();
```

Before doing anything else, make sure the user has an encrypted zero balance set up. If they are a first-time user, this creates it. If they have deposited before, this does nothing.

---

```javascript
    euint64 amount = FHE.asEuint64(encryptedAmount);
```

The incoming encrypted amount (`InEuint64`) needs to be converted into the internal encrypted format (`euint64`) that FHE operations understand. Think of it like converting from one encrypted format to another — verifying the data is valid and registering it with the CoFHE system so it can be used in calculations.

---

```javascript
    balances[msg.sender] = FHE.add(balances[msg.sender], amount);
```

This is the heart of the deposit. `FHE.add` adds two encrypted numbers together and returns an encrypted result. The contract never knows the actual numbers. It just asks CoFHE: "add these two locked boxes together and give me a new locked box with the result." The new box replaces the old balance. The plain number 500 never appears anywhere on the blockchain.

---

```javascript
    FHE.allowThis(balances[msg.sender]);
    FHE.allow(balances[msg.sender], msg.sender);
}
```

After updating the balance, permissions must be re-applied to the new encrypted value. Every time an FHE operation produces a new encrypted result, that result is a brand new locked box. The old permissions do not carry over automatically. So the contract re-grants itself and the user access to this newly produced balance — exactly like it did during initialization.

---

### Function 3: `withdraw` — Taking Money Out

```javascript
function withdraw(InEuint64 memory encryptedAmount) public {
    _ensureInitialized();
    euint64 amount = FHE.asEuint64(encryptedAmount);
```

The opening lines are identical to `deposit`. Same idea: accept an encrypted amount from outside, make sure the user is set up, convert the amount into the internal format.

---

```javascript
    ebool hasSufficient = FHE.gte(balances[msg.sender], amount);
```

This line asks a question: "Is the current balance greater than or equal to the withdrawal amount?" But it asks that question **without revealing either number**.

- `FHE.gte` stands for "greater than or equal to." It compares two encrypted numbers and returns an encrypted boolean — a `ebool`. An `ebool` is an encrypted yes/no answer. Neither the contract nor any observer knows whether the answer is yes or no. It is a locked answer inside a locked box.

This is remarkable. Normally, to check if you have enough money, a system would have to look at your balance. Here, the system performs the check without ever seeing the balance.

---

```javascript
    euint64 newBalance = FHE.select(
        hasSufficient,
        FHE.sub(balances[msg.sender], amount),
        balances[msg.sender]
    );
```

This is the most clever part of the entire contract. `FHE.select` is like an encrypted if/else statement. It takes three arguments:

1. An encrypted condition (`hasSufficient` — the yes/no result from above)
2. The value to use **if the condition is yes** — `FHE.sub(balances[msg.sender], amount)`, which is the balance minus the withdrawal
3. The value to use **if the condition is no** — `balances[msg.sender]`, the unchanged balance

`FHE.select` picks one of the two options based on the encrypted condition — all while everything remains locked. The contract does not know which branch was taken. A blockchain observer does not know which branch was taken. Nobody knows whether the withdrawal actually went through or was silently rejected due to insufficient funds.

This is intentional. If the contract said "error: insufficient funds," that itself would reveal information — it would tell the world that your balance is less than the amount you tried to withdraw. FHE prevents even that leak.

---

```javascript
    balances[msg.sender] = newBalance;
    FHE.allowThis(balances[msg.sender]);
    FHE.allow(balances[msg.sender], msg.sender);
}
```

Store the new balance (whatever it ended up being — either reduced or unchanged) and re-apply permissions to the new encrypted value. Same pattern as in `deposit`.

---

### Function 4: `getBalance` — Reading Your Encrypted Balance

```javascript
function getBalance() public view returns (euint64) {
    return balances[msg.sender];
}
```

This returns your encrypted balance. A few things to note:

- `view` means this function does not change anything on the blockchain. It only reads. Because of this, it costs no gas to call.
- It returns `euint64` — the encrypted version of the number. If you look at this return value directly, you will see a large scrambled number, not your actual balance.
- The actual decryption happens off-chain, in your own machine, using your wallet's private key and the CoFHE SDK. That is what the `check-balance` command does — it calls this function to get the encrypted handle, then decrypts it locally.

This separation is important: the encrypted value travels through the public blockchain, but the decryption only happens on your private machine. Nobody else can perform that decryption because they do not have your private key.

---

### Function 5: `allowBalancePublicly` — Step 1 of On-Chain Decryption

```javascript
function allowBalancePublicly() public {
    FHE.allowPublic(balances[msg.sender]);
}
```

This function is the first step in a three-step process for revealing your balance **on-chain** — meaning the decrypted number is written back to the blockchain where anyone can see it.

Why would you want this? Imagine a lending protocol that needs to verify you have at least a certain balance before giving you a loan. The lender cannot run your private decryption for you. You need a way to prove your balance on-chain in a trustworthy way.

This function tells CoFHE's Threshold Network: "I am giving you permission to decrypt my balance." The Threshold Network is a decentralized group of computers that collectively perform sensitive operations like this — no single computer in the group can do it alone, which prevents any one party from seeing your data.

---

### Function 6: `revealBalance` — Step 3 of On-Chain Decryption

```javascript
function revealBalance(uint64 plaintext, bytes memory signature) public {
    FHE.publishDecryptResult(balances[msg.sender], plaintext, signature);
}
```

After the Threshold Network decrypts the balance (Step 2, which happens automatically off-chain), it produces two things:

1. The **plaintext** — the actual number, in the open
2. A **signature** — a cryptographic stamp of approval proving the Threshold Network computed this result honestly and did not make it up

This function takes both and publishes them on-chain. The signature is the key part — it means you cannot submit a fake number. Only the legitimate result, produced by the real Threshold Network, will be accepted.

---

### Function 7: `getDecryptedBalance` — Reading the On-Chain Result

```javascript
function getDecryptedBalance() external view returns (uint256) {
    (uint256 value, bool decrypted) = FHE.getDecryptResultSafe(balances[msg.sender]);
    if (!decrypted) revert("Balance is not ready");
    return value;
}
```

This is the final reading step. `external` means only wallets and other contracts outside of PiggyBank can call this — not PiggyBank itself.

`FHE.getDecryptResultSafe` checks whether the on-chain decryption result exists yet. It returns two values:
- `value` — the decrypted number (if it exists)
- `decrypted` — a true/false flag indicating whether the decryption has been completed

If someone calls `getDecryptedBalance` before going through the full three-step process, the function immediately stops and returns the message "Balance is not ready." This prevents people from accidentally reading a default zero and thinking their balance is empty.

---

## How All the Pieces Fit Together

Here is the full journey of a deposit of 500, from your keyboard to the blockchain:

1. You run `pnpm eth-sepolia:deposit -- --amount 500`
2. The CoFHE SDK on your machine encrypts the number 500 into a locked, scrambled blob
3. The encrypted blob is sent to the PiggyBank contract's `deposit` function
4. The contract calls `FHE.add` to add the encrypted 500 to your encrypted current balance
5. The CoFHE network performs the addition on the encrypted values — it never sees 500, it only sees locked data
6. A new encrypted result (the new balance) is returned and stored
7. When you later run `check-balance`, the contract returns the encrypted balance to your machine
8. Your machine uses your private wallet key to decrypt it locally — you see your balance, nobody else does

At no point does the number 500 appear anywhere on the public blockchain.

---

## Real-World Use Cases This Contract Unlocks

**Private Savings Accounts** — Exactly what this contract is. People can save money on-chain without revealing their wealth to the world.

**Confidential Payroll** — A company could pay employees through smart contracts without every salary being visible to colleagues and competitors.

**Sealed Auction Bids** — An auction where nobody can see what others have bid until the auction closes, preventing last-second sniping.

**Private Lending** — Borrow against a balance without revealing how much collateral you have, protecting you from targeted attacks.

**Healthcare Data** — Store sensitive health records on-chain, allowing computations (like insurance eligibility checks) without revealing the underlying medical data.

**Confidential Voting** — Run on-chain elections where votes are tallied correctly but no single vote is ever publicly linked to a voter.

---

## Embrace the Future of Onchain Privacy

We are at the beginning of a new chapter in blockchain development. For years, developers accepted a painful tradeoff: either use a blockchain (transparent, trustless, permanent) or keep your data private (off-chain, centralized, trust-dependent). You could not have both.

FHE breaks that tradeoff. You can now have a public, trustless, censorship-resistant blockchain and keep your users' data genuinely private at the same time. Not hidden behind a terms-of-service agreement. Not protected by a promise from a company. Mathematically private, enforced by cryptography.

Fhenix CoFHE makes this available today — not as a research experiment, not as a future roadmap item — but as a working system you can build on right now, on Ethereum testnets, with familiar Solidity code.

The barrier to entry is low. If you know how to write a regular Solidity contract, you already know 90% of what you need to write a confidential one. You replace `uint64` with `euint64`. You use `FHE.add` instead of `+`. You use `FHE.select` instead of `if/else`. The concepts translate directly.

What you get in return is something no regular smart contract can offer: **the ability to build financial applications that respect the privacy of the people who use them.**

Your users deserve applications that protect their data. Blockchain deserves to grow beyond the limitations of full public transparency. And you, as a developer, have the tools to build that future right now.

---

## Get Started with Fhenix CoFHE

- **Documentation:** [docs.fhenix.io](https://docs.fhenix.io)
- **CoFHE SDK on npm:** `npm install @cofhe/sdk`
- **Contracts library:** `npm install @fhenixprotocol/cofhe-contracts`
- **Hardhat Plugin:** `npm install @cofhe/hardhat-plugin`
- **GitHub:** [github.com/FhenixProtocol](https://github.com/FhenixProtocol)
- **Discord Community:** Join the Fhenix Discord to ask questions, share what you build, and connect with other developers working on confidential smart contracts

---

*This tutorial was written based on a working PiggyBank contract deployed on Ethereum Sepolia testnet using CoFHE. Every concept described here reflects real, running code — not theory.*
