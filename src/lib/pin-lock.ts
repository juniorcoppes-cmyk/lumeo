// Cadeado de privacidade local (não é autenticação de verdade — só evita
// abrir o app por acidente/curiosidade quando instalado na tela inicial do
// celular). PIN fica só no aparelho (localStorage), nunca no servidor.
const PIN_HASH_KEY = "lumeo_pin_hash";
const UNLOCKED_KEY = "lumeo_pin_unlocked";

async function hashPin(pin: string): Promise<string> {
  const bytes = new TextEncoder().encode(pin);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export function hasPinConfigured(): boolean {
  return !!localStorage.getItem(PIN_HASH_KEY);
}

export async function setPin(pin: string): Promise<void> {
  localStorage.setItem(PIN_HASH_KEY, await hashPin(pin));
}

export function clearPin(): void {
  localStorage.removeItem(PIN_HASH_KEY);
  sessionStorage.removeItem(UNLOCKED_KEY);
}

export async function checkPin(pin: string): Promise<boolean> {
  const stored = localStorage.getItem(PIN_HASH_KEY);
  if (!stored) return false;
  return (await hashPin(pin)) === stored;
}

export function isUnlockedThisSession(): boolean {
  return sessionStorage.getItem(UNLOCKED_KEY) === "1";
}

export function markUnlockedThisSession(): void {
  sessionStorage.setItem(UNLOCKED_KEY, "1");
}

export function isStandalonePwa(): boolean {
  const nav = navigator as Navigator & { standalone?: boolean };
  return window.matchMedia("(display-mode: standalone)").matches || nav.standalone === true;
}
