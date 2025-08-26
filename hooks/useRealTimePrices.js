import { useState, useEffect, useCallback, useRef } from 'react';
import polymarketPriceService from '../services/polymarketPriceService';

/**
 * Hook to fetch and manage real-time prices for opportunities or positions
 * @param {Array} items - Array of items (opportunities or positions)
 * @param {string} key - A string key to identify this set of items (for caching)
 * @param {string} [type='opportunity'] - Type of items: 'opportunity' or 'position'
 * @returns {Object} { currentPrices, loading, error, refreshPrices }
 */
export const useRealTimePrices = (items, key, type = 'opportunity') => {
  const [currentPrices, setCurrentPrices] = useState(new Map());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchPrices = useCallback(async () => {
    console.log('fetching prices for', type, items?.length || 0, 'items');
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
    fetchPrices();
    
    // Set up interval for refreshing prices (e.g., every 15 seconds)
    const intervalId = setInterval(fetchPrices, 15000);
    
    // Clean up interval on unmount or when dependencies change
    return () => clearInterval(intervalId);
  }, [fetchPrices, key]);

  // Refresh prices manually
  const refreshPrices = useCallback(() => {
    return fetchPrices();
  }, [fetchPrices]);

  return { currentPrices, loading, error, refreshPrices };
};
