/**
 * Type definitions for prediction market data
 */

export interface Market {
  id: string;
  external_id: string;
  provider: string;
  name: string;
  question: string;
  description?: string;
  category?: string;
  subcategory?: string;
  url?: string;
  created_at: string;
  updated_at: string;
  closes_at?: string;
  resolved_at?: string;
  status: 'open' | 'closed' | 'resolved';
  outcomes?: Outcome[];
}

export interface Outcome {
  id: string;
  name: string;
  probability: number;
  price_history?: PricePoint[];
}

export interface PricePoint {
  timestamp: string;
  price: number;
  volume?: number | null;
}

export interface AggregatedPricePoint {
  timestamp: string;
  open: number;
  close: number;
  high: number;
  low: number;
  average: number;
  volume?: number | null;
}

// API Response types
export interface MarketsResponse {
  items: Market[];
  total: number;
  page: number;
  pages: number;
  limit: number;
}

export interface MarketResponse extends Market {}

export interface PriceHistoryResponse {
  market_id: string;
  interval: 'raw' | 'hour' | 'day' | 'week';
  outcomes: Record<string, {
    name: string;
    prices: (PricePoint | AggregatedPricePoint)[];
  }>;
}

// API Query parameters
export interface MarketFilters {
  provider?: string;
  status?: string;
  category?: string;
  search?: string;
  min_closes_at?: string;
  max_closes_at?: string;
  sort_by?: string;
  sort_order?: 'asc' | 'desc';
  include_outcomes?: boolean;
  include_price_history?: boolean;
  skip?: number;
  limit?: number;
}

export interface PriceHistoryFilters {
  start_time?: string;
  end_time?: string;
  interval?: 'raw' | 'hour' | 'day' | 'week';
}
