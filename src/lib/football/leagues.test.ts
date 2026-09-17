import test from "node:test";
import assert from "node:assert/strict";
import { LEAGUES, LEAGUE_BY_SLUG, resolveLeague } from "./leagues";

test("league registry has unique slugs and every listed league resolves", () => {
  const slugs = LEAGUES.map((league) => league.slug);
  assert.equal(new Set(slugs).size, slugs.length);

  for (const league of LEAGUES) {
    assert.equal(LEAGUE_BY_SLUG[league.slug]?.slug, league.slug);
    assert.equal(resolveLeague(league.name, league.slug).slug, league.slug);
  }
});

test("navigation leagues have valid ESPN identifiers", () => {
  for (const league of LEAGUES.filter((item) => item.tier <= 2)) {
    assert.match(league.espn, /^[a-z0-9_.-]+$/);
  }
});
