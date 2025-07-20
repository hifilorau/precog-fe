'use client';

import { useEffect, useState } from 'react';
import MarketVolatility from '@/app/components/MarketVolatility';
import { useParams } from 'next/navigation';
import { marketApi } from '@/lib/services/api';
import { PriceHistoryResponse } from '@/lib/types/markets';
import { NewsArticle } from '@/lib/types/news';
import { getMarketNews } from '@/lib/services/newsService';
import { useMarket } from '@/lib/hooks/useMarket';
import { getCache, setCache } from '@/lib/services/cache';
import NewsSection from '../components/NewsSection';
import MarketHeader from '../components/MarketHeader';
import MarketInfoCard from '../components/MarketInfoCard';
import OutcomesCard from '../components/OutcomesCard';
import PriceHistoryCard from '../components/PriceHistoryCard';
import MetricsCard from '../components/MetricsCard';

export default function MarketDetailPage() {
  const params = useParams();
  const marketId = params.marketId as string;

  const { market, loading, error } = useMarket(marketId);
  const [priceHistory, setPriceHistory] = useState<PriceHistoryResponse | null>(null);
  const [priceHistoryLoading, setPriceHistoryLoading] = useState(true);
  const [interval, setInterval] = useState<'raw' | 'hour' | 'day' | 'week'>('raw');
  const [showDescription, setShowDescription] = useState(true);
  const [isTracked, setIsTracked] = useState(false);
  const [trackedMarketId, setTrackedMarketId] = useState<string | null>(null);
  const [isTracking, setIsTracking] = useState(false);
  const [isCheckingTrackedStatus, setIsCheckingTrackedStatus] = useState(true);
  const [newsArticles, setNewsArticles] = useState<NewsArticle[]>([]);
  const [newsLoading, setNewsLoading] = useState(true);

  useEffect(() => {
    if (!market?.id) return;
    const fetchPriceHistory = async () => {
      setPriceHistoryLoading(true);
      try {
        // Try cache first
        const cacheEntry = getCache<PriceHistoryResponse>('priceHistory', market.id);
        let shouldFetch = true;
        if (cacheEntry) {
          // Invalidate if market.updated_at is newer than last cached point
          const lastPoints = Object.values(cacheEntry.data.outcomes || {}).map(o => o.prices[o.prices.length-1]?.timestamp).filter(Boolean);
          const latestCached = lastPoints.length > 0 ? lastPoints.sort().slice(-1)[0] : null;
          if (latestCached && market.updated_at && new Date(market.updated_at) <= new Date(latestCached)) {
            setPriceHistory(cacheEntry.data);
            setPriceHistoryLoading(false);
            shouldFetch = false;
          }
        }
        if (shouldFetch) {
          const data = await marketApi.getPriceHistory(market.id, { interval });
          setCache('priceHistory', market.id, data, 10 * 60 * 1000); // 10 min TTL
          setPriceHistory(data);
        }
      } catch (err) {
        console.error('Failed to fetch price history:', err);
      } finally {
        setPriceHistoryLoading(false);
      }
    };
    fetchPriceHistory();
  }, [market?.id, interval, market?.updated_at]);

  useEffect(() => {
    if (!market?.id) return;
    const fetchNews = async () => {
      setNewsLoading(true);
      try {
        const cacheEntry = getCache<NewsArticle[]>('news', market.id);
        if (cacheEntry) {
          setNewsArticles(cacheEntry.data);
          setNewsLoading(false);
          return;
        }
        const newsData = await getMarketNews(market.id);
        setCache('news', market.id, newsData, 10 * 60 * 1000); // 10 min TTL
        setNewsArticles(newsData);
      } catch (err) {
        console.error('Failed to fetch news:', err);
      } finally {
        setNewsLoading(false);
      }
    };
    fetchNews();
  }, [market?.id]);

  useEffect(() => {
    if (!market?.id) return;
    const checkTrackedStatus = async () => {
      setIsCheckingTrackedStatus(true);
      try {
        const trackedMarkets = await marketApi.getTrackedMarkets();
        const trackedMarket = trackedMarkets.find(tm => tm.market_id === market.id);
        setIsTracked(!!trackedMarket);
        setTrackedMarketId(trackedMarket?.id || null);
      } catch (err) {
        console.error('Failed to check tracked status:', err);
      } finally {
        setIsCheckingTrackedStatus(false);
      }
    };
    checkTrackedStatus();
  }, [market?.id]);

  const handleTrackToggle = async () => {
    if (!market?.id) return;
    setIsTracking(true);
    try {
      if (isTracked && trackedMarketId) {
        await marketApi.untrackMarket(trackedMarketId);
        setIsTracked(false);
        setTrackedMarketId(null);
      } else {
        const newTrackedMarket = await marketApi.trackMarket({ market_id: market.id });
        setIsTracked(true);
        setTrackedMarketId(newTrackedMarket.id);
      }
    } catch (err) {
      console.error('Failed to update tracked status:', err);
    } finally {
      setIsTracking(false);
    }
  };

  const handleIntervalChange = (newInterval: 'raw' | 'hour' | 'day' | 'week') => setInterval(newInterval);
  const refreshNews = () => {
    if (!market?.id) return;
    const fetchNews = async () => {
      setNewsLoading(true);
      try {
        const newsData = await getMarketNews(market.id);
        setNewsArticles(newsData);
      } catch (err) {
        console.error('Failed to refresh news:', err);
      } finally {
        setNewsLoading(false);
      }
    };
    fetchNews();
  };
  const formatDate = (dateString: string | null | undefined) => dateString ? new Date(dateString).toLocaleString() : 'N/A';
  const toggleDescription = () => setShowDescription(!showDescription);

  const MarketInfoSkeleton = () => (
    <div className="animate-pulse">
      <div className="h-8 bg-muted rounded w-3/4 mb-4"></div>
      <div className="space-y-4">
        <div className="h-4 bg-muted rounded w-full"></div>
        <div className="h-4 bg-muted rounded w-5/6"></div>
        <div className="h-4 bg-muted rounded w-1/2"></div>
      </div>
    </div>
  );

  if (loading) return <div className="p-6"><MarketInfoSkeleton /></div>;
  if (error) return <div className="p-6 text-destructive">{error}</div>;

  return (
    <div className="p-6 space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-4">
          <MarketHeader
            market={market}
            marketId={marketId}
            isTracked={isTracked}
            isTracking={isTracking}
            isCheckingTrackedStatus={isCheckingTrackedStatus}
            handleTrackToggle={handleTrackToggle}
            onSuccess={refreshNews}
          />
          <MarketInfoCard
            market={market}
            showDescription={showDescription}
            toggleDescription={toggleDescription}
            formatDate={formatDate}
          />
          {market?.url && (
            <a
              href={market.url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-block mt-2 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors text-sm font-semibold shadow"
            >
              View on Polymarket ↗
            </a>
          )}
          <MetricsCard market={market} />
          {market?.volatility && (
            <div>
              <MarketVolatility volatility={market.volatility} compact={false} />
            </div>
          )}
        </div>
        <div className="card p-6">
          <h2 className="text-xl font-semibold mb-4">Latest News</h2>
          <NewsSection articles={newsArticles} isLoading={newsLoading} compact={true} />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <OutcomesCard market={market} />
        <PriceHistoryCard
          priceHistory={priceHistory}
          priceHistoryLoading={priceHistoryLoading}
          handleIntervalChange={handleIntervalChange}
          market={market}
        />
      </div>
    </div>
  );
}
