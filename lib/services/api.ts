/**
 * API service for interacting with the prediction market backend
 */

import {
  MarketsResponse,
  MarketFilters,
  MarketResponse,
  PriceHistoryResponse,
  PriceHistoryFilters
} from '../types/markets';

// Default API URL - will be overridden by environment variable
// If running against a Docker container, make sure the host can reach the container
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1';

// Endpoint for markets API
const MARKETS_ENDPOINT = `${API_BASE_URL}/markets`;

/**
 * Converts an object to URL query parameters
 */
const toQueryString = (params: Record<string, string | number | boolean | undefined>): string => {
  const queryParams = new URLSearchParams();
  
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null) {
      if (typeof value === 'boolean') {
        queryParams.append(key, value ? 'true' : 'false');
      } else {
        queryParams.append(key, value.toString());
      }
    }
  });
  
  return queryParams.toString();
};

/**
 * API client for market data
 */
export const marketApi = {
  /**
   * Fetch markets with optional filtering
   */
  getMarkets: async (filters?: MarketFilters): Promise<MarketsResponse> => {
    try {
      const queryString = filters ? toQueryString(filters) : '';
      const url = `${MARKETS_ENDPOINT}/?${queryString}`;
      
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        next: { revalidate: 60 }, // Cache for 1 minute
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Failed to fetch markets');
      }
      
      return response.json();
    } catch (error) {
      console.error('Error fetching markets:', error);
      throw error;
    }
  },
  
  /**
   * Fetch a single market by ID
   */
  getMarket: async (
    marketId: string,
    includeOutcomes: boolean = true,
    includePriceHistory: boolean = false,
    includeTags: boolean = true
  ): Promise<MarketResponse> => {
    try {
      const queryString = toQueryString({
        include_outcomes: includeOutcomes,
        include_price_history: includePriceHistory,
        include_tags: includeTags
      });
      
      const url = `${MARKETS_ENDPOINT}/${marketId}?${queryString}`;
      
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        next: { revalidate: 60 }, // Cache for 1 minute
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Failed to fetch market');
      }
      
      return response.json();
    } catch (error) {
      console.error(`Error fetching market ${marketId}:`, error);
      throw error;
    }
  },
  
  /**
   * Fetch price history for a market
   */
  getPriceHistory: async (
    marketId: string,
    filters?: PriceHistoryFilters
  ): Promise<PriceHistoryResponse> => {
    try {
      const queryString = filters ? toQueryString(filters) : '';
      const url = `${MARKETS_ENDPOINT}/${marketId}/price-history?${queryString}`;
      
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        next: { revalidate: 300 }, // Cache for 5 minutes
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Failed to fetch price history');
      }
      
      return response.json();
    } catch (error) {
      console.error(`Error fetching price history for market ${marketId}:`, error);
      throw error;
    }
  },
  
  /**
   * Manually trigger market ingestion
   */
  triggerIngestion: async (providerId?: string): Promise<Record<string, number>> => {
    try {
      const queryString = providerId ? toQueryString({ provider_id: providerId }) : '';
      const url = `${MARKETS_ENDPOINT}/ingest?${queryString}`;
      
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Failed to trigger ingestion');
      }
      
      return response.json();
    } catch (error) {
      console.error('Error triggering market ingestion:', error);
      throw error;
    }
  }
};
