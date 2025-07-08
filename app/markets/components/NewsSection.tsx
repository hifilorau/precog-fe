"use client";

import { NewsArticle } from '../../../lib/types/news';

interface NewsSectionProps {
  articles: NewsArticle[];
  isLoading: boolean;
}

export default function NewsSection({ articles, isLoading }: NewsSectionProps) {
  if (isLoading) {
    return <div className="p-4">Loading relevant news...</div>;
  }
  
  if (!articles || articles.length === 0) {
    return <div className="p-4">No relevant news found for this market.</div>;
  }

  return (
    <div className="bg-white rounded-lg shadow p-4">
      <h2 className="text-xl font-bold mb-4">Relevant News</h2>
      <div className="space-y-4">
        {articles.map((article, index) => (
          <div key={index} className="border-b pb-4 last:border-b-0">
            <a 
              href={article.url} 
              target="_blank" 
              rel="noopener noreferrer"
              className="hover:text-blue-600"
            >
              <h3 className="font-semibold text-lg">{article.title}</h3>
            </a>
            <div className="text-sm text-gray-500 flex items-center justify-between mt-1">
              <span>{article.source?.name || 'Unknown Source'}</span>
              <span>{formatDate(article.publishedAt)}</span>
            </div>
            {article.description && (
              <p className="mt-2 text-gray-700">{article.description}</p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function formatDate(dateString?: string): string {
  if (!dateString) return '';
  
  try {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric', 
      year: 'numeric' 
    });
  } catch {
    return '';
  }
}