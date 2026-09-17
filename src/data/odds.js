const DEFAULT_TIMEOUT_MS = 8000;

function asOdds(value) {
  const n = Number(value);
  return Number.isFinite(n) && n > 1 ? n : null;
}

export function normalizeOddsSelection(selection) {
  if (!selection || typeof selection !== 'object') return null;
  const key = String(selection.key ?? selection.name ?? selection.label ?? '').trim();
  const odds = asOdds(selection.odds ?? selection.price ?? selection.value);
  if (!key || odds == null) return null;
  return {
    key,
    name: String(selection.name ?? selection.label ?? key),
    odds,
  };
}

export function normalizeOddsMarket(market) {
  if (!market || typeof market !== 'object') return null;
  const rawSelections = Array.isArray(market.selections)
    ? market.selections
    : Object.entries(market).map(([key, odds]) => ({ key, odds }));
  const selections = rawSelections.map(normalizeOddsSelection).filter(Boolean);
  if (!selections.length) return null;
  return {
    key: String(market.key ?? market.name ?? 'unknown'),
    name: String(market.name ?? market.key ?? 'unknown'),
    selections,
  };
}

export function normalizeOddsResponse(payload) {
  const events = Array.isArray(payload) ? payload : payload?.events ?? payload?.matches ?? [];
  return events.map((event) => {
    const markets = Array.isArray(event?.markets)
      ? event.markets.map(normalizeOddsMarket).filter(Boolean)
      : [];
    return {
      eventId: String(event?.eventId ?? event?.id ?? ''),
      homeTeamId: event?.homeTeamId != null ? String(event.homeTeamId) : null,
      awayTeamId: event?.awayTeamId != null ? String(event.awayTeamId) : null,
      startTime: event?.startTime ?? event?.commenceTime ?? null,
      bookmaker: event?.bookmaker ?? event?.provider ?? 'unknown',
      markets,
    };
  }).filter(event => event.eventId);
}

export async function fetchOdds(url, { fetchImpl = fetch, timeoutMs = DEFAULT_TIMEOUT_MS, headers = {} } = {}) {
  if (!url) throw new Error('Odds provider URL is required');
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetchImpl(url, {
      headers: { Accept: 'application/json', ...headers },
      signal: controller.signal,
    });
    if (!response.ok) throw new Error(`Odds provider ${response.status}`);
    return response.json();
  } finally {
    clearTimeout(timer);
  }
}

export const ODDS_PROVIDER_STATUS = {
  configured: false,
  execution: 'disabled',
  note: 'Provider adapter ready; credentials must remain server-side.',
};
