'use client'

import { useEffect, useRef } from 'react'
import Link from 'next/link'
import { X } from 'lucide-react'
import { WalletConnect } from './WalletAuth'
import WalletBalance from './WalletBalance'

export default function MobileSideMenu({ open, onClose }) {
  const panelRef = useRef(null)

  // Close on ESC
  useEffect(() => {
    if (!open) return
    const onKey = (e) => {
      if (e.key === 'Escape') onClose?.()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  // Prevent body scroll when open
  useEffect(() => {
    if (!open) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = prev }
  }, [open])

  return (
    <div aria-hidden={!open} className="sm:hidden">
      {/* Overlay */}
      <div
        onClick={onClose}
        className={`fixed inset-0 bg-black/40 transition-opacity ${open ? 'opacity-100' : 'pointer-events-none opacity-0'} z-50`}
      />

      {/* Panel */}
      <aside
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label="Main navigation"
        className={`fixed inset-y-0 left-0 z-50 w-72 max-w-[85vw] bg-peach-card shadow-xl soft-card transition-transform duration-200 ease-in-out ${open ? 'translate-x-0' : '-translate-x-full'}`}
      >
        <div className="flex items-center justify-between px-4 h-14 soft-card">
          <Link href="/" className="font-semibold text-lg text-peach-heading">Predictions</Link>
          <button
            onClick={onClose}
            aria-label="Close menu"
            className="p-2 rounded hover:bg-[#fff2ec]"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Wallet actions */}
        <div className="px-4 py-3 soft-card">
          <div className="flex items-center justify-between">
            <WalletConnect />
          </div>
          <div className="mt-3">
            <WalletBalance />
          </div>
        </div>

        {/* Nav links */}
        <nav className="p-2">
          {[
            { href: '/markets', label: 'Markets' },
            { href: '/tracked-markets', label: 'Tracked Markets' },
            { href: '/positions', label: 'Positions' },
            { href: '/opportunities', label: 'Opportunities' },
            { href: '/news', label: 'News' },
          ].map((item) => (
            <Link
              key={item.href}
              href={item.href}
              onClick={onClose}
              className="block px-3 py-2 rounded hover:bg-[#fff2ec] text-peach-heading"
            >
              {item.label}
            </Link>
          ))}
        </nav>
      </aside>
    </div>
  )
}
