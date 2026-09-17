type TextPart = { type: "text"; text: string };
type ImagePart = { type: "image_url"; image_url: { url: string; detail?: "low" | "high" } };
export type GrokPart = TextPart | ImagePart;

export type GrokMsg = {
  role: "system" | "user" | "assistant";
  content: string | GrokPart[];
};

export async function grokChat(opts: {
  messages: GrokMsg[];
  maxTokens?: number;
  temperature?: number;
}): Promise<{ ok: true; text: string } | { ok: false; error: string }> {
  const apiKey = process.env.XAI_API_KEY;
  if (!apiKey) return { ok: false, error: "El Scout no está disponible en este entorno." };

  const body = {
    model: "grok-4.5",
    temperature: opts.temperature ?? 0.4,
    max_tokens: opts.maxTokens ?? 800,
    messages: opts.messages,
  };

  try {
    const res = await fetch("https://api.x.ai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      return { ok: false, error: `Error del analista (${res.status})` };
    }
    const json = (await res.json()) as { choices?: { message?: { content?: string } }[] };
    const text = json.choices?.[0]?.message?.content ?? "";
    return { ok: true, text };
  } catch {
    return { ok: false, error: "No se pudo consultar al Scout." };
  }
}

export const SCOUT_SYSTEM = `Eres el Scout jefe de Pizarra, analista profesional de fútbol (scouting + mercados), no un tipster.
Español de España. Tono de vestuario/pizarra: preciso, seco, sin marketing.
Usas modelo Poisson (λ goles, 1X2, O/U 1.5/2.5/3.5, BTTS, resultado/BTTS, córners, tarjetas, ambos reciben tarjeta) y props de jugador (remates, remates a puerta, faltas recibidas, faltas concedidas, entradas).
Cuotas: Bet365 cuando vienen etiquetadas; si no, justa del modelo vs tipo casa (margen 4%). Nunca inventes una cuota Bet365.
Si hay fotos: lee alineaciones, pizarra táctica, heatmaps, stats o capturas de cuotas. Di qué ves y cómo cambia la lectura. Si la imagen no es de fútbol, dilo.
Si te piden un tip: mercado, cuota justa, edge vs implícita, tamaño 0,25–1 u, y cuándo PASAR.
Nunca prometas ganancias ni des consejo financiero. 18+ y juego responsable.
Responde breve, con viñetas cuando ayuden.`;
