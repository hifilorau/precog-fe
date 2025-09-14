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
    <header className="bg-peach-card">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex items-center">
            {/* Mobile menu button */}
            <button
              className="sm:hidden mr-2 p-2 rounded hover:bg-[#fff2ec]"
              aria-label="Open menu"
              aria-expanded={menuOpen}
              onClick={() => setMenuOpen(true)}
            >
              <Menu className="h-5 w-5" />
            </button>
            <div className="flex-shrink-0 flex items-center">
              <Link href="/" className="text-peach-heading text-2xl font-bold">
                Predictions
              </Link>
            </div>
            <nav className="hidden sm:ml-6 sm:flex sm:space-x-8">
              <Link
                href="/markets"
                className="border-transparent text-peach-muted hover:text-peach-heading inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium hover:border-peach"
              >
                Markets
              </Link>
              <Link
                href="/tracked-markets"
                className="border-transparent text-peach-muted hover:text-peach-heading inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium hover:border-peach"
              >
                Tracked Markets
              </Link>
              <Link
                href="/positions"
                className="border-transparent text-peach-muted hover:text-peach-heading inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium hover:border-peach"
              >
                Positions
              </Link>
              <Link href="/opportunities" className="border-transparent text-peach-muted hover:text-peach-heading inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium hover:border-peach">
                Opportunities
              </Link>
              <Link
                href="/news"
                className="border-transparent text-peach-muted hover:text-peach-heading inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium hover:border-peach"
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
