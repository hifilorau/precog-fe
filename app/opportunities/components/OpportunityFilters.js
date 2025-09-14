'use client';

import { useState } from 'react';

const OpportunityFilters = ({ filters, onFilterChange }) => {
  const [showAdvanced, setShowAdvanced] = useState(false);

  const handleFilterChange = (key, value) => {
    onFilterChange(key, value);
  };

  const toggleAdvanced = () => {
    setShowAdvanced(!showAdvanced);
  };

  return (
    <div className="rounded-2xl soft-card bg-peach-card p-6 mb-6">
      <h2 className="text-lg font-semibold text-peach-heading mb-4">Filters</h2>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <label className="block text-sm font-medium text-peach-muted mb-2">Status</label>
          <select
            value={filters.status}
            onChange={(e) => handleFilterChange('status', e.target.value)}
            className="w-full border border-peach rounded-full px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#e08a6b] bg-white"
          >
            <option value="">All Statuses</option>
            <option value="active">Active</option>
            <option value="in_progress">In Progress</option>
            <option value="completed">Completed</option>
            <option value="expired">Expired</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-peach-muted mb-2">Source</label>
          <select
            value={filters.source}
            onChange={(e) => handleFilterChange('source', e.target.value)}
            className="w-full border border-peach rounded-full px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#e08a6b] bg-white"
          >
            <option value="">All Sources</option>
            <option value="price_trend">Price Trend</option>
            <option value="news">News</option>
            <option value="llm_analysis">LLM Analysis</option>
            <option value="tipping_point">Tipping Point</option>
            <option value="manual">Manual</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-peach-muted mb-2">Min Score</label>
          <input
            type="number"
            min="0"
            max="1"
            step="0.1"
            value={filters.min_score || ''}
            onChange={(e) => handleFilterChange('min_score', e.target.value)}
            placeholder="0.0 - 1.0"
            className="w-full border border-peach rounded-full px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#e08a6b] bg-white"
          />
        </div>
        
        <div className="md:col-span-3 pt-2">
          <button 
            type="button"
            onClick={toggleAdvanced}
            className="text-sm text-peach-heading hover:opacity-80 focus:outline-none"
          >
            {showAdvanced ? 'Hide' : 'Show'} Advanced Filters
          </button>
        </div>
        
        {showAdvanced && (
          <>
            <div className="md:col-span-3 pt-2">
              <h3 className="text-sm font-medium text-peach-heading mb-2">Price Range</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs text-peach-muted mb-1">Min Price</label>
                  <input
                    type="number"
                    min="0"
                    max="1"
                    step="0.01"
                    value={filters.min_price || ''}
                    onChange={(e) => handleFilterChange('min_price', e.target.value)}
                    placeholder="0.00"
                    className="w-full border border-peach rounded-full px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#e08a6b] bg-white"
                  />
                </div>
                <div>
                  <label className="block text-xs text-peach-muted mb-1">Max Price</label>
                  <input
                    type="number"
                    min="0"
                    max="1"
                    step="0.01"
                    value={filters.max_price || ''}
                    onChange={(e) => handleFilterChange('max_price', e.target.value)}
                    placeholder="1.00"
                    className="w-full border border-peach rounded-full px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#e08a6b] bg-white"
                  />
                </div>
              </div>
            </div>
            
            <div className="md:col-span-3">
              <h3 className="text-sm font-medium text-peach-heading mb-2">Movement</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs text-peach-muted mb-1">Min Movement</label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={filters.min_movement || ''}
                    onChange={(e) => handleFilterChange('min_movement', e.target.value)}
                    placeholder="0.00"
                    className="w-full border border-peach rounded-full px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#e08a6b] bg-white"
                  />
                </div>
                <div>
                  <label className="block text-xs text-peach-muted mb-1">Max Movement</label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={filters.max_movement || ''}
                    onChange={(e) => handleFilterChange('max_movement', e.target.value)}
                    placeholder="Any"
                    className="w-full border border-peach rounded-full px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#e08a6b] bg-white"
                  />
                </div>
              </div>
            </div>
            
            <div className="md:col-span-3">
              <h3 className="text-sm font-medium text-peach-heading mb-2">Volume (USD)</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs text-peach-muted mb-1">Min Volume</label>
                  <input
                    type="number"
                    min="0"
                    step="1000"
                    value={filters.min_volume || ''}
                    onChange={(e) => handleFilterChange('min_volume', e.target.value)}
                    placeholder="$0"
                    className="w-full border border-peach rounded-full px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#e08a6b] bg-white"
                  />
                </div>
                <div>
                  <label className="block text-xs text-peach-muted mb-1">Max Volume</label>
                  <input
                    type="number"
                    min="0"
                    step="1000"
                    value={filters.max_volume || ''}
                    onChange={(e) => handleFilterChange('max_volume', e.target.value)}
                    placeholder="Any"
                    className="w-full border border-peach rounded-full px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#e08a6b] bg-white"
                  />
                </div>
              </div>
            </div>
            
            <div className="md:col-span-3">
              <h3 className="text-sm font-medium text-peach-heading mb-2">Score</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs text-peach-muted mb-1">Min Score</label>
                  <input
                    type="number"
                    min="0"
                    max="1"
                    step="0.1"
                    value={filters.min_score || ''}
                    onChange={(e) => handleFilterChange('min_score', e.target.value)}
                    placeholder="0.0"
                    className="w-full border border-peach rounded-full px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#e08a6b] bg-white"
                  />
                </div>
                <div>
                  <label className="block text-xs text-peach-muted mb-1">Max Score</label>
                  <input
                    type="number"
                    min="0"
                    max="1"
                    step="0.1"
                    value={filters.max_score || ''}
                    onChange={(e) => handleFilterChange('max_score', e.target.value)}
                    placeholder="1.0"
                    className="w-full border border-peach rounded-full px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#e08a6b] bg-white"
                  />
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default OpportunityFilters;
