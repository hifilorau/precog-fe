import Link from "next/link";

export default function Home() {
  return (
    <div className="min-h-screen flex flex-col">
      <main className="flex-grow flex flex-col items-center justify-center p-8 text-center">
        <div className="max-w-4xl">
          <h1 className="text-5xl font-bold mb-6 bg-clip-text text-transparent bg-gradient-to-r from-blue-500 to-purple-600">
            Prediction Markets Explorer
          </h1>
          
          <p className="text-xl mb-8 max-w-2xl mx-auto">
            Explore real-time prediction markets data, track probabilities, and analyze market trends across multiple providers.
          </p>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
            <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md">
              <h2 className="text-xl font-bold mb-3">Explore Markets</h2>
              <p className="mb-4 text-gray-600 dark:text-gray-300">
                Browse through hundreds of prediction markets across various categories.
              </p>
            </div>
            
            <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md">
              <h2 className="text-xl font-bold mb-3">Track Probabilities</h2>
              <p className="mb-4 text-gray-600 dark:text-gray-300">
                Follow price movements and probability changes over time with interactive charts.
              </p>
            </div>
            
            <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md">
              <h2 className="text-xl font-bold mb-3">Market Insights</h2>
              <p className="mb-4 text-gray-600 dark:text-gray-300">
                Get detailed information and insights on market performance and outcome probabilities.
              </p>
            </div>
          </div>
          
          <Link 
            href="/markets"
            className="px-8 py-3 bg-blue-600 text-white font-medium rounded-md hover:bg-blue-700 transition-colors text-lg"
          >
            Explore Markets
          </Link>
        </div>
      </main>
      
      <footer className="py-6 text-center text-gray-500 text-sm">
        <p>Prediction Markets Explorer © {new Date().getFullYear()}</p>
      </footer>
    </div>
  );
}
