import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export default async function CadastroAguardandoPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: verification } = await supabase
    .from("verifications")
    .select("status, rejection_reason")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (verification?.status === "approved") {
    redirect("/inicio");
  }

  return (
    <main className="mx-auto max-w-sm px-6 py-16">
      <h1 className="text-2xl">Cadastro em análise</h1>
      {verification?.status === "rejected" ? (
        <div className="mt-4">
          <p className="text-sm text-red-400">
            Verificação reprovada: {verification.rejection_reason}
          </p>
          <Link
            href="/cadastro/documento"
            className="mt-2 inline-block text-sm"
          >
            Enviar novamente o documento e o vídeo
          </Link>
        </div>
      ) : (
        <p className="mt-2 text-sm text-muted">
          Nossa equipe está analisando seu documento e vídeo. Você será
          avisado assim que a verificação for concluída.
        </p>
      )}
    </main>
  );
}
