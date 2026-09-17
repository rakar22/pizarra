import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { ValuePick } from "./football/types";

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
