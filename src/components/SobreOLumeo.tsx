// O texto que diferencia o Lumeo dos concorrentes, escrito pelo fundador.
// Fonte única de propósito: ele aparece na home pública, na página que o
// convidado abre ao receber o link e no "Comece por aqui" de quem já é
// membro — três lugares, um texto. Até 2026-07-16 vivia solto e recolhido
// só no /inicio, atrás do login: quem recebia o convite caía direto num
// formulário de nome/e-mail/senha sem uma linha explicando o que é o app.
export function SobreOLumeo({ className = "" }: { className?: string }) {
  return (
    <div className={`flex flex-col gap-3 text-sm text-foreground/90 ${className}`}>
      <p className="font-medium text-foreground">Lumeo é sobre conexão, não pressa.</p>
      <p>
        Você já sentiu que, nas baladas liberais ou apps de relacionamento
        comuns, o contato social de verdade fica em segundo plano? Que toda
        aproximação já vem com a expectativa — ou o receio — de que o objetivo
        seja uma interação íntima imediata?
      </p>
      <p>
        Foi pensando nessa lacuna que o Lumeo existe: um espaço de curadoria
        social pro meio liberal, pensado pra conhecer gente, ter boas conversas
        e se divertir sem a pressão de que algo mais precise acontecer. Se a
        sintonia rolar, ótimo — mas o encontro já vale pela companhia.
      </p>
    </div>
  );
}
