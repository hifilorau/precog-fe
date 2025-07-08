// prediction-fe/lib/services/newsService.ts
import { NewsArticle } from '../types/news';

// Default API URL - will be overridden by environment variable
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1';

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
 * @returns Promise resolving to an array of news articles
 */
export async function getMarketNews(marketId: string): Promise<NewsArticle[]> {
  try {
    const url = `${API_BASE_URL}/news/markets/${marketId}/news`;
    
    const response = await fetch(url, {
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
    // We need to return just the articles array from the response
    return data.articles || [];
  } catch (error) {
    console.error('Error fetching news for market:', error);
    return [];
  }
}