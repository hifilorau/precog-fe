'use client';

import { PriceHistoryResponse } from '@/lib/types/markets';
import PriceHistoryChart from './PriceHistoryChart';

interface PriceHistoryCardProps {
  priceHistory: PriceHistoryResponse | null;
  priceHistoryLoading: boolean;
  handleIntervalChange: (interval: 'raw' | 'hour' | 'day' | 'week') => void;
}

import { Market } from '@/lib/types/markets';

interface PriceHistoryCardProps {
  priceHistory: PriceHistoryResponse | null;
  priceHistoryLoading: boolean;
  handleIntervalChange: (interval: 'raw' | 'hour' | 'day' | 'week') => void;
  market?: Market | null;
}

export default function PriceHistoryCard({
  priceHistory,
  priceHistoryLoading,
  handleIntervalChange,
  market,
}: PriceHistoryCardProps) {
  // Patch the price history with the freshest outcome price if needed
  let patchedPriceHistory = priceHistory;
  if (priceHistory && market && market.outcomes && priceHistory.outcomes) {
    // For each outcome, check if the latest outcome price is newer than the last price history point
    const patchedOutcomes: typeof priceHistory.outcomes = {};
    Object.values(priceHistory.outcomes).forEach((outcomeHistory) => {
      const outcome = market.outcomes?.find(o => o.name === outcomeHistory.name);
      if (outcome && outcome.current_price != null) {
        const lastPoint = outcomeHistory.prices[outcomeHistory.prices.length - 1];
        // Use the market.updated_at as the timestamp for the synthetic point
        const updatedAt = market.updated_at;
        if (updatedAt && (!lastPoint || new Date(updatedAt) > new Date(lastPoint.timestamp))) {
          // Patch with a synthetic point
          patchedOutcomes[outcomeHistory.name] = {
            ...outcomeHistory,
            prices: [
              ...outcomeHistory.prices,
              {
                timestamp: updatedAt,
                price: outcome.current_price,
                volume: outcome.volume ?? null,
              },
            ],
          };
        } else {
          patchedOutcomes[outcomeHistory.name] = outcomeHistory;
        }
      } else {
        patchedOutcomes[outcomeHistory.name] = outcomeHistory;
      }
    });
    patchedPriceHistory = { ...priceHistory, outcomes: patchedOutcomes };
  }

  return (
    <div className="card p-6">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-semibold">Price History</h2>
        <div className="flex items-center">
          <button onClick={() => handleIntervalChange('raw')} className="px-3 py-1 text-xs rounded-md bg-primary text-primary-foreground hover:bg-primary/90 transition-colors">
            All Data
          </button>
          <span className="ml-2 text-xs text-muted-foreground italic">Aggregated views coming soon</span>
        </div>
      </div>
      {priceHistoryLoading ? (
        <div className="flex justify-center items-center h-96">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
        </div>
      ) : patchedPriceHistory ? (
        <PriceHistoryChart data={patchedPriceHistory} />
      ) : (
        <p className="text-muted-foreground">No price history available.</p>
      )}
    </div>
  );
}

