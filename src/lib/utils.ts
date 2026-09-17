import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const TZ = "Europe/Madrid";

export function formatKickoff(iso: string) {
  const d = new Date(iso);
  return new Intl.DateTimeFormat("es-ES", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: TZ,
  }).format(d);
}

export function formatDayLabel(iso: string) {
  const d = new Date(iso);
  const now = new Date();
  const dayKey = (date: Date) =>
    new Intl.DateTimeFormat("en-CA", { timeZone: TZ, dateStyle: "short" }).format(date);
  if (dayKey(d) === dayKey(now)) return "Hoy";
  const tomorrow = new Date(now.getTime() + 86400000);
  if (dayKey(d) === dayKey(tomorrow)) return "Mañana";
  return new Intl.DateTimeFormat("es-ES", {
    weekday: "long",
    day: "numeric",
    month: "short",
    timeZone: TZ,
  }).format(d);
}

export function formatFullDate(iso: string) {
  return new Intl.DateTimeFormat("es-ES", {
    weekday: "long",
    day: "numeric",
    month: "long",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: TZ,
  }).format(new Date(iso));
}

export function pct(n: number, digits = 0) {
  return `${(n * 100).toFixed(digits)}%`;
}

export function oddsFmt(n: number) {
  return n.toFixed(2);
}
