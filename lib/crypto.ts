/**
 * Cifrado zero-knowledge en el navegador.
 *
 * Nada de esto viaja al servidor: la contraseña maestra nunca sale del
 * dispositivo. Lo que se guarda en Supabase son únicamente los bytes
 * cifrados (ciphertext) + el salt + el iv de cada registro.
 *
 * Flujo:
 *  1. deriveMasterKey(contraseñaMaestra, saltDeUsuario) -> CryptoKey (PBKDF2 -> AES-GCM 256)
 *  2. encryptField(key, texto) -> { ciphertext, iv } listos para guardar en la fila
 *  3. decryptField(key, ciphertext, iv) -> texto original
 *
 * El salt del usuario se genera una vez al crear la cuenta y se guarda
 * en la tabla `profiles` (no es secreto, solo previene ataques con
 * tablas rainbow).
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
      salt: fromBase64(saltB64),
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
  return { ciphertext: toBase64(cipherBuf), iv: toBase64(iv.buffer) };
}

export async function decryptField(
  key: CryptoKey,
  ciphertextB64: string,
  ivB64: string
): Promise<string> {
  const plainBuf = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv: fromBase64(ivB64) },
    key,
    fromBase64(ciphertextB64)
  );
  return new TextDecoder().decode(plainBuf);
}

/**
 * Exporta la llave derivada como bytes crudos para poder envolverla
 * con el PIN (ver pin.ts) y guardarla localmente cifrada.
 */
export async function exportKeyRaw(key: CryptoKey): Promise<string> {
  const raw = await crypto.subtle.exportKey("raw", key);
  return toBase64(raw);
}

export async function importKeyRaw(rawB64: string): Promise<CryptoKey> {
  return crypto.subtle.importKey("raw", fromBase64(rawB64), "AES-GCM", true, [
    "encrypt",
    "decrypt",
  ]);
}
