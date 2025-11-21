// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "forge-std/Test.sol";
import "../src/FallbackDemo.sol";

/**
 * @title FallbackDemoTest
 * @dev Comprehensive test contract for FallbackDemo
 */
contract FallbackDemoTest is Test {
    FallbackDemo public fallbackDemo;
    address public owner = address(0x111);
    address public user1 = address(0x222);
    address public user2 = address(0x333);
    
    event Received(address indexed sender, uint256 amount);
    event FallbackCalled(address indexed sender, uint256 amount, bytes data);
    event Withdrawn(address indexed recipient, uint256 amount);
    event OwnershipTransferred(address indexed previousOwner, address indexed newOwner);
    
    function setUp() public {
        vm.prank(owner);
        fallbackDemo = new FallbackDemo();
        
        vm.deal(user1, 10 ether);
        vm.deal(user2, 10 ether);
    }
    
    function testInitialState() public {
        assertEq(fallbackDemo.owner(), owner);
        assertEq(fallbackDemo.getBalance(), 0);
        assertEq(fallbackDemo.totalReceived(), 0);
        assertEq(fallbackDemo.totalWithdrawn(), 0);
    }
    
    function testReceiveFunction() public {
        vm.expectEmit(true, true, true, true);
        emit Received(user1, 1 ether);
        
        vm.prank(user1);
        (bool success, ) = address(fallbackDemo).call{value: 1 ether}("");
        require(success, "Call failed");
        
        assertEq(fallbackDemo.getBalance(), 1 ether);
        assertEq(fallbackDemo.totalReceived(), 1 ether);
        assertEq(fallbackDemo.getContribution(user1), 1 ether);
    }
    
    function testFallbackFunction() public {
        bytes memory testData = hex"1234";
        
        vm.expectEmit(true, true, true, true);
        emit FallbackCalled(user1, 1 ether, testData);
        
        vm.prank(user1);
        (bool success, ) = address(fallbackDemo).call{value: 1 ether}(testData);
        require(success, "Call failed");
        
        assertEq(fallbackDemo.getBalance(), 1 ether);
        assertEq(fallbackDemo.totalReceived(), 1 ether);
        assertEq(fallbackDemo.getContribution(user1), 1 ether);
    }
    
    function testMultipleContributors() public {
        // User1 sends via receive
        vm.prank(user1);
        (bool success1, ) = address(fallbackDemo).call{value: 1 ether}("");
        require(success1, "Call failed");
        
        // User2 sends via fallback
        bytes memory testData = hex"abcd";
        vm.prank(user2);
        (bool success2, ) = address(fallbackDemo).call{value: 2 ether}(testData);
        require(success2, "Call failed");
        
        assertEq(fallbackDemo.getBalance(), 3 ether);
        assertEq(fallbackDemo.totalReceived(), 3 ether);
        assertEq(fallbackDemo.getContribution(user1), 1 ether);
        assertEq(fallbackDemo.getContribution(user2), 2 ether);
    }
    
    function testWithdraw() public {
        // First send some Ether
        vm.prank(user1);
        (bool success, ) = address(fallbackDemo).call{value: 2 ether}("");
        require(success, "Call failed");
        
        uint256 initialOwnerBalance = owner.balance;
        
        vm.expectEmit(true, true, true, true);
        emit Withdrawn(owner, 1 ether);
        
        vm.prank(owner);
        fallbackDemo.withdraw(1 ether);
        
        assertEq(fallbackDemo.getBalance(), 1 ether);
        assertEq(fallbackDemo.totalWithdrawn(), 1 ether);
        assertEq(owner.balance, initialOwnerBalance + 1 ether);
    }
    
    function testWithdrawAll() public {
        vm.prank(user1);
        (bool success, ) = address(fallbackDemo).call{value: 3 ether}("");
        require(success, "Call failed");
        
        uint256 initialOwnerBalance = owner.balance;
        
        vm.expectEmit(true, true, true, true);
        emit Withdrawn(owner, 3 ether);
        
        vm.prank(owner);
        fallbackDemo.withdrawAll();
        
        assertEq(fallbackDemo.getBalance(), 0);
        assertEq(fallbackDemo.totalWithdrawn(), 3 ether);
        assertEq(owner.balance, initialOwnerBalance + 3 ether);
    }
    
    function testTransferOwnership() public {
        vm.expectEmit(true, true, true, true);
        emit OwnershipTransferred(owner, user1);
        
        vm.prank(owner);
        fallbackDemo.transferOwnership(user1);
        
        assertEq(fallbackDemo.owner(), user1);
    }
    
    function testNonOwnerCannotWithdraw() public {
        vm.prank(user1);
        (bool success, ) = address(fallbackDemo).call{value: 1 ether}("");
        require(success, "Call failed");
        
        vm.prank(user2);
        vm.expectRevert("Caller is not the owner");
        fallbackDemo.withdraw(1 ether);
    }
    
    function testGetStats() public {
        vm.prank(user1);
        (bool success, ) = address(fallbackDemo).call{value: 2.5 ether}("");
        require(success, "Call failed");
        
        (uint256 received, uint256 withdrawn, uint256 balance) = fallbackDemo.getStats();
        
        assertEq(received, 2.5 ether);
        assertEq(withdrawn, 0);
        assertEq(balance, 2.5 ether);
    }
    
    function testFuzzContributions(address sender, uint96 amount) public {
        vm.assume(sender != address(0) && sender != address(fallbackDemo));
        vm.assume(amount > 0 && amount < 10 ether);
        
        vm.deal(sender, amount);
        
        uint256 initialContribution = fallbackDemo.getContribution(sender);
        uint256 initialTotal = fallbackDemo.totalReceived();
        
        vm.prank(sender);
        (bool success, ) = address(fallbackDemo).call{value: amount}("");
        require(success, "Call failed");
        
        assertEq(fallbackDemo.getContribution(sender), initialContribution + amount);
        assertEq(fallbackDemo.totalReceived(), initialTotal + amount);
    }
}
