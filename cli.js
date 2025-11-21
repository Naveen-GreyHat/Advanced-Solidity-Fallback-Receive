#!/usr/bin/env node

console.log("CLI STARTED (CJS)");

const path = require("path");
const fs = require("fs");
const figlet = require("figlet");
const chalk = require("chalk");
const inquirer = require("inquirer");
const ora = require("ora");
const gradient = require("gradient-string");
const { ethers } = require("ethers");

const RPC_URL = "http://localhost:8545";
const PRIVATE_KEY =
  "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80";

const CONTRACT_ARTIFACT_PATH = path.join(
  __dirname,
  "out/FallbackDemo.sol/FallbackDemo.json"
);

const DEPLOYMENT_FILE = path.join(__dirname, "deployments", "deployment.json");

class FallbackDemoCLI {
  constructor() {
    this.provider = new ethers.JsonRpcProvider(RPC_URL);
    this.wallet = new ethers.Wallet(PRIVATE_KEY, this.provider);
    this.contract = null;
    this.contractAddress = null;
    this.listenersAttached = false;
  }

  // 🔄 Helper: spinner wrapper
  async withSpinner(text, fn) {
    const spinner = ora({
      text,
      spinner: "dots",
    }).start();

    try {
      const result = await fn();
      spinner.succeed(text);
      return result;
    } catch (err) {
      spinner.fail(text + " ❌");
      console.log(chalk.red("Error: " + err.message));
      throw err;
    }
  }

  // 🎨 Banner + theme
  showBanner() {
    const logo = figlet.textSync("FallbackDemo", {
      horizontalLayout: "default",
    });
    console.log(gradient.pastel.multiline(logo));
    console.log(
      chalk.gray(
        "Advanced Solidity Fallback/Receive Demo • CLI powered by ethers.js\n"
      )
    );
  }

  async initialize() {
    await this.withSpinner("Connecting to Anvil...", async () => {
      const network = await this.provider.getNetwork();
      const balance = await this.provider.getBalance(this.wallet.address);

      console.log(chalk.blue("=== FallbackDemo CLI ==="));
      console.log(
        chalk.gray(`Network: ${network.name} (Chain ID: ${network.chainId})`)
      );
      console.log(chalk.gray(`Wallet: ${this.wallet.address}`));
      console.log(
        chalk.gray(`Balance: ${ethers.formatEther(balance)} ETH\n`)
      );
    });

    await this.autoLoadDeployment();
  }

  // 📂 Auto-detect last deployment
  async autoLoadDeployment() {
    if (!fs.existsSync(DEPLOYMENT_FILE)) {
      console.log(chalk.yellow("No previous deployment found.\n"));
      return;
    }

    try {
      const data = JSON.parse(fs.readFileSync(DEPLOYMENT_FILE, "utf8"));
      if (!data.address || !ethers.isAddress(data.address)) {
        console.log(chalk.yellow("Saved deployment is invalid.\n"));
        return;
      }

      const { auto } = await inquirer.prompt([
        {
          type: "confirm",
          name: "auto",
          message: `Found last deployment at ${chalk.cyan(
            data.address
          )}. Auto-load it?`,
          default: true,
        },
      ]);

      if (!auto) return;

      await this.loadContract(data.address, true);
    } catch (err) {
      console.log(chalk.red("Failed to read deployment file: " + err.message));
    }
  }

  loadArtifact() {
    if (!fs.existsSync(CONTRACT_ARTIFACT_PATH)) {
      throw new Error(
        "Artifact not found. Run `forge compile` before using CLI."
      );
    }

    return JSON.parse(fs.readFileSync(CONTRACT_ARTIFACT_PATH, "utf8"));
  }

  setContract(contract) {
    this.contract = contract;
    this.contractAddress = contract.target || contract.address;

    if (!this.listenersAttached) {
      this.attachEventListeners();
      this.listenersAttached = true;
    }
  }

  // 📡 Real-time contract event listeners
  attachEventListeners() {
    if (!this.contract) return;

    console.log(chalk.magenta("\nListening for contract events...\n"));

    this.contract.on("Received", (sender, amount, event) => {
      console.log(
        chalk.greenBright(
          `🔔 Received Event => from ${sender} • amount ${ethers.formatEther(
            amount
          )} ETH (block ${event.log.blockNumber})`
        )
      );
    });

    this.contract.on("FallbackCalled", (sender, amount, data, event) => {
      console.log(
        chalk.yellowBright(
          `🔔 FallbackCalled => from ${sender} • amount ${ethers.formatEther(
            amount
          )} ETH • data ${data} (block ${event.log.blockNumber})`
        )
      );
    });
  }

  async deployContract() {
    await this.withSpinner("Deploying FallbackDemo...", async () => {
      const artifact = this.loadArtifact();

      const factory = new ethers.ContractFactory(
        artifact.abi,
        artifact.bytecode,
        this.wallet
      );

      const contract = await factory.deploy();
      await contract.waitForDeployment();

      this.setContract(contract);

      const addr = await contract.getAddress();
      console.log(chalk.green(`\n✅ Contract deployed at: ${addr}\n`));

      fs.mkdirSync(path.dirname(DEPLOYMENT_FILE), { recursive: true });
      fs.writeFileSync(
        DEPLOYMENT_FILE,
        JSON.stringify(
          {
            address: addr,
            deployer: this.wallet.address,
            network: "anvil",
            timestamp: new Date().toISOString(),
          },
          null,
          2
        )
      );

      console.log(
        chalk.gray(`Deployment info saved to ${path.relative(
          __dirname,
          DEPLOYMENT_FILE
        )}\n`)
      );
    });
  }

  async loadContract(address, silent = false) {
    await this.withSpinner("Loading contract...", async () => {
      if (!ethers.isAddress(address)) {
        throw new Error("Invalid address");
      }

      const artifact = this.loadArtifact();
      const contract = new ethers.Contract(
        address,
        artifact.abi,
        this.wallet
      );

      await contract.getBalance(); // sanity check

      this.setContract(contract);

      if (!silent) {
        console.log(
          chalk.green(`\n✅ Contract loaded successfully at: ${address}\n`)
        );
      }
    });
  }

  async requireContract() {
    if (!this.contract) {
      console.log(
        chalk.red("No contract selected. Deploy or load one from the menu.\n")
      );
      return false;
    }
    return true;
  }

  async sendEther() {
    if (!(await this.requireContract())) return;

    const { amount } = await inquirer.prompt([
      {
        type: "input",
        name: "amount",
        message: "Enter amount of ETH to send (receive()):",
        default: "0.1",
        validate: (v) => (!isNaN(parseFloat(v)) && parseFloat(v) > 0) || "Invalid amount",
      },
    ]);

    await this.withSpinner(`Sending ${amount} ETH (receive)...`, async () => {
      const tx = await this.wallet.sendTransaction({
        to: this.contractAddress,
        value: ethers.parseEther(amount),
        data: "0x",
      });

      console.log(chalk.cyan(`Tx hash: ${tx.hash}`));
      await tx.wait();
      console.log(chalk.green("✅ receive() triggered and mined.\n"));
    });
  }

  async sendData() {
    if (!(await this.requireContract())) return;

    const answers = await inquirer.prompt([
      {
        type: "input",
        name: "amount",
        message: "Enter amount of ETH to send (fallback()):",
        default: "0.1",
        validate: (v) => (!isNaN(parseFloat(v)) && parseFloat(v) > 0) || "Invalid amount",
      },
      {
        type: "input",
        name: "data",
        message: "Hex data (0x...) to send:",
        default: "0x12345678",
        validate: (v) => v.startsWith("0x") || "Data must start with 0x",
      },
    ]);

    await this.withSpinner(
      `Sending ${answers.amount} ETH with data (fallback)...`,
      async () => {
        const tx = await this.wallet.sendTransaction({
          to: this.contractAddress,
          value: ethers.parseEther(answers.amount),
          data: answers.data,
        });

        console.log(chalk.cyan(`Tx hash: ${tx.hash}`));
        await tx.wait();
        console.log(chalk.green("✅ fallback() triggered and mined.\n"));
      }
    );
  }

  async checkBalance() {
    if (!(await this.requireContract())) return;

    await this.withSpinner("Fetching contract balance...", async () => {
      const balance = await this.contract.getBalance();
      console.log(
        chalk.blue(
          `\n💰 Contract Balance: ${ethers.formatEther(
            balance
          )} ETH (${balance} wei)\n`
        )
      );
    });
  }

  async checkStats() {
    if (!(await this.requireContract())) return;

    await this.withSpinner("Fetching stats...", async () => {
      const [received, withdrawn, currentBalance] =
        await this.contract.getStats();
      const myContribution = await this.contract.getContribution(
        this.wallet.address
      );
      const owner = await this.contract.owner();

      console.log(chalk.blue("\n📊 Contract Statistics"));
      console.log(
        chalk.green(`Total Received:   ${ethers.formatEther(received)} ETH`)
      );
      console.log(
        chalk.green(`Total Withdrawn:  ${ethers.formatEther(withdrawn)} ETH`)
      );
      console.log(
        chalk.green(`Current Balance:  ${ethers.formatEther(currentBalance)} ETH`)
      );
      console.log(
        chalk.yellow(
          `Your Contribution: ${ethers.formatEther(myContribution)} ETH`
        )
      );
      console.log(chalk.magenta(`Owner Address:   ${owner}`));
      console.log(
        chalk.gray(
          `You are ${
            owner.toLowerCase() === this.wallet.address.toLowerCase()
              ? "the owner ✅"
              : "NOT the owner ❌"
          }\n`
        )
      );
    });
  }

  async withdrawFunds() {
    if (!(await this.requireContract())) return;

    const owner = await this.contract.owner();
    if (owner.toLowerCase() !== this.wallet.address.toLowerCase()) {
      console.log(
        chalk.red("Only owner can withdraw funds from this contract.\n")
      );
      return;
    }

    const balance = await this.contract.getBalance();
    if (balance === 0n) {
      console.log(chalk.yellow("Contract balance is zero.\n"));
      return;
    }

    const { mode } = await inquirer.prompt([
      {
        type: "list",
        name: "mode",
        message: "Withdraw mode:",
        choices: [
          {
            name: `Withdraw ALL (${ethers.formatEther(balance)} ETH)`,
            value: "all",
          },
          { name: "Withdraw specific amount", value: "some" },
          { name: "Cancel", value: "cancel" },
        ],
      },
    ]);

    if (mode === "cancel") return;

    if (mode === "all") {
      await this.withSpinner("Withdrawing all funds...", async () => {
        const tx = await this.contract.withdrawAll();
        console.log(chalk.cyan(`Tx hash: ${tx.hash}`));
        await tx.wait();
        console.log(chalk.green("✅ All funds withdrawn.\n"));
      });
    } else {
      const { amount } = await inquirer.prompt([
        {
          type: "input",
          name: "amount",
          message: "Amount to withdraw (ETH):",
          validate: (v) => (!isNaN(parseFloat(v)) && parseFloat(v) > 0) || "Invalid amount",
        },
      ]);

      await this.withSpinner(
        `Withdrawing ${amount} ETH from contract...`,
        async () => {
          const tx = await this.contract.withdraw(ethers.parseEther(amount));
          console.log(chalk.cyan(`Tx hash: ${tx.hash}`));
          await tx.wait();
          console.log(chalk.green("✅ Funds withdrawn.\n"));
        }
      );
    }
  }

  // 🎛 Main interactive loop
  async showMenu() {
    await this.initialize();

    while (true) {
      const { action } = await inquirer.prompt([
        {
          type: "list",
          name: "action",
          message: "Choose an action:",
          choices: [
            { name: "🚀 Deploy new contract", value: "deploy" },
            { name: "📦 Load existing contract", value: "load" },
            { name: "💸 Send Ether (trigger receive())", value: "sendEther" },
            { name: "📡 Send Data (trigger fallback())", value: "sendData" },
            { name: "💰 Check contract balance", value: "checkBalance" },
            { name: "📊 View contract statistics", value: "checkStats" },
            { name: "🏦 Withdraw funds (owner only)", value: "withdraw" },
            new inquirer.Separator(),
            { name: "❌ Exit", value: "exit" },
          ],
        },
      ]);

      switch (action) {
        case "deploy":
          await this.deployContract();
          break;
        case "load": {
          const { address } = await inquirer.prompt([
            {
              type: "input",
              name: "address",
              message: "Enter contract address:",
            },
          ]);
          await this.loadContract(address);
          break;
        }
        case "sendEther":
          await this.sendEther();
          break;
        case "sendData":
          await this.sendData();
          break;
        case "checkBalance":
          await this.checkBalance();
          break;
        case "checkStats":
          await this.checkStats();
          break;
        case "withdraw":
          await this.withdrawFunds();
          break;
        case "exit":
          console.log(chalk.cyan("\nGoodbye! 👋\n"));
          process.exit(0);
      }

      console.log(chalk.gray("=".repeat(60) + "\n"));
    }
  }
}

// 🔽 Entry point
(async () => {
  console.clear();
  const cli = new FallbackDemoCLI();
  cli.showBanner();
  await cli.showMenu();
})();
