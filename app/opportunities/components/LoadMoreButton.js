'use client';

const LoadMoreButton = ({ hasMore, loading, onLoadMore }) => {
  if (!hasMore) {
    return null;
  }

  return (
    <div className="mt-6 text-center">
      <button
        onClick={onLoadMore}
        disabled={loading}
        className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
      >
        {loading ? 'Loading...' : 'Load More'}
      </button>
    </div>
  );
};

export default LoadMoreButton;
