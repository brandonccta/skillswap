import { create } from 'zustand';
import { Trade } from '../types';

interface TradeState {
  trades: Trade[];
  setTrades: (trades: Trade[]) => void;
  updateTrade: (tradeId: string, updates: Partial<Trade>) => void;
}

export const useTradeStore = create<TradeState>((set) => ({
  trades: [],
  setTrades: (trades) => set({ trades }),
  updateTrade: (tradeId, updates) =>
    set((state) => ({
      trades: state.trades.map((t) =>
        t.trade_id === tradeId ? { ...t, ...updates } : t
      ),
    })),
}));
