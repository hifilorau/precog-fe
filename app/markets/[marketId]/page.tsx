'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { marketApi } from '@/lib/services/api';
import { Market, PriceHistoryResponse } from '@/lib/types/markets';
import { NewsArticle } from '@/lib/types/news';
import { getMarketNews } from '@/lib/services/newsService';
import NewsSection from '../components/NewsSection';
import IngestNewsButton from '../components/IngestNewsButton';

export default function MarketDetailPage() {
  const params = useParams();
  const marketId = params.marketId as string;
  
  const [market, setMarket] = useState<Market | null>(null);
  const [priceHistory, setPriceHistory] = useState<PriceHistoryResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  // Default to raw interval since other intervals have backend SQL errors
  const [interval, setInterval] = useState<'raw' | 'hour' | 'day' | 'week'>('raw');
  const [showDescription, setShowDescription] = useState(false);
  
  // News state
  const [newsArticles, setNewsArticles] = useState<NewsArticle[]>([]);
  const [newsLoading, setNewsLoading] = useState(true);

  useEffect(() => {
    const fetchMarketData = async () => {
      try {
        setLoading(true);
        
        // Fetch market details with tags
        const marketData = await marketApi.getMarket(marketId, true, false, true);
        console.log('Market data with tags:', marketData);
        setMarket(marketData);
        
        // Fetch price history
        const priceHistoryData = await marketApi.getPriceHistory(marketId, { interval });
        console.log('Price History Data:', priceHistoryData);
        console.log('Raw Interval:', interval);
        setPriceHistory(priceHistoryData);
        
        setError(null);
      } catch (err) {
        console.error('Failed to fetch market data:', err);
        setError('Failed to load market data. Please try again later.');
      } finally {
        setLoading(false);
      }
    };
    
    const fetchNewsData = async () => {
      try {
        setNewsLoading(true);
        const newsData = await getMarketNews(marketId);
        console.log('News Data:', newsData);
        setNewsArticles(newsData);
      } catch (err) {
        console.error('Failed to fetch news data:', err);
      } finally {
        setNewsLoading(false);
      }
    };

    if (marketId) {
      fetchMarketData();
      fetchNewsData();
    }
  }, [marketId, interval]);

  const handleIntervalChange = (newInterval: 'raw' | 'hour' | 'day' | 'week') => {
    setInterval(newInterval);
  };
  
  // Function to refresh news data - will be passed to the IngestNewsButton
  const refreshNews = async () => {
    try {
      setNewsLoading(true);
      const newsData = await getMarketNews(marketId);
      setNewsArticles(newsData);
    } catch (err) {
      console.error('Failed to refresh news data:', err);
    } finally {
      setNewsLoading(false);
    }
  };

  // Format date for display
  const formatDate = (dateString: string | null | undefined) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleString();
  };

  // Handle loading state
  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8 flex justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  // Handle error state
  if (error || !market) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          {error || 'Market not found'}
        </div>
        <Link href="/markets" className="text-blue-500 hover:underline">
          ← Back to Markets
        </Link>
      </div>
    );
  }

  // At this point, TypeScript knows market is not null due to earlier checks
  if (!market) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          Market data is not available
        </div>
        <Link href="/markets" className="text-blue-500 hover:underline">
          ← Back to Markets
        </Link>
      </div>
    );
  }

  // Ensure market has the required properties
  const safeMarket = market as Required<Market>;

  // Render price history table
  const renderPriceHistory = () => {
    if (!priceHistory?.outcomes) {
      return <p className="text-gray-500">No price history available for this market.</p>;
    }

    const outcomes = Object.entries(priceHistory.outcomes);
    if (outcomes.length === 0) {
      return <p className="text-gray-500">No price history data available.</p>;
    }

    return (
      <>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Outcome</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Price</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Change</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Volume</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {outcomes.map(([outcomeId, data]) => {
                const prices = data.prices || [];
                const latestPrice = prices.length > 0 ? prices[prices.length - 1] : null;
                const firstPrice = prices.length > 0 ? prices[0] : null;
                let priceChange = 0;
                
                if (latestPrice && firstPrice && 'price' in latestPrice && 'price' in firstPrice) {
                  priceChange = latestPrice.price - firstPrice.price;
                }
                
                return (
                  <tr key={outcomeId} className="hover:bg-gray-50">
                    <td className="px-4 py-2 whitespace-nowrap">{data.name || 'N/A'}</td>
                    <td className="px-4 py-2 whitespace-nowrap font-medium">
                      {latestPrice && 'price' in latestPrice 
                        ? `${Math.round(latestPrice.price * 100)}%` 
                        : 'N/A'}
                    </td>
                    <td className="px-4 py-2 whitespace-nowrap">
                      {prices.length <= 1 ? (
                        <span className="text-gray-500 text-xs">-</span>
                      ) : priceChange === 0 ? (
                        <span className="text-gray-500">-</span>
                      ) : (
                        <span className={`${priceChange > 0 ? 'text-green-600' : 'text-red-600'} font-medium`}>
                          {priceChange > 0 ? '↑' : '↓'} {Math.abs(Math.round(priceChange * 100))}%
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-500">
                      {latestPrice && 'volume' in latestPrice && latestPrice.volume
                        ? latestPrice.volume.toLocaleString()
                        : '-'}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        
        {outcomes.some(([_, data]) => (data.prices?.length || 0) <= 5) && (
          <div className="mt-3 text-xs text-gray-500">
            Limited price history data available
          </div>
        )}
      </>
    );
  };

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8 flex justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (error || !market) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          {error || 'Market not found'}
        </div>
        <Link href="/markets" className="text-blue-500 hover:underline">
          ← Back to Markets
        </Link>
      </div>
    );
  }

  const toggleDescription = () => setShowDescription(!showDescription);

  // Main render with proper type safety
  return (
    <div className="container mx-auto px-4 py-8 max-w-7xl">
      <Link href="/markets" className="text-blue-500 hover:underline mb-6 inline-block">
        ← Back to Markets
      </Link>
      
      {error && (
        <div className="bg-red-50 border-l-4 border-red-500 text-red-700 p-4 mb-6" role="alert">
          <p>{error}</p>
        </div>
      )}
      
      {/* Top Row: Market Info + News */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Left Column: Market Info */}
        <div className="bg-white shadow-lg rounded-lg p-6">
            <div className="flex justify-between items-start mb-4">
              <div>
                <div className="flex flex-wrap gap-2 items-center mb-3">
                  <span className={`px-3 py-1 text-sm font-medium rounded-full ${
                    market.status === 'open' 
                      ? 'bg-green-100 text-green-800' 
                      : market.status === 'resolved' 
                      ? 'bg-blue-100 text-blue-800' 
                      : 'bg-gray-100 text-gray-800'
                  }`}>
                    {market.status.toUpperCase()}
                  </span>
                  {market.category && (
                    <span className="px-3 py-1 text-sm bg-gray-100 text-gray-800 rounded-full">
                      {market.category}
                    </span>
                  )}
                </div>
                
                <h1 className="text-2xl font-bold mb-2">{market.name}</h1>
                <div className="text-lg text-gray-700 mb-4">{market.question}</div>
                
                <div className="flex items-center space-x-2 mb-4">
                  <IngestNewsButton marketId={marketId} onSuccess={refreshNews} />
                  {market.url && (
                    <a 
                      href={market.url} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-sm text-blue-500 hover:underline flex items-center px-3 py-1 border border-gray-200 rounded-md"
                    >
                      View on {market.provider}
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5 ml-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                      </svg>
                    </a>
                  )}
                </div>
                
                {market.description && (
                  <div className="mb-4">
                    <button 
                      onClick={toggleDescription}
                      className="text-sm text-blue-500 hover:text-blue-700 flex items-center"
                    >
                      {showDescription ? 'Hide description' : 'Show description'}
                      <svg 
                        className={`w-4 h-4 ml-1 transition-transform ${showDescription ? 'rotate-180' : ''}`} 
                        fill="none" 
                        viewBox="0 0 24 24" 
                        stroke="currentColor"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </button>
                    {showDescription && (
                      <div className="mt-2 text-gray-700 text-sm bg-gray-50 p-3 rounded">
                        {market.description}
                      </div>
                    )}
                  </div>
                )}
                
                {/* Market Metadata */}
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm mt-4 pt-4 border-t border-gray-100">
                  <div>
                    <h3 className="text-xs font-medium text-gray-500">Created</h3>
                    <p className="text-gray-800">{formatDate(market.created_at)}</p>
                  </div>
                  <div>
                    <h3 className="text-xs font-medium text-gray-500">Closes</h3>
                    <p className="text-gray-800">{formatDate(market.closes_at)}</p>
                  </div>
                  <div>
                    <h3 className="text-xs font-medium text-gray-500">Resolved</h3>
                    <p className="text-gray-800">{formatDate(market.resolved_at)}</p>
                  </div>
                </div>
                
                {/* Tags */}
                {market.tags && market.tags.length > 0 && (
                  <div className="mt-4 pt-4 border-t border-gray-100">
                    <div className="flex flex-wrap gap-2">
                      {market.tags.map(tag => (
                        <span 
                          key={tag.id}
                          className={`px-2.5 py-1 text-xs font-medium rounded-full ${
                            tag.is_primary 
                              ? 'bg-blue-100 text-blue-800 border border-blue-200' 
                              : 'bg-gray-50 text-gray-600 border border-gray-200'
                          }`}
                          title={tag.force_show ? 'Featured tag' : ''}
                        >
                          {tag.label}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        
        {/* Right Column: News */}
        <div className="bg-white shadow-lg rounded-lg p-6">
          <h2 className="text-xl font-semibold mb-4">Latest News</h2>
          <NewsSection articles={newsArticles} isLoading={newsLoading} compact={true} />
        </div>
      </div>
      
      {/* Bottom Row: Outcomes + Price History */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left Column: Outcomes */}
        <div className="bg-white shadow-lg rounded-lg p-6">
          <h2 className="text-xl font-semibold mb-4">Outcomes</h2>
            {safeMarket.outcomes && safeMarket.outcomes.length > 0 ? (
            <div className="space-y-3">
              {safeMarket.outcomes?.map((outcome) => (
                <div key={outcome.id} className="border rounded-lg p-4 hover:bg-gray-50 transition-colors">
                  <div className="flex justify-between items-center mb-2">
                    <h3 className="font-medium">{outcome.name}</h3>
                    <span className="text-lg font-semibold">
                      {Math.round(outcome.probability * 100)}%
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className="bg-blue-600 h-2 rounded-full transition-all duration-300" 
                      style={{ width: `${Math.round(outcome.probability * 100)}%` }}
                    ></div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-500">No outcomes available for this market.</p>
          )}
        </div>
        
        {/* Right Column: Price History */}
        <div className="bg-white shadow-lg rounded-lg p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold">Price History</h2>
            <div className="flex items-center">
              <button
                onClick={() => handleIntervalChange('raw')}
                className="px-3 py-1 text-xs rounded bg-blue-500 text-white hover:bg-blue-600 transition-colors"
              >
                All Data
              </button>
              <span className="ml-2 text-xs text-gray-500 italic">
                Aggregated views coming soon
              </span>
            </div>
          </div>
          
          {renderPriceHistory()}
        </div>
      </div>
    </div>
  );
}
