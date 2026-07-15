// O Supabase Auth às vezes retorna mensagens de erro opacas (ex.: "{}" com
// status 500, quando o envio do e-mail de confirmação falha no servidor) —
// mostrar isso cru pro usuário parece que "nada aconteceu". Normaliza pra
// uma mensagem legível nesses casos.
export function friendlyAuthError(message: string | undefined, status?: number): string {
  const isOpaque = !message || message.trim() === "" || message.trim() === "{}";
  if (isOpaque || (status && status >= 500)) {
    return "Não foi possível concluir agora — pode ser instabilidade temporária. Tente novamente em alguns minutos.";
  }
  return message;
}
