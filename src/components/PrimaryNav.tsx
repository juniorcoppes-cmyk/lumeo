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
    <nav className="flex flex-wrap items-center justify-center gap-1">
      {items.map((item) => {
        const active = pathname === item.href || pathname?.startsWith(`${item.href}/`);
        return (
          <Link
            key={item.href}
            href={item.href}
            className={`flex flex-col items-center gap-0.5 rounded-2xl px-3 py-1.5 text-xs font-medium no-underline transition-colors ${
              active
                ? "bg-accent text-on-accent"
                : "text-muted hover:bg-accent-soft hover:text-foreground"
            }`}
          >
            <span className="relative">
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
