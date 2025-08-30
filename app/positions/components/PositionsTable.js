'use client'

import React, { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { DollarSign, Loader2, RefreshCw, Target, Shield, Clock, Edit, Plus } from 'lucide-react'
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
  const { mergedPositions, updateState } = useStateContext()
  
  // Real-time price context
  const {
    currentPrices,
    loading: pricesLoading,
    refreshPrices,
  } = useRealTimePrices(mergedPositions, 'positions', 'position')
  
  // Periodic balance refresh (every 30 seconds)
  usePeriodicBalance(30000, true)

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
                      <div className="font-medium text-sm truncate mb-1" title={position.market?.question}>
                        {position.market?.question || 'Unknown Market'}
                      </div>
                      <div className="text-sm text-muted-foreground mb-1">
                        {outcomeLabel}
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
                      <div className="flex flex-col gap-2">
                        {(() => {
                          // If current value is zero, show Lost (replace Claim Winnings)
                          const isLostValue = derivedCurrentValue != null && Number(derivedCurrentValue) === 0
                          if (isLostValue) {
                            // Check if market is still open for trading
                            const isMarketOpen = position.market?.status !== 'closed' && position.market?.status !== 'resolved';
                            
                            if (isMarketOpen) {
                              return (
                                <div className="flex flex-col gap-1">
                                  <Button variant="destructive" size="sm" disabled>
                                    Lost
                                  </Button>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => handleBuyMore(position)}
                                    className="text-xs"
                                  >
                                    <Plus className="h-3 w-3 mr-1" />
                                    Buy More
                                  </Button>
                                </div>
                              );
                            }
                            
                            return (
                              <Button variant="destructive" size="sm" disabled>
                                Lost
                              </Button>
                            );
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
                                className="bg-green-600 hover:bg-green-700 text-white"
                              >
                                {redeemingPosition === position.id ? (
                                  <>
                                    <Loader2 className="h-3 w-3 animate-spin mr-1" />
                                    Redeeming...
                                  </>
                                ) : (
                                  <>
                                    <DollarSign className="h-3 w-3 mr-1" />
                                    Claim
                                  </>
                                )}
                              </Button>
                            );
                          }

                          // Open/filled positions (not resolved) and not data-only -> allow Sell
                          const isFilled = position.status === 'filled'
                            && (!position.resolved_status || position.resolved_status === '')
                            && !position.isDataApi
                          if (isFilled) {
                            const riskLevel = getStopLossRiskLevel(position, currentPrice);
                            const isHighRisk = riskLevel && (riskLevel.level === 'crash' || riskLevel.level === 'high');
                            return (
                              <>
                                <Button
                                  variant={isHighRisk ? "destructive" : "outline"}
                                  size="sm"
                                  onClick={() => handleSellPosition(position)}
                                  disabled={sellingPosition === position.id}
                                  className={isHighRisk ? "animate-pulse" : ""}
                                >
                                  {sellingPosition === position.id ? (
                                    <>
                                      <Loader2 className="h-3 w-3 animate-spin mr-1" />
                                      Selling...
                                    </>
                                  ) : (
                                    <>
                                      {isHighRisk && <Shield className="h-3 w-3 mr-1" />}
                                      {isHighRisk ? 'SELL!' : 'Sell'}
                                    </>
                                  )}
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleEditPosition(position)}
                                  disabled={sellingPosition === position.id}
                                  className="mt-1"
                                >
                                  <Edit className="h-3 w-3 mr-1" />
                                  Edit
                                </Button>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleBuyMore(position)}
                                  disabled={sellingPosition === position.id}
                                  className="mt-1"
                                >
                                  <Plus className="h-3 w-3 mr-1" />
                                  Buy More
                                </Button>
                                {riskLevel && riskLevel.level === 'crash' && (
                                  <div className="flex items-center gap-1 text-xs text-red-600 font-medium">
                                    🚨 CRASH!
                                  </div>
                                )}
                              </>
                            );
                          }

                          // Pending: show Pending label and a Cancel button for open positions
                          if (position.status === 'open' || position.status === 'not_filled') {
                            return (
                              <div className="flex flex-col gap-1">
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
                                  >
                                    {cancelingPosition === position.id ? (
                                      <>
                                        <Loader2 className="h-3 w-3 animate-spin mr-1" />
                                        Cancel...
                                      </>
                                    ) : (
                                      'Cancel'
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
                                <div className="flex flex-col gap-1">
                                  <div className="flex items-center gap-1 text-xs text-red-600">
                                    Lost
                                  </div>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => handleBuyMore(position)}
                                    className="text-xs"
                                  >
                                    <Plus className="h-3 w-3 mr-1" />
                                    Buy More
                                  </Button>
                                </div>
                              );
                            }
                            
                            return (
                              <div className="flex items-center gap-1 text-xs text-red-600">
                                Lost
                              </div>
                            );
                          }

                          return null;
                        })()}
                      </div>
                    </div>
                  </div>
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