import { useState, useEffect, useCallback } from 'react';
import polymarketPriceService from '../services/polymarketPriceService';

/**
 * Custom hook for fetching and managing real-time prices for opportunities
 * @param {Array} opportunities - Array of opportunity objects
 * @param {number} refreshInterval - How often to refresh prices in milliseconds (default: 30s)
 * @returns {Object} { currentPrices, loading, error, refreshPrices }
 */
export const useRealTimePrices = (opportunities = [], refreshInterval = 30000) => {
  const [currentPrices, setCurrentPrices] = useState(new Map());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchPrices = useCallback(async () => {
    if (!opportunities || opportunities.length === 0) {
      setCurrentPrices(new Map());
      return;
    }

    try {
      setLoading(true);
      setError(null);
      
      const prices = await polymarketPriceService.getOpportunityPrices(opportunities);
      setCurrentPrices(prices);
    } catch (err) {
      console.error('Error fetching real-time prices:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [opportunities]);

  // Initial fetch when opportunities change
  useEffect(() => {
    fetchPrices();
  }, [fetchPrices]);

  // Set up periodic refresh
  useEffect(() => {
    if (!opportunities || opportunities.length === 0) return;

    const interval = setInterval(fetchPrices, refreshInterval);
    return () => clearInterval(interval);
  }, [fetchPrices, refreshInterval, opportunities]);

  // Manual refresh function
  const refreshPrices = useCallback(() => {
    fetchPrices();
  }, [fetchPrices]);

  return {
    currentPrices,
    loading,
    error,
    refreshPrices
  };
};
