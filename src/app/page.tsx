import Link from "next/link";

export default function HomePage() {
  return (
    <main className="mx-auto flex max-w-3xl flex-col gap-6 px-6 py-24">
      <h1 className="text-4xl">Lumeo</h1>
      <p className="text-lg text-muted">
        Curadoria e verificação para encontros presenciais de baixa pressão.
      </p>
      <div className="flex flex-wrap gap-3 text-sm font-medium">
        <Link href="/como-funciona" className="btn-secondary">
          Como funciona
        </Link>
        <Link href="/planos" className="btn-secondary">
          Planos
        </Link>
        <Link href="/cadastro/dados" className="btn-primary">
          Criar conta
        </Link>
        <Link href="/login" className="btn-primary">
          Entrar
        </Link>
      </div>
      <div className="flex gap-4 text-xs text-muted">
        <Link href="/termos">
          Termos de Uso
        </Link>
        <Link href="/privacidade">
          Privacidade
        </Link>
        <Link href="/regras">
          Regras
        </Link>
      </div>
    </main>
  );
}
