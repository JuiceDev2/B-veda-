/**
 * Cifrado zero-knowledge en el navegador.
 * Corrección: TypeScript + BufferSource compatibility.
 */

const PBKDF2_ITERATIONS = 210_000;

function toBase64(buf: ArrayBuffer): string {
  return btoa(String.fromCharCode(...new Uint8Array(buf)));
}

function fromBase64(b64: string): Uint8Array {
  return Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
}

export function generateSalt(): string {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  return toBase64(salt.buffer);
}

export async function deriveMasterKey(
  masterPassword: string,
  saltB64: string
): Promise<CryptoKey> {
  const enc = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    enc.encode(masterPassword),
    "PBKDF2",
    false,
    ["deriveKey"]
  );

  return crypto.subtle.deriveKey(
    {
      name: "PBKDF2",
      salt: fromBase64(saltB64) as BufferSource,
      iterations: PBKDF2_ITERATIONS,
      hash: "SHA-256",
    },
    keyMaterial,
    { name: "AES-GCM", length: 256 },
    true,
    ["encrypt", "decrypt"]
  );
}

export async function encryptField(
  key: CryptoKey,
  plaintext: string
): Promise<{ ciphertext: string; iv: string }> {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const enc = new TextEncoder();
  const cipherBuf = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    key,
    enc.encode(plaintext)
  );
  return { 
    ciphertext: toBase64(cipherBuf), 
    iv: toBase64(iv.buffer) 
  };
}

export async function decryptField(
  key: CryptoKey,
  ciphertextB64: string,
  ivB64: string
): Promise<string> {
  const plainBuf = await crypto.subtle.decrypt(
    { 
      name: "AES-GCM", 
      iv: fromBase64(ivB64) as BufferSource 
    },
    key,
    fromBase64(ciphertextB64) as BufferSource
  );
  return new TextDecoder().decode(plainBuf);
}

export async function exportKeyRaw(key: CryptoKey): Promise<string> {
  const raw = await crypto.subtle.exportKey("raw", key);
  return toBase64(raw);
}

export async function importKeyRaw(rawB64: string): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    "raw", 
    fromBase64(rawB64) as BufferSource, 
    "AES-GCM", 
    true, 
    ["encrypt", "decrypt"]
  );
}