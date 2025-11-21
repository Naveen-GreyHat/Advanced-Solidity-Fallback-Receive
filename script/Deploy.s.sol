// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "forge-std/Script.sol";
import "../src/FallbackDemo.sol";

contract DeployFallbackDemo is Script {
    function run() external returns (FallbackDemo) {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");

        vm.startBroadcast(deployerPrivateKey);

        FallbackDemo fallbackDemo = new FallbackDemo();

        vm.stopBroadcast();

        console.log("========================================");
        console.log("FallbackDemo successfully deployed!");
        console.log("Contract address: %s", address(fallbackDemo));
        console.log("Deployer address: %s", vm.addr(deployerPrivateKey));
        console.log("Block number: %s", block.number);
        console.log("========================================");

        // Save deployment info
        string memory deploymentInfo = string(
            abi.encodePacked(
                "DEPLOYMENT_INFO\n",
                "================\n",
                "Contract: FallbackDemo\n",
                "Address: ", vm.toString(address(fallbackDemo)), "\n",
                "Deployer: ", vm.toString(vm.addr(deployerPrivateKey)), "\n",
                "Network: ", vm.toString(block.chainid), "\n",
                "Timestamp: ", vm.toString(block.timestamp), "\n"
            )
        );

        vm.writeFile("deployments/latest.txt", deploymentInfo);

        return fallbackDemo;
    }
}
