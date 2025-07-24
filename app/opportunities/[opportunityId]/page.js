'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';

const OpportunityDetailPage = () => {
  const params = useParams();
  const { opportunityId } = params;
  
  const [opportunity, setOpportunity] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [bidAmount, setBidAmount] = useState('');
  const [bidThreshold, setBidThreshold] = useState('');

  useEffect(() => {
    if (opportunityId) {
      fetchOpportunity();
    }
  }, [opportunityId]);

  const fetchOpportunity = async () => {
    try {
      setLoading(true);
      const response = await fetch(`http://localhost:8000/api/v1/opportunities/${opportunityId}`);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      setOpportunity(data);
    } catch (err) {
      setError(err.message);
      console.error('Error fetching opportunity:', err);
    } finally {
      setLoading(false);
    }
  };

  const formatPercentage = (value) => {
    if (value === null || value === undefined) return 'N/A';
    return `${(value * 100).toFixed(2)}%`;
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

  const getPreviousPrice = (priceHistory) => {
    if (!priceHistory || priceHistory.length < 2) return null;
    // Sort by timestamp and get the price from the time window that triggered the alert
    const sortedHistory = [...priceHistory].sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
    return sortedHistory[sortedHistory.length - 2]?.price; // Previous price before current
  };

  const renderMiniChart = (priceHistory) => {
    if (!priceHistory || priceHistory.length < 2) {
      return (
        <div className="h-16 flex items-center justify-center text-gray-400 text-sm">
          No price history available
        </div>
      );
    }

    const sortedHistory = [...priceHistory].sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
    const prices = sortedHistory.map(p => p.price);
    const minPrice = Math.min(...prices);
    const maxPrice = Math.max(...prices);
    const priceRange = maxPrice - minPrice || 0.01; // Avoid division by zero

    // Create SVG path for the line chart
    const width = 200;
    const height = 60;
    const points = prices.map((price, index) => {
      const x = (index / (prices.length - 1)) * width;
      const y = height - ((price - minPrice) / priceRange) * height;
      return `${x},${y}`;
    }).join(' ');

    return (
      <div className="h-16 flex items-center">
        <svg width={width} height={height} className="overflow-visible">
          <polyline
            fill="none"
            stroke="#3B82F6"
            strokeWidth="2"
            points={points}
          />
          {/* Add dots for data points */}
          {prices.map((price, index) => {
            const x = (index / (prices.length - 1)) * width;
            const y = height - ((price - minPrice) / priceRange) * height;
            return (
              <circle
                key={index}
                cx={x}
                cy={y}
                r="2"
                fill="#3B82F6"
              />
            );
          })}
        </svg>
      </div>
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
      <span className={`px-3 py-1 rounded-full text-sm font-medium ${colors[status] || colors.active}`}>
        {status}
      </span>
    );
  };

  const handlePlaceOrder = () => {
    // Placeholder for order placement logic
    alert(`Placing order: $${bidAmount} at ${bidThreshold}% threshold`);
  };

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex justify-center items-center h-64">
          <div className="text-lg text-gray-600">Loading opportunity details...</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
          Error loading opportunity: {error}
        </div>
        <div className="mt-4">
          <Link href="/opportunities" className="text-blue-600 hover:text-blue-800">
            ← Back to Opportunities
          </Link>
        </div>
      </div>
    );
  }

  if (!opportunity) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center">
          <div className="text-lg text-gray-600 mb-4">Opportunity not found</div>
          <Link href="/opportunities" className="text-blue-600 hover:text-blue-800">
            ← Back to Opportunities
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-6">
        <Link href="/opportunities" className="text-blue-600 hover:text-blue-800 mb-4 inline-block">
          ← Back to Opportunities
        </Link>
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold text-gray-900">Opportunity Details</h1>
          {getStatusBadge(opportunity.status)}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Prominent Outcome Display */}
          {opportunity.outcome && (
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg shadow-lg border-2 border-blue-200 p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Left side - Outcome Info */}
                <div>
                  <div className="mb-4">
                    <h2 className="text-2xl font-bold text-gray-900 mb-2">
                      {opportunity.outcome.name}
                    </h2>
                    <p className="text-gray-600 text-sm leading-relaxed">
                      {opportunity.market?.question}
                    </p>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4 mb-4">
                    <div className="bg-white rounded-lg p-3 border border-blue-200">
                      <div className="text-xs text-gray-500 mb-1">Current Price</div>
                      <div className="text-xl font-bold text-blue-600">
                        {formatPercentage(opportunity.outcome.current_price)}
                      </div>
                    </div>
                    <div className="bg-white rounded-lg p-3 border border-blue-200">
                      <div className="text-xs text-gray-500 mb-1">Previous Price</div>
                      <div className="text-xl font-bold text-gray-600">
                        {getPreviousPrice(opportunity.outcome.price_history) 
                          ? formatPercentage(getPreviousPrice(opportunity.outcome.price_history))
                          : 'N/A'
                        }
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center space-x-4 text-sm">
                    <div className="flex items-center">
                      <span className="mr-1">{getDirectionIcon(opportunity.direction)}</span>
                      <span className="font-medium text-gray-700">
                        {formatPercentage(opportunity.magnitude)} movement
                      </span>
                    </div>
                    <div className="text-gray-500">
                      {opportunity.window} window
                    </div>
                  </div>

                  <div className="mt-4 flex flex-wrap gap-2 text-sm">
                    <div className="bg-white px-3 py-1 rounded-full border border-blue-200">
                      <span className="text-gray-600">Volume: </span>
                      <span className="font-medium">{formatVolume(opportunity.outcome.current_volume || opportunity.market?.volume)}</span>
                    </div>
                    <div className="bg-white px-3 py-1 rounded-full border border-blue-200">
                      <span className="text-gray-600">Status: </span>
                      <span className="font-medium capitalize">{opportunity.market?.status || 'Unknown'}</span>
                    </div>
                  </div>

                  {opportunity.market?.url && (
                    <div className="mt-4">
                      <a
                        href={opportunity.market.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                      >
                        View on Polymarket →
                      </a>
                    </div>
                  )}
                </div>

                {/* Right side - Price Chart */}
                <div className="bg-white rounded-lg p-4 border border-blue-200">
                  <h3 className="text-lg font-semibold mb-3 text-gray-900">Price Movement</h3>
                  {renderMiniChart(opportunity.outcome.price_history)}
                  <div className="mt-3 text-xs text-gray-500">
                    {opportunity.outcome.price_history && opportunity.outcome.price_history.length > 0
                      ? `${opportunity.outcome.price_history.length} data points`
                      : 'Limited price history'
                    }
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Market Information */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h2 className="text-xl font-semibold mb-4">Market Information</h2>
            <div className="space-y-4">
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  {opportunity.market?.name || 'Unknown Market'}
                </h3>
                <p className="text-gray-600">{opportunity.market?.question}</p>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Market Volume</label>
                  <div className="text-lg font-semibold text-gray-900">
                    {formatVolume(opportunity.market?.volume)}
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Market Status</label>
                  <div className="text-lg font-semibold text-gray-900">
                    {opportunity.market?.status || 'Unknown'}
                  </div>
                </div>
              </div>

              {opportunity.market?.url && (
                <div>
                  <a
                    href={opportunity.market.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center text-blue-600 hover:text-blue-800"
                  >
                    View on Polymarket →
                  </a>
                </div>
              )}
            </div>
          </div>

          {/* Opportunity Details */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h2 className="text-xl font-semibold mb-4">Opportunity Analysis</h2>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
              <div className="text-center p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <div className="text-2xl font-bold text-blue-900">
                  {opportunity.outcome ? formatPercentage(opportunity.outcome.current_price) : formatPercentage(opportunity.market_probability)}
                </div>
                <div className="text-sm text-blue-700 font-medium">Current Price</div>
                <div className="text-xs text-blue-600 mt-1">
                  {opportunity.outcome ? 'Outcome' : 'Market'}
                </div>
              </div>
              <div className="text-center p-4 bg-gray-50 rounded-lg">
                <div className="text-2xl font-bold text-gray-900">
                  {formatPercentage(opportunity.magnitude)}
                </div>
                <div className="text-sm text-gray-600">Price Movement</div>
                <div className="text-xs text-gray-500 mt-1">
                  {getDirectionIcon(opportunity.direction)} {opportunity.window} window
                </div>
              </div>
              <div className="text-center p-4 bg-gray-50 rounded-lg">
                <div className="text-2xl font-bold text-gray-900">
                  {(opportunity.opportunity_score * 100).toFixed(1)}%
                </div>
                <div className="text-sm text-gray-600">Opportunity Score</div>
              </div>
              <div className="text-center p-4 bg-gray-50 rounded-lg">
                <div className="text-2xl font-bold text-gray-900">
                  {opportunity.confidence_score ? (opportunity.confidence_score * 100).toFixed(1) + '%' : 'N/A'}
                </div>
                <div className="text-sm text-gray-600">Confidence</div>
              </div>
              <div className="text-center p-4 bg-gray-50 rounded-lg">
                <div className="text-2xl font-bold text-gray-900">
                  {formatPercentage(opportunity.divergence)}
                </div>
                <div className="text-sm text-gray-600">Divergence</div>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Source</label>
                <div className="text-sm text-gray-900 capitalize">
                  {opportunity.source.replace('_', ' ')}
                </div>
              </div>
              
              {opportunity.outcome && (
                <div>
                  <label className="block text-sm font-medium text-gray-700">Target Outcome</label>
                  <div className="text-sm text-gray-900 font-medium">{opportunity.outcome.name}</div>
                  <div className="text-lg font-bold text-blue-600 mt-1">
                    Current Price: {formatPercentage(opportunity.outcome.current_price)}
                  </div>
                  {opportunity.outcome.current_volume && (
                    <div className="text-sm text-gray-600">
                      Volume: {formatVolume(opportunity.outcome.current_volume)}
                    </div>
                  )}
                </div>
              )}

              {opportunity.notes && (
                <div>
                  <label className="block text-sm font-medium text-gray-700">Notes</label>
                  <div className="text-sm text-gray-900">{opportunity.notes}</div>
                </div>
              )}
            </div>
          </div>

          {/* Market Outcomes */}
          {opportunity.market?.outcomes && opportunity.market.outcomes.length > 0 && (
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h2 className="text-xl font-semibold mb-4">All Market Outcomes</h2>
              <div className="space-y-3">
                {opportunity.market.outcomes.map((outcome) => (
                  <div
                    key={outcome.id}
                    className={`p-4 rounded-lg border ${
                      outcome.id === opportunity.outcome_id
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-200 bg-gray-50'
                    }`}
                  >
                    <div className="flex justify-between items-center">
                      <div>
                        <div className="font-medium text-gray-900">{outcome.name}</div>
                        {outcome.id === opportunity.outcome_id && (
                          <div className="text-sm text-blue-600 font-medium">Target Outcome</div>
                        )}
                      </div>
                      <div className="text-right">
                        <div className="text-lg font-semibold text-gray-900">
                          {formatPercentage(outcome.current_price)}
                        </div>
                        <div className="text-sm text-gray-600">
                          Vol: {formatVolume(outcome.current_volume)}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Trading Panel */}
        <div className="space-y-6">
          {/* Order Book Placeholder */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-semibold mb-4">Order Book</h3>
            <div className="text-center py-8 text-gray-500">
              <div className="text-4xl mb-2">📊</div>
              <div>Order book integration</div>
              <div className="text-sm">Coming soon</div>
            </div>
          </div>

          {/* Trading Interface */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-semibold mb-4">Place Order</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Bid Amount ($)
                </label>
                <input
                  type="number"
                  value={bidAmount}
                  onChange={(e) => setBidAmount(e.target.value)}
                  placeholder="100"
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Price Threshold (%)
                </label>
                <input
                  type="number"
                  value={bidThreshold}
                  onChange={(e) => setBidThreshold(e.target.value)}
                  placeholder="65"
                  min="0"
                  max="100"
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <button
                onClick={handlePlaceOrder}
                disabled={!bidAmount || !bidThreshold}
                className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Place Order
              </button>
              
              <div className="text-xs text-gray-500 text-center">
                This is a placeholder interface
              </div>
            </div>
          </div>

          {/* Price History Placeholder */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-semibold mb-4">Price History</h3>
            <div className="text-center py-8 text-gray-500">
              <div className="text-4xl mb-2">📈</div>
              <div>Price chart integration</div>
              <div className="text-sm">Coming soon</div>
            </div>
          </div>

          {/* Opportunity Metadata */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-semibold mb-4">Metadata</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">Created:</span>
                <span className="text-gray-900">
                  {new Date(opportunity.created_at).toLocaleString()}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Updated:</span>
                <span className="text-gray-900">
                  {new Date(opportunity.updated_at).toLocaleString()}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">ID:</span>
                <span className="text-gray-900 font-mono text-xs">
                  {opportunity.id}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default OpportunityDetailPage;