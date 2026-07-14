import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { PasswordInput } from "@/components/PasswordInput";
import { updatePassword } from "./actions";

export default async function RedefinirSenhaPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(
      "/recuperar-senha?error=Sessão de recuperação expirada. Solicite um novo link.",
    );
  }

  return (
    <main className="mx-auto max-w-sm px-6 py-16">
      <h1 className="text-2xl">Nova senha</h1>
      <p className="mt-2 text-sm text-muted">
        Escolha uma nova senha para sua conta.
      </p>
      {error && <p className="mt-4 text-sm text-red-400">{error}</p>}
      <form action={updatePassword} className="mt-6 flex flex-col gap-4">
        <PasswordInput
          name="password"
          placeholder="Nova senha"
          required
          minLength={6}
          className="input"
        />
        <PasswordInput
          name="password_confirmation"
          placeholder="Confirmar nova senha"
          required
          minLength={6}
          className="input"
        />
        <button type="submit" className="btn-primary">
          Salvar nova senha
        </button>
      </form>
    </main>
  );
}
