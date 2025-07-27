'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import PlaceBetForm from '@/components/trading/PlaceBetForm';

// Dynamically import the PriceHistoryChart component with no SSR
const PriceHistoryChart = dynamic(
  () => import('@/app/markets/components/PriceHistoryChart'),
  { ssr: false }
);

const OpportunityDetailPage = () => {
  const params = useParams();
  const { opportunityId } = params;
  
  const [opportunity, setOpportunity] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [priceHistory, setPriceHistory] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [historyError, setHistoryError] = useState(null);
  const [orderBook, setOrderBook] = useState(null);
  const [loadingOrderBook, setLoadingOrderBook] = useState(false);
  const [orderBookError, setOrderBookError] = useState(null);

  // Memoize fetchOrderBook to prevent infinite re-renders
  const fetchOrderBook = useCallback(async (clobId) => {
    if (!clobId) {
      console.log('No CLOB ID provided to fetchOrderBook');
      return;
    }
    
    console.log(`Starting to fetch order book for CLOB ${clobId}`);
    setLoadingOrderBook(true);
    setOrderBookError(null);
    
    try {
      const url = `https://clob.polymarket.com/book?token_id=${clobId}`;
      console.log('Fetching order book from URL:', url);
      
      const response = await fetch(url, {
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to fetch order book: ${response.status} - ${errorText}`);
      }
      
      const data = await response.json();
      console.log('Received order book data:', data);
      setOrderBook(data);
    } catch (err) {
      console.error('Error in fetchOrderBook:', err);
      setOrderBookError(err.message || 'Failed to load order book');
    } finally {
      setLoadingOrderBook(false);
    }
  }, []);

  // Memoize fetchPriceHistory to prevent infinite re-renders
  const fetchPriceHistory = useCallback(async (marketId) => {
    if (!marketId) {
      console.log('No market ID provided to fetchPriceHistory');
      return;
    }
    
    console.log(`Starting to fetch price history for market ${marketId}`);
    setLoadingHistory(true);
    setHistoryError(null);
    
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout
    
    try {
      // Get data for the last 30 days by default
      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - 30);
      
      const url = `http://localhost:8000/api/v1/markets/${marketId}/price-history?` +
        `start_time=${encodeURIComponent(startDate.toISOString())}` +
        `&end_time=${encodeURIComponent(endDate.toISOString())}`;
      
      console.log('Fetching from URL:', url);
      
      const response = await fetch(url, {
        signal: controller.signal,
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      clearTimeout(timeoutId);
      
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to fetch price history: ${response.status} - ${errorText}`);
      }
      
      const data = await response.json();
      console.log('Received price history data:', data);
      
      if (data?.outcomes) {
        setPriceHistory(data);
      } else {
        throw new Error('Invalid price history data format received');
      }
    } catch (err) {
      if (err.name === 'AbortError') {
        console.error('Price history fetch timed out after 10 seconds');
        setHistoryError('Request timed out. Please try again.');
      } else {
        console.error('Error in fetchPriceHistory:', err);
        setHistoryError(err.message || 'Failed to load price history');
      }
    } finally {
      clearTimeout(timeoutId);
      setLoadingHistory(false);
    }
  }, []);

  const fetchOpportunity = useCallback(async () => {
    if (!opportunityId) return;
    
    try {
      setLoading(true);
      console.log(`Fetching opportunity ${opportunityId}...`);
      const response = await fetch(`http://localhost:8000/api/v1/opportunities/${opportunityId}`, {
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('Error response:', errorText);
        throw new Error(`HTTP error! status: ${response.status}: ${errorText}`);
      }
      
      const data = await response.json();
      console.log('Fetched opportunity data:', data);
      console.log('Outcome data:', data.outcome);
      console.log('CLOB ID from outcome:', data.outcome?.clob_id);
      setOpportunity(data);
      
      // If there's a market ID, fetch price history
      if (data.market_id) {
        await fetchPriceHistory(data.market_id);
      }
      
      return data;
    } catch (error) {
      console.error('Error fetching opportunity:', error);
      setError(error.message || 'Failed to load opportunity');
      throw error;
    } finally {
      setLoading(false);
    }
  }, [opportunityId, fetchPriceHistory]);

  useEffect(() => {
    const controller = new AbortController();
    
    const fetchData = async () => {
      try {
        console.log('Starting to fetch opportunity data...');
        const startTime = Date.now();
        await fetchOpportunity();
        console.log(`Successfully fetched opportunity data in ${Date.now() - startTime}ms`);
      } catch (error) {
        if (error.name !== 'AbortError') {
          console.error('Error in fetchData:', error);
          setError(`Failed to load opportunity: ${error.message}`);
        }
      }
    };
    
    fetchData();
    
    return () => {
      console.log('Cleaning up opportunity fetch effect');
      controller.abort();
    };
  }, [fetchOpportunity]);

  // Fetch order book data when opportunity is loaded and poll every 10 seconds
  useEffect(() => {
    const clobId = opportunity?.outcome?.clob_id;
    if (!clobId) {
      console.log('No CLOB ID found in opportunity outcome');
      return;
    }
    
    console.log(`Setting up order book polling for CLOB ID: ${clobId}`);
    
    // Initial fetch
    fetchOrderBook(clobId);
    
    // Set up polling interval
    const intervalId = setInterval(() => {
      fetchOrderBook(clobId);
    }, 10000); // 10 seconds
    
    // Clean up on unmount
    return () => {
      console.log('Cleaning up order book polling');
      clearInterval(intervalId);
    };
  }, [opportunity, fetchOrderBook]);

  // Fetch price history when opportunity data is loaded
  useEffect(() => {
    const marketId = opportunity?.market_id || opportunity?.market?.id;
    if (!marketId) return;
    
    const controller = new AbortController();
    
    const fetchData = async () => {
      try {
        console.log('Fetching price history for market:', marketId);
        await fetchPriceHistory(marketId);
      } catch (error) {
        if (error.name !== 'AbortError') {
          console.error('Error in price history effect:', error);
          setHistoryError(`Failed to load price history: ${error.message}`);
        }
      }
    };
    
    fetchData();
    
    return () => {
      console.log('Cleanup: Price history effect');
      controller.abort();
    };
  }, [opportunity?.market_id, opportunity?.market?.id, fetchPriceHistory]);

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
            <div className="shadow-lg p-6 border">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Left side - Outcome Info */}
                <div>
                  <div className="mb-4">
                    <h2 className="text-2xl font-bold text-white mb-2">
                      {opportunity.outcome.name}
                    </h2>
                    <p className="text-gray-400 text-sm leading-relaxed">
                      {opportunity.market?.question}
                    </p>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4 mb-4">
                    <div className="rounded-lg p-3 border border-blue-200">
                      <div className="text-xs text-gray-500 mb-1">Current Price</div>
                      <div className="text-xl font-bold text-blue-600">
                        {formatPercentage(opportunity.outcome.current_price)}
                      </div>
                    </div>
                    <div className="rounded-lg p-3 border border-blue-200">
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
                    <div className="px-3 py-1 rounded-full border">
                      <span className="text-gray-600">Volume: </span>
                      <span className="font-medium">{formatVolume(opportunity.outcome.current_volume || opportunity.market?.volume)}</span>
                    </div>
                    <div className="px-3 py-1 rounded-full border border-blue-200">
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
                        className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        View on Polymarket →
                      </a>
                    </div>
                  )}
                </div>

                {/* Right side - Price Chart */}
                    {/* Price History */}
                <div className="mt-8">
                    <h2 className="text-xl font-semibold mb-4">Price History</h2>
                    {loadingHistory ? (
                    <div className="flex justify-center items-center h-64">
                        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
                    </div>
                    ) : historyError ? (
                    <div className="text-red-500 p-4 border rounded">
                        Error loading price history: {historyError}
                    </div>
                    ) : priceHistory && priceHistory.outcomes ? (
                    <div className="space-y-4">
                        <div className="border rounded p-4">
                        <div className="h-[400px] w-full">
                            <PriceHistoryChart 
                            data={priceHistory} 
                            highlightOutcomeId={opportunity?.outcome_id} 
                            />
                        </div>
                        </div>
                        <div className="text-xs text-gray-500">
                        Showing price history for the last 30 days
                        </div>
                    </div>
                    ) : (
                    <div className="text-center py-8 text-gray-500">
                        <div className="text-4xl mb-2">📊</div>
                        <p>No price history data available</p>
                    </div>
                    )}
                </div>


              </div>
            </div>
          )}

      

          {/* Opportunity Details */}
          <div className="rounded-lg shadow-sm border border-gray-200 p-6">
            <h2 className="text-xl font-semibold mb-4">Opportunity Analysis</h2>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
              <div className="text-center p-4 border border-blue-200">
                <div className="text-2xl font-bold text-blue-900">
                  {opportunity.outcome ? formatPercentage(opportunity.outcome.current_price) : formatPercentage(opportunity.market_probability)}
                </div>
                <div className="text-sm text-blue-700 font-medium">Current Price</div>
                <div className="text-xs text-blue-600 mt-1">
                  {opportunity.outcome ? 'Outcome' : 'Market'}
                </div>
              </div>
              <div className="text-center p-4 border border-gray-200">
                <div className="text-2xl font-bold text-gray-900">
                  {formatPercentage(opportunity.magnitude)}
                </div>
                <div className="text-sm text-gray-600">Price Movement</div>
                <div className="text-xs text-gray-500 mt-1">
                  {getDirectionIcon(opportunity.direction)} {opportunity.window} window
                </div>
              </div>
              <div className="text-center p-4 border">
                <div className="text-2xl font-bold text-gray-900">
                  {(opportunity.opportunity_score * 100).toFixed(1)}%
                </div>
                <div className="text-sm text-gray-600">Opportunity Score</div>
              </div>
              <div className="text-center p-4 border">
                <div className="text-2xl font-bold text-gray-900">
                  {opportunity.confidence_score ? (opportunity.confidence_score * 100).toFixed(1) + '%' : 'N/A'}
                </div>
                <div className="text-sm text-gray-600">Confidence</div>
              </div>
              <div className="text-center p-4 border">
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
            <div className="rounded-lg shadow-sm border border-gray-200 p-6">
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
         {/* Trading Interface */}
         <div className="rounded-lg shadow-sm border border-gray-200 p-6">
            <PlaceBetForm
              market={opportunity.market}
              outcome={opportunity.outcome}
              onSuccess={(position) => {
                alert(`Position created successfully! ID: ${position.id}`);
                // You could redirect to positions page or show success message
                // router.push('/positions');
              }}
              showCard={false}
              className=""
            />
          </div>


        <div className="space-y-6">
          {/* Order Book */}
          <div className="rounded-lg shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-semibold mb-4">Order Book</h3>
            {loadingOrderBook && !orderBook ? (
              <div className="flex justify-center items-center h-64">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
              </div>
            ) : orderBookError ? (
              <div className="text-red-500 p-4 border rounded">
                Error loading order book: {orderBookError}
              </div>
            ) : orderBook ? (
              <div className="border rounded p-4">
                <div className="grid grid-cols-2 gap-4">
                  {/* Bids */}
                  <div>
                    <h3 className="text-lg font-medium mb-2 text-green-600">Bids</h3>
                    <div className="overflow-y-auto max-h-[300px]">
                      <table className="min-w-full">
                        <thead>
                          <tr className="border-b">
                            <th className="py-2 px-4 text-left">Price</th>
                            <th className="py-2 px-4 text-right">Size</th>
                          </tr>
                        </thead>
                        <tbody>
                          {orderBook.bids
                            ?.sort((a, b) => b.price - a.price)
                            .slice(0, 10)
                            .map((bid, index) => (
                              <tr key={index} className="border-b hover:bg-gray-50">
                                <td className="py-2 px-4 text-green-600">{(bid.price * 100).toFixed(2)}%</td>
                                <td className="py-2 px-4 text-right">{bid.size}</td>
                              </tr>
                            ))}
                          {(!orderBook.bids || orderBook.bids.length === 0) && (
                            <tr>
                              <td colSpan="2" className="py-4 text-center text-gray-500">No bids available</td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                  
                  {/* Asks */}
                  <div>
                    <h3 className="text-lg font-medium mb-2 text-red-600">Asks</h3>
                    <div className="overflow-y-auto max-h-[300px]">
                      <table className="min-w-full">
                        <thead>
                          <tr className="border-b">
                            <th className="py-2 px-4 text-left">Price</th>
                            <th className="py-2 px-4 text-right">Size</th>
                          </tr>
                        </thead>
                        <tbody>
                          {orderBook.asks
                            ?.sort((a, b) => a.price - b.price)
                            .slice(0, 10)
                            .map((ask, index) => (
                              <tr key={index} className="border-b hover:bg-gray-50">
                                <td className="py-2 px-4 text-red-600">{(ask.price * 100).toFixed(2)}%</td>
                                <td className="py-2 px-4 text-right">{ask.size}</td>
                              </tr>
                            ))}
                          {(!orderBook.asks || orderBook.asks.length === 0) && (
                            <tr>
                              <td colSpan="2" className="py-4 text-center text-gray-500">No asks available</td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
                <div className="text-xs text-gray-500 mt-4">
                  Last updated: {orderBook.timestamp ? new Date(orderBook.timestamp).toLocaleString() : 'Unknown'} (Updates every 10 seconds)
                </div>
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                <div className="text-4xl mb-2">📊</div>
                <p>No order book data available</p>
              </div>
            )}
          </div>

         
        

          {/* Opportunity Metadata */}
          <div className="rounded-lg shadow-sm border border-gray-200 p-6">
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