# 🚀Aztec Anonymous Messenger — pre-mini-testnet

**Branch;** pre-mini-testnet  

**Status:** minimal working slice (account create → deploy → send) using Aztec SDK + Noir.  

**Demo backend:** https://api.aztecanonymousmessenger.com  

**ABI:** abi/PrivateMessenger.json  

This branch focuses on a simple, wallet-owned flow that anyone can run with curl and see real tx hashes.  

## 🔗Deployments  

**PrivateMessenger (app contract):** 0x0edecf304e4692709f9752bad2308d38e8fb1ab512bf0e1ee207905eefe13415  

**PXE URL (dev/sandbox):** http://127.0.0.1:8080

**ABI:** abi/PrivateMessenger.json  

## 🧪Quickstart  

This is the recommended path for users: create a new wallet, deploy it, then send a message.  

**1) Backend status**  
```
curl -s https://api.aztecanonymousmessenger.com/status \
| jq '{ ok, pxe, mode, contract }'
```
**Expected (example):**  

{ "ok": true, "pxe": "http://127.0.0.1:8080", "mode": "sandbox", "contract": "0x..." }  

**2)👤 Create your wallet**  
```
curl -sX POST https://api.aztecanonymousmessenger.com/create-account \
  -H 'content-type: application/json' \
  -d '{"alias":"first-demo"}' \
| tee /tmp/create.json \
| jq '{ ok, alias, address, registeredInPXE, deployed, secretKeyHex, signingKeyHex }'  
```

**Copy the value of secretKeyHex from the output above (it is your wallet’s private key for this demo).**  

**3)📦 Deploy your wallet (writes on Aztec)**  
```
SK=$(jq -r .secretKeyHex /tmp/create.json)

curl -sS -X POST https://api.aztecanonymousmessenger.com/deploy-account \
  -H 'content-type: application/json' \
  -d "{\"alias\":\"first-demo\",\"secretKeyHex\":\"$SK\"}" \
| jq '{ ok, alias, address, deployed, txHash }'
 ```  

**4)💬 Send a message (example)**  
```
curl -sS -X POST https://api.aztecanonymousmessenger.com/send \
  -H 'content-type: application/json' \
  -d '{"toAlias":"demo-peer","message":"hello from Aztec!"}' \
| jq '{ ok, txHash, status }'
```
You should see deployed: true and a txHash.

**Contract method defaults to send. If your ABI uses a different method name, set MESSENGER_METHOD=<yourMethod> in .env.**  

⚙️**Environment (.env example)**  
```
PORT=3000  
PXE_URL=http://127.0.0.1:8080  
MESSENGER_ADDR=0x0eedcf30e4692709f9752bad2308d38e8fb1lab512bf0e1ee207905eefe13415
MESSENGER_METHOD=send  
```
## 🧰 Developers  

For local development, ensure a PXE is reachable at PXE_URL (sandbox is easiest):  

Start a sandbox PXE (one-liner varies by environment; follow Aztec installer docs).  

Restart backend after updating .env:  
```
npm i
pm2 start ecosystem.config.cjs --only aztec-api || pm2 restart aztec-api
pm2 logs aztec-api --lines 100
``` 


Contact: GitHub Issues/Discussions (or your preferred channel)
