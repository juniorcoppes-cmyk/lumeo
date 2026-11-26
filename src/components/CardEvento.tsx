import Link from "next/link";
import { EventMeta } from "./EventMeta";

// O cartão de evento, usado na lista dos próximos e na dos que já
// aconteceram. Num evento passado não faz sentido anunciar vaga: ninguém
// mais vai se inscrever, e "Esgotado" num baile de três meses atrás confunde
// em vez de informar.
export type EventoNoCartao = {
  id: string;
  title: string;
  event_date: string;
  location: string;
  address: string | null;
  capacity: number;
  price: number;
  confirmed_count: number;
  thumbUrl?: string;
};

export function CardEvento({
  evento,
  passado = false,
}: {
  evento: EventoNoCartao;
  passado?: boolean;
}) {
  const vagas = evento.capacity - Number(evento.confirmed_count);
  const preco =
    Number(evento.price) > 0 ? `R$ ${Number(evento.price).toFixed(2)}` : "Gratuito";

  return (
    <li
      className={`overflow-hidden rounded-2xl border border-line bg-surface shadow-[0_8px_24px_-12px_rgba(214,82,79,0.25)] ${
        passado ? "opacity-75" : ""
      }`}
    >
      {evento.thumbUrl && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={evento.thumbUrl} alt="" className="aspect-[16/9] w-full object-cover" />
      )}
      <div className="p-4">
        <Link href={`/eventos/${evento.id}`} className="text-lg font-medium">
          {evento.title}
        </Link>
        <EventMeta
          eventDate={evento.event_date}
          location={evento.location}
          address={evento.address}
          className="mt-2"
        />
        <p className="mt-2 text-sm text-muted">
          {passado
            ? `${preco} · ${Number(evento.confirmed_count)} ${
                Number(evento.confirmed_count) === 1 ? "pessoa foi" : "pessoas foram"
              }`
            : `${preco} · ${vagas > 0 ? `${vagas} vagas restantes` : "Esgotado"}`}
        </p>
      </div>
    </li>
  );
}
