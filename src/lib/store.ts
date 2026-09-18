import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { BuilderSelectionInput, ReliabilityProfile } from "./football/builder";
import type { Match, ValuePick } from "./football/types";

export type BetRecord = {
  id: string;
  matchId: string;
  label: string;
  market: string;
  odds: number;
  stake: number;
  createdAt: string;
  result: "pending" | "won" | "lost" | "void";
};

type WatchState = {
  ids: string[];
  toggle: (id: string) => void;
  has: (id: string) => boolean;
};

export const useWatchlist = create<WatchState>()(
  persist(
    (set, get) => ({
      ids: [],
      toggle: (id) =>
        set((s) => ({
          ids: s.ids.includes(id) ? s.ids.filter((x) => x !== id) : [...s.ids, id],
        })),
      has: (id) => get().ids.includes(id),
    }),
    { name: "pizarra-watch" },
  ),
);

type BankState = {
  bankroll: number;
  unit: number;
  bets: BetRecord[];
  setBankroll: (n: number) => void;
  setUnit: (n: number) => void;
  addBet: (b: Omit<BetRecord, "id" | "createdAt" | "result">) => void;
  settle: (id: string, result: BetRecord["result"]) => void;
};

export const useBankroll = create<BankState>()(
  persist(
    (set) => ({
      bankroll: 1000,
      unit: 10,
      bets: [],
      setBankroll: (n) => set({ bankroll: Math.max(0, n) }),
      setUnit: (n) => set({ unit: Math.max(1, n) }),
      addBet: (b) =>
        set((s) => ({
          bets: [
            {
              ...b,
              id: `${Date.now()}`,
              createdAt: new Date().toISOString(),
              result: "pending" as const,
            },
            ...s.bets,
          ].slice(0, 80),
        })),
      settle: (id, result) =>
        set((s) => {
          const bets = s.bets.map((b) => (b.id === id ? { ...b, result } : b));
          const bet = s.bets.find((b) => b.id === id);
          if (!bet || bet.result !== "pending") return { bets };
          let bankroll = s.bankroll;
          if (result === "won") bankroll += bet.stake * (bet.odds - 1);
          if (result === "lost") bankroll -= bet.stake;
          return { bets, bankroll };
        }),
    }),
    { name: "pizarra-bank" },
  ),
);

export function pickLabel(p: ValuePick) {
  return `${p.market} · ${p.label}`;
}

export type DraftBuilderLeg = {
  match: Match;
  selections: BuilderSelectionInput[];
};

type BuilderState = {
  legs: DraftBuilderLeg[];
  profile: ReliabilityProfile;
  couponOdds: string;
  setProfile: (profile: ReliabilityProfile) => void;
  setCouponOdds: (couponOdds: string) => void;
  upsertLeg: (match: Match, selections: BuilderSelectionInput[]) => void;
  setLegSelections: (matchId: string, selections: BuilderSelectionInput[]) => void;
  removeLeg: (matchId: string) => void;
  replaceLegs: (legs: DraftBuilderLeg[]) => void;
  clear: () => void;
};

export const useBuilderCoupon = create<BuilderState>()(
  persist(
    (set) => ({
      legs: [],
      profile: "equilibrado",
      couponOdds: "",
      setProfile: (profile) => set({ profile }),
      setCouponOdds: (couponOdds) => set({ couponOdds }),
      upsertLeg: (match, selections) =>
        set((s) => {
          const next = { match, selections };
          const idx = s.legs.findIndex((l) => l.match.id === match.id);
          if (idx < 0) return { legs: [...s.legs, next].slice(0, 12) };
          const legs = s.legs.slice();
          legs[idx] = next;
          return { legs };
        }),
      setLegSelections: (matchId, selections) =>
        set((s) => ({
          legs: s.legs.map((l) => (l.match.id === matchId ? { ...l, selections } : l)),
        })),
      removeLeg: (matchId) => set((s) => ({ legs: s.legs.filter((l) => l.match.id !== matchId) })),
      replaceLegs: (legs) => set({ legs: legs.slice(0, 12) }),
      clear: () => set({ legs: [], couponOdds: "" }),
    }),
    { name: "pizarra-builder" },
  ),
);
