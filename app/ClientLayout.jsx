'use client';

import { StateProvider } from './store';
import Header from './components/Header';
import { AuthProvider, AuthGuard } from './components/WalletAuth';

export default function ClientLayout({ children }) {
  return (
    <StateProvider>
      <AuthProvider>
        <AuthGuard>
          <Header />
          <main>{children}</main>
        </AuthGuard>
      </AuthProvider>
    </StateProvider>
  );
}
