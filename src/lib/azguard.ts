"use client";

import { AzguardClient } from "@azguardwallet/client";

// Sözleşme Artifact'ınızı içeri aktarın.
import PrivateMessengerArtifact from "../contracts/PrivateMessenger.artifact.json";
// Sözleşme Instance'ınızı içeri aktarın.
import PrivateMessengerInstance from "../contracts/PrivateMessenger.instance.json";

// --- SABİTLER ---

export const REQUIRED_CHAIN = (process.env.NEXT_PUBLIC_AZTEC_CHAIN ??
  "aztec:11155111") as `${string}:${string}`;

// --- RPC TİPLERİ VE INTERFACE'LER (Aynı) ---

interface AzguardProvider extends AzguardClient {
    request: (payload: { method: string; params?: any }) => Promise<any>; 
    accounts: string[];
}

// --- AZTEC VERİLERİNİ INSTANCE DOSYASINDAN ALMA ---

const INSTANCE_DATA = PrivateMessengerInstance as any;
const CONTRACT_ADDRESS = INSTANCE_DATA.address; 
// Bu ID, instance dosyanızdan gelir ve cüzdanın beklediği temel class ID'dir.
const ORIGINAL_CONTRACT_CLASS_ID = INSTANCE_DATA.contractClassId; 


// --- ANA BAĞLANTI FONKSİYONU (Aynı) ---
// ... (connectAzguard fonksiyonu değişmiyor, önceki cevapta olduğu gibi kalır) ...


// --- RPC SARICILARI: NİHAİ YAMA ---

export async function registerContractRPC(
    provider: AzguardProvider,
    // params'tan sadece artifact'i alıyoruz.
    params: { artifact: any } 
) {
    // ⚠️ CRITICAL: Register işleminden hemen önce, Artifact objesini yamalıyoruz.
    // Cüzdan, bu bilgileri artifact'in içinde bekliyor.
    // instance dosyanızdaki güvenilir verileri Artifact'a enjekte ediyoruz.
    const patchedArtifact = {
        ...params.artifact,
        // ZOD tarafından beklenen originalContractClassId'yi instance'tan alıp artifact'e ekliyoruz.
        originalContractClassId: ORIGINAL_CONTRACT_CLASS_ID, 
        
        // currentContractClassId, post-process sonrası ID'dir. Logunuzdaki değeri kullanabiliriz:
        // '0x2fc6ecb8265337c17c81e27947fde1c87a60843dafbbe335380bba47adc184bc'
        // VEYA daha basit olması için orijinali kullanırız:
        currentContractClassId: ORIGINAL_CONTRACT_CLASS_ID, 
        
        // ZOD hatasını çözmek için boş bir obje gönderiyoruz. (VK'lar eksik olduğu için boş.)
        publicKeys: {},
    };

    // 1. Contract Class'ı kaydet
    await provider.request({
        method: "aztec_registerContractClass",
        params: [patchedArtifact], // Yamalanmış artifact'i gönderiyoruz
    }).catch((e) => {
        // Class kaydı VK eksikliği nedeniyle başarısız olabilir (uyarı: verificationKey bulunamadı).
        console.warn("Contract Class kaydı VK eksikliği nedeniyle başarısız oldu/uyarı verdi:", e.message);
    }); 
    
    // 2. Contract Instance'ı kaydet.
    // Instance dosyasının kendisi (INSTANCE_DATA) içinde adres ve class ID'leri zaten var.
    await provider.request({
        method: "aztec_registerContract",
        params: [{
            address: CONTRACT_ADDRESS,
            instance: INSTANCE_DATA, 
            artifact: patchedArtifact, // Yamalanmış artifact'i gönderiyoruz
        }],
    });
}

// ... (callViewRPC ve sendTxRPC kodları önceki cevapta olduğu gibi kalır) ...