import { createFileRoute, Link } from "@tanstack/react-router";
import { useBankroll } from "@/lib/store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PageHeader } from "@/components/page-header";
import { cn, oddsFmt } from "@/lib/utils";

export const Route = createFileRoute("/cartera")({ component: CarteraPage });

function CarteraPage() {
  const bank = useBankroll();
  const pending = bank.bets.filter((b) => b.result === "pending");
  const settled = bank.bets.filter((b) => b.result !== "pending");
  const profit = settled.reduce((s, b) => {
    if (b.result === "won") return s + b.stake * (b.odds - 1);
    if (b.result === "lost") return s - b.stake;
    return s;
  }, 0);

  return (
    <main>
      <PageHeader title="Cartera">
        Bankroll en este dispositivo. Kelly a un cuarto.{" "}
        <Link to="/apuesta" className="font-semibold text-accent">
          Revisar un Crear Apuesta
        </Link>
      </PageHeader>

      <section className="grid grid-cols-2 gap-3">
        <Stat label="Bankroll" value={`${bank.bankroll.toFixed(0)}`} />
        <Stat label="Unidad" value={`${bank.unit}`} />
        <Stat label="Pendientes" value={`${pending.length}`} />
        <Stat
          label="PnL cerrado"
          value={`${profit >= 0 ? "+" : ""}${profit.toFixed(1)}`}
          tone={profit > 0 ? "up" : profit < 0 ? "down" : undefined}
        />
      </section>

      <section className="ios-group mt-5 p-4">
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="text-[13px] font-medium text-muted">
            Bankroll
            <Input
              className="mt-1.5 bg-surface"
              type="number"
              min={0}
              value={bank.bankroll}
              onChange={(e) => bank.setBankroll(Number(e.target.value))}
            />
          </label>
          <label className="text-[13px] font-medium text-muted">
            Unidad
            <Input
              className="mt-1.5 bg-surface"
              type="number"
              min={1}
              value={bank.unit}
              onChange={(e) => bank.setUnit(Number(e.target.value))}
            />
          </label>
        </div>
      </section>

      <h2 className="ios-section mt-8">Apuestas abiertas</h2>
      {pending.length === 0 ? (
        <p className="px-1 text-[15px] text-muted">
          Nada anotado. Abre un partido con valor y pulsa «Anotar».
        </p>
      ) : (
        <ul className="ios-group">
          {pending.map((b) => (
            <li key={b.id} className="p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-[15px] font-semibold">{b.label}</p>
                  <p className="mt-1 text-[13px] tabular-nums text-muted">
                    {b.stake} @ {oddsFmt(b.odds)}
                  </p>
                </div>
                <Link to="/partido/$id" params={{ id: b.matchId }} className="text-[15px] font-semibold text-accent">
                  Ficha
                </Link>
              </div>
              <div className="mt-3 flex gap-2">
                <Button size="sm" onClick={() => bank.settle(b.id, "won")}>
                  Ganada
                </Button>
                <Button size="sm" variant="secondary" onClick={() => bank.settle(b.id, "lost")}>
                  Perdida
                </Button>
                <Button size="sm" variant="ghost" onClick={() => bank.settle(b.id, "void")}>
                  Nula
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}

      {settled.length > 0 && (
        <>
          <h2 className="ios-section mt-8">Historial</h2>
          <ul className="ios-group">
            {settled.slice(0, 20).map((b) => (
              <li key={b.id} className="flex min-h-[44px] items-center justify-between px-4 py-3 text-[15px]">
                <span className="truncate pr-3">{b.label}</span>
                <span
                  className={cn(
                    "text-[13px] font-semibold capitalize",
                    b.result === "won" && "text-win",
                    b.result === "lost" && "text-danger",
                    b.result === "void" && "text-muted",
                  )}
                >
                  {b.result}
                </span>
              </li>
            ))}
          </ul>
        </>
      )}
    </main>
  );
}

function Stat({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone?: "up" | "down";
}) {
  return (
    <div className="rounded-[16px] bg-elevated p-4">
      <p className="text-[12px] font-medium text-muted">{label}</p>
      <p
        className={cn(
          "mt-1 text-[28px] font-bold tabular-nums tracking-tight",
          tone === "up" && "text-win",
          tone === "down" && "text-danger",
        )}
      >
        {value}
      </p>
    </div>
  );
}
