import React from "react";

interface MarketFiltersProps {
  searchQuery: string;
  setSearchQuery: (v: string) => void;
  selectedCategory: string;
  setSelectedCategory: (v: string) => void;
  availableCategories: string[];
  selectedStatus: string;
  setSelectedStatus: (v: string) => void;
  statusOptions: { label: string; value: string }[];
  selectedProvider: string;
  setSelectedProvider: (v: string) => void;
  availableProviders: string[];
  excludeResolved: boolean;
  setExcludeResolved: (v: boolean) => void;
  sortBy: string;
  setSortBy: (v: string) => void;
  sortOrder: 'asc' | 'desc';
  setSortOrder: (v: 'asc' | 'desc') => void;
  handleClearFilters: () => void;
  getActiveFiltersCount: () => number;
  breakout1h: boolean | null;
  setBreakout1h: (v: boolean | null) => void;
  breakout6h: boolean | null;
  setBreakout6h: (v: boolean | null) => void;
}

const MarketFilters: React.FC<MarketFiltersProps> = ({
  searchQuery,
  setSearchQuery,
  selectedCategory,
  setSelectedCategory,
  availableCategories,
  selectedStatus,
  setSelectedStatus,
  statusOptions,
  selectedProvider,
  setSelectedProvider,
  availableProviders,
  excludeResolved,
  setExcludeResolved,
  sortBy,
  setSortBy,
  sortOrder,
  setSortOrder,
  handleClearFilters,
  getActiveFiltersCount,
  breakout1h,
  setBreakout1h,
  breakout6h,
  setBreakout6h,
}) => {
  return (
    <>
      <div className="flex flex-wrap items-center gap-4 mb-2">
        <input
          type="text"
          placeholder="Search markets..."
          className="w-64 px-3 py-2 border border-border rounded-lg text-sm"
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
        />
        <div className="flex items-center gap-2">
          <input
            id="exclude-resolved"
            type="checkbox"
            className="w-4 h-4 text-primary bg-input border-border rounded focus:ring-primary"
            checked={excludeResolved}
            onChange={e => setExcludeResolved(e.target.checked)}
          />
          <label htmlFor="exclude-resolved" className="text-sm text-muted-foreground">
            Exclude 100% Resolved
          </label>
        </div>
        {/* Volatility Breakout Toggle Buttons */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            className={`px-3 py-1 rounded-lg border text-xs font-semibold ${breakout1h ? 'bg-primary text-primary-foreground border-primary' : 'bg-input border-border text-muted-foreground'}`}
            onClick={() => setBreakout1h(breakout1h ? null : true)}
          >
            1h Breakout
          </button>
          <button
            type="button"
            className={`px-3 py-1 rounded-lg border text-xs font-semibold ${breakout6h ? 'bg-primary text-primary-foreground border-primary' : 'bg-input border-border text-muted-foreground'}`}
            onClick={() => setBreakout6h(breakout6h ? null : true)}
          >
            6h Breakout
          </button>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleClearFilters}
            className={`text-sm px-4 py-2 border rounded-lg ${getActiveFiltersCount() > 0 ? 'bg-primary text-primary-foreground' : 'border-border text-muted-foreground'}`}
            disabled={getActiveFiltersCount() === 0}
          >
            Clear Filters {getActiveFiltersCount() > 0 && `(${getActiveFiltersCount()})`}
          </button>
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mt-4">

        <div>
          <label className="block text-sm font-medium text-muted-foreground mb-1">Category</label>
          <select
            className="w-full text-sm bg-input border border-border rounded-lg"
            value={selectedCategory}
            onChange={e => setSelectedCategory(e.target.value)}
          >
            <option value="">All Categories</option>
            {availableCategories.map(category => (
              <option key={category} value={category}>{category}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-muted-foreground mb-1">Status</label>
          <select
            className="w-full text-sm bg-input border border-border rounded-lg"
            value={selectedStatus}
            onChange={e => setSelectedStatus(e.target.value)}
          >
            {statusOptions.map(option => (
              <option key={option.value} value={option.value}>{option.label}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-muted-foreground mb-1">Provider</label>
          <select
            className="w-full text-sm bg-input border border-border rounded-lg"
            value={selectedProvider}
            onChange={e => setSelectedProvider(e.target.value)}
          >
            <option value="">All Providers</option>
            {availableProviders.map(provider => (
              <option key={provider} value={provider}>{provider}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-muted-foreground mb-1">Sort By</label>
          <div className="flex gap-2">
            <select
              className="flex-grow text-sm bg-input border border-border rounded-lg"
              value={sortBy}
              onChange={e => setSortBy(e.target.value)}
            >
              <option value="updated_at">Recently Updated</option>
              <option value="created_at">Created</option>
              <option value="closes_at">Closes At</option>
              <option value="volume">Volume</option>
              <option value="volatility_1h">1h Volatility</option>
              <option value="volatility_6h">6h Volatility</option>
            </select>
            <button
              onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
              className="p-2 border border-border rounded-lg"
              title={sortOrder === 'asc' ? 'Ascending' : 'Descending'}
            >
              {sortOrder === 'asc' ? '↑' : '↓'}
            </button>
          </div>
        </div>
      </div>
    </>
  );
};

export default MarketFilters;
