'use client';

import Link from 'next/link';
// import { useSession, signIn, signOut } from 'next-auth/react';
import WalletBalance from './WalletBalance';

export default function Header() {
  // const { data: session, status } = useSession();
  // const loading = status === 'loading';

  return (
    <header className="bg-white shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex">
            <div className="flex-shrink-0 flex items-center">
              <Link href="/" className="text-gray-900 text-2xl font-bold">
                Predictions
              </Link>
            </div>
            <nav className="hidden sm:ml-6 sm:flex sm:space-x-8">
              <Link
                href="/markets"
                className="border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700 inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium"
              >
                Markets
              </Link>
              <Link
                href="/tracked-markets"
                className="border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700 inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium"
              >
                Tracked Markets
              </Link>
              <Link
                href="/positions"
                className="border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700 inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium"
              >
                Positions
              </Link>
              <Link href="/opportunities" className="border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700 inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium">
                Opportunities
              </Link>
              <Link
                href="/news"
                className="border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700 inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium"
              >
                News
              </Link>
            </nav>
          </div>
          <div className="hidden sm:ml-6 sm:flex sm:items-center">
           
              <div className="flex items-center space-x-4">
                <WalletBalance />
              </div>
          </div>
        </div>
      </div>
    </header>
  );
}
