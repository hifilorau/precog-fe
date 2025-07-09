'use client';

import { useSearchParams, usePathname, useRouter } from 'next/navigation';

// Mock data - replace with actual API calls
const popularTags = [
  { id: 'politics', label: 'Politics', count: 42 },
  { id: 'technology', label: 'Technology', count: 36 },
  { id: 'sports', label: 'Sports', count: 28 },
  { id: 'business', label: 'Business', count: 24 },
  { id: 'entertainment', label: 'Entertainment', count: 18 },
];

const popularMarkets = [
  { id: 'us-elections-2024', label: 'US Elections 2024', count: 15 },
  { id: 'bitcoin-price', label: 'Bitcoin Price', count: 12 },
  { id: 'climate-agreements', label: 'Climate Agreements', count: 8 },
  { id: 'tech-regulations', label: 'Tech Regulations', count: 6 },
];

export default function NewsFilters() {
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const { replace } = useRouter();
  
  const selectedTag = searchParams?.get('tag') || '';
  const selectedMarket = searchParams?.get('market') || '';
  
  const handleTagClick = (tagId: string) => {
    const params = new URLSearchParams(searchParams?.toString());
    
    if (selectedTag === tagId) {
      params.delete('tag');
    } else {
      params.set('tag', tagId);
    }
    
    params.set('page', '1');
    replace(`${pathname}?${params.toString()}`);
  };
  
  const handleMarketClick = (marketId: string) => {
    const params = new URLSearchParams(searchParams?.toString());
    
    if (selectedMarket === marketId) {
      params.delete('market');
    } else {
      params.set('market', marketId);
    }
    
    params.set('page', '1');
    replace(`${pathname}?${params.toString()}`);
  };
  
  return (
    <div className="bg-white p-4 rounded-lg shadow">
      <div className="mb-6">
        <h3 className="font-semibold text-lg mb-3">Popular Tags</h3>
        <div className="space-y-2">
          {popularTags.map((tag) => (
            <button
              key={tag.id}
              onClick={() => handleTagClick(tag.label)}
              className={`flex items-center justify-between w-full text-left px-3 py-2 rounded-md text-sm ${
                selectedTag === tag.label
                  ? 'bg-blue-100 text-blue-800'
                  : 'text-gray-700 hover:bg-gray-100'
              }`}
            >
              <span>{tag.label}</span>
              <span className="text-xs bg-gray-200 text-gray-700 px-2 py-0.5 rounded-full">
                {tag.count}
              </span>
            </button>
          ))}
        </div>
      </div>
      
      <div>
        <h3 className="font-semibold text-lg mb-3">Markets</h3>
        <div className="space-y-2">
          {popularMarkets.map((market) => (
            <button
              key={market.id}
              onClick={() => handleMarketClick(market.id)}
              className={`flex items-center justify-between w-full text-left px-3 py-2 rounded-md text-sm ${
                selectedMarket === market.id
                  ? 'bg-purple-100 text-purple-800'
                  : 'text-gray-700 hover:bg-gray-100'
              }`}
            >
              <span>{market.label}</span>
              <span className="text-xs bg-gray-200 text-gray-700 px-2 py-0.5 rounded-full">
                {market.count}
              </span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
