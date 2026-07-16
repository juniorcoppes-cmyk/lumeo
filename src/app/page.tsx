import Link from "next/link";
import { SobreOLumeo } from "@/components/SobreOLumeo";

export default function HomePage() {
  return (
    <main className="mx-auto flex max-w-3xl flex-col gap-6 px-6 py-24">
      <h1 className="font-display text-5xl text-accent">Lumeo</h1>
      {/* Antes aqui havia só uma linha genérica ("curadoria e verificação para
          encontros presenciais de baixa pressão") que não dizia o que separa o
          Lumeo dos concorrentes. O texto do fundador diz — e esta é a primeira
          página de quem chega sem convite. */}
      <SobreOLumeo className="!text-base" />
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
