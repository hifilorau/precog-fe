'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import PriceHistoryCard from '../../markets/components/PriceHistoryCard';
import OrderBook from '@/app/components/OrderBook';
import OpportunityDetails from '../components/OpportunityDetails';
import { formatPrice, formatVolume } from '@/app/utils/formatters';
import PlaceBetForm from '@/components/trading/PlaceBetForm';

const OpportunityDetailPage = () => {
  const params = useParams();
  const { opportunityId } = params;
  
  const [opportunity, setOpportunity] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [priceHistory, setPriceHistory] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

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

  // Memoize fetchPriceHistory to prevent infinite re-renders
  const fetchPriceHistory = useCallback(async (marketId) => {
    if (!marketId) {
      console.log('No market ID provided to fetchPriceHistory');
      return;
    }
    
    console.log(`Starting to fetch price history for market ${marketId}`);
    setLoadingHistory(true);
    
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout
    
    try {
      // Get data for the last 30 days by default
      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - 30);
      
      const url = `${process.env.NEXT_PUBLIC_API_URL}/markets/${marketId}/price-history?` +
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
      } else {
        console.error('Error in fetchPriceHistory:', err);
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
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/opportunities/${opportunityId}`, {
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
        }
      }
    };
    
    fetchData();
    
    return () => {
      console.log('Cleanup: Price history effect');
      controller.abort();
    };
  }, [opportunity?.market_id, opportunity?.market?.id, fetchPriceHistory]);

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

                <div className="mb-6">
                  <OpportunityDetails 
                    opportunity={opportunity}
                    getPreviousPrice={getPreviousPrice}
                    getDirectionIcon={getDirectionIcon}
                  />
                </div>
                
                <div className="mb-6">
                  <h3 className="text-lg font-semibold mb-4">Order Book</h3>
                  <div className="border border-gray-200 rounded-lg p-4 bg-white">
                    <OrderBook 
                      clobId={opportunity?.outcome?.clob_id}
                      market={opportunity?.market}
                      outcome={opportunity?.outcome}
                    />
                  </div>
                </div>

                {/* Right side - Price Chart */}
                 {/* Order Book */}
               
                </div>
                {/* Price History */}
                 <div className="mt-8">
                    <h2 className="text-xl font-semibold mb-4">Price History</h2>
                    <PriceHistoryCard
                      priceHistory={priceHistory}
                      priceHistoryLoading={loadingHistory}
                      handleIntervalChange={() => {}} // Add appropriate handler if needed
                      market={opportunity?.market}
                      showOnlyHighlighted={true}
                      highlightedOutcomeId={opportunity?.outcome?.name} // Use name instead of ID
                    />
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
                  {opportunity.outcome ? formatPrice(opportunity.outcome.current_price) : formatPrice(opportunity.market_probability)}
                </div>
                <div className="text-sm text-blue-700 font-medium">Current Price</div>
                <div className="text-xs text-blue-600 mt-1">
                  {opportunity.outcome ? 'Outcome' : 'Market'}
                </div>
              </div>
              <div className="text-center p-4 border border-gray-200">
                <div className="text-2xl font-bold text-gray-900">
                  {formatPrice(opportunity.magnitude)}
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
                  {formatPrice(opportunity.divergence)}
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
                    Current Price: {formatPrice(opportunity.outcome.current_price)}
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
                          {formatPrice(outcome.current_price)}
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