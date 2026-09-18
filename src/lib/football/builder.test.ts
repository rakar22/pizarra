import test from "node:test";
import assert from "node:assert/strict";
import { buildModel } from "./model.ts";
import {
  BUILDER_PROFILES,
  buildBuilderCatalog,
  rawSelectionProb,
  scoreBuilderCoupon,
  scoreBuilderLeg,
  selectionFromResearchLine,
  selectionKey,
  softenSelection,
  suggestReliableSelections,
  totalsJoint,
} from "./builder.ts";
import { parseCouponText } from "./builder-parse.ts";
import { buildMatchResearch } from "./research.ts";
import type { Match, Side } from "./types.ts";

function side(name: string, short: string, extra?: Partial<Side>): Side {
  return {
    id: short,
    name,
    short,
    logo: "",
    form: "WWDLW",
    color: "#111",
    played: 10,
    points: 18,
    gf: 18,
    ga: 9,
    ...extra,
  };
}

function fakeMatch(over?: Partial<Match>): Match {
  const home = over?.home ?? side("Chelsea", "CHE", { gf: 22, ga: 8 });
  const away = over?.away ?? side("Arsenal", "ARS", { gf: 20, ga: 10, form: "WDWWL" });
  const model = over?.model ?? buildModel(home, away, 1.35);
  return {
    id: over?.id ?? "1",
    league: over?.league ?? "Premier League",
    leagueSlug: over?.leagueSlug ?? "eng.1",
    country: over?.country ?? "Inglaterra",
    kickoff: over?.kickoff ?? "2026-09-20T15:00:00.000Z",
    status: "pre",
    statusDetail: "",
    home,
    away,
    model,
    values: [],
  };
}

test("O1.5 is preferred over O2.5 unless the model is strongly behind O2.5", () => {
  const quietHome = side("Burnley", "BUR", { gf: 9, ga: 12, form: "DLDWL" });
  const quietAway = side("Wolves", "WOL", { gf: 8, ga: 14, form: "LDLLW" });
  const match = fakeMatch({
    home: quietHome,
    away: quietAway,
    model: buildModel(quietHome, quietAway, 1.35),
  });
  assert.ok(match.model.over15 > match.model.over25);
  assert.ok(match.model.over25 < BUILDER_PROFILES.equilibrado.over25Strong);
  const suggested = suggestReliableSelections(match);
  assert.equal(suggested[0]?.kind, "goals_over");
  assert.equal(suggested[0]?.line, 1.5);
});

test("nested over 1.5 + over 2.5 joint equals over 2.5", () => {
  const match = fakeMatch();
  const joint = totalsJoint([1.5, 2.5], [], (line) => rawSelectionProb(match, { kind: "goals_over", line }));
  assert.ok(Math.abs(joint - match.model.over25) < 1e-9);
});

test("over 1.5 and under 3.5 is P(2 or 3 goals)", () => {
  const match = fakeMatch();
  const p = totalsJoint([1.5], [3.5], (line) => rawSelectionProb(match, { kind: "goals_over", line }));
  const expected = match.model.over15 - match.model.over35;
  assert.ok(Math.abs(p - expected) < 1e-9);
});

test("contradictory over/under on the same line zeros the family", () => {
  const match = fakeMatch();
  const p = totalsJoint([2.5], [2.5], (line) => rawSelectionProb(match, { kind: "goals_over", line }));
  assert.equal(p, 0);
  const leg = scoreBuilderLeg(match, [
    { kind: "goals_over", line: 2.5 },
    { kind: "goals_under", line: 2.5 },
  ]);
  assert.equal(leg.verdict, "fail");
  assert.equal(leg.independenceJoint, 0);
});

test("a single-match soft stack scores joint at or below the weakest selection", () => {
  const match = fakeMatch();
  const sels = suggestReliableSelections(match);
  const leg = scoreBuilderLeg(match, sels);
  assert.ok(sels.length >= 2);
  const minSel = Math.min(...leg.selections.map((s) => s.modelProb));
  assert.ok(leg.independenceJoint <= minSel + 1e-9);
  assert.ok(leg.conservativeJoint <= leg.independenceJoint + 1e-9);
  assert.ok(leg.bottleneck);
});

test("player props get a variance haircut versus the raw model probability", () => {
  const match = fakeMatch();
  const research = buildMatchResearch(match);
  research.lines.push({
    id: "jugador:test",
    group: "jugador",
    label: "Palmer · más de 1.5 remates",
    modelProb: 0.72,
    fairOdds: 1.39,
    houseOdds: 1.33,
    player: "Palmer",
    team: "Chelsea",
    line: 1.5,
  });
  const leg = scoreBuilderLeg(match, [
    {
      kind: "player",
      player: "Palmer",
      label: "Palmer · más de 1.5 remates",
      modelProb: 0.72,
      researchLineId: "jugador:test",
    },
  ], research);
  assert.ok(leg.selections[0].conservativeProb < 0.72 * 0.9);
  assert.equal(leg.verdict, "warn");
  assert.ok(leg.selections[0].flags.some((f) => /jugador/i.test(f)));
});

test("obscure leagues are flagged as low coverage", () => {
  const match = fakeMatch({ league: "Other", leagueSlug: "fin.2", country: "" });
  const leg = scoreBuilderLeg(match, [{ kind: "goals_over", line: 1.5 }]);
  assert.equal(leg.coverage, "baja");
  assert.ok(leg.issues.some((i) => /liga secundaria/i.test(i)));
});

test("nine soft legs fail the hard cap and get a correlation haircut", () => {
  const legs = Array.from({ length: 9 }, (_, i) => {
    const home = side(`Home ${i}`, `H${i}`);
    const away = side(`Away ${i}`, `A${i}`);
    return {
      match: fakeMatch({ id: String(i), home, away, model: buildModel(home, away, 1.35) }),
      selections: suggestReliableSelections(fakeMatch()),
    };
  });
  const coupon = scoreBuilderCoupon(legs, { profile: "equilibrado", bankroll: 1000, unit: 10 });
  assert.equal(coupon.verdict, "fail");
  assert.ok(coupon.legs.length === 9);
  assert.ok(coupon.conservativeSurvival < coupon.independenceSurvival);
  assert.ok(coupon.stake.amount === 0);
  assert.ok(coupon.issues.some((i) => /demasiadas piernas/i.test(i)));
  assert.ok(coupon.alternatives.some((a) => a.id === "drop-weakest"));
  assert.ok(coupon.alternatives.some((a) => a.id === "split-a"));
});

test("dropping the weakest leg raises conservative survival", () => {
  const strong = fakeMatch({ id: "s" });
  const weakHome = side("Weak FC", "WEA", { gf: 6, ga: 18, form: "LLLLD", played: 4 });
  const weakAway = side("Also Weak", "AWK", { gf: 5, ga: 16, form: "LLDLL", played: 4 });
  const weak = fakeMatch({
    id: "w",
    home: weakHome,
    away: weakAway,
    model: buildModel(weakHome, weakAway, 1.35),
    leagueSlug: "fin.2",
    league: "Ykkönen",
  });
  const coupon = scoreBuilderCoupon(
    [
      { match: strong, selections: suggestReliableSelections(strong) },
      { match: weak, selections: [{ kind: "goals_over", line: 2.5 }, { kind: "player", modelProb: 0.4, player: "X" }] },
    ],
    { profile: "equilibrado" },
  );
  const dropped = coupon.alternatives.find((a) => a.id === "drop-weakest");
  assert.ok(dropped);
  assert.ok(dropped!.conservativeSurvival > coupon.conservativeSurvival);
});

test("soften O2.5 to O1.5 increases the bottleneck probability", () => {
  const match = fakeMatch();
  const before = scoreBuilderLeg(match, [{ kind: "goals_over", line: 2.5 }]);
  const soft = softenSelection({ kind: "goals_over", line: 2.5, label: "Más de 2.5 goles" });
  assert.equal(soft?.line, 1.5);
  const after = scoreBuilderLeg(match, [soft!]);
  assert.ok(after.conservativeJoint > before.conservativeJoint);
});

test("catalog marks O2.5 as a hard line and never auto-suggests player props", () => {
  const match = fakeMatch();
  const research = buildMatchResearch(match);
  research.lines.push({
    id: "jugador:x",
    group: "jugador",
    label: "Saka · más de 0.5 remates a puerta",
    modelProb: 0.66,
    fairOdds: 1.52,
    houseOdds: 1.46,
    player: "Saka",
    team: "Arsenal",
  });
  const catalog = buildBuilderCatalog(match, research);
  const o25 = catalog.find((c) => c.kind === "goals_over" && c.line === 2.5);
  assert.equal(o25?.flag, "linea-dura");
  assert.equal(catalog.some((c) => c.kind === "player" && c.suggested), false);
  assert.ok(catalog.some((c) => c.kind === "player"));
});

test("model-fair coupon price is labelled separately from any book price", () => {
  const match = fakeMatch();
  const coupon = scoreBuilderCoupon([{ match, selections: [{ kind: "goals_over", line: 1.5 }] }], {
    couponOdds: 24.3,
    bankroll: 1000,
    unit: 10,
  });
  assert.ok(coupon.fairOdds > 1);
  assert.notEqual(coupon.verdict, "fail");
  assert.ok(coupon.stake.impliedFromBook);
  assert.ok(Math.abs(coupon.stake.impliedFromBook! - 1 / 24.3) < 1e-9);
  assert.equal(coupon.houseStyleOdds > 1, true);
});

test("research lines map into builder selections", () => {
  const match = fakeMatch();
  const research = buildMatchResearch(match);
  const o15 = research.lines.find((l) => l.label === "Más de 1.5");
  assert.ok(o15);
  const mapped = selectionFromResearchLine(o15!);
  assert.equal(mapped?.kind, "goals_over");
  assert.equal(mapped?.line, 1.5);
  assert.equal(selectionKey(mapped!), "goals_over:1.5::" + o15!.id);
});

test("parse Spanish Bet365-style paste into legs and markets", () => {
  const che = fakeMatch();
  const livHome = side("Liverpool", "LIV");
  const livAway = side("Everton", "EVE");
  const liv = fakeMatch({
    id: "2",
    home: livHome,
    away: livAway,
    model: buildModel(livHome, livAway, 1.35),
  });
  const text = `
Crear Apuesta
Chelsea vs Arsenal
Más de 1,5 goles
Más de 8,5 córners
Ambos equipos reciben tarjeta

Liverpool v Everton
Over 1.5 goals
Corners - Más de 9.5
Tarjetas del partido - Más de 3.5
`;
  const parsed = parseCouponText(text, [che, liv]);
  assert.equal(parsed.legs.length, 2);
  assert.equal(parsed.legs[0].match?.id, "1");
  assert.deepEqual(
    parsed.legs[0].selections.map((s) => s.kind),
    ["goals_over", "corners_over", "both_teams_carded"],
  );
  assert.equal(parsed.legs[0].selections[0].line, 1.5);
  assert.equal(parsed.legs[1].match?.id, "2");
  assert.equal(parsed.legs[1].selections[1].kind, "corners_over");
  assert.equal(parsed.legs[1].selections[2].kind, "cards_over");
});

test("estricto profile fails more legs than equilibrado on the same stack", () => {
  const match = fakeMatch();
  const sels = [
    { kind: "goals_over" as const, line: 2.5 },
    { kind: "corners_over" as const, line: 11.5 },
    { kind: "cards_over" as const, line: 5.5 },
  ];
  const eq = scoreBuilderCoupon([{ match, selections: sels }], { profile: "equilibrado" });
  const st = scoreBuilderCoupon([{ match, selections: sels }], { profile: "estricto" });
  assert.ok(BUILDER_PROFILES.estricto.minSelectionProb > BUILDER_PROFILES.equilibrado.minSelectionProb);
  assert.ok(st.verdict === "fail" || eq.verdict === "fail" || st.issues.length >= eq.issues.length);
  assert.equal(st.verdict === "fail", true);
});
