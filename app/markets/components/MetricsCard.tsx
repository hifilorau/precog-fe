"use client";

import { Market } from '@/lib/types/markets';

interface MetricsCardProps {
  market: Market | null;
}

function humanNumber(num?: number): string {
  if (num === undefined || num === null) return 'N/A';
  if (num >= 1e9) return (num / 1e9).toFixed(2) + 'B';
  if (num >= 1e6) return (num / 1e6).toFixed(2) + 'M';
  if (num >= 1e3) return (num / 1e3).toFixed(2) + 'K';
  return num.toLocaleString();
}

export default function MetricsCard({ market }: MetricsCardProps) {
  if (!market) return null;
  return (
    <div className="card p-6 mt-4">
      <h2 className="text-lg font-semibold mb-4">Market Metrics</h2>
      <div className="grid grid-cols-2 gap-6 text-sm">
        <div>
          <h3 className="text-xs font-medium text-muted-foreground">Liquidity</h3>
          <p>{humanNumber(market.liquidity)}</p>
        </div>
        <div>
          <h3 className="text-xs font-medium text-muted-foreground">Volume</h3>
          <p>{humanNumber(market.volume)}</p>
        </div>
      </div>
    </div>
  );
}
