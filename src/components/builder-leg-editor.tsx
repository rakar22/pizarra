import { useMemo, useState } from "react";
import type { Match, MatchResearch } from "@/lib/football/types";
import {
  buildBuilderCatalog,
  selectionKey,
  suggestReliableSelections,
  type BuilderSelectionInput,
  type CatalogItem,
} from "@/lib/football/builder";
import { cn, pct } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

const GROUPS: { id: CatalogItem["group"]; label: string }[] = [
  { id: "goles", label: "Goles" },
  { id: "corners", label: "Córners" },
  { id: "tarjetas", label: "Tarjetas" },
  { id: "btts", label: "BTTS" },
  { id: "jugador", label: "Jugador" },
];

export function BuilderLegEditor({
  match,
  research,
  selected,
  onChange,
  compact = false,
}: {
  match: Match;
  research?: MatchResearch | null;
  selected: BuilderSelectionInput[];
  onChange: (next: BuilderSelectionInput[]) => void;
  compact?: boolean;
}) {
  const [group, setGroup] = useState<CatalogItem["group"]>("goles");
  const catalog = useMemo(() => buildBuilderCatalog(match, research ?? undefined), [match, research]);
  const rows = catalog.filter((c) => c.group === group);
  const selectedKeys = new Set(selected.map(selectionKey));

  const toggle = (item: CatalogItem) => {
    const key = item.key;
    if (selectedKeys.has(key)) {
      onChange(selected.filter((s) => selectionKey(s) !== key));
      return;
    }
    onChange([
      ...selected,
      {
        kind: item.kind,
        line: item.line,
        player: item.player,
        team: item.team,
        label: item.label,
        modelProb: item.modelProb,
        researchLineId: item.researchLineId,
      },
    ]);
  };

  return (
    <div>
      {!compact && (
        <div className="mb-2 flex flex-wrap gap-2">
          <Button
            type="button"
            size="sm"
            variant="secondary"
            onClick={() => onChange(suggestReliableSelections(match, research ?? undefined))}
          >
            Stack más fiable
          </Button>
          <Button type="button" size="sm" variant="ghost" onClick={() => onChange([])}>
            Vaciar pierna
          </Button>
        </div>
      )}

      <div className="ios-hide-scroll -mx-1 overflow-x-auto px-1">
        <div className="flex w-max flex-nowrap rounded-[9px] bg-elevated p-[2px]">
          {GROUPS.filter((g) => catalog.some((c) => c.group === g.id)).map((g) => (
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

      <ul className="ios-group mt-3">
        {rows.map((item) => {
          const on = selectedKeys.has(item.key);
          return (
            <li key={item.key}>
              <button
                type="button"
                onClick={() => toggle(item)}
                className="flex w-full min-h-[52px] items-center gap-3 px-4 py-2.5 text-left active:bg-black/[0.04]"
              >
                <span
                  className={cn(
                    "inline-flex size-[22px] shrink-0 items-center justify-center rounded-[6px] border text-[13px] font-bold",
                    on ? "border-accent bg-accent text-accent-fg" : "border-black/15 bg-surface text-transparent",
                  )}
                  aria-hidden
                >
                  ✓
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-[15px] font-medium leading-snug">{item.label}</span>
                  <span className="mt-0.5 flex flex-wrap items-center gap-x-2 text-[12px] tabular-nums text-muted">
                    <span>modelo {pct(item.modelProb)}</span>
                    <span>cons. {pct(item.conservativeProb)}</span>
                    {item.suggested && <Badge variant="value">fiable</Badge>}
                    {item.flag === "linea-dura" && <Badge variant="outline">línea dura</Badge>}
                    {item.flag === "jugador" && <Badge variant="outline">varianza</Badge>}
                  </span>
                </span>
              </button>
            </li>
          );
        })}
      </ul>
      {rows.length === 0 && (
        <p className="mt-3 px-1 text-[15px] text-muted">
          {group === "jugador" ? "Sin per90 de Fotmob para este partido." : "Sin líneas."}
        </p>
      )}
    </div>
  );
}
