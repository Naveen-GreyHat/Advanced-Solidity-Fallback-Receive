// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "forge-std/Script.sol";
import "../src/FallbackDemo.sol";

/**
 * @title DeployFallbackDemo
 * @dev Deployment script for FallbackDemo contract with verification support
 */
contract DeployFallbackDemo is Script {
    function run() external returns (FallbackDemo) {
        // Get private key from environment or use default anvil key
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        
        console.log("Deployer address: %s", vm.addr(deployerPrivateKey));
        console.log("Deployer balance: %s ETH", vm.addr(deployerPrivateKey).balance / 1e18);
        
        vm.startBroadcast(deployerPrivateKey);
        
        FallbackDemo fallbackDemo = new FallbackDemo();
        
        vm.stopBroadcast();
        
        console.log("========================================");
        console.log("FallbackDemo successfully deployed!");
        console.log("Contract address: %s", address(fallbackDemo));
        console.log("Transaction hash: %s", txHash);
        console.log("Block number: %s", block.number);
        console.log("Gas used: %s", gasUsed);
        console.log("========================================");
        
        // Save deployment information
        string memory deploymentInfo = string(abi.encodePacked(
            "DEPLOYMENT_INFO\n",
            "================\n",
            "Contract: FallbackDemo\n",
            "Address: ", vm.toString(address(fallbackDemo)), "\n",
            "Deployer: ", vm.toString(vm.addr(deployerPrivateKey)), "\n",
            "Network: ", vm.toString(block.chainid), "\n",
            "Timestamp: ", vm.toString(block.timestamp), "\n",
            "Transaction: ", txHash, "\n"
        ));
        
        vm.writeFile("deployments/latest.txt", deploymentInfo);
        
        return fallbackDemo;
    }
    
    // Optional: Deploy with constructor parameters
    function deployWithConfig() external returns (FallbackDemo) {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        vm.startBroadcast(deployerPrivateKey);
        
        FallbackDemo fallbackDemo = new FallbackDemo();
        
        vm.stopBroadcast();
        return fallbackDemo;
    }
}
