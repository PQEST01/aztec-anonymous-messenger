// IPFS bağlantısı kurulumu için mock fonksiyon
export async function setupIPFS() {
  console.log('Mock IPFS başlatılıyor...');
  return createMockIPFS();
}

// Fotoğrafı IPFS'e yükle
export async function uploadImageToIPFS(ipfs, imageFile) {
  try {
    console.log('Fotoğraf yükleniyor (simülasyon)...');
    
    // Simüle edilmiş bir IPFS yanıtı
    return {
      success: true,
      cid: 'ipfs-' + Math.random().toString(36).substring(2, 10),
      size: imageFile.size,
      url: URL.createObjectURL(imageFile) // Tarayıcı içinde geçici URL
    };
  } catch (error) {
    console.error('Fotoğraf yükleme hatası:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

// Fotoğrafı küçült (optimize et)
export async function resizeImage(imageFile, maxWidth = 1200, maxHeight = 1200, quality = 0.8) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(imageFile);
    
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target.result;
      
      img.onload = () => {
        // Boyut hesaplama
        let width = img.width;
        let height = img.height;
        
        if (width > maxWidth) {
          height = Math.round(height * (maxWidth / width));
          width = maxWidth;
        }
        
        if (height > maxHeight) {
          width = Math.round(width * (maxHeight / height));
          height = maxHeight;
        }
        
        // Canvas oluştur ve resmi çiz
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        canvas.width = width;
        canvas.height = height;
        ctx.drawImage(img, 0, 0, width, height);
        
        // Optimize edilmiş resmi Blob olarak al
        canvas.toBlob((blob) => {
          if (blob) {
            // Yeni bir dosya oluştur
            const optimizedFile = new File(
              [blob], 
              imageFile.name, 
              { 
                type: 'image/jpeg', 
                lastModified: Date.now() 
              }
            );
            resolve(optimizedFile);
          } else {
            reject(new Error('Resim dönüştürülemedi'));
          }
        }, 'image/jpeg', quality);
      };
      
      img.onerror = () => {
        reject(new Error('Resim yüklenemedi'));
      };
    };
    
    reader.onerror = () => {
      reject(new Error('Dosya okunamadı'));
    };
  });
}

// Base64 formatında resmi kodla (küçük resimler için)
export async function encodeImageToBase64(imageFile) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(imageFile);
    
    reader.onload = () => {
      resolve(reader.result);
    };
    
    reader.onerror = () => {
      reject(new Error('Resim base64 formatına dönüştürülemedi'));
    };
  });
}

// Gösterim boyutuna göre en uygun depolama yöntemi seç
export async function storeImage(ipfs, imageFile) {
  try {
    // Resmin boyutunu kontrol et
    if (imageFile.size > 100 * 1024) { // 100KB'dan büyükse
      // Resmi küçült ve IPFS'e yükle
      const optimizedImage = await resizeImage(imageFile);
      return await uploadImageToIPFS(ipfs, optimizedImage);
    } else {
      // Küçük resimler doğrudan base64 olarak kodlanabilir
      const base64Image = await encodeImageToBase64(imageFile);
      return {
        success: true,
        isBase64: true,
        data: base64Image,
        size: imageFile.size
      };
    }
  } catch (error) {
    console.error('Resim depolama hatası:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

// Mock IPFS oluştur
function createMockIPFS() {
  return {
    add: async (buffer, options) => {
      const size = buffer.length || 1024;
      const cid = {
        toString: () => 'Qm' + Math.random().toString(36).substring(2, 15)
      };
      
      if (options && options.progress) {
        options.progress(size / 2);
        await new Promise(resolve => setTimeout(resolve, 100));
        options.progress(size);
      }
      
      return {
        cid: cid,
        size: size
      };
    }
  };
}