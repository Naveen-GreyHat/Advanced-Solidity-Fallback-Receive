#!/usr/bin/env node

import { ethers } from 'ethers';
import inquirer from 'inquirer';
import chalk from 'chalk';
import figlet from 'figlet';

// Configuration
const RPC_URL = 'http://localhost:8545';
const PRIVATE_KEY = '0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80';
const CONTRACT_ARTIFACT_PATH = './out/FallbackDemo.sol/FallbackDemo.json';

class FallbackDemoCLI {
    constructor() {
        this.provider = new ethers.JsonRpcProvider(RPC_URL);
        this.wallet = new ethers.Wallet(PRIVATE_KEY, this.provider);
        this.contract = null;
        this.contractAddress = null;
        this.isConnected = false;
    }

    async initialize() {
        try {
            const network = await this.provider.getNetwork();
            const balance = await this.provider.getBalance(this.wallet.address);
            
            console.log(chalk.blue('=== FallbackDemo CLI ==='));
            console.log(chalk.gray(`Network: ${network.name} (Chain ID: ${network.chainId})`));
            console.log(chalk.gray(`Wallet: ${this.wallet.address}`));
            console.log(chalk.gray(`Balance: ${ethers.formatEther(balance)} ETH`));
            console.log('');
            
            this.isConnected = true;
        } catch (error) {
            console.log(chalk.red('Error: Cannot connect to local network. Is Anvil running?'));
            console.log(chalk.gray('Run: anvil or npm run anvil'));
            process.exit(1);
        }
    }

    async deployContract() {
        try {
            console.log(chalk.yellow('Deploying FallbackDemo contract...'));
            
            const artifact = await import(CONTRACT_ARTIFACT_PATH, { assert: { type: 'json' } });
            const factory = new ethers.ContractFactory(artifact.default.abi, artifact.default.bytecode, this.wallet);
            
            const contract = await factory.deploy();
            await contract.waitForDeployment();
            
            this.contract = contract;
            this.contractAddress = await contract.getAddress();
            
            console.log(chalk.green('Contract deployed successfully!'));
            console.log(chalk.blue(`Address: ${this.contractAddress}`));
            console.log(chalk.blue(`Transaction: ${contract.deploymentTransaction().hash}`));
            
            // Save deployment info
            const deploymentInfo = {
                address: this.contractAddress,
                transactionHash: contract.deploymentTransaction().hash,
                deployer: this.wallet.address,
                timestamp: new Date().toISOString()
            };
            
            const fs = await import('fs');
            fs.writeFileSync('./deployments/deployment.json', JSON.stringify(deploymentInfo, null, 2));
            
        } catch (error) {
            console.log(chalk.red(`Deployment failed: ${error.message}`));
        }
    }

    async loadContract(address) {
        try {
            if (!ethers.isAddress(address)) {
                console.log(chalk.red('Invalid address format'));
                return;
            }

            const artifact = await import(CONTRACT_ARTIFACT_PATH, { assert: { type: 'json' } });
            this.contract = new ethers.Contract(address, artifact.default.abi, this.wallet);
            this.contractAddress = address;
            
            // Verify contract is accessible
            await this.contract.getBalance();
            
            console.log(chalk.green(`Contract loaded successfully from: ${address}`));
        } catch (error) {
            console.log(chalk.red(`Failed to load contract: ${error.message}`));
            this.contract = null;
            this.contractAddress = null;
        }
    }

    async sendEther() {
        if (!this.contract) {
            console.log(chalk.red('Please deploy or load a contract first!'));
            return;
        }

        try {
            const answers = await inquirer.prompt([
                {
                    type: 'input',
                    name: 'amount',
                    message: 'Enter amount of Ether to send:',
                    default: '0.1',
                    validate: (input) => {
                        const amount = parseFloat(input);
                        return !isNaN(amount) && amount > 0 ? true : 'Please enter a valid number';
                    }
                }
            ]);

            const amount = ethers.parseEther(answers.amount);
            console.log(chalk.yellow(`Sending ${answers.amount} ETH to trigger receive()...`));

            const tx = await this.wallet.sendTransaction({
                to: this.contractAddress,
                value: amount,
                data: '0x'
            });

            console.log(chalk.blue(`Transaction sent: ${tx.hash}`));
            const receipt = await tx.wait();
            console.log(chalk.green(`Transaction confirmed in block: ${receipt.blockNumber}`));
            console.log(chalk.green('receive() function triggered successfully!'));

        } catch (error) {
            console.log(chalk.red(`Failed to send Ether: ${error.message}`));
        }
    }

    async sendData() {
        if (!this.contract) {
            console.log(chalk.red('Please deploy or load a contract first!'));
            return;
        }

        try {
            const answers = await inquirer.prompt([
                {
                    type: 'input',
                    name: 'amount',
                    message: 'Enter amount of Ether to send:',
                    default: '0.1',
                    validate: (input) => {
                        const amount = parseFloat(input);
                        return !isNaN(amount) && amount > 0 ? true : 'Please enter a valid number';
                    }
                },
                {
                    type: 'input',
                    name: 'data',
                    message: 'Enter hex data to send:',
                    default: '0x12345678',
                    validate: (input) => {
                        return input.startsWith('0x') ? true : 'Data must start with 0x';
                    }
                }
            ]);

            const amount = ethers.parseEther(answers.amount);
            console.log(chalk.yellow(`Sending ${answers.amount} ETH with data to trigger fallback()...`));

            const tx = await this.wallet.sendTransaction({
                to: this.contractAddress,
                value: amount,
                data: answers.data
            });

            console.log(chalk.blue(`Transaction sent: ${tx.hash}`));
            const receipt = await tx.wait();
            console.log(chalk.green(`Transaction confirmed in block: ${receipt.blockNumber}`));
            console.log(chalk.green('fallback() function triggered successfully!'));

        } catch (error) {
            console.log(chalk.red(`Failed to send data: ${error.message}`));
        }
    }

    async checkBalance() {
        if (!this.contract) {
            console.log(chalk.red('Please deploy or load a contract first!'));
            return;
        }

        try {
            const balance = await this.contract.getBalance();
            const balanceEth = ethers.formatEther(balance);
            
            console.log(chalk.blue('=== Contract Balance ==='));
            console.log(chalk.green(`ETH: ${balanceEth}`));
            console.log(chalk.gray(`WEI: ${balance}`));

        } catch (error) {
            console.log(chalk.red(`Failed to check balance: ${error.message}`));
        }
    }

    async checkStats() {
        if (!this.contract) {
            console.log(chalk.red('Please deploy or load a contract first!'));
            return;
        }

        try {
            const [received, withdrawn, currentBalance] = await this.contract.getStats();
            const myContribution = await this.contract.getContribution(this.wallet.address);
            const owner = await this.contract.owner();
            
            console.log(chalk.blue('=== Contract Statistics ==='));
            console.log(chalk.green(`Total Received: ${ethers.formatEther(received)} ETH`));
            console.log(chalk.green(`Total Withdrawn: ${ethers.formatEther(withdrawn)} ETH`));
            console.log(chalk.green(`Current Balance: ${ethers.formatEther(currentBalance)} ETH`));
            console.log(chalk.green(`Your Contribution: ${ethers.formatEther(myContribution)} ETH`));
            console.log(chalk.green(`Contract Owner: ${owner}`));
            console.log(chalk.gray(`You are ${owner === this.wallet.address ? 'the owner' : 'not the owner'}`));

        } catch (error) {
            console.log(chalk.red(`Failed to get stats: ${error.message}`));
        }
    }

    async withdrawFunds() {
        if (!this.contract) {
            console.log(chalk.red('Please deploy or load a contract first!'));
            return;
        }

        try {
            const owner = await this.contract.owner();
            if (owner !== this.wallet.address) {
                console.log(chalk.red('Only contract owner can withdraw funds!'));
                return;
            }

            const balance = await this.contract.getBalance();
            if (balance === 0n) {
                console.log(chalk.yellow('Contract has no funds to withdraw'));
                return;
            }

            const answers = await inquirer.prompt([
                {
                    type: 'list',
                    name: 'action',
                    message: 'Withdraw options:',
                    choices: [
                        { name: `Withdraw all (${ethers.formatEther(balance)} ETH)`, value: 'all' },
                        { name: 'Withdraw specific amount', value: 'specific' }
                    ]
                }
            ]);

            if (answers.action === 'all') {
                console.log(chalk.yellow('Withdrawing all funds...'));
                const tx = await this.contract.withdrawAll();
                console.log(chalk.blue(`Transaction sent: ${tx.hash}`));
                await tx.wait();
                console.log(chalk.green('All funds withdrawn successfully!'));
            } else {
                const amountAnswer = await inquirer.prompt([
                    {
                        type: 'input',
                        name: 'amount',
                        message: 'Enter amount to withdraw (ETH):',
                        validate: (input) => {
                            const amount = parseFloat(input);
                            return !isNaN(amount) && amount > 0 ? true : 'Please enter a valid number';
                        }
                    }
                ]);
                
                const amount = ethers.parseEther(amountAnswer.amount);
                console.log(chalk.yellow(`Withdrawing ${amountAnswer.amount} ETH...`));
                const tx = await this.contract.withdraw(amount);
                console.log(chalk.blue(`Transaction sent: ${tx.hash}`));
                await tx.wait();
                console.log(chalk.green('Funds withdrawn successfully!'));
            }

        } catch (error) {
            console.log(chalk.red(`Withdrawal failed: ${error.message}`));
        }
    }

    async showMenu() {
        await this.initialize();

        while (true) {
            const { action } = await inquirer.prompt([
                {
                    type: 'list',
                    name: 'action',
                    message: 'Choose an action:',
                    choices: [
                        { name: 'Deploy new contract', value: 'deploy' },
                        { name: 'Load existing contract', value: 'load' },
                        { name: 'Send Ether (trigger receive())', value: 'sendEther' },
                        { name: 'Send Data (trigger fallback())', value: 'sendData' },
                        { name: 'Check contract balance', value: 'checkBalance' },
                        { name: 'View contract statistics', value: 'checkStats' },
                        { name: 'Withdraw funds (owner only)', value: 'withdraw' },
                        { name: 'Exit', value: 'exit' }
                    ]
                }
            ]);

            switch (action) {
                case 'deploy':
                    await this.deployContract();
                    break;
                case 'load':
                    const { address } = await inquirer.prompt([
                        {
                            type: 'input',
                            name: 'address',
                            message: 'Enter contract address:',
                            validate: (input) => ethers.isAddress(input) ? true : 'Invalid address format'
                        }
                    ]);
                    await this.loadContract(address);
                    break;
                case 'sendEther':
                    await this.sendEther();
                    break;
                case 'sendData':
                    await this.sendData();
                    break;
                case 'checkBalance':
                    await this.checkBalance();
                    break;
                case 'checkStats':
                    await this.checkStats();
                    break;
                case 'withdraw':
                    await this.withdrawFunds();
                    break;
                case 'exit':
                    console.log(chalk.blue('Goodbye!'));
                    return;
            }
            
            console.log('\n' + '='.repeat(60));
        }
    }
}

// Main execution
async function main() {
    try {
        console.clear();
        console.log(chalk.blue(figlet.textSync('FallbackDemo', { horizontalLayout: 'full' })));
        console.log(chalk.gray('Advanced Solidity Fallback/Receive Function Demo\n'));
        
        const cli = new FallbackDemoCLI();
        await cli.showMenu();
    } catch (error) {
        console.log(chalk.red(`Fatal error: ${error.message}`));
        process.exit(1);
    }
}

// Check if this is the main module
if (import.meta.url === `file://${process.argv[1]}`) {
    main();
}

export default FallbackDemoCLI;
