import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery } from "@tanstack/react-query";
import { ChevronLeft, Star } from "lucide-react";
import { getBriefing, getMatch } from "@/lib/football/server";
import { kellyFraction } from "@/lib/football/model";
import { cn, formatFullDate, oddsFmt, pct } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { FormPills } from "@/components/form-pills";
import { MatchIntelPanel } from "@/components/match-intel";
import { ProbBar } from "@/components/prob-bar";
import { ResearchDesk } from "@/components/research-desk";
import { ScoutDesk } from "@/components/scout-desk";
import { Skeleton } from "@/components/ui/skeleton";
import { TeamMark } from "@/components/team-mark";
import { useBankroll, useWatchlist } from "@/lib/store";
import type { Match, MatchIntel, MatchResearch, StandingRow, ValuePick } from "@/lib/football/types";

export const Route = createFileRoute("/partido/$id")({
  loader: ({ params }) => getMatch({ data: { id: params.id } }),
  component: MatchPage,
});

function MatchPage() {
  const { id } = Route.useParams();
  const initial = Route.useLoaderData();
  const { data, isLoading, isError } = useQuery({
    queryKey: ["match", id],
    queryFn: () => getMatch({ data: { id } }),
    initialData: initial,
  });
  const match = data?.match;
  const table = data?.table;
  const intel = data?.intel;
  const research = data?.research ?? null;

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-40" />
        <Skeleton className="h-48 rounded-[20px]" />
        <Skeleton className="h-64 rounded-[16px]" />
      </div>
    );
  }

  if (isError || !match) {
    return (
      <div className="py-20 text-center">
        <p className="text-[15px] text-muted">Partido no encontrado en la agenda actual.</p>
        <Link to="/" className="mt-4 inline-flex h-11 items-center font-semibold text-accent">
          Volver a la agenda
        </Link>
      </div>
    );
  }

  return (
    <MatchView
      match={match}
      tableRows={table?.rows ?? []}
      intel={intel ?? null}
      research={research}
    />
  );
}

function MatchView({
  match,
  tableRows,
  intel,
  research,
}: {
  match: Match;
  tableRows: StandingRow[];
  intel: MatchIntel | null;
  research: MatchResearch | null;
}) {
  const watch = useWatchlist();
  const bank = useBankroll();
  const saved = watch.ids.includes(match.id);
  const brief = useMutation({
    mutationFn: () => getBriefing({ data: { matchId: match.id } }),
  });

  const markets: { label: string; model: number; price?: number }[] = [
    { label: "Local", model: match.model.home, price: match.odds?.home },
    { label: "Empate", model: match.model.draw, price: match.odds?.draw },
    { label: "Visitante", model: match.model.away, price: match.odds?.away },
    { label: "Más 2.5", model: match.model.over25, price: match.odds?.over25 },
    { label: "Menos 2.5", model: match.model.under25, price: match.odds?.under25 },
    { label: "Ambos anotan sí", model: match.model.bttsYes, price: match.odds?.bttsYes },
    { label: "Ambos anotan no", model: match.model.bttsNo, price: match.odds?.bttsNo },
  ];

  return (
    <main>
      <div className="-mx-1 mb-1 flex items-center justify-between">
        <Link
          to="/"
          className="inline-flex h-11 items-center gap-0.5 text-[17px] font-medium text-accent"
        >
          <ChevronLeft className="size-6" strokeWidth={2.2} />
          Agenda
        </Link>
        <button
          type="button"
          onClick={() => watch.toggle(match.id)}
          className="inline-flex size-11 items-center justify-center text-accent"
          aria-label={saved ? "Quitar de seguimiento" : "Seguir"}
        >
          <Star className={cn("size-5", saved && "fill-accent")} />
        </button>
      </div>

      <p className="text-[13px] font-medium text-muted">
        {match.league}
        {match.country ? ` · ${match.country}` : ""}
      </p>
      <h1 className="mt-1 text-[28px] font-bold leading-[1.1] tracking-tight">
        {match.home.name}
        <span className="font-semibold text-muted"> – </span>
        {match.away.name}
      </h1>
      <p className="mt-1 text-[15px] capitalize text-muted">{formatFullDate(match.kickoff)}</p>
      {match.status === "in" && (
        <Badge variant="live" className="mt-2">
          En juego
        </Badge>
      )}

      <section className="mt-5 rounded-[20px] bg-elevated p-5">
        <div className="grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-3">
          <Club side={match.home} align="right" />
          <div className="text-center">
            {match.status === "pre" ? (
              <p className="text-[22px] font-semibold text-faint">vs</p>
            ) : (
              <p className="text-[32px] font-bold tabular-nums">
                {match.home.score ?? "0"}–{match.away.score ?? "0"}
              </p>
            )}
            <p className="mt-1 text-[12px] tabular-nums text-faint">
              λ {match.model.lambdaHome.toFixed(2)} / {match.model.lambdaAway.toFixed(2)}
            </p>
          </div>
          <Club side={match.away} align="left" />
        </div>
        <div className="mt-5">
          <ProbBar home={match.model.home} draw={match.model.draw} away={match.model.away} />
          <p className="mt-2 text-center text-[12px] text-faint">
            Confianza {pct(match.model.confidence)}
          </p>
        </div>
      </section>

      <h2 className="ios-section mt-6">Mercado vs modelo</h2>
      <ul className="ios-group">
        {markets.map((m) => (
          <MarketRow key={m.label} {...m} bankroll={bank.bankroll} match={match} />
        ))}
      </ul>
      {match.odds && (
        <p className="mt-2 px-1 text-[12px] text-faint">Cuotas {match.odds.source}</p>
      )}

      {match.values.length > 0 && (
        <section className="mt-6">
          <h2 className="ios-section">Valor detectado</h2>
          <div className="grid gap-2">
            {match.values.map((v) => (
              <ValueRow key={v.label + v.market} pick={v} match={match} />
            ))}
          </div>
        </section>
      )}

      {research && <ResearchDesk match={match} research={research} />}

      <section className="mt-6">
        <div className="mb-2 flex items-center justify-between px-1">
          <div>
            <p className="text-[13px] font-medium text-muted">Scout</p>
            <h2 className="text-[22px] font-bold tracking-tight">Briefing</h2>
          </div>
          <Button onClick={() => brief.mutate()} disabled={brief.isPending} size="sm">
            {brief.isPending ? "Leyendo…" : "Pedir"}
          </Button>
        </div>
        <div className="ios-group px-4 py-4">
          {brief.data?.ok && (
            <article className="space-y-3">
              <h3 className="text-[20px] font-bold tracking-tight">{brief.data.brief.headline}</h3>
              <p className="whitespace-pre-wrap text-[15px] leading-relaxed text-muted">
                {brief.data.brief.narrative}
              </p>
              <ul className="list-disc space-y-1 pl-5 text-[15px]">
                {brief.data.brief.keys.map((k) => (
                  <li key={k}>{k}</li>
                ))}
              </ul>
              <p className="text-[15px]">
                Inclinación: <strong>{leanLabel(brief.data.brief.lean, match)}</strong> · Mercado:{" "}
                {brief.data.brief.market} · Confianza {brief.data.brief.confidence}/5
              </p>
              <ul className="text-[15px] text-muted">
                {brief.data.brief.risks.map((r) => (
                  <li key={r}>— {r}</li>
                ))}
              </ul>
              {brief.data.source === "model" && (
                <p className="text-[12px] text-faint">Briefing del modelo (Scout no disponible).</p>
              )}
            </article>
          )}
          {brief.data && !brief.data.ok && (
            <p className="text-[15px] text-danger">{brief.data.error}</p>
          )}
          {!brief.data && (
            <p className="text-[15px] text-muted">
              El Scout solo habla cuando se lo pides.
            </p>
          )}
        </div>
      </section>

      {intel && <MatchIntelPanel intel={intel} />}

      <section className="mt-6">
        <h2 className="ios-section">Pregunta al Scout</h2>
        <div className="ios-group p-4">
          <ScoutDesk lockedMatch={match} compact />
        </div>
      </section>

      {tableRows.length > 0 && (
        <section className="mt-6">
          <div className="ios-section flex items-center justify-between">
            <span>Clasificación</span>
            <Link
              to="/ligas/$slug"
              params={{ slug: match.leagueSlug }}
              className="font-semibold text-accent"
            >
              Ver liga
            </Link>
          </div>
          <div className="ios-group overflow-hidden">
            <StandingsMini
              rows={nearbyRows(tableRows, match.home.name, match.away.name)}
              highlight={[match.home.name, match.away.name]}
            />
          </div>
        </section>
      )}
    </main>
  );
}

function Club({
  side,
  align,
}: {
  side: Match["home"];
  align: "left" | "right";
}) {
  return (
    <div className={cn("flex items-center gap-2", align === "right" && "flex-row-reverse text-right")}>
      <TeamMark name={side.name} logo={side.logo} size={48} />
      <div className="min-w-0">
        <p className="truncate text-[15px] font-semibold">{side.name}</p>
        {side.rank != null && (
          <p className="text-[12px] tabular-nums text-faint">
            #{side.rank} · {side.points} pts
          </p>
        )}
        <div className={cn("mt-1", align === "right" && "flex justify-end")}>
          <FormPills form={side.form} />
        </div>
      </div>
    </div>
  );
}

function MarketRow({
  label,
  model,
  price,
  bankroll,
  match,
}: {
  label: string;
  model: number;
  price?: number;
  bankroll: number;
  match: Match;
}) {
  const implied = price ? 1 / price : undefined;
  const edge = implied != null ? model - implied : undefined;
  const kelly = price ? kellyFraction(model, price) : 0;
  const stake = Math.round(bankroll * kelly);
  const bank = useBankroll();

  return (
    <li className="px-4 py-3">
      <div className="flex items-center justify-between gap-3 text-[15px]">
        <span className="font-medium">{label}</span>
        <span className="flex items-center gap-3 tabular-nums">
          <span className="text-muted">{pct(model)}</span>
          <span className="min-w-12 text-right font-semibold">{price ? oddsFmt(price) : "—"}</span>
        </span>
      </div>
      {edge != null && edge >= 0.035 && (
        <p className="mt-0.5 text-[12px] font-semibold text-accent">+{pct(edge, 1)} vs implícita</p>
      )}
      {price && kelly > 0 && (
        <button
          type="button"
          className="mt-1 min-h-11 text-[15px] font-semibold text-accent"
          onClick={() =>
            bank.addBet({
              matchId: match.id,
              label: `${match.home.short}–${match.away.short} ${label}`,
              market: label,
              odds: price,
              stake: Math.max(bank.unit, stake || bank.unit),
            })
          }
        >
          Anotar {Math.max(bank.unit, stake || bank.unit)} u
        </button>
      )}
    </li>
  );
}

function ValueRow({ pick, match }: { pick: ValuePick; match: Match }) {
  const bank = useBankroll();
  const stake = Math.max(
    bank.unit,
    Math.round(bank.bankroll * kellyFraction(pick.modelProb, pick.marketOdds)),
  );
  return (
    <div className="rounded-[16px] bg-elevated p-4">
      <div className="flex items-center justify-between gap-2">
        <p className="text-[15px] font-semibold">
          {pick.market} · {pick.label}
        </p>
        <Badge variant="value">{pct(pick.edge, 1)}</Badge>
      </div>
      <p className="mt-1 text-[12px] tabular-nums text-muted">
        Modelo {pct(pick.modelProb)} · Justa {oddsFmt(pick.fairOdds)} · Mercado {oddsFmt(pick.marketOdds)}
      </p>
      <Button
        size="sm"
        variant="ghost"
        className="mt-1 px-0"
        onClick={() =>
          bank.addBet({
            matchId: match.id,
            label: `${match.home.short}–${match.away.short} ${pick.label}`,
            market: pick.label,
            odds: pick.marketOdds,
            stake,
          })
        }
      >
        Anotar {stake} u
      </Button>
    </div>
  );
}

function nearbyRows(rows: StandingRow[], a: string, b: string) {
  const idx = rows.map((r, i) => ({ r, i, hit: r.name === a || r.name === b }));
  const hits = idx.filter((x) => x.hit).map((x) => x.i);
  if (!hits.length) return rows.slice(0, 8);
  const lo = Math.max(0, Math.min(...hits) - 2);
  const hi = Math.min(rows.length, Math.max(...hits) + 3);
  return rows.slice(lo, hi);
}

function StandingsMini({
  rows,
  highlight,
}: {
  rows: StandingRow[];
  highlight: string[];
}) {
  return (
    <table className="w-full text-[13px]">
      <thead className="text-[11px] font-semibold text-faint">
        <tr>
          <th className="px-4 py-2 text-left font-semibold">#</th>
          <th className="py-2 text-left font-semibold">Equipo</th>
          <th className="px-2 py-2 text-right font-semibold">PJ</th>
          <th className="px-2 py-2 text-right font-semibold">Pts</th>
          <th className="px-4 py-2 text-right font-semibold">DG</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((r) => {
          const on = highlight.some((n) => n === r.name);
          return (
            <tr key={r.teamId} className={cn("border-t border-black/[0.08]", on && "bg-accent/10")}>
              <td className="px-4 py-2.5 tabular-nums text-muted">{r.rank}</td>
              <td className="py-2.5 font-medium">{r.name}</td>
              <td className="px-2 py-2.5 text-right tabular-nums text-muted">{r.played}</td>
              <td className="px-2 py-2.5 text-right font-semibold tabular-nums">{r.points}</td>
              <td className="px-4 py-2.5 text-right tabular-nums text-muted">
                {r.gd > 0 ? `+${r.gd}` : r.gd}
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}

function leanLabel(lean: string, match: Match) {
  if (lean === "home") return match.home.name;
  if (lean === "away") return match.away.name;
  if (lean === "draw") return "Empate";
  return "Pasar";
}
