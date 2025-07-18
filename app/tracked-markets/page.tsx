'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Market } from '@/lib/types/markets';
import { marketApi } from '@/lib/services/api';

// Helper function to format currency
const formatCurrency = (value: number) => {
  if (value >= 1_000_000_000) {
    return `${(value / 1_000_000_000).toFixed(1)}B`;
  }
  if (value >= 1_000_000) {
    return `${(value / 1_000_000).toFixed(1)}M`;
  }
  if (value >= 1_000) {
    return `${(value / 1_000).toFixed(1)}K`;
  }
  return value.toString();
};

// Helper function to calculate market volume
const calculateMarketVolume = (market: Market) => {
    return market.volume || 0;
};

// Helper function to format date
const formatDate = (dateString?: string) => {
  if (!dateString) return 'N/A';
  try {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
    } catch (error) {
    console.error('Invalid date string:', error);
    return 'Invalid Date';
  }
};


export default function TrackedMarketsPage() {
  const [markets, setMarkets] = useState<Market[]>([]);
  const [loading, setLoading] = useState(true);


  useEffect(() => {
    const fetchTrackedMarkets = async () => {
      try {
        setLoading(true);
        // The backend endpoint currently returns all tracked markets regardless of user_id
        const trackedMarkets = await marketApi.getTrackedMarkets();
        // The API returns TrackedMarket objects, which contain the full market object
        const extractedMarkets = trackedMarkets.map(tm => tm.market);
        setMarkets(extractedMarkets);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchTrackedMarkets();
  }, []);

  if (loading) {
    return <div className="text-center py-10">Loading tracked markets...</div>;
  }


  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-6">Tracked Markets</h1>
      
      {markets.length === 0 ? (
        <div className="text-center py-10 text-gray-500">
          <p>You are not tracking any markets yet.</p>
          <Link href="/markets" className="text-blue-500 hover:underline mt-2 inline-block">
            Explore markets to track
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {markets.map((market) => (
            <Link
              href={`/markets/${market.id}`}
              key={market.id}
              className="block"
            >
              <div className="border rounded-lg shadow-lg p-4 h-full hover:shadow-xl transition-shadow duration-200">
                <div className="flex justify-between items-start mb-2">
                  <div className="flex flex-wrap gap-2">
                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                      market.status === 'open' 
                        ? 'bg-green-100 text-green-800' 
                        : market.status === 'resolved' 
                        ? 'bg-blue-100 text-blue-800' 
                        : 'bg-gray-100 text-gray-800'
                    }`}>
                      {market.status.toUpperCase()}
                    </span>
                    <span className="px-2 py-1 text-xs font-medium rounded-full bg-purple-100 text-purple-800">
                      VOL: {formatCurrency(calculateMarketVolume(market))}
                    </span>
                  </div>
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
                                                    <span className="font-medium">{Math.round((outcome.current_price ?? outcome.probability ?? 0) * 100)}%</span>
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
      )}
    </div>
  );
}
