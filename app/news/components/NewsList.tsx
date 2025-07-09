'use client';

import { useSearchParams, useRouter, usePathname } from 'next/navigation';
import { useDebouncedCallback } from 'use-debounce';
import { NewsArticle } from '../../../lib/types/news';
import { format } from 'date-fns';
import Link from 'next/link';
import Image from 'next/image';
import { searchNews } from '../../../lib/services/newsService';
import { useEffect, useState } from 'react';
import { Skeleton } from '@/components/ui/skeleton';

interface NewsListProps {
  query: string;
  tag: string;
  market: string;
  sort: string;
  currentPage: number;
}

export default function NewsList({ query, tag, market, sort, currentPage }: NewsListProps) {
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const { replace } = useRouter();
  const [articles, setArticles] = useState<NewsArticle[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [totalPages, setTotalPages] = useState(1);
  const itemsPerPage = 10;

  // Fetch news when search params change
  useEffect(() => {
    const fetchNews = async () => {
      try {
        setIsLoading(true);
        setError(null);
        
        const offset = (currentPage - 1) * itemsPerPage;
        // Use tag as query if tag is present, otherwise use the search query or default to 'crypto'
        const searchQuery = tag || query || 'crypto';
        
        const result = await searchNews({
          query: searchQuery,
          marketId: market || undefined,
          limit: itemsPerPage,
          offset,
          minRelevance: 0.3, // Default minimum relevance score
        });
        
        setArticles(result.articles);
        setTotalPages(Math.ceil(result.count / itemsPerPage));
      } catch (err) {
        console.error('Error fetching news:', err);
        setError('Failed to load news. Please try again later.');
        setArticles([]);
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchNews();
  }, [query, tag, market, sort, currentPage, itemsPerPage]);
  
  const handleSearch = useDebouncedCallback((term: string) => {
    const params = new URLSearchParams(searchParams.toString());
    
    if (term) {
      params.set('query', term);
      params.set('page', '1');
      // Clear tag when performing a new search
      params.delete('tag');
    } else {
      params.delete('query');
    }
    
    replace(`${pathname}?${params.toString()}`);
  }, 300);
  
  const handleSortChange = (value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set('sort', value);
    replace(`${pathname}?${params.toString()}`);
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <Skeleton className="h-10 w-full sm:w-96" />
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <Skeleton className="h-4 w-16" />
            <Skeleton className="h-10 w-40" />
          </div>
        </div>
        {[1, 2, 3].map((i) => (
          <div key={i} className="border-b border-gray-200 pb-6">
            <div className="flex flex-col md:flex-row gap-4">
              <Skeleton className="w-full md:w-48 h-32 rounded-lg" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-6 w-3/4" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-2/3" />
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="bg-red-50 border-l-4 border-red-400 p-4">
        <div className="flex">
          <div className="flex-shrink-0">
            <svg className="h-5 w-5 text-red-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
            </svg>
          </div>
          <div className="ml-3">
            <p className="text-sm text-red-700">
              {error}
              <button 
                onClick={() => window.location.reload()}
                className="ml-2 text-sm font-medium text-red-700 underline hover:text-red-600"
              >
                Try again
              </button>
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="relative w-full sm:w-96">
          <input
            type="text"
            placeholder="Search news..."
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            onChange={(e) => handleSearch(e.target.value)}
            defaultValue={query}
          />
          <div className="absolute left-3 top-2.5 text-gray-400">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
        </div>
        
        <select
          className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
          value={sort}
          onChange={(e) => handleSortChange(e.target.value)}
        >
          <option value="newest">Newest First</option>
          <option value="relevance">Most Relevant</option>
        </select>
      </div>
      
      {query || tag || market ? (
        <div className="flex flex-wrap gap-2 items-center text-sm text-gray-600">
          <span>Filters:</span>
          {query && (
            <span className="bg-blue-100 text-blue-800 text-xs font-medium px-2.5 py-0.5 rounded-full">
              Search: {query}
              <button 
                onClick={() => {
                  const params = new URLSearchParams(searchParams);
                  params.delete('query');
                  replace(`${pathname}?${params.toString()}`);
                }}
                className="ml-1.5 text-blue-800 hover:text-blue-600"
              >
                ×
              </button>
            </span>
          )}
          {tag && (
            <span className="bg-green-100 text-green-800 text-xs font-medium px-2.5 py-0.5 rounded-full">
              Tag: {tag}
              <button 
                onClick={() => {
                  const params = new URLSearchParams(searchParams);
                  params.delete('tag');
                  replace(`${pathname}?${params.toString()}`);
                }}
                className="ml-1.5 text-green-800 hover:text-green-600"
              >
                ×
              </button>
            </span>
          )}
          {market && (
            <span className="bg-purple-100 text-purple-800 text-xs font-medium px-2.5 py-0.5 rounded-full">
              Market: {market}
              <button 
                onClick={() => {
                  const params = new URLSearchParams(searchParams);
                  params.delete('market');
                  replace(`${pathname}?${params.toString()}`);
                }}
                className="ml-1.5 text-purple-800 hover:text-purple-600"
              >
                ×
              </button>
            </span>
          )}
          {(query || tag || market) && (
            <button 
              onClick={() => replace(pathname)}
              className="text-sm text-blue-600 hover:text-blue-800"
            >
              Clear all
            </button>
          )}
        </div>
      ) : null}
      
      <div className="space-y-6">
        {articles.length === 0 ? (
          <div className="text-center py-12">
            <svg
              className="mx-auto h-12 w-12 text-gray-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              aria-hidden="true"
            >
              <path
                vectorEffect="non-scaling-stroke"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <h3 className="mt-2 text-sm font-medium text-gray-900">No articles found</h3>
            <p className="mt-1 text-sm text-gray-500">
              {query ? `No articles match your search for "${query}"` : 'No articles available at the moment.'}
            </p>
            <button 
              onClick={() => replace(pathname)}
              className="mt-4 text-blue-600 hover:text-blue-800"
            >
              Clear filters
            </button>
          </div>
        ) : (
          <>
            {articles.map((article) => (
              <article key={article.id} className="border-b border-gray-200 pb-6 last:border-0">
                <div className="flex flex-col md:flex-row gap-4">
                  {article.imageUrl ? (
                    <div className="w-full md:w-48 flex-shrink-0 relative h-32">
                      <Image 
                        src={article.imageUrl} 
                        alt={article.title || 'News article image'}
                        fill
                        className="object-cover rounded-lg"
                        sizes="(max-width: 768px) 100vw, 192px"
                        priority={false}
                      />
                    </div>
                  ) : (
                    <div className="w-full md:w-48 flex-shrink-0 h-32 bg-gray-100 rounded-lg flex items-center justify-center">
                      <span className="text-gray-400">No image</span>
                    </div>
                  )}
                  <div className="flex-1">
                    <div className="flex items-center gap-2 text-sm text-gray-500 mb-1">
                      <span>{article.source?.name || 'Unknown Source'}</span>
                      <span>•</span>
                      {/* <span>{format(new Date(article.publishedAt), 'MMM d, yyyy')}</span> */}
                    </div>
                    <h2 className="text-xl font-semibold mb-2 hover:text-blue-600">
                      <Link href={`/news/${article.id}`}>
                        {article.title}
                      </Link>
                    </h2>
                    <p className="text-gray-700 mb-3 line-clamp-2">{article.description}</p>
                    
                    {article.tags && article.tags.length > 0 && (
                      <div className="flex flex-wrap gap-2 mt-3">
                        {article.tags.map((tag) => (
                          <Link 
                            key={tag.id} 
                            href={`/news?tag=${encodeURIComponent(tag.label)}`}
                            className="text-xs bg-gray-100 hover:bg-gray-200 text-gray-800 px-2.5 py-0.5 rounded-full"
                          >
                            {tag.label}
                          </Link>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </article>
            ))}
            
            {totalPages > 1 && (
              <div className="flex justify-center mt-8">
                <nav className="flex items-center gap-1">
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                    <Link
                      key={page}
                      href={`?page=${page}${query ? `&query=${encodeURIComponent(query)}` : ''}${tag ? `&tag=${encodeURIComponent(tag)}` : ''}${market ? `&market=${encodeURIComponent(market)}` : ''}&sort=${sort}`}
                      className={`px-3 py-1 rounded-md ${currentPage === page ? 'bg-blue-600 text-white' : 'text-gray-700 hover:bg-gray-100'}`}
                    >
                      {page}
                    </Link>
                  ))}
                </nav>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
