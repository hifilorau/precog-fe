'use client';

const ErrorDisplay = ({ error }) => {
  if (!error) return null;

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
        Error loading opportunities: {error}
      </div>
    </div>
  );
};

export default ErrorDisplay;
