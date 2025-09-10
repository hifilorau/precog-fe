'use client';

import { useEffect, useState } from 'react';
import { useStateContext } from '../store';
import apiFetch from '@/lib/apiFetch';

export default function WalletBalance() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const { balance, portfolioValue, updateState } = useStateContext();

  useEffect(() => {
    const fetchBalance = async () => {
      try {
        setLoading(true);
        const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1';
        const response = await apiFetch(
          `${apiUrl}/wallet/balance/usdc`
        );

        if (!response.ok) {
          throw new Error('Failed to fetch wallet balance');
        }

        const data = await response.json();
        updateState({ balance: data.balance });
      } catch (err) {
        console.error('Error fetching wallet balance:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchBalance();
  }, [updateState]);

  if (loading) {
    return (
      <div className="ml-4 flex items-center space-x-4">
        <div className="flex items-center gap-2">
          <div className="h-4 w-16 animate-pulse bg-gray-200 rounded"></div>
          <div className="h-3 w-8 animate-pulse bg-gray-200 rounded"></div>
        </div>
        <div className="flex items-center gap-2">
          <div className="h-4 w-16 animate-pulse bg-gray-200 rounded"></div>
          <div className="h-3 w-12 animate-pulse bg-gray-200 rounded"></div>
        </div>
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
    <div className="ml-4 flex items-center space-x-6">
      {/* USDC Balance */}
      <div className="flex items-center">
        <span className="text-xs text-gray-500 mr-2">Balance:</span>
        <span className="text-sm font-medium text-gray-700">
          ${balance?.toLocaleString(undefined, {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
          }) || '0.00'}
        </span>
      </div>
      
      {/* Portfolio Value */}
      <div className="flex items-center">
        <span className="text-xs text-gray-500 mr-2">Portfolio:</span>
        <span className="text-sm font-medium text-gray-900">
          ${portfolioValue?.toLocaleString(undefined, {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
          }) || balance?.toLocaleString(undefined, {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
          }) || '0.00'}
        </span>
      </div>
    </div>
  );
}
