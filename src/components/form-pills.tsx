import { cn } from "@/lib/utils";

export function FormPills({ form, className }: { form: string; className?: string }) {
  if (!form) return <span className="text-xs text-faint">—</span>;
  return (
    <span className={cn("inline-flex gap-0.5", className)} aria-label={`Forma ${form}`}>
      {form.split("").slice(0, 5).map((c, i) => (
        <span
          key={`${c}-${i}`}
          className={cn(
            "inline-flex size-5 items-center justify-center rounded-full text-[10px] font-bold",
            c === "W" && "bg-win/15 text-win",
            c === "D" && "bg-draw/15 text-draw",
            c === "L" && "bg-danger/15 text-danger",
            c !== "W" && c !== "D" && c !== "L" && "bg-elevated text-muted",
          )}
        >
          {c}
        </span>
      ))}
    </span>
  );
}
