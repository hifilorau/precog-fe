'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRealTimePrices } from '../../../hooks/useRealTimePrices';
import QuickBetModal from '../../positions/components/QuickBetModal';

const OpportunityTable = ({ 
  opportunities, 
  loading, 
  sortBy, 
  sortOrder, 
  onSort 
}) => {
  const [trackingStates, setTrackingStates] = useState({});
  const [trackingLoading, setTrackingLoading] = useState({});
  const [quickBetMarket, setQuickBetMarket] = useState(null);
  const [quickBetOutcome, setQuickBetOutcome] = useState(null);
  const [showQuickBet, setShowQuickBet] = useState(false);
  
  // Fetch real-time prices for all opportunities
  const { currentPrices, loading: pricesLoading, error: pricesError, refreshPrices } = useRealTimePrices(opportunities);

  const handleQuickBet = (market, outcome) => {
    setQuickBetMarket(market);
    setQuickBetOutcome(outcome);
    setShowQuickBet(true);
  };

  const formatPercentage = (value) => {
    if (value === null || value === undefined) return 'N/A';
    return `${(value * 100).toFixed(2)}%`;
  };

  const formatMovement = (magnitude) => {
    if (!magnitude) return 'N/A';
    return `${(magnitude * 100).toFixed(1)}%`;
  };

  const formatVolume = (volume) => {
    if (!volume) return 'N/A';
    if (volume >= 1000000) return `$${(volume / 1000000).toFixed(1)}M`;
    if (volume >= 1000) return `$${(volume / 1000).toFixed(1)}K`;
    return `$${volume.toFixed(0)}`;
  };

  const getDirectionIcon = (direction) => {
    if (direction === 'up') return '↗️';
    if (direction === 'down') return '↘️';
    return '→';
  };

  const getTippingPointBadge = (opportunity) => {
    if (opportunity.source !== 'tipping_point') return null;
    
    return (
      <span className="px-2 py-1 ml-2 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
        Tipping Point
      </span>
    );
  };

  const getStatusBadge = (status) => {
    const colors = {
      active: 'bg-green-100 text-green-800',
      in_progress: 'bg-blue-100 text-blue-800',
      completed: 'bg-gray-100 text-gray-800',
      expired: 'bg-red-100 text-red-800',
      cancelled: 'bg-yellow-100 text-yellow-800'
    };
    
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${colors[status] || colors.active}`}>
        {status}
      </span>
    );
  };

  const getSortIcon = (field) => {
    if (sortBy !== field) {
      return <span className="text-gray-400">↕️</span>;
    }
    return sortOrder === 'asc' ? <span className="text-blue-600">↑</span> : <span className="text-blue-600">↓</span>;
  };

  const handleSort = (field) => {
    if (sortBy === field) {
      onSort(field, sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      onSort(field, 'desc');
    }
  };

  const SortableHeader = ({ field, children, className = "" }) => (
    <th 
      className={`px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 ${className}`}
      onClick={() => handleSort(field)}
    >
      <div className="flex items-center space-x-1">
        <span>{children}</span>
        {getSortIcon(field)}
      </div>
    </th>
  );



  return (
    <div className="mt-8 flex flex-col">
      <div className="-my-2 overflow-x-auto sm:-mx-6 lg:-mx-8">
        <div className="py-2 align-middle inline-block min-w-full sm:px-6 lg:px-8">
          {/* Table content */}
          {loading ? (
            <div className="text-center py-4">Loading opportunities...</div>
          ) : (
            <div className="shadow overflow-hidden border-b border-gray-200 sm:rounded-lg">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Market / Outcome
                    </th>
                    <SortableHeader field="current_price">
                      <div className="flex items-center space-x-2">
                        <span>Price</span>
                        <button
                          onClick={refreshPrices}
                          className="text-xs text-gray-400 hover:text-gray-600 transition-colors"
                          title="Refresh real-time prices"
                        >
                          ⟳
                        </button>
                      </div>
                    </SortableHeader>
                    <SortableHeader field="magnitude">
                      Movement
                    </SortableHeader>
                    <SortableHeader field="volume">
                      Volume
                    </SortableHeader>
                    <SortableHeader field="opportunity_score">
                      Score
                    </SortableHeader>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Closes At
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {opportunities.map((opportunity) => (
                    <tr key={opportunity.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div>
                            <div className="text-sm font-medium text-gray-900">
                              {opportunity.market?.name || 'N/A'}
                            </div>
                            {opportunity.outcome && (
                              <div className="text-sm text-gray-500">
                                {opportunity.outcome.name}
                              </div>
                            )}
                          </div>
                          {getTippingPointBadge(opportunity)}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {(() => {
                          const capturedPrice = opportunity.outcome ? opportunity.outcome.current_price : opportunity.market_probability;
                          const currentPrice = currentPrices.get(opportunity.outcome?.id);
                          const hasCurrentPrice = currentPrice !== undefined;
                          const priceChange = hasCurrentPrice ? ((currentPrice - capturedPrice) / capturedPrice) * 100 : 0;
                          const isPriceUp = priceChange > 0;
                          const isPriceDown = priceChange < 0;
                          
                          return (
                            <div className="space-y-1">
                              {/* Current Price */}
                              <div className="flex items-center space-x-2">
                                <div className="text-sm font-medium">
                                  {hasCurrentPrice ? formatPercentage(currentPrice) : formatPercentage(capturedPrice)}
                                </div>
                                {hasCurrentPrice && Math.abs(priceChange) > 0.1 && (
                                  <div className={`text-xs px-1.5 py-0.5 rounded ${
                                    isPriceUp ? 'bg-green-100 text-green-700' : 
                                    isPriceDown ? 'bg-red-100 text-red-700' : 
                                    'bg-gray-100 text-gray-700'
                                  }`}>
                                    {isPriceUp ? '+' : ''}{priceChange.toFixed(1)}%
                                  </div>
                                )}
                                {pricesLoading && (
                                  <div className="text-xs text-gray-400">⟳</div>
                                )}
                              </div>
                              
                              {/* Captured Price (if different from current) */}
                              {hasCurrentPrice && Math.abs(currentPrice - capturedPrice) > 0.001 && (
                                <div className="text-xs text-gray-500">
                                  Captured: {formatPercentage(capturedPrice)}
                                </div>
                              )}
                              
                              {/* Price Type Label */}
                              <div className="text-xs text-gray-500">
                                {hasCurrentPrice ? 'Live' : 'Captured'} {opportunity.outcome ? 'outcome' : 'market'} price
                              </div>
                            </div>
                          );
                        })()} 
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <span className="mr-1">{getDirectionIcon(opportunity.direction)}</span>
                          <span className="text-sm text-gray-900">
                            {formatMovement(opportunity.magnitude)}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">
                          {formatVolume(opportunity.market?.volume)}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">
                          {opportunity.opportunity_score 
                            ? `${Math.round(opportunity.opportunity_score * 100)}%`
                            : 'N/A'}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {opportunity.market?.closes_at ? (
                          <div className="text-sm text-gray-900">
                            {new Date(opportunity.market.closes_at).toLocaleDateString('en-US', {
                              month: 'short',
                              day: 'numeric',
                              year: 'numeric'
                            })}
                          </div>
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {getStatusBadge(opportunity.status || 'active')}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <div className="flex space-x-2">
                          <Link
                            href={`/opportunities/${opportunity.id}`}
                            className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-blue-700 bg-blue-100 hover:bg-blue-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                          >
                            View
                          </Link>
                          <button
                            onClick={() => handleQuickBet(opportunity.market, opportunity.outcome)}
                            className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
                          >
                            Buy
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Quick Bet Modal */}
      <QuickBetModal
        market={quickBetMarket}
        outcome={quickBetOutcome}
        isOpen={showQuickBet}
        onClose={() => setShowQuickBet(false)}
      />
    </div>
  );
};

export default OpportunityTable;
