# Pizarra analytical core

The core is intentionally deterministic and testable.

## Model

`footballModel.js` provides Poisson probabilities, 1X2 normalization, Over/Under 2.5, implied probability, edge and quarter Kelly.

`matchModel.js` converts normalized standings GF/GA into expected goals and a transparent baseline match analysis. This is a baseline, not a calibrated production forecast.

## Value

`valueEngine.js` normalizes odds, removes bookmaker overround when a full market is available, calculates edge/EV/Kelly and applies a data-quality gate. A value signal is an analytical output for review, not an automatic bet instruction.

## Odds

`../data/odds.js` defines a provider-agnostic normalization contract. Authenticated provider credentials must stay server-side; the frontend must never receive secret API keys.

## Backtesting

`backtest.js` provides Brier score, log loss, calibration bins and chronological train/test splitting. Metrics are descriptive until enough historical, point-in-time data is collected. Never evaluate a model on future information that was unavailable at prediction time.
