import { Link } from "@tanstack/react-router";
import type { BuilderAlternative, BuilderCouponScore, BuilderVerdict } from "@/lib/football/builder";
import { bandLabel, coverageLabel, verdictLabel } from "@/lib/football/builder";
import { cn, oddsFmt, pct } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

function verdictClass(v: BuilderVerdict) {
  if (v === "pass") return "text-win";
  if (v === "warn") return "text-[#ff9500]";
  return "text-danger";
}

export function BuilderReport({
  score,
  onApplyAlternative,
}: {
  score: BuilderCouponScore;
  onApplyAlternative?: (alt: BuilderAlternative) => void;
}) {
  return (
    <section className="rounded-[20px] bg-elevated p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[13px] font-medium text-muted">Informe de fiabilidad</p>
          <p className={cn("text-[28px] font-bold tracking-tight", verdictClass(score.verdict))}>
            {verdictLabel(score.verdict)}
          </p>
        </div>
        <Badge variant={score.verdict === "pass" ? "value" : "outline"}>
          {score.legs.length} pierna{score.legs.length === 1 ? "" : "s"}
        </Badge>
      </div>

      <dl className="mt-4 grid grid-cols-2 gap-3">
        <Stat label="Supervivencia cons." value={pct(score.conservativeSurvival)} />
        <Stat label="Independencia" value={pct(score.independenceSurvival)} />
        <Stat label="Banda" value={bandLabel(score.band)} />
        <Stat label="Cobertura" value={coverageLabel(score.coverage)} />
        <Stat label="Justa modelo" value={oddsFmt(score.fairOdds)} hint="No es Bet365" />
        <Stat label="Tipo casa ~4%" value={oddsFmt(score.houseStyleOdds)} hint="Ilustrativa" />
      </dl>

      {score.bottleneck && (
        <p className="mt-4 text-[15px] leading-snug">
          Cuello de botella:{" "}
          <strong>
            {score.bottleneck.matchLabel} · {score.bottleneck.selection.label}
          </strong>{" "}
          ({pct(score.bottleneck.selection.conservativeProb)} conservador).
        </p>
      )}

      {score.issues.length > 0 && (
        <ul className="mt-3 space-y-1 text-[14px] leading-snug text-danger">
          {score.issues.map((i) => (
            <li key={i}>— {i}</li>
          ))}
        </ul>
      )}
      {score.correlations.length > 0 && (
        <ul className="mt-3 space-y-1 text-[14px] leading-snug text-muted">
          {score.correlations.map((i) => (
            <li key={i}>— {i}</li>
          ))}
        </ul>
      )}

      <div className="mt-4 rounded-[14px] bg-surface p-3">
        <p className="text-[13px] font-medium text-muted">Stake sugerido</p>
        <p className="mt-0.5 text-[22px] font-bold tabular-nums">
          {score.stake.amount} u{" "}
          <span className="text-[15px] font-semibold text-muted">({pct(score.stake.fraction, 1)} bankroll)</span>
        </p>
        <p className="mt-1 text-[13px] leading-snug text-muted">{score.stake.reason}</p>
        {score.stake.impliedFromBook != null && (
          <p className="mt-1 text-[12px] tabular-nums text-faint">
            Implícita Bet365 {pct(score.stake.impliedFromBook)}
            {score.stake.edge != null ? ` · hueco modelo ${pct(score.stake.edge, 1)}` : ""}
            {score.stake.kellyFraction != null ? ` · Kelly ¼ ${pct(score.stake.kellyFraction, 1)}` : ""}
          </p>
        )}
      </div>

      {score.alternatives.length > 0 && (
        <div className="mt-5">
          <p className="text-[13px] font-medium text-muted">Más fiable</p>
          <ul className="mt-2 space-y-2">
            {score.alternatives.map((alt) => (
              <li key={alt.id} className="rounded-[14px] bg-surface p-3">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="text-[15px] font-semibold">{alt.title}</p>
                    <p className="mt-0.5 text-[13px] leading-snug text-muted">{alt.detail}</p>
                    <p className="mt-1 text-[12px] tabular-nums text-faint">
                      Supervivencia {pct(alt.conservativeSurvival)} · {verdictLabel(alt.verdict)}
                    </p>
                  </div>
                  {onApplyAlternative && (
                    <Button type="button" size="sm" variant="secondary" onClick={() => onApplyAlternative(alt)}>
                      Usar
                    </Button>
                  )}
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}

      <p className="mt-4 text-[12px] leading-relaxed text-faint">
        Independencia entre piernas + recorte del {Math.round(3)}% por pierna extra y haircuts de cobertura.
        Las cuotas justas son del modelo. Bet365 no tiene API pública: si pegas la cuota real del cupón, se
        compara; si no, no se finge.{" "}
        <Link to="/cartera" className="font-semibold text-accent">
          Cartera
        </Link>
      </p>
    </section>
  );
}

function Stat({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div>
      <p className="text-[12px] font-medium text-muted">{label}</p>
      <p className="text-[20px] font-bold tabular-nums tracking-tight">{value}</p>
      {hint ? <p className="text-[11px] text-faint">{hint}</p> : null}
    </div>
  );
}
