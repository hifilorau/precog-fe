import { notFound } from 'next/navigation';
import { Metadata } from 'next';
import Link from 'next/link';
import { format } from 'date-fns';
import { ArrowLeftIcon } from '@heroicons/react/24/outline';

// Mock data - replace with actual API call
async function getArticle(id: string) {
  // In a real app, you would fetch this from your API
  // const res = await fetch(`/api/news/${id}`);
  // if (!res.ok) return null;
  // return res.json();
  
  // Mock data for now
  if (id === '1') {
    return {
      id: '1',
      title: 'Trump contemplates taking control of Washington, D.C., government',
      description: 'Former President Donald Trump is reportedly considering a plan to take more direct control over the Washington, D.C. government if re-elected, according to sources familiar with the discussions.',
      content: 'The plan would involve appointing a special administrator to oversee the District of Columbia, potentially bypassing the current elected mayor and city council. Critics argue this would undermine local governance, while supporters claim it would help address crime and mismanagement issues in the nation\'s capital.',
      url: 'https://example.com/trump-dc-plan',
      imageUrl: 'https://images.unsplash.com/photo-1605106702734-205df224ecce?ixlib=rb-4.0.3&ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&auto=format&fit=crop&w=1000&q=80',
      publishedAt: '2025-07-08T14:30:00Z',
      source: {
        name: 'The Globe and Mail',
        url: 'https://www.theglobeandmail.com'
      },
      tags: [
        { id: '1', label: 'Politics' },
        { id: '2', label: 'US Government' },
        { id: '3', label: 'Washington DC' }
      ],
      markets: [
        { id: 'us-elections-2024', name: '2024 US Presidential Election', probability: 0.45 },
        { id: 'dc-governance', name: 'DC Governance Changes', probability: 0.32 }
      ]
    };
  }
  
  return null;
}

export async function generateMetadata({
  params,
}: {
  params: { id: string };
}): Promise<Metadata> {
  const article = await getArticle(params.id);
  
  if (!article) {
    return {
      title: 'Article Not Found',
    };
  }
  
  return {
    title: `${article.title} | Prediction Market News`,
    description: article.description,
    openGraph: {
      title: article.title,
      description: article.description,
      type: 'article',
      publishedTime: article.publishedAt,
      url: `https://yourdomain.com/news/${params.id}`,
      images: article.imageUrl ? [{ url: article.imageUrl }] : [],
    },
    twitter: {
      card: 'summary_large_image',
      title: article.title,
      description: article.description,
      images: article.imageUrl ? [article.imageUrl] : [],
    },
  };
}

export default async function NewsArticlePage({
  params,
}: {
  params: { id: string };
}) {
  const article = await getArticle(params.id);
  
  if (!article) {
    notFound();
  }

  return (
    <main className="container mx-auto px-4 py-8">
      <div className="max-w-4xl mx-auto">
        <Link 
          href="/news" 
          className="inline-flex items-center text-blue-600 hover:text-blue-800 mb-6"
        >
          <ArrowLeftIcon className="h-4 w-4 mr-1" />
          Back to News
        </Link>
        
        <article>
          <header className="mb-8">
            <div className="flex items-center text-sm text-gray-500 mb-4">
              <span>{article.source?.name}</span>
              <span className="mx-2">•</span>
              <time dateTime={article.publishedAt}>
                {format(new Date(article.publishedAt), 'MMMM d, yyyy')}
              </time>
            </div>
            
            <h1 className="text-3xl md:text-4xl font-bold mb-4">{article.title}</h1>
            
            {article.tags && article.tags.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-4">
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
          </header>
          
          {article.imageUrl && (
            <figure className="mb-8">
              <img 
                src={article.imageUrl} 
                alt={article.title} 
                className="w-full h-auto rounded-lg shadow-lg"
              />
              <figcaption className="text-sm text-gray-500 mt-2">
                {article.source?.name}
              </figcaption>
            </figure>
          )}
          
          <div className="prose max-w-none mb-12">
            <p className="text-lg text-gray-700 mb-6">
              {article.description}
            </p>
            
            <div className="bg-blue-50 border-l-4 border-blue-400 p-4 mb-6">
              <p className="text-blue-700">
                <strong>Note:</strong> This is a mock article. In a real implementation, this would contain the full article content fetched from the API.
              </p>
            </div>
            
            <p className="text-gray-700">
              {article.content}
            </p>
            
            <div className="mt-8 pt-6 border-t border-gray-200">
              <a
                href={article.url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center text-blue-600 hover:text-blue-800"
              >
                Read full article on {article.source?.name || 'source'}
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 ml-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                </svg>
              </a>
            </div>
          </div>
          
          {(article.markets && article.markets.length > 0) && (
            <div className="bg-gray-50 p-6 rounded-lg">
              <h2 className="text-xl font-semibold mb-4">Related Markets</h2>
              <div className="space-y-4">
                {article.markets.map((market) => (
                  <div key={market.id} className="border border-gray-200 rounded-lg p-4 hover:bg-white transition-colors">
                    <div className="flex justify-between items-start">
                      <div>
                        <h3 className="font-medium text-gray-900">
                          <Link href={`/markets/${market.id}`} className="hover:text-blue-600">
                            {market.name}
                          </Link>
                        </h3>
                        <p className="text-sm text-gray-500 mt-1">
                          Current probability: <span className="font-medium">{(market.probability * 100).toFixed(0)}%</span>
                        </p>
                      </div>
                      <div className="flex-shrink-0">
                        <Link 
                          href={`/markets/${market.id}`}
                          className="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                        >
                          View Market
                        </Link>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </article>
      </div>
    </main>
  );
}
