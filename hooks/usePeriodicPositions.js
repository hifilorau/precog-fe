'use client'

import { useEffect, useCallback, useRef } from 'react'
import apiFetch from '@/lib/apiFetch'
import { useStateContext } from '@/app/store'

// Lightweight dedupe similar to PositionsTable to avoid near-duplicate entries
const canonicalKey = (p) => {
  return (
    p?.id || `${p?.market?.slug || p?.slug || p?.market?.id || 'm'}|${p?.outcome_id ?? p?.outcomeIndex ?? p?.outcome?.id ?? p?.outcome}`
  )
}
const getUpdatedTime = (p) => {
  const t = p?.updated_at || p?.created_at
  const n = t ? Date.parse(t) : 0
  return Number.isFinite(n) ? n : 0
}
const dedupePositions = (list) => {
  const map = new Map()
  for (const p of Array.isArray(list) ? list : []) {
    const key = canonicalKey(p)
    const prev = map.get(key)
    if (!prev) {
      map.set(key, p)
      continue
    }
    if (getUpdatedTime(p) >= getUpdatedTime(prev)) {
      map.set(key, p)
    }
  }
  return Array.from(map.values())
}

/**
 * Periodically fetch merged positions and push into global state
 * @param {number} intervalMs default 60s
 * @param {boolean} enabled toggle polling
 */
export function usePeriodicPositions(intervalMs = 60000, enabled = true) {
  const { updateState } = useStateContext()
  const timerRef = useRef(null)

  const fetchPositions = useCallback(async () => {
    try {
      const base = (process.env.NEXT_PUBLIC_API_URL || '').replace(/\/?$/, '/')
      const res = await apiFetch(`${base}positions/merged`)
      if (!res.ok) {
        console.warn('Failed to fetch positions:', res.status, await res.text().catch(() => res.statusText))
        return
      }
      const json = await res.json()
      const positions = Array.isArray(json) ? dedupePositions(json) : []
      updateState({ mergedPositions: positions })
    } catch (e) {
      console.error('Positions poll error:', e)
    }
  }, [updateState])

  useEffect(() => {
    if (!enabled) return
    // Initial fetch
    fetchPositions()
    // Interval
    timerRef.current = setInterval(fetchPositions, intervalMs)
    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
    }
  }, [fetchPositions, intervalMs, enabled])

  return { fetchPositions }
}

export default usePeriodicPositions

