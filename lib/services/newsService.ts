// prediction-fe/lib/services/newsService.ts
import { NewsArticle } from '../types/news';

// Default API URL - will be overridden by environment variable
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1';

export interface SearchNewsParams {
  query: string;
  marketId?: string;
  limit?: number;
  offset?: number;
  minRelevance?: number;
}

interface NewsSearchResponse {
  articles: NewsArticle[];
  count: number;
}

/**
 * Search for news articles
 * @param params Search parameters including query, marketId, etc.
 * @returns Promise with search results and total count
 */
export async function searchNews(params: SearchNewsParams): Promise<NewsSearchResponse> {
  try {
    const { query, marketId, limit = 10, offset = 0, minRelevance = 0.3 } = params;
    
    // Build query parameters
    const searchParams = new URLSearchParams();
    if (query) searchParams.append('query', query);
    if (marketId) searchParams.append('market_id', marketId);
    if (limit) searchParams.append('limit', limit.toString());
    if (offset) searchParams.append('offset', offset.toString());
    searchParams.append('min_relevance', minRelevance.toString());
    
    const url = `${API_BASE_URL}/news/search?${searchParams.toString()}`;
    
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
      cache: 'no-store',
    });
    
    if (!response.ok) {
      let errorMessage = 'Failed to fetch news';
      try {
        const errorData = await response.json();
        errorMessage = errorData.detail || errorData.message || errorMessage;
      } catch (e) {
        console.error('Error parsing error response:', e);
      }
      throw new Error(errorMessage);
    }
    
    return await response.json();
  } catch (error) {
    console.error('Error searching news:', error);
    throw error;
  }
}

/**
 * Triggers news ingestion for a specific market
 * @param marketId The ID of the market to ingest news for
 * @returns Promise resolving to success or error message
 */
export async function ingestMarketNews(marketId: string): Promise<{ success: boolean; message: string }> {
  try {
    const url = `${API_BASE_URL}/news/markets/${marketId}/ingest-news`;
    
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      cache: 'no-store'
    });
    
    if (!response.ok) {
      let errorMessage = `Failed to trigger news ingestion for market ${marketId}`;
      
      try {
        const errorData = await response.json();
        if (errorData && typeof errorData === 'object') {
          errorMessage = errorData.detail || errorData.message || errorMessage;
        }
      } catch (parseError) {
        console.error('Error parsing error response:', parseError);
      }
      
      return { success: false, message: errorMessage };
    }
    
    const data = await response.json();
    return { 
      success: true, 
      message: data.message || 'News ingestion triggered successfully' 
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    console.error('Error triggering news ingestion:', errorMessage);
    return { success: false, message: errorMessage };
  }
}

/**
 * Fetches news articles for a specific market
 * @param marketId The ID of the market to fetch news for
 * @param minRelevance Minimum relevance score (0.0 to 1.0) to filter articles
 * @returns Promise resolving to an array of news articles
 */
export async function getMarketNews(marketId: string, minRelevance: number = 0.5): Promise<NewsArticle[]> {
  try {
    const url = new URL(`${API_BASE_URL}/news/markets/${marketId}/news`);
    
    // Add query parameters
    url.searchParams.append('min_relevance', minRelevance.toString());
    
    console.log('Fetching market news from:', url.toString());
    const response = await fetch(url.toString(), {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      },
      next: { revalidate: 60 } // Cache for 1 minute
    });
    
    if (!response.ok) {
      // Handle different error response formats safely
      let errorMessage = `Failed to fetch news for market ${marketId}`;
      
      try {
        const errorData = await response.json();
        if (errorData && typeof errorData === 'object') {
          errorMessage = errorData.detail || errorData.message || errorMessage;
        }
      } catch (parseError) {
        console.error('Error parsing error response:', parseError);
      }
      
      // Log error but don't throw
      console.log(errorMessage);
      return [];
    }
    
    const data = await response.json();
    // The API returns { articles: NewsArticle[], count: number }
    // Filter articles by minimum relevance score if provided
    const articles = data.articles || [];
    return articles.filter((article: NewsArticle) => 
      article.relevance_score !== undefined && article.relevance_score >= minRelevance
    );
  } catch (error) {
    console.error('Error fetching news for market:', error);
    return [];
  }
}

export const getNewsArticle = async (articleId: string): Promise<NewsArticle | null> => {
  try {
    const url = `${API_BASE_URL}/news/${articleId}`;
    
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      },
      next: { revalidate: 60 } // Cache for 1 minute
    });
    
    if (!response.ok) {
      // Handle different error response formats safely
      let errorMessage = `Failed to fetch news article ${articleId}`;
      
      try {
        const errorData = await response.json();
        if (errorData && typeof errorData === 'object') {
          errorMessage = errorData.detail || errorData.message || errorMessage;
        }
      } catch (parseError) {
        console.error('Error parsing error response:', parseError);
      }
      
      // Log error but don't throw
      console.log(errorMessage);
      return null;
    }
    
    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error fetching news article:', error);
    return null;
  }
}