import { 
  createPXEClient, 
  Fr, 
  Contract, 
  loadContractArtifact, 
  type AccountWallet
} from '@aztec/aztec.js';
import { getSchnorrAccount } from '@aztec/accounts/schnorr';
import * as fs from 'fs';

const PXE_URL = "https://aztec-alpha-testnet-fullnode.zkv.xyz";
// const PXE_URL = "http://localhost:8080"; // For sandbox environment

// Temporary private key for testing (change this for real deployment!)
const PRIVATE_KEY = "0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef";

async function main() {
  try {
    console.log("🌐 Connecting to Aztec...");

    // 1. Initialize PXE client
    const pxe = createPXEClient(PXE_URL);

    // 2. Check network info
    let nodeInfo;
    let currentPxe = pxe;
    try {
      nodeInfo = await pxe.getNodeInfo();
      console.log("✅ Successfully connected to Testnet");
      console.log("Chain ID:", nodeInfo.l1ChainId);
      console.log("Protocol Version:", nodeInfo.protocolVersion);
    } catch (error) {
      // Fallback to sandbox if Testnet connection fails
      console.log("⚠️ Could not connect to Testnet, attempting local sandbox...");
      currentPxe = createPXEClient("http://localhost:8080");
      nodeInfo = await currentPxe.getNodeInfo();
      console.log("✅ Successfully connected to local sandbox");
    }

    // 3. Wallet creation
    console.log("📝 Creating wallet...");
    let wallet: AccountWallet;
    let accountAddress;

    const isLocalSandbox = currentPxe !== pxe;

    if (isLocalSandbox) {
      // Sandbox mode: use existing test accounts
      console.log("🏠 Sandbox mode - Checking test accounts...");

      const registeredAccounts = await currentPxe.getRegisteredAccounts();
      if (registeredAccounts.length === 0) {
        throw new Error("No test accounts found. Did you run 'aztec start --sandbox'?");
      }

      const testAccount = registeredAccounts[0];
      console.log("✅ Test account found:", testAccount.address.toString());

      const testPrivateKey = Fr.fromString("0x0000000000000000000000000000000000000000000000000000000000000001");
      const account = getSchnorrAccount(currentPxe, testPrivateKey, testAccount.address);
      wallet = await account.getWallet();
      accountAddress = testAccount.address;

    } else {
      // Testnet mode: Create new Schnorr account
      console.log("🌐 Testnet mode - Creating Schnorr account...");
      const privateKey = Fr.fromString(PRIVATE_KEY);

      const account = getSchnorrAccount(currentPxe, privateKey);

      const isDeployed = await account.isDeployed();

      if (!isDeployed) {
        console.log("📤 Deploying account...");
        console.log("⚠️ ETH required to deploy account on Testnet!");
        console.log("Get tokens from faucet: https://faucet.aztec.network");

        const deployTx = await account.deploy();
        const deployReceipt = await deployTx.wait();
        console.log("✅ Account deployed. Block:", deployReceipt.blockNumber);
      }

      wallet = await account.getWallet();
      accountAddress = wallet.getAddress();
      console.log("✅ Schnorr wallet ready:", accountAddress.toString());
    }

    console.log("Account Address:", accountAddress.toString());

    // 4. Load contract artifact
    console.log("📦 Loading contract artifact...");
    const artifactPath = "../aztec-private-message/contracts/private_message/target/private_message-PrivateMessage.json";

    if (!fs.existsSync(artifactPath)) {
      throw new Error(`Artifact not found: ${artifactPath}. Did you run 'aztec-nargo compile'?`);
    }

    const artifactJson = JSON.parse(fs.readFileSync(artifactPath, "utf-8"));
    const artifact = loadContractArtifact(artifactJson);
    console.log("✅ Artifact loaded");

    // 5. Deploy contract
    console.log("🚀 Deploying contract...");
    const deployArgs = [accountAddress, accountAddress]; // owner, default_recipient

    console.log("Deployment parameters:");
    console.log("- Owner:", accountAddress.toString());
    console.log("- Default Recipient:", accountAddress.toString());

    const contract = await Contract.deploy(wallet, artifact, deployArgs)
      .send()
      .deployed();

    console.log("\n🎉 Contract deployed successfully!");
    console.log("Contract Address:", contract.address.toString());

    // 6. Test contract methods
    console.log("\n🧪 Testing contract methods...");
    try {
      const owner = await contract.methods.get_owner().simulate();
      console.log("✅ Contract Owner verified:", owner.toString());

      const version = await contract.methods.get_version().simulate();
      console.log("✅ Contract Version:", version.toString());
    } catch (testError) {
      console.log("⚠️ Contract method tests failed:");
      if (testError instanceof Error) {
        console.log("Error:", testError.message);
      }
      console.log("Note: These methods may not exist in the contract");
    }

    // 7. Save deployment info
    const deployInfo = {
      contractAddress: contract.address.toString(),
      owner: accountAddress.toString(),
      deployedAt: new Date().toISOString(),
      network: isLocalSandbox ? "sandbox" : "testnet",
      pxeUrl: isLocalSandbox ? "http://localhost:8080" : PXE_URL,
      aztecVersion: "0.87.7"
    };

    const deployResultPath = "./deploy-result.json";
    fs.writeFileSync(deployResultPath, JSON.stringify(deployInfo, null, 2));
    console.log(`\n📄 Deployment details saved to '${deployResultPath}'`);

    console.log("\n" + "=".repeat(60));
    console.log("📋 DEPLOYMENT SUMMARY");
    console.log("=".repeat(60));
    console.log(`Network: ${isLocalSandbox ? 'Local Sandbox' : 'Aztec Testnet'}`);
    console.log(`Contract Address: ${contract.address.toString()}`);
    console.log(`Owner: ${accountAddress.toString()}`);
    console.log("=".repeat(60));

    if (!isLocalSandbox) {
      console.log("\n🔗 View your contract on explorer:");
      console.log(`https://explorer.aztec.network/contract/${contract.address.toString()}`);
    }

  } catch (error) {
    console.error("\n❌ Deployment error:", error);
    process.exit(1);
  }
}

main().catch(console.error);
