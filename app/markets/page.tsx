'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { marketApi } from '@/lib/services/api';
import { Market, MarketsResponse } from '@/lib/types/markets';

export default function MarketsPage() {
  const [markets, setMarkets] = useState<Market[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pagination, setPagination] = useState({
    total: 0,
    page: 1,
    pages: 1,
    limit: 20,
  });

  useEffect(() => {
    const fetchMarkets = async () => {
      try {
        setLoading(true);
        const response = await marketApi.getMarkets({
          limit: pagination.limit,
          skip: (pagination.page - 1) * pagination.limit,
          include_outcomes: true,
          include_price_history: false,
        });
        setMarkets(response.items);
        setPagination({
          total: response.total,
          page: response.page,
          pages: response.pages,
          limit: response.limit,
        });
        setError(null);
      } catch (err) {
        console.error('Failed to fetch markets:', err);
        setError('Failed to load markets. Please try again later.');
      } finally {
        setLoading(false);
      }
    };

    fetchMarkets();
  }, [pagination.page, pagination.limit]);

  const handlePageChange = (newPage: number) => {
    if (newPage > 0 && newPage <= pagination.pages) {
      setPagination((prev) => ({ ...prev, page: newPage }));
    }
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleString();
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-6">Prediction Markets</h1>
      
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}
      
      {loading ? (
        <div className="flex justify-center my-8">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
            {markets.map((market) => (
              <Link 
                href={`/markets/${market.id}`} 
                key={market.id}
                className="block"
              >
                <div className="border rounded-lg shadow-lg p-4 h-full hover:shadow-xl transition-shadow duration-200">
                  <div className="flex justify-between items-start mb-2">
                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                      market.status === 'open' 
                        ? 'bg-green-100 text-green-800' 
                        : market.status === 'resolved' 
                        ? 'bg-blue-100 text-blue-800' 
                        : 'bg-gray-100 text-gray-800'
                    }`}>
                      {market.status.toUpperCase()}
                    </span>
                    <span className="text-sm text-gray-500">{market.provider}</span>
                  </div>
                  
                  <h2 className="text-xl font-semibold mb-2">{market.name}</h2>
                  
                  <p className="text-gray-600 mb-4 line-clamp-3">{market.question}</p>
                  
                  {market.outcomes && market.outcomes.length > 0 && (
                    <div className="mb-4">
                      <h3 className="font-medium mb-2">Outcomes:</h3>
                      <div className="space-y-2">
                        {market.outcomes.slice(0, 3).map((outcome) => (
                          <div key={outcome.id} className="flex justify-between items-center">
                            <span>{outcome.name}</span>
                            <span className="font-medium">{Math.round(outcome.probability * 100)}%</span>
                          </div>
                        ))}
                        {market.outcomes.length > 3 && (
                          <div className="text-sm text-gray-500 mt-1">
                            +{market.outcomes.length - 3} more outcomes
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                  
                  <div className="flex justify-between text-sm text-gray-500 mt-2">
                    <div>Closes: {formatDate(market.closes_at)}</div>
                    <div>{market.category || 'Uncategorized'}</div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
          
          {/* Pagination */}
          {pagination.pages > 1 && (
            <div className="flex justify-center space-x-2">
              <button
                onClick={() => handlePageChange(pagination.page - 1)}
                disabled={pagination.page === 1}
                className="px-4 py-2 rounded bg-gray-200 disabled:opacity-50"
              >
                Previous
              </button>
              
              <span className="px-4 py-2">
                Page {pagination.page} of {pagination.pages}
              </span>
              
              <button
                onClick={() => handlePageChange(pagination.page + 1)}
                disabled={pagination.page === pagination.pages}
                className="px-4 py-2 rounded bg-gray-200 disabled:opacity-50"
              >
                Next
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
