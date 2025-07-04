'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Market, Outcome } from '@/lib/types/markets';
import { marketApi } from '@/lib/services/api';

export default function MarketsPage() {
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
    
    router.push(`/markets?${params.toString()}`);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router]);  // We're using eslint-disable to avoid dependency array changes
  
  // Debounced search function
  useEffect(() => {
    const timer = setTimeout(() => {
      if (pagination.page !== 1) {
        setPagination(prev => ({ ...prev, page: 1 })); // Reset to page 1 when filters change
      } else {
        updateQueryParams();
      }
    }, 500);
    
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    // Keep a consistent order in all dependency arrays
    searchQuery,
    selectedCategory,
    selectedStatus,
    selectedProvider,
    excludeResolved,
    sortBy,
    sortOrder,
    pagination.page,
    pagination.limit,
    // updateQueryParams removed from deps to prevent array size changes
  ]);
  
  // Reset to page 1 when filters change
  useEffect(() => {
    if (pagination.page !== 1) {
      updateQueryParams();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    // Keep a consistent order in all dependency arrays
    pagination.page,
    pagination.limit,
    excludeResolved,
    // updateQueryParams removed from deps to prevent array size changes
  ]);

  // Fetch markets with filters
  useEffect(() => {
    const fetchMarkets = async () => {
      try {
        setLoading(true);
        // Logging the API request parameters to debug
        const apiParams = {
          limit: pagination.limit,
          skip: (pagination.page - 1) * pagination.limit,
          include_outcomes: true,
          include_price_history: false,
          search: searchQuery || undefined,
          category: selectedCategory || undefined,
          status: selectedStatus || undefined,
          provider: selectedProvider || undefined,
          sort_by: sortBy === 'volume' ? 'updated_at' : sortBy, // Backend might not support volume sorting correctly
          sort_order: sortOrder,
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
        
        let filteredItems = response.items;
        
        // Debug: Log first few markets and their outcomes
        console.log('First few markets before filtering:', response.items.slice(0, 2).map((m: Market) => ({
          id: m.id,
          name: m.name,
          outcomes: m.outcomes?.map((o: Outcome) => ({ name: o.name, probability: o.probability })) || []
        })));
        
        // Client-side filtering for 100% resolved markets
        console.log('Initial items from API:', filteredItems.length);
        
        if (excludeResolved) {
          console.log('Exclude resolved is active');
          const beforeCount = filteredItems.length;
          
          const resolvedIds: string[] = [];
          
          filteredItems = filteredItems.filter((market: Market) => {
            // Skip markets without outcomes
            if (!market.outcomes || market.outcomes.length === 0) {
              return true;
            }
            
            // Check if any outcome has 100% or near 100% probability
            const hasResolvedOutcome = market.outcomes.some((outcome: Outcome) => {
              const prob = outcome.probability;
              // Check for different probability formats and near-100% values
              const isResolved = (
                // For probabilities stored as percentages (0-100)
                (typeof prob === 'number' && prob >= 98.5) || 
                // For probabilities stored as decimals (0-1)
                (typeof prob === 'number' && prob <= 1.0 && prob >= 0.985)
              );
              
              if (isResolved) {
                resolvedIds.push(market.id);
              }
              
              return isResolved;
            });
            
            // Keep markets that don't have any resolved outcomes
            return !hasResolvedOutcome;
          });
          
          console.log(`Filtered out ${beforeCount - filteredItems.length} resolved markets, ${filteredItems.length} remaining`);
          if (resolvedIds.length > 0) {
            console.log('Filtered out market IDs:', resolvedIds);
          }
        } else {
          console.log('Exclude resolved is NOT active - should show all markets');
        }
        
        // Client-side sorting for volume if needed
        if (sortBy === 'volume') {
          filteredItems = filteredItems.sort((a: Market, b: Market) => {
            // Calculate total volume for market a
            const volumeA = a.outcomes?.reduce((sum: number, outcome: Outcome) => {
              const latestPrice = outcome.price_history?.[outcome.price_history.length - 1];
              // Handle null values in volume
              const volume = latestPrice && typeof latestPrice.volume === 'number' ? latestPrice.volume : 0;
              return sum + volume;
            }, 0) || 0;
            
            // Calculate total volume for market b
            const volumeB = b.outcomes?.reduce((sum: number, outcome: Outcome) => {
              const latestPrice = outcome.price_history?.[outcome.price_history.length - 1];
              // Handle null values in volume
              const volume = latestPrice && typeof latestPrice.volume === 'number' ? latestPrice.volume : 0;
              return sum + volume;
            }, 0) || 0;
            
            // Sort based on volume and order
            return sortOrder === 'asc' ? Number(volumeA) - Number(volumeB) : Number(volumeB) - Number(volumeA);
          });
        }
        
        // Store the original API pagination metadata first
        const apiTotal = response.total;
        const apiPages = response.pages;
        const apiLimit = response.limit;
        
        console.log('API Pagination Metadata:', {
          total: apiTotal, 
          page: response.page,
          pages: apiPages, 
          limit: apiLimit
        });
        
        // Use original API pagination when no client-side filtering is needed
        // This ensures we show correct pagination for the full dataset from the API
        if (!excludeResolved && sortBy !== 'volume') {
          // Use the API's pagination directly when no client-side filtering is needed
          setMarkets(filteredItems);
          
          // Use the API's pagination metadata
          setPagination({
            total: apiTotal,
            page: pagination.page,
            pages: apiPages,
            limit: pagination.limit,
          });
        } else {
          // When client-side filtering is applied, we need to calculate pagination ourselves
          console.log('Applying client-side filtering/sorting and pagination');
          
          // Calculate actual pagination values based on filtered results
          const totalItems = filteredItems.length;
          const totalPages = Math.ceil(totalItems / pagination.limit);
          const currentPage = Math.min(pagination.page, totalPages || 1);
          
          // Apply client-side pagination to the filtered items
          const startIndex = (currentPage - 1) * pagination.limit;
          const endIndex = startIndex + pagination.limit;
          const paginatedItems = filteredItems.slice(startIndex, endIndex);
          
          console.log('Client-side Pagination:', { 
            total: totalItems, 
            page: currentPage, 
            pages: totalPages, 
            limit: pagination.limit,
            startIndex,
            endIndex,
            itemsInCurrentPage: paginatedItems.length
          });
          
          // Set state for client-side rendering
          setMarkets(paginatedItems);
          
          // Update pagination with client-side values
          setPagination({
            total: totalItems,
            page: currentPage,
            pages: totalPages || 1, // Ensure at least one page
            limit: pagination.limit,
          });
        }
        
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
    pagination.page,
    pagination.limit
  ]);

  const handlePageChange = (newPage: number) => {
    if (newPage > 0 && newPage <= pagination.pages) {
      setPagination((prev) => ({ ...prev, page: newPage }));
    }
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleString();
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
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-6">Prediction Markets</h1>
      
      {/* Search and Filter Section */}
      <div className="bg-white shadow-md rounded-lg p-4 mb-6">
        <div className="flex flex-col md:flex-row md:items-center gap-4 mb-4">
          {/* Search */}
          <div className="flex-grow">
            <div className="relative">
              <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                <svg className="w-4 h-4 text-gray-500" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 20 20">
                  <path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="m19 19-4-4m0-7A7 7 0 1 1 1 8a7 7 0 0 1 14 0Z"/>
                </svg>
              </div>
              <input
                type="search"
                className="block w-full p-2.5 pl-10 text-sm border border-gray-300 rounded-lg"
                placeholder="Search markets..."
                value={searchQuery}
                onChange={handleSearchChange}
              />
            </div>
          </div>

          {/* Exclude Resolved Checkbox */}
          <div className="flex items-center gap-2">
            <input
              id="exclude-resolved"
              type="checkbox"
              className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500"
              checked={excludeResolved}
              onChange={handleExcludeResolvedChange}
            />
            <label htmlFor="exclude-resolved" className="text-sm text-gray-700">
              Exclude 100% Resolved
            </label>
          </div>

          {/* Filter Toggle */}
          <div className="flex items-center gap-2">
            <button 
              onClick={handleClearFilters}
              className={`text-sm px-4 py-2 border rounded-lg ${getActiveFiltersCount() > 0 ? 'bg-blue-500 text-white' : 'border-gray-300 text-gray-500'}`}
              disabled={getActiveFiltersCount() === 0}
            >
              Clear Filters {getActiveFiltersCount() > 0 && `(${getActiveFiltersCount()})`}
            </button>
          </div>
        </div>

        {/* Filters Row */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {/* Category Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
            <select
              className="w-full text-sm border-gray-300 rounded-lg"
              value={selectedCategory}
              onChange={handleCategoryChange}
            >
              <option value="">All Categories</option>
              {availableCategories.map(category => (
                <option key={category} value={category}>{category}</option>
              ))}
            </select>
          </div>

          {/* Status Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
            <select
              className="w-full text-sm border-gray-300 rounded-lg"
              value={selectedStatus}
              onChange={handleStatusChange}
            >
              {statusOptions.map(option => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </select>
          </div>

          {/* Provider Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Provider</label>
            <select
              className="w-full text-sm border-gray-300 rounded-lg"
              value={selectedProvider}
              onChange={handleProviderChange}
            >
              <option value="">All Providers</option>
              {availableProviders.map(provider => (
                <option key={provider} value={provider}>{provider}</option>
              ))}
            </select>
          </div>

          {/* Sort Options */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Sort By</label>
            <div className="flex gap-2">
              <select
                className="flex-grow text-sm border-gray-300 rounded-lg"
                value={sortBy}
                onChange={handleSortByChange}
              >
                {sortOptions.map(option => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </select>
              <button 
                onClick={handleSortOrderChange}
                className="p-2 border border-gray-300 rounded-lg"
                title={sortOrder === 'asc' ? 'Ascending' : 'Descending'}
              >
                {sortOrder === 'asc' ? '↑' : '↓'}
              </button>
            </div>
          </div>
        </div>
      </div>
      
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}
      
      {loading ? (
        <div className="flex justify-center my-8">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
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
                <div className="border rounded-lg shadow-lg p-4 h-full hover:shadow-xl transition-shadow duration-200">
                  <div className="flex justify-between items-start mb-2">
                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                      market.status === 'open' 
                        ? 'bg-green-100 text-green-800' 
                        : market.status === 'resolved' 
                        ? 'bg-blue-100 text-blue-800' 
                        : 'bg-gray-100 text-gray-800'
                    }`}>
                      {market.status.toUpperCase()}
                    </span>
                    <span className="text-sm text-gray-500">{market.provider}</span>
                  </div>
                  
                  <h2 className="text-xl font-semibold mb-2">{market.name}</h2>
                  
                  <p className="text-gray-600 mb-4 line-clamp-3">{market.question}</p>
                  
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
                          <div className="text-sm text-gray-500 mt-1">
                            +{market.outcomes.length - 3} more outcomes
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                  
                  <div className="flex justify-between text-sm text-gray-500 mt-2">
                    <div>Closes: {formatDate(market.closes_at)}</div>
                    <div>{market.category || 'Uncategorized'}</div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
          
          {/* Pagination */}
          {/* Always show pagination controls - for debugging */}
          <div className="flex flex-col items-center">
            {/* Debug information */}
            <div className="text-sm text-gray-500 mb-2">
              Debug: Total items: {pagination.total} | Pages: {pagination.pages} | Current page: {pagination.page} | Limit: {pagination.limit}
            </div>
            
            <div className="flex justify-center space-x-2">
              <button
                onClick={() => handlePageChange(pagination.page - 1)}
                disabled={pagination.page === 1}
                className="px-4 py-2 rounded bg-gray-200 disabled:opacity-50"
              >
                Previous
              </button>
              
              <span className="px-4 py-2">
                Page {pagination.page} of {pagination.pages}
              </span>
              
              <button
                onClick={() => handlePageChange(pagination.page + 1)}
                disabled={pagination.page === pagination.pages}
                className="px-4 py-2 rounded bg-gray-200 disabled:opacity-50"
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
