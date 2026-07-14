import Link from "next/link";

export default function HomePage() {
  return (
    <main className="mx-auto flex max-w-3xl flex-col gap-6 px-6 py-24">
      <h1 className="text-4xl font-semibold tracking-tight">Lumeo</h1>
      <p className="text-lg text-neutral-600">
        Curadoria e verificação para encontros presenciais de baixa pressão.
      </p>
      <div className="flex gap-4 text-sm font-medium">
        <Link href="/como-funciona" className="underline">
          Como funciona
        </Link>
        <Link href="/planos" className="underline">
          Planos
        </Link>
        <Link href="/cadastro/dados" className="underline">
          Criar conta
        </Link>
        <Link href="/login" className="underline">
          Entrar
        </Link>
      </div>
      <div className="flex gap-4 text-xs text-neutral-500">
        <Link href="/termos" className="underline">
          Termos de Uso
        </Link>
        <Link href="/privacidade" className="underline">
          Privacidade
        </Link>
        <Link href="/regras" className="underline">
          Regras
        </Link>
      </div>
    </main>
  );
}
