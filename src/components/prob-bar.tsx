import { cn, pct } from "@/lib/utils";

export function ProbBar({
  home,
  draw,
  away,
  className,
}: {
  home: number;
  draw: number;
  away: number;
  className?: string;
}) {
  return (
    <div className={cn("space-y-1.5", className)}>
      <div className="flex h-1 overflow-hidden rounded-full bg-black/10">
        <div className="bg-fg" style={{ width: pct(home, 2) }} />
        <div className="bg-faint" style={{ width: pct(draw, 2) }} />
        <div className="bg-accent" style={{ width: pct(away, 2) }} />
      </div>
      <div className="flex justify-between text-[12px] font-medium tabular-nums text-muted">
        <span>1 {pct(home)}</span>
        <span>X {pct(draw)}</span>
        <span>2 {pct(away)}</span>
      </div>
    </div>
  );
}
