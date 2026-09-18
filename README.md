# Pizarra

Mesa de analista profesional de fútbol — no es un tipster.

En vivo: [pizarra.utilix.cloud](https://pizarra.utilix.cloud)

## Qué es

Pizarra cruza el modelo Poisson (y combos de resultado) con cuotas de mercado para señalar **valor**, no para vender picks. La interfaz es white / iOS: Agenda, Valor, Ligas, Apuesta, Scout y Cartera.

- **Agenda** — partidos ESPN + OpenLigaDB, filtros por liga y destacados
- **Valor** — edge vs mercado, Kelly fraccional
- **Scout** — preguntas al modelo Grok sobre cualquier partido, con fotos
- **Ligas** — clasificaciones y contexto
- **Cartera** — bankroll y apuntes de valor
- **Apuesta** — fiabilidad de Crear Apuesta / Bet Builder: pega o arma un cupón, el modelo puntúa cada pierna (goles, córners, tarjetas, props), avisa correlaciones y recorta el stake
- **Investigación** — 1X2, goles, BTTS, resultado/BTTS, córners, tarjetas, props de jugador (faltas, entradas, remates, a puerta)

## Cuotas

Bet365 **no tiene API pública**. Pizarra usa:

1. 1X2 y over/under 2.5 de [football-data.co.uk](https://www.football-data.co.uk) (`B365H/D/A`, `B365>2.5/<2.5`)
2. Opcional: [The Odds API](https://the-odds-api.com) con `THE_ODDS_API_KEY` (bookmaker `bet365`)
3. Resto de mercados: probabilidad justa del modelo + margen tipo casa ~4% — **nunca se fingen cuotas Bet365**

## Crear Apuesta

Ruta `/apuesta`. Pensada para cupones tipo Bet365 (varias piernas de Over 1.5 + córner blando + tarjetas), no para cazar cuotas.

- Probabilidad conjunta = producto de familias Poisson (independencia), con haircut de cobertura, props de jugador y un 3% por pierna extra.
- Por defecto prefiere Más de 1.5 a Más de 2.5 salvo que el modelo sostenga O2.5. Props y ligas oscuras salen como más ruidosos.
- Si pegas la cuota real del boleto se compara con la justa del modelo; si no, se etiqueta como justa/tipo casa.
- Tope blando 5 piernas, duro 6 (perfil Equilibrado). Un 9-fold blando casi siempre **no pasa**.

Apuesta con responsabilidad. 18+.

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
