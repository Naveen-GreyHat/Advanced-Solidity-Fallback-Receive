#!/usr/bin/env node

console.log("CLI STARTED (CJS)");

const path = require("path");
const fs = require("fs");
const figlet = require("figlet");
const chalk = require("chalk");
const inquirer = require("inquirer");
const { ethers } = require("ethers");

const RPC_URL = "http://localhost:8545";
const PRIVATE_KEY =
  "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80";

const CONTRACT_ARTIFACT_PATH = path.join(
  __dirname,
  "out/FallbackDemo.sol/FallbackDemo.json"
);

class FallbackDemoCLI {
  constructor() {
    this.provider = new ethers.JsonRpcProvider(RPC_URL);
    this.wallet = new ethers.Wallet(PRIVATE_KEY, this.provider);
    this.contract = null;
    this.contractAddress = null;
  }

  async initialize() {
    try {
      const network = await this.provider.getNetwork();
      const balance = await this.provider.getBalance(this.wallet.address);

      console.log(chalk.blue("=== FallbackDemo CLI ==="));
      console.log(
        chalk.gray(`Network: ${network.name} (ChainId: ${network.chainId})`)
      );
      console.log(chalk.gray(`Wallet: ${this.wallet.address}`));
      console.log(chalk.gray(`Balance: ${ethers.formatEther(balance)} ETH`));
      console.log("");
    } catch (e) {
      console.log(chalk.red("Error connecting to Anvil!"));
      process.exit(1);
    }
  }

  async deployContract() {
    try {
      console.log(chalk.yellow("Deploying contract..."));

      const artifact = JSON.parse(fs.readFileSync(CONTRACT_ARTIFACT_PATH));

      const factory = new ethers.ContractFactory(
        artifact.abi,
        artifact.bytecode,
        this.wallet
      );

      const contract = await factory.deploy();
      await contract.waitForDeployment();

      this.contract = contract;
      this.contractAddress = await contract.getAddress();

      console.log(chalk.green("Deployed at: " + this.contractAddress));

      fs.writeFileSync(
        "./deployments/deployment.json",
        JSON.stringify(
          {
            address: this.contractAddress,
            deployer: this.wallet.address,
            timestamp: Date.now(),
          },
          null,
          2
        )
      );
    } catch (e) {
      console.log(chalk.red("Deploy failed: " + e.message));
    }
  }

  async loadContract(address) {
    try {
      if (!ethers.isAddress(address)) {
        console.log(chalk.red("Invalid address"));
        return;
      }

      const artifact = JSON.parse(fs.readFileSync(CONTRACT_ARTIFACT_PATH));
      this.contract = new ethers.Contract(address, artifact.abi, this.wallet);
      this.contractAddress = address;

      await this.contract.getBalance();

      console.log(chalk.green("Contract loaded successfully!"));
    } catch (e) {
      console.log(chalk.red("Failed to load: " + e.message));
    }
  }

  async sendEther() {
    if (!this.contract) return console.log(chalk.red("Load contract first!"));

    const { amount } = await inquirer.prompt([
      {
        type: "input",
        name: "amount",
        message: "Amount in ETH:",
        default: "0.1",
      },
    ]);

    const wei = ethers.parseEther(amount);

    const tx = await this.wallet.sendTransaction({
      to: this.contractAddress,
      value: wei,
      data: "0x",
    });

    console.log(chalk.green("Sent! Hash: " + tx.hash));
  }

  async sendData() {
    if (!this.contract) return console.log(chalk.red("Load contract first!"));

    const { amount, data } = await inquirer.prompt([
      { type: "input", name: "amount", message: "Amount:", default: "0.1" },
      { type: "input", name: "data", message: "Hex data:", default: "0x1234" },
    ]);

    const wei = ethers.parseEther(amount);

    const tx = await this.wallet.sendTransaction({
      to: this.contractAddress,
      value: wei,
      data,
    });

    console.log(chalk.green("Sent! Hash: " + tx.hash));
  }

  async checkBalance() {
    if (!this.contract) return console.log(chalk.red("Load contract first!"));
    const bal = await this.contract.getBalance();
    console.log(chalk.blue("Contract Balance: " + ethers.formatEther(bal)));
  }

  async checkStats() {
    if (!this.contract) return console.log(chalk.red("Load contract first!"));

    const [r, w, b] = await this.contract.getStats();
    console.log(chalk.blue("Received: " + ethers.formatEther(r)));
    console.log(chalk.blue("Withdrawn: " + ethers.formatEther(w)));
    console.log(chalk.blue("Balance: " + ethers.formatEther(b)));
  }

  async withdrawFunds() {
    if (!this.contract) return console.log(chalk.red("Load contract first!"));

    const tx = await this.contract.withdrawAll();
    console.log(chalk.green("Withdrawn! Tx: " + tx.hash));
  }

  async showMenu() {
    await this.initialize();

    while (true) {
      const { choice } = await inquirer.prompt([
        {
          type: "list",
          name: "choice",
          message: "Select an action:",
          choices: [
            "Deploy Contract",
            "Load Contract",
            "Send Ether (receive())",
            "Send Data (fallback())",
            "Check Balance",
            "View Stats",
            "Withdraw",
            "Exit",
          ],
        },
      ]);

      if (choice === "Deploy Contract") await this.deployContract();
      if (choice === "Load Contract") {
        const { addr } = await inquirer.prompt([
          { type: "input", name: "addr", message: "Contract Address:" },
        ]);
        await this.loadContract(addr);
      }
      if (choice === "Send Ether (receive())") await this.sendEther();
      if (choice === "Send Data (fallback())") await this.sendData();
      if (choice === "Check Balance") await this.checkBalance();
      if (choice === "View Stats") await this.checkStats();
      if (choice === "Withdraw") await this.withdrawFunds();
      if (choice === "Exit") return console.log(chalk.blue("Bye!"));
    }
  }
}

(async () => {
  console.clear();
  console.log(figlet.textSync("FallbackDemo"));
  const cli = new FallbackDemoCLI();
  await cli.showMenu();
})();
