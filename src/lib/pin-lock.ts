// Cadeado de privacidade local (não é autenticação de verdade — só evita
// abrir o app por acidente/curiosidade quando instalado na tela inicial do
// celular). PIN fica só no aparelho (localStorage), nunca no servidor.
//
// O "desbloqueado" NÃO é persistido em storage nenhum, de propósito — um
// PWA instalado costuma manter o processo vivo em segundo plano (o celular
// só "esconde" o app, não fecha de verdade), então sessionStorage ficava
// desbloqueado pra sempre mesmo saindo do app (bug relatado pelo
// fundador). O estado de desbloqueio vive só em memória (useState em
// PinLockGate) e é resetado toda vez que a aba fica oculta
// (visibilitychange), então trocar de app ou apagar a tela sempre exige o
// PIN de novo ao voltar.
const PIN_HASH_KEY = "lumeo_pin_hash";

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
}

export async function checkPin(pin: string): Promise<boolean> {
  const stored = localStorage.getItem(PIN_HASH_KEY);
  if (!stored) return false;
  return (await hashPin(pin)) === stored;
}

export function isStandalonePwa(): boolean {
  const nav = navigator as Navigator & { standalone?: boolean };
  return window.matchMedia("(display-mode: standalone)").matches || nav.standalone === true;
}
