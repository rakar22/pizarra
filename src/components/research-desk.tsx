import { useState } from "react";
import { Link } from "@tanstack/react-router";
import type { Match, MatchResearch, ResearchGroup, ResearchLine } from "@/lib/football/types";
import { selectionFromResearchLine, selectionKey } from "@/lib/football/builder";
import { kellyFraction } from "@/lib/football/model";
import { cn, oddsFmt, pct } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { useBankroll, useBuilderCoupon } from "@/lib/store";

const GROUPS: { id: ResearchGroup; label: string }[] = [
  { id: "1x2", label: "1X2" },
  { id: "goles", label: "Goles" },
  { id: "btts", label: "BTTS" },
  { id: "resultado_btts", label: "Resultado" },
  { id: "corners", label: "Córners" },
  { id: "tarjetas", label: "Tarjetas" },
  { id: "jugador", label: "Jugador" },
];

export function ResearchDesk({ match, research }: { match: Match; research: MatchResearch }) {
  const [group, setGroup] = useState<ResearchGroup>("1x2");
  const rows = research.lines.filter((l) => l.group === group);
  const hasBet365 =
    research.lines.some((l) => l.marketSource === "Bet365") || match.odds?.source === "Bet365";
  const coupon = useBuilderCoupon();
  const inCoupon = coupon.legs.some((l) => l.match.id === match.id);

  return (
    <section className="mt-6">
      <div className="mb-2 flex items-end justify-between px-1">
        <div>
          <p className="text-[13px] font-medium text-muted">Investigación</p>
          <h2 className="text-[22px] font-bold tracking-tight">Mercados</h2>
        </div>
        {hasBet365 ? <Badge variant="accent">Bet365</Badge> : <Badge variant="outline">Tipo casa</Badge>}
      </div>
      <p className="mb-3 px-1 text-[13px] leading-snug text-muted">
        {inCoupon ? "Este partido ya está en el cupón. " : ""}
        <Link to="/apuesta" className="font-semibold text-accent">
          Crear Apuesta · fiabilidad
        </Link>
      </p>

      <div className="ios-hide-scroll -mx-4 overflow-x-auto px-4">
        <div className="flex w-max flex-nowrap rounded-[9px] bg-elevated p-[2px]">
          {GROUPS.map((g) => (
            <button
              key={g.id}
              type="button"
              onClick={() => setGroup(g.id)}
              className={cn(
                "inline-flex h-[28px] shrink-0 items-center rounded-[7px] px-2.5 text-[13px] font-medium",
                group === g.id ? "bg-surface text-fg shadow-sm" : "text-muted",
              )}
            >
              {g.label}
            </button>
          ))}
        </div>
      </div>

      {group === "corners" && (
        <p className="mt-3 px-1 text-[12px] tabular-nums text-faint">
          λ córners {research.lambdaCorners.home.toFixed(1)}–{research.lambdaCorners.away.toFixed(1)}
        </p>
      )}
      {group === "tarjetas" && (
        <p className="mt-3 px-1 text-[12px] tabular-nums text-faint">
          λ tarjetas {research.lambdaCards.home.toFixed(1)}–{research.lambdaCards.away.toFixed(1)}
        </p>
      )}

      {rows.length === 0 ? (
        <p className="mt-4 px-1 text-[15px] text-muted">
          {group === "jugador"
            ? "Sin per90 de Fotmob para este partido."
            : "Sin líneas en este grupo."}
        </p>
      ) : (
        <ul className="ios-group mt-3">
          {rows.map((l) => (
            <ResearchRow key={l.id + l.label} line={l} match={match} />
          ))}
        </ul>
      )}

      <p className="mt-3 px-1 text-[12px] text-faint">{research.sources.join(" · ")}</p>
    </section>
  );
}

function ResearchRow({ line, match }: { line: ResearchLine; match: Match }) {
  const bank = useBankroll();
  const coupon = useBuilderCoupon();
  const mapped = selectionFromResearchLine(line);
  const price = line.marketOdds ?? line.houseOdds;
  const edge =
    line.marketOdds && line.marketOdds > 1 ? line.modelProb - 1 / line.marketOdds : undefined;
  const kelly = price > 1 ? kellyFraction(line.modelProb, price) : 0;
  const stake = Math.max(bank.unit, Math.round(bank.bankroll * kelly) || bank.unit);

  const addToBuilder = () => {
    if (!mapped) return;
    const existing = coupon.legs.find((l) => l.match.id === match.id);
    const prev = existing?.selections ?? [];
    const key = selectionKey(mapped);
    const already = prev.some((s) => selectionKey(s) === key);
    coupon.upsertLeg(match, already ? prev : [...prev, mapped]);
  };

  return (
    <li className="px-4 py-3">
      <div className="flex items-baseline justify-between gap-3">
        <span className="min-w-0 text-[15px] font-medium leading-snug">
          {line.label}
          {line.player && line.team ? (
            <span className="mt-0.5 block text-[12px] font-normal text-faint">{line.team}</span>
          ) : null}
        </span>
        <span className="shrink-0 text-[15px] font-semibold tabular-nums">
          {line.marketOdds ? oddsFmt(line.marketOdds) : oddsFmt(line.houseOdds)}
        </span>
      </div>
      <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-[12px] tabular-nums text-muted">
        <span>{pct(line.modelProb)}</span>
        <span>justa {oddsFmt(line.fairOdds)}</span>
        <span>{line.marketOdds ? line.marketSource ?? "casa" : "tipo casa"}</span>
        {edge != null && edge >= 0.035 && <Badge variant="value">{pct(edge, 1)}</Badge>}
      </div>
      {mapped && (
        <button type="button" className="mt-1 min-h-11 text-[15px] font-semibold text-accent" onClick={addToBuilder}>
          Añadir al builder
        </button>
      )}
      {kelly > 0 && (
        <button
          type="button"
          className="mt-1 min-h-11 text-[15px] font-semibold text-accent"
          onClick={() =>
            bank.addBet({
              matchId: match.id,
              label: `${match.home.short}–${match.away.short} ${line.label}`,
              market: line.label,
              odds: price,
              stake,
            })
          }
        >
          Anotar {stake} u
        </button>
      )}
    </li>
  );
}
