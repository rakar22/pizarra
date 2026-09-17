import { Link } from "@tanstack/react-router";
import { ChevronRight, Star } from "lucide-react";
import type { Match } from "@/lib/football/types";
import { cn, formatKickoff, pct } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { FormPills } from "@/components/form-pills";
import { ProbBar } from "@/components/prob-bar";
import { TeamMark } from "@/components/team-mark";
import { useWatchlist } from "@/lib/store";

export function MatchCard({
  match,
  featured = false,
  grouped = false,
}: {
  match: Match;
  featured?: boolean;
  grouped?: boolean;
}) {
  const watch = useWatchlist();
  const saved = watch.ids.includes(match.id);

  if (grouped) {
    return (
      <article>
        <Link
          to="/partido/$id"
          params={{ id: match.id }}
          className="flex min-h-[72px] items-center gap-3 px-4 py-2.5 active:bg-black/[0.04]"
        >
          <div className="min-w-0 flex-1">
            <p className="mb-1 truncate text-[12px] font-medium text-muted">
              {match.league}
              {match.status === "in" ? " · En juego" : ""}
              {match.bestValue?.market === "1X2" ? ` · Valor ${pct(match.bestValue.edge, 1)}` : ""}
            </p>
            <TeamLine side={match.home} />
            <TeamLine side={match.away} className="mt-1" />
          </div>
          <div className="flex shrink-0 flex-col items-end gap-0.5 pl-2">
            <time className="text-[15px] font-semibold tabular-nums">
              {match.status === "pre" ? formatKickoff(match.kickoff) : match.statusDetail}
            </time>
            {match.odds ? (
              <p className="text-[11px] tabular-nums text-faint">
                {match.odds.home.toFixed(2)}
                {match.odds.draw != null ? `  ${match.odds.draw.toFixed(2)}` : ""}  {match.odds.away.toFixed(2)}
              </p>
            ) : null}
          </div>
          <ChevronRight className="size-[18px] shrink-0 text-faint" strokeWidth={2.4} />
        </Link>
      </article>
    );
  }

  return (
    <article className={cn("relative bg-elevated p-4", featured ? "rounded-[20px] p-5" : "rounded-[16px]")}>
      <div className="mb-3 flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2">
          <span className="truncate text-[13px] font-medium text-muted">{match.league}</span>
          {match.status === "in" && <Badge variant="live">En juego</Badge>}
          {match.bestValue && match.bestValue.market === "1X2" && (
            <Badge variant="value">
              Valor {match.bestValue.label} {pct(match.bestValue.edge, 1)}
            </Badge>
          )}
        </div>
        <div className="flex items-center gap-1">
          <time className="text-[15px] font-semibold tabular-nums">
            {match.status === "pre" ? formatKickoff(match.kickoff) : match.statusDetail}
          </time>
          <button
            type="button"
            aria-label={saved ? "Quitar de seguimiento" : "Seguir partido"}
            onClick={() => watch.toggle(match.id)}
            className="inline-flex size-11 items-center justify-center rounded-full text-accent"
          >
            <Star className={cn("size-[18px]", saved && "fill-accent")} />
          </button>
        </div>
      </div>

      <Link to="/partido/$id" params={{ id: match.id }} className="block">
        <div className="grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-3">
          <TeamBlock side={match.home} align="right" featured={featured} />
          <Score match={match} />
          <TeamBlock side={match.away} align="left" featured={featured} />
        </div>
        <div className="mt-4">
          <ProbBar home={match.model.home} draw={match.model.draw} away={match.model.away} />
        </div>
        {match.odds && (
          <div className="mt-3 grid grid-cols-3 gap-2">
            <OddChip label="1" value={match.odds.home} />
            {match.odds.draw != null ? <OddChip label="X" value={match.odds.draw} /> : <span />}
            <OddChip label="2" value={match.odds.away} />
          </div>
        )}
        {match.odds && (
          <p className="mt-2 text-center text-[11px] text-faint">{match.odds.source}</p>
        )}
      </Link>
    </article>
  );
}

function TeamLine({ side, className }: { side: Match["home"]; className?: string }) {
  return (
    <div className={cn("flex min-w-0 items-center gap-2", className)}>
      <TeamMark name={side.name} logo={side.logo} size={24} />
      <p className="min-w-0 flex-1 truncate text-[16px] font-semibold leading-none">{side.name}</p>
      {side.score != null && (
        <span className="shrink-0 text-[16px] font-semibold tabular-nums">{side.score}</span>
      )}
    </div>
  );
}

function TeamBlock({
  side,
  align,
  featured,
}: {
  side: Match["home"];
  align: "left" | "right";
  featured: boolean;
}) {
  return (
    <div
      className={cn(
        "flex min-w-0 items-center gap-2.5",
        align === "right" && "flex-row-reverse text-right",
      )}
    >
      <TeamMark name={side.name} logo={side.logo} size={featured ? 48 : 36} />
      <div className="min-w-0">
        <p className={cn("truncate font-semibold leading-tight", featured ? "text-[17px]" : "text-[15px]")}>
          {side.name}
        </p>
        <div className={cn("mt-1 flex items-center gap-2", align === "right" && "justify-end")}>
          {side.rank != null && <span className="text-[12px] tabular-nums text-faint">#{side.rank}</span>}
          <FormPills form={side.form} />
        </div>
      </div>
    </div>
  );
}

function Score({ match }: { match: Match }) {
  if (match.status === "pre") {
    return <div className="px-1 text-center text-[13px] font-semibold text-faint">vs</div>;
  }
  return (
    <div className="px-1 text-center text-[22px] font-bold tabular-nums">
      {match.home.score ?? "0"}
      <span className="mx-0.5 text-faint">–</span>
      {match.away.score ?? "0"}
    </div>
  );
}

function OddChip({ label, value }: { label: string; value: number }) {
  return (
    <span className="flex h-9 items-center justify-center rounded-[10px] bg-surface text-[13px] font-semibold tabular-nums">
      <span className="mr-1 font-medium text-faint">{label}</span>
      {value.toFixed(2)}
    </span>
  );
}
