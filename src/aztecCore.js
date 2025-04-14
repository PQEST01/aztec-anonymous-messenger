// Gerçek SDK'yı import etmiyoruz
// import createAztecSdk from '@aztec/sdk';

// Tamamen mock bir SDK oluşturuyoruz
export async function initializeAztecSdk() {
  console.log('Mock Aztec SDK başlatılıyor...');
  return createMockAztecSdk();
}

// Kullanıcı oluşturma fonksiyonu
export async function createUser(aztecSdk, privateKey = null) {
  // Mock kullanıcı bilgilerini döndür
  return {
    userId: 'user-' + Math.random().toString(36).substring(2, 9),
    publicKey: 'pk-' + Math.random().toString(36).substring(2, 15),
    privateKey: 'sk-' + Math.random().toString(36).substring(2, 15),
  };
}

// Şifrelenmiş mesaj gönderme
export async function sendEncryptedMessage(aztecSdk, sender, receiverPublicKey, message) {
  try {
    console.log(`${sender.userId} kullanıcısından ${receiverPublicKey} adresine mesaj gönderiliyor: ${message}`);
    
    // Başarılı bir sonuç simüle et
    return {
      success: true,
      transactionId: 'tx-' + Math.random().toString(36).substring(2, 10),
      timestamp: Date.now(),
    };
  } catch (error) {
    return {
      success: false,
      error: error.message,
    };
  }
}

// Şifrelenmiş mesajı alma
export async function receiveEncryptedMessages(aztecSdk, user) {
  console.log(`${user.userId} kullanıcısının mesajları alınıyor...`);
  
  // Boş bir mesaj dizisi döndür
  return [];
}

// Grup oluşturma
export async function createGroup(aztecSdk, creator, groupName, memberPublicKeys) {
  console.log(`${creator.userId} kullanıcısı "${groupName}" adında bir grup oluşturuyor...`);
  
  // Mock bir grup ID'si oluştur
  const groupId = 'group-' + Math.random().toString(36).substring(2, 10);
  
  return {
    groupId: groupId,
    name: groupName,
    members: memberPublicKeys,
  };
}

// Grup mesajı gönderme
export async function sendGroupMessage(aztecSdk, sender, groupId, message) {
  console.log(`${sender.userId} kullanıcısı ${groupId} grubuna mesaj gönderiyor: ${message}`);
  
  // Mock bir mesaj gönderimi simüle et
  return {
    success: true,
    groupId,
    transactionId: 'tx-' + Math.random().toString(36).substring(2, 10),
  };
}

// Silinebilir mesaj gönderme
export async function sendSelfDestructMessage(aztecSdk, sender, groupId, message) {
  console.log(`${sender.userId} kullanıcısı ${groupId} grubuna silinebilir mesaj gönderiyor: ${message}`);
  
  // Mock bir mesaj ID'si oluştur
  const messageId = 'msg-' + Math.random().toString(36).substring(2, 10);
  
  return {
    success: true,
    groupId,
    transactionId: messageId,
  };
}

// Belirli bir süre sonra kendini imha eden mesaj gönderme
export async function sendTimedSelfDestructMessage(aztecSdk, sender, groupId, message, deleteAfterSeconds) {
  console.log(`${sender.userId} kullanıcısı ${groupId} grubuna ${deleteAfterSeconds} saniye sonra silinecek mesaj gönderiyor: ${message}`);
  
  // Mock bir mesaj ID'si oluştur
  const messageId = 'msg-' + Math.random().toString(36).substring(2, 10);
  
  return {
    success: true,
    groupId,
    transactionId: messageId,
  };
}

// Mesajı okundu olarak işaretle
export async function markMessageAsRead(aztecSdk, user, messageId, groupId) {
  console.log(`${user.userId} kullanıcısı ${messageId} mesajını okudu olarak işaretliyor...`);
  
  return {
    success: true,
    messageId
  };
}

// Mesajı okundu olarak işaretle ve zamanlayıcıyı başlat
export async function markMessageAsReadWithTimer(aztecSdk, user, messageId, groupId) {
  console.log(`${user.userId} kullanıcısı ${messageId} mesajını okudu ve zamanlayıcı başlatıldı...`);
  
  const readTime = Date.now();
  const deleteAfterSeconds = 30; // Varsayılan değer
  
  return {
    success: true,
    messageId,
    readTime,
    deleteTime: readTime + (deleteAfterSeconds * 1000)
  };
}

// Mesajı imha et
export async function destroyMessage(aztecSdk, user, messageId, groupId) {
  console.log(`${user.userId} kullanıcısı ${messageId} mesajını siliyor...`);
  
  return {
    success: true,
    messageId
  };
}

// Zamanlı silinen mesajları kontrol et
export async function checkAndDestroyTimedMessages(aztecSdk, groupId) {
  console.log(`${groupId} grubundaki zamanlı mesajlar kontrol ediliyor...`);
  
  return {
    success: true,
    destroyedCount: 0,
    destroyedMessages: []
  };
}

// Fotoğraflı mesaj gönderme
export async function sendPhotoMessage(aztecSdk, sender, groupId, message, imageData) {
  console.log(`${sender.userId} kullanıcısı ${groupId} grubuna fotoğraflı mesaj gönderiyor...`);
  
  return {
    success: true,
    groupId,
    transactionId: 'tx-' + Math.random().toString(36).substring(2, 10),
  };
}

// Silinebilir fotoğraflı mesaj gönderme
export async function sendSelfDestructPhotoMessage(aztecSdk, sender, groupId, message, imageData) {
  console.log(`${sender.userId} kullanıcısı ${groupId} grubuna silinebilir fotoğraflı mesaj gönderiyor...`);
  
  return {
    success: true,
    groupId,
    transactionId: 'tx-' + Math.random().toString(36).substring(2, 10),
  };
}

// Zamanlı kendini imha eden fotoğraflı mesaj gönderme
export async function sendTimedSelfDestructPhotoMessage(aztecSdk, sender, groupId, message, imageData, deleteAfterSeconds) {
  console.log(`${sender.userId} kullanıcısı ${groupId} grubuna ${deleteAfterSeconds} saniye sonra silinecek fotoğraflı mesaj gönderiyor...`);
  
  return {
    success: true,
    groupId,
    transactionId: 'tx-' + Math.random().toString(36).substring(2, 10),
  };
}

// Link oluşturma fonksiyonu
export function createInviteLink(groupId, baseUrl) {
  // baseUrl yoksa mevcut URL'yi kullan
  if (!baseUrl) {
    baseUrl = typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000';
  }
  
  return `${baseUrl}/join/${groupId}`;
}

// Mock SDK oluştur
function createMockAztecSdk() {
  const storedMessages = []; // Mesajları saklamak için
  const storedGroups = {};   // Grupları saklamak için
  
  return {
    // Temel metodları taklit et
    createUser: () => {
      const userId = 'user-' + Math.random().toString(36).substring(2, 9);
      const publicKey = 'pk-' + Math.random().toString(36).substring(2, 15);
      const privateKey = 'sk-' + Math.random().toString(36).substring(2, 15);
      
      return { 
        id: userId, 
        getPublicKey: () => publicKey,
        getPrivateKey: () => ({ toString: () => privateKey })
      };
    },
    
    addUser: () => {
      const userId = 'user-' + Math.random().toString(36).substring(2, 9);
      const publicKey = 'pk-' + Math.random().toString(36).substring(2, 15);
      const privateKey = 'sk-' + Math.random().toString(36).substring(2, 15);
      
      return { 
        id: userId, 
        getPublicKey: () => publicKey,
        getPrivateKey: () => ({ toString: () => privateKey })
      };
    },
    
    encrypt: (publicKey, data) => data,
    decrypt: (userId, data) => data,
    
    sendPrivateTransaction: async (params) => {
      const messageId = 'msg-' + Math.random().toString(36).substring(2, 10);
      
      // Mesajı sakla
      if (params.proof === 'groupMessage') {
        storedMessages.push({
          id: messageId,
          senderId: params.sender,
          data: params.data,
          timestamp: Date.now(),
          relatedNote: params.relatedNote,
          proof: params.proof
        });
      }
      
      return messageId;
    },
    
    getPrivateTransactions: async (params) => {
      // İlgili mesajları filtrele
      if (params.proofType === 'groupMessage' && params.relatedNote) {
        return storedMessages.filter(msg => 
          msg.proof === params.proofType && 
          msg.relatedNote === params.relatedNote
        );
      }
      
      return storedMessages;
    },
    
    getPrivateTransaction: async (messageId) => {
      const message = storedMessages.find(msg => msg.id === messageId);
      return message || { data: JSON.stringify({}) };
    },
    
    updatePrivateTransaction: async (messageId, newData) => {
      const index = storedMessages.findIndex(msg => msg.id === messageId);
      if (index !== -1) {
        storedMessages[index].data = newData;
      }
      return true;
    },
    
    createNoteHash: (data) => {
      return 'note-' + Math.random().toString(36).substring(2, 10);
    },
    
    getPrivateNote: async (groupId) => {
      // String'e çevir
      const groupIdStr = typeof groupId === 'object' ? groupId.toString() : groupId;
      
      if (storedGroups[groupIdStr]) {
        return storedGroups[groupIdStr];
      }
      
      // Varsayılan grup bilgisini döndür
      return JSON.stringify({
        name: 'Test Grubu',
        members: [],
        createdAt: Date.now(),
        createdBy: 'pk-default'
      });
    },
    
    updatePrivateNote: async (groupId, newData) => {
      // String'e çevir
      const groupIdStr = typeof groupId === 'object' ? groupId.toString() : groupId;
      
      storedGroups[groupIdStr] = newData;
      return true;
    }
  };
}