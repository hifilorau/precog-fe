'use client'

import { useEffect, useCallback } from 'react'
import apiFetch from '@/lib/apiFetch'
import { useStateContext } from '@/app/store'

/**
 * Hook to periodically refresh USDC balance
 * @param {number} intervalMs - Refresh interval in milliseconds (default: 30 seconds)
 * @param {boolean} enabled - Whether periodic refresh is enabled (default: true)
 */
export function usePeriodicBalance(intervalMs = 30000, enabled = true) {
  const { updateState } = useStateContext()

  const fetchBalance = useCallback(async () => {
    try {
      // Ensure consistent API base. Expect NEXT_PUBLIC_API_URL to include '/api/v1'.
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1'
      const res = await apiFetch(`${apiUrl}/wallet/balance/usdc`)

      if (!res.ok) {
        console.warn('Failed to fetch wallet balance:', res.status, await res.text().catch(() => res.statusText))
        return
      }

      const data = await res.json()
      const numericBalance = typeof data?.balance === 'string' ? parseFloat(data.balance) : data?.balance
      if (Number.isFinite(numericBalance)) {
        updateState({ balance: numericBalance })
      }
    } catch (error) {
      console.error('Error fetching wallet balance:', error)
    }
  }, [updateState])

  useEffect(() => {
    if (!enabled) return

    // Fetch immediately on mount
    fetchBalance()

    // Set up periodic refresh
    const interval = setInterval(fetchBalance, intervalMs)

    return () => clearInterval(interval)
  }, [fetchBalance, intervalMs, enabled])

  return { fetchBalance }
}

export default usePeriodicBalance
