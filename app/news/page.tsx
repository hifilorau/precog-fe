import { Suspense } from 'react';
import NewsList from './components/NewsList';
import NewsFilters from './components/NewsFilters';
import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'News - Prediction Market',
  description: 'Browse the latest news articles with market predictions',
};

export default async function NewsPage({
  searchParams,
}: {
  searchParams: Promise<{
    query?: string;
    tag?: string;
    market?: string;
    sort?: 'newest' | 'relevance';
    page?: string;
  }>;
}) {
  // Wait for searchParams to be available
  const params = await searchParams;
  
  const query = params.query || '';
  const tag = params.tag || '';
  const market = params.market || '';
  const sort = (params.sort === 'relevance' ? 'relevance' : 'newest') as 'newest' | 'relevance';
  const currentPage = Number(params.page) || 1;

  return (
    <main className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Market News</h1>
        <p className="text-gray-600">
          Stay updated with the latest news affecting prediction markets
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        <div className="lg:col-span-1">
          <NewsFilters />
        </div>
        
        <div className="lg:col-span-3">
          <Suspense fallback={<div>Loading news...</div>}>
            <NewsList 
              query={query}
              tag={tag}
              market={market}
              sort={sort}
              currentPage={currentPage}
            />
          </Suspense>
        </div>
      </div>
    </main>
  );
}
