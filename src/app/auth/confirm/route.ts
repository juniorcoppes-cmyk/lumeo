import { redirect } from "next/navigation";
import { type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

type EmailOtpType = "signup" | "invite" | "magiclink" | "recovery" | "email_change" | "email";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const token_hash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;
  const rawNext = searchParams.get("next");

  if (token_hash && type) {
    const supabase = await createClient();
    const { error } = await supabase.auth.verifyOtp({ type, token_hash });
    if (!error) {
      // Confirmação de cadastro: manda direto pra tela de login (ignora
      // qualquer next= do template, que podia apontar pra página órfã e
      // deixar o usuário perdido). Demais tipos (recuperação de senha etc.)
      // seguem o next= informado.
      if (type === "signup") {
        redirect("/login?confirmed=1");
      }
      const next = rawNext?.startsWith("/") && !rawNext.startsWith("//") ? rawNext : "/inicio";
      redirect(next);
    }
  }

  // Página de erro depende do tipo de link: confirmação de cadastro erra
  // pra tela de reenvio (que pede o e-mail de novo), recuperação de senha
  // e demais casos erram pra tela de "esqueci minha senha".
  const errorMessage = encodeURIComponent("Link inválido ou expirado. Solicite um novo.");
  if (type === "signup") {
    redirect(`/cadastro/confirme-email?error=${errorMessage}`);
  }
  redirect(`/recuperar-senha?error=${errorMessage}`);
}
