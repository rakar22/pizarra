import { cn } from "@/lib/utils";

function usableLogo(url?: string) {
  if (!url) return undefined;
  if (/espncdn\.com|espn\.com|wikimedia\.org/i.test(url)) return undefined;
  return url;
}

export function TeamMark({
  name,
  logo,
  size = 36,
  className,
}: {
  name: string;
  logo?: string;
  size?: number;
  className?: string;
}) {
  const initials = name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase();
  const src = usableLogo(logo);
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-surface text-[10px] font-semibold text-muted shadow-[0_0_0_0.5px_rgba(0,0,0,0.1)]",
        className,
      )}
      style={{ width: size, height: size }}
    >
      {src ? (
        <img src={src} alt="" referrerPolicy="no-referrer" className="size-full object-contain p-0.5" />
      ) : (
        <span>{initials}</span>
      )}
    </span>
  );
}
