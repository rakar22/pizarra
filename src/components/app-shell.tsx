import type { ReactNode } from "react";
import { Link, useRouterState } from "@tanstack/react-router";
import { Calendar, Layers, LineChart, ScanSearch, Table2, Wallet } from "lucide-react";
import { cn } from "@/lib/utils";
import { Disclaimer } from "@/components/disclaimer";

const NAV = [
  { to: "/", label: "Agenda", icon: Calendar },
  { to: "/valor", label: "Valor", icon: LineChart },
  { to: "/ligas", label: "Ligas", icon: Table2 },
  { to: "/apuesta", label: "Apuesta", icon: Layers },
  { to: "/analista", label: "Scout", icon: ScanSearch },
  { to: "/cartera", label: "Cartera", icon: Wallet },
] as const;

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  return (
    <div className="flex min-h-dvh flex-col overflow-x-hidden bg-bg">
      <header className="ios-blur sticky top-0 z-40 hidden border-b border-black/5 md:block">
        <div className="mx-auto flex h-12 max-w-3xl items-center justify-between gap-4 px-5">
          <Link to="/" className="flex items-center gap-2">
            <span className="inline-flex size-7 items-center justify-center rounded-[8px] bg-accent text-[15px] font-bold leading-none text-accent-fg">
              P
            </span>
            <span className="text-[17px] font-semibold tracking-tight">Pizarra</span>
          </Link>
          <nav className="flex items-center">
            {NAV.map((item) => {
              const active =
                item.to === "/"
                  ? pathname === "/"
                  : pathname === item.to || pathname.startsWith(`${item.to}/`);
              return (
                <Link
                  key={item.to}
                  to={item.to}
                  className={cn(
                    "inline-flex h-9 items-center rounded-full px-2.5 text-[13px] font-medium transition-colors duration-150",
                    active ? "bg-fg text-bg" : "text-muted hover:text-fg",
                  )}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </div>
      </header>

      <div className="mx-auto w-full max-w-3xl flex-1 px-4 pb-28 pt-[calc(env(safe-area-inset-top)+8px)] md:px-5 md:pb-16 md:pt-8">
        {children}
      </div>

      <footer className="mx-auto hidden w-full max-w-3xl px-5 pb-10 md:block">
        <Disclaimer />
      </footer>

      <nav className="ios-blur fixed inset-x-0 bottom-0 z-40 border-t border-black/[0.08] pb-[env(safe-area-inset-bottom)] md:hidden">
        <ul className="mx-auto grid max-w-lg grid-cols-6">
          {NAV.map((item) => {
            const Icon = item.icon;
            const active =
              item.to === "/"
                ? pathname === "/"
                : pathname === item.to || pathname.startsWith(`${item.to}/`);
            return (
              <li key={item.to}>
                <Link
                  to={item.to}
                  className={cn(
                    "flex h-[50px] flex-col items-center justify-center gap-0.5 text-[10px] font-medium",
                    active ? "text-accent" : "text-faint",
                  )}
                >
                  <Icon className="size-[22px]" strokeWidth={active ? 2.15 : 1.6} />
                  {item.label}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </div>
  );
}
