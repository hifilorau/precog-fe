export interface NewsArticle {
  title: string;
  url: string;
  source?: {
    name?: string;
    url?: string;
  };
  description?: string;
  content?: string;
  publishedAt?: string;
  image?: string;
  relevance_score: number;
}