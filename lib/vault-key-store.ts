/**
 * Guarda la CryptoKey ya derivada SOLO en memoria del navegador
 * (variable de módulo), nunca en localStorage ni se manda al
 * servidor. Se pierde al recargar la página a propósito: en ese
 * caso el usuario vuelve a desbloquear con su contraseña o su PIN.
 */
let currentKey: CryptoKey | null = null;

export function setVaultKey(key: CryptoKey) {
  currentKey = key;
}

export function getVaultKey(): CryptoKey | null {
  return currentKey;
}

export function clearVaultKey() {
  currentKey = null;
}
