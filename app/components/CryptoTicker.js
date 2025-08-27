'use client';

import useRealTimeCoinPrices from '../../hooks/useRealTimeCoinPrices';

export default function CryptoTicker() {
  const { prices, loading, error } = useRealTimeCoinPrices();

  if (loading) {
    return (
      <div className="bg-gray-900 text-white py-1 px-4">
        <div className="flex items-center justify-center">
          <span className="text-xs">Loading crypto prices...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-900 text-white py-1 px-4">
        <div className="flex items-center justify-center">
          <span className="text-xs">Failed to load crypto prices</span>
        </div>
      </div>
    );
  }

  const formatPrice = (price) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(price);
  };

  const formatPercentage = (percentage) => {
    if (percentage === null || percentage === undefined) return 'N/A';
    const formatted = percentage.toFixed(2);
    return `${formatted >= 0 ? '+' : ''}${formatted}%`;
  };

  const getPercentageColor = (percentage) => {
    if (percentage === null || percentage === undefined) return 'text-gray-400';
    return percentage >= 0 ? 'text-green-400' : 'text-red-400';
  };

  return (
    <div className="bg-gray-900 text-white py-1 px-4 overflow-hidden">
      <div className="flex items-center space-x-8 animate-pulse">
        {Object.entries(prices).map(([symbol, data]) => (
          <div key={symbol} className="flex items-center space-x-2 whitespace-nowrap">
            <span className="text-xs font-semibold text-yellow-400">{symbol}</span>
            <span className="text-xs font-medium">{formatPrice(data.price)}</span>
            <span className={`text-xs ${getPercentageColor(data['24h'])}`}>
              {formatPercentage(data['24h'])}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}