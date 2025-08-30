'use client';

import { useState, useEffect, useRef } from 'react';

export default function useRealTimeCoinPrices() {
  const [prices, setPrices] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const intervalRef = useRef(null);

  const fetchPrices = async () => {
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/coins/prices`);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const result = await response.json();
      
      if (result.success) {
        setPrices(result.data);
        setError(null);
      } else {
        throw new Error('API returned unsuccessful response');
      }
    } catch (err) {
      console.error('Failed to fetch crypto prices:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPrices();
    
    intervalRef.current = setInterval(fetchPrices, 15000);
    
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, []);

  return {
    prices,
    loading,
    error,
    refetch: fetchPrices
  };
}