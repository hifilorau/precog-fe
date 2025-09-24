'use client';

import { useState, useEffect, useCallback, useMemo, memo } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { TrendingUp, TrendingDown, Eye, ExternalLink, BookOpen, BarChart3, Loader2 } from 'lucide-react';
import PriceHistoryCard from '../../markets/components/PriceHistoryCard';
import OrderBook from '@/app/components/OrderBook';
import OpportunityDetails from '../components/OpportunityDetails';
import { formatPrice, formatVolume, formatYesNoPrice } from '@/app/utils/formatters';
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
import { useRealTimePrices } from '@/hooks/useRealTimePrices';

// Memoized outcome card component to prevent unnecessary re-renders
const OutcomeCard = memo(({
  outcome,
  outcomeIndex,
  isOpportunity,
  livePrice,
  hasClobId,
  onBuyClick,
  onShowOrderBook,
  researchResult
}) => {
  const yesPrice = formatYesNoPrice(livePrice, 'yes');
  const noPrice = formatYesNoPrice(livePrice, 'no');

  return (
    <div
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
            <div className="flex gap-4">
              <div className="text-green-600 font-semibold">
                Yes: {yesPrice}
              </div>
              <div className="text-red-600 font-semibold">
                No: {noPrice}
              </div>
            </div>
            {outcome.current_volume && (
              <span className="text-sm text-gray-600">
                Vol: {formatVolume(outcome.current_volume)}
              </span>
            )}

            {/* Research Analysis Results */}
            {researchResult && (
              <div className="mt-3 p-3 bg-gray-50 rounded-lg border-l-4 border-blue-500">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-sm font-medium text-gray-900 flex items-center gap-1">
                    <BarChart3 className="h-4 w-4" />
                    Research Analysis
                  </h4>
                  <span className="text-xs text-gray-500">
                    Confidence: {(researchResult.confidence_level * 100).toFixed(0)}%
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <div className="text-gray-600">Market Price:</div>
                    <div className="font-semibold">
                      {(researchResult.market_probability * 100).toFixed(1)}%
                    </div>
                  </div>
                  <div>
                    <div className="text-gray-600">Calculated Prob:</div>
                    <div className="font-semibold text-blue-600">
                      {(researchResult.calculated_probability * 100).toFixed(1)}%
                    </div>
                  </div>
                  <div className="col-span-2">
                    <div className="text-gray-600">Edge:</div>
                    <div className={`font-semibold ${
                      researchResult.edge > 0 ? 'text-green-600' :
                      researchResult.edge < 0 ? 'text-red-600' : 'text-gray-600'
                    }`}>
                      {researchResult.edge > 0 ? '+' : ''}{(researchResult.edge * 100).toFixed(1)}%
                      {researchResult.edge > 0.05 && <span className="ml-1 text-xs">(Strong edge!)</span>}
                      {researchResult.edge < -0.05 && <span className="ml-1 text-xs">(Overpriced)</span>}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
        <div className="flex gap-2">
          {hasClobId && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => onShowOrderBook(outcome, outcomeIndex)}
              className="flex items-center gap-1"
            >
              <BookOpen className="h-4 w-4" />
              Order Book
            </Button>
          )}
          <div className="flex gap-1">
            <Button
              size="sm"
              onClick={() => onBuyClick(outcome, 'yes')}
              className="bg-green-600 hover:bg-green-700 text-white"
            >
              <TrendingUp className="h-4 w-4 mr-1" />
              Yes
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => onBuyClick(outcome, 'no')}
              className="border-red-600 text-red-600 hover:bg-red-50"
            >
              <TrendingDown className="h-4 w-4 mr-1" />
              No
            </Button>
          </div>
        </div>
      </div>
      {/* Progress bar */}
      <div className="w-full bg-gray-200 h-2 rounded-full mt-3">
        <div
          className={`h-2 rounded-full transition-all duration-300 ${
            isOpportunity ? 'bg-blue-500' : 'bg-gray-400'
          }`}
          style={{ width: `${Math.round(livePrice * 100)}%` }}
        ></div>
      </div>
    </div>
  );
});

OutcomeCard.displayName = 'OutcomeCard';

const OpportunityDetailPage = () => {
  const params = useParams();
  const { opportunityId } = params;
  
  const [opportunity, setOpportunity] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [priceHistory, setPriceHistory] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [selectedOutcome, setSelectedOutcome] = useState(null);
  const [selectedSide, setSelectedSide] = useState('yes');
  const [showBetModal, setShowBetModal] = useState(false);
  const [newsArticles, setNewsArticles] = useState([]);
  const [newsLoading, setNewsLoading] = useState(true);
  const [isTracked, setIsTracked] = useState(false);
  const [trackedMarketId, setTrackedMarketId] = useState(null);
  const [isTracking, setIsTracking] = useState(false);
  const [isCheckingTrackedStatus, setIsCheckingTrackedStatus] = useState(true);
  const [showDescription, setShowDescription] = useState(true);
  const [clobTokenIds, setClobTokenIds] = useState(null);
  const [selectedOrderBookOutcome, setSelectedOrderBookOutcome] = useState(null);
  const [showOrderBookModal, setShowOrderBookModal] = useState(false);

  // Research analysis state
  const [researchData, setResearchData] = useState(null);
  const [researchLoading, setResearchLoading] = useState(false);
  const [researchError, setResearchError] = useState(null);
  const [showResearchResults, setShowResearchResults] = useState(false);

  // Use the market hook for additional market data
  const { market: marketFromHook } = useMarket(opportunity?.market_id);

  // Get the best market data (prefer the hook data if available)
  const market = marketFromHook || opportunity?.market;
  const marketId = opportunity?.market_id || opportunity?.market?.id;

  // Set up real-time pricing for all outcomes in this market
  const marketOutcomes = useMemo(() => market?.outcomes || [], [market?.outcomes]);

  // Memoize the pricing items to prevent unnecessary re-renders
  const pricingItems = useMemo(() =>
    marketOutcomes.map(outcome => ({
      outcome: outcome,
      market: market
    })), [marketOutcomes, market]
  );

  const { currentPrices } = useRealTimePrices(
    pricingItems,
    `market-${marketId}`,
    'opportunity',
    { pollMs: 30000, immediate: true } // Reduced polling frequency to 30 seconds
  );

  // Memoized helper function to get live price with fallback to database
  const getLivePrice = useCallback((outcome) => {
    if (!outcome) return 0.5;

    // Prefer real-time price if available
    const livePrice = currentPrices.get(outcome.id);
    if (livePrice !== undefined && livePrice !== null) {
      return livePrice;
    }

    // Fallback to database values
    return outcome.current_price || outcome.probability || 0.5;
  }, [currentPrices]);

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

    let isCancelled = false;

    const fetchNews = async () => {
      setNewsLoading(true);
      try {
        const cacheEntry = getCache('news', marketId);
        if (cacheEntry && !isCancelled) {
          setNewsArticles(cacheEntry.data);
          setNewsLoading(false);
          return;
        }
        const newsData = await getMarketNews(marketId);
        if (!isCancelled) {
          setCache('news', marketId, newsData, 10 * 60 * 1000);
          setNewsArticles(newsData);
        }
      } catch (err) {
        if (!isCancelled) {
          console.error('Failed to fetch news:', err);
        }
      } finally {
        if (!isCancelled) {
          setNewsLoading(false);
        }
      }
    };

    fetchNews();

    return () => {
      isCancelled = true;
    };
  }, [opportunity?.market_id, opportunity?.market?.id]);

  // Check tracked status
  useEffect(() => {
    const marketId = opportunity?.market_id || opportunity?.market?.id;
    if (!marketId) return;

    let isCancelled = false;

    const checkTrackedStatus = async () => {
      setIsCheckingTrackedStatus(true);
      try {
        const trackedMarkets = await marketApi.getTrackedMarkets();
        if (!isCancelled) {
          const trackedMarket = trackedMarkets.find(tm => tm.market_id === marketId);
          setIsTracked(!!trackedMarket);
          setTrackedMarketId(trackedMarket?.id || null);
        }
      } catch (err) {
        if (!isCancelled) {
          console.error('Failed to check tracked status:', err);
        }
      } finally {
        if (!isCancelled) {
          setIsCheckingTrackedStatus(false);
        }
      }
    };

    checkTrackedStatus();

    return () => {
      isCancelled = true;
    };
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

    let isCancelled = false;

    const fetchClobTokenIds = async () => {
      try {
        const tokenIds = await getMarketClobTokenIds(externalId);
        if (!isCancelled) {
          setClobTokenIds(tokenIds);
        }
      } catch (error) {
        if (!isCancelled) {
          console.error('Failed to fetch CLOB token IDs:', error);
        }
      }
    };

    fetchClobTokenIds();

    return () => {
      isCancelled = true;
    };
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

  const toggleDescription = () => setShowDescription(!showDescription);
  const formatDate = (dateString) => dateString ? new Date(dateString).toLocaleString() : 'N/A';

  const refreshNews = useCallback(() => {
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
  }, [opportunity?.market_id, opportunity?.market?.id]);

  const handleBuyClick = useCallback((outcome, side = 'yes') => {
    setSelectedOutcome(outcome);
    setSelectedSide(side);
    setShowBetModal(true);
  }, []);

  const handleBetSuccess = useCallback((position) => {
    console.log('Position created:', position);
    setShowBetModal(false);
    setSelectedOutcome(null);
    refreshNews();
  }, [refreshNews]);

  const handleBetCancel = useCallback(() => {
    setShowBetModal(false);
    setSelectedOutcome(null);
  }, []);

  const handleShowOrderBook = useCallback((outcome, outcomeIndex) => {
    setSelectedOrderBookOutcome({ outcome, outcomeIndex });
    setShowOrderBookModal(true);
  }, []);

  const handleOrderBookClose = useCallback(() => {
    setShowOrderBookModal(false);
    setSelectedOrderBookOutcome(null);
  }, []);

  // Research analysis function
  const analyzeMarketProbabilities = useCallback(async () => {
    if (!market || !market.outcomes || !market.closes_at) {
      console.error('Missing market data for research analysis');
      return;
    }

    // Check if this is a crypto market (BTC, ETH, SOL)
    const marketQuestion = market.question?.toLowerCase() || '';
    let cryptoAsset = null;

    if (marketQuestion.includes('bitcoin') || marketQuestion.includes('btc')) {
      cryptoAsset = 'BTC';
    } else if (marketQuestion.includes('ethereum') || marketQuestion.includes('eth')) {
      cryptoAsset = 'ETH';
    } else if (marketQuestion.includes('solana') || marketQuestion.includes('sol')) {
      cryptoAsset = 'SOL';
    }

    if (!cryptoAsset) {
      setResearchError('This market is not supported for crypto probability analysis. Currently supported: BTC, ETH, SOL markets.');
      return;
    }

    setResearchLoading(true);
    setResearchError(null);

    try {
      // Extract price targets from market outcomes
      const outcomes = market.outcomes.map(outcome => {
        const outcomeName = outcome.name;

        // Try to extract price target from outcome name
        // Look for patterns like "$70000", "$70k", "70000", etc.
        const priceMatch = outcomeName.match(/\$?(\d+(?:,\d{3})*(?:\.\d+)?)[kK]?/);
        let targetPrice = null;

        if (priceMatch) {
          let price = parseFloat(priceMatch[1].replace(/,/g, ''));
          // Handle 'k' suffix (e.g., "70k" = 70000)
          if (priceMatch[0].toLowerCase().includes('k')) {
            price *= 1000;
          }
          targetPrice = price;
        }

        // Determine direction based on outcome name
        let direction = 'above';
        if (outcomeName.toLowerCase().includes('below') ||
            outcomeName.toLowerCase().includes('under') ||
            outcomeName.toLowerCase().includes('less')) {
          direction = 'below';
        } else if (outcomeName.toLowerCase().includes('between')) {
          direction = 'between';
        }

        console.log(`Outcome: "${outcomeName}" -> Price: $${targetPrice} Direction: ${direction}`);

        return {
          name: outcomeName,
          target_price: targetPrice,
          direction: direction
        };
      }).filter(outcome => outcome.target_price !== null);

      if (outcomes.length === 0) {
        setResearchError('Could not extract price targets from market outcomes. Make sure outcomes contain price information like "$70k" or "$65000".');
        return;
      }

      console.log('Analyzing crypto probabilities for:', {
        asset: cryptoAsset,
        outcomes,
        expires_at: market.closes_at,
        market_question: market.question
      });

      console.log('Extracted outcomes:', outcomes.map(o => ({
        name: o.name,
        target_price: o.target_price,
        direction: o.direction
      })));

      // Call the research API
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/research/crypto-analysis`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          asset: cryptoAsset,
          outcomes,
          expires_at: market.closes_at
        })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.detail || `HTTP error! status: ${response.status}`);
      }

      const analysisData = await response.json();

      // Add market probabilities from current prices
      const enrichedResults = analysisData.results.map(result => {
        const outcome = market.outcomes.find(o => o.name === result.outcome_name);
        if (outcome) {
          const livePrice = getLivePrice(outcome);
          const marketProbability = livePrice;
          const edge = result.calculated_probability - marketProbability;

          return {
            ...result,
            market_probability: marketProbability,
            edge: edge
          };
        }
        return result;
      });

      setResearchData({
        ...analysisData,
        results: enrichedResults
      });
      setShowResearchResults(true);

    } catch (error) {
      console.error('Error analyzing market probabilities:', error);
      setResearchError(error.message || 'Failed to analyze market probabilities');
    } finally {
      setResearchLoading(false);
    }
  }, [market, getLivePrice]);

  // Get CLOB token ID for the selected outcome
  const getSelectedClobTokenId = useCallback(() => {
    if (!clobTokenIds || !selectedOrderBookOutcome) return null;
    return clobTokenIds[selectedOrderBookOutcome.outcomeIndex];
  }, [clobTokenIds, selectedOrderBookOutcome]);


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
              onClick={analyzeMarketProbabilities}
              disabled={researchLoading}
              className="flex items-center gap-2"
            >
              {researchLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <BarChart3 className="h-4 w-4" />
              )}
              {researchLoading ? 'Analyzing...' : 'Analyze Probabilities'}
            </Button>
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

      {/* Research Error Display */}
      {researchError && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-6">
          <div className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4" />
            Research Analysis Error: {researchError}
          </div>
        </div>
      )}

      {/* Research Results Summary */}
      {researchData && showResearchResults && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-blue-900 flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              Crypto Research Analysis - {researchData.asset}
            </h2>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowResearchResults(false)}
              className="text-blue-600 hover:text-blue-800"
            >
              ✕ Hide
            </Button>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4 text-sm">
            <div>
              <div className="text-blue-700 font-medium">Current Price</div>
              <div className="text-lg font-bold">${researchData.current_price.toLocaleString()}</div>
            </div>
            <div>
              <div className="text-blue-700 font-medium">Time Remaining</div>
              <div className="text-lg font-bold">{researchData.time_remaining_hours.toFixed(1)}h</div>
            </div>
            <div>
              <div className="text-blue-700 font-medium">24h Change</div>
              <div className={`text-lg font-bold ${
                researchData.recent_momentum.change_24h >= 0 ? 'text-green-600' : 'text-red-600'
              }`}>
                {researchData.recent_momentum.change_24h >= 0 ? '+' : ''}
                {(researchData.recent_momentum.change_24h * 100).toFixed(1)}%
              </div>
            </div>
            <div>
              <div className="text-blue-700 font-medium">Volatility</div>
              <div className="text-lg font-bold capitalize">{researchData.recent_momentum.volatility_regime}</div>
            </div>
          </div>
          <div className="text-xs text-blue-600">
            Analysis based on {researchData.simulation_count.toLocaleString()} Monte Carlo simulations
          </div>
        </div>
      )}

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
                    Yes: {formatYesNoPrice(getLivePrice(opportunity.outcome), 'yes')} •
                    No: {formatYesNoPrice(getLivePrice(opportunity.outcome), 'no')} •
                    Movement: {getDirectionIcon(opportunity.direction)} {formatPrice(opportunity.magnitude)} •
                    Score: {(opportunity.opportunity_score * 100).toFixed(1)}%
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button
                    onClick={() => handleBuyClick(opportunity.outcome, 'yes')}
                    className="bg-green-600 hover:bg-green-700 text-white"
                  >
                    <TrendingUp className="h-4 w-4 mr-1" />
                    Yes {formatYesNoPrice(getLivePrice(opportunity.outcome), 'yes')}
                  </Button>
                  <Button
                    onClick={() => handleBuyClick(opportunity.outcome, 'no')}
                    variant="outline"
                    className="border-red-600 text-red-600 hover:bg-red-50"
                  >
                    <TrendingDown className="h-4 w-4 mr-1" />
                    No {formatYesNoPrice(getLivePrice(opportunity.outcome), 'no')}
                  </Button>
                </div>
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
                {market.outcomes.map((outcome, outcomeIndex) => {
                  const isOpportunity = outcome.id === opportunity.outcome_id;
                  const hasClobId = clobTokenIds && outcomeIndex < clobTokenIds.length;
                  const livePrice = getLivePrice(outcome);

                  // Find matching research result for this outcome
                  const researchResult = researchData?.results?.find(
                    result => result.outcome_name === outcome.name
                  );

                  return (
                    <OutcomeCard
                      key={outcome.id}
                      outcome={outcome}
                      outcomeIndex={outcomeIndex}
                      isOpportunity={isOpportunity}
                      livePrice={livePrice}
                      hasClobId={hasClobId}
                      onBuyClick={handleBuyClick}
                      onShowOrderBook={handleShowOrderBook}
                      researchResult={researchResult}
                    />
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
              handleIntervalChange={() => {}}
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
                side={selectedSide}
                onSuccess={handleBetSuccess}
                onCancel={handleBetCancel}
                showCard={false}
              />
            </div>
          </div>
        </div>
      )}

      {/* Order Book Modal */}
      {showOrderBookModal && selectedOrderBookOutcome && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-semibold">
                  Order Book: {selectedOrderBookOutcome.outcome.name}
                </h2>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleOrderBookClose}
                >
                  Close
                </Button>
              </div>
              <div className="mb-4 p-3 bg-gray-50 rounded">
                <p className="text-sm text-gray-600">
                  Current Price: <span className="font-semibold">{formatPrice(getLivePrice(selectedOrderBookOutcome.outcome))}</span>
                  {selectedOrderBookOutcome.outcome.current_volume && (
                    <span className="ml-4">
                      Volume: <span className="font-semibold">{formatVolume(selectedOrderBookOutcome.outcome.current_volume)}</span>
                    </span>
                  )}
                </p>
              </div>
              <OrderBook
                clobId={getSelectedClobTokenId()}
                market={market}
                outcome={selectedOrderBookOutcome.outcome}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default OpportunityDetailPage;