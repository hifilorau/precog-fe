'use client';

import { useSearchParams, useRouter, usePathname } from 'next/navigation';
import { useDebouncedCallback } from 'use-debounce';
import { NewsArticle, TagReference } from '../../../lib/types/news';
import { format } from 'date-fns';
import Link from 'next/link';
import Image from 'next/image';
import { searchNews } from '../../../lib/services/newsService';
import { useEffect, useState } from 'react';

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
        const searchQuery = tag || query || 'news';
        
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
          <div className="h-10 w-full sm:w-96 bg-gray-200 animate-pulse rounded" />
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <div className="h-4 w-16 bg-gray-200 animate-pulse rounded" />
            <div className="h-10 w-40 bg-gray-200 animate-pulse rounded" />
          </div>
        </div>
        {[1, 2, 3].map((i) => (
          <div key={i} className="border-b border-gray-200 pb-6">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="w-full md:w-48 h-32 bg-gray-200 animate-pulse rounded-lg" />
              <div className="flex-1 space-y-2">
                <div className="h-4 w-32 bg-gray-200 animate-pulse rounded" />
                <div className="h-6 w-3/4 bg-gray-200 animate-pulse rounded" />
                <div className="h-4 w-full bg-gray-200 animate-pulse rounded" />
                <div className="h-4 w-2/3 bg-gray-200 animate-pulse rounded" />
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
            className="w-full pl-10 pr-4 py-2 border border-peach rounded-full focus:ring-2 focus:ring-[#e08a6b] focus:border-[#e08a6b] bg-white text-peach-heading"
            onChange={(e) => handleSearch(e.target.value)}
            defaultValue={query}
          />
          <div className="absolute left-3 top-2.5 text-peach-muted">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
        </div>
        
        <select
          className="px-4 py-2 border border-peach rounded-full focus:ring-2 focus:ring-[#e08a6b] focus:border-[#e08a6b] bg-white text-peach-heading"
          value={sort}
          onChange={(e) => handleSortChange(e.target.value)}
        >
          <option value="newest">Newest First</option>
          <option value="relevance">Most Relevant</option>
        </select>
      </div>
      
      {query || tag || market ? (
        <div className="flex flex-wrap gap-2 items-center text-sm text-peach-muted">
          <span>Filters:</span>
          {query && (
            <span className="bg-peach-surface text-peach-heading text-xs font-medium px-2.5 py-0.5 rounded-full soft-card">
              Search: {query}
              <button 
                onClick={() => {
                  const params = new URLSearchParams(searchParams);
                  params.delete('query');
                  replace(`${pathname}?${params.toString()}`);
                }}
                className="ml-1.5 text-peach-heading hover:opacity-80"
              >
                ×
              </button>
            </span>
          )}
          {tag && (
            <span className="bg-peach-surface text-peach-heading text-xs font-medium px-2.5 py-0.5 rounded-full soft-card">
              Tag: {tag}
              <button 
                onClick={() => {
                  const params = new URLSearchParams(searchParams);
                  params.delete('tag');
                  replace(`${pathname}?${params.toString()}`);
                }}
                className="ml-1.5 text-peach-heading hover:opacity-80"
              >
                ×
              </button>
            </span>
          )}
          {market && (
            <span className="bg-peach-surface text-peach-heading text-xs font-medium px-2.5 py-0.5 rounded-full soft-card">
              Market: {market}
              <button 
                onClick={() => {
                  const params = new URLSearchParams(searchParams);
                  params.delete('market');
                  replace(`${pathname}?${params.toString()}`);
                }}
                className="ml-1.5 text-peach-heading hover:opacity-80"
              >
                ×
              </button>
            </span>
          )}
          {(query || tag || market) && (
            <button 
              onClick={() => replace(pathname)}
              className="text-sm text-peach-heading hover:opacity-80"
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
              <article key={article.id} className="pb-6 last:border-0" style={{ borderBottom: '1px solid #ebcfc4' }}>
                <div className="flex flex-col md:flex-row gap-4">
                  {article.image_url ? (
                    <div className="w-full md:w-48 flex-shrink-0 relative h-32">
                      <Image 
                        src={article.image_url || '/placeholder-news.jpg'}
                        alt={article.title}
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
                      <span>{article.source || 'Unknown Source'}</span>
                      {article.published_at && (
                        <>
                          <span>•</span>
                          <span>{format(new Date(article.published_at), 'MMM d, yyyy')}</span>
                        </>
                      )}
                    </div>
                    <h2 className="text-xl font-semibold mb-2 hover:opacity-90 text-peach-heading">
                      <Link href={`/news/${article.id}`}>
                        {article.title}
                      </Link>
                    </h2>
                    {article.summary && (
                      <p className="text-gray-700 mb-3 line-clamp-2">
                        {article.summary}
                      </p>
                    )}
                    
                    {article.tags && article.tags.length > 0 && (
                      <div className="flex flex-wrap gap-2 mt-3">
                        {article.tags.map((tag: TagReference) => (
                          <Link 
                            key={tag.id} 
                            href={`/news?tag=${encodeURIComponent(tag.name)}`}
                            className="text-xs bg-peach-surface hover:opacity-90 text-peach-heading px-2.5 py-0.5 rounded-full soft-card"
                          >
                            {tag.name}
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
                      className={`px-3 py-1 rounded-full ${currentPage === page ? 'btn-peach text-white' : 'text-peach-heading hover:bg-peach-surface soft-card'}`}
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
