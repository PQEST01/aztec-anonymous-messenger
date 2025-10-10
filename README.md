# 🕵️‍♂️ PrivateMessenger — Private Messaging on Aztec Network

**PrivateMessenger** is a zero-knowledge messaging contract built on **Aztec L2**, enabling users to send and receive **encrypted private notes** directly on-chain.  
Each message is stored as a **`MessageNote`**, discoverable only by its intended recipient via the **PXE (Private Execution Environment)**.

> The contract leverages Aztec’s `note` system, tagged encrypted logs, and nullifier logic to ensure message privacy, integrity, and non-replayability.

---

## 🔗Deployments  

**PrivateMessenger (app contract):** 0x270f4eccd3e6a4082d51a2010c7adde967df0dc89b480bfbe65ed01ec6f2e921  

**PXE URL:** https://aztec-alpha-testnet-fullnode.zkv.xyz

**ABI:** src/contract/PrivateMessenger.json  

---

## ⚙️ Architecture Overview

PrivateMessenger works as a **two-layer system**:

1. **Contract Layer (Noir Contract):**  
   Handles note creation, message indexing, and bounded retrieval via `get_messages(owner, offset)`.

2. **Client Layer (PXE + SDK):**  
   Runs message discovery and decryption logic locally through the PXE node or SDK.  
   The frontend interacts with the contract through **Azguard Wallet**, a custom wallet integrated with Aztec.js.

---

## 🔐 Azguard Wallet Integration

The project integrates **Azguard Wallet** as the main authentication and transaction layer.  
Azguard acts as a **bridge** between the front-end UI and the Aztec private environment (PXE + SDK).  

### **Integration Overview**

1. **Wallet Connection**  
   The front-end uses the `@azguard/aztec-wallet` package.  
   When the user clicks **“Connect Wallet”**, the wallet injects a session key and exposes an Aztec-compatible account object:

   ```ts
   import { useAzguard } from "@azguard/react";

   const { connect, account, pxe } = useAzguard();
   await connect(); // establishes PXE session + account identity
   ```

   The `account.address` is then passed to the contract as the `owner`.

---

2. **Message Encryption & Sending**  
   The wallet includes a **local encryption module** compatible with Aztec notes.  
   When the user sends a message:

   ```ts
   const encryptedPayload = await wallet.encryptMessage(receiver, content);
   await contract.methods.send_message(receiver, encryptedPayload).send();
   ```

   - The message is encrypted client-side.  
   - The payload is wrapped as a **private note** and published as a **tagged log** on Aztec L2.  
   - Transaction signing and fee handling are performed via Azguard’s in-wallet SDK.

---

3. **Message Discovery & Reading**  
   The wallet triggers PXE message discovery automatically after login:

   ```ts
   await pxe.discoverNewMessages({ contractAddress: CONTRACT_ADDR });
   const inbox = await contract.methods
     .get_messages(account.address, 0)
     .simulate();
   ```

   - `discoverNewMessages()` fetches encrypted logs matching the user’s tag prefix.  
   - `get_messages()` returns up to 10 `MessageNote` entries (paginated via `offset`).  
   - The wallet decrypts the messages locally and renders them in the UI.

---

4. **Transaction Fees**  
   If the user lacks fee tokens, Azguard automatically uses a **sponsor FPC address**:

   ```ini
   SPONSOR_FPC=0xb195539cab1104d4c3705de94e4555c9630def411f025e023a31890dc56f8f2
   ```

   This ensures every user can send messages even without direct gas balance.

---

### **In Short**

Azguard Wallet fully abstracts:
- PXE connection  
- Account identity management  
- Message encryption/decryption  
- Fee sponsorship and transaction signing  

It transforms the messaging flow into a **single-click UX**, while maintaining complete privacy.

---

## 🧱 Contract Structure

### **Data Model: `MessageNote`**
| Field | Type | Description |
|-------|------|-------------|
| `owner` | `AztecAddress` | Message inbox owner |
| `sender` | `AztecAddress` | Message sender |
| `p0..p3` | `Field` | Encrypted payload fragments |

Messages are stored as bounded vectors (`BoundedVec<MessageNote,10>`).  

---

### **Core Functions**

| Function | Type | Description |
|-----------|------|-------------|
| `init()` | initializer | Sets up the contract instance. |
| `ping() -> Field` | view | Simple health check (returns a dummy field). |
| `get_messages(owner: AztecAddress, offset: u32)` | view | Returns up to 10 messages for the given owner, paginated by offset. |

---

## 🧩 CLI Usage (for developers)

```bash
# 1) Discover new messages (PXE sync)
aztec-cli pxe discover --contract $CONTRACT_ADDR --node $NODE_URL

# 2) Read messages
aztec-cli call   --contract $CONTRACT_ADDR   --function get_messages   --args <OWNER_AZTEC_ADDRESS> 0   --node $NODE_URL
```

> The discovery step must run **before** calling `get_messages`, otherwise PXE will not have decrypted notes yet.

---

## 🧠 SDK Flow Example

```ts
import { createPXEClient } from "@aztec/aztec.js";
const pxe = await createPXEClient(process.env.NODE_URL!);

// Discover messages
await pxe.discoverNewMessages({ contractAddress: CONTRACT_ADDR });

// Read messages
const inbox = await contract.methods.get_messages(owner, 0).simulate();
console.log(inbox);
```

---

## 🔒 Security Notes

- **Integrity:** Messages are hashed into the Aztec note commitment tree; tampering is impossible without breaking ZK proofs.  
- **Privacy:** Each message is encrypted per recipient and tagged for PXE discovery only.  
- **Delivery Guarantee:** Off-chain encrypted logs do not guarantee delivery, but integrity is verifiable on-chain.  
- **Replay Protection:** Every message is tied to a unique **nullifier**, preventing double reads or replays.  

---

## 🌐 Environment Variables

```ini
NODE_URL=https://aztec-alpha-testnet-fullnode.zkv.xyz
CONTRACT_ADDR=0x270f4eccd3e6a4082d51a2010c7adde967df0dc89b480bfbe65ed01ec6f2e921
SPONSOR_FPC=0xb195539cab1104d4c3705de94e4555c9630def411f025e023a31890dc56f8f2
```

---

## 🧩 Future Milestones

- [x] PXE integration  
- [x] CLI testing  
- [x] Full **Azguard Wallet** UI connection  
- [ ] End-to-end testnet flow  
- [ ] Aztec Scan transaction explorer support  

---

📜Contact: GitHub Issues/Discussions (or your preferred channel)
