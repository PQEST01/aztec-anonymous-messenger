// 1. Gerekli kütüphaneleri ve compile edilmiş sözleşme artifact'ini import et
import {
    AztecRpcClient,
    createAztecRpcClient,
    Wallet,
    AccountBridging, // Belki buna ihtiyacın olur
    AccountContract, // Veya buna
    getSchnorrAccount, // Test hesapları Schnorr kullanıyor olabilir
    DeployMethod,
  } from '@aztec/aztec.js'; // Veya projenin kullandığı Aztec SDK paketi neyse o
  import { PrivateKey } from '@aztec/circuits.js'; // Belki buna ihtiyacın olur
  // Kendi compile ettiğin sözleşmenin artifact dosyasını import et.
  // Bu dosya genellikle 'target' veya 'build' klasöründe olur.
  // Dosyanın yolu projenin yapısına göre değişir, örnek olarak 'target/AnonymousMessenger.json' gibi
  import AnonymousMessengerArtifact from '../target/anonymous_messenger.json'; // Yolu KENDİ PROJENE GÖRE DÜZENLE!
  
  // 2. Main fonksiyonunu tanımla (async olması önemli)
  async function main() {
    console.log('Anonymous Messenger Sözleşmesi Deploy Ediliyor...');
  
    // 3. PXE'ye (Aztec Node) Bağlan
    // Yerel sandbox'a bağlanıyoruz, adresi sabit.
    const rpcClient: AztecRpcClient = createAztecRpcClient('http://host.docker.internal:8080');
    console.log('PXE\'ye bağlanıldı.');
  
    // PXE'nin hazır olup olmadığını kontrol et (opsiyonel ama iyi bir pratik)
    try {
      await rpcClient.getNodeInfo();
      console.log('PXE aktif.');
    } catch (e) {
      console.error('HATA: PXE aktif değil veya bağlanılamıyor. Lütfen \'aztec start --sandbox\' komutuyla başlattığınız terminal penceresini kontrol edin.');
      process.exit(1); // Hata durumunda çık
    }
  
  
    // 4. Deploy Ücretini Ödeyecek Hesabı Belirle
    // Sandbox test hesaplarını (test0, test1, test2) kullanacağız.
    // 'aztec-wallet import-test-accounts' ile bunları içeri aktarmıştık.
    // Genellikle ilk hesap olan 'test0' kullanılır.
    // Bu hesabın gizli anahtarı (Secret Key), 'aztec-wallet import-test-accounts' komutunun çıktısında görünür.
    // **ÖNEMLİ:** Gerçek projede gizli anahtarı doğrudan koda yazmak TEHLİKELİDİR.
    // Genellikle .env dosyası veya güvenli yöntemlerle alınır.
    // Sandbox için şimdilik doğrudan alabiliriz ama SADECE SANDBOX İÇİN!
    // AZ ÖNCEKİ 'aztec-wallet import-test-accounts' ÇIKTISINDAN TEST0'IN Secret Key'ini BURAYA YAZ
    // Örnek: '0x123...' gibi
    const testAccountPrivateKey = PrivateKey.fromString('0x...'); // BURAYI DOLDUR!
  
    // Gizli anahtardan Wallet objesi oluştur
    // Kullanılan hesap kontratı türüne (Schnorr, vb.) göre bu kısım değişir.
    // Test hesapları Schnorr kullanıyor.
    const wallet = getSchnorrAccount(rpcClient, testAccountPrivateKey).wallet;
    console.log(`Deploy ücreti için ${wallet.getAddress()} hesabı kullanılacak.`);
  
  
    // 5. Sözleşme Deploy İşlemini Hazırla
    // AnonymousMessenger sözleşmesinin bir constructor'ı (yapıcı fonksiyonu) varsa,
    // bu fonksiyonun beklediği parametreleri burada sağlaman gerekir.
    // Sözleşmenin Noir koduna bakarak constructor'ını ve parametrelerini kontrol etmelisin.
    // Eğer constructor parametre almıyorsa, boş bırakabilirsin.
    const constructorArgs: any[] = [/* constructor parametreleri buraya virgülle ayrılmış olarak gelecek */]; // KENDİ SÖZLEŞMENE GÖRE DOLDUR!
  
    console.log('Deploy işlemi hazırlanıyor...');
    const deployMethod = new DeployMethod(
      testAccountPrivateKey, // Veya wallet, dokümantasyonu kontrol et
      rpcClient,
      AnonymousMessengerArtifact, // Compile edilmiş sözleşme artifact'ı
      constructorArgs, // Constructor parametreleri
    );
  
    // İşlem detaylarını ayarla (opsiyonel ama iyi olur)
    // deployMethod.setGasLimit(...)
    // deployMethod.setGasPrice(...)
    // ... diğer ayarlar
  
  
    // 6. İşlemi Gönder ve Onaylanmasını Bekle
    console.log('Deploy işlemi gönderiliyor...');
    const tx = deployMethod.send();
  
    console.log(`İşlem hash: ${tx.getTxHash()}`);
    console.log('Onaylanması bekleniyor...');
  
    const receipt = await tx.wait(); // İşlemin ağda tamamlanmasını bekle
  
    console.log('İşlem onaylandı!');
  
    // 7. Deploy Edilen Sözleşmenin Adresini Al ve Yazdır
    const deployedContractAddress = receipt.contractAddress;
    if (deployedContractAddress) {
        console.log(`Sözleşme başarıyla deploy edildi! Adres: ${deployedContractAddress.toString()}`);
    } else {
        console.error('HATA: Sözleşme adresi bulunamadı.');
    }
  
    console.log('Deploy scripti tamamlandı.');
  }
  
  // Main fonksiyonunu çalıştır ve hataları yakala
  main().catch((err) => {
    console.error('Deploy sırasında bir hata oluştu:', err);
    process.exit(1); // Hata durumunda programdan çık
  });