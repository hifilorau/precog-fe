import { useState, useEffect } from 'react';
import { marketApi } from '@/lib/services/api';
import { Market } from '@/lib/types/markets';

export function useMarket(marketId: string) {
  const [market, setMarket] = useState<Market | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isCancelled = false;

    const fetchMarketData = async () => {
      if (!marketId) {
        setLoading(false);
        return;
      }

      setLoading(true);
      try {
        // First, trigger an update of the market data on the backend.
        try {
          await marketApi.updateMarket(marketId);
        } catch (updateError) {
          console.warn(`Failed to update market ${marketId}. Proceeding with cached data.`, updateError);
        }

        // Then, fetch the potentially updated market data.
        const marketData = await marketApi.getMarket(marketId, true, false);
        if (!isCancelled) {
          setMarket(marketData);
          setError(null);
        }
      } catch (fetchError) {
        console.error('Failed to fetch market data:', fetchError);
        if (!isCancelled) {
          setError('Failed to load market data.');
        }
      } finally {
        if (!isCancelled) {
          setLoading(false);
        }
      }
    };

    fetchMarketData();

    return () => {
      isCancelled = true;
    };
  }, [marketId]);

  return { market, loading, error };
}
