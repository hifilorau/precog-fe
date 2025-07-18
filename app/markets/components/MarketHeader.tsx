'use client';

import { Market } from '@/lib/types/markets';
import IngestNewsButton from './IngestNewsButton';

interface MarketHeaderProps {
  market: Market | null;
  marketId: string;
  isTracked: boolean;
  isTracking: boolean;
  isCheckingTrackedStatus: boolean;
  handleTrackToggle: () => void;
  onSuccess: () => void;
}

export default function MarketHeader({
  market,
  marketId,
  isTracked,
  isTracking,
  isCheckingTrackedStatus,
  handleTrackToggle,
  onSuccess,
}: MarketHeaderProps) {
  return (
    <div className="flex justify-between items-start mb-4">
      <div className="flex flex-col gap-1 pr-4 flex-1">
        <h1 className="text-2xl font-bold">{market?.question || 'Market Detail'}</h1>
        {(market?.category || market?.subcategory) && (
          <div className="flex flex-wrap gap-2 mt-1">
            {market?.category && (
              <span className="px-2.5 py-1 text-xs font-medium rounded-full bg-secondary text-secondary-foreground border border-border">
                {market.category}
              </span>
            )}
            {market?.subcategory && (
              <span className="px-2.5 py-1 text-xs font-medium rounded-full bg-muted text-muted-foreground border border-border">
                {market.subcategory}
              </span>
            )}
          </div>
        )}
      </div>
      <div className="flex items-center space-x-2">
        <button
          onClick={handleTrackToggle}
          disabled={isTracking || isCheckingTrackedStatus}
          className="px-4 py-2 text-sm font-medium rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed bg-secondary text-secondary-foreground hover:bg-muted"
        >
          {isTracking ? '...' : isTracked ? 'Untrack' : 'Track'}
        </button>
        <IngestNewsButton marketId={marketId} onSuccess={onSuccess} />
      </div>
    </div>
  );
}
