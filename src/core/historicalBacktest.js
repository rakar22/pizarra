import { matchProbabilities } from './footballModel.js';
import { dixonColesMatchProbabilities } from './dixonColes.js';
import { brierScore, logLoss, calibrationBins } from './backtest.js';
import { calibrationError } from './calibration.js';

const MIN_MATCHES = 3;
const OUTCOMES = { home: 'H', draw: 'D', away: 'A' };

function statLine() {
  return { games: 0, goalsFor: 0, goalsAgainst: 0 };
}

function update(stats, teamId, goalsFor, goalsAgainst) {
  const current = stats.get(teamId) ?? statLine();
  current.games += 1;
  current.goalsFor += goalsFor;
  current.goalsAgainst += goalsAgainst;
  stats.set(teamId, current);
}

function lambda(home, away, leagueGoals = 2.55) {
  if (!home || !away || home.games < MIN_MATCHES || away.games < MIN_MATCHES) return null;
  const avg = Math.max(0.75, Number(leagueGoals) / 2);
  const ha = Math.max(0.25, (home.goalsFor / home.games) / avg);
  const ad = Math.max(0.25, (away.goalsAgainst / away.games) / avg);
  const aa = Math.max(0.25, (away.goalsFor / away.games) / avg);
  const hd = Math.max(0.25, (home.goalsAgainst / home.games) / avg);
  return {
    homeLambda: Math.min(4.5, Math.max(0.15, avg * 1.08 * ha * ad)),
    awayLambda: Math.min(4.5, Math.max(0.15, avg * 0.92 * aa * hd)),
  };
}

function rollingPredictions(matches, leagueGoals, probabilityBuilder) {
  const ordered = [...(matches ?? [])].sort((a, b) => new Date(a.date) - new Date(b.date));
  const stats = new Map();
  const predictions = [];
  for (const match of ordered) {
    const homeId = match.homeTeamId;
    const awayId = match.awayTeamId;
    if (!homeId || !awayId) continue;
    const expected = lambda(stats.get(homeId), stats.get(awayId), leagueGoals);
    if (expected) {
      predictions.push({
        matchId: match.id,
        date: match.date,
        homeTeamId: homeId,
        awayTeamId: awayId,
        probabilities: probabilityBuilder(expected),
        expectedGoals: expected,
        outcome: match.result,
        usedMatches: Math.min(stats.get(homeId).games, stats.get(awayId).games),
      });
    }
    update(stats, homeId, match.homeGoals, match.awayGoals);
    update(stats, awayId, match.awayGoals, match.homeGoals);
  }
  return predictions;
}

export function rollingMatchPredictions(matches, leagueGoals = 2.55) {
  return rollingPredictions(matches, leagueGoals, ({ homeLambda, awayLambda }) =>
    matchProbabilities(homeLambda, awayLambda));
}

export function rollingDixonColesPredictions(matches, leagueGoals = 2.55, rho = -0.13) {
  return rollingPredictions(matches, leagueGoals, ({ homeLambda, awayLambda }) =>
    dixonColesMatchProbabilities(homeLambda, awayLambda, rho));
}

function toBinaryRows(predictions) {
  return predictions.flatMap((prediction) => Object.entries(OUTCOMES).map(([selection, outcomeCode]) => ({
    date: prediction.date,
    matchId: prediction.matchId,
    selection,
    probability: prediction.probabilities[selection],
    outcome: prediction.outcome === outcomeCode ? 1 : 0,
  })));
}

function evaluatePredictions(predictions, minCalibrationSamples = 100) {
  const rows = toBinaryRows(predictions);
  const calibration = calibrationError(rows, { minSamples: minCalibrationSamples });
  return {
    matchesEvaluated: predictions.length,
    predictions: rows,
    brierScore: brierScore(rows),
    logLoss: logLoss(rows),
    calibration: calibration.bins,
    ece: calibration.ece,
    mce: calibration.mce,
    calibrationStatus: calibration.status,
    minCalibrationSamples,
    status: rows.length ? 'descriptive' : 'pending',
  };
}

export function evaluateRollingBacktest(matches, leagueGoals = 2.55, options = {}) {
  return evaluatePredictions(rollingMatchPredictions(matches, leagueGoals), options.minCalibrationSamples ?? 100);
}

export function evaluateRollingDixonColesBacktest(matches, leagueGoals = 2.55, options = {}) {
  const rho = options.rho ?? -0.13;
  return evaluatePredictions(
    rollingDixonColesPredictions(matches, leagueGoals, rho),
    options.minCalibrationSamples ?? 100,
  );
}

export function compareRollingModels(matches, leagueGoals = 2.55, options = {}) {
  return {
    poisson: evaluateRollingBacktest(matches, leagueGoals, options),
    dixonColes: evaluateRollingDixonColesBacktest(matches, leagueGoals, options),
    comparison: 'descriptive',
  };
}
