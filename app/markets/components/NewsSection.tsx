"use client";

import Image from 'next/image';
import Link from 'next/link';
import { NewsArticle } from '@/lib/types/news';

interface NewsSectionProps {
  articles: NewsArticle[];
  isLoading: boolean;
  compact?: boolean;
}

// Simple component to render a sentiment score as a colored dot
const SentimentDot = ({ score }: { score: number }) => {
  // Score ranges from -1 (negative) to 1 (positive)
  const getColor = (score: number) => {
    if (score > 0.3) return 'bg-green-500';
    if (score < -0.3) return 'bg-red-500';
    return 'bg-yellow-500';
  };

  return (
    <div className="flex items-center">
      <div 
        className={`w-3 h-3 rounded-full ${getColor(score)} mr-1`} 
        title={`Sentiment: ${score.toFixed(2)}`}
      />
    </div>
  );
};

// Component to render impact score as stars
const ImpactStars = ({ impact }: { impact: number }) => {
  // Impact ranges from 0 to 1 (5 stars max)
  const stars = Math.ceil(impact * 5);
  return (
    <div className="flex items-center" title={`Impact: ${impact.toFixed(2)}`}>
      {[...Array(5)].map((_, i) => (
        <svg
          key={i}
          className={`w-3 h-3 ${i < stars ? 'text-yellow-400' : 'text-gray-300'}`}
          fill="currentColor"
          viewBox="0 0 20 20"
        >
          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
        </svg>
      ))}
    </div>
  );
};

export default function NewsSection({ articles, isLoading, compact = false }: NewsSectionProps) {
  if (isLoading) {
    return <div className="p-4">Loading relevant news...</div>;
  }
  
  if (!articles || articles.length === 0) {
    return <div className="p-4">No relevant news found for this market.</div>;
  }

  if (compact) {
    return (
      <div className="space-y-3">
        {articles.slice(0, 5).map((article) => (
          <div key={article.id} className="group">
            <Link href={`/news/${article.id}`} className="flex gap-3 items-start hover:bg-gray-50 p-2 rounded-lg transition-colors">
              {/* Tiny image thumbnail */}
              {article.image_url && (
                <div className="w-16 h-16 flex-shrink-0 relative rounded overflow-hidden">
                  <Image
                    src={article.image_url}
                    alt=""
                    fill
                    className="object-cover"
                    sizes="64px"
                  />
                </div>
              )}
              
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 text-xs text-gray-500 mb-1">
                  <span className="truncate">{article.source || 'Source'}</span>
                  <span>•</span>
                  <span>{formatDate(article.published_at)}</span>
                </div>
                <h3 className="font-medium text-sm leading-tight line-clamp-2 group-hover:text-blue-600 transition-colors">
                  {article.title}
                </h3>
                
                {/* Sentiment and impact scores */}
                <div className="flex items-center gap-3 mt-1">
                  <div className="flex items-center gap-1 text-xs text-gray-500">
                    <SentimentDot score={article.sentiment || 0} />
                    <span>Sentiment</span>
                  </div>
                  <div className="flex items-center gap-1 text-xs text-gray-500">
                    <ImpactStars impact={article.impact || 0} />
                    <span>Impact</span>
                  </div>
                </div>
              </div>
            </Link>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {articles.map((article) => (
        <div key={article.id} className="border-b pb-4 last:border-b-0">
          <Link href={`/news/${article.id}`} className="block group">
            <div className="flex flex-col sm:flex-row gap-4">
              {article.image_url && (
                <div className="w-full sm:w-32 flex-shrink-0 relative h-24">
                  <Image
                    src={article.image_url}
                    alt=""
                    fill
                    className="object-cover rounded-lg"
                    sizes="(max-width: 640px) 100vw, 128px"
                  />
                </div>
              )}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 text-sm text-gray-500 mb-1">
                  <span>{article.source || 'Unknown Source'}</span>
                  {article.published_at && (
                    <>
                      <span>•</span>
                      <span>{formatDate(article.published_at)}</span>
                    </>
                  )}
                </div>
                <h3 className="font-medium group-hover:text-blue-600 transition-colors">
                  {article.title}
                </h3>
                
                {/* Sentiment and impact scores */}
                <div className="flex items-center gap-4 mt-2">
                  <div className="flex items-center gap-2 text-sm">
                    <span className="text-gray-500">Sentiment:</span>
                    <SentimentDot score={article.sentiment || 0} />
                    <span className="text-xs text-gray-500">
                      {article.sentiment ? article.sentiment.toFixed(2) : 'N/A'}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <span className="text-gray-500">Impact:</span>
                    <ImpactStars impact={article.impact || 0} />
                  </div>
                </div>
              </div>
            </div>
          </Link>
        </div>
      ))}
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