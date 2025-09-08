'use client';

import Link from 'next/link';
import { useState } from 'react';
// import { useSession, signIn, signOut } from 'next-auth/react';
import WalletBalance from './WalletBalance';
import CryptoTicker from './CryptoTicker';
import { WalletConnect } from './WalletAuth';
import { Menu } from 'lucide-react';
import MobileSideMenu from './MobileSideMenu';

export default function Header() {
  // const { data: session, status } = useSession();
  // const loading = status === 'loading';
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <header className="bg-white shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex items-center">
            {/* Mobile menu button */}
            <button
              className="sm:hidden mr-2 p-2 rounded hover:bg-gray-100"
              aria-label="Open menu"
              aria-expanded={menuOpen}
              onClick={() => setMenuOpen(true)}
            >
              <Menu className="h-5 w-5" />
            </button>
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
                <WalletConnect />
                <WalletBalance />
              </div>
          </div>
        </div>
      </div>
      {/* Mobile Side Menu */}
      <MobileSideMenu open={menuOpen} onClose={() => setMenuOpen(false)} />
      <CryptoTicker />
    </header>
  );
}
