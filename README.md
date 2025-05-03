# Aztec Anonymous Messenger

A Zero-Knowledge (ZK) powered anonymous messaging app built using **Noir** and **Aztec SDK**. This project allows users to communicate privately and securely through ephemeral group chats that leverage privacy-preserving smart contracts on the Aztec network.

---

## 🔎 Features

- 📁 Fully private group chats using ZK cryptography
- 🛡️ Self-destructing messages (after read or with a timer)
- 📅 Temporary identity with nickname support
- 🚫 No real account or identity required
- 📡 Wallet-based login (MetaMask)
- 🔗 Invite links for group sharing
- 🔧 Built using Aztec's PXE client and Noir smart contracts
- ⚙ Noir smart contracts + JavaScript SDK integrations.

---

## 📂 Project Structure

```
aztec-messenger/
├── aztec-private-messenger/       # Frontend and backend integration
│   ├── contracts/                 # Noir contract artifact files (.json/.wasm)
│   ├── data/                      # Message storage and in-memory state
│   ├── server.js                 # PXE + Contract deploy + Backend logic
│   └── pages/                    # Next.js frontend pages
└── noir/
    └── message_contract_test/    # Noir contract source and build
```

---

## ⚡ Quick Start (Local)

1. **Install dependencies:**

```bash
npm install
```

2. **Run the backend server:**

```bash
npm run start
```

3. **Run the frontend:**

```bash
npm run dev
```

> Make sure your Noir contract is compiled and the `.json` and `.wasm` files are present under `/contracts/`.

---

## 📚 Noir Smart Contract
---

## 🔧 Tech Stack

- **Frontend:** React (Next.js)
- **Backend:** Node.js + Express
- **ZK Layer:** Noir + Aztec SDK (PXE)
- **Wallet:** MetaMask

---

## 📢 Screenshots

### Homepage
![Opening](screenshots/001.png)

### Group Chat Interface
![Opening](screenshots/002.png)
![Opening](screenshots/003.png)
![Opening](screenshots/004.png)
![Opening](screenshots/005.png)
---

## 👤 About the Developer

- **GitHub:** [PQEST01](https://github.com/PQEST01)
- **Discord:** pqest

---

## ✉ Feedback

Feel free to open issues or pull requests. You can also reach out to me on [Discord](https://discord.gg/aztec)!

---

> This project is developed for educational and experimental purposes. Contributions and improvements are welcome!

