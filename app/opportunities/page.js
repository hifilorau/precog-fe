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
    min_score: ''
  });
  const [sortBy, setSortBy] = useState('created_at');
  const [sortOrder, setSortOrder] = useState('desc');
  const isLoadingMore = useRef(false);

  const limit = 20;

  // Separate function for initial load (no page dependency)
  const loadInitialOpportunities = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      const params = new URLSearchParams({
        limit: limit.toString(),
        offset: '0',
        sort_by: sortBy,
        sort_order: sortOrder,
        ...(filters.status && { status: filters.status }),
        ...(filters.source && { source: filters.source }),
        ...(filters.min_score && { min_score: filters.min_score })
      });

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
  }, [limit, sortBy, sortOrder, filters]);

  // Separate function for loading more (uses current page state)
  const loadMoreOpportunities = useCallback(async () => {
    // Prevent multiple simultaneous calls
    if (isLoadingMore.current || loading) {
      return;
    }
    
    try {
      isLoadingMore.current = true;
      setLoading(true);
      
      const nextPage = page + 1;
      const offset = (nextPage - 1) * limit;
      
      const params = new URLSearchParams({
        limit: limit.toString(),
        offset: offset.toString(),
        sort_by: sortBy,
        sort_order: sortOrder,
        ...(filters.status && { status: filters.status }),
        ...(filters.source && { source: filters.source }),
        ...(filters.min_score && { min_score: filters.min_score })
      });

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
  }, [page, limit, sortBy, sortOrder, filters, loading]);

  useEffect(() => {
    loadInitialOpportunities();
  }, [filters, sortBy, sortOrder, loadInitialOpportunities]);

  const loadMore = () => {
    loadMoreOpportunities();
  };

  const handleFilterChange = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }));
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
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Market Opportunities</h1>
        <p className="text-gray-600">Track and analyze prediction market opportunities</p>
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