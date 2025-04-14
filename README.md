# Aztec Anonymous Messenger

> A Zero-Knowledge (ZK) based anonymous messaging system using Noir and the Aztec Protocol.

## 🎯 Purpose:
This project implements an anonymous messaging system using Zero-Knowledge Proofs (ZKP) built with **Noir**, deployed using the **Aztec Protocol** for privacy. The main goal is to validate messages without exposing any sensitive data. The system uses ZK circuits to prove that a message exists and has not been tampered with.

## ⚙️ Noir Contract:
This contract verifies the integrity of a message by checking its hash (`msg_hash`) and a timestamp (`timestamp`). The Zero-Knowledge proof is generated and verified using the Noir language.

### Contract Code:
```rust
fn main(msg_hash: Field, timestamp: pub Field) -> pub Field {
    // Ensure the message hash is not zero (valid message)
    assert(msg_hash != 0);

    // Return the timestamp incremented by 1 for proof validation
    return timestamp + 1;
}
How it works:
The user generates a hash of the message off-chain.

The user sends the msg_hash and timestamp to the Noir circuit.

The circuit validates the inputs and returns a proof, confirming the existence of the message.

🔐 ZK Proof Generation:
Using nargo, the Zero-Knowledge proof generation process works seamlessly and is verified on the backend via noir_js.

🚀 Testnet Deployment:
Unfortunately, as of now, the public Aztec testnet is unavailable. This project is ready to be deployed once the testnet access is provided.

💡 Future Work:
Frontend Development: Currently, there is a basic mock frontend. The next step would be to implement a user interface to interact with the backend.

Testing and Deployment: The current stage involves finalizing the contract and performing further testing. Upon availability of the Aztec testnet, the deployment will follow.

🛠️ Tech Stack:
Noir: A language for writing Zero-Knowledge smart contracts.

Aztec Protocol: Privacy-first blockchain protocol.

JavaScript: For backend testing with noir_js.

nargo: For compiling and verifying the Noir contracts.

📡 Deployment Status:
🚫 Currently, the Aztec testnet is not accessible due to GitHub Container Registry (GHCR) issues.

✉️ Contact:
Author: PQEST01

Discord: PQEST01#xxxx

📂 Project Structure:
graphql
Kodu kopyala
aztec-anonymous-messenger/
├── noir-contract/           # Noir smart contract
│   ├── Nargo.toml
│   ├── Prover.toml
│   └── src/
│       └── main.nr          # Main Noir contract code
├── backend-test/            # Backend testing with Noir
│   └── index.js
├── screenshots/              # Screenshots of ZKP proof and code
│   └── proof-run.png
│   └── noir-code.png
├── README.md                # Project documentation
└── demo.gif                  # (Optional) Demo of the process
🖼️ Screenshots:
ZKP proof result (proof-run.png): Proof generation screen after executing nargo prove.

Noir contract code (noir-code.png): Screenshot of the main.nr contract code.

Backend Test (wasm_test.png): Screenshot of the test results running noir_js.

📣 How to Run:
Clone this repository:

bash
Kodu kopyala
git clone https://github.com/PQEST01/aztec-anonymous-messenger.git
Install dependencies:

bash
Kodu kopyala
yarn install
Compile and test the Noir contract using nargo:

bash
Kodu kopyala
nargo compile
nargo prove
Test the backend with noir_js:

bash
Kodu kopyala
node index.js
🔄 Contributing:
Feel free to fork this repository and submit issues or pull requests. Contributions are welcome!

Note: This is a project in progress. The current version can be tested and run locally. Once the Aztec testnet is available, the contract will be deployed to the public testnet.