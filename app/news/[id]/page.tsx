import { notFound } from 'next/navigation';
import { Metadata } from 'next';
import Link from 'next/link';
import Image from 'next/image';
import { format } from 'date-fns';
import { ArrowLeftIcon } from '@heroicons/react/24/outline';
import { getNewsArticle } from '@/lib/services/newsService';
import { NewsArticle } from '@/lib/types/news';

async function getArticle(id: string): Promise<NewsArticle | null> {
  try {
    const article = await getNewsArticle(id);
    if (!article) {
      notFound();
    }
    return article;
  } catch (error) {
    console.error('Error fetching news article:', error);
    return null;
  }
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
    description: article.summary || article.title,
    openGraph: {
      title: article.title,
      description: article.summary || article.title,
      type: 'article',
      publishedTime: article.published_at,
      url: `https://yourdomain.com/news/${params.id}`,
      images: article.image_url ? [{ url: article.image_url }] : [],
    },
    twitter: {
      card: 'summary_large_image',
      title: article.title,
      description: article.summary || article.title,
      images: article.image_url ? [article.image_url] : [],
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
              <span>{article.source || 'Unknown Source'}</span>
              {article.published_at && (
                <>
                  <span className="mx-2">•</span>
                  <time dateTime={new Date(article.published_at).toISOString()}>
                    {format(new Date(article.published_at), 'MMMM d, yyyy')}
                  </time>
                </>
              )}
            </div>
            
            <h1 className="text-3xl md:text-4xl font-bold mb-4">{article.title}</h1>
            
            {Array.isArray(article.tags) && article.tags.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-4">
                {article.tags.map((tag) => (
                  <Link 
                    key={tag.id}
                    href={`/news?tag=${encodeURIComponent(tag.name)}`}
                    className="text-xs bg-gray-100 hover:bg-gray-200 text-gray-800 px-2.5 py-0.5 rounded-full"
                  >
                    {tag.name}
                  </Link>
                ))}
              </div>
            )}
          </header>
          
          {article.image_url && (
            <div className="mb-8 rounded-lg overflow-hidden relative w-full h-64 md:h-96">
              <Image
                src={article.image_url}
                alt={article.title}
                fill
                className="object-cover"
                sizes="(max-width: 768px) 100vw, 80vw"
                priority
              />
            </div>
          )}
          
          <div className="prose max-w-none">
            {/* {article.summary && <p className="text-lg">{article.summary}</p>} */}
            
            <div className="mt-8">
              {article.content}
            </div>
          </div>
          
          {Array.isArray(article.markets) && article.markets.length > 0 && (
            <div className="mt-12">
              <h3 className="text-lg font-semibold mb-4">Related Markets</h3>
              <div className="space-y-2">
                {article.markets.map((market) => (
                  <Link 
                    key={market.id}
                    href={`/markets/${market.id}`}
                    className="block p-4 border rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    <h4 className="font-medium">{market.name}</h4>
                  </Link>
                ))}
              </div>
            </div>
          )}
        </article>
      </div>
    </main>
  );
}
