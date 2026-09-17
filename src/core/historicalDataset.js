function number(value) {
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function teamName(value) {
  return value?.displayName ?? value?.name ?? value?.shortName ?? null;
}

export function resultToOutcome(homeGoals, awayGoals, selection = 'home') {
  const home = number(homeGoals);
  const away = number(awayGoals);
  if (home == null || away == null) return null;
  if (selection === 'home') return home > away ? 1 : 0;
  if (selection === 'draw') return home === away ? 1 : 0;
  if (selection === 'away') return home < away ? 1 : 0;
  throw new RangeError(`Unsupported selection: ${selection}`);
}

export function normalizeHistoricalEvent(event) {
  if (!event || typeof event !== 'object') return null;
  const competition = event.competitions?.[0];
  const competitors = competition?.competitors ?? [];
  const home = competitors.find(item => item.homeAway === 'home');
  const away = competitors.find(item => item.homeAway === 'away');
  const homeGoals = number(home?.score?.value ?? home?.score);
  const awayGoals = number(away?.score?.value ?? away?.score);
  const date = event.date ?? event.startDate ?? null;
  if (!event.id || !home || !away || !date || homeGoals == null || awayGoals == null) return null;
  return {
    id: String(event.id),
    date,
    homeTeamId: home.team?.id != null ? String(home.team.id) : null,
    awayTeamId: away.team?.id != null ? String(away.team.id) : null,
    homeTeam: teamName(home.team),
    awayTeam: teamName(away.team),
    homeGoals,
    awayGoals,
    totalGoals: homeGoals + awayGoals,
    result: homeGoals > awayGoals ? 'H' : homeGoals === awayGoals ? 'D' : 'A',
  };
}

export function normalizeHistoricalEvents(payload) {
  const events = Array.isArray(payload) ? payload : payload?.events ?? [];
  return events.map(normalizeHistoricalEvent).filter(Boolean).sort((a, b) => new Date(a.date) - new Date(b.date));
}

export function toBinaryPredictions(matches, probabilitySelector = row => row.probability) {
  return (matches ?? []).map(row => {
    const probability = number(probabilitySelector(row));
    const outcome = resultToOutcome(row.homeGoals, row.awayGoals, row.selection ?? 'home');
    return probability == null || outcome == null ? null : { date: row.date, probability, outcome, matchId: row.id, selection: row.selection ?? 'home' };
  }).filter(Boolean);
}
