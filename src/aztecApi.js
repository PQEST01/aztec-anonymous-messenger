// API endpoint temel URL'i
const API_BASE_URL = 'http://localhost:3001/api';

// Kullanıcı oluşturma
export async function createUser() {
  try {
    const sessionId = localStorage.getItem('sessionId');
    const response = await fetch(`${API_BASE_URL}/createUser`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': sessionId
      }
    });
    
    return await response.json();
  } catch (error) {
    console.error('API hatası - createUser:', error);
    return { success: false, error: error.message };
  }
}

// Grup oluşturma
export async function createGroup(creator, groupName, memberPublicKeys) {
  try {
    const sessionId = localStorage.getItem('sessionId');
    if (!sessionId) {
      return { success: false, error: 'Oturum bulunamadı' };
    }
    
    const response = await fetch(`${API_BASE_URL}/createGroup`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': sessionId
      },
      body: JSON.stringify({
        creator,
        groupName,
        memberPublicKeys
      })
    });
    
    return await response.json();
  } catch (error) {
    console.error('API hatası - createGroup:', error);
    return { success: false, error: error.message };
  }
}

// Grup mesajı gönderme
export async function sendGroupMessage(sender, groupId, message, options = {}) {
  try {
    const { isSelfDestruct, timedDestruct, deleteAfterSeconds } = options;
    const sessionId = localStorage.getItem('sessionId');
    
    if (!sessionId) {
      return { success: false, error: 'Oturum bulunamadı' };
    }
    
    console.log('Mesaj gönderiliyor:', { sender, groupId, message, options });
    
    const response = await fetch(`${API_BASE_URL}/sendGroupMessage`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': sessionId
      },
      body: JSON.stringify({
        sender: {
          ...sender,  // Tüm kullanıcı bilgilerini gönder
          publicKey: sender.publicKey || sender.userId  // Eski/yeni yapıyla uyumluluk
        },
        groupId,
        message,
        isSelfDestruct,
        timedDestruct,
        deleteAfterSeconds
      })
    });
    
    const result = await response.json();
    console.log('Mesaj gönderme yanıtı:', result);
    
    return result;
  } catch (error) {
    console.error('API hatası - sendGroupMessage:', error);
    return { success: false, error: error.message };
  }
}

// Grup mesajlarını getirme
export async function getGroupMessages(groupId) {
  try {
    const sessionId = localStorage.getItem('sessionId');
    
    if (!sessionId) {
      return { success: false, error: 'Oturum bulunamadı' };
    }
    
    const response = await fetch(`${API_BASE_URL}/getGroupMessages/${groupId}`, {
      headers: {
        'Authorization': sessionId
      }
    });
    
    return await response.json();
  } catch (error) {
    console.error('API hatası - getGroupMessages:', error);
    return { success: false, error: error.message };
  }
}

// Mesajı okundu olarak işaretleme
export async function markMessageAsRead(user, messageId, groupId) {
  try {
    const sessionId = localStorage.getItem('sessionId');
    
    if (!sessionId) {
      return { success: false, error: 'Oturum bulunamadı' };
    }
    
    const response = await fetch(`${API_BASE_URL}/markMessageAsRead`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': sessionId
      },
      body: JSON.stringify({
        user,
        messageId,
        groupId
      })
    });
    
    return await response.json();
  } catch (error) {
    console.error('API hatası - markMessageAsRead:', error);
    return { success: false, error: error.message };
  }
}

// Mesajı silme
export async function destroyMessage(user, messageId, groupId) {
  try {
    const sessionId = localStorage.getItem('sessionId');
    
    if (!sessionId) {
      return { success: false, error: 'Oturum bulunamadı' };
    }
    
    const response = await fetch(`${API_BASE_URL}/destroyMessage`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': sessionId
      },
      body: JSON.stringify({
        user,
        messageId,
        groupId
      })
    });
    
    return await response.json();
  } catch (error) {
    console.error('API hatası - destroyMessage:', error);
    return { success: false, error: error.message };
  }
}

// Kullanıcının gruplarını getirme
export async function getUserGroups(walletAddress) {
  try {
    const sessionId = localStorage.getItem('sessionId');
    
    if (!sessionId) {
      return { success: false, error: 'Oturum bulunamadı' };
    }
    
    const response = await fetch(`${API_BASE_URL}/user/groups/${walletAddress}`, {
      headers: {
        'Authorization': sessionId
      }
    });
    
    return await response.json();
  } catch (error) {
    console.error('API hatası - getUserGroups:', error);
    return { success: false, error: error.message };
  }
}

// Grup bilgilerini getirme
export async function getGroupInfo(groupId, inviteMode = true) {
  try {
    const sessionId = localStorage.getItem('sessionId');
    
    if (!sessionId) {
      return { success: false, error: 'Oturum bulunamadı' };
    }
    
    const response = await fetch(`${API_BASE_URL}/groups/${groupId}?invite=${inviteMode}`, {
      headers: {
        'Authorization': sessionId
      }
    });
    
    return await response.json();
  } catch (error) {
    console.error('API hatası - getGroupInfo:', error);
    return { success: false, error: error.message };
  }
}