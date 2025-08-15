'use client';

import Link from 'next/link';
import { useState } from 'react';
import { useRealTimePrices } from '../../../hooks/useRealTimePrices';

const OpportunityTable = ({ 
  opportunities, 
  loading, 
  sortBy, 
  sortOrder, 
  onSort 
}) => {
  const [trackingStates, setTrackingStates] = useState({});
  const [trackingLoading, setTrackingLoading] = useState({});
  
  // Fetch real-time prices for all opportunities
  const { currentPrices, loading: pricesLoading, error: pricesError, refreshPrices } = useRealTimePrices(opportunities);

  const formatPercentage = (value) => {
    if (value === null || value === undefined) return 'N/A';
    return `${(value * 100).toFixed(2)}%`;
  };

  const formatMovement = (magnitude) => {
    if (!magnitude) return 'N/A';
    return `${(magnitude * 100).toFixed(1)}%`;
  };

  const handleTrackToggle = async (marketId, isCurrentlyTracked) => {
    setTrackingLoading(prev => ({ ...prev, [marketId]: true }));
    
    // Optimistically update the UI immediately
    setTrackingStates(prev => ({
      ...prev,
      [marketId]: !isCurrentlyTracked
    }));
    
    try {
      const method = isCurrentlyTracked ? 'DELETE' : 'POST';
      const response = await fetch(`http://localhost:8000/api/v1/tracked-markets/by-market/${marketId}`, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      if (!response.ok) {
        // Revert the optimistic update if the request failed
        setTrackingStates(prev => ({
          ...prev,
          [marketId]: isCurrentlyTracked
        }));
        console.error('Failed to toggle tracking:', response.statusText);
      }
      // If successful, the optimistic update already reflects the correct state
    } catch (error) {
      // Revert the optimistic update if there was an error
      setTrackingStates(prev => ({
        ...prev,
        [marketId]: isCurrentlyTracked
      }));
      console.error('Error toggling tracking:', error);
    } finally {
      setTrackingLoading(prev => ({ ...prev, [marketId]: false }));
    }
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
  
  // Special indicator for tipping point opportunities
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
      // Toggle sort order if same field
      onSort(field, sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      // Default to desc for new field
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

  // Filter out opportunities where current price is ≤5% or ≥95% (essentially resolved)
  // and markets with less than $50,000 in volume
  const filteredOpportunities = opportunities.filter(opp => {
    // Filter out opportunities with current price ≤5% or ≥95% (essentially resolved)
    if (opp.outcome && opp.outcome.current_price) {
      if (opp.outcome.current_price <= 0.05 || opp.outcome.current_price >= 0.95) {
        return false;
      }
    } else if (opp.market_probability) {
      if (opp.market_probability <= 0.05 || opp.market_probability >= 0.95) {
        return false;
      }
    }
    
    // Filter out markets with less than $50,000 volume
    if (opp.market && opp.market.volume < 50000) {
      return false;
    }
    
    return true;
  });

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="text-lg">Loading opportunities...</div>
      </div>
    );
  }

  // Show price error if there's an issue fetching real-time prices
  if (pricesError) {
    console.warn('Real-time price fetch error:', pricesError);
  }

  if (filteredOpportunities.length === 0 && opportunities.length > 0) {
    return (
      <div className="text-center py-8">
        <p className="text-gray-500">
          All opportunities filtered out (essentially resolved or low volume markets)
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-lg shadow-sm border border-gray-200 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="">
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
                Status
              </th>
              <SortableHeader field="created_at" className="w-24">
                Created
              </SortableHeader>
              <SortableHeader field="closes_at" className="w-24">
                Closes
              </SortableHeader>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Track
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {filteredOpportunities.map((opportunity) => (
              <tr key={opportunity.id} className="hover:bg-gray-500 bg-opacity-10">
                <td className="px-6 py-4">
                  <div>
                    <div className="text-sm font-medium  mb-1">
                      {opportunity.market?.name || 'Unknown Market'}
                    </div>
                    {opportunity.outcome && (
                      <div className="text-sm text-gray-500">
                        Outcome: {opportunity.outcome.name}
                      </div>
                    )}
                  </div>
                </td>
                <td className="px-6 py-4">
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
                <td className="px-6 py-4">
                  <div className="flex items-center">
                    <span className="mr-2">{getDirectionIcon(opportunity.direction)}</span>
                    <div>
                      <div className="text-sm font-medium ">
                        {formatMovement(opportunity.magnitude)}
                      </div>
                      <div className="text-xs text-gray-500">
                        {opportunity.window || 'N/A'} window
                      </div>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4 text-sm ">
                  {formatVolume(opportunity.market?.volume)}
                </td>
                <td className="px-6 py-4">
                  <div className="flex items-center">
                    <div className="text-sm font-medium">
                      {(opportunity.opportunity_score * 100).toFixed(1)}%
                    </div>
                    {getTippingPointBadge(opportunity)}
                  </div>
                  {opportunity.confidence_score && (
                    <div className="text-xs text-gray-500">
                      Conf: {(opportunity.confidence_score * 100).toFixed(1)}%
                    </div>
                  )}
                </td>
                <td className="px-6 py-4">
                  {getStatusBadge(opportunity.status)}
                </td>
                <td className="px-6 py-4 text-sm">
                  {new Date(opportunity.created_at).toLocaleDateString()}
                </td>
                <td className="px-6 py-4 text-sm">
                  {opportunity.market?.closes_at ? (
                    <div>
                      <div>{new Date(opportunity.market.closes_at).toLocaleDateString()}</div>
                      {opportunity.source === 'tipping_point' && (
                        <div className="text-xs text-purple-700 font-medium">
                          {(() => {
                            const closingDate = new Date(opportunity.market.closes_at);
                            const now = new Date();
                            const diffTime = Math.abs(closingDate - now);
                            const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
                            const diffHours = Math.floor((diffTime % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
                            
                            return `Closing in ${diffDays}d ${diffHours}h`;
                          })()}
                        </div>
                      )}
                    </div>
                  ) : 'N/A'}
                </td>
                <td className="px-6 py-4">
                  {(() => {
                    const marketId = opportunity.market?.id;
                    const isTracked = trackingStates[marketId] !== undefined ? trackingStates[marketId] : opportunity.is_tracked;
                    const isLoading = trackingLoading[marketId];
                    
                    return (
                      <button
                        onClick={() => handleTrackToggle(marketId, isTracked)}
                        disabled={isLoading}
                        className={`px-3 py-1 rounded text-xs font-medium ${
                          isTracked 
                            ? 'bg-green-100 text-green-800 hover:bg-green-200' 
                            : 'bg-gray-100 text-gray-800 hover:bg-gray-200'
                        } disabled:opacity-50 disabled:cursor-not-allowed`}
                      >
                        {isLoading ? '...' : (isTracked ? 'Tracked' : 'Track')}
                      </button>
                    );
                  })()} 
                </td>
                <td className="px-6 py-4">
                  <Link
                    href={`/opportunities/${opportunity.id}`}
                    className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-blue-700 bg-blue-100 hover:bg-blue-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                  >
                    View Details
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default OpportunityTable;
