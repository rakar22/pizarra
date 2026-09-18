import { useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ChevronRight, Trash2 } from "lucide-react";
import { getBoard } from "@/lib/football/server";
import {
  scoreBuilderCoupon,
  selectionKey,
  suggestReliableSelections,
  type BuilderAlternative,
  type ReliabilityProfile,
} from "@/lib/football/builder";
import { parseCouponText } from "@/lib/football/builder-parse";
import type { Match } from "@/lib/football/types";
import { useBankroll, useBuilderCoupon } from "@/lib/store";
import { cn, formatKickoff, pct } from "@/lib/utils";
import { BuilderLegEditor } from "@/components/builder-leg-editor";
import { BuilderReport } from "@/components/builder-report";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PageHeader } from "@/components/page-header";
import { Textarea } from "@/components/ui/textarea";
import { Disclaimer } from "@/components/disclaimer";
import { TeamMark } from "@/components/team-mark";

export const Route = createFileRoute("/apuesta")({
  loader: () => getBoard(),
  component: ApuestaPage,
});

const PROFILES: { id: ReliabilityProfile; label: string }[] = [
  { id: "estricto", label: "Estricto" },
  { id: "equilibrado", label: "Equilibrado" },
  { id: "flexible", label: "Flexible" },
];

function ApuestaPage() {
  const initial = Route.useLoaderData();
  const { data } = useQuery({
    queryKey: ["board"],
    queryFn: () => getBoard(),
    initialData: initial,
  });
  const matches = useMemo(() => data?.matches ?? [], [data?.matches]);
  const bank = useBankroll();
  const coupon = useBuilderCoupon();
  const [paste, setPaste] = useState("");
  const [pasteNotes, setPasteNotes] = useState<string[]>([]);
  const [openId, setOpenId] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [help, setHelp] = useState(false);

  const boardById = useMemo(() => new Map(matches.map((m) => [m.id, m])), [matches]);
  const hydrated = useMemo(
    () =>
      coupon.legs.map((leg) => ({
        match: boardById.get(leg.match.id) ?? leg.match,
        selections: leg.selections,
      })),
    [coupon.legs, boardById],
  );

  const parsedOdds = Number(String(coupon.couponOdds).replace(",", "."));
  const score = useMemo(
    () =>
      scoreBuilderCoupon(hydrated, {
        profile: coupon.profile,
        bankroll: bank.bankroll,
        unit: bank.unit,
        couponOdds: Number.isFinite(parsedOdds) && parsedOdds > 1 ? parsedOdds : undefined,
      }),
    [hydrated, coupon.profile, bank.bankroll, bank.unit, parsedOdds],
  );

  const upcoming = useMemo(() => {
    const q = query.trim().toLowerCase();
    return matches
      .filter((m) => m.status === "pre")
      .filter((m) => {
        if (!q) return true;
        return `${m.home.name} ${m.away.name} ${m.league}`.toLowerCase().includes(q);
      })
      .slice(0, 24);
  }, [matches, query]);

  const applyPaste = () => {
    const parsed = parseCouponText(paste, matches);
    setPasteNotes(parsed.notes);
    for (const leg of parsed.legs) {
      if (!leg.match || !leg.selections.length) continue;
      coupon.upsertLeg(leg.match, leg.selections);
    }
  };

  const applyAlt = (alt: BuilderAlternative) => {
    coupon.replaceLegs(alt.legs.map((l) => ({ match: l.match, selections: l.selections })));
  };

  const anotar = () => {
    if (!hydrated.length || score.stake.amount <= 0) return;
    const odds = Number.isFinite(parsedOdds) && parsedOdds > 1 ? parsedOdds : score.fairOdds;
    bank.addBet({
      matchId: hydrated[0].match.id,
      label: `Crear Apuesta · ${hydrated.length} piernas`,
      market: Number.isFinite(parsedOdds) && parsedOdds > 1 ? "acumulador Bet365" : "acumulador justa modelo",
      odds,
      stake: score.stake.amount,
    });
  };

  return (
    <main>
      <PageHeader kicker="Investigación" title="Crear Apuesta">
        Revisa builders Bet365 (goles blandos, córners, tarjetas). El modelo puntúa fiabilidad — no vende
        picks ni finge cuotas de casa.
      </PageHeader>

      <div className="ios-hide-scroll -mx-4 mb-5 overflow-x-auto px-4">
        <div className="flex w-max rounded-full bg-elevated p-[2px]">
          {PROFILES.map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => coupon.setProfile(p.id)}
              className={cn(
                "h-8 rounded-full px-3.5 text-[13px] font-semibold",
                coupon.profile === p.id ? "bg-fg text-bg" : "text-fg",
              )}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {hydrated.length > 0 && (
        <div className="mb-6">
          <BuilderReport score={score} onApplyAlternative={applyAlt} />
          <div className="mt-3 grid gap-3 sm:grid-cols-[1fr_auto] sm:items-end">
            <label className="text-[13px] font-medium text-muted">
              Cuota Bet365 del cupón (opcional)
              <Input
                className="mt-1.5 bg-elevated"
                inputMode="decimal"
                placeholder="ej. 24.30 — la de tu boleto, no inventada"
                value={coupon.couponOdds}
                onChange={(e) => coupon.setCouponOdds(e.target.value)}
              />
            </label>
            <div className="flex gap-2">
              <Button type="button" onClick={anotar} disabled={score.stake.amount <= 0}>
                Anotar {score.stake.amount} u
              </Button>
              <Button type="button" variant="secondary" onClick={() => coupon.clear()}>
                Vaciar
              </Button>
            </div>
          </div>
        </div>
      )}

      {hydrated.length > 0 && (
        <>
          <h2 className="ios-section">Piernas</h2>
          <ul className="ios-group mb-6">
            {hydrated.map((leg) => {
              const open = openId === leg.match.id;
              const legScore = score.legs.find((l) => l.matchId === leg.match.id);
              return (
                <li key={leg.match.id} className="p-4">
                  <div className="flex items-start gap-3">
                    <div className="min-w-0 flex-1">
                      <p className="text-[15px] font-semibold">
                        {leg.match.home.short}–{leg.match.away.short}
                      </p>
                      <p className="text-[12px] text-muted">
                        {leg.match.league} · {formatKickoff(leg.match.kickoff)}
                        {legScore ? ` · ${pct(legScore.conservativeJoint)} cons.` : ""}
                      </p>
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        {leg.selections.map((s) => (
                          <span
                            key={selectionKey(s)}
                            className="rounded-full bg-surface px-2 py-0.5 text-[12px] font-medium"
                          >
                            {s.label ?? s.kind}
                          </span>
                        ))}
                      </div>
                    </div>
                    <button
                      type="button"
                      className="inline-flex size-11 items-center justify-center text-danger"
                      aria-label="Quitar pierna"
                      onClick={() => coupon.removeLeg(leg.match.id)}
                    >
                      <Trash2 className="size-4" />
                    </button>
                  </div>
                  <button
                    type="button"
                    className="mt-2 min-h-11 text-[15px] font-semibold text-accent"
                    onClick={() => setOpenId(open ? null : leg.match.id)}
                  >
                    {open ? "Cerrar mercados" : "Editar mercados"}
                  </button>
                  {open && (
                    <div className="mt-3">
                      <BuilderLegEditor
                        match={leg.match}
                        selected={leg.selections}
                        onChange={(next) => coupon.setLegSelections(leg.match.id, next)}
                      />
                    </div>
                  )}
                  <p className="mt-2">
                    <Link
                      to="/partido/$id"
                      params={{ id: leg.match.id }}
                      className="text-[13px] font-semibold text-accent"
                    >
                      Ficha del partido
                    </Link>
                  </p>
                </li>
              );
            })}
          </ul>
        </>
      )}

      <h2 className="ios-section">Pegar boleto</h2>
      <div className="ios-group p-4">
        <p className="text-[13px] leading-snug text-muted">
          Pega el texto de un Crear Apuesta (equipos + Más de 1,5 goles, córners, tarjetas). Se cruzan con la
          agenda actual.
        </p>
        <Textarea
          className="mt-3 min-h-32 rounded-[12px] text-[15px]"
          value={paste}
          onChange={(e) => setPaste(e.target.value)}
          placeholder={"Chelsea vs Arsenal\nMás de 1,5 goles\nMás de 8,5 córners\nAmbos equipos reciben tarjeta"}
        />
        <Button type="button" className="mt-3" variant="secondary" onClick={applyPaste} disabled={!paste.trim()}>
          Cargar al cupón
        </Button>
        {pasteNotes.length > 0 && (
          <ul className="mt-3 space-y-1 text-[13px] text-muted">
            {pasteNotes.map((n) => (
              <li key={n}>— {n}</li>
            ))}
          </ul>
        )}
      </div>

      <h2 className="ios-section mt-8">Añadir desde la agenda</h2>
      <Input
        className="mb-3"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Buscar equipo o liga"
      />
      <ul className="ios-group">
        {upcoming.map((m) => (
          <AgendaAddRow
            key={m.id}
            match={m}
            inCoupon={coupon.legs.some((l) => l.match.id === m.id)}
            onAdd={() => coupon.upsertLeg(m, suggestReliableSelections(m))}
          />
        ))}
      </ul>
      {upcoming.length === 0 && (
        <p className="mt-3 px-1 text-[15px] text-muted">No hay partidos previos en este filtro.</p>
      )}

      <button
        type="button"
        className="mt-8 min-h-11 text-[15px] font-semibold text-accent"
        onClick={() => setHelp((h) => !h)}
      >
        {help ? "Ocultar cómo se puntúa" : "Cómo se puntúa"}
      </button>
      {help && (
        <div className="mt-2 space-y-2 text-[14px] leading-relaxed text-muted">
          <p>
            Cada selección usa el Poisson del partido (goles del modelo; córners y tarjetas con priors de liga
            escalados por λ). La pierna es el producto de familias (goles / córners / tarjetas), no un tip.
          </p>
          <p>
            El cupón asume independencia entre partidos y recorta un 3% por pierna extra. Props de jugador y
            ligas oscuras llevan haircut. Más de 2.5 solo entra en el stack «más fiable» si el modelo lo
            sostiene de verdad.
          </p>
          <p>
            Tope blando {score.thresholds.maxLegsSoft} piernas, duro {score.thresholds.maxLegsHard}. Un 9-fold
            de líneas blandas (3€ → ~73€) casi siempre falla el filtro: el producto se come la fiabilidad.
          </p>
        </div>
      )}

      <Disclaimer className="mt-8 text-[12px] leading-relaxed text-faint" />
    </main>
  );
}

function AgendaAddRow({
  match,
  inCoupon,
  onAdd,
}: {
  match: Match;
  inCoupon: boolean;
  onAdd: () => void;
}) {
  return (
    <li className="flex min-h-[64px] items-center gap-3 px-4 py-2">
      <div className="flex -space-x-1">
        <TeamMark name={match.home.name} logo={match.home.logo} size={22} />
        <TeamMark name={match.away.name} logo={match.away.logo} size={22} />
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-[15px] font-semibold">
          {match.home.short}–{match.away.short}
        </p>
        <p className="text-[12px] text-muted">
          {match.league} · {formatKickoff(match.kickoff)} · O1.5 {pct(match.model.over15)}
        </p>
      </div>
      {inCoupon ? (
        <span className="text-[13px] font-semibold text-accent">En cupón</span>
      ) : (
        <button type="button" onClick={onAdd} className="inline-flex h-11 items-center font-semibold text-accent">
          Añadir
          <ChevronRight className="size-4" />
        </button>
      )}
    </li>
  );
}
