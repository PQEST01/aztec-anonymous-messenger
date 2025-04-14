// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract MessageContract {
    struct Message {
        address sender;
        bytes32 recipientHash;
        bytes32 secretHash;
        bytes encryptedContent;
        uint256 timestamp;
    }
    
    mapping(bytes32 => Message[]) private userMessages;
    
    function sendMessage(
        bytes32 recipientHash,
        bytes32 secretHash,
        bytes calldata encryptedContent
    ) public {
        Message memory newMessage = Message({
            sender: msg.sender,
            recipientHash: recipientHash,
            secretHash: secretHash,
            encryptedContent: encryptedContent,
            timestamp: block.timestamp
        });
        
        userMessages[recipientHash].push(newMessage);
    }
    
    function getMessages(bytes32 userHash) public view returns (Message[] memory) {
        return userMessages[userHash];
    }
}