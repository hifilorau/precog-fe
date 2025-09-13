import React from 'react';
import { TrendingUp, TrendingDown } from 'lucide-react';

// Market price formatter (probability -> cents string, e.g. 12.3¢)
export const formatMarketPrice = (price) => {
  if (price === null || price === undefined) return '-';
  return `${(price * 100).toFixed(1)}¢`;
};

// New: named export expected by consumers
export const formatPrice = formatMarketPrice;

// New: human-friendly volume/size formatter
export const formatVolume = (value) => {
  if (value === null || value === undefined) return '-';
  const num = Number(value);
  if (Number.isNaN(num)) return String(value);
  return num.toLocaleString(undefined, { maximumFractionDigits: 2 });
};

// PnL calculation
export const calculatePnL = (position, currentPrice) => {
  if (!position?.entry_price || currentPrice === undefined || currentPrice === null) return null;
  const entryPrice = position.entry_price;
  const volume = position.volume || 1;
  const pnl = (currentPrice - entryPrice) * volume;
  const pnlPercent = ((currentPrice - entryPrice) / entryPrice) * 100;
  return { pnl, pnlPercent };
};

// Current price resolver using real-time map, fallback to outcome fields
export const getCurrentPrice = (position, currentPrices) => {
  // Prefer real-time map if provided
  if (position?.outcome?.id && currentPrices?.get) {
    const fromMap = currentPrices.get(position.outcome.id)
    if (fromMap !== undefined) return fromMap
  }

  // Poly top-level price
  if (position?.curPrice !== undefined && position.curPrice !== null) {
    return position.curPrice
  }

  // Backend top-level price
  if (position?.current_price !== undefined && position.current_price !== null) {
    return position.current_price
  }

  // Fallbacks based on nested outcome
  const outcomePrice = position?.outcome?.current_price
  if (outcomePrice !== undefined && outcomePrice !== null) return outcomePrice

  return position?.outcome?.probability || 0;
};

// Stop-loss risk level helper
export const getStopLossRiskLevel = (position, currentPrice) => {
  if (!position?.stop_loss_price || !position?.entry_price || !currentPrice) return null;

  const priceDropFromEntry = (position.entry_price - currentPrice) / position.entry_price;
  const distanceToStopLoss = (currentPrice - position.stop_loss_price) / position.entry_price;

  const concise = `${(priceDropFromEntry * 100).toFixed(1)}% drop`;
  if (priceDropFromEntry >= 0.10) {
    return { level: 'crash', message: concise, color: 'bg-red-100 text-red-800 border-red-200' };
  }
  if (priceDropFromEntry >= 0.05 || distanceToStopLoss <= 0.02) {
    return { level: 'high', message: concise, color: 'bg-orange-100 text-orange-800 border-orange-200' };
  }
  if (priceDropFromEntry >= 0.02 || distanceToStopLoss <= 0.05) {
    return { level: 'medium', message: concise, color: 'bg-yellow-100 text-yellow-800 border-yellow-200' };
  }
  return null;
};

// JSX helpers (UI formatters)
export const formatPnL = (pnl, pnlPercent) => {
  if (pnl === null || pnl === undefined || pnlPercent === null || pnlPercent === undefined) return '-';
  const isPositive = pnl >= 0;
  const colorClass = isPositive ? 'text-green-600' : 'text-red-600';
  const Icon = isPositive ? TrendingUp : TrendingDown;
  return (
    <div className={`flex items-center gap-1 ${colorClass}`}>
      <Icon className="h-3 w-3" />
      <span className="font-medium">${Math.abs(pnl).toFixed(2)}</span>
      <span className="text-xs">({pnlPercent >= 0 ? '+' : ''}{pnlPercent.toFixed(1)}%)</span>
    </div>
  );
};

export const getStatusBadge = (position) => {
  const status = position?.status;
  const resolved = position?.resolved_status;
  const marketClosed = position?.market?.status === 'closed';

  let text = 'Unknown';
  let color = 'bg-gray-100 text-gray-800 border-gray-200';

  if (resolved === 'won') {
    text = 'Won';
    color = 'bg-green-100 text-green-800 border-green-200';
  } else if (resolved === 'lost') {
    text = 'Lost';
    color = 'bg-red-100 text-red-800 border-red-200';
  } else if (status === 'filled') {
    text = 'Filled';
    color = 'bg-blue-100 text-blue-800 border-blue-200';
  } else if (status === 'open' || status === 'not_filled') {
    text = 'Pending';
    color = 'bg-yellow-100 text-yellow-800 border-yellow-200';
  } else if (marketClosed) {
    text = 'Closed';
    color = 'bg-orange-100 text-orange-800 border-orange-200';
  }

  return (
    <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium border ${color}`}>
      {text}
    </span>
  );
};
