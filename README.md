# 🚀 FallbackDemo — Advanced Solidity Fallback/Receive Project

This project demonstrates the difference between **receive()** and **fallback()** functions in Solidity using:

- ✔ Foundry  
- ✔ Anvil local blockchain  
- ✔ Ethers.js  
- ✔ Fully interactive Node.js CLI  
- ✔ Contract deployment + event logging  
- ✔ Contribution & withdrawal tracking  

Perfect for beginners + advanced Solidity learners.

---

# 📦 Project Structure

```

FallbackDemo/
├── src/FallbackDemo.sol        # Main Solidity contract
├── test/FallbackDemo.t.sol     # Full test suite
├── script/Deploy.s.sol         # Deployment script
├── cli.cjs                     # Interactive CLI tool
├── deployments/                # Deployment logs
├── foundry.toml                # Foundry config
└── package.json                # Node.js config

````

---

# 🛠 Requirements

Before running, install:

### ✔ Node.js (v18+ or v20 recommended)  
### ✔ Foundry (forge + anvil)  
Install Foundry:

```bash
curl -L https://foundry.paradigm.xyz | bash
foundryup
````

---

# 🚀 Setup & Installation

### 1️⃣ Clone or create project

```bash
cd FallbackDemo
```

### 2️⃣ Install Node dependencies

```bash
npm install
```

### 3️⃣ Install Foundry dependencies

```bash
forge install
```

### 4️⃣ Compile the contract

```bash
forge compile
```

If compile successful → you’re ready.

---

# 🔥 Running the Project

## 🟢 Step 1 — Start Local Blockchain (Anvil)

Open Terminal 1:

```bash
npm run anvil
```

This starts a fresh Ethereum chain on:

```
RPC URL: http://127.0.0.1:8545
Chain ID: 31337
Funding: 10 wallets with 10,000 ETH each
```

---

## 🟣 Step 2 — Run the CLI (Interactive Console)

Open Terminal 2:

```bash
npm run cli
```

If everything is OK, you will see:

```
 _____     _ _ _                _    ____
 |  ___|_ _| | | |__   __ _  ___| | _|  _ \  ___
 | |_ / _` | | | '_ \ / _` |/ __| |/ / | | |/ _ \
 |  _| (_| | | | |_) | (_| | (__|   <| |_| |  __/
 |_|  \__,_|_|_|_.__/ \__,_|\___|_|\_\____/ \___|

=== FallbackDemo CLI ===
Network: 31337
Wallet: 0xf39F...
Balance: 10000 ETH
```

Now choose options:

```
> Deploy Contract
  Load Contract
  Send Ether (receive())
  Send Data (fallback())
  Check Balance
  View Stats
  Withdraw
```

---

# 🎮 CLI Features

### ✔ Deploy Contract

Deploys a new instance of the Solidity contract.

### ✔ Load Contract

Load an existing contract using an address.

### ✔ Send Ether (Triggers receive())

Sends ETH without data → activates receive().

### ✔ Send Data (Triggers fallback())

Sends ETH with extra data → activates fallback().

### ✔ Check Balance

Shows the contract’s current ETH balance.

### ✔ View Stats

Shows:

* Total received
* Total withdrawn
* Your contributions
* Current balance
* Contract owner

### ✔ Withdraw (Owner Only)

Withdraw full or partial balance.

---

# 🧪 Running Tests

### Run all tests:

```bash
forge test
```

### With detailed logs:

```bash
forge test -vvv
```

### With gas report:

```bash
forge test --gas-report
```

### With coverage:

```bash
forge coverage
```

---

# 🌐 Local Deployment With Foundry (Optional)

```bash
forge script script/Deploy.s.sol:DeployFallbackDemo \
  --rpc-url http://localhost:8545 \
  --broadcast \
  -vvv
```

---

# 🛑 Common Issues & Fixes

### ❌ Error: require() not allowed

Use `.cjs` extension for CLI (already done).

### ❌ Anvil not running

Solution:

```
npm run anvil
```

### ❌ chalk error (ESM only)

Use this version:

```
npm install chalk@4.1.2
```

### ❌ Contract not found

Compile first:

```
forge compile
```

---

# 📝 Summary

You now have a professional Ethereum development environment:

✔ Smart contract
✔ Full Foundry test suite
✔ Deployment scripts
✔ Interactive CLI
✔ Fallback vs Receive test cases
✔ Wallet-based actions
✔ Event-driven architecture

---

# 📄 License

MIT License

---

# 🙌 Credits

Created with ❤️ using Foundry, Ethers.js, and Node.js.

```
