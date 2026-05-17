// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.25;

import "@fhenixprotocol/cofhe-contracts/FHE.sol";

contract PiggyBank {
    // Each user's balance is stored as an encrypted 64-bit integer.
    // Nobody onchain can read the plaintext value — only the owner,
    // using their private key off-chain, can decrypt it.
    mapping(address => euint64) private balances;
    mapping(address => bool) private initialized;

    // Creates an encrypted zero balance for a first-time user so subsequent
    // FHE operations have a valid ciphertext to work on.
    function _ensureInitialized() internal {
        if (!initialized[msg.sender]) {
            balances[msg.sender] = FHE.asEuint64(0);
            FHE.allowThis(balances[msg.sender]);
            FHE.allow(balances[msg.sender], msg.sender);
            initialized[msg.sender] = true;
        }
    }

    // Accepts an encrypted deposit amount and adds it to the caller's
    // encrypted balance. The amount never travels as plaintext.
    function deposit(InEuint64 memory encryptedAmount) public {
        _ensureInitialized();
        euint64 amount = FHE.asEuint64(encryptedAmount);
        balances[msg.sender] = FHE.add(balances[msg.sender], amount);
        FHE.allowThis(balances[msg.sender]);
        FHE.allow(balances[msg.sender], msg.sender);
    }

    // Accepts an encrypted withdrawal amount. Uses FHE.select so that
    // the subtraction only takes effect when the balance is sufficient —
    // all without revealing either value to anyone onchain.
    function withdraw(InEuint64 memory encryptedAmount) public {
        _ensureInitialized();
        euint64 amount = FHE.asEuint64(encryptedAmount);
        ebool hasSufficient = FHE.gte(balances[msg.sender], amount);
        euint64 newBalance = FHE.select(
            hasSufficient,
            FHE.sub(balances[msg.sender], amount),
            balances[msg.sender]
        );
        balances[msg.sender] = newBalance;
        FHE.allowThis(balances[msg.sender]);
        FHE.allow(balances[msg.sender], msg.sender);
    }

    // Returns the encrypted balance handle for the caller.
    // The returned value is a ciphertext reference, not a plaintext number.
    // Decrypt it off-chain using the CoFHE SDK with your wallet key.
    function getBalance() public view returns (euint64) {
        return balances[msg.sender];
    }

    // Step 1 of 3 in the on-chain decryption flow.
    // Grants the Threshold Network permission to decrypt the caller's balance
    // so a signed plaintext result can be submitted back on-chain.
    function allowBalancePublicly() public {
        FHE.allowPublic(balances[msg.sender]);
    }

    // Step 3 of 3 in the on-chain decryption flow.
    // Submits the Threshold Network's plaintext result and signature on-chain.
    // The signature proves the plaintext was produced honestly.
    function revealBalance(uint64 plaintext, bytes memory signature) public {
        FHE.publishDecryptResult(balances[msg.sender], plaintext, signature);
    }

    // Reads the on-chain decryption result after the 3-step flow is complete.
    // Reverts if revealBalance has not been called yet.
    function getDecryptedBalance() external view returns (uint256) {
        (uint256 value, bool decrypted) = FHE.getDecryptResultSafe(balances[msg.sender]);
        if (!decrypted) revert("Balance is not ready");
        return value;
    }
}
