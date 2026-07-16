import { CalendarIcon, ClockIcon, MapIcon, MapPinIcon } from "@/components/icons";
import { FUSO } from "@/lib/datas";

// Infos do evento com ícone ao lado (data, horário, local e endereço), cada
// uma na sua linha pra facilitar a leitura. Reutilizado na home, na lista de
// eventos e na página do evento pra ficarem consistentes.
export function EventMeta({
  eventDate,
  location,
  address,
  className,
}: {
  eventDate: string;
  location: string;
  address?: string | null;
  className?: string;
}) {
  const d = new Date(eventDate);
  // timeZone explícito: sem ele isto sai no fuso do servidor (UTC na Vercel).
  const data = d.toLocaleDateString("pt-BR", {
    timeZone: FUSO,
    weekday: "short",
    day: "2-digit",
    month: "long",
  });
  const horario = d.toLocaleTimeString("pt-BR", {
    timeZone: FUSO,
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <div className={`flex flex-col gap-1.5 text-sm text-muted ${className ?? ""}`}>
      <span className="flex items-center gap-2">
        <CalendarIcon className="h-4 w-4 shrink-0 text-accent" />
        <span className="capitalize">{data}</span>
      </span>
      <span className="flex items-center gap-2">
        <ClockIcon className="h-4 w-4 shrink-0 text-accent" />
        {horario}
      </span>
      <span className="flex items-center gap-2">
        <MapIcon className="h-4 w-4 shrink-0 text-accent" />
        {location}
      </span>
      {address && (
        <span className="flex items-center gap-2">
          <MapPinIcon className="h-4 w-4 shrink-0 text-accent" />
          {address}
        </span>
      )}
    </div>
  );
}
