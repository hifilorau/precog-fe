'use client'

import React, { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { DollarSign, Loader2, RefreshCw, Target, Shield, Clock, Edit, Plus, Minus, Info, ChevronRight, ChevronDown, Copy, XCircle, RotateCw } from 'lucide-react'
import EditPositionModal from './EditPositionModal'
import QuickBetModal from './QuickBetModal'

import {
  formatPrice,
  formatVolume,
  calculatePnL,
  getCurrentPrice,
  getStatusBadge,
  getStopLossRiskLevel,
  formatPnL,
} from '@/app/utils/formatters'
import { useRealTimePrices } from '@/hooks/useRealTimePrices'
import { usePeriodicBalance } from '@/hooks/usePeriodicBalance'
import { useStateContext } from '@/app/store'
import PositionsTableSkeleton from './PositionsTableSkeleton'

export default function PositionsTable({ refreshTrigger = 0 }) {
  const [sellingPosition, setSellingPosition] = useState(null)
  const [cancelingPosition, setCancelingPosition] = useState(null)
  const [redeemingPosition, setRedeemingPosition] = useState(null)
  const [error, setError] = useState('')
  const [isLoadingPositions, setIsLoadingPositions] = useState(false)
  const [editingPosition, setEditingPosition] = useState(null)
  const [showEditModal, setShowEditModal] = useState(false)
  const [buyMorePosition, setBuyMorePosition] = useState(null)
  const [showBuyMoreModal, setShowBuyMoreModal] = useState(false)
  // Orders/expansion state
  const [expanded, setExpanded] = useState({}) // { [positionId]: boolean }
  const [ordersByPosition, setOrdersByPosition] = useState({}) // { [positionId]: { orders: Order[], fetchedAt: number, loading?: boolean, error?: string } }
  const { mergedPositions, updateState } = useStateContext()
  
  // Real-time price context
  const {
    currentPrices,
    loading: pricesLoading,
    refreshPrices,
  } = useRealTimePrices(mergedPositions, 'positions', 'position')
  
  // Periodic balance refresh (every 30 seconds)
  usePeriodicBalance(30000, true)

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

      const url = `${API_URL}/orders?position_id=${encodeURIComponent(positionId)}`
      const res = await fetch(url, { cache: 'no-store' })
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

  // Derive positions to show with a strict filter on zero-value closed/resolved-lost
  const allPositions = Array.isArray(mergedPositions) ? mergedPositions : []
  // TODO: add a UI toggle to include closed/lost zero-value positions
  const shouldHidePosition = (p) => {
    const cp = Number(getCurrentPrice(p))
    const hasZeroPrice = !Number.isNaN(cp) && cp === 0
    const hasZeroValue = Number(p?.currentValue ?? p?.current_value) === 0
    const isClosed = p?.market?.status === 'closed'
    const isResolvedLost = p?.resolved_status === 'lost' || isClosed
    return (hasZeroPrice || hasZeroValue) && isResolvedLost
  }
  const positionsToShow = allPositions.filter(p => !shouldHidePosition(p))


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

        const positions = Array.isArray(mergedData) ? mergedData : []
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

  // Update global state with current prices when they change
  useEffect(() => {
    updateState({ currentPrices })
  }, [currentPrices, updateState])



  // Add minimal handler stubs to avoid reference errors
  const handleSellPosition = async (position) => {
    setSellingPosition(position.id);
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
    } finally {
      setSellingPosition(null);
    }
  }

  const handleCancelOrder = async (positionId) => {
    setCancelingPosition(positionId)
    try {
      console.log('Cancel order requested:', positionId)
      // TODO: implement cancel API call
    } catch (e) {
      console.error('Cancel failed:', e)
      setError('Failed to cancel order')
    } finally {
      setCancelingPosition(null)
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
        const positions = Array.isArray(mergedData) ? mergedData : []
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

  const handleCloseBuyMoreModal = () => {
    setShowBuyMoreModal(false)
    setBuyMorePosition(null)
  }

  const handleBuyMoreSuccess = () => {
    // Refresh positions after successful buy
    const fetchPositionsData = async () => {
      try {
        const mergedData = await fetchMergedPositions()
        const positions = Array.isArray(mergedData) ? mergedData : []
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
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2">
          <DollarSign className="h-5 w-5" />
          Open Positions
        </CardTitle>
        <Button 
          variant="outline" 
          size="sm" 
          onClick={refreshPrices}
          disabled={pricesLoading}
          className="flex items-center gap-1"
        >
          {pricesLoading ? (
            <Loader2 className="h-3 w-3 animate-spin" />
          ) : (
            <RefreshCw className="h-3 w-3" />
          )}
          Refresh Prices
        </Button>
      </CardHeader>
      
      <CardContent>
        {error && (
          <Alert variant="destructive" className="mb-4">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {positionsToShow.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <DollarSign className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No positions found</p>
            <p className="text-sm">Place your first bet to get started</p>
          </div>
        ) : (
          <div className="space-y-4">
            {positionsToShow.map((position) => {
              const currentPrice = currentPrices.get(position.outcome_id) || getCurrentPrice(position)
              // Always calculate PnL with real-time prices for accuracy
              const pnlData = calculatePnL(position, currentPrice)

              const derivedCurrentValue = Number(
                position?.currentValue ??
                (position.size && currentPrice ? position.size * currentPrice : 0)
              );

              const rowKey =
                position.clob_id ||
                position.asset ||
                position.id ||
                `${position.slug || position.market?.slug || 'row'}:${position.outcomeIndex ?? position.outcome?.id ?? position.outcome ?? ''}`

              const outcomeLabel =
                typeof position.outcome === 'string'
                  ? position.outcome
                  : (position.outcome?.name ?? 'Unknown Outcome')

              return (
                <div key={rowKey} className="border border-border rounded-lg p-4 bg-card hover:bg-muted/50 transition-colors">
                  <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
                    {/* Market & Outcome */}
                    <div className="lg:col-span-3">
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
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleCopyPositionId(position.id)}
                          className="p-1 h-6 w-6 ml-2"
                          title={`Copy Position ID: ${position.id}`}
                        >
                          <Info className="h-3 w-3" />
                        </Button>
                        {/* Expand/Collapse orders */}
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => toggleExpanded(position.id)}
                          className="p-1 h-6 w-6 ml-1"
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
                    </div>

                    {/* Status & Close Date */}
                    <div className="lg:col-span-2">
                      <div className="mb-2">{getStatusBadge(position)}</div>
                      {position.market?.endDate ? (
                        <div className="text-xs text-muted-foreground">
                          Closes: {new Date(position.market.endDate).toLocaleDateString('en-US', {
                            month: 'short',
                            day: 'numeric'
                          })}
                        </div>
                      ) : (
                        <div className="text-xs text-muted-foreground">No end date</div>
                      )}
                    </div>

                    {/* Prices */}
                    <div className="lg:col-span-2">
                      <div className="text-sm space-y-1">
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
                      {(() => {
                        const riskLevel = getStopLossRiskLevel(position, currentPrice)
                        if (riskLevel) {
                          return (
                            <div className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium border mt-2 ${riskLevel.color}`}>
                              {riskLevel.message}
                            </div>
                          )
                        }
                        return null
                      })()}
                    </div>

                    {/* Value & Volume */}
                    <div className="lg:col-span-2">
                      <div className="text-sm space-y-1">
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

                    {/* PnL */}
                    <div className="lg:col-span-1">
                      <div className="text-sm">
                        <div className="text-muted-foreground mb-1 text-xs">PnL</div>
                        <div className="font-medium">
                          {pnlData ? formatPnL(pnlData.pnl, pnlData.pnlPercent) : '-'}
                        </div>
                      </div>
                    </div>

                    {/* Targets */}
                    <div className="lg:col-span-1">
                      <div className="space-y-1 text-xs">
                        {position.sell_price ? (
                          <div className="flex items-center gap-1 text-green-600">
                            <Target className="h-3 w-3" />
                            <span>{formatPrice(position.sell_price)}</span>
                          </div>
                        ) : (
                          <div className="text-muted-foreground">No target</div>
                        )}
                        {position.stop_loss_price ? (
                          <div className="flex items-center gap-1 text-red-600">
                            <Shield className="h-3 w-3" />
                            <span>{formatPrice(position.stop_loss_price)}</span>
                          </div>
                        ) : (
                          <div className="text-muted-foreground">No stop</div>
                        )}
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="lg:col-span-1">
                      <div className="flex items-center gap-1">
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

                          // Open/filled positions (not resolved) and not data-only -> allow Sell/Edit/Buy
                          const isFilled = position.status === 'filled'
                            && (!position.resolved_status || position.resolved_status === '')
                            && !position.isDataApi
                          if (isFilled) {
                            const riskLevel = getStopLossRiskLevel(position, currentPrice);
                            const isHighRisk = riskLevel && (riskLevel.level === 'crash' || riskLevel.level === 'high');
                            return (
                              <div className="flex items-center gap-1">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleBuyMore(position)}
                                  disabled={sellingPosition === position.id}
                                  className="p-1 h-6 w-6"
                                  title="Buy More"
                                >
                                  <Plus className="h-3 w-3" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleEditPosition(position)}
                                  disabled={sellingPosition === position.id}
                                  className="p-1 h-6 w-6"
                                  title="Edit Position"
                                >
                                  <Edit className="h-3 w-3" />
                                </Button>
                                <Button
                                  variant={isHighRisk ? "destructive" : "outline"}
                                  size="sm"
                                  onClick={() => handleSellPosition(position)}
                                  disabled={sellingPosition === position.id}
                                  className={`p-1 h-6 w-6 ${isHighRisk ? "animate-pulse" : ""}`}
                                  title={isHighRisk ? "SELL NOW!" : "Sell Position"}
                                >
                                  {sellingPosition === position.id ? (
                                    <Loader2 className="h-3 w-3 animate-spin" />
                                  ) : (
                                    <>
                                      {isHighRisk && <Shield className="h-3 w-3" />}
                                      {!isHighRisk && <Minus className="h-3 w-3" />}
                                    </>
                                  )}
                                </Button>
                                {riskLevel && riskLevel.level === 'crash' && (
                                  <div className="text-xs text-red-600 font-medium ml-1">
                                    🚨
                                  </div>
                                )}
                              </div>
                            );
                          }

                          // Pending: show Pending label and a Cancel button for open positions
                          if (position.status === 'open' || position.status === 'not_filled') {
                            return (
                              <div className="flex items-center gap-1">
                                <div className="flex items-center gap-1 text-xs text-gray-500">
                                  <Clock className="h-3 w-3" />
                                  Pending
                                </div>
                                {position.status === 'open' && !position.isDataApi && (
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => handleCancelOrder(position.id)}
                                    disabled={cancelingPosition === position.id}
                                    className="p-1 h-6 w-6 ml-1"
                                    title="Cancel Order"
                                  >
                                    {cancelingPosition === position.id ? (
                                      <Loader2 className="h-3 w-3 animate-spin" />
                                    ) : (
                                      <Minus className="h-3 w-3" />
                                    )}
                                  </Button>
                                )}
                              </div>
                            );
                          }

                          // Already redeemed (explicit)
                          const hasRedemptionRecord = position.redemptions && position.redemptions.length > 0 && 
                            position.redemptions.some(r => r.status === 'completed');
                          if (position.resolved_status === 'won' && hasRedemptionRecord) {
                            return (
                              <div className="flex items-center gap-1 text-xs text-green-600">
                                <DollarSign className="h-3 w-3" />
                                Redeemed
                              </div>
                            );
                          }
                          
                          // Lost positions by resolution (if not captured by value==0)
                          if (position.resolved_status === 'lost') {
                            // Check if market is still open for trading
                            const isMarketOpen = position.market?.status !== 'closed' && position.market?.status !== 'resolved';
                            
                            if (isMarketOpen) {
                              return (
                                <div className="flex items-center gap-1">
                                  <div className="text-xs text-red-600">Lost</div>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => handleBuyMore(position)}
                                    className="p-1 h-6 w-6 ml-1"
                                    title="Buy More"
                                  >
                                    <Plus className="h-3 w-3" />
                                  </Button>
                                </div>
                              );
                            }
                            
                            return (
                              <div className="text-xs text-red-600">
                                Lost
                              </div>
                            );
                          }

                          return null;
                        })()}
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
    </Card>
  )
}
