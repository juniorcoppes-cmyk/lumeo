import Link from "next/link";
import { SobreOLumeo } from "@/components/SobreOLumeo";
import { ParticiparForm } from "@/components/ParticiparForm";

export const metadata = {
  title: "Quero participar — Secret",
  description:
    "Chegou sem convite? Deixe seu contato que a gente fala com você. Nada aqui é público.",
};

// Porta de entrada pra quem chega sem convite (pelo guia, pela busca, por
// indicação). Em vez da parede "você precisa de convite", a pessoa deixa o
// contato e a administração procura — sem expor o número de ninguém.
export default function ParticiparPage() {
  return (
    <main className="mx-auto max-w-sm px-6 py-16">
      <h1 className="font-display text-4xl text-accent">Secret</h1>

      <SobreOLumeo className="mt-5" />

      <hr className="mt-8 border-line" />

      <h2 className="mt-8 text-2xl">Quero participar</h2>
      <p className="mt-2 text-sm text-foreground/90">
        O Secret é por convite — mas se você chegou sem um, deixe seu contato
        aqui que a gente fala com você.{" "}
        <strong className="text-foreground">
          Nada disto é público e você não precisa se expor agora.
        </strong>{" "}
        Só a administração vê o que você escrever.
      </p>

      <ParticiparForm />

      <p className="mt-8 text-xs text-muted">
        Já faz parte? <Link href="/login" className="text-accent">Entrar</Link>. Tem um
        link de convite? É só abri-lo direto.
      </p>
    </main>
  );
}
