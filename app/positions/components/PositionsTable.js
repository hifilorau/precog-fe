'use client'

import React, { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { DollarSign, Loader2, RefreshCw, Target, Shield, Clock } from 'lucide-react'

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

export default function PositionsTable({ refreshTrigger = 0, onViewDetails }) {
  const [sellingPosition, setSellingPosition] = useState(null)
  const [cancelingPosition, setCancelingPosition] = useState(null)
  const [redeemingPosition, setRedeemingPosition] = useState(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)
  const [mergedPositions, setMergedPositions] = useState([])
  // Real-time price context
  const {
    pricesLoading,
    refreshPrices,
  } = useRealTimePrices()

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
    const response = await fetch('http://localhost:8000/api/v1/positions/merged')
    if (!response.ok) {
      throw new Error('Failed to fetch merged positions')
    }
    return await response.json()
  }

  // Log the merged positions on every render (for debugging)
  console.log('Merged Positions:', mergedPositions)

  // Fetch merged positions data from the server
  useEffect(() => {
    let isMounted = true
    setLoading(true)
    setError('')

    const fetchPositionsData = async () => {
      try {
        // Fetch merged positions from backend
        const mergedData = await fetchMergedPositions()
        console.log('Fetched Merged Positions Data:', mergedData)
        if (!isMounted) return

        setMergedPositions(Array.isArray(mergedData) ? mergedData : [])
      } catch (err) {
        console.error('Error fetching positions:', err)
        if (isMounted) setError('Failed to load positions')
      } finally {
        if (isMounted) setLoading(false)
      }
    }

    fetchPositionsData()
    return () => { isMounted = false }
  }, [refreshTrigger, setMergedPositions])



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
      if (onPositionsUpdated) {
        onPositionsUpdated();
      }
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
        
        {/* {!allowances.usdc_for_exchange?.approved || !allowances.ctf_for_exchange?.approved ? (
          <TokenAllowance 
            position={positions[0]} 
            onAllowanceUpdated={handleAllowanceUpdated} 
            className="mb-4"
          />
        ) : null} */}

        {positionsToShow.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <DollarSign className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No positions found</p>
            <p className="text-sm">Place your first bet to get started</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Market</TableHead>
                  <TableHead>Outcome</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Closes At</TableHead>
                  <TableHead>Entry Price</TableHead>
                  <TableHead>Current Price</TableHead>
                  <TableHead>Current Value</TableHead>
                  <TableHead>Volume / Size</TableHead>
                  <TableHead>PnL</TableHead>
                  <TableHead>Targets</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {positionsToShow.map((position) => {
                  const currentPrice = getCurrentPrice(position)
                  const pnlData = (position.total_pnl != null || position.percentPnl != null)
                    ? { pnl: position.total_pnl ?? null, pnlPercent: position.percentPnl ?? null }
                    : calculatePnL(position, currentPrice)

                  const derivedCurrentValue = Number(
                    position?.currentValue ??
                    // TODO: add fallback logic here (e.g., position.size * currentPrice)
                    0
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
                    <TableRow key={rowKey}>
                      <TableCell className="max-w-xs">
                        <div className="truncate" title={position.market?.question}>
                          {position.market?.question || 'Unknown Market'}
                        </div>
                        {position.market?.status === 'closed' && (
                          <div className="text-xs text-gray-500 mt-1">
                            {position.resolved_status ? (
                              <span className={position.resolved_status === 'won' ? 'text-green-600' : 'text-red-600'}>
                                ✓ Resolved
                              </span>
                            ) : (
                              <span className="text-orange-600">⏰ Closed</span>
                            )}
                          </div>
                        )}
                      </TableCell>

                      <TableCell>
                        {outcomeLabel}
                      </TableCell>

                      <TableCell>
                        {getStatusBadge(position)}
                      </TableCell>

                      <TableCell>
                        {position.market?.endDate ? (
                          <div className="text-sm">
                            {new Date(position.market.endDate).toLocaleDateString('en-US', {
                              month: 'short',
                              day: 'numeric',
                              year: 'numeric'
                            })}
                          </div>
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </TableCell>

                      <TableCell>
                        <div className="space-y-1">
                          <div>{formatPrice(position.entry_price)}</div>
                          {(() => {
                            const riskLevel = getStopLossRiskLevel(position, currentPrice)
                            if (riskLevel) {
                              return (
                                <div className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium border ${riskLevel.color}`}>
                                  {riskLevel.message}
                                </div>
                              )
                            }
                            return null
                          })()} 
                        </div>
                      </TableCell>
                      
                      <TableCell className={pricesLoading ? 'opacity-70' : ''}>
                        {pricesLoading ? (
                          <div className="flex items-center gap-1">
                            <Loader2 className="h-3 w-3 animate-spin" />
                            {formatPrice(position.outcome?.probability)}
                          </div>
                        ) : (
                          formatPrice(currentPrice)
                        )}
                      </TableCell>

                      <TableCell>
                        {derivedCurrentValue != null ? `$${derivedCurrentValue.toFixed(2)}` : '-'}
                      </TableCell>
                      
                      <TableCell>
                        {/* show volume and size side-by-side */}
                        {formatVolume(position.volume)}{position.size != null ? ` / ${formatVolume(position.size)}` : ''}
                      </TableCell>
                      
                      <TableCell>
                        {pnlData ? formatPnL(pnlData.pnl, pnlData.pnlPercent) : '-'}
                      </TableCell>
                      
                      <TableCell>
                        <div className="space-y-1 text-xs">
                          {position.sell_price && (
                            <div className="flex items-center gap-1 text-green-600">
                              <Target className="h-3 w-3" />
                              {formatPrice(position.sell_price)}
                            </div>
                          )}
                          {position.stop_loss_price && (
                            <div className="flex items-center gap-1 text-red-600">
                              <Shield className="h-3 w-3" />
                              {formatPrice(position.stop_loss_price)}
                            </div>
                          )}
                        </div>
                      </TableCell>
                      
                      <TableCell>
                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => onViewDetails && onViewDetails(position.id)}
                          >
                            View Details
                          </Button>
                          
                          {(() => {
                            // If current value is zero, show Lost (replace Claim Winnings)
                            const isLostValue = derivedCurrentValue != null && Number(derivedCurrentValue) === 0
                            if (isLostValue) {
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
                                      Claim Winnings
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
                                        {isHighRisk ? 'EMERGENCY SELL' : 'Sell'}
                                      </>
                                    )}
                                  </Button>
                                  {riskLevel && riskLevel.level === 'crash' && (
                                    <div className="flex items-center gap-1 text-xs text-red-600 font-medium">
                                      🚨 CRASH DETECTED!
                                    </div>
                                  )}
                                </>
                              );
                            }

                            // Pending: show Pending label and a Cancel button for open positions
                            if (position.status === 'open' || position.status === 'not_filled') {
                              return (
                                <div className="flex items-center gap-2">
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
                                          Cancelling...
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
                                  Already Redeemed
                                </div>
                              );
                            }
                            
                            // Lost positions by resolution (if not captured by value==0)
                            if (position.resolved_status === 'lost') {
                              return (
                                <div className="flex items-center gap-1 text-xs text-red-600">
                                  Lost
                                </div>
                              );
                            }

                            return null;
                          })()}

                        </div>
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
