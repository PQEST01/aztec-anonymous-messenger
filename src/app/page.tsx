"use client";

import React, { useMemo, useState } from "react";
import { AzguardClient } from "@azguardwallet/client";

// ⬇️ Senin proje yolların — değiştirme
import artifactLocal from "../contracts/PrivateMessenger.artifact.json";
import instanceJson from "../contracts/PrivateMessenger.instance.json";

type Hex = `0x${string}`;
type AztecAccountId = `${string}:${string}:${Hex}`;

const DEFAULT_CHAIN = "aztec:11155111";
const CAP_METHODS = ["send_transaction", "add_private_authwit", "call", "simulate_views"];

const btn: React.CSSProperties = {
  padding: "12px 18px",
  borderRadius: 10,
  border: "1px solid #3a3a3a",
  background: "#1f1f1f",
  color: "#fff",
  cursor: "pointer",
  fontSize: 14,
};

const HEX64 = /^0x[0-9a-fA-F]{64}$/;
const ZERO64 = ("0x" + "00".repeat(64)) as Hex;

function now() { return "[" + new Date().toLocaleTimeString() + "]"; }
function useConsole() {
  const [logs, setLogs] = useState<string[]>([]);
  const log = (s: string) => setLogs((p) => [now() + " " + s, ...p]);
  const clear = () => setLogs([]);
  return { logs, log, clear };
}

/* --------------------- helpers --------------------- */
function contractAddressFromInstance(): string {
  const addr =
    (instanceJson as any)?.address ||
    (instanceJson as any)?.contractAddress ||
    (instanceJson as any)?.instance ||
    "";
  return String(addr || "");
}

function firstHex64(...c: any[]) {
  return c.find((x) => typeof x === "string" && HEX64.test(x)) as string | undefined;
}

function deepFindHex64(obj: any): string | undefined {
  const st = [obj]; const seen = new Set<any>();
  while (st.length) {
    const cur = st.pop();
    if (!cur || typeof cur !== "object" || seen.has(cur)) continue; seen.add(cur);
    for (const [, v] of Object.entries(cur)) {
      if (typeof v === "string" && HEX64.test(v)) return v;
      if (v && typeof v === "object") st.push(v);
    }
  }
  return undefined;
}

// instance/artifact içinden classId bul ve artifact’ı classId alanlarıyla patch et
function patchArtifactWithClassId(aRaw: any, iRaw: any) {
  const a = JSON.parse(JSON.stringify(aRaw || {}));
  const i = iRaw || {};
  const classId =
    firstHex64(
      i?.contractClassId, i?.currentContractClassId, i?.classId, i?.contract_class_id,
      a?.contractClassId, a?.contract_class_id, a?.classId, a?.id,
      a?.contract?.classId, a?.contract?.contractClassId, a?.contract_class?.id
    ) || deepFindHex64(a) || deepFindHex64(i);

  if (classId) {
    a.contractClassId ??= classId;
    a.contract_class_id ??= classId;
    a.classId ??= classId;
    a.id ??= classId;
    a.contract ??= {};
    a.contract.classId ??= classId;
    a.contract.contractClassId ??= classId;
    a.contract_class ??= {};
    a.contract_class.id ??= classId;
  }
  return { artifact: a, classId };
}

function strToFieldParts(s: string): [Hex, Hex, Hex, Hex] {
  const enc = new TextEncoder().encode(s);
  const zero = ("0x" + "0".repeat(64)) as Hex;
  const CHUNK = 31;
  const out: [Hex, Hex, Hex, Hex] = [zero, zero, zero, zero];
  for (let i = 0; i < 4; i++) {
    const start = i * CHUNK, end = Math.min(start + CHUNK, enc.length);
    if (end <= start) continue;
    const chunk = enc.slice(start, end);
    let hex = "";
    for (const b of chunk) hex += b.toString(16).padStart(2, "0");
    out[i] = ("0x" + (hex + "0".repeat(64)).slice(0, 64)) as Hex;
  }
  return out;
}

/* -------- publicKeys: her iki şema alanı doldurulur -------- */
type PkAll = {
  masterNullifierPublicKey: Hex;
  masterIncomingViewingPublicKey: Hex;
  masterOutgoingViewingPublicKey: Hex;
  masterTaggingPublicKey: Hex;
  taggingPublicKey: Hex;
  encryptionPublicKey: Hex;
};
function normalizePk(anyPk: any | undefined): PkAll | undefined {
  if (!anyPk) return undefined;
  const n  = anyPk.masterNullifierPublicKey || anyPk.mnpk;
  const iv = anyPk.masterIncomingViewingPublicKey || anyPk.mivpk;
  const ov = anyPk.masterOutgoingViewingPublicKey || anyPk.movpk;
  const mt = anyPk.masterTaggingPublicKey || anyPk.taggingPublicKey;
  const tg = anyPk.taggingPublicKey;
  const enc = anyPk.encryptionPublicKey;
  return {
    masterNullifierPublicKey:       (n  || ZERO64) as Hex,
    masterIncomingViewingPublicKey: (iv || ZERO64) as Hex,
    masterOutgoingViewingPublicKey: (ov || ZERO64) as Hex,
    masterTaggingPublicKey:         (mt || ZERO64) as Hex,
    taggingPublicKey:               (tg || ZERO64) as Hex,
    encryptionPublicKey:            (enc|| ZERO64) as Hex,
  };
}
async function getAccountPublicKeys(wallet: any, account: string | undefined, log: (s:string)=>void): Promise<PkAll> {
  for (const m of ["getCompleteAddress", "getPublicKeys"]) {
    try {
      const fn = (wallet as any)?.[m];
      if (typeof fn === "function") {
        const out = await fn.call(wallet, account);
        const pk = normalizePk(out?.publicKeys || out);
        if (pk) return pk;
      }
    } catch {}
  }
  const reqs = [
    "azguard_getCompleteAddress","aztec_getCompleteAddress","wallet_getCompleteAddress",
    "azguard_getPublicKeys","aztec_getPublicKeys","wallet_getPublicKeys",
  ];
  for (const m of reqs) {
    try {
      const out = await wallet.request?.({ method: m, params: [account] });
      const pk = normalizePk(out?.publicKeys || out);
      if (pk) return pk;
    } catch {}
  }
  for (const m of reqs) {
    try {
      const out = await wallet.transport?.request?.({ method: m, params: [account] });
      const pk = normalizePk(out?.publicKeys || out);
      if (pk) return pk;
    } catch {}
  }
  log("⚠️ Wallet public keys döndürmedi; 0x00… ile dolduruluyor.");
  return {
    masterNullifierPublicKey:       ZERO64,
    masterIncomingViewingPublicKey: ZERO64,
    masterOutgoingViewingPublicKey: ZERO64,
    masterTaggingPublicKey:         ZERO64,
    taggingPublicKey:               ZERO64,
    encryptionPublicKey:            ZERO64,
  };
}

/* --------- PXE REGISTER — class → instance → update + “fetch from node” --------- */
async function pxeRegisterAll(wallet: any, log: (s: string)=>void) {
  const address = contractAddressFromInstance();
  if (!address || !HEX64.test(address)) throw new Error("Contract address geçersiz/eksik (instance JSON).");

  // 0) classId & local artifact
  let { artifact: patchedLocalArtifact, classId } = patchArtifactWithClassId(artifactLocal, instanceJson);
  if (!classId) throw new Error("classId bulunamadı (artifact/instance).");

  // 1) PXE’den (node üzerinden) metadata iste — artifact’ı da getir (includeArtifact=true)
  //    Eğer node artifact’ı dönerse, onu kullanmak en sağlıklısıdır.
  try {
    const meta = await wallet.request?.({ method: "pxe_getContractClassMetadata", params: [classId, true] });
    if (meta?.artifact) {
      patchedLocalArtifact = meta.artifact;
      log("ℹ️ PXE: Artifact node’dan alındı (classId eşleşti).");
    } else {
      log("ℹ️ PXE: Node metadata geldi ama artifact boş; local artifact kullanılacak.");
    }
  } catch {
    log("ℹ️ PXE: pxe_getContractClassMetadata çağrısı başarısız; local artifact kullanılacak.");
  }

  // 2) registerContractClass(artifact)
  try {
    if (typeof wallet.registerContractClass === "function") {
      log("ℹ️ PXE: registerContractClass(artifact)");
      await wallet.registerContractClass(patchedLocalArtifact);
      log("✅ PXE registerContractClass OK");
    } else {
      log("ℹ️ PXE: request(pxe_registerContractClass)");
      await wallet.request?.({ method: "pxe_registerContractClass", params: [patchedLocalArtifact] });
      log("✅ PXE registerContractClass via request OK");
    }
  } catch (e: any) {
    // sınıf zaten kayıtlıysa sorun değil
    log("ℹ️ PXE registerContractClass geçti: " + (e?.message || String(e)));
  }

  // 3) registerContract({ instance, artifact })
  try {
    const payload = { instance: instanceJson, artifact: patchedLocalArtifact };
    if (typeof wallet.registerContract === "function") {
      log("ℹ️ PXE: registerContract({ instance, artifact })");
      await wallet.registerContract(payload);
      log("✅ PXE registerContract OK");
    } else {
      log("ℹ️ PXE: request(pxe_registerContract)");
      await wallet.request?.({ method: "pxe_registerContract", params: [payload] });
      log("✅ PXE registerContract via request OK");
    }
  } catch (e: any) {
    log("ℹ️ PXE registerContract uyarı: " + (e?.message || String(e)));
  }

  // 4) updateContract(address, artifact) — artifact’ı instance’a bağlamak için
  try {
    if (typeof wallet.updateContract === "function") {
      log("ℹ️ PXE: updateContract(address, artifact)");
      await wallet.updateContract(address, patchedLocalArtifact);
      log("✅ PXE updateContract OK");
    } else {
      log("ℹ️ PXE: request(pxe_updateContract)");
      await wallet.request?.({ method: "pxe_updateContract", params: [address, patchedLocalArtifact] });
      log("✅ PXE updateContract via request OK");
    }
  } catch (e: any) {
    log("ℹ️ PXE updateContract gerekli olmadı: " + (e?.message || String(e)));
  }

  // 5) Doğrulama — PXE’de sınıf için artifact var mı?
  try {
    const verify = await wallet.request?.({ method: "pxe_getContractClassMetadata", params: [classId, true] });
    if (!verify?.artifact) {
      log("⚠️ PXE uyarı: Artifact hâlâ görünmüyor. ClassId ↔ artifact derleme eşleşmesini kontrol et.");
    } else {
      log("ℹ️ PXE doğrulama: Artifact hazır.");
    }
  } catch {}
}

/* ====================== PAGE ====================== */
export default function Page() {
  const { logs, log, clear } = useConsole();

  const [wallet, setWallet] = useState<AzguardClient | null>(null);
  const [connected, setConnected] = useState(false);
  const [account, setAccount] = useState<AztecAccountId | "">("");
  const [chainId, setChainId] = useState<string>(DEFAULT_CHAIN);

  const [recipient, setRecipient] = useState<string>("");
  const [msg, setMsg] = useState<string>("hello aztec");
  const [busy, setBusy] = useState(false);

  const contractAddress = useMemo(() => contractAddressFromInstance(), []);

  const onConnect = async () => {
    setBusy(true);
    try {
      const ok = await AzguardClient.isAzguardInstalled();
      if (!ok) { log("❌ Azguard Wallet bulunamadı."); return; }
      const az = await AzguardClient.create();
      await az.connect(
        { name: "Aztec dApp + Azguard Messenger" },
        [{ chains: [DEFAULT_CHAIN], methods: CAP_METHODS }],
      );
      const acc = (az.accounts?.[0] || "") as AztecAccountId;
      if (!acc) throw new Error("Account not returned");
      const derivedChain = (acc as string).split(":").slice(0, 2).join(":") || DEFAULT_CHAIN;
      setWallet(az); setConnected(true); setAccount(acc); setChainId(derivedChain);
      az.onDisconnected.addHandler(() => { setConnected(false); setWallet(null); setAccount(""); log("ℹ️ Wallet disconnected"); });
      log(`✅ Connected. Account: ${acc} | Chain: ${derivedChain}`);
    } catch (e: any) {
      log("❌ Connect error: " + (e?.message || String(e)));
    } finally {
      setBusy(false);
    }
  };

  // **Değişmez kural**: kayıt PXE üzerinden
  const onRegister = async () => {
    setBusy(true);
    try {
      if (!wallet || !connected) { log("❌ Önce Connect."); return; }
      await pxeRegisterAll(wallet, log);
    } catch (e: any) {
      log("❌ Register error: " + (e?.message || String(e)));
    } finally { setBusy(false); }
  };

  const onSend = async () => {
    setBusy(true);
    try {
      if (!wallet) { log("❌ Wallet yok. Önce Connect."); return; }
      if (!contractAddress || !HEX64.test(contractAddress)) { log("❌ Contract address geçersiz."); return; }
      if (!recipient || !HEX64.test(recipient)) { log("❌ Recipient L2 adresi 0x + 64 hex olmalı."); return; }

      // 1) her zaman: önce PXE ile class+instance+update ve node’dan artifact fetch
      await pxeRegisterAll(wallet, log);

      // 2) tx gönder
      await wallet.connect({ name: "Aztec dApp + Azguard Messenger" }, [
        { chains: [chainId], methods: CAP_METHODS },
      ]);

      const [p0, p1, p2, p3] = strToFieldParts(msg || "");
      const senderAccount = wallet.accounts?.[0] as AztecAccountId | undefined;
      if (!senderAccount) throw new Error("Sender account missing");
      const senderAddr = (senderAccount as string).split(":").at(-1) as Hex;

      const results = await (wallet as any).execute?.([
        {
          kind: "send_transaction",
          chain: chainId,
          account: senderAccount,
          actions: [
            {
              kind: "add_private_authwit",
              content: {
                kind: "call",
                caller: senderAccount,
                contract: contractAddress,
                method: "send_message",
                args: [senderAddr, recipient as Hex, p0, p1, p2, p3],
              },
            },
            {
              kind: "call",
              contract: contractAddress,
              method: "send_message",
              args: [senderAddr, recipient as Hex, p0, p1, p2, p3],
            },
          ],
        },
      ]);

      const sendRes = results?.at(-1);
      if (!sendRes || sendRes.status !== "ok") throw new Error(sendRes?.error || "Contract artifact not found");
      const txHash = String(sendRes.result || "");
      log("✅ Gönderildi. Tx: " + txHash);
    } catch (e: any) {
      log("❌ Send error: " + (e?.message || String(e)));
    } finally {
      setBusy(false);
    }
  };

  const onRead = async () => {
    log("ℹ️ Okuma PXE/note scanning gerektirir (cüzdan tarafı).");
  };

  /* --------------------- UI --------------------- */
  return (
    <div style={{ maxWidth: 920, margin: "40px auto", padding: 16, color: "#eee" }}>
      <h2 style={{ marginBottom: 8 }}>Aztec dApp + Azguard Messenger</h2>
      <p style={{ opacity: 0.8, margin: "0 0 16px" }}>
        Account: <code>{account || "(not connected)"} </code><br />
        Contract: <code>{contractAddress || "(no address)"} </code><br />
        Chain: <code>{chainId}</code>
      </p>

      <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
        <button style={btn} onClick={onConnect} disabled={busy || connected}>
          {connected ? "✓ Connected" : "1) Connect"}
        </button>
        <button style={btn} onClick={onRegister} disabled={busy}>
          2) Register Contract (PXE)
        </button>
        <button style={btn} onClick={onRead} disabled={busy}>
          3) Read Messages
        </button>
      </div>

      <div style={{ border: "1px solid #333", borderRadius: 12, padding: 16, background: "#111", marginBottom: 16 }}>
        <h4 style={{ marginTop: 0, marginBottom: 12 }}>Mesaj Gönder (Private TX)</h4>

        <label style={{ display: "block", marginBottom: 8, fontSize: 13, opacity: 0.9 }}>Recipient (L2)</label>
        <input
          value={recipient}
          onChange={(e) => setRecipient(e.target.value.trim())}
          placeholder="0x........ (64 hex)"
          style={{ width: "100%", padding: "12px 14px", borderRadius: 8, border: "1px solid #444", background: "#0d0d0d", color: "#eee", marginBottom: 12 }}
        />

        <label style={{ display: "block", marginBottom: 8, fontSize: 13, opacity: 0.9 }}>Message (max ~124 chars)</label>
        <textarea
          value={msg}
          onChange={(e) => setMsg(e.target.value)}
          rows={3}
          placeholder="hello aztec"
          style={{ width: "100%", padding: "12px 14px", borderRadius: 8, border: "1px solid #444", background: "#0d0d0d", color: "#eee", marginBottom: 12, resize: "vertical" }}
        />

        <button style={{ ...btn, background: "#1b4d2f" }} onClick={onSend} disabled={busy || !connected}>
          🚀 Send Message
        </button>
      </div>

      <div style={{ border: "1px solid #333", borderRadius: 12, padding: 16, background: "#0b0b0b" }}>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
          <h4 style={{ margin: 0 }}>Console Logs</h4>
          <button style={{ ...btn, padding: "8px 12px" }} onClick={clear}>Clear</button>
        </div>
        <div style={{ maxHeight: 280, overflow: "auto", fontFamily: "monospace", fontSize: 12, whiteSpace: "pre-wrap", display: "grid", gap: 6 }}>
          {logs.map((l, i) => (
            <div key={i} style={{ opacity: 0.95 }}>{l}</div>
          ))}
          {logs.length === 0 && <div style={{ opacity: 0.6 }}>Logs will appear here…</div>}
        </div>
      </div>
    </div>
  );
}
