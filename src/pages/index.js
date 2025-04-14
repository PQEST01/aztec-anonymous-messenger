import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { createGroup, sendGroupMessage, getGroupMessages, destroyMessage, getUserGroups } from '../aztecApi';
import WalletConnect from '../components/WalletConnect';

export default function Home() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);
  const [walletInfo, setWalletInfo] = useState(null);
  const [message, setMessage] = useState('');
  const [groups, setGroups] = useState([]);
  const [messages, setMessages] = useState([]);
  const [currentGroup, setCurrentGroup] = useState(null);
  const [groupName, setGroupName] = useState('');
  const [inviteLink, setInviteLink] = useState('');
  const [isSelfDestruct, setIsSelfDestruct] = useState(false);
  const [isTimedDestruct, setIsTimedDestruct] = useState(false);
  const [deleteAfterSeconds, setDeleteAfterSeconds] = useState(30);
  
  // Cüzdan bağlandığında çağrılacak
  const handleWalletConnect = async (walletData) => {
    setLoading(true);
    setWalletInfo(walletData);
    
    try {
      // Backend'e kimlik doğrulama isteği gönder
      const response = await fetch('http://localhost:3001/api/auth/wallet', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          address: walletData.address,
          message: walletData.message,
          signature: walletData.signature,
          timestamp: walletData.timestamp
        })
      });
      
      const data = await response.json();
      
      if (data.success) {
        // Oturum ID'sini sakla
        localStorage.setItem('sessionId', data.sessionId);
        
        // Kullanıcı bilgilerini ayarla
        setUser(data.user);
        
        // Kullanıcının gruplarını getir
        fetchUserGroups(walletData.address);
      } else {
        console.error('Kimlik doğrulama hatası:', data.error);
        alert('Cüzdan bağlantısı başarısız: ' + data.error);
      }
    } catch (error) {
      console.error('Bağlantı hatası:', error);
      alert('Sunucu bağlantı hatası. Lütfen daha sonra tekrar deneyin.');
    } finally {
      setLoading(false);
    }
  };
  
  // Cüzdan bağlantısı kesildiğinde çağrılacak
  const handleWalletDisconnect = () => {
    console.log('Cüzdan bağlantısı kesildi, oturum sonlandırılıyor...');
    clearUserData();
    router.push('/');
  };
  
  // Kullanıcı gruplarını getir
  const fetchUserGroups = async (walletAddress) => {
    try {
      const result = await getUserGroups(walletAddress);
      
      if (result.success) {
        setGroups(result.groups);
        if (result.groups.length > 0) {
          setCurrentGroup(result.groups[0]);
          // İlgili grubun davet linkini ayarla
          setInviteLink(window.location.origin + "/join/" + result.groups[0].groupId);
        }
      } else {
        console.error('Grupları alma hatası:', result.error);
        
        // Eğer yetki hatası varsa, kullanıcı verilerini temizle
        if (result.error.includes('Yetkisiz erişim')) {
          clearUserData();
        }
      }
    } catch (error) {
      console.error('Grupları alma hatası:', error);
    }
  };
  
  // Oturum kontrolü
  useEffect(() => {
    async function checkSession() {
      const sessionId = localStorage.getItem('sessionId');
      
      if (!sessionId) {
        clearUserData();
        setLoading(false);
        return;
      }
      
      try {
        const response = await fetch(`http://localhost:3001/api/auth/session/${sessionId}`, {
          headers: {
            'Authorization': sessionId
          }
        });
        
        const data = await response.json();
        
        if (data.success) {
          setUser(data.user);
          fetchUserGroups(data.user.walletAddress);
        } else {
          localStorage.removeItem('sessionId');
          clearUserData();
        }
      } catch (error) {
        console.error('Oturum kontrolü hatası:', error);
        localStorage.removeItem('sessionId');
        clearUserData();
      }
      
      setLoading(false);
    }
    
    setLoading(true);
    checkSession();
  }, []);
  
  // Kullanıcı verilerini temizle
  const clearUserData = () => {
    setUser(null);
    setGroups([]);
    setMessages([]);
    setCurrentGroup(null);
    setInviteLink('');
    localStorage.removeItem('sessionId');
    localStorage.removeItem('userGroups');
  };
  
  // Çıkış yap
  const handleLogout = () => {
    clearUserData();
    alert('Çıkış yapıldı.');
  };
  
  // Grup seçildiğinde mesajları getir - sadece kullanıcı giriş yaptıysa
  useEffect(() => {
    if (currentGroup && user) {
      fetchMessages(currentGroup.groupId);
    } else {
      // Kullanıcı giriş yapmamışsa mesajları temizle
      setMessages([]);
    }
  }, [currentGroup, user]);
  
  // Mesajları getirme
  async function fetchMessages(groupId) {
    if (!user) {
      setMessages([]);
      return;
    }
    
    try {
      const sessionId = localStorage.getItem('sessionId');
      if (!sessionId) {
        clearUserData();
        return;
      }
      
      const result = await getGroupMessages(groupId);
      
      if (result.success) {
        setMessages(result.messages);
      } else {
        console.error('Mesajları alma hatası:', result.error);
        
        // Eğer yetki hatası varsa, kullanıcı verilerini temizle
        if (result.error.includes('Yetkisiz erişim')) {
          clearUserData();
        }
      }
    } catch (error) {
      console.error('Mesajları alma hatası:', error);
    }
  }
  
  // Grup oluşturma fonksiyonu
  async function handleCreateGroup() {
    if (!groupName || !user) return;
    
    try {
      const result = await createGroup(
        user,
        groupName,
        [user.publicKey] // Başlangıçta sadece grup oluşturucu
      );
      
      if (result.success) {
        // Grubu state'e ekle
        setGroups(prev => [...prev, result]);
        setCurrentGroup(result);
        
        // Davet linkini oluştur
        const link = window.location.origin + "/join/" + result.groupId;
        setInviteLink(link);
        setGroupName('');
        
        alert(`Grup oluşturuldu! Grup ID: ${result.groupId}`);
      } else {
        alert(`Hata: ${result.error}`);
        
        // Eğer yetki hatası varsa, kullanıcı verilerini temizle
        if (result.error.includes('Yetkisiz erişim')) {
          clearUserData();
        }
      }
    } catch (error) {
      console.error('Grup oluşturma hatası:', error);
      alert('Grup oluşturulamadı.');
    }
  }
  
  // Grup mesajı gönderme
  async function handleSendGroupMessage() {
    if (!message || !currentGroup || !user) return;
    
    try {
      const result = await sendGroupMessage(
        user,
        currentGroup.groupId,
        message,
        {
          isSelfDestruct,
          timedDestruct: isTimedDestruct,
          deleteAfterSeconds
        }
      );
      
      if (result.success) {
        setMessage('');
        fetchMessages(currentGroup.groupId);
        
        // Mesaj gönderildikten sonra seçenekleri sıfırla
        setIsSelfDestruct(false);
        setIsTimedDestruct(false);
      } else {
        alert(`Hata: ${result.error}`);
        
        // Eğer yetki hatası varsa, kullanıcı verilerini temizle
        if (result.error.includes('Yetkisiz erişim')) {
          clearUserData();
        }
      }
    } catch (error) {
      console.error('Grup mesajı gönderme hatası:', error);
      alert('Grup mesajı gönderilemedi.');
    }
  }
  
  // Mesajı sil
  async function handleDestroyMessage(messageId) {
    if (!user) return;
    
    try {
      const result = await destroyMessage(user, messageId, currentGroup.groupId);
      
      if (result.success) {
        fetchMessages(currentGroup.groupId);
      } else {
        alert(`Hata: ${result.error}`);
        
        // Eğer yetki hatası varsa, kullanıcı verilerini temizle
        if (result.error.includes('Yetkisiz erişim')) {
          clearUserData();
        }
      }
    } catch (error) {
      console.error('Mesaj silme hatası:', error);
      alert('Mesaj silinemedi.');
    }
  }
  
  if (loading) {
    return <div className="container loading">Yükleniyor...</div>;
  }
  
  return (
    <div className="container">
      <h1>Aztec Anonim Mesajlaşma</h1>
      
      {!user ? (
        // Cüzdan bağlanmadan önce sadece bu kısmı göster
        <div className="welcome-container">
          <div className="welcome-box">
            <h2>Hoş Geldiniz!</h2>
            <p>Gizli mesajlaşma platformuna hoş geldiniz. Başlamak için lütfen kripto cüzdanınızı bağlayın.</p>
            <p>Cüzdan bağlandıktan sonra grup oluşturabilir veya davet edildiğiniz gruplara katılabilirsiniz.</p>
            
            <div className="wallet-connect-container">
              <WalletConnect onConnect={handleWalletConnect} onDisconnect={handleWalletDisconnect} />
            </div>
          </div>
        </div>
      ) : (
        // Cüzdan bağlandıktan sonra tüm uygulama arayüzünü göster
        <>
          <div className="user-section">
            <div className="user-info">
              <div>
                <h2>Kullanıcı Bilgileri</h2>
                <p><strong>Kullanıcı Adı:</strong> {user.username || 'İsimsiz'}</p>
                <p><strong>Cüzdan Adresi:</strong> {user.walletAddress}</p>
                <p className="warning">Özel anahtarınızı kimseyle paylaşmayın!</p>
              </div>
              
              <div className="user-actions">
                <WalletConnect onConnect={handleWalletConnect} onDisconnect={handleWalletDisconnect} />
                <button onClick={handleLogout} className="logout-btn">Çıkış Yap</button>
              </div>
            </div>
          </div>
          
          <div className="app-layout">
            <div className="sidebar">
              <div className="groups">
                <h2>Gruplar</h2>
                
                <div className="input-group">
                  <input
                    type="text"
                    placeholder="Grup adı"
                    value={groupName}
                    onChange={(e) => setGroupName(e.target.value)}
                  />
                  <button onClick={handleCreateGroup}>Grup Oluştur</button>
                </div>
                
                {inviteLink && (
                  <div className="invite-link">
                    <p><strong>Davet Linki:</strong></p>
                    <input type="text" readOnly value={inviteLink} />
                    <button onClick={() => {
                      navigator.clipboard.writeText(inviteLink);
                      alert('Link kopyalandı!');
                    }}>
                      Kopyala
                    </button>
                  </div>
                )}
                
                <div className="group-list">
                  <h3>Gruplarınız</h3>
                  {groups.length === 0 ? (
                    <p>Yeni bir grup oluşturmak için yukarıdaki formu kullanın.</p>
                  ) : (
                    <ul>
                      {groups.map(group => (
                        <li key={group.groupId}>
                          <button 
                            onClick={() => setCurrentGroup(group)}
                            className={currentGroup?.groupId === group.groupId ? 'active' : ''}
                          >
                            {group.name}
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>
            </div>
            
            <div className="chat-area">
              <div className="messages">
                <h2>{currentGroup ? `${currentGroup.name} - Mesajlar` : 'Mesajlar'}</h2>
                {!currentGroup ? (
                  <p className="no-group-selected">Lütfen sol taraftan bir grup seçin veya yeni bir grup oluşturun.</p>
                ) : messages.length === 0 ? (
                  <p>Henüz mesaj yok.</p>
                ) : (
                  <ul>
                    {messages.map(msg => (
                      <li 
                        key={msg.id} 
                        className={`
                          ${msg.sender === user?.publicKey ? 'own-message' : ''} 
                          ${msg.selfDestruct ? 'self-destruct-message' : ''}
                          ${msg.timedDestruct ? 'timed-destruct-message' : ''}
                          ${msg.destroyed ? 'destroyed-message' : ''}
                        `}
                      >
                        <p className="sender">
                          {msg.sender === user?.publicKey 
                            ? 'Siz' 
                            : msg.senderUsername || msg.sender.substring(0, 8) + '...'}
                          
                          {msg.selfDestruct && !msg.destroyed && (
                            msg.timedDestruct 
                              ? <span className="timed-destruct-badge">
                                  {msg.deleteAfterSeconds}sn sonra silinecek
                                </span>
                              : <span className="self-destruct-badge">Silinebilir</span>
                          )}
                        </p>
                        
                        <p className="content">{msg.content}</p>
                        
                        <div className="message-actions">
                          <p className="timestamp">
                            {new Date(msg.timestamp).toLocaleString()}
                          </p>
                          
                          {msg.selfDestruct && !msg.timedDestruct && 
                            msg.sender === user?.publicKey && 
                            msg.readBy?.length > 0 && !msg.destroyed && (
                            <button 
                              className="destroy-button"
                              onClick={() => handleDestroyMessage(msg.id)}
                            >
                              Mesajı Sil
                            </button>
                          )}
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
              
              {currentGroup && (
                <div className="messaging">
                  <div className="input-group">
                    <textarea
                      placeholder="Mesajınız..."
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                    />
                  </div>
                  
                  <div className="message-options">
                    <label className="option">
                      <input
                        type="checkbox"
                        checked={isSelfDestruct}
                        onChange={(e) => {
                          setIsSelfDestruct(e.target.checked);
                          if (!e.target.checked) {
                            setIsTimedDestruct(false);
                          }
                        }}
                      />
                      <span>Mesaj Okunduktan Sonra Silinebilir</span>
                    </label>
                    
                    {isSelfDestruct && (
                      <label className="option">
                        <input
                          type="checkbox"
                          checked={isTimedDestruct}
                          onChange={(e) => setIsTimedDestruct(e.target.checked)}
                        />
                        <span>Otomatik Sil</span>
                      </label>
                    )}
                    
                    {isTimedDestruct && (
                      <div className="timer-selector">
                        <label>Süre:</label>
                        <select 
                          value={deleteAfterSeconds}
                          onChange={(e) => setDeleteAfterSeconds(Number(e.target.value))}
                        >
                          <option value="5">5 saniye</option>
                          <option value="10">10 saniye</option>
                          <option value="30">30 saniye</option>
                          <option value="60">1 dakika</option>
                          <option value="300">5 dakika</option>
                        </select>
                      </div>
                    )}
                  </div>
                  
                  <button onClick={handleSendGroupMessage} className="send-button">
                    {isTimedDestruct 
                      ? `${deleteAfterSeconds}sn Sonra Silinecek Mesaj Gönder` 
                      : isSelfDestruct 
                        ? 'Silinebilir Mesaj Gönder' 
                        : 'Gönder'}
                  </button>
                </div>
              )}
            </div>
          </div>
        </>
      )}
      
      <style jsx>{`
        body {
          margin: 0;
          padding: 0;
        }
        
        .container {
          max-width: 100%;
          margin: 0 auto;
          padding: 20px;
          font-family: Arial, sans-serif;
          background-color: #121212;
          color: #e0e0e0;
          min-height: 100vh;
        }
        
        .loading {
          display: flex;
          justify-content: center;
          align-items: center;
          height: 100vh;
          font-size: 1.5rem;
        }
        
        h1, h2, h3 {
          color: #f0f0f0;
        }
        
        h1 {
          text-align: center;
          margin-bottom: 30px;
        }
        
        .welcome-container {
          display: flex;
          justify-content: center;
          align-items: center;
          min-height: 80vh;
        }
        
        .welcome-box {
          background-color: #1e1e1e;
          padding: 40px;
          border-radius: 10px;
          margin: 20px 0;
          text-align: center;
          border: 1px solid #333;
          max-width: 500px;
          width: 100%;
          box-shadow: 0 10px 25px rgba(0, 0, 0, 0.3);
        }
        
        .wallet-connect-container {
          margin-top: 30px;
        }
        
        .user-section {
          margin-bottom: 20px;
        }
        
        .user-info {
          background-color: #1e1e1e;
          padding: 15px;
          border-radius: 5px;
          margin-bottom: 20px;
          border: 1px solid #333;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }
        
        .user-actions {
          display: flex;
          flex-direction: column;
          gap: 10px;
          align-items: flex-end;
        }
        
        .logout-btn {
          background-color: #e53935;
          color: white;
          border: none;
          padding: 8px 12px;
          border-radius: 4px;
          cursor: pointer;
        }
        
        .logout-btn:hover {
          background-color: #c62828;
        }
        
        .warning {
          color: #ff6b6b;
          font-weight: bold;
        }
        
        .app-layout {
          display: flex;
          gap: 20px;
          height: calc(100vh - 200px);
          min-height: 500px;
        }
        
        .sidebar {
          width: 300px;
          background-color: #1e1e1e;
          border-radius: 5px;
          padding: 15px;
          border: 1px solid #333;
          overflow-y: auto;
        }
        
        .chat-area {
          flex: 1;
          display: flex;
          flex-direction: column;
          background-color: #1e1e1e;
          border-radius: 5px;
          border: 1px solid #333;
        }
        
        .messages {
          flex: 1;
          padding: 15px;
          overflow-y: auto;
        }
        
        .messaging {
          padding: 15px;
          border-top: 1px solid #333;
          background-color: #1a1a1a;
        }
        
        .input-group {
          margin-bottom: 15px;
        }
        
        input, textarea {
          width: 100%;
          padding: 10px;
          border: 1px solid #444;
          border-radius: 4px;
          margin-bottom: 10px;
          background-color: #2a2a2a;
          color: #e0e0e0;
        }
        
        textarea {
          height: 100px;
          resize: vertical;
        }
        
        button {
          background-color: #0070f3;
          color: white;
          border: none;
          padding: 10px 15px;
          border-radius: 4px;
          cursor: pointer;
          margin-right: 10px;
          margin-bottom: 10px;
        }
        
        button:hover {
          background-color: #0060df;
        }
        
        .send-button {
          width: 100%;
          margin-right: 0;
        }
        
        .active {
          background-color: #004bac;
        }
        
        .messages ul, .group-list ul {
          list-style: none;
          padding: 0;
        }
        
        .messages li {
          background-color: #2a2a2a;
          padding: 10px;
          border-radius: 5px;
          margin-bottom: 10px;
          border-left: 3px solid #444;
        }
        
        .own-message {
          background-color: #1e3a5f !important;
          border-left: 3px solid #0070f3 !important;
        }
        
        .self-destruct-message {
          border-left: 3px solid #ff9800 !important;
        }
        
        .timed-destruct-message {
          border-left: 3px solid #9c27b0 !important;
        }
        
        .destroyed-message {
          opacity: 0.6;
          background-color: #1a1a1a !important;
          border-left: 3px solid #f44336 !important;
        }
        
        .sender {
          font-weight: bold;
          margin-bottom: 5px;
          color: #f0f0f0;
        }
        
        .content {
          margin-bottom: 10px;
        }
        
        .timestamp {
          font-size: 0.8em;
          color: #aaa;
          text-align: right;
        }
        
        .invite-link {
          background-color: #1e3a5f;
          padding: 10px;
          border-radius: 5px;
          margin: 15px 0;
          border: 1px solid #0070f3;
        }
        
        .invite-link input {
          background-color: #2c2c2c;
        }
        
        .message-options {
          margin: 10px 0;
          display: flex;
          flex-wrap: wrap;
          align-items: center;
          gap: 15px;
        }
        
        .option {
          display: flex;
          align-items: center;
          cursor: pointer;
        }
        
        .option input {
          margin-right: 5px;
          width: auto;
        }
        
        .timer-selector {
          display: flex;
          align-items: center;
        }
        
        .timer-selector label {
          margin-right: 10px;
        }
        
        .timer-selector select {
          padding: 5px;
          border-radius: 4px;
          background-color: #2a2a2a;
          color: #e0e0e0;
          border: 1px solid #444;
        }
        
        .self-destruct-badge {
          font-size: 0.7em;
          background-color: #ff9800;
          color: white;
          padding: 2px 5px;
          border-radius: 10px;
          margin-left: 5px;
        }
        
        .timed-destruct-badge {
          font-size: 0.7em;
          background-color: #9c27b0;
          color: white;
          padding: 2px 5px;
          border-radius: 10px;
          margin-left: 5px;
        }
        
        .destroy-button {
          background-color: #f44336;
          font-size: 0.8em;
          padding: 5px 10px;
        }
        
        .no-group-selected {
          text-align: center;
          margin-top: 50px;
          color: #999;
        }
      `}</style>
    </div>
  );
}