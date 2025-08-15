'use client';

import { StateProvider } from './store';
import Header from './components/Header';

export default function ClientLayout({ children }) {
  return (
    <StateProvider>
      <Header />
      <main>{children}</main>
    </StateProvider>
  );
}
