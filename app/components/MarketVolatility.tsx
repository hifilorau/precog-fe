import React from "react";

export interface MarketVolatilityProps {
  volatility?: {
    computed_at: string;
    volatility_1h?: number;
    volatility_6h?: number;
    volatility_24h?: number;
    volatility_7d?: number;
    normalized_volatility?: number;
    breakout_1h?: boolean;
    breakout_6h?: boolean;
    breakout_24h?: boolean;
  };
  compact?: boolean; // for card view
}

export const MarketVolatility: React.FC<MarketVolatilityProps> = ({ volatility, compact }) => {
  if (!volatility) return null;
  console.log('MarketVolatility', volatility['6h'])
  // Helper for formatting numbers
  const fmt = (v?: number, digits = 2) => {
    console.log('fmt', v)
    const value = v || 0;
    return value.toFixed(digits);
  }

  // Only show a compact subset for card view
  if (compact) {
    return (
      <div className="mt-2 flex flex-row gap-2 text-xs text-gray-500 items-center">
        <span title="1h volatility">1h: {fmt(volatility['1h'])}</span>
        <span title="6h volatility">6h: {fmt(volatility['6h'])}</span>
        <span title="24h volatility">24h: {fmt(volatility['24h'])}</span>
        <span title="Norm">Norm: {fmt(volatility.normalized_volatility)}</span>
        {volatility.breakout_1h && <span className="text-red-500 font-bold">1h Breakout!</span>}
        {volatility.breakout_6h && <span className="text-red-500 font-bold">6h Breakout!</span>}
        {volatility.breakout_24h && <span className="text-red-500 font-bold">24h Breakout!</span>}
      </div>
    );
  }

  // Full detail view
  return (
    <div className="mt-4 p-2 border rounded">
      <div className="font-semibold mb-1">Volatility Stats</div>
      <div className="grid grid-cols-2 gap-2 text-sm">
        <span>1h: {fmt(volatility['1h'])}</span>
        <span>6h: {fmt(volatility['6h'])}</span>
        <span>24h: {fmt(volatility['24h'])}</span>
        <span>7d: {fmt(volatility['7d'])}</span>
        <span>Normalized: {fmt(volatility['normalized_24h'])}</span>
        <span>Computed: {new Date(volatility.computed_at).toLocaleString()}</span>
        <span>Breakout 1h: {volatility.breakout_1h ? "Yes" : "No"}</span>
        <span>Breakout 6h: {volatility.breakout_6h ? "Yes" : "No"}</span>
        <span>Breakout 24h: {volatility.breakout_24h ? "Yes" : "No"}</span>
      </div>
    </div>
  );
};

export default MarketVolatility;
