import { useState, useEffect } from 'react';
import { ethers } from 'ethers';

export default function WalletConnect({ onConnect, onDisconnect }) {
  const [address, setAddress] = useState('');
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState('');

  // Cüzdan bağlantı durumunu takip et
  useEffect(() => {
    if (!window.ethereum) {
      return;
    }

    // İlk yüklemede bağlantıyı kontrol et
    checkConnection();

    // Cüzdan bağlantı kontrolü için interval
    const checkInterval = setInterval(checkConnection, 3000);

    // Hesap değişikliklerini dinle
    window.ethereum.on('accountsChanged', handleAccountsChanged);
    window.ethereum.on('disconnect', handleDisconnect);

    return () => {
      // Temizlik işlemleri
      clearInterval(checkInterval);
      if (window.ethereum.removeListener) {
        window.ethereum.removeListener('accountsChanged', handleAccountsChanged);
        window.ethereum.removeListener('disconnect', handleDisconnect);
      }
    };
  }, []);

  // Cüzdan bağlantı durumunu kontrol et
  const checkConnection = async () => {
    if (!window.ethereum) {
      return;
    }

    try {
      const accounts = await window.ethereum.request({ method: 'eth_accounts' });
      
      if (accounts.length > 0) {
        // Hesap var, bağlantı aktif
        if (!isConnected || address !== accounts[0]) {
          setAddress(accounts[0]);
          setIsConnected(true);
        }
      } else if (isConnected) {
        // Hesap yok ama bağlantı aktif görünüyor, bağlantıyı kapat
        handleDisconnect();
      }
    } catch (error) {
      console.error('Bağlantı kontrolü hatası:', error);
      handleDisconnect();
    }
  };

  // Cüzdan bağlantısı kesildiğinde
  const handleDisconnect = () => {
    console.log('Cüzdan bağlantısı kesildi');
    setIsConnected(false);
    setAddress('');
    
    // Üst bileşene haber ver
    if (onDisconnect) {
      onDisconnect();
    }
  };

  // Hesap değiştiğinde
  const handleAccountsChanged = (accounts) => {
    console.log('Hesaplar değişti:', accounts);
    if (accounts.length === 0) {
      // Hesap bağlantısı kesildi
      handleDisconnect();
    } else if (address !== accounts[0]) {
      // Farklı hesaba geçildi, yeniden bağlan
      connectWallet();
    }
  };

  // Cüzdan bağlantısı
  const connectWallet = async () => {
    try {
      setError('');
      
      // MetaMask yüklü mü kontrol et
      if (!window.ethereum) {
        setError("Lütfen MetaMask yükleyin! Ethereum cüzdanı bulunamadı.");
        return;
      }
      
      console.log("MetaMask bağlanmaya çalışılıyor...");
      
      // Hesapları iste
      const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
      const account = accounts[0];
      console.log("Bağlanan hesap:", account);
      
      // Ethers provider oluştur
      const provider = new ethers.providers.Web3Provider(window.ethereum);
      const signer = provider.getSigner();
      
      setAddress(account);
      setIsConnected(true);
      
      // İmza al
      try {
        const timestamp = Date.now();
        const message = `Aztec Messenger'a giriş yapıyorum: ${timestamp}`;
        console.log("İmza isteniyor...");
        const signature = await signer.signMessage(message);
        console.log("İmza alındı:", signature);
        
        // İmzayı üst bileşene ilet
        if (onConnect) {
          onConnect({
            address: account,
            provider,
            signer,
            signature,
            message,
            timestamp
          });
        }
      } catch (signError) {
        console.error("İmzalama hatası:", signError);
        setError("İmza reddedildi. Cüzdan bağlantısı tamamlanamadı.");
        setIsConnected(false);
        setAddress('');
      }
    } catch (error) {
      console.error('Cüzdan bağlantı hatası:', error);
      setError("Cüzdan bağlanamadı: " + (error.message || "Bilinmeyen hata"));
    }
  };

  // Manuel bağlantı kesme
  const disconnectWallet = () => {
    handleDisconnect();
  };

  return (
    <div className="wallet-connect">
      {error && <p className="error-message">{error}</p>}
      
      {!isConnected ? (
        <button onClick={connectWallet} className="wallet-button">
          MetaMask'ı Bağla
        </button>
      ) : (
        <div className="wallet-info">
          <span className="address">
            {address.substring(0, 6)}...{address.substring(address.length - 4)}
          </span>
          <button onClick={disconnectWallet} className="disconnect-button">
            Bağlantıyı Kes
          </button>
        </div>
      )}
      
      <style jsx>{`
        .wallet-connect {
          margin: 10px 0;
        }
        
        .error-message {
          color: #ff6b6b;
          background-color: rgba(255, 107, 107, 0.1);
          padding: 10px;
          border-radius: 4px;
          margin-bottom: 10px;
          border: 1px solid #ff6b6b;
        }
        
        .wallet-button {
          background-color: #0070f3;
          color: white;
          border: none;
          padding: 10px 15px;
          border-radius: 4px;
          cursor: pointer;
        }
        
        .wallet-info {
          display: flex;
          align-items: center;
          gap: 10px;
        }
        
        .address {
          background-color: #1a1a1a;
          padding: 5px 10px;
          border-radius: 20px;
          font-size: 0.9em;
        }
        
        .disconnect-button {
          background-color: #444;
          color: white;
          border: none;
          padding: 5px 10px;
          border-radius: 4px;
          cursor: pointer;
          font-size: 0.8em;
        }
      `}</style>
    </div>
  );
}