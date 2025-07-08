"use client";

import { useState } from 'react';
import { ingestMarketNews } from '@/lib/services/newsService';

interface IngestNewsButtonProps {
  marketId: string;
  onSuccess?: () => void; // Optional callback to refresh news data
}

export default function IngestNewsButton({ marketId, onSuccess }: IngestNewsButtonProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState<{text: string; type: 'success' | 'error'} | null>(null);

  const handleIngestNews = async () => {
    setIsLoading(true);
    setMessage(null);
    
    try {
      const result = await ingestMarketNews(marketId);
      
      if (result.success) {
        setMessage({ text: result.message, type: 'success' });
        
        // If onSuccess callback is provided, call it to refresh news data
        if (onSuccess) {
          setTimeout(() => {
            onSuccess();
          }, 1000); // Wait a second before refreshing to allow backend processing
        }
      } else {
        setMessage({ text: result.message, type: 'error' });
      }
    } catch (error) {
      setMessage({ 
        text: error instanceof Error ? error.message : 'Failed to trigger news ingestion', 
        type: 'error' 
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col items-start space-y-2">
      <button
        onClick={handleIngestNews}
        disabled={isLoading}
        className={`px-4 py-2 rounded-md text-sm font-medium text-white 
          ${isLoading ? 'bg-gray-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700'}`}
      >
        {isLoading ? 'Processing...' : 'Fetch Latest News'}
      </button>
      
      {message && (
        <div 
          className={`text-sm px-3 py-1 rounded-md ${
            message.type === 'success' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
          }`}
        >
          {message.text}
        </div>
      )}
    </div>
  );
}
