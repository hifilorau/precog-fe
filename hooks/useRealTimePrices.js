import { useState, useEffect, useCallback, useRef } from 'react';
import polymarketPriceService from '../services/polymarketPriceService';

/**
 * Hook to fetch and manage real-time prices for opportunities or positions
 * @param {Array} items - Array of items (opportunities or positions)
 * @param {string} key - A string key to identify this set of items (for caching)
 * @param {string} [type='opportunity'] - Type of items: 'opportunity' or 'position'
 * @returns {Object} { currentPrices, loading, error, refreshPrices }
 */
export const useRealTimePrices = (items, key, type = 'opportunity', options = {}) => {
  const [currentPrices, setCurrentPrices] = useState(new Map());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const pollMs = typeof options.pollMs === 'number' ? options.pollMs : 15000;
  const immediate = options.immediate !== false; // default true

  const fetchPrices = useCallback(async () => {
    if (!items || items.length === 0) {
      setCurrentPrices(new Map());
      return;
    }

    try {
      setLoading(true);
      setError(null);
      
      const prices = type === 'position' 
        ? await polymarketPriceService.getPositionPrices(items)
        : await polymarketPriceService.getOpportunityPrices(items);
      
      setCurrentPrices(prices);
    } catch (err) {
      console.error('Error fetching real-time prices:', err);
      setError(err);
    } finally {
      setLoading(false);
    }
  }, [items, type]);

  // Fetch prices on mount and when items or key changes
  useEffect(() => {
    if (immediate) {
      fetchPrices();
    }
    let intervalId = null;
    if (pollMs && pollMs > 0) {
      intervalId = setInterval(fetchPrices, pollMs);
    }
    return () => {
      if (intervalId) clearInterval(intervalId);
    };
  }, [fetchPrices, key, pollMs, immediate]);

  // Refresh prices manually
  const refreshPrices = useCallback(() => {
    return fetchPrices();
  }, [fetchPrices]);

  return { currentPrices, loading, error, refreshPrices };
};
