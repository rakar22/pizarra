# Pizarra

Mesa de analista profesional de fútbol — no es un tipster.

En vivo: [pizarra.utilix.cloud](https://pizarra.utilix.cloud)

## Qué es

Pizarra cruza el modelo Poisson (y combos de resultado) con cuotas de mercado para señalar **valor**, no para vender picks. La interfaz es white / iOS: Agenda, Valor, Ligas, Scout y Cartera.

- **Agenda** — partidos ESPN + OpenLigaDB, filtros por liga y destacados
- **Valor** — edge vs mercado, Kelly fraccional
- **Scout** — preguntas al modelo Grok sobre cualquier partido, con fotos
- **Ligas** — clasificaciones y contexto
- **Cartera** — bankroll y apuntes de valor
- **Investigación** — 1X2, goles, BTTS, resultado/BTTS, córners, tarjetas, props de jugador (faltas, entradas, remates, a puerta)

## Cuotas

Bet365 **no tiene API pública**. Pizarra usa:

1. 1X2 y over/under 2.5 de [football-data.co.uk](https://www.football-data.co.uk) (`B365H/D/A`, `B365>2.5/<2.5`)
2. Opcional: [The Odds API](https://the-odds-api.com) con `THE_ODDS_API_KEY` (bookmaker `bet365`)
3. Resto de mercados: probabilidad justa del modelo + margen tipo casa ~4% — **nunca se fingen cuotas Bet365**

## Stack

TanStack Start, React 19, Tailwind v4, Nitro (`node-server` en Hostinger).

## Local

```bash
cp .env.example .env
# rellena XAI_API_KEY si quieres Scout
npm install
npm run dev
```

Apuesta con responsabilidad. 18+.
