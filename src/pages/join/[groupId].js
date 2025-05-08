import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { getGroupMessages, sendGroupMessage, getGroupInfo } from '../../aztecApi';
import WalletConnect from '../../components/WalletConnect';

export default function JoinGroup() {
  const router = useRouter();
  const { groupId } = router.query;
  
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);
  const [walletInfo, setWalletInfo] = useState(null);
  const [groupInfo, setGroupInfo] = useState(null);
  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState([]);
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
        
        // Grup bilgilerini ve mesajları getir
        if (groupId) {
          fetchGroupInfo();
        }
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
  
  // Kullanıcı verilerini temizle
  const clearUserData = () => {
    setUser(null);
    setGroupInfo(null);
    setMessages([]);
    localStorage.removeItem('sessionId');
  };
  
  // Çıkış yap
  const handleLogout = () => {
    clearUserData();
    alert('Çıkış yapıldı.');
    router.push('/');
  };
  
  // Oturum kontrolü
  useEffect(() => {
    if (!groupId) return;
    
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
          fetchGroupInfo();
        } else {
          localStorage.removeItem('sessionId');
          clearUserData();
          setLoading(false);
        }
      } catch (error) {
        console.error('Oturum kontrolü hatası:', error);
        localStorage.removeItem('sessionId');
        clearUserData();
        setLoading(false);
      }
    }
    
    setLoading(true);
    checkSession();
  }, [groupId]);
  
 // Grup bilgilerini getir
async function fetchGroupInfo() {
  if (!groupId) return;
  
  try {
    const result = await getGroupInfo(groupId, true); // invite modunu true olarak gönder
    
    if (result.success) {
      setGroupInfo(result.group);
      
      // Eğer yeni katıldıysak, kullanıcıya bildir
      if (result.joined) {
        alert('Gruba başarıyla katıldınız!');
      }
      
      fetchMessages();
    } else {
      console.error('Grup bilgisi alma hatası:', result.error);
      if (result.error.includes('Yetkisiz erişim') || result.error.includes('erişim yetkiniz yok')) {
        alert('Bu gruba erişim yetkiniz yok. Ana sayfaya yönlendiriliyorsunuz.');
        router.push('/');
      }
    }
    
    setLoading(false);
  } catch (error) {
    console.error('Grup bilgisi alma hatası:', error);
    setLoading(false);
  }
}
  // Mesajları getir
  async function fetchMessages() {
    if (!groupId || !user) return;
    
    try {
      const result = await getGroupMessages(groupId);
      
      if (result.success) {
        setMessages(result.messages);
      } else {
        console.error('Mesajları alma hatası:', result.error);
        if (result.error.includes('Yetkisiz erişim') || result.error.includes('erişim yetkiniz yok')) {
          clearUserData();
        }
      }
    } catch (error) {
      console.error('Mesajları alma hatası:', error);
    }
  }
  
  // Grup mesajı gönderme
  async function handleSendGroupMessage() {
    if (!message || !user || !groupId) return;
    
    try {
      const result = await sendGroupMessage(
        user,
        groupId,
        message,
        {
          isSelfDestruct,
          timedDestruct: isTimedDestruct,
          deleteAfterSeconds
        }
      );
      
      if (result.success) {
        setMessage('');
        fetchMessages();
        
        // Mesaj gönderildikten sonra seçenekleri sıfırla
        setIsSelfDestruct(false);
        setIsTimedDestruct(false);
      } else {
        alert(`Hata: ${result.error}`);
        if (result.error.includes('Yetkisiz erişim') || result.error.includes('erişim yetkiniz yok')) {
          clearUserData();
        }
      }
    } catch (error) {
      console.error('Grup mesajı gönderme hatası:', error);
      alert('Grup mesajı gönderilemedi.');
    }
  }
  
  if (loading) {
    return <div className="container loading">Yükleniyor...</div>;
  }
  
  return (
    <div className="container">
      <h1>Grup Sohbeti</h1>
      
      <div className="nav-buttons">
        <button onClick={() => router.push('/')}>Ana Sayfaya Dön</button>
        {user && <button onClick={handleLogout} className="logout-btn">Çıkış Yap</button>}
      </div>
      
      {!user ? (
        <div className="wallet-section">
          <h2>Cüzdan Bağlantısı Gerekli</h2>
          <p>Bu gruba mesaj göndermek için lütfen kripto cüzdanınızı bağlayın.</p>
          <div className="wallet-connect-container">
            <WalletConnect onConnect={handleWalletConnect} onDisconnect={handleWalletDisconnect} />
          </div>
        </div>
      ) : (
        <>
          <div className="group-info">
            <h2>{groupInfo?.name || 'Sohbet Grubu'}</h2>
            <div className="user-badge">
              {user.username || `${user.walletAddress.substring(0, 6)}...${user.walletAddress.substring(user.walletAddress.length - 4)}`}
            </div>
          </div>
          
          <div className="messages">
            <h2>Mesajlar</h2>
            {messages.length === 0 ? (
              <p>Henüz mesaj yok.</p>
            ) : (
              <ul>
                {messages.map(msg => (
                  <li 
                    key={msg.id} 
                    className={`
                      ${msg.sender === user.publicKey ? 'own-message' : ''} 
                      ${msg.selfDestruct ? 'self-destruct-message' : ''}
                      ${msg.timedDestruct ? 'timed-destruct-message' : ''}
                      ${msg.destroyed ? 'destroyed-message' : ''}
                    `}
                  >
                    <p className="sender">
                      {msg.sender === user.publicKey 
                        ? 'Siz' 
                        : msg.senderUsername || msg.sender.substring(0, 6) + '...' + msg.sender.substring(msg.sender.length - 4)}
                      
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
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
          
          <div className="message-input">
            <textarea
              placeholder="Mesajınız..."
              value={message}
              onChange={(e) => setMessage(e.target.value)}
            />
            
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
        </>
      )}
      
      <style jsx>{`
        body {
          margin: 0;
          padding: 0;
        }
        
        .container {
          max-width: 800px;
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
        
        .nav-buttons {
          display: flex;
          gap: 10px;
          margin-bottom: 20px;
        }
        
        .logout-btn {
          background-color: #e53935;
        }
        
        .logout-btn:hover {
          background-color: #c62828;
        }
        
        .group-info {
          background-color: #1e1e1e;
          padding: 15px;
          border-radius: 5px;
          margin: 20px 0;
          display: flex;
          justify-content: space-between;
          align-items: center;
          border: 1px solid #333;
        }
        
        .wallet-section {
          background-color: #1e1e1e;
          padding: 30px;
          border-radius: 10px;
          margin: 40px 0;
          text-align: center;
          border: 1px solid #333;
          box-shadow: 0 10px 25px rgba(0, 0, 0, 0.3);
        }
        
        .wallet-connect-container {
          margin-top: 30px;
        }
        
        .user-badge {
          background-color: #0070f3;
          color: white;
          padding: 5px 10px;
          border-radius: 20px;
          font-size: 0.8em;
        }
        
        .messages {
          margin: 20px 0;
          background-color: #1e1e1e;
          border-radius: 5px;
          padding: 15px;
          border: 1px solid #333;
          max-height: 50vh;
          overflow-y: auto;
        }
        
        .messages ul {
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
        
        .message-input {
          margin-top: 20px;
          background-color: #1e1e1e;
          border-radius: 5px;
          padding: 15px;
          border: 1px solid #333;
        }
        
        textarea {
          width: 100%;
          padding: 10px;
          border: 1px solid #444;
          border-radius: 4px;
          margin-bottom: 10px;
          background-color: #2a2a2a;
          color: #e0e0e0;
          height: 80px;
          resize: none;
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
      `}</style>
    </div>
  );
}