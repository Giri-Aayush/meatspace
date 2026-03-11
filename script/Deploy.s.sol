// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Script.sol";
import "../contracts/TaskEscrow.sol";

contract DeployTaskEscrow is Script {
    // USDC on Celo Sepolia testnet
    address constant USDC_CELO_SEPOLIA = 0x01C5C0122039549AD1493B8220cABEdD739BC44E;

    function run() external {
        uint256 deployerPrivateKey = vm.envUint("DEPLOYER_PRIVATE_KEY");
        address deployer = vm.addr(deployerPrivateKey);

        vm.startBroadcast(deployerPrivateKey);

        TaskEscrow escrow = new TaskEscrow(USDC_CELO_SEPOLIA, deployer);

        vm.stopBroadcast();

        console.log("TaskEscrow deployed to:", address(escrow));
        console.log("Deployer / platform wallet:", deployer);
        console.log("USDC address:", USDC_CELO_SEPOLIA);
    }
}
