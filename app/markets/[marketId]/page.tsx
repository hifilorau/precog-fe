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

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleString();
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

  return (
    <div className="container mx-auto px-4 py-8">
      <Link href="/markets" className="text-blue-500 hover:underline mb-4 block">
        ← Back to Markets
      </Link>
      
      <div className="bg-white shadow-lg rounded-lg p-6 mb-8">
        <div className="flex flex-col space-y-4 mb-4">
          <div className="flex justify-between items-start">
            <div className="flex flex-wrap gap-2 items-center">
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
            <span className="text-sm text-gray-500">{market.provider}</span>
          </div>
          
          {/* Display tags if available */}
          {market.tags && market.tags.length > 0 && (
            <div className="flex flex-wrap gap-2 pt-2 border-t border-gray-100">
              {market.tags.map(tag => (
                <span 
                  key={tag.id}
                  className={`px-3 py-1 text-xs font-medium rounded-full ${
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
          )}
        </div>
        
        <h1 className="text-3xl font-bold mb-4">{market.name}</h1>
        
        <div className="text-lg text-gray-700 mb-4">{market.question}</div>
        
        <div className="mb-6">
          <IngestNewsButton marketId={marketId} onSuccess={refreshNews} />
        </div>
        
        {market.description && (
          <div className="mb-6">
            <h2 className="text-xl font-semibold mb-2">Description</h2>
            <div className="text-gray-700">{market.description}</div>
          </div>
        )}
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div>
            <h3 className="text-sm font-medium text-gray-500">Created</h3>
            <p>{formatDate(market.created_at)}</p>
          </div>
          <div>
            <h3 className="text-sm font-medium text-gray-500">Closes</h3>
            <p>{formatDate(market.closes_at)}</p>
          </div>
          <div>
            <h3 className="text-sm font-medium text-gray-500">Resolved</h3>
            <p>{formatDate(market.resolved_at)}</p>
          </div>
        </div>
        
        {market.url && (
          <div className="mb-6">
            <a 
              href={market.url} 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-blue-500 hover:underline flex items-center"
            >
              View on {market.provider} 
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 ml-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
              </svg>
            </a>
          </div>
        )}
      </div>
      
      {/* Outcomes Section */}
      {market.outcomes && market.outcomes.length > 0 && (
        <div className="bg-white shadow-lg rounded-lg p-6 mb-8">
          <h2 className="text-2xl font-semibold mb-4">Outcomes</h2>
          
          <div className="space-y-4">
            {market.outcomes.map((outcome) => (
              <div key={outcome.id} className="border rounded p-4">
                <div className="flex justify-between items-center mb-2">
                  <h3 className="text-xl font-medium">{outcome.name}</h3>
                  <span className="text-2xl font-bold">{Math.round(outcome.probability * 100)}%</span>
                </div>
                
                {/* Progress bar */}
                <div className="w-full bg-gray-200 rounded-full h-2.5">
                  <div 
                    className="bg-blue-600 h-2.5 rounded-full" 
                    style={{ width: `${Math.round(outcome.probability * 100)}%` }}
                  ></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
      
      {/* Price History Section */}
      {priceHistory && Object.keys(priceHistory.outcomes).length > 0 && (
        <div className="bg-white shadow-lg rounded-lg p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-semibold">Price History</h2>
            
            <div className="flex space-x-2">
              <button
                onClick={() => handleIntervalChange('raw')}
                className="px-3 py-1 text-sm rounded bg-blue-500 text-white"
              >
                All Data
              </button>
              <div className="px-3 py-1 text-xs text-gray-500 flex items-center">
                <span className="italic">Note: Aggregated views (hour/day/week) temporarily unavailable</span>
              </div>
            </div>
          </div>
          
          <div className="mb-4 text-sm text-gray-600">
            {Object.values(priceHistory.outcomes).some(outcome => outcome.prices.length <= 5) && (
              <p>
                <strong>Note:</strong> Limited price history data available. 
                Each outcome has {Object.values(priceHistory.outcomes)[0]?.prices.length || 0} price points.
              </p>
            )}
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Outcome</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Latest Price</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Change (First→Last)</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Volume</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {Object.entries(priceHistory.outcomes).map(([outcomeId, data]) => {
                  const prices = data.prices;
                  const latestPrice = prices.length > 0 ? prices[prices.length - 1] : null;
                  const firstPrice = prices.length > 0 ? prices[0] : null;
                  
                  // Calculate price change between first and latest price
                  let priceChange = 0;
                  if (latestPrice && firstPrice && 'price' in latestPrice && 'price' in firstPrice) {
                    priceChange = latestPrice.price - firstPrice.price;
                  }
                  
                  return (
                    <tr key={outcomeId}>
                      <td className="px-6 py-4 whitespace-nowrap">{data.name}</td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {latestPrice && 'price' in latestPrice 
                          ? `${Math.round(latestPrice.price * 100)}%` 
                          : 'N/A'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {prices.length <= 1 ? (
                          <span className="text-gray-500">Not enough data</span>
                        ) : priceChange === 0 ? (
                          <span className="text-gray-500">Stable (no change)</span>
                        ) : (
                          <span className={`${priceChange > 0 ? 'text-green-600' : 'text-red-600'}`}>
                            {priceChange > 0 ? '+' : ''}{Math.round(priceChange * 100)}%
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {latestPrice && 'volume' in latestPrice && latestPrice.volume
                          ? latestPrice.volume.toLocaleString()
                          : 'Unknown'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          
          <div className="mt-4 text-sm text-gray-500">
            Note: In the future, this section will include interactive charts for visualizing price trends.
          </div>
          
          {/* News Section */}
          <div className="mt-8">
            <NewsSection articles={newsArticles} isLoading={newsLoading} />
          </div>
        </div>
      )}
    </div>
  );
}
