'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { TrendingUp, Eye, ExternalLink } from 'lucide-react';
import PriceHistoryCard from '../../markets/components/PriceHistoryCard';
import OrderBook from '@/app/components/OrderBook';
import OpportunityDetails from '../components/OpportunityDetails';
import { formatPrice, formatVolume } from '@/app/utils/formatters';
import PlaceBetForm from '@/components/trading/PlaceBetForm';
import MarketVolatility from '@/app/components/MarketVolatility';
import NewsSection from '../../markets/components/NewsSection';
import MarketHeader from '../../markets/components/MarketHeader';
import MarketInfoCard from '../../markets/components/MarketInfoCard';
import MetricsCard from '../../markets/components/MetricsCard';
import { useMarket } from '@/lib/hooks/useMarket';
import { getMarketNews } from '@/lib/services/newsService';
import { getCache, setCache } from '@/lib/services/cache';
import { marketApi } from '@/lib/services/api';
import { getMarketClobTokenIds } from '@/lib/services/polymarketApi';

const OpportunityDetailPage = () => {
  const params = useParams();
  const { opportunityId } = params;
  
  const [opportunity, setOpportunity] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [priceHistory, setPriceHistory] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [selectedOutcome, setSelectedOutcome] = useState(null);
  const [showBetModal, setShowBetModal] = useState(false);
  const [newsArticles, setNewsArticles] = useState([]);
  const [newsLoading, setNewsLoading] = useState(true);
  const [isTracked, setIsTracked] = useState(false);
  const [trackedMarketId, setTrackedMarketId] = useState(null);
  const [isTracking, setIsTracking] = useState(false);
  const [isCheckingTrackedStatus, setIsCheckingTrackedStatus] = useState(true);
  const [showDescription, setShowDescription] = useState(true);
  const [clobTokenIds, setClobTokenIds] = useState(null); // eslint-disable-line @typescript-eslint/no-unused-vars

  // Use the market hook for additional market data
  const { market: marketFromHook } = useMarket(opportunity?.market_id);

  // Get the best market data (prefer the hook data if available)
  const market = marketFromHook || opportunity?.market;
  const marketId = opportunity?.market_id || opportunity?.market?.id;

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

  // Fetch news for the market
  useEffect(() => {
    const marketId = opportunity?.market_id || opportunity?.market?.id;
    if (!marketId) return;

    const fetchNews = async () => {
      setNewsLoading(true);
      try {
        const cacheEntry = getCache('news', marketId);
        if (cacheEntry) {
          setNewsArticles(cacheEntry.data);
          setNewsLoading(false);
          return;
        }
        const newsData = await getMarketNews(marketId);
        setCache('news', marketId, newsData, 10 * 60 * 1000);
        setNewsArticles(newsData);
      } catch (err) {
        console.error('Failed to fetch news:', err);
      } finally {
        setNewsLoading(false);
      }
    };
    fetchNews();
  }, [opportunity?.market_id, opportunity?.market?.id]);

  // Check tracked status
  useEffect(() => {
    const marketId = opportunity?.market_id || opportunity?.market?.id;
    if (!marketId) return;

    const checkTrackedStatus = async () => {
      setIsCheckingTrackedStatus(true);
      try {
        const trackedMarkets = await marketApi.getTrackedMarkets();
        const trackedMarket = trackedMarkets.find(tm => tm.market_id === marketId);
        setIsTracked(!!trackedMarket);
        setTrackedMarketId(trackedMarket?.id || null);
      } catch (err) {
        console.error('Failed to check tracked status:', err);
      } finally {
        setIsCheckingTrackedStatus(false);
      }
    };
    checkTrackedStatus();
  }, [opportunity?.market_id, opportunity?.market?.id]);

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

  // Fetch CLOB token IDs for order book functionality
  useEffect(() => {
    const externalId = market?.external_id;
    if (!externalId) return;

    const fetchClobTokenIds = async () => {
      try {
        const tokenIds = await getMarketClobTokenIds(externalId);
        setClobTokenIds(tokenIds);
      } catch (error) {
        console.error('Failed to fetch CLOB token IDs:', error);
      }
    };

    fetchClobTokenIds();
  }, [market?.external_id]);

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

  const handleTrackToggle = async () => {
    const marketId = opportunity?.market_id || opportunity?.market?.id;
    if (!marketId) return;
    setIsTracking(true);
    try {
      if (isTracked && trackedMarketId) {
        await marketApi.untrackMarket(trackedMarketId);
        setIsTracked(false);
        setTrackedMarketId(null);
      } else {
        const newTrackedMarket = await marketApi.trackMarket({ market_id: marketId });
        setIsTracked(true);
        setTrackedMarketId(newTrackedMarket.id);
      }
    } catch (err) {
      console.error('Failed to update tracked status:', err);
    } finally {
      setIsTracking(false);
    }
  };

  const handleIntervalChange = (newInterval) => setInterval(newInterval);
  const toggleDescription = () => setShowDescription(!showDescription);
  const formatDate = (dateString) => dateString ? new Date(dateString).toLocaleString() : 'N/A';

  const refreshNews = () => {
    const marketId = opportunity?.market_id || opportunity?.market?.id;
    if (!marketId) return;
    const fetchNews = async () => {
      setNewsLoading(true);
      try {
        const newsData = await getMarketNews(marketId);
        setNewsArticles(newsData);
      } catch (err) {
        console.error('Failed to refresh news:', err);
      } finally {
        setNewsLoading(false);
      }
    };
    fetchNews();
  };

  const handleBuyClick = (outcome) => {
    setSelectedOutcome(outcome);
    setShowBetModal(true);
  };

  const handleBetSuccess = (position) => {
    console.log('Position created:', position);
    setShowBetModal(false);
    setSelectedOutcome(null);
    refreshNews();
  };

  const handleBetCancel = () => {
    setShowBetModal(false);
    setSelectedOutcome(null);
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
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="mb-6">
        <Link href="/opportunities" className="text-blue-600 hover:text-blue-800 mb-4 inline-block">
          ← Back to Opportunities
        </Link>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Market Opportunity</h1>
            <p className="text-gray-600 mt-1">Trade this opportunity with full market access</p>
          </div>
          <div className="flex items-center gap-3">
            {getStatusBadge(opportunity.status)}
            <Button
              variant="outline"
              size="sm"
              onClick={() => window.open(`/markets/${marketId}`, '_blank')}
              className="flex items-center gap-2"
            >
              <ExternalLink className="h-4 w-4" />
              View Market
            </Button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Market Header */}
          {market && (
            <MarketHeader
              market={market}
              marketId={marketId}
              isTracked={isTracked}
              isTracking={isTracking}
              isCheckingTrackedStatus={isCheckingTrackedStatus}
              handleTrackToggle={handleTrackToggle}
              onSuccess={refreshNews}
            />
          )}

          {/* Opportunity Highlight Banner */}
          {opportunity.outcome && (
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border-l-4 border-blue-500 p-6 rounded-lg">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="text-lg font-semibold text-blue-900 flex items-center gap-2">
                    <Eye className="h-5 w-5" />
                    Flagged Opportunity: {opportunity.outcome.name}
                  </h3>
                  <p className="text-blue-700 mt-1">
                    Current Price: {formatPrice(opportunity.outcome.current_price)} •
                    Movement: {getDirectionIcon(opportunity.direction)} {formatPrice(opportunity.magnitude)} •
                    Score: {(opportunity.opportunity_score * 100).toFixed(1)}%
                  </p>
                </div>
                <Button
                  onClick={() => handleBuyClick(opportunity.outcome)}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  <TrendingUp className="h-4 w-4 mr-2" />
                  Trade This Opportunity
                </Button>
              </div>
            </div>
          )}

          {/* Market Info */}
          {market && (
            <MarketInfoCard
              market={market}
              showDescription={showDescription}
              toggleDescription={toggleDescription}
              formatDate={formatDate}
            />
          )}

          {/* All Outcomes - Enhanced */}
          {market?.outcomes && market.outcomes.length > 0 && (
            <div className="card p-6">
              <h2 className="text-xl font-semibold mb-4">All Market Outcomes</h2>
              <p className="text-gray-600 mb-4">Click to trade any outcome in this market</p>
              <div className="space-y-3">
                {market.outcomes.map((outcome) => {
                  const isOpportunity = outcome.id === opportunity.outcome_id;
                  return (
                    <div
                      key={outcome.id}
                      className={`border p-4 rounded-lg transition-all hover:shadow-md ${
                        isOpportunity
                          ? 'border-blue-500 bg-blue-50 shadow-sm'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <div className="flex justify-between items-center">
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <h3 className="font-medium text-gray-900">{outcome.name}</h3>
                            {isOpportunity && (
                              <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs font-medium rounded-full">
                                Opportunity
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-4 mt-1">
                            <span className="text-lg font-semibold">
                              {formatPrice(outcome.current_price)}
                            </span>
                            {outcome.current_volume && (
                              <span className="text-sm text-gray-600">
                                Vol: {formatVolume(outcome.current_volume)}
                              </span>
                            )}
                          </div>
                        </div>
                        <Button
                          size="sm"
                          onClick={() => handleBuyClick(outcome)}
                          className={isOpportunity ? 'bg-blue-600 hover:bg-blue-700' : ''}
                        >
                          <TrendingUp className="h-4 w-4 mr-1" />
                          Trade
                        </Button>
                      </div>
                      {/* Progress bar */}
                      <div className="w-full bg-gray-200 h-2 rounded-full mt-3">
                        <div
                          className={`h-2 rounded-full transition-all duration-300 ${
                            isOpportunity ? 'bg-blue-500' : 'bg-gray-400'
                          }`}
                          style={{ width: `${Math.round((outcome.current_price || 0) * 100)}%` }}
                        ></div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Opportunity Analysis Details */}
          {opportunity && (
            <OpportunityDetails
              opportunity={opportunity}
              getPreviousPrice={getPreviousPrice}
              getDirectionIcon={getDirectionIcon}
            />
          )}

          {/* Market Metrics */}
          {market && <MetricsCard market={market} />}

          {/* Market Volatility */}
          {market?.volatility && (
            <div>
              <MarketVolatility volatility={market.volatility} compact={false} />
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
         

         
        

          {/* Latest News */}
          <div className="card p-6">
            <h2 className="text-xl font-semibold mb-4">Latest News</h2>
            <NewsSection articles={newsArticles} isLoading={newsLoading} compact={true} />
          </div>

          {/* Price History */}
          <div className="card p-6">
            <h2 className="text-xl font-semibold mb-4">Price History</h2>
            <PriceHistoryCard
              priceHistory={priceHistory}
              priceHistoryLoading={loadingHistory}
              handleIntervalChange={handleIntervalChange}
              market={market}
              showOnlyHighlighted={opportunity?.outcome ? true : false}
              highlightedOutcomeId={opportunity?.outcome?.name}
            />
          </div>

          {/* Order Book */}
          {opportunity?.outcome && (
            <div className="card p-6">
              <h3 className="text-lg font-semibold mb-4">Order Book</h3>
              <OrderBook
                clobId={opportunity.outcome.clob_id}
                market={market}
                outcome={opportunity.outcome}
              />
            </div>
          )}

          {/* Opportunity Metadata */}
          <div className="card p-6">
            <h3 className="text-lg font-semibold mb-4">Opportunity Details</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">Source:</span>
                <span className="text-gray-900 capitalize">
                  {opportunity.source.replace('_', ' ')}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Window:</span>
                <span className="text-gray-900">{opportunity.window}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Confidence:</span>
                <span className="text-gray-900">
                  {opportunity.confidence_score ? (opportunity.confidence_score * 100).toFixed(1) + '%' : 'N/A'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Created:</span>
                <span className="text-gray-900">
                  {new Date(opportunity.created_at).toLocaleString()}
                </span>
              </div>
              {opportunity.notes && (
                <div className="pt-2 border-t">
                  <span className="text-gray-600">Notes:</span>
                  <p className="text-gray-900 mt-1">{opportunity.notes}</p>
                </div>
              )}
            </div>
          </div>

          {/* Market Link */}
          {market?.url && (
            <div className="card p-6">
              <a
                href={market.url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors text-sm font-semibold shadow"
              >
                View on Polymarket
                <ExternalLink className="h-4 w-4" />
              </a>
            </div>
          )}
        </div>
      </div>

      {/* Trading Modal */}
      {showBetModal && selectedOutcome && market && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <PlaceBetForm
                market={market}
                outcome={selectedOutcome}
                onSuccess={handleBetSuccess}
                onCancel={handleBetCancel}
                showCard={false}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default OpportunityDetailPage;