'use client';

import { useEffect, useState } from 'react';

const formatPrice = (price) => {
  return new Intl.NumberFormat('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 4
  }).format(price);
};

const formatVolume = (volume) => {
  if (!volume) return '0';
  return new Intl.NumberFormat('en-US', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(volume);
};

export default function OrderBook({ clobId }) {
  const [orderBook, setOrderBook] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchOrderBook = async (clobId) => {
    if (!clobId) {
      console.log('No CLOB ID provided to fetchOrderBook');
      return;
    }
    
    console.log(`Starting to fetch order book for CLOB ${clobId}`);
    setLoading(true);
    setError(null);
    
    try {
      const url = `https://clob.polymarket.com/book?token_id=${clobId}`;
      console.log('Fetching order book from URL:', url);
      
      const response = await fetch(url, {
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to fetch order book: ${response.status} - ${errorText}`);
      }
      
      const data = await response.json();
      console.log('Received order book data:', data);
      setOrderBook(data);
    } catch (err) {
      console.error('Error in fetchOrderBook:', err);
      setError(err.message || 'Failed to load order book');
    } finally {
      setLoading(false);
    }
  };

  // Initial fetch
  useEffect(() => {
    if (clobId) {
      fetchOrderBook(clobId);
    }
  }, [clobId]);

  // Set up polling
  useEffect(() => {
    if (!clobId) return;
    
    const intervalId = setInterval(() => {
      fetchOrderBook(clobId);
    }, 10000); // Poll every 10 seconds
    
    return () => clearInterval(intervalId);
  }, [clobId]);

  if (loading && !orderBook) {
    return (
      <div className="flex justify-center items-center h-32">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-red-500 p-4 border rounded">
        Error loading order book: {error}
      </div>
    );
  }

  if (!orderBook) {
    return <div className="text-gray-500">No order book data available</div>;
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Bids */}
        <div className="border rounded-lg p-4 bg-white shadow-sm">
          <h3 className="text-lg font-medium mb-2 text-green-600">Bids</h3>
          <div className="space-y-1 max-h-96 overflow-y-auto">
            {orderBook.bids && orderBook.bids.length > 0 ? (
              [...orderBook.bids]
                .sort((a, b) => b.price - a.price) // Sort bids highest to lowest
                .map((bid, index) => (
                  <div key={`bid-${index}`} className="flex justify-between items-center p-2 hover:bg-green-50 rounded">
                    <span className="text-green-700 font-mono">{formatPrice(bid.price)}</span>
                    <span className="text-gray-600">{formatVolume(bid.size || bid.quantity)}</span>
                  </div>
                ))
            ) : (
              <div className="text-gray-500 text-center py-4">No bids available</div>
            )}
          </div>
        </div>

        {/* Asks */}
        <div className="border rounded-lg p-4 bg-white shadow-sm">
          <h3 className="text-lg font-medium mb-2 text-red-600">Asks</h3>
          <div className="space-y-1 max-h-96 overflow-y-auto">
            {orderBook.asks && orderBook.asks.length > 0 ? (
              [...orderBook.asks]
                .sort((a, b) => a.price - b.price) // Sort asks lowest to highest
                .map((ask, index) => (
                  <div key={`ask-${index}`} className="flex justify-between items-center p-2 hover:bg-red-50 rounded">
                    <span className="text-red-700 font-mono">{formatPrice(ask.price)}</span>
                    <span className="text-gray-600">{formatVolume(ask.size || ask.quantity)}</span>
                  </div>
                ))
            ) : (
              <div className="text-gray-500 text-center py-4">No asks available</div>
            )}
          </div>
        </div>
      </div>

      <div className="text-xs text-gray-500 text-right">
        Last updated: {orderBook.timestamp ? new Date(orderBook.timestamp).toLocaleString() : 'Unknown'} (Updates every 10 seconds)
      </div>
    </div>
  );
}
