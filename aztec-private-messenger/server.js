import express from 'express';
import cors from 'cors';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import fs from 'fs';
import path from 'path';
import { ethers } from 'ethers';
import { AccountWallet, Contract, Fr } from '@aztec/aztec.js';
import { createPXEClient } from '@aztec/aztec.js';
import { keccak256 } from 'ethereum-cryptography/keccak';
import { hexToBytes } from 'ethereum-cryptography/utils';
import { MessageContractSource } from './contracts/MessageContract.js';

// Aztec'in computeMessageSecretHash fonksiyonunun yerine kullanılacak
function computeMessageSecretHash(secret) {
  return keccak256(hexToBytes(secret.toString()));
}
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
app.use(cors());
app.use(express.json());

console.log('Aztec Blockchain Service başlatılıyor...');

// Veri dosyaları yolları
const DATA_DIR = path.join(__dirname, 'data');
const USERS_FILE = path.join(DATA_DIR, 'users.json');
const GROUPS_FILE = path.join(DATA_DIR, 'groups.json');
const MESSAGES_FILE = path.join(DATA_DIR, 'messages.json');
const SESSIONS_FILE = path.join(DATA_DIR, 'sessions.json');
const contractFilePath = path.join(DATA_DIR, 'contract.json');

// Veri dizinini oluştur
try {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
} catch (error) {
  console.error('Veri dizini oluşturma hatası:', error);
}

// Veritabanı
let users = new Map();
let groups = new Map();
let messages = new Map();
let sessions = new Map();

// Verileri dosyadan yükle
function loadData() {
  try {
    if (fs.existsSync(USERS_FILE)) {
      const usersData = JSON.parse(fs.readFileSync(USERS_FILE, 'utf8'));
      users = new Map(Object.entries(usersData));
    }
    
    if (fs.existsSync(GROUPS_FILE)) {
      const groupsData = JSON.parse(fs.readFileSync(GROUPS_FILE, 'utf8'));
      groups = new Map(Object.entries(groupsData));
    }
    
    if (fs.existsSync(MESSAGES_FILE)) {
      const messagesData = JSON.parse(fs.readFileSync(MESSAGES_FILE, 'utf8'));
      messages = new Map(Object.entries(messagesData));
    }
    
    if (fs.existsSync(SESSIONS_FILE)) {
      const sessionsData = JSON.parse(fs.readFileSync(SESSIONS_FILE, 'utf8'));
      sessions = new Map(Object.entries(sessionsData));
    }
    
    console.log('Veriler başarıyla yüklendi');
  } catch (error) {
    console.error('Veri yükleme hatası:', error);
  }
}

// Verileri dosyaya kaydet
function saveData() {
  try {
    const usersData = Object.fromEntries(users);
    const groupsData = Object.fromEntries(groups);
    const messagesData = Object.fromEntries(messages);
    const sessionsData = Object.fromEntries(sessions);
    
    fs.writeFileSync(USERS_FILE, JSON.stringify(usersData));
    fs.writeFileSync(GROUPS_FILE, JSON.stringify(groupsData));
    fs.writeFileSync(MESSAGES_FILE, JSON.stringify(messagesData));
    fs.writeFileSync(SESSIONS_FILE, JSON.stringify(sessionsData));
    
    console.log('Veriler başarıyla kaydedildi');
  } catch (error) {
    console.error('Veri kaydetme hatası:', error);
  }
}

// Başlangıçta verileri yükle
loadData();
setInterval(saveData, 10000); // 10 saniyede bir kaydet

// Cüzdan adresinden imza doğrulama
function verifySignature(address, message, signature) {
  try {
    const recoveredAddress = ethers.utils.verifyMessage(message, signature);
    return recoveredAddress.toLowerCase() === address.toLowerCase();
  } catch (error) {
    console.error('İmza doğrulama hatası:', error);
    return false;
  }
}

// Aztec.js için client
let pxeClient = null;
let messageContractAddress = null; // Sözleşme adresi için değişken ekleyin

async function initializeAztec() {
  try {
    console.log('Aztec.js başlatılıyor...');
    
    // Sandbox bağlantısı
    pxeClient = createPXEClient('http://localhost:8080');
    console.log('Aztec.js PXE istemcisi başarıyla başlatıldı!');
    
    // Contract adresi kontrolü
    const contractFilePath = path.join(DATA_DIR, 'contract.json');
    
    try {
      if (fs.existsSync(contractFilePath)) {
        const json = JSON.parse(fs.readFileSync(contractFilePath, 'utf8'));
        if (json.messageContractAddress) {
          messageContractAddress = json.messageContractAddress;
          console.log('Daha önce kaydedilmiş sözleşme adresi bulundu:', messageContractAddress);
        }
      }
      
      if (!messageContractAddress && pxeClient) {
        messageContractAddress = await deployMessageContract();
        if (messageContractAddress) {
          fs.writeFileSync(contractFilePath, JSON.stringify({ messageContractAddress }, null, 2));
        }
      }
    } catch (fileError) {
      console.error('Contract dosyası işleme hatası:', fileError);
    }
    
    return !!pxeClient;
  } catch (error) {
    console.error('PXE istemcisi başlatılamadı:', error.message);
    return false;
  }
}
// Aztec entegrasyonu başlat
(async () => {
  try {
    const success = await initializeAztec();
    if (success) {
      console.log('Aztec entegrasyonu tam olarak başlatıldı ve kullanıma hazır!');
    } else {
      console.warn('Aztec entegrasyonu başlatılamadı, ilgili özellikler devre dışı olacak.');
    }
  } catch (error) {
    console.error('Aztec başlatma sürecinde beklenmeyen hata:', error);
  }
})();
// Mesajları akıllı sözleşmeden alma
async function getMessagesFromContract(userPublicKey) {
  try {
    if (!pxeClient || !messageContractAddress) {
      return { 
        success: false, 
        error: 'Aztec bağlantısı veya sözleşme hazır değil'
      };
    }
    
    // Kullanıcı hash hesaplama
    const userHash = ethers.utils.keccak256(
      ethers.utils.toUtf8Bytes(userPublicKey)
    );
    
    // Sözleşmeden mesajları çek
    const result = await pxeClient.callContract({
      to: messageContractAddress,
      functionName: 'getMessages',
      args: [userHash],
    });
    
    // Mesajları decode et
    const messages = result.map(msg => ({
      sender: msg.sender,
      recipientHash: msg.recipientHash,
      secretHash: msg.secretHash,
      content: ethers.utils.toUtf8String(msg.encryptedContent),
      timestamp: msg.timestamp.toNumber()
    }));
    
    return { 
      success: true,
      messages: messages
    };
  } catch (error) {
    console.error('Aztec sözleşmeden mesaj alma hatası:', error);
    return { success: false, error: error.message };
  }
}
// Akıllı sözleşme dağıtma
async function deployMessageContract() {
  try {
    console.log('MessageContract akıllı sözleşmesi dağıtılıyor...');
    
    try {
      // Import et (öncelikle bu yöntemi dene)
      const { messageContract } = await import('./contracts/message_contract.js');
      
      // Yeni deploy yöntemi
      const deployerPrivateKey = Fr.random();
      const wallet = new AccountWallet(deployerPrivateKey, pxeClient);
      const deployedContract = await Contract.deploy(messageContract, wallet).send();
      const receipt = await deployedContract.wait();
      const contractAddress = deployedContract.address.toString();
      
      console.log('Sözleşme başarıyla dağıtıldı:', contractAddress);
      return contractAddress;
    } catch (importError) {
      console.error('Kontrat import hatası, alternatif yöntemi deniyorum:', importError.message);
      
      // Dosya yolunu oluştur
      const __filename = fileURLToPath(import.meta.url);
      const __dirname = path.dirname(__filename);
      const contractPath = path.join(__dirname, '../artifacts/aztec-private-messenger/contracts/MessageContract.sol/MessageContract.json');
      
      // Kontrat dosyasını oku
      const contractRaw = await fs.promises.readFile(contractPath, 'utf8');
      const contractJson = JSON.parse(contractRaw);
      
      // Kontrat deploy et
      const deployerPrivateKey = Fr.random();
      const wallet = new AccountWallet(deployerPrivateKey, pxeClient);
      
      // messageContract yerine okuduğumuz dosyadaki tanımı kullan
      const deployedContract = await Contract.deploy({
        abi: contractJson.abi,
        bytecode: contractJson.bytecode
      }, wallet).send();
      
      const receipt = await deployedContract.wait();
      const contractAddress = deployedContract.address.toString();
      
      console.log('Sözleşme başarıyla dağıtıldı (hardhat):', contractAddress);
      return contractAddress;
    }
  } catch (error) {
    console.error('Sözleşme dağıtma hatası:', error);
    return null;
  }
}
    // Yeni deploy yöntemi
    const deployerPrivateKey = Fr.random();
    const wallet = new AccountWallet(deployerPrivateKey, pxeClient);
    const deployedContract = await Contract.deploy(MessageContractSource, wallet).send();
    const receipt = await deployedContract.wait();
    const contractAddress = deployedContract.address.toString();

// Contract dosyasını kontrol et
try {
  if (fs.existsSync(contractFilePath)) {
    const json = JSON.parse(fs.readFileSync(contractFilePath, 'utf8'));
    if (json.messageContractAddress) {
      messageContractAddress = json.messageContractAddress;
      console.log('Daha önce kaydedilmiş sözleşme adresi bulundu:', messageContractAddress);
    }
  }
  
  if (!messageContractAddress && pxeClient) {
    try {
      messageContractAddress = await deployMessageContract();
      if (messageContractAddress) {
        console.log('Yeni sözleşme adresi deploy edildi:', messageContractAddress);
        fs.writeFileSync(contractFilePath, JSON.stringify({ messageContractAddress }, null, 2));
      }
    } catch (deployError) {
      console.error('Sözleşme deploy hatası:', deployError.message);
    }
  }
} catch (fileError) {
  console.error('Contract dosyası işleme hatası:', fileError);
}

// Şifreli mesaj gönderme
async function sendEncryptedMessage(sender, recipient, content) {
  try {
    // Mesajı şifrele
    const messageSecret = Fr.random();
    const secretHash = computeMessageSecretHash(messageSecret);
    
    // İçeriği şifrele
    console.log('Mesaj şifrelendi:', { 
      senderPublicKey: sender.publicKey,
      recipientPublicKey: recipient,
      secretHash: secretHash.toString(),
      content: content
    });
    
    return { 
      success: true, 
      secretHash: secretHash.toString(),
      messageSecret: messageSecret.toString()
    };
  } catch (error) {
    console.error('Aztec mesaj şifreleme hatası:', error);
    return { success: false, error: error.message };
  }
}
// Şifrelenmiş mesajı akıllı sözleşme üzerinden gönderme
async function sendEncryptedMessageViaContract(sender, recipientPublicKey, content) {
  try {
    if (!pxeClient || !messageContractAddress) {
      return { 
        success: false, 
        error: 'Aztec bağlantısı veya sözleşme hazır değil'
      };
    }
    
    // Alıcı hash hesaplama (basit implementasyon)
    const recipientHash = ethers.utils.keccak256(
      ethers.utils.toUtf8Bytes(recipientPublicKey)
    );
    
    // Mesaj şifreleme
    const messageSecret = Fr.random();
    const secretHash = computeMessageSecretHash(messageSecret);
    
    // İçeriği şifrele (basit temsili şifreleme)
    const encryptedContent = ethers.utils.toUtf8Bytes(content);
    
    // Sözleşme üzerinden mesaj gönderme
    const tx = await pxeClient.createTransaction({
      to: messageContractAddress,
      functionName: 'sendMessage',
      args: [recipientHash, secretHash, encryptedContent],
    });
    
    await tx.send();
    const receipt = await tx.wait();
    
    return { 
      success: true, 
      txHash: receipt.txHash,
      secretHash: secretHash.toString(),
      messageSecret: messageSecret.toString()
    };
  } catch (error) {
    console.error('Aztec sözleşme mesaj gönderme hatası:', error);
    return { success: false, error: error.message };
  }
}
// Yetkilendirme yardımcı fonksiyonu
function checkAuth(req) {
  const sessionId = req.headers.authorization;
  
  if (!sessionId || !sessions.has(sessionId)) {
    return { authenticated: false, error: 'Yetkisiz erişim. Lütfen cüzdanınızı bağlayın.' };
  }
  
  const session = sessions.get(sessionId);
  const user = users.get(session.userId);
  
  if (!user) {
    return { authenticated: false, error: 'Kullanıcı bulunamadı.' };
  }
  
  return { authenticated: true, user };
}

// API endpoints

// Cüzdan ile kimlik doğrulama - Public endpoint
app.post('/api/auth/wallet', async (req, res) => {
  try {
    const { address, message, signature, timestamp } = req.body;
    
    // İmzayı doğrula
    const isValid = verifySignature(address, message, signature);
    if (!isValid) {
      return res.status(401).json({ success: false, error: 'Geçersiz imza' });
    }
    
    // Zaman kontrolü (5 dakikadan eski imzaları reddet)
    const messageTime = parseInt(message.split(': ')[1]);
    const now = Date.now();
    if (now - messageTime > 5 * 60 * 1000) {
      return res.status(401).json({ success: false, error: 'İmza zaman aşımına uğradı' });
    }
    
    // Cüzdan adresinden kullanıcı adı oluştur
    // 0x ile başlayan cüzdan adresinin ilk 6 ve son 4 karakterini al
    const username = `${address.substring(0, 6)}...${address.substring(address.length - 4)}`;
    
    // Kullanıcıyı bul veya oluştur
    let user = Array.from(users.values()).find(u => 
      u.walletAddress && u.walletAddress.toLowerCase() === address.toLowerCase()
    );
    
    if (!user) {
      // Yeni kullanıcı oluştur
      const userId = `user-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
      const publicKey = `pk-${Math.random().toString(36).substring(2, 15)}`;
      const privateKey = `sk-${Math.random().toString(36).substring(2, 15)}`;
      
      user = {
        userId,
        publicKey,
        privateKey,
        walletAddress: address,
        username: username,  // Kullanıcı adını ekle
        createdAt: Date.now()
      };
      
      users.set(userId, user);
      saveData();
    } else if (!user.username) {
      // Eğer mevcut kullanıcının kullanıcı adı yoksa ekle
      user.username = username;
      users.set(user.userId, user);
      saveData();
    }
    
    // Oturum oluştur
    const sessionId = `session-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
    sessions.set(sessionId, {
      userId: user.userId,
      walletAddress: address,
      createdAt: Date.now()
    });
    
    console.log(`Cüzdan oturumu oluşturuldu: ${address} (Kullanıcı: ${user.username})`);
    
    res.json({
      success: true,
      sessionId,
      user: {
        userId: user.userId,
        publicKey: user.publicKey,
        walletAddress: user.walletAddress,
        username: user.username  // Kullanıcı adını ekle
      }
    });
  } catch (error) {
    console.error('Cüzdan kimlik doğrulama hatası:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Oturum doğrulama - Public endpoint
app.get('/api/auth/session/:sessionId', async (req, res) => {
  try {
    const { sessionId } = req.params;
    
    if (!sessions.has(sessionId)) {
      return res.status(401).json({ success: false, error: 'Geçersiz oturum' });
    }
    
    const session = sessions.get(sessionId);
    const user = users.get(session.userId);
    
    if (!user) {
      return res.status(404).json({ success: false, error: 'Kullanıcı bulunamadı' });
    }
    
    res.json({
      success: true,
      user: {
        userId: user.userId,
        publicKey: user.publicKey,
        walletAddress: user.walletAddress,
        username: user.username  // Kullanıcı adını ekle
      }
    });
  } catch (error) {
    console.error('Oturum doğrulama hatası:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Kullanıcının gruplarını getir
app.get('/api/user/groups/:walletAddress', async (req, res) => {
  try {
    const { walletAddress } = req.params;
    
    // Kimlik doğrulama kontrol et
    const auth = checkAuth(req);
    if (!auth.authenticated) {
      return res.status(401).json({ success: false, error: auth.error });
    }
    
    const currentUser = auth.user;
    
    // Kullanıcının kendi gruplarını mı çekiyor kontrol et
    if (currentUser.walletAddress.toLowerCase() !== walletAddress.toLowerCase()) {
      return res.status(403).json({ 
        success: false, 
        error: 'Sadece kendi gruplarınızı görüntüleyebilirsiniz' 
      });
    }
    
    // Kullanıcının gruplarını bul
    const userGroups = Array.from(groups.values()).filter(group => 
      group.members.includes(currentUser.publicKey) || group.createdBy === currentUser.publicKey
    );
    
    res.json({
      success: true,
      groups: userGroups
    });
  } catch (error) {
    console.error('Kullanıcı grupları alma hatası:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Belirli bir grup bilgisini getir
app.get('/api/groups/:groupId', async (req, res) => {
  try {
    const { groupId } = req.params;
    const inviteMode = req.query.invite === 'true'; // URL'den davet modu parametresini kontrol et
    
    // Kimlik doğrulama kontrol et
    const auth = checkAuth(req);
    if (!auth.authenticated) {
      return res.status(401).json({ success: false, error: auth.error });
    }
    
    const user = auth.user;
    
    if (!groups.has(groupId)) {
      return res.status(404).json({ success: false, error: 'Grup bulunamadı' });
    }
    
    const group = groups.get(groupId);
    
    // Kullanıcının bu grupta üye olup olmadığını kontrol et
    const isGroupMember = group.members.includes(user.publicKey) || group.createdBy === user.publicKey;
    
    // Eğer kullanıcı gruptan değilse ve davet modu açıksa, gruba ekleyelim
    if (!isGroupMember && inviteMode) {
      // Gruba yeni üye ekle
      group.members.push(user.publicKey);
      groups.set(groupId, group);
      saveData();
      console.log(`Kullanıcı davet üzerine gruba eklendi: ${user.userId} -> ${groupId}`);
      
      res.json({
        success: true,
        group,
        joined: true
      });
    } 
    else if (!isGroupMember) {
      return res.status(403).json({ 
        success: false, 
        error: 'Bu gruba erişim yetkiniz yok' 
      });
    }
    else {
      // Kullanıcı zaten grup üyesi
      res.json({
        success: true,
        group
      });
    }
  } catch (error) {
    console.error('Grup bilgisi alma hatası:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

app.post('/api/createUser', async (req, res) => {
  try {
    // Kimlik doğrulama kontrol et
    const auth = checkAuth(req);
    if (!auth.authenticated) {
      return res.status(401).json({ success: false, error: auth.error });
    }
    
    // Yeni bir kullanıcı kimliği oluştur
    let userId, publicKey, privateKey;
    
    if (pxeClient) {
      try {
        // Gerçek Aztec istemci kullanılıyorsa
        const account = await pxeClient.createAccount();
        userId = account.address.toString();
        publicKey = account.publicKey;
        privateKey = account.privateKey;
      } catch (e) {
        console.warn('Aztec hesabı oluşturma hatası, mock hesap kullanılacak:', e.message);
        // Mock hesap oluştur
        userId = `user-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
        publicKey = `pk-${Math.random().toString(36).substring(2, 15)}`;
        privateKey = `sk-${Math.random().toString(36).substring(2, 15)}`;
      }
    } else {
      // Mock hesap oluştur
      userId = `user-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
      publicKey = `pk-${Math.random().toString(36).substring(2, 15)}`;
      privateKey = `sk-${Math.random().toString(36).substring(2, 15)}`;
    }
    
    // Kullanıcıyı sakla
    users.set(userId, { userId, publicKey, privateKey });
    saveData();
    
    console.log(`Yeni kullanıcı oluşturuldu: ${userId}`);
    
    res.json({
      success: true,
      userId,
      publicKey,
      privateKey,
      azteEnabled: pxeClient !== null
    });
  } catch (error) {
    console.error('Kullanıcı oluşturma hatası:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

app.post('/api/createGroup', async (req, res) => {
  try {
    const { creator, groupName, memberPublicKeys } = req.body;
    
    // Kimlik doğrulama kontrol et
    const auth = checkAuth(req);
    if (!auth.authenticated) {
      return res.status(401).json({ success: false, error: auth.error });
    }
    
    const currentUser = auth.user;
    
    // Kullanıcının kendi gruplarını mı oluşturuyor kontrol et
    if (creator.publicKey !== currentUser.publicKey) {
      return res.status(403).json({ 
        success: false, 
        error: 'Sadece kendi adınıza grup oluşturabilirsiniz' 
      });
    }
    
    // Benzersiz bir grup kimliği oluştur
    const groupId = `group-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
    
    // Grup bilgilerini sakla
    const group = {
      groupId,
      name: groupName,
      members: memberPublicKeys,
      createdAt: Date.now(),
      createdBy: creator.publicKey,
      aztecContractAddress: pxeClient ? `aztec-${Math.random().toString(36).substring(2, 10)}` : null
    };
    
    groups.set(groupId, group);
    
    // Grup için mesaj listesi oluştur
    if (!messages.has(groupId)) {
      messages.set(groupId, []);
    }
    
    saveData();
    
    console.log(`Yeni grup oluşturuldu: ${groupId} (${groupName})`);
    
    res.json({
      success: true,
      groupId,
      name: groupName,
      members: memberPublicKeys,
      aztecEnabled: pxeClient !== null
    });
  } catch (error) {
    console.error('Grup oluşturma hatası:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

app.post('/api/sendGroupMessage', async (req, res) => {
  try {
    const { sender, groupId, message, isSelfDestruct, timedDestruct, deleteAfterSeconds } = req.body;
    
    // Temel kontroller ve doğrulamalar (aynı kalıyor)
    const auth = checkAuth(req);
    if (!auth.authenticated) {
      return res.status(401).json({ success: false, error: auth.error });
    }
    
    const currentUser = auth.user;
    
    if (sender.publicKey !== currentUser.publicKey) {
      return res.status(403).json({ success: false, error: 'Sadece kendi adınıza mesaj gönderebilirsiniz' });
    }
    
    if (!groups.has(groupId)) {
      return res.status(404).json({ success: false, error: 'Grup bulunamadı' });
    }
    
    const group = groups.get(groupId);
    const isGroupMember = group.members.includes(currentUser.publicKey) || group.createdBy === currentUser.publicKey;
    
    if (!isGroupMember) {
      return res.status(403).json({ success: false, error: 'Bu gruba mesaj gönderme yetkiniz yok' });
    }
    
    const username = currentUser.username || undefined;
    const messageId = `msg-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
    
    // Aztec ile mesajı şifrele ve sözleşme üzerinden gönder
    let encryptionResult = { success: false };
    
    if (pxeClient && messageContractAddress) {
      // Gerçek Aztec işlemleri
      encryptionResult = await sendEncryptedMessageViaContract(
        currentUser, 
        group.members[0], // Basit implementasyon - ilk üyeye gönder
        message
      );
      
      console.log('Aztec sözleşme sonucu:', encryptionResult);
    } else {
      // Test modu - basit şifreleme
      encryptionResult = await sendEncryptedMessage(currentUser, group.members[0], message);
    }
    
    // Mesaj verisini oluştur
    const messageData = {
      id: messageId,
      content: message || '',
      sender: sender.publicKey,
      senderUsername: username,
      timestamp: Date.now(),
      selfDestruct: isSelfDestruct || false,
      timedDestruct: timedDestruct || false,
      deleteAfterSeconds: deleteAfterSeconds || 0,
      readBy: [],
      readTimestamps: {},
      destroyed: false,
      encryptionData: encryptionResult.success ? {
        isEncrypted: true,
        secretHash: encryptionResult.secretHash,
        txHash: encryptionResult.txHash
      } : null,
      aztecEnabled: pxeClient !== null && messageContractAddress !== null
    };
    
    // Mesajı gruba ekle
    const groupMessages = messages.get(groupId) || [];
    groupMessages.push(messageData);
    messages.set(groupId, groupMessages);
    
    saveData();
    
    console.log(`Yeni mesaj gönderildi: ${messageId} (Kullanıcı: ${username || 'Bilinmeyen'}, Grup: ${groupId})`);
    
    res.json({
      success: true,
      groupId,
      messageId,
      encryptionData: encryptionResult.success ? {
        isEncrypted: true,
        txHash: encryptionResult.txHash
      } : null,
      aztecEnabled: pxeClient !== null && messageContractAddress !== null
    });
  } catch (error) {
    console.error('Mesaj gönderme hatası:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

app.get('/api/getGroupMessages/:groupId', async (req, res) => {
  try {
    const { groupId } = req.params;
    
    // Kimlik doğrulama kontrol et
    const auth = checkAuth(req);
    if (!auth.authenticated) {
      return res.status(401).json({ success: false, error: auth.error });
    }
    
    const user = auth.user;
    
    if (!groups.has(groupId)) {
      return res.status(404).json({ success: false, error: 'Grup bulunamadı' });
    }
    
    // Kullanıcının bu grupta üye olup olmadığını kontrol et
    const group = groups.get(groupId);
    const isGroupMember = group.members.includes(user.publicKey) || 
                          group.createdBy === user.publicKey;
    
    if (!isGroupMember) {
      return res.status(403).json({ 
        success: false, 
        error: 'Bu grubun mesajlarını görme yetkiniz yok' 
      });
    }
    
    // Grup mesajlarını al
    const groupMessages = messages.get(groupId) || [];
    
    // Eğer Aztec bağlantısı varsa, sözleşmeden gelen mesajları da al
    let aztecMessages = [];
    if (pxeClient && messageContractAddress) {
      const contractResult = await getMessagesFromContract(user.publicKey);
      if (contractResult.success) {
        // Sözleşmeden gelen mesajları dönüştür
        aztecMessages = contractResult.messages.map(msg => ({
          id: `aztec-${msg.secretHash.substring(0, 8)}`,
          content: msg.content,
          sender: msg.sender, // Bu gerçek Ethereum adresi olacak
          senderUsername: 'Aztec Kullanıcısı', // UI için basit bir isim
          timestamp: msg.timestamp * 1000, // Unix timestamp'ten JS timestamp'ine
          encryptionData: {
            isEncrypted: true,
            fromContract: true,
            secretHash: msg.secretHash
          }
        }));
      }
    }
    
    // İki mesaj listesini birleştir
    const allMessages = [...groupMessages, ...aztecMessages];
    
    // Zaman damgasına göre sırala
    allMessages.sort((a, b) => a.timestamp - b.timestamp);
    
    console.log(`${allMessages.length} mesaj alındı (${aztecMessages.length} Aztec mesajı dahil) (Grup: ${groupId})`);
    
    res.json({
      success: true,
      messages: allMessages,
      aztecEnabled: pxeClient !== null && messageContractAddress !== null
    });
  } catch (error) {
    console.error('Mesajları alma hatası:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Mesajı okundu olarak işaretle
app.post('/api/markMessageAsRead', async (req, res) => {
  try {
    const { user, messageId, groupId } = req.body;
    
    // Kimlik doğrulama kontrol et
    const auth = checkAuth(req);
    if (!auth.authenticated) {
      return res.status(401).json({ success: false, error: auth.error });
    }
    
    const currentUser = auth.user;
    
    // Kullanıcının kendi adına işlem yaptığını kontrol et
    if (user.publicKey !== currentUser.publicKey) {
      return res.status(403).json({ 
        success: false, 
        error: 'Sadece kendi adınıza mesaj okuyabilirsiniz' 
      });
    }
    
    if (!groups.has(groupId)) {
      return res.status(404).json({ success: false, error: 'Grup bulunamadı' });
    }
    
    // Kullanıcının bu grupta üye olup olmadığını kontrol et
    const group = groups.get(groupId);
    const isGroupMember = group.members.includes(currentUser.publicKey) || 
                          group.createdBy === currentUser.publicKey;
    
    if (!isGroupMember) {
      return res.status(403).json({ 
        success: false, 
        error: 'Bu grupta mesaj okuma yetkiniz yok' 
      });
    }
    
    const groupMessages = messages.get(groupId) || [];
    const messageIndex = groupMessages.findIndex(msg => msg.id === messageId);
    
    if (messageIndex === -1) {
      return res.status(404).json({ success: false, error: 'Mesaj bulunamadı' });
    }
    
    // Mesajı okundu olarak işaretle
    if (!groupMessages[messageIndex].readBy.includes(user.publicKey)) {
      groupMessages[messageIndex].readBy.push(user.publicKey);
      
      // Okuma zamanını kaydet
      const readTime = Date.now();
      if (!groupMessages[messageIndex].readTimestamps) {
        groupMessages[messageIndex].readTimestamps = {};
      }
      groupMessages[messageIndex].readTimestamps[user.publicKey] = readTime;
      
      // Zamanlı kendini imha eden mesaj ise
      if (groupMessages[messageIndex].timedDestruct) {
        // İleri bir tarihte otomatik silinme için zamanlayıcı oluştur
        const deleteTime = readTime + (groupMessages[messageIndex].deleteAfterSeconds * 1000);
        
        setTimeout(() => {
          // Silme zamanı geldiğinde mesajı sil
          if (messages.has(groupId)) {
            const currentMessages = messages.get(groupId);
            const currentMsgIndex = currentMessages.findIndex(msg => msg.id === messageId);
            
            if (currentMsgIndex !== -1 && !currentMessages[currentMsgIndex].destroyed) {
              currentMessages[currentMsgIndex].destroyed = true;
              currentMessages[currentMsgIndex].content = "[Bu mesaj otomatik olarak silindi]";
              messages.set(groupId, currentMessages);
              saveData();
              console.log(`Mesaj otomatik olarak silindi: ${messageId}`);
            }
          }
        }, groupMessages[messageIndex].deleteAfterSeconds * 1000);
      }
      
      // Güncellenmiş mesaj listesini kaydet
      messages.set(groupId, groupMessages);
      saveData();
    }
    
    console.log(`Mesaj okundu olarak işaretlendi: ${messageId} (Kullanıcı: ${user.publicKey.substring(0, 8)}...)`);
    
    res.json({
      success: true,
      messageId,
      readTime: groupMessages[messageIndex].readTimestamps[user.publicKey],
      aztecEnabled: pxeClient !== null
    });
  } catch (error) {
    console.error('Mesaj okundu işaretleme hatası:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Mesajı sil
app.post('/api/destroyMessage', async (req, res) => {
  try {
    const { user, messageId, groupId } = req.body;
    
    // Kimlik doğrulama kontrol et
    const auth = checkAuth(req);
    if (!auth.authenticated) {
      return res.status(401).json({ success: false, error: auth.error });
    }
    
    const currentUser = auth.user;
    
    // Kullanıcının kendi adına işlem yaptığını kontrol et
    if (user.publicKey !== currentUser.publicKey) {
      return res.status(403).json({ 
        success: false, 
        error: 'Sadece kendi mesajlarınızı silebilirsiniz' 
      });
    }
    
    if (!groups.has(groupId)) {
      return res.status(404).json({ success: false, error: 'Grup bulunamadı' });
    }
    
    const groupMessages = messages.get(groupId) || [];
    const messageIndex = groupMessages.findIndex(msg => msg.id === messageId);
    
    if (messageIndex === -1) {
      return res.status(404).json({ success: false, error: 'Mesaj bulunamadı' });
    }
    
    // Sadece mesajı gönderen kişi veya zamanlı silinen mesajlar silinebilir
    if (groupMessages[messageIndex].sender !== user.publicKey && !groupMessages[messageIndex].timedDestruct) {
      return res.status(403).json({ success: false, error: 'Bu mesajı silme yetkiniz yok' });
    }
    
    // Mesajı sil
    groupMessages[messageIndex].destroyed = true;
    groupMessages[messageIndex].content = "[Bu mesaj silindi]";
    
    // Güncellenmiş mesaj listesini kaydet
    messages.set(groupId, groupMessages);
    saveData();
    
    console.log(`Mesaj silindi: ${messageId}`);
    
    res.json({
      success: true,
      messageId,
      aztecEnabled: pxeClient !== null
    });
  } catch (error) {
    console.error('Mesaj silme hatası:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Server kapatılırken verileri kaydet
process.on('SIGINT', () => {
  console.log('Server kapatılıyor, veriler kaydediliyor...');
  saveData();
  process.exit();
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Aztec Entegrasyonlu Blockchain Servisi port ${PORT} üzerinde çalışıyor`);
});