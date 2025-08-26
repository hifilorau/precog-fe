'use client'

import { useEffect, useCallback } from 'react'
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
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/wallet/balance/usdc`,
        {
          headers: {
            'Content-Type': 'application/json',
          },
        }
      )

      if (!response.ok) {
        console.warn('Failed to fetch wallet balance:', response.statusText)
        return
      }

      const data = await response.json()
      updateState({ balance: data.balance })
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