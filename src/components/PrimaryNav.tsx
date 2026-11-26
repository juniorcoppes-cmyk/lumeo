"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

export type NavItem = {
  href: string;
  label: string;
  icon: ReactNode;
  badge?: number;
};

export function PrimaryNav({ items }: { items: NavItem[] }) {
  const pathname = usePathname();

  return (
    // UMA LINHA SÓ, inclusive em celular estreito (pedido do dono,
    // 26/11/2026). Com seis itens o menu quebrava e o Perfil caía sozinho
    // numa segunda linha, comendo altura e parecendo erro. Em vez de
    // esconder item atrás de "mais", encolhemos ícone, fonte e respiro: a
    // leitura continua, e o que o dedo acerta é o bloco inteiro, não a
    // palavra. No celular eles se espalham pela largura toda (justify-between):
  // agrupados no meio sobrava faixa morta dos dois lados e o alvo do dedo
  // ficava menor do que precisava.
    <nav className="flex w-full items-center justify-between gap-0 sm:w-auto sm:justify-center sm:gap-1">
      {items.map((item) => {
        const active = pathname === item.href || pathname?.startsWith(`${item.href}/`);
        return (
          <Link
            key={item.href}
            href={item.href}
            className={`flex min-w-0 flex-col items-center gap-0.5 rounded-2xl px-1.5 py-1.5 text-[10px] font-medium whitespace-nowrap no-underline transition-colors sm:px-3 sm:text-xs ${
              active
                ? "bg-accent/85 text-on-accent"
                : "text-foreground hover:bg-accent-soft"
            }`}
          >
            <span className="relative [&>svg]:h-[18px] [&>svg]:w-[18px] sm:[&>svg]:h-5 sm:[&>svg]:w-5">
              {item.icon}
              {!!item.badge && (
                <span className="absolute -right-2 -top-1.5 rounded-full bg-background px-1 text-[10px] font-bold text-accent">
                  {item.badge}
                </span>
              )}
            </span>
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
