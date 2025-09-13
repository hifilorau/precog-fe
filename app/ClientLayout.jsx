'use client';

import { StateProvider } from './store';
import Header from './components/Header';
import { usePeriodicPositions } from '@/hooks/usePeriodicPositions';
import { usePeriodicBalance } from '@/hooks/usePeriodicBalance';
import { AuthProvider, AuthGuard } from './components/WalletAuth';

function GlobalPollers() {
  // Must be rendered inside StateProvider so the hooks can access context
  usePeriodicPositions(60000, true)
  usePeriodicBalance(30000, true)
  return null
}

export default function ClientLayout({ children }) {
  return (
    <StateProvider>
      <AuthProvider>
        <AuthGuard>
          <Header />
          <GlobalPollers />
          <main>{children}</main>
        </AuthGuard>
      </AuthProvider>
    </StateProvider>
  );
}
