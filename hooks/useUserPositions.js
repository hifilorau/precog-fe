'use client'
import { useState, useEffect, useCallback, useRef } from 'react';

// Custom hook to fetch user positions from polymarket data-api
const useUserPositions = () => {
  const [positions, setPositions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const fetchRef = useRef(null);

  const fetchUserPositions = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch('https://data-api.polymarket.com/positions?user=0xf06Fa6177913c2A3Cc15DB5f38fF1193DE8f6DFa');
      if (!response.ok) {
        throw new Error('Failed to fetch user positions');
      }
      const data = await response.json();
      //   filter out anything where currentValue is 0
      const filteredData = data.filter(position => position.currentValue !== 0);
      console.log('Fetched user positions:', filteredData);
      setPositions(filteredData);
    } catch (err) {
      setError(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchUserPositions();
    fetchRef.current = fetchUserPositions;
  }, [fetchUserPositions]);

  return { positions, loading, error, refetch: fetchRef.current };
};

export default useUserPositions;