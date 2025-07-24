'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Market, Outcome } from '@/lib/types/markets';
import { marketApi } from '@/lib/services/api';
import MarketVolatility from '../components/MarketVolatility';
import MarketFilters from '../components/MarketFilters';

export default function MarketsPage() {
  // Volatility breakout filter state
  const [breakout1h, setBreakout1h] = useState<boolean | null>(null);
  const [breakout6h, setBreakout6h] = useState<boolean | null>(null);
  const router = useRouter();
  const searchParams = useSearchParams();
  
  // State variables
  const [markets, setMarkets] = useState<Market[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Filter state
  const [searchQuery, setSearchQuery] = useState(searchParams.get('search') || '');
  const [selectedCategory, setSelectedCategory] = useState(searchParams.get('category') || '');
  const [selectedStatus, setSelectedStatus] = useState(searchParams.get('status') || '');
  const [selectedProvider, setSelectedProvider] = useState(searchParams.get('provider') || '');
  const [excludeResolved, setExcludeResolved] = useState(searchParams.get('exclude_resolved') === 'true');
  
  // Sort state
  const [sortBy, setSortBy] = useState<string>(searchParams.get('sort_by') || 'updated_at');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>(searchParams.get('sort_order') === 'asc' ? 'asc' : 'desc');
  
  // Available options for filters
  const [availableCategories, setAvailableCategories] = useState<string[]>([]);
  const [availableProviders, setAvailableProviders] = useState<string[]>([]);
  
  // Pagination state
  const [pagination, setPagination] = useState({
    total: 0,
    page: parseInt(searchParams.get('page') || '1', 10),
    pages: 1,
    limit: parseInt(searchParams.get('limit') || '50', 10), // Increased default limit to 50
  });

  // Update URL based on filters with all parameters specified explicitly
  const updateQueryParams = useCallback(() => {
    const params = new URLSearchParams();
    
    if (searchQuery) params.set('search', searchQuery);
    if (selectedCategory) params.set('category', selectedCategory);
    if (selectedStatus) params.set('status', selectedStatus);
    if (selectedProvider) params.set('provider', selectedProvider);
    if (sortBy !== 'updated_at') params.set('sort_by', sortBy);
    if (sortOrder !== 'desc') params.set('sort_order', sortOrder);
    if (pagination.page !== 1) params.set('page', pagination.page.toString());
    if (pagination.limit !== 20) params.set('limit', pagination.limit.toString());
    if (excludeResolved) params.set('exclude_resolved', 'true');
    
    // Only update URL if it's actually changing to avoid loops
    const newQueryString = params.toString();
    const currentQuery = window.location.search.replace('?', '');
    
    if (newQueryString !== currentQuery) {
      console.log('Updating URL params:', newQueryString);
      router.replace(`/markets?${newQueryString}`, { scroll: false });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router]);  // We're using eslint-disable to avoid dependency array changes
  
  // Debounced search function - only for filter changes, not pagination
  useEffect(() => {
    // Skip this effect when it's triggered by pagination changes
    if (isPageChangeRef.current) return;
    
    const timer = setTimeout(() => {
      updateQueryParams();
    }, 500);
    
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    // Only watch filter changes, NOT pagination
    searchQuery,
    selectedCategory,
    selectedStatus,
    selectedProvider,
    excludeResolved,
    sortBy,
    sortOrder,
    breakout1h,
    breakout6h,
    // updateQueryParams removed from deps to prevent array size changes
  ]);
  
  // Handle URL updates when pagination changes
  useEffect(() => {
    // If this is a manual page change through the pagination controls
    if (isPageChangeRef.current) {
      isPageChangeRef.current = false; // Reset the flag
      updateQueryParams(); // Update URL to reflect the new page
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    // Keep a consistent order in all dependency arrays
    pagination.page,
    pagination.limit,
    // updateQueryParams removed from deps to prevent array size changes
  ]);
  
  // Reset to page 1 when filters (except pagination) change
  useEffect(() => {
    setPagination(prev => ({ ...prev, page: 1 }));
  }, [
    // Only include filter dependencies, NOT pagination
    searchQuery,
    selectedCategory,
    selectedStatus,
    selectedProvider,
    excludeResolved,
    sortBy,
    sortOrder,
  ]);

  // Fetch markets with filters
  useEffect(() => {
    const fetchMarkets = async () => {
      try {
        setLoading(true);
        
        // All filtering and sorting is now handled by the backend
        const apiParams = {
          limit: pagination.limit,
          skip: (pagination.page - 1) * pagination.limit,
          include_outcomes: true,
          include_price_history: false, // Removed to improve performance - we don't need price history for the markets listing
          search: searchQuery || undefined,
          category: selectedCategory || undefined,
          status: selectedStatus || undefined,
          provider: selectedProvider || undefined,
          sort_by: sortBy, // Now the backend supports volume sorting directly
          sort_order: sortOrder,
          exclude_resolved: excludeResolved, // Use the new backend parameter
          breakout_1h: breakout1h === null ? undefined : breakout1h,
          breakout_6h: breakout6h === null ? undefined : breakout6h,
          // include_tags: undefined, // Explicitly undefined for diagnostics
        };
        
        console.log('API Request Params:', apiParams);
        
        const response = await marketApi.getMarkets(apiParams);
        
        // Log the full API response metadata
        console.log('API Response Metadata:', {
          total: response.total,
          page: response.page,
          pages: response.pages,
          limit: response.limit,
          itemCount: response.items?.length || 0
        });
        
        const { items } = response;
        const filteredItems = items;
        
        // Debug: Log first few markets and their outcomes
        console.log('First few markets before filtering:', response.items.slice(0, 2).map((m: Market) => ({
          id: m.id,
          name: m.name,
          outcomes: m.outcomes?.map((o: Outcome) => ({ name: o.name, probability: o.probability })) || []
        })));
        
        // Process the response - no client-side filtering needed anymore!
        console.log('Initial items from API:', filteredItems.length);
        
        // The backend now handles all filtering:
        // 1. Excluding resolved markets with exclude_resolved=true parameter
        // 2. Volume-based sorting with sort_by=volume parameter
        
        // Store the API response data for debugging
        const apiTotal = response.total;
        const apiPages = response.pages;
        const apiLimit = response.limit;
        
        console.log('API Response:', {
          total: apiTotal, 
          items: filteredItems.length,
          pages: apiPages,
          limit: apiLimit
        });
        
        // The backend now handles all filtering, sorting and pagination
        console.log('Using server-side pagination, filtering and sorting');
        
        // Set the markets from the API response
        setMarkets(filteredItems);
        
        // Use the API's pagination metadata
        setPagination({
          total: apiTotal,
          page: pagination.page,
          pages: apiPages,
          limit: pagination.limit,
        });
        
        // Extract unique categories and providers for filter options
        const categories = new Set<string>();
        const providers = new Set<string>();
        
        filteredItems.forEach(market => {
          if (market.category) categories.add(market.category);
          if (market.provider) providers.add(market.provider);
        });
        
        setAvailableCategories(Array.from(categories));
        setAvailableProviders(Array.from(providers));
        
        setError(null);
      } catch (err) {
        console.error('Failed to fetch markets:', err);
        setError('Failed to load markets. Please try again later.');
      } finally {
        setLoading(false);
      }
    };

    fetchMarkets();
  }, [
    // Keep a consistent order in all dependency arrays
    searchQuery,
    selectedCategory,
    selectedStatus,
    selectedProvider,
    excludeResolved,  // Make sure this is in the same position in all arrays
    sortBy,
    sortOrder,
    breakout1h,
    breakout6h,
    pagination.page,
    pagination.limit
  ]);

  // This flag helps prevent infinite loops when changing pages
  const isPageChangeRef = useRef(false);
  
  const handlePageChange = (newPage: number) => {
    if (newPage > 0 && newPage <= pagination.pages) {
      console.log(`Changing to page ${newPage}`);
      
      // Set flag to indicate this is a manual page change
      isPageChangeRef.current = true;
      
      // Update pagination state
      setPagination((prev) => ({ ...prev, page: newPage }));
      
      // We'll let the effect handle the URL update when pagination changes
    }
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleString();
  };
  
  // Calculate the total volume for a market - optimized to handle missing price_history
  const calculateMarketVolume = (market: Market) => {
    // If the market has a volume property directly (preferred way)
    if (market.volume !== undefined) {
      return market.volume;
    }
    
    // If no outcomes or price history is unavailable, return 0
    if (!market.outcomes || market.outcomes.length === 0) {
      return 0;
    }
    
    // We're no longer requesting price_history for the markets list (for performance)
    // but we still need to handle the case where it might be present
    const totalVolume = market.outcomes.reduce((sum: number, outcome: Outcome) => {
      // If the outcome has a volume property directly
      if (outcome.volume !== undefined) {
        return sum + outcome.volume;
      }
      
      // Fallback to price_history if somehow available
      const volume = outcome.price_history && outcome.price_history.length > 0 
        ? outcome.price_history[outcome.price_history.length - 1].volume || 0
        : 0;
      
      return sum + volume;
    }, 0);
    
    return totalVolume;
  };
  
  // Format currency with appropriate suffix (K, M, B)
  const formatCurrency = (value: number) => {
    if (!value) return '$0';
    
    if (value >= 1000000000) {
      return '$' + (value / 1000000000).toFixed(1) + 'B';
    }
    if (value >= 1000000) {
      return '$' + (value / 1000000).toFixed(1) + 'M';
    }
    if (value >= 1000) {
      return '$' + (value / 1000).toFixed(1) + 'K';
    }
    
    return '$' + value.toFixed(2);
  };

  // Status options
  const statusOptions = [
    { value: '', label: 'All Statuses' },
    { value: 'open', label: 'Open' },
    { value: 'closed', label: 'Closed' },
    { value: 'resolved', label: 'Resolved' },
  ];

  // Sort options
  const sortOptions = [
    { value: 'updated_at', label: 'Recently Updated' },
    { value: 'closes_at', label: 'Closing Soon' },
    { value: 'created_at', label: 'Newly Created' },
    { value: 'volume', label: 'Highest Volume' },
  ];

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
  };

  const handleCategoryChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedCategory(e.target.value);
  };

  const handleStatusChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedStatus(e.target.value);
  };

  const handleProviderChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedProvider(e.target.value);
  };

  const handleSortByChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setSortBy(e.target.value);
  };

  const handleSortOrderChange = () => {
    setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
  };

  const handleExcludeResolvedChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const checked = event.target.checked;
    console.log('Exclude resolved changed to:', checked);
    setExcludeResolved(checked);
  };

  const handleClearFilters = () => {
    setSearchQuery('');
    setSelectedCategory('');
    setSelectedStatus('');
    setSelectedProvider('');
    setSortBy('updated_at');
    setSortOrder('desc');
    setExcludeResolved(false);
    setPagination(prev => ({ ...prev, page: 1 }));
  };

  const getActiveFiltersCount = () => {
    let count = 0;
    if (searchQuery) count++;
    if (selectedCategory) count++;
    if (selectedStatus) count++;
    if (selectedProvider) count++;
    if (excludeResolved) count++;
    return count;
  };
  return (
    <div className="p-6">
      <h1 className="text-3xl font-bold mb-6">Markets</h1>
      <MarketFilters
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        selectedCategory={selectedCategory}
        setSelectedCategory={setSelectedCategory}
        availableCategories={availableCategories}
        selectedStatus={selectedStatus}
        setSelectedStatus={setSelectedStatus}
        statusOptions={statusOptions}
        selectedProvider={selectedProvider}
        setSelectedProvider={setSelectedProvider}
        availableProviders={availableProviders}
        excludeResolved={excludeResolved}
        setExcludeResolved={setExcludeResolved}
        sortBy={sortBy}
        setSortBy={setSortBy}
        sortOrder={sortOrder}
        setSortOrder={setSortOrder}
        handleClearFilters={handleClearFilters}
        getActiveFiltersCount={getActiveFiltersCount}
        breakout1h={breakout1h}
        setBreakout1h={setBreakout1h}
        breakout6h={breakout6h}
        setBreakout6h={setBreakout6h}
      />
      {error && (
        <div className="bg-destructive text-destructive-foreground px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}
      {loading ? (
        <div className="flex justify-center my-8">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
            {markets.map((market) => (
              <Link 
                href={`/markets/${market.id}`} 
                key={market.id}
                className="block"
              >
                <div className="card p-4 h-full hover:shadow-xl transition-shadow duration-200">
                  <div className="flex justify-between items-start mb-2">
                    <div className="flex flex-wrap gap-2">
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                        market.status === 'open' 
                          ? 'bg-green-900 text-green-100' 
                          : market.status === 'resolved' 
                          ? 'bg-blue-900 text-blue-100' 
                          : 'bg-gray-700 text-gray-200'
                      }`}>
                        {market.status.toUpperCase()}
                      </span>
                      <span className="px-2 py-1 text-xs font-medium rounded-full bg-purple-900 text-purple-100">
                        VOL: {formatCurrency(calculateMarketVolume(market))}
                      </span>
                    </div>
                    <span className="text-sm text-muted-foreground">{market.provider}</span>
                  </div>
                  
                  <h2 className="text-xl font-semibold mb-2">{market.name}</h2>
                  
                  <p className="text-muted-foreground mb-4 line-clamp-3">{market.question}</p>
                  
                  {market.outcomes && market.outcomes.length > 0 && (
                    <div className="mb-4">
                      <h3 className="font-medium mb-2">Outcomes:</h3>
                      <div className="space-y-2">
                        {market.outcomes.slice(0, 3).map((outcome) => (
                          <div key={outcome.id} className="flex justify-between items-center">
                            <span>{outcome.name}</span>
                            <span className="font-medium">{Math.round(outcome.probability * 100)}%</span>
                          </div>
                        ))}
                        {market.outcomes.length > 3 && (
                          <div className="text-sm text-muted-foreground mt-1">
                            +{market.outcomes.length - 3} more outcomes
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                  
                  <div className="flex justify-between text-sm text-muted-foreground mt-2">
                    <div>Closes: {formatDate(market.closes_at)}</div>
                    <div>{market.category || 'Uncategorized'}</div>
                  </div>
                  {/* Volatility mini-stats */}
                  <MarketVolatility volatility={market.volatility} compact />
                </div>
              </Link>
            ))}
          </div>
          
          {/* Pagination */}
          <div className="flex flex-col items-center">
            <div className="text-sm text-muted-foreground mb-2">
              Total items: {pagination.total} | Page {pagination.page} of {pagination.pages}
            </div>
            
            <div className="flex justify-center space-x-2">
              <button
                onClick={() => handlePageChange(pagination.page - 1)}
                disabled={pagination.page === 1}
                className="px-4 py-2 rounded bg-secondary text-secondary-foreground disabled:opacity-50"
              >
                Previous
              </button>
              
              <span className="px-4 py-2">
                Page {pagination.page} of {pagination.pages}
              </span>
              
              <button
                onClick={() => handlePageChange(pagination.page + 1)}
                disabled={pagination.page === pagination.pages}
                className="px-4 py-2 rounded bg-secondary text-secondary-foreground disabled:opacity-50"
              >
                Next
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
