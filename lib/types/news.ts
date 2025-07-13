export interface MarketReference {
  id: string;
  name: string;
}

export interface TagReference {
  id: string;
  name: string;
}

export interface NewsArticle {
  id: string;
  title: string;
  content: string;
  summary?: string;
  source: string;
  source_type: string;
  author?: string;
  published_at: string;
  url: string;
  image_url?: string;
  relevance_score?: number;
  sentiment_score?: number;
  sentiment?: number; // -1 to 1, where -1 is negative, 0 is neutral, 1 is positive
  impact?: number; // 0 to 1, where 0 is no impact, 1 is high impact
  created_at: string;
  updated_at: string;
  markets: MarketReference[];
  tags: TagReference[];
}