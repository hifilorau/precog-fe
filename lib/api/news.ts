export interface NewsArticle {
  id: string;
  title: string;
  description?: string;
  url: string;
  imageUrl?: string;
  publishedAt: string;
  sourceName?: string;
  tags?: Array<{
    id: string;
    label: string;
  }>;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPreviousPage: boolean;
  };
}

export async function fetchNews({
  page = 1,
  limit = 10,
  query = '',
  tag = '',
  market = '',
  sort = 'newest',
}: {
  page?: number;
  limit?: number;
  query?: string;
  tag?: string;
  market?: string;
  sort?: 'newest' | 'relevance';
} = {}): Promise<PaginatedResponse<NewsArticle>> {
  const params = new URLSearchParams({
    page: page.toString(),
    limit: limit.toString(),
    sort,
  });

  if (query) params.set('query', query);
  if (tag) params.set('tag', tag);
  if (market) params.set('market', market);

  const response = await fetch(`/api/news?${params.toString()}`);
  
  if (!response.ok) {
    throw new Error('Failed to fetch news');
  }

  return response.json();
}
