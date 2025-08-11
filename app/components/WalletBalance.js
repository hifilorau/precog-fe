'use client';

import { useEffect, useState } from 'react';

export default function WalletBalance() {
  const [balance, setBalance] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchBalance = async () => {

      try {
        setLoading(true);
        const response = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL}/wallet/balance/usdc`,
          {
            credentials: 'include', // Include cookies for auth
            headers: {
              'Content-Type': 'application/json',
            },
          }
        );

        if (!response.ok) {
          throw new Error('Failed to fetch wallet balance');
        }

        const data = await response.json();
        setBalance(data.balance);
      } catch (err) {
        console.error('Error fetching wallet balance:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchBalance();
  }, []);

  if (loading) {
    return (
      <div className="ml-4 flex items-center text-sm text-gray-500">
        <div className="h-4 w-16 animate-pulse bg-gray-200 rounded"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="ml-4 flex items-center">
        <span className="text-sm text-red-500">Error loading balance</span>
      </div>
    );
  }

  return (
    <div className="ml-4 flex items-center">
      <span className="text-sm font-medium text-gray-700">
        {balance?.toLocaleString(undefined, {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        })}{' '}
        USDC.e
      </span>
    </div>
  );
}
