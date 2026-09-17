import { useRef, useState } from "react";
import { Link } from "@tanstack/react-router";
import { useMutation } from "@tanstack/react-query";
import { ImagePlus, Send, X } from "lucide-react";
import { askScout } from "@/lib/football/server";
import { compressImage } from "@/lib/compress-image";
import type { ChatMessage, Match } from "@/lib/football/types";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/page-header";
import { Textarea } from "@/components/ui/textarea";
import { cn, formatKickoff } from "@/lib/utils";

type Packed = { mime: "image/jpeg"; data: string; preview: string };

const GENERAL_STARTERS = [
  "¿Qué mercados suelen tener más valor a inicios de temporada?",
  "Explícame cómo lees un Over 2.5 con λ 1.6–1.1",
  "Criterio para pasar un partido aunque el modelo marque valor",
];

function matchStarters(match: Match) {
  return [
    `¿Hay valor real en ${match.home.short}–${match.away.short} o es mejor pasar?`,
    `Lee el Over 2.5 con λ ${match.model.lambdaHome.toFixed(2)}–${match.model.lambdaAway.toFixed(2)}`,
    "Si te paso la alineación en foto, ¿cómo cambia tu lectura?",
  ];
}

export function ScoutDesk({
  matches = [],
  lockedMatch,
  compact,
}: {
  matches?: Match[];
  lockedMatch?: Match;
  compact?: boolean;
}) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [draft, setDraft] = useState("");
  const [matchId, setMatchId] = useState(lockedMatch?.id ?? "");
  const [photos, setPhotos] = useState<Packed[]>([]);
  const [photoError, setPhotoError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const selected = lockedMatch ?? matches.find((m) => m.id === matchId);

  const ask = useMutation({
    mutationFn: (payload: { next: ChatMessage[]; images?: Packed[] }) =>
      askScout({
        data: {
          messages: payload.next,
          matchId: selected?.id,
          images: payload.images?.map((p) => ({ mime: p.mime, data: p.data })),
        },
      }),
    onSuccess: (res, payload) => {
      if (res.ok) {
        setMessages([...payload.next, { role: "assistant", content: res.text }]);
      }
    },
  });

  function send(text: string) {
    const t = text.trim();
    if ((!t && photos.length === 0) || ask.isPending) return;
    const content = t || "Analiza las fotos del partido.";
    const next = [...messages, { role: "user" as const, content }].slice(-8);
    setMessages(next);
    setDraft("");
    const attached = photos;
    setPhotos([]);
    setPhotoError(null);
    ask.mutate({ next, images: attached });
  }

  async function onFiles(list: FileList | null) {
    if (!list?.length) return;
    setPhotoError(null);
    const room = 2 - photos.length;
    const files = Array.from(list).slice(0, room);
    try {
      const packed = await Promise.all(files.map(compressImage));
      setPhotos((prev) => [...prev, ...packed].slice(0, 2));
    } catch (err) {
      setPhotoError(err instanceof Error ? err.message : "No se pudo leer la foto.");
    }
    if (fileRef.current) fileRef.current.value = "";
  }

  const starters = selected ? matchStarters(selected) : GENERAL_STARTERS;

  return (
    <section>
      {!compact && (
        <PageHeader title="Scout">
          Cualquier partido, con fotos. El Scout solo habla cuando se lo pides.
        </PageHeader>
      )}

      {!lockedMatch && matches.length > 0 && (
        <label className="mt-1 block">
          <span className="mb-1.5 block text-[13px] font-medium text-muted">Partido</span>
          <select
            value={matchId}
            onChange={(e) => setMatchId(e.target.value)}
            className="h-11 w-full appearance-none rounded-[12px] bg-elevated px-3.5 text-[17px] text-fg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40"
          >
            <option value="">Agenda general (sin partido)</option>
            {matches.slice(0, 80).map((m) => (
              <option key={m.id} value={m.id}>
                {m.home.short} – {m.away.short} · {m.league} · {formatKickoff(m.kickoff)}
              </option>
            ))}
          </select>
        </label>
      )}

      {selected && !compact && (
        <p className="mt-3 text-[15px] text-muted">
          Contexto:{" "}
          <Link
            to="/partido/$id"
            params={{ id: selected.id }}
            className="font-semibold text-accent"
          >
            {selected.home.name} – {selected.away.name}
          </Link>
        </p>
      )}

      {messages.length === 0 && (
        <div className={cn(compact ? "space-y-1" : "ios-group mt-5")}>
          {starters.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => send(s)}
              className={cn(
                "block w-full text-left text-[15px] text-accent",
                compact ? "min-h-11 py-2" : "px-4 py-3.5 active:bg-black/[0.04]",
              )}
            >
              {s}
            </button>
          ))}
        </div>
      )}

      <ol className="mt-5 space-y-2.5">
        {messages.map((m, i) => (
          <li
            key={i}
            className={cn(
              "max-w-[85%] whitespace-pre-wrap px-3.5 py-2.5 text-[15px] leading-relaxed",
              m.role === "user"
                ? "ml-auto rounded-[18px] rounded-br-md bg-accent text-accent-fg"
                : "mr-auto rounded-[18px] rounded-bl-md bg-elevated text-fg",
            )}
          >
            {m.content}
          </li>
        ))}
        {ask.isPending && <li className="text-[15px] text-muted">El Scout está leyendo…</li>}
        {ask.data && !ask.data.ok && (
          <li className="text-[15px] text-danger">{ask.data.error}</li>
        )}
      </ol>

      <form
        className={compact ? "mt-4 space-y-3" : "sticky bottom-20 mt-6 space-y-3 md:bottom-4"}
        onSubmit={(e) => {
          e.preventDefault();
          send(draft);
        }}
      >
        {photos.length > 0 && (
          <ul className="flex flex-wrap gap-2">
            {photos.map((p, i) => (
              <li key={p.preview.slice(-12) + i} className="relative">
                <img
                  src={p.preview}
                  alt={`Adjunto ${i + 1}`}
                  className="h-16 w-16 rounded-[12px] object-cover"
                />
                <button
                  type="button"
                  aria-label="Quitar foto"
                  className="absolute -right-1.5 -top-1.5 inline-flex size-6 items-center justify-center rounded-full bg-fg text-bg"
                  onClick={() => setPhotos((prev) => prev.filter((_, j) => j !== i))}
                >
                  <X className="size-3" />
                </button>
              </li>
            ))}
          </ul>
        )}
        {photoError && <p className="text-[12px] text-danger">{photoError}</p>}
        <div className="flex items-end gap-2">
          <input
            ref={fileRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            multiple
            className="hidden"
            onChange={(e) => void onFiles(e.target.files)}
          />
          <Button
            type="button"
            variant="secondary"
            size="icon"
            className="shrink-0 rounded-full bg-elevated"
            aria-label="Adjuntar foto del partido"
            disabled={photos.length >= 2 || ask.isPending}
            onClick={() => fileRef.current?.click()}
          >
            <ImagePlus />
          </Button>
          <Textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder={
              selected ? `Pregunta sobre ${selected.home.short}–${selected.away.short}` : "Mensaje"
            }
            maxLength={2000}
            rows={1}
            className="min-h-11 resize-none rounded-full bg-elevated py-2.5"
            aria-label="Pregunta al Scout"
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                send(draft);
              }
            }}
          />
          <Button
            type="submit"
            size="icon"
            className="shrink-0 rounded-full"
            disabled={ask.isPending || (!draft.trim() && photos.length === 0)}
            aria-label="Enviar"
          >
            <Send />
          </Button>
        </div>
        <p className="px-1 text-[12px] text-faint">Hasta 2 fotos. 18+ juego responsable.</p>
      </form>
    </section>
  );
}
