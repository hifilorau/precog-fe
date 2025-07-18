'use client';

import { Market } from '@/lib/types/markets';

interface MarketInfoCardProps {
  market: Market | null;
  showDescription: boolean;
  toggleDescription: () => void;
  formatDate: (dateString: string | null | undefined) => string;
}

export default function MarketInfoCard({
  market,
  showDescription,
  toggleDescription,
  formatDate,
}: MarketInfoCardProps) {
  if (!market) {
    return null; // Or a loading skeleton
  }

  return (
    <div className="card p-6">
      <div className="p-6">
        <button onClick={toggleDescription} className="text-sm text-muted-foreground hover:text-foreground w-full text-left">
          {showDescription ? 'Hide Details' : 'Show Details'}
        </button>
      </div>
      {showDescription && (
        <div className="p-6 border-t border-border">
          <div className="prose prose-sm dark:prose-invert max-w-none mb-4">
            <p>{market.description}</p>
          </div>
          <div className="flex items-center gap-3 mb-4">
            <span className={`px-2.5 py-1 text-xs font-semibold rounded-full uppercase tracking-wide border ${
              market.status === 'open'
                ? 'bg-green-100 text-green-800 border-green-300'
                : market.status === 'closed'
                ? 'bg-yellow-100 text-yellow-800 border-yellow-300'
                : 'bg-gray-200 text-gray-700 border-gray-300'
            }`}>
              {market.status}
            </span>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div><h3 className="text-xs font-medium text-muted-foreground">Last Updated</h3><p>{formatDate(market.updated_at)}</p></div>
            <div><h3 className="text-xs font-medium text-muted-foreground">Closes</h3><p>{formatDate(market.closes_at)}</p></div>
            <div><h3 className="text-xs font-medium text-muted-foreground">Resolved</h3><p>{formatDate(market.resolved_at)}</p></div>
          </div>
        </div>
      )}
    </div>
  );
}
