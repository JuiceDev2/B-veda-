/**
 * Desbloqueo rápido con PIN, al estilo Android.
 *
 * El PIN NUNCA reemplaza a la contraseña maestra ni se manda al
 * servidor: solo sirve para envolver (cifrar) una copia de la llave
 * maestra ya derivada, y esa copia envuelta se guarda únicamente en
 * este navegador (localStorage). Por eso el PIN solo funciona en el
 * mismo dispositivo donde se configuró; en un dispositivo nuevo hay
 * que volver a entrar con la contraseña maestra.
 *
 * Requisito: el usuario ya debe tener una contraseña maestra
 * configurada antes de poder activar el PIN (se valida en la UI).
 */

import { deriveMasterKey, exportKeyRaw, importKeyRaw } from "./crypto";

const STORAGE_KEY = "boveda:pin_wrapped_key";
const STORAGE_SALT = "boveda:pin_salt";
const STORAGE_ATTEMPTS = "boveda:pin_attempts";
const STORAGE_LOCK_UNTIL = "boveda:pin_lock_until";

const MAX_ATTEMPTS = 5;
// Backoff progresivo: 1er fallo no bloquea, luego 5s, 15s, 30s, 60s...
const BACKOFF_MS = [0, 5_000, 15_000, 30_000, 60_000];

function getAttempts(): number {
  return Number(localStorage.getItem(STORAGE_ATTEMPTS) ?? "0");
}

function getLockUntil(): number {
  return Number(localStorage.getItem(STORAGE_LOCK_UNTIL) ?? "0");
}

/**
 * Cuánto falta (en ms) para poder volver a intentar el PIN.
 * 0 significa que ya se puede intentar. Úsalo en la UI para
 * deshabilitar el botón y mostrar una cuenta regresiva.
 */
export function pinLockRemainingMs(): number {
  return Math.max(0, getLockUntil() - Date.now());
}

/**
 * Cuántos intentos le quedan antes de que se borre el PIN de este
 * dispositivo y se exija la contraseña maestra de nuevo.
 */
export function pinAttemptsLeft(): number {
  return Math.max(0, MAX_ATTEMPTS - getAttempts());
}

function registerFailedAttempt() {
  const attempts = getAttempts() + 1;
  localStorage.setItem(STORAGE_ATTEMPTS, String(attempts));

  if (attempts >= MAX_ATTEMPTS) {
    // Demasiados intentos fallidos: se borra el PIN de este
    // dispositivo por completo. Solo queda entrar con la
    // contraseña maestra.
    clearPin();
    return;
  }

  const delay = BACKOFF_MS[Math.min(attempts, BACKOFF_MS.length - 1)];
  localStorage.setItem(STORAGE_LOCK_UNTIL, String(Date.now() + delay));
}

function registerSuccess() {
  localStorage.removeItem(STORAGE_ATTEMPTS);
  localStorage.removeItem(STORAGE_LOCK_UNTIL);
}

async function deriveKeyFromPin(pin: string, saltB64: string) {
  return deriveMasterKey(pin, saltB64);
}

export async function setupPin(pin: string, masterKey: CryptoKey) {
  const rawMasterKey = await exportKeyRaw(masterKey);

  const salt = crypto.getRandomValues(new Uint8Array(16));
  const saltB64 = btoa(String.fromCharCode(...salt));

  const pinKey = await deriveKeyFromPin(pin, saltB64);
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const enc = new TextEncoder();
  const wrapped = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    pinKey,
    enc.encode(rawMasterKey)
  );

  const payload = {
    wrapped: btoa(String.fromCharCode(...new Uint8Array(wrapped))),
    iv: btoa(String.fromCharCode(...iv)),
  };

  localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
  localStorage.setItem(STORAGE_SALT, saltB64);
  registerSuccess();
}

export function hasPinConfigured(): boolean {
  return !!localStorage.getItem(STORAGE_KEY);
}

export async function unlockWithPin(pin: string): Promise<CryptoKey | null> {
  if (pinLockRemainingMs() > 0) return null;

  const raw = localStorage.getItem(STORAGE_KEY);
  const saltB64 = localStorage.getItem(STORAGE_SALT);
  if (!raw || !saltB64) return null;

  const { wrapped, iv } = JSON.parse(raw) as { wrapped: string; iv: string };
  const pinKey = await deriveKeyFromPin(pin, saltB64);

  try {
    const rawMasterKeyBuf = await crypto.subtle.decrypt(
      {
        name: "AES-GCM",
        iv: Uint8Array.from(atob(iv), (c) => c.charCodeAt(0)),
      },
      pinKey,
      Uint8Array.from(atob(wrapped), (c) => c.charCodeAt(0))
    );
    const rawMasterKeyB64 = new TextDecoder().decode(rawMasterKeyBuf);
    const key = await importKeyRaw(rawMasterKeyB64);
    registerSuccess();
    return key;
  } catch {
    // PIN incorrecto: el descifrado falla con GCM
    registerFailedAttempt();
    return null;
  }
}

export function clearPin() {
  localStorage.removeItem(STORAGE_KEY);
  localStorage.removeItem(STORAGE_SALT);
  localStorage.removeItem(STORAGE_ATTEMPTS);
  localStorage.removeItem(STORAGE_LOCK_UNTIL);
}
