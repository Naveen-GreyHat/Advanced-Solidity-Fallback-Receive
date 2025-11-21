// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

/**
 * @title FallbackDemo
 * @dev Demonstrates receive() and fallback() functions with event emissions
 * Includes advanced features like withdrawal pattern and access control
 */
contract FallbackDemo {
    event Received(address indexed sender, uint256 amount);
    event FallbackCalled(address indexed sender, uint256 amount, bytes data);
    event Withdrawn(address indexed recipient, uint256 amount);
    event OwnershipTransferred(address indexed previousOwner, address indexed newOwner);
    
    address public owner;
    uint256 public totalReceived;
    uint256 public totalWithdrawn;
    mapping(address => uint256) public contributions;
    
    modifier onlyOwner() {
        require(msg.sender == owner, "Caller is not the owner");
        _;
    }
    
    constructor() {
        owner = msg.sender;
    }
    
    /**
     * @dev Gets the contract's current balance
     */
    function getBalance() external view returns (uint256) {
        return address(this).balance;
    }
    
    /**
     * @dev Gets contract statistics
     */
    function getStats() external view returns (uint256 received, uint256 withdrawn, uint256 currentBalance) {
        return (totalReceived, totalWithdrawn, address(this).balance);
    }
    
    /**
     * @dev Gets contributor amount
     */
    function getContribution(address _contributor) external view returns (uint256) {
        return contributions[_contributor];
    }
    
    /**
     * @dev receive() function - called when Ether is sent with empty calldata
     */
    receive() external payable {
        totalReceived += msg.value;
        contributions[msg.sender] += msg.value;
        emit Received(msg.sender, msg.value);
    }
    
    /**
     * @dev fallback() function - called when Ether is sent with calldata
     */
    fallback() external payable {
        totalReceived += msg.value;
        contributions[msg.sender] += msg.value;
        emit FallbackCalled(msg.sender, msg.value, msg.data);
    }
    
    /**
     * @dev Withdraw funds to owner (security pattern)
     */
    function withdraw(uint256 amount) external onlyOwner {
        require(amount <= address(this).balance, "Insufficient balance");
        totalWithdrawn += amount;
        payable(owner).transfer(amount);
        emit Withdrawn(owner, amount);
    }
    
    /**
     * @dev Withdraw all funds to owner
     */
    function withdrawAll() external onlyOwner {
        uint256 balance = address(this).balance;
        totalWithdrawn += balance;
        payable(owner).transfer(balance);
        emit Withdrawn(owner, balance);
    }
    
    /**
     * @dev Transfer ownership to new address
     */
    function transferOwnership(address newOwner) external onlyOwner {
        require(newOwner != address(0), "New owner is the zero address");
        emit OwnershipTransferred(owner, newOwner);
        owner = newOwner;
    }
    
    /**
     * @dev Self destruct function for emergency (advanced feature)
     */
    function destroy() external onlyOwner {
        selfdestruct(payable(owner));
    }
}
