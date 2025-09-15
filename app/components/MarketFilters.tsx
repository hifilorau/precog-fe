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
  const POPULAR = [
    'sports',
    'crypto',
    'elections',
    'middle east',
    'economy',
  ]

  const otherCategories = (availableCategories || [])
    .filter((c) => !POPULAR.includes(String(c).toLowerCase()))
    .sort((a, b) => a.localeCompare(b))

  return (
    <>
      <div className="flex flex-wrap items-center gap-4 mb-2">
        <input
          type="text"
          placeholder="Search markets..."
          className="w-64 px-3 py-2 border border-peach rounded-full text-sm bg-white text-peach-heading"
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
        />
        <div className="flex items-center gap-2">
          <input
            id="exclude-resolved"
            type="checkbox"
            className="w-4 h-4 text-primary bg-input border-peach rounded focus:ring-[#e08a6b]"
            checked={excludeResolved}
            onChange={e => setExcludeResolved(e.target.checked)}
          />
          <label htmlFor="exclude-resolved" className="text-sm text-peach-muted">
            Exclude 100% Resolved
          </label>
        </div>
        {/* Volatility Breakout Toggle Buttons */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            className={`px-3 py-1 rounded-full border text-xs font-semibold ${breakout1h ? 'btn-peach text-white border-peach' : 'bg-white border-peach text-peach-heading'}`}
            onClick={() => setBreakout1h(breakout1h ? null : true)}
          >
            1h Breakout
          </button>
          <button
            type="button"
            className={`px-3 py-1 rounded-full border text-xs font-semibold ${breakout6h ? 'btn-peach text-white border-peach' : 'bg-white border-peach text-peach-heading'}`}
            onClick={() => setBreakout6h(breakout6h ? null : true)}
          >
            6h Breakout
          </button>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleClearFilters}
            className={`text-sm px-4 py-2 rounded-full ${getActiveFiltersCount() > 0 ? 'btn-peach text-white' : 'soft-card text-peach-heading'}`}
            disabled={getActiveFiltersCount() === 0}
          >
            Clear Filters {getActiveFiltersCount() > 0 && `(${getActiveFiltersCount()})`}
          </button>
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mt-4">

        <div className="md:col-span-2">
          <div className="block text-sm font-medium text-peach-muted mb-1">Popular</div>
          <div className="flex flex-wrap gap-2">
            {POPULAR.map((cat) => {
              const label = cat.replace(/\b\w/g, (m) => m.toUpperCase())
              const selected = String(selectedCategory || '').toLowerCase() === cat
              return (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(selected ? '' : label)}
                  className={`px-3 py-1 rounded-full text-xs font-semibold ${selected ? 'btn-peach text-white' : 'bg-white text-peach-heading soft-card'}`}
                >
                  {label}
                </button>
              )
            })}
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-peach-muted mb-1">More Categories</label>
          <select
            className="w-full text-sm bg-white border border-peach rounded-full text-peach-heading"
            value={selectedCategory}
            onChange={e => setSelectedCategory(e.target.value)}
          >
            <option value="">All Categories</option>
            {otherCategories.map(category => (
              <option key={category} value={category}>{category}</option>
            ))}
          </select>
        </div>

        {/* Status and Provider temporarily commented out per request */}
        {/* <div>
          <label className="block text-sm font-medium text-muted-foreground mb-1">Status</label>
          <select className="w-full text-sm bg-input border border-border rounded-lg" value={selectedStatus} onChange={e => setSelectedStatus(e.target.value)}>
            {statusOptions.map(option => (<option key={option.value} value={option.value}>{option.label}</option>))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-muted-foreground mb-1">Provider</label>
          <select className="w-full text-sm bg-input border border-border rounded-lg" value={selectedProvider} onChange={e => setSelectedProvider(e.target.value)}>
            <option value="">All Providers</option>
            {availableProviders.map(provider => (<option key={provider} value={provider}>{provider}</option>))}
          </select>
        </div> */}

        <div>
          <label className="block text-sm font-medium text-muted-foreground mb-1">Sort By</label>
          <div className="flex gap-2">
            <select
              className="flex-grow text-sm bg-white border border-peach rounded-full text-peach-heading"
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
              className="p-2 soft-card rounded-full"
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
