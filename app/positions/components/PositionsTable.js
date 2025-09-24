'use client'

import React, { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { DollarSign, Loader2, RefreshCw, Target, Shield, Edit, Plus, ChevronRight, ChevronDown, Copy, XCircle, RotateCw, MoreVertical, ExternalLink } from 'lucide-react'
import EditPositionModal from './EditPositionModal'
import QuickBetModal from './QuickBetModal'
import SellPositionForm from '@/components/trading/SellPositionForm'

import {
  formatPrice,
  formatVolume,
  calculatePnL,
  getCurrentPrice,
  getStatusBadge,
  getStopLossRiskLevel,
} from '@/app/utils/formatters'
import { useRealTimePrices } from '@/hooks/useRealTimePrices'
import { useStateContext } from '@/app/store'
import PositionsTableSkeleton from './PositionsTableSkeleton'
import apiFetch from '@/lib/apiFetch'

// Small inline donut chart to visualize equity capture
function EquityDonut({ percent = 0, amount = 0, size = 64, strokeWidth = 6 }) {
  const p = Math.max(0, Math.min(100, Number(percent) || 0))
  const s = Number(size) || 56
  const sw = Number(strokeWidth) || 6
  const r = (s - sw) / 2
  const c = 2 * Math.PI * r
  const offset = c * (1 - p / 100)
  const x = s / 2
  const y = s / 2

  const formatAmount = (v) => {
    const n = Number(v) || 0
    if (Math.abs(n) >= 1000) {
      return `$${(n / 1000).toFixed(1)}k`
    }
    return `$${n.toFixed(0)}`
  }

  const isPositive = Number(amount) >= 0
  const strokeColor = isPositive ? '#63a483' : '#e08a6b'
  const textColor = strokeColor

  return (
    <div className="flex flex-col items-center" title={`Equity captured: ${Math.round(p)}%`}>
      <svg width={s} height={s} className="block">
        <circle cx={x} cy={y} r={r} stroke="#e5e7eb" strokeWidth={sw} fill="none" />
        <circle
          cx={x}
          cy={y}
          r={r}
          stroke={strokeColor}
          strokeWidth={sw}
          fill="none"
          strokeDasharray={`${c} ${c}`}
          strokeDashoffset={offset}
          strokeLinecap="round"
          transform={`rotate(-90 ${x} ${y})`}
        />
        <text x="50%" y="50%" dominantBaseline="middle" textAnchor="middle" fontSize="14" fontWeight="600" fill={textColor}>
          {formatAmount(amount)}
        </text>
      </svg>
    </div>
  )
}

// Donut that visualizes PnL percent with sign-based color and shows the PnL amount in the center
function PnLDonut({ amount = 0, percent = 0, size = 64, strokeWidth = 6 }) {
  const s = Number(size) || 56
  const sw = Number(strokeWidth) || 6
  const r = (s - sw) / 2
  const c = 2 * Math.PI * r
  const x = s / 2
  const y = s / 2

  const pct = Math.max(0, Math.min(100, Math.abs(Number(percent) || 0)))
  const offset = c * (1 - pct / 100)
  const isPositive = Number(amount) >= 0
  const strokeColor = isPositive ? '#63a483' : '#e08a6b'
  const text = (() => {
    const n = Number(amount) || 0
    const sign = n >= 0 ? '' : '-'
    const v = Math.abs(n)
    return `${sign}$${v.toFixed(2)}`
  })()

  return (
    <div className="flex flex-col items-center" title={`PnL: ${isPositive ? '+' : '-'}${pct.toFixed(1)}%`}>
      <svg width={s} height={s} className="block">
        <circle cx={x} cy={y} r={r} stroke="#e5e7eb" strokeWidth={sw} fill="none" />
        <circle
          cx={x}
          cy={y}
          r={r}
          stroke={strokeColor}
          strokeWidth={sw}
          fill="none"
          strokeDasharray={`${c} ${c}`}
          strokeDashoffset={offset}
          strokeLinecap="round"
          transform={`rotate(-90 ${x} ${y})`}
        />
        <text x="50%" y="50%" dominantBaseline="middle" textAnchor="middle" fontSize="12" fontWeight="600" fill={strokeColor}>
          {text}
        </text>
      </svg>
    </div>
  )
}

// Helpers to dedupe overlapping/duplicate positions (backend sometimes returns near-duplicates)
const canonicalKey = (p) => {
  return (
    p?.id ||
    `${p?.market?.slug || p?.slug || p?.market?.id || 'm'}|${p?.outcome_id ?? p?.outcomeIndex ?? p?.outcome?.id ?? p?.outcome}`
  )
}
const getUpdatedTime = (p) => {
  const t = p?.updated_at || p?.created_at
  const n = t ? Date.parse(t) : 0
  return Number.isFinite(n) ? n : 0
}
export const dedupePositions = (list) => {
  const map = new Map()
  for (const p of Array.isArray(list) ? list : []) {
    const key = canonicalKey(p)
    const prev = map.get(key)
    if (!prev) {
      map.set(key, p)
      continue
    }
    // Prefer the more recently updated entry
    if (getUpdatedTime(p) >= getUpdatedTime(prev)) {
      map.set(key, p)
    }
  }
  return Array.from(map.values())
}

export default function PositionsTable({ refreshTrigger = 0 }) {
  const [redeemingPosition, setRedeemingPosition] = useState(null)
  const [error, setError] = useState('')
  const [isLoadingPositions, setIsLoadingPositions] = useState(false)
  const [editingPosition, setEditingPosition] = useState(null)
  const [showEditModal, setShowEditModal] = useState(false)
  const [buyMorePosition, setBuyMorePosition] = useState(null)
  const [showBuyMoreModal, setShowBuyMoreModal] = useState(false)
  const [sellingPosition, setSellingPosition] = useState(null)
  const [showSellModal, setShowSellModal] = useState(false)
  const [menuOpenFor, setMenuOpenFor] = useState(null)
  // Orders/expansion state
  const [expanded, setExpanded] = useState({}) // { [positionId]: boolean }
  const [ordersByPosition, setOrdersByPosition] = useState({}) // { [positionId]: { orders: Order[], fetchedAt: number, loading?: boolean, error?: string } }
  const { mergedPositions, updateState, currentPrices: currentPricesInState } = useStateContext()
  // Sorting & filtering state
  const [filterMode, setFilterMode] = useState('holding') // 'holding' | 'all'
  const [sortKey, setSortKey] = useState('value') // 'value' | 'closes'
  const [sortDir, setSortDir] = useState('desc') // 'asc' | 'desc'
  
  // Real-time price context
  const dedupedPositions = React.useMemo(() => dedupePositions(mergedPositions), [mergedPositions])

  const {
    currentPrices,
    loading: pricesLoading,
    refreshPrices,
  } = useRealTimePrices(dedupedPositions, 'positions', 'position')
  
  // Wallet balance is now refreshed globally in ClientLayout

  // Helpers for orders API
  const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1'
  const ORDERS_CACHE_TTL_MS = 30_000

  const fetchOrdersForPosition = async (positionId, { force = false } = {}) => {
    try {
      setOrdersByPosition(prev => ({
        ...prev,
        [positionId]: { ...(prev[positionId] || {}), loading: true, error: undefined },
      }))

      const cached = ordersByPosition[positionId]
      const isFresh = cached && cached.fetchedAt && Date.now() - cached.fetchedAt < ORDERS_CACHE_TTL_MS
      if (cached && isFresh && !force) {
        // Use fresh cache
        setOrdersByPosition(prev => ({
          ...prev,
          [positionId]: { ...cached, loading: false, error: undefined },
        }))
        return cached.orders
      }

      const base = API_URL.replace(/\/?$/, '/')
      const url = `${base}orders/?position_id=${encodeURIComponent(positionId)}`
      const res = await apiFetch(url)
      if (!res.ok) {
        const detail = await res.text().catch(() => res.statusText)
        throw new Error(detail || `Failed to load orders (${res.status})`)
      }
      const orders = await res.json()

      setOrdersByPosition(prev => ({
        ...prev,
        [positionId]: { orders: Array.isArray(orders) ? orders.slice(0, 10) : [], fetchedAt: Date.now(), loading: false, error: undefined },
      }))
      return orders
    } catch (e) {
      console.error('Failed to fetch orders for position', positionId, e)
      setOrdersByPosition(prev => ({
        ...prev,
        [positionId]: { ...(prev[positionId] || {}), loading: false, error: e?.message || 'Failed to load orders' },
      }))
      toast.error('Failed to load orders')
      return []
    }
  }

  const toggleExpanded = async (positionId) => {
    setExpanded(prev => {
      const next = { ...prev, [positionId]: !prev[positionId] }
      return next
    })
    // On expand, fetch orders
    if (!expanded[positionId]) {
      await fetchOrdersForPosition(positionId)
    }
  }

  const refreshOrders = async (positionId) => {
    await fetchOrdersForPosition(positionId, { force: true })
  }

  const copyExternalId = async (externalId) => {
    try {
      await navigator.clipboard.writeText(externalId)
      toast.success('External order ID copied')
    } catch {
      toast.error('Failed to copy ID')
    }
  }

  const cancelOrder = async (orderId, positionId) => {
    try {
      const res = await fetch(`${API_URL}/orders/${encodeURIComponent(orderId)}/cancel`, { method: 'POST' })
      if (!res.ok) {
        const detail = await res.text().catch(() => res.statusText)
        throw new Error(detail || 'Failed to cancel order')
      }
      toast.success('Order cancelled')
      await refreshOrders(positionId)
    } catch (e) {
      console.error('Cancel order failed', e)
      toast.error(e?.message || 'Failed to cancel order')
    }
  }

  // Optional: Retry is backend-defined; here we just surface a stub
  const retryOrder = async (order, positionId) => {
    toast.info('Retrying order…')
    // If a retry endpoint exists, call it here, then refresh orders
    // await fetch(`${API_URL}/orders/${order.id}/retry`, { method: 'POST' })
    await refreshOrders(positionId)
  }

  const getOrderStatusMeta = (status) => {
    const map = {
      pending: { color: 'text-yellow-600', icon: '⏳' },
      submitted: { color: 'text-blue-600', icon: '🔵' },
      filled: { color: 'text-green-600', icon: '✅' },
      cancelled: { color: 'text-red-600', icon: '🔴' },
      rejected: { color: 'text-red-800', icon: '❌' },
    }
    return map[status] || { color: 'text-gray-600', icon: 'ℹ️' }
  }

  const formatRelativeTime = (iso) => {
    if (!iso) return ''
    const diff = Date.now() - Date.parse(iso)
    const seconds = Math.floor(diff / 1000)
    const minutes = Math.floor(seconds / 60)
    const hours = Math.floor(minutes / 60)
    const days = Math.floor(hours / 24)
    if (days > 0) return `${days}d ago`
    if (hours > 0) return `${hours}h ago`
    if (minutes > 0) return `${minutes}m ago`
    return `${seconds}s ago`
  }

  const renderOrderBadge = (position) => {
    const cache = ordersByPosition[position.id]
    const summary = position.order_summary
    if (summary) {
      const nonFilled = (summary.pending_orders || 0) + (summary.cancelled_orders || 0)
      if (nonFilled === 0) return null
      const label = []
      if (summary.pending_orders) label.push(`${summary.pending_orders} pending`)
      if (summary.cancelled_orders) label.push(`${summary.cancelled_orders} cancelled`)
      const issues = summary.has_recent_failures ? ' ⚠️ Issues' : ''
      const text = `${label.join(', ')}${issues}`
      return (
        <span className="ml-2 text-xs px-2 py-0.5 rounded-full bg-muted text-muted-foreground" title={summary.last_order_attempt ? `Last attempt ${formatRelativeTime(summary.last_order_attempt)}` : ''}>
          {text}
        </span>
      )
    }
    // Fallback: compute from cached orders if available
    if (cache && Array.isArray(cache.orders)) {
      const counts = cache.orders.reduce((acc, o) => {
        if (o.status !== 'filled') acc.nonFilled++
        if (o.status === 'pending') acc.pending++
        if (o.status === 'cancelled') acc.cancelled++
        if (o.status === 'rejected') acc.rejected++
        return acc
      }, { nonFilled: 0, pending: 0, cancelled: 0, rejected: 0 })
      if (counts.nonFilled === 0) return null
      const bits = []
      if (counts.pending) bits.push(`${counts.pending} pending`)
      if (counts.cancelled) bits.push(`${counts.cancelled} cancelled`)
      if (counts.rejected) bits.push(`${counts.rejected} rejected`)
      return (
        <span className="ml-2 text-xs px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
          {bits.join(', ')}
        </span>
      )
    }
    return null
  }


  // Enrich, filter, and sort positions for display
  const displayPositions = React.useMemo(() => {
    const enriched = dedupedPositions.map(p => {
      const cp = currentPrices.get(p.outcome_id) || getCurrentPrice(p)
      const currentValue = Number(p?.currentValue ?? (p.size && cp ? p.size * cp : 0))
      const closesTs = p?.market?.endDate ? Date.parse(p.market.endDate) : Number.POSITIVE_INFINITY
      return { p, cp: Number(cp ?? 0), currentValue, closesTs }
    })

    const filtered = enriched.filter(({ p, currentValue }) => {
      if (filterMode === 'holding') {
        const shares = Number(p.size ?? 0)
        return shares > 0 && Number(currentValue) > 0
      }
      return true // 'all'
    })

    const sorted = filtered.sort((a, b) => {
      let av, bv
      if (sortKey === 'closes') {
        av = a.closesTs
        bv = b.closesTs
      } else {
        av = a.currentValue
        bv = b.currentValue
      }
      const cmp = (av === bv) ? 0 : (av < bv ? -1 : 1)
      return sortDir === 'asc' ? cmp : -cmp
    })

    return sorted
  }, [dedupedPositions, currentPrices, filterMode, sortKey, sortDir])


  // Fetch merged positions from backend
  const fetchMergedPositions = async () => {
    const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/positions/merged`)
    if (!response.ok) {
      throw new Error('Failed to fetch merged positions')
    }
    return await response.json()
  }

  // Log the merged positions on every render (for debugging)
  console.log('Merged Positions:', mergedPositions)
  console.log('Current Prices from Hook:', currentPrices)
  console.log('Prices Loading:', pricesLoading)

  // Load from store immediately, then refresh in background
  useEffect(() => {
    let isMounted = true
    setError('')
    
    // If we have data in store, use it immediately (no loading state)
    const hasPositionsInStore = Array.isArray(mergedPositions) && mergedPositions.length > 0
    if (!hasPositionsInStore) {
      setIsLoadingPositions(true)
    }

    const fetchPositionsData = async () => {
      try {
        // Fetch fresh merged positions from backend
        const mergedData = await fetchMergedPositions()
        console.log('Fetched Fresh Merged Positions Data:', mergedData)
        if (!isMounted) return

        const positions = Array.isArray(mergedData) ? dedupePositions(mergedData) : []
        // Update global state with fresh positions
        updateState({ mergedPositions: positions })
      } catch (err) {
        console.error('Error fetching positions:', err)
        if (isMounted) setError('Failed to refresh positions')
      } finally {
        if (isMounted) setIsLoadingPositions(false)
      }
    }

    // Fetch fresh data in background
    fetchPositionsData()
    return () => { isMounted = false }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [refreshTrigger, updateState]) // mergedPositions intentionally excluded to prevent infinite loop

  // Update global state with current prices when they change (avoid redundant updates)
  useEffect(() => {
    if (currentPrices !== currentPricesInState) {
      updateState({ currentPrices })
    }
  }, [currentPrices, currentPricesInState, updateState])



  // Add minimal handler stubs to avoid reference errors
  const handleSellPosition = async (position) => {
    try {
      console.log('Sell position requested:', position.id);
      
      // Call the sell API endpoint
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/positions/${position.id}/sell`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          // Include any required parameters for the sell order
          price: position.sell_price || position.current_price, // Use sell target or current price
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.detail || 'Failed to sell position');
      }

      // Show success message
      toast.success('Sell order placed successfully');
      
      // Refresh positions to show updated status
      updateState();
    } catch (error) {
      console.error('Sell failed:', error);
      toast.error(error.message || 'Failed to sell position');
    }
  }

  const handleCancelOrder = async (positionId) => {
    try {
      console.log('Cancel order requested:', positionId)
      // TODO: implement cancel API call
    } catch (e) {
      console.error('Cancel failed:', e)
      setError('Failed to cancel order')
    }
  }

  const handleRedeemPosition = async (pos) => {
    const positionId = pos?.id
    const conditionId = pos?.conditionId || "0x"
    console.log('Redeem position:', positionId, 'Condition ID:', conditionId)
    setRedeemingPosition(positionId)
    try {
      console.log('Redeem requested:', positionId)
      // convert to POST METHOD
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/redemption/redeem/${positionId}?conditionId=${conditionId}`, {
        method: 'POST'
      })
      if (!response.ok) {
        throw new Error('Redeem failed')
      }
      // TODO: implement redeem API call
    } catch (e) {
      console.error('Redeem failed:', e)
      setError('Failed to redeem position')
    } finally {
      console.log('Redeem completed for position:', positionId)
      setRedeemingPosition(null)
    }
  }

  const handleEditPosition = (position) => {
    setEditingPosition(position)
    setShowEditModal(true)
  }

  const handleCloseEditModal = () => {
    setShowEditModal(false)
    setEditingPosition(null)
  }

  const handleEditSuccess = () => {
    // Refresh positions after successful edit
    const fetchPositionsData = async () => {
      try {
        const mergedData = await fetchMergedPositions()
        const positions = Array.isArray(mergedData) ? dedupePositions(mergedData) : []
        updateState({ mergedPositions: positions })
      } catch (err) {
        console.error('Error fetching positions after edit:', err)
      }
    }
    fetchPositionsData()
  }

  const handleBuyMore = (position) => {
    setBuyMorePosition(position)
    setShowBuyMoreModal(true)
  }

  // Sell modal handlers
  const handleSellPositionModal = (position) => {
    setSellingPosition(position)
    setShowSellModal(true)
  }

  const handleCloseSellModal = () => {
    setShowSellModal(false)
    setSellingPosition(null)
  }

  const handleSellSuccess = () => {
    // Refresh positions after successful sell
    const fetchPositionsData = async () => {
      try {
        const mergedData = await fetchMergedPositions()
        const positions = Array.isArray(mergedData) ? dedupePositions(mergedData) : []
        updateState({ mergedPositions: positions })
      } catch (err) {
        console.error('Error fetching positions after sell:', err)
      }
    }
    fetchPositionsData()
    handleCloseSellModal()
  }

  const handleCloseBuyMoreModal = () => {
    setShowBuyMoreModal(false)
    setBuyMorePosition(null)
  }

  const handleBuyMoreSuccess = () => {
    // Refresh positions after successful buy
    const fetchPositionsData = async () => {
      try {
        const mergedData = await fetchMergedPositions()
        const positions = Array.isArray(mergedData) ? dedupePositions(mergedData) : []
        updateState({ mergedPositions: positions })
      } catch (err) {
        console.error('Error fetching positions after buy:', err)
      }
    }
    fetchPositionsData()
  }

  const handleCopyPositionId = async (positionId) => {
    try {
      await navigator.clipboard.writeText(positionId)
      toast.success('Position ID copied to clipboard')
    } catch (error) {
      console.error('Failed to copy position ID:', error)
      toast.error('Failed to copy position ID')
    }
  }

  // Show skeleton while loading initial positions data
  if (isLoadingPositions) {
    return <PositionsTableSkeleton rowCount={3} />
  }

  return (
    <Card className="bg-peach-card rounded-2xl">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2 text-peach-heading">
          <DollarSign className="h-5 w-5" />
          Open Positions
        </CardTitle>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 text-xs">
            <label className="text-peach-muted">Filter</label>
            <select
              className="border border-peach rounded-full px-2 py-1 text-xs bg-white"
              value={filterMode}
              onChange={(e) => setFilterMode(e.target.value)}
            >
              <option value="holding">Holding</option>
              <option value="all">All</option>
            </select>
          </div>
          <div className="flex items-center gap-1 text-xs">
            <label className="text-peach-muted">Sort</label>
            <select
              className="border border-peach rounded-full px-2 py-1 text-xs bg-white"
              value={sortKey}
              onChange={(e) => setSortKey(e.target.value)}
            >
              <option value="value">Value</option>
              <option value="closes">Closes</option>
            </select>
            <select
              className="border border-peach rounded-full px-2 py-1 text-xs bg-white"
              value={sortDir}
              onChange={(e) => setSortDir(e.target.value)}
            >
              <option value="desc">Desc</option>
              <option value="asc">Asc</option>
            </select>
          </div>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={refreshPrices}
            disabled={pricesLoading}
            className="flex items-center gap-1 rounded-full border-peach"
          >
            {pricesLoading ? (
              <Loader2 className="h-3 w-3 animate-spin" />
            ) : (
              <RefreshCw className="h-3 w-3" />
            )}
            Refresh Prices
          </Button>
        </div>
      </CardHeader>
      
      <CardContent>
        {error && (
          <Alert variant="destructive" className="mb-4">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {displayPositions.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <DollarSign className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No positions found</p>
            <p className="text-sm">Place your first bet to get started</p>
          </div>
        ) : (
          <div className="space-y-4">
            {displayPositions.map(({ p: position, cp: currentPrice, currentValue: derivedCurrentValue }) => {
              // Always calculate PnL with real-time prices for accuracy
              const pnlData = calculatePnL(position, currentPrice)
              const rowRiskLevel = getStopLossRiskLevel(position, currentPrice)


              const rowKey =
                    position.id ||
                    position.clob_id ||
                    position.asset ||
                    `${position.slug || position.market?.slug || 'row'}:${position.outcomeIndex ?? position.outcome?.id ?? 
                position.outcome ?? ''}`

              const outcomeLabel =
                typeof position.outcome === 'string'
                  ? position.outcome
                  : (position.outcome?.name ?? 'Unknown Outcome')

              return (
                <div key={rowKey} className="soft-card rounded-2xl p-4 bg-[#fff7f2] hover:bg-[#fff2ec] transition-colors">
                  <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
                    {/* Market & Outcome */}
                    <div className="lg:col-span-2">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="font-medium text-sm mb-1" title={position.market?.question}>
                            {position.market?.question || 'Unknown Market'}
                          </div>
                          <div className="text-sm text-muted-foreground mb-1">
                            {outcomeLabel}
                          </div>
                          {/* Order status indicator badge (summary) */}
                          <div className="mt-1">
                            {renderOrderBadge(position)}
                          </div>
                          {position.market?.status === 'closed' && (
                            <div className="text-xs">
                              {position.resolved_status ? (
                                <span className={position.resolved_status === 'won' ? 'text-green-600' : 'text-red-600'}>
                                  ✓ Resolved
                                </span>
                              ) : (
                                <span className="text-orange-600">⏰ Closed</span>
                              )}
                            </div>
                          )}
                        </div>
                        {/* ID and expand controls moved to Actions column */}
                  </div>
                </div>

                    {/* Status & Close Date */}
                    <div className="lg:col-span-1">
                      <div className="mb-2">{getStatusBadge(position)}</div>
                      {position.market?.endDate ? (
                        <div className="text-xs text-muted-foreground max-w-[200px]">
                          Closes: {new Date(position.market.endDate).toLocaleDateString('en-US', {
                            month: 'short',
                            day: 'numeric'
                          })}
                        </div>
                      ) : (
                        <div className="text-xs text-muted-foreground">No end date</div>
                      )}
                    </div>

                    {/* Prices + Value/Volume, grouped */}
                    <div className="lg:col-span-3">
                      <div className="grid grid-cols-2 gap-3">
                        {/* Prices */}
                        <div>
                          <div className="text-sm space-y-1 max-w-[160px]">
                            <div className="flex justify-between items-center">
                              <span className="text-muted-foreground">Entry:</span>
                              <span className="font-medium">{formatPrice(position.entry_price)}</span>
                            </div>
                            <div className={`flex justify-between items-center ${pricesLoading ? 'opacity-70' : ''}`}>
                              <span className="text-muted-foreground">Current:</span>
                              {pricesLoading ? (
                                <div className="flex items-center gap-1">
                                  <Loader2 className="h-3 w-3 animate-spin" />
                                  <span className="font-medium">{formatPrice(position.outcome?.probability)}</span>
                                </div>
                              ) : (
                                <span className="font-medium">{formatPrice(currentPrice)}</span>
                              )}
                        </div>
                      </div>
                    </div>

                        {/* Value & Volume */}
                        <div>
                          <div className="text-sm space-y-1 max-w-[160px] whitespace-nowrap">
                            <div className="flex justify-between items-center">
                              <span className="text-muted-foreground">Value:</span>
                              <span className="font-medium">
                                {derivedCurrentValue != null ? `$${derivedCurrentValue.toFixed(2)}` : '-'}
                              </span>
                            </div>
                            <div className="flex justify-between items-center">
                              <span className="text-muted-foreground">Volume:</span>
                              <span className="font-medium text-xs">
                                {formatVolume(position.volume)}{position.size != null ? ` / ${formatVolume(position.size)}` : ''}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Donuts: PnL first, then Unrealized */}
                    <div className="lg:col-span-2 flex items-center justify-center gap-6">
                      {pnlData && (
                        <div className="flex flex-col items-center">
                          <PnLDonut amount={pnlData.pnl} percent={pnlData.pnlPercent} />
                          <div className="mt-1 text-xs text-peach-muted">PnL</div>
                        </div>
                      )}
                      {(() => {
                        const entry = Number(position.entry_price ?? 0)
                        const cp = Number(currentPrice ?? position.outcome?.probability ?? 0)
                        const shares = Number(position.size ?? 0)
                        const maxProfitPerShare = Math.max(0, 1 - entry)
                        const realizedPerShare = Math.max(0, cp - entry)
                        const pctCaptured = maxProfitPerShare > 0 ? Math.max(0, Math.min(1, realizedPerShare / maxProfitPerShare)) * 100 : 0
                        const remainingDollars = Math.max(0, shares * (1 - cp))
                        return (
                          <div className="flex flex-col items-center">
                            <EquityDonut percent={pctCaptured} amount={remainingDollars} />
                            <div className="mt-1 text-xs text-peach-muted">Unrealized</div>
                          </div>
                        )
                      })()}
                    </div>

                    {/* Exit/SL moved to the last column before actions */}
                    <div className="lg:col-span-2">
                      <div className="flex items-start justify-center gap-2">
                        <div className="w-[90px]">
                          <div className="text-peach-muted mb-1 text-xs">Exit/SL</div>
                          <div className="space-y-1 text-xs whitespace-nowrap">
                            {position.sell_price ? (
                              <div className="flex items-center gap-1 text-green-600">
                                <Target className="h-3 w-3" />
                                <span>{formatPrice(position.sell_price)}</span>
                              </div>
                            ) : (
                              <div className="text-muted-foreground">No exit</div>
                            )}
                            {position.stop_loss_price ? (
                              <div className="flex items-center gap-1 text-red-600">
                                <Shield className="h-3 w-3" />
                                <span>{formatPrice(position.stop_loss_price)}</span>
                              </div>
                            ) : (
                              <div className="text-muted-foreground">No SL</div>
                            )}
                          </div>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEditPosition(position)}
                          className="p-1 h-6 w-6"
                          title="Edit Exit/SL"
                        >
                          <Edit className="h-3 w-3" />
                        </Button>
                        {/* Polymarket link */}
                        {position.market?.external_id && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => window.open(`https://polymarket.com/event/${position.market.external_id}`, '_blank')}
                            className="p-1 h-6 w-6"
                            title="View on Polymarket"
                          >
                            <ExternalLink className="h-3 w-3 text-blue-600" />
                          </Button>
                        )}
                        {/* Opportunity page link */}
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => window.open(`/opportunities/${position.market?.id}`, '_blank')}
                          className="p-1 h-6 w-6"
                          title="View Opportunity"
                        >
                          <ExternalLink className="h-3 w-3 text-green-600" />
                        </Button>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="lg:col-span-2">
                      <div className="flex flex-col items-stretch gap-1 relative">
                        <div className="flex items-center gap-1 justify-end">
                          {(() => {
                          // If current value is zero, show Lost status
                          const isLostValue = derivedCurrentValue != null && Number(derivedCurrentValue) === 0
                          if (isLostValue) {
                            // Check if market is still open for trading
                            const isMarketOpen = position.market?.status !== 'closed' && position.market?.status !== 'resolved';
                            
                            if (isMarketOpen) {
                              return (
                                <>
                                  <div className="text-xs text-red-600 mr-2">Lost</div>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => handleBuyMore(position)}
                                    className="p-1 h-6 w-6"
                                    title="Buy More"
                                  >
                                    <Plus className="h-3 w-3" />
                                  </Button>
                                </>
                              );
                            }
                            
                            return <div className="text-xs text-red-600">Lost</div>;
                          }

                          // Redeemable positions with non-zero current value -> Claim Winnings
                          const canRedeem = !!position.redeemable && !isLostValue
                          // Primary action: Claim if redeemable
                          if (canRedeem) {
                            return (
                              <Button
                                variant="default"
                                size="sm"
                                onClick={() => handleRedeemPosition(position)}
                                disabled={redeemingPosition === position.id}
                                className="bg-green-600 hover:bg-green-700 text-white text-xs"
                                title="Claim Winnings"
                              >
                                {redeemingPosition === position.id ? (
                                  <Loader2 className="h-3 w-3 animate-spin" />
                                ) : (
                                  <>
                                    <DollarSign className="h-3 w-3 mr-1" />
                                    Claim
                                  </>
                                )}
                              </Button>
                            );
                          }
                          return null;
                        })()}
                        {/* Kebab menu */}
                        <div className="relative">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setMenuOpenFor(menuOpenFor === position.id ? null : position.id)}
                            className="p-1 h-6 w-6"
                            title="More actions"
                          >
                            <MoreVertical className="h-3 w-3" />
                          </Button>
                          {menuOpenFor === position.id && (
                            <div className="absolute right-0 mt-1 w-40 bg-white border rounded shadow-md z-10">
                              <button className="w-full text-left px-3 py-2 text-xs hover:bg-gray-50" onClick={() => { handleBuyMore(position); setMenuOpenFor(null) }}>Buy more</button>
                              <button className="w-full text-left px-3 py-2 text-xs hover:bg-gray-50" onClick={() => { handleSellPosition(position); setMenuOpenFor(null) }}>Quick Sell</button>
                              <button className="w-full text-left px-3 py-2 text-xs hover:bg-gray-50" onClick={() => { handleSellPositionModal(position); setMenuOpenFor(null) }}>Sell...</button>
                              <button className="w-full text-left px-3 py-2 text-xs hover:bg-gray-50" onClick={() => { handleCopyPositionId(position.id); setMenuOpenFor(null) }}>Copy ID</button>
                              <button className="w-full text-left px-3 py-2 text-xs hover:bg-gray-50" onClick={() => { handleEditPosition(position); setMenuOpenFor(null) }}>Edit prices</button>
                              {(position.status === 'open' || position.status === 'not_filled') && (
                                <button className="w-full text-left px-3 py-2 text-xs hover:bg-gray-50" onClick={() => { handleCancelOrder(position.id); setMenuOpenFor(null) }}>Cancel order</button>
                              )}
                            </div>
                          )}
                        </div>
                        {/* Expand/collapse */}
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => toggleExpanded(position.id)}
                          className="p-1 h-6 w-6"
                          title={expanded[position.id] ? 'Hide Orders' : 'Show Orders'}
                          aria-expanded={!!expanded[position.id]}
                          aria-controls={`orders-${position.id}`}
                        >
                          {expanded[position.id] ? (
                            <ChevronDown className="h-3 w-3" />
                          ) : (
                            <ChevronRight className="h-3 w-3" />
                          )}
                        </Button>
                        </div>
                        {rowRiskLevel && (
                          <div className={`inline-flex items-center justify-center px-2 py-1 rounded-full text-xs font-medium border mt-1 w-full ${rowRiskLevel.color}`}>
                            {rowRiskLevel.message}
                          </div>
                        )}
                      </div>
                    </div>
                </div>
                {/* Expandable Orders Section */}
                {expanded[position.id] && (
                  <div id={`orders-${position.id}`} className="mt-3 border-t pt-3 text-sm">
                    <div className="flex items-center justify-between mb-2">
                      <div className="font-medium">Orders</div>
                      <div className="flex items-center gap-2">
                        <Button variant="outline" size="sm" onClick={() => refreshOrders(position.id)} className="h-7 px-2">
                          <RefreshCw className="h-3 w-3 mr-1" /> Refresh
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-7 px-2"
                          onClick={async () => {
                            const cache = ordersByPosition[position.id]
                            if (!cache?.orders) return
                            const pending = cache.orders.filter(o => o.status === 'pending' || o.status === 'submitted')
                            for (const o of pending) {
                              await cancelOrder(o.id, position.id)
                            }
                          }}
                        >
                          <XCircle className="h-3 w-3 mr-1" /> Cancel pending
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-7 px-2"
                          onClick={async () => {
                            const cache = ordersByPosition[position.id]
                            if (!cache?.orders) return
                            const failed = cache.orders.filter(o => o.status === 'cancelled' || o.status === 'rejected')
                            for (const o of failed) {
                              await retryOrder(o, position.id)
                            }
                          }}
                        >
                          <RotateCw className="h-3 w-3 mr-1" /> Retry failed
                        </Button>
                      </div>
                    </div>
                    {ordersByPosition[position.id]?.loading ? (
                      <div className="flex items-center text-muted-foreground"><Loader2 className="h-3 w-3 animate-spin mr-2" /> Loading…</div>
                    ) : ordersByPosition[position.id]?.error ? (
                      <div className="text-red-600">{ordersByPosition[position.id]?.error}</div>
                    ) : (
                      <div className="space-y-2">
                        {(ordersByPosition[position.id]?.orders || []).map((o, idx) => {
                          const meta = getOrderStatusMeta(o.status)
                          const ts = o.submitted_at || o.created_at || o.filled_at
                          const side = (o.side || '').toUpperCase()
                          const price = o.price != null ? formatPrice(o.price) : '—'
                          const qty = o.quantity != null ? o.quantity : o.filled_quantity || 0
                          const externalIdShort = o.external_order_id ? `${o.external_order_id.slice(0, 10)}…` : '—'
                          return (
                            <div key={o.id || `${position.id}-${idx}`} className="flex items-start justify-between">
                              <div className="flex-1">
                                <div className={`flex items-center gap-2 ${meta.color}`}>
                                  <span>{meta.icon}</span>
                                  <span className="font-medium uppercase tracking-wide text-xs">{o.status}</span>
                                  <span className="text-muted-foreground">- {side} {qty} @ {price}</span>
                                  {ts && (
                                    <span className="text-muted-foreground">({new Date(ts).toLocaleString()})</span>
                                  )}
                                </div>
                                {o.external_order_id && (
                                  <div className="text-xs text-muted-foreground mt-0.5">
                                    External ID: <span className="font-mono">{externalIdShort}</span>
                                    <Button variant="ghost" size="sm" className="h-6 px-1 ml-1" onClick={() => copyExternalId(o.external_order_id)} title={o.external_order_id}>
                                      <Copy className="h-3 w-3" />
                                    </Button>
                                  </div>
                                )}
                              </div>
                              <div className="flex items-center gap-1">
                                {(o.status === 'pending' || o.status === 'submitted') && (
                                  <Button variant="outline" size="sm" className="h-7 px-2" onClick={() => cancelOrder(o.id, position.id)}>
                                    <XCircle className="h-3 w-3 mr-1" /> Cancel
                                  </Button>
                                )}
                                {(o.status === 'cancelled' || o.status === 'rejected') && (
                                  <Button variant="outline" size="sm" className="h-7 px-2" onClick={() => retryOrder(o, position.id)}>
                                    <RotateCw className="h-3 w-3 mr-1" /> Retry
                                  </Button>
                                )}
                              </div>
                            </div>
                          )
                        })}
                        {(!ordersByPosition[position.id] || (ordersByPosition[position.id]?.orders || []).length === 0) && (
                          <div className="text-muted-foreground">No recent orders</div>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )
          })}
          </div>
        )}
      </CardContent>
      
      {/* Edit Position Modal */}
      <EditPositionModal
        position={editingPosition}
        isOpen={showEditModal}
        onClose={handleCloseEditModal}
        onSuccess={handleEditSuccess}
      />
      
      {/* Buy More Modal */}
      {buyMorePosition && (() => {
        const currentPrice = currentPrices.get(buyMorePosition.outcome_id) || getCurrentPrice(buyMorePosition);
        return (
          <QuickBetModal
            market={buyMorePosition.market}
            outcome={{
              id: buyMorePosition.outcome_id,
              clob_id: buyMorePosition.clob_id, // Required for PlaceBetForm functionality
              name: typeof buyMorePosition.outcome === 'string' 
                ? buyMorePosition.outcome 
                : (buyMorePosition.outcome?.name ?? 'Unknown Outcome'),
              probability: currentPrice, // Use real-time current price
              current_price: currentPrice
            }}
            isOpen={showBuyMoreModal}
            onClose={handleCloseBuyMoreModal}
            onSuccess={handleBuyMoreSuccess}
          />
        );
      })()}

      {/* Sell Position Modal */}
      {sellingPosition && showSellModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <SellPositionForm
                position={sellingPosition}
                onSuccess={handleSellSuccess}
                onCancel={handleCloseSellModal}
                showCard={false}
              />
            </div>
          </div>
        </div>
      )}
    </Card>
  )
}
