export const MessageContractSource = {
  abi: [
    {
      "inputs": [
        {
          "internalType": "bytes32",
          "name": "userHash",
          "type": "bytes32"
        }
      ],
      "name": "getMessages",
      "outputs": [
        {
          "components": [
            {
              "internalType": "address",
              "name": "sender",
              "type": "address"
            },
            {
              "internalType": "bytes32",
              "name": "recipientHash",
              "type": "bytes32"
            },
            {
              "internalType": "bytes32",
              "name": "secretHash",
              "type": "bytes32"
            },
            {
              "internalType": "bytes",
              "name": "encryptedContent",
              "type": "bytes"
            },
            {
              "internalType": "uint256",
              "name": "timestamp",
              "type": "uint256"
            }
          ],
          "internalType": "struct MessageContract.Message[]",
          "name": "",
          "type": "tuple[]"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "bytes32",
          "name": "recipientHash",
          "type": "bytes32"
        },
        {
          "internalType": "bytes32",
          "name": "secretHash",
          "type": "bytes32"
        },
        {
          "internalType": "bytes",
          "name": "encryptedContent",
          "type": "bytes"
        }
      ],
      "name": "sendMessage",
      "outputs": [],
      "stateMutability": "nonpayable",
      "type": "function"
    }
  ],
  bytecode: "0x608060405234801561001057600080fd5b50610a1f806100206000396000f3fe608060405234801561001057600080fd5b50600436106100365760003560e01c80631121739b1461003b5780635117fa6d14610057575b600080fd5b610055600480360381019061005091906103e8565b610087565b005b610071600480360381019061006c919061045c565b6101cc565b60405161007e91906106ba565b60405180910390f35b60006040518060a001604052803373ffffffffffffffffffffffffffffffffffffffff16815260200186815260200185815260200184848080601f016020809104026020016040519081016040528093929190818152602001838380828437600081840152601f19601f82011690508083019250505050505050815260200142815250905060008086815260200190815260200160002081908060018154018082558091505060019003906000526020600020906005020160009091909190915060008201518160000160006101000a81548173ffffffffffffffffffffffffffffffffffffffff021916908373ffffffffffffffffffffffffffffffffffffffff160217905550602082015181600101556040820151816002015560608201518160030190816101b89190610917565b506080820151816004015550505050505050565b6060600080838152602001908152602001600020805480602002602001604051908101604052809291908181526020016000905b8282101561033857838290600052602060002090600502016040518060a00160405290816000820160009054906101000a900473ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff168152602001600182015481526020016002820154815260200160038201805461029d9061073a565b80601f01602080910402602001604051908101604052809291908181526020018280546102c99061073a565b80156103165780601f106102eb57610100808354040283529160200191610316565b820191906000526020600020905b8154815290600101906020018083116102f957829003601f168201915b5050505050815260200160048201548152505081526020019060010190610200565b505050509050919050565b600080fd5b..."
};
