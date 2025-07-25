'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import OpportunityFilters from './components/OpportunityFilters';
import OpportunityTable from './components/OpportunityTable';
import LoadMoreButton from './components/LoadMoreButton';
import ErrorDisplay from './components/ErrorDisplay';

const OpportunitiesPage = () => {
  const [opportunities, setOpportunities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [filters, setFilters] = useState({
    status: 'active',
    source: '',
    min_score: '',
    max_score: '',
    min_price: '',
    max_price: '',
    min_movement: '',
    max_movement: '',
    min_volume: '50000' // Default minimum volume of $50,000
  });
  const [sortBy, setSortBy] = useState('created_at');
  const [sortOrder, setSortOrder] = useState('desc');
  const isLoadingMore = useRef(false);

  const limit = 20;

  // Build query parameters from filters
  const buildQueryParams = useCallback((filters, page = 0) => {
    // Convert percentage inputs to decimals for price filters
    const convertToDecimal = (value) => {
      if (value === '' || value === null || value === undefined) return undefined;
      // If the value is a string that looks like a percentage (e.g., '35'), convert to decimal
      if (typeof value === 'string' && /^\d+(\.\d+)?%?$/.test(value)) {
        const numValue = parseFloat(value.replace('%', ''));
        return isNaN(numValue) ? undefined : (numValue / 100).toFixed(4);
      }
      return value;
    };

    const params = new URLSearchParams({
      limit: limit.toString(),
      offset: (page * limit).toString(),
      sort_by: sortBy,
      sort_order: sortOrder,
      ...(filters.status && { status: filters.status }),
      ...(filters.source && { source: filters.source }),
      ...(filters.min_score && { min_score: filters.min_score }),
      ...(filters.max_score && { max_score: filters.max_score }),
      ...(filters.min_price !== undefined && filters.min_price !== '' && { 
        min_price: convertToDecimal(filters.min_price) 
      }),
      ...(filters.max_price !== undefined && filters.max_price !== '' && { 
        max_price: convertToDecimal(filters.max_price) 
      }),
      ...(filters.min_movement && { min_movement: filters.min_movement }),
      ...(filters.max_movement && { max_movement: filters.max_movement }),
      ...(filters.min_volume && { min_volume: filters.min_volume }),
      ...(filters.max_volume && { max_volume: filters.max_volume })
    });
    return params;
  }, [sortBy, sortOrder]);

  // Separate function for initial load (no page dependency)
  const loadInitialOpportunities = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      const params = buildQueryParams(filters, 0);

      const response = await fetch(`http://localhost:8000/api/v1/opportunities/?${params}`);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      
      setOpportunities(data);
      setPage(1);
      setHasMore(data.length === limit);
    } catch (err) {
      setError(err.message);
      console.error('Error fetching opportunities:', err);
    } finally {
      setLoading(false);
    }
  }, [buildQueryParams, filters, limit]);

  // Separate function for loading more (uses current page state)
  const loadMoreOpportunities = useCallback(async () => {
    if (isLoadingMore.current || !hasMore) return;
    
    try {
      isLoadingMore.current = true;
      setError(null);
      
      const nextPage = page + 1;
      const params = buildQueryParams(filters, nextPage);

      const response = await fetch(`http://localhost:8000/api/v1/opportunities/?${params}`);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      
      setOpportunities(prev => [...prev, ...data]);
      setPage(nextPage);
      setHasMore(data.length === limit);
    } catch (err) {
      setError(err.message);
      console.error('Error loading more opportunities:', err);
    } finally {
      setLoading(false);
      isLoadingMore.current = false;
    }
  }, [buildQueryParams, page, limit, filters, hasMore]);

  // Reset page and reload when filters, sort, or sort order changes
  useEffect(() => {
    const handler = setTimeout(() => {
      loadInitialOpportunities();
    }, 300); // Debounce to avoid too many API calls
    
    return () => clearTimeout(handler);
  }, [filters, sortBy, sortOrder, loadInitialOpportunities]);

  const loadMore = () => {
    loadMoreOpportunities();
  };

  // Handle filter changes
  const handleFilterChange = (key, value) => {
    // Convert empty strings to null for number fields to avoid sending empty strings to the API
    const parsedValue = (['min_score', 'max_score', 'min_price', 'max_price', 'min_movement', 'max_movement', 'min_volume', 'max_volume'].includes(key) && value === '') 
      ? null 
      : value;
      
    setFilters(prev => ({
      ...prev,
      [key]: parsedValue
    }));
    setPage(0); // Reset to first page when filters change
  };

  // Reset all filters to default values
  const resetFilters = () => {
    setFilters({
      status: 'active',
      source: '',
      min_score: '',
      max_score: '',
      min_price: '',
      max_price: '',
      min_movement: '',
      max_movement: '',
      min_volume: '50000',
      max_volume: ''
    });
  };

  const handleSort = (field, order) => {
    setSortBy(field);
    setSortOrder(order);
  };

  if (error) {
    return <ErrorDisplay error={error} />;
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Market Opportunities</h1>
        <button
          onClick={resetFilters}
          className="px-4 py-2 text-sm text-gray-600 hover:text-gray-900 border border-gray-300 rounded-md hover:bg-gray-50"
        >
          Reset Filters
        </button>
      </div>
      
      <OpportunityFilters 
        filters={filters} 
        onFilterChange={handleFilterChange} 
      />

      <OpportunityTable 
        opportunities={opportunities}
        loading={loading}
        sortBy={sortBy}
        sortOrder={sortOrder}
        onSort={handleSort}
      />

      <LoadMoreButton 
        hasMore={hasMore}
        loading={loading}
        onLoadMore={loadMore}
      />
    </div>
  );
};

export default OpportunitiesPage;