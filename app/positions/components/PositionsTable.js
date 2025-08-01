'use client'

import { useState, useEffect, useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table'
import { 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  Clock, 
  Target,
  Shield,
  Loader2,
  RefreshCw
} from 'lucide-react'
import { useRealTimePrices } from '../../../hooks/useRealTimePrices'

export default function PositionsTable({ refreshTrigger = 0, onViewDetails }) {
  const [positions, setPositions] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [sellingPosition, setSellingPosition] = useState(null)
  
  // Transform positions to match the format expected by useRealTimePrices
  const positionOpportunities = useMemo(() => {
    return positions
      .filter(position => position.outcome) // Only include positions with outcome data
      .map(position => ({
        id: position.id, // Keep position ID for reference
        market_id: position.market?.id,
        market: position.market,
        outcome: position.outcome,
        outcome_id: position.outcome.id, // This is what will be used as the key for price lookup
        // Add any other required fields for price lookup
      }));
  }, [positions]);

  // Use the real-time prices hook
  const { currentPrices, loading: pricesLoading, refreshPrices } = 
    useRealTimePrices(positionOpportunities);

  const fetchPositions = async () => {
    try {
      setLoading(true)
      const response = await fetch('http://localhost:8000/api/v1/positions/')
      console.log(response)
      if (!response.ok) {
        throw new Error('Failed to fetch positions')
      }
      
      const data = await response.json()
      
      // Filter duplicate outcomes - use only the most recently updated ones
      const processedData = data.map(position => {
        if (position.market && position.market.outcomes && position.market.outcomes.length > 0) {
          // Group outcomes by clob_id (unique identifier)
          const outcomeGroups = position.market.outcomes.reduce((groups, outcome) => {
            const key = outcome.clob_id || outcome.external_id || outcome.name
            if (!groups[key] || new Date(outcome.updated_at) > new Date(groups[key].updated_at)) {
              groups[key] = outcome
            }
            return groups
          }, {})
          
          // Use only the most recent outcomes
          position.market.outcomes = Object.values(outcomeGroups)
          
          // Find the current position's outcome and use the most recent version
          // First try to find by ID, then by clob_id (in case the ID changed after deduplication)
          let currentOutcome = position.market.outcomes.find(o => o.id === position.outcome_id)
          
          if (!currentOutcome && position.outcome?.clob_id) {
            // If not found by ID, find by clob_id (handles deduplicated outcomes)
            currentOutcome = position.market.outcomes.find(o => o.clob_id === position.outcome.clob_id)
          }
          
          if (currentOutcome) {
            console.log(`Updating outcome for position ${position.id}: ${position.outcome?.current_price} -> ${currentOutcome.current_price}`)
            position.outcome = currentOutcome
          }
        }
        
        // Update position status based on market resolution
        if (position.market && position.market.status === 'closed') {
          // Check if this position was never filled (no actual trade)
          // Use volume and entry_price as primary indicators, since filled_at might be missing due to data issues
          const wasNeverFilled = (position.volume === 0 || position.volume === null) && 
                                (position.entry_price === 0 || position.entry_price === null)
          
          if (wasNeverFilled) {
            position.resolved_status = 'not_filled'
          } else {
            // Check if this is a resolved market with final prices
            const resolvedOutcome = position.market.outcomes.find(o => o.current_price === 1.0)
            if (resolvedOutcome) {
              position.market.resolved_at = position.market.updated_at // Use market update time as resolution time
              position.resolved_status = position.outcome_id === resolvedOutcome.id ? 'won' : 'lost'
            }
          }
        }
        
        return position
      })
      
      setPositions(processedData)
      setError('')
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchPositions()
  }, [refreshTrigger])

  const handleSellPosition = async (positionId) => {
    setSellingPosition(positionId)
    
    try {
      const response = await fetch(`/api/v1/positions/${positionId}/sell`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({}) // Empty body for market sell
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.detail || 'Failed to sell position')
      }

      // Refresh positions after successful sell
      await fetchPositions()
    } catch (err) {
      setError(err.message)
    } finally {
      setSellingPosition(null)
    }
  }

  const getStatusBadge = (position) => {
    // Check if market is resolved
    if (position.resolved_status) {
      if (position.resolved_status === 'won') {
        return <Badge variant="default" className="bg-green-500 text-white">Won</Badge>
      } else if (position.resolved_status === 'lost') {
        return <Badge variant="destructive">Lost</Badge>
      } else if (position.resolved_status === 'not_filled') {
        return <Badge variant="outline" className="text-gray-600">Not Filled</Badge>
      }
    }
    
    // Check if market is closed but not resolved
    if (position.market && position.market.status === 'closed') {
      return <Badge variant="outline">Closed</Badge>
    }
    
    // Default status badges
    const statusConfig = {
      open: { variant: 'secondary', label: 'Open' },
      filled: { variant: 'default', label: 'Filled' },
      closed: { variant: 'outline', label: 'Closed' },
      cancelled: { variant: 'destructive', label: 'Cancelled' }
    }
    
    const config = statusConfig[position.status] || statusConfig.open
    return <Badge variant={config.variant}>{config.label}</Badge>
  }

  const calculatePnL = (position, currentPrice) => {
    if (!position.entry_price || currentPrice === undefined || currentPrice === null) return null
    
    const entryPrice = position.entry_price
    const volume = position.volume || 1
    const pnl = (currentPrice - entryPrice) * volume
    const pnlPercent = ((currentPrice - entryPrice) / entryPrice) * 100
    
    return { pnl, pnlPercent }
  }
  
  // Get current price from real-time prices or fallback to position's outcome probability
  const getCurrentPrice = (position) => {
    if (!position?.outcome?.id) return position.outcome?.probability || 0;
    
    // Log for debugging
    console.log('Current prices map:', Object.fromEntries(currentPrices));
    console.log('Looking up price for outcome ID:', position.outcome.id);
    
    // Check if we have price data for this position's outcome (using outcome.id as key)
    const currentPrice = currentPrices.get(position.outcome.id);
    console.log('Current price for outcome:', currentPrice);
    
    if (currentPrice !== undefined) {
      console.log('Using real-time price:', currentPrice);
      return currentPrice;
    }
    
    // Use the filtered outcome's current_price (which should be the most recent/accurate)
    const outcomePrice = position.outcome?.current_price;
    if (outcomePrice !== undefined && outcomePrice !== null) {
      console.log('Using filtered outcome current_price:', outcomePrice);
      return outcomePrice;
    }
    
    console.log('Using fallback probability:', position.outcome?.probability);
    // Final fallback to the position's outcome probability if no price data is available
    return position.outcome?.probability || 0;
  }

  const formatPrice = (price) => {
    if (price === null || price === undefined) return '-'
    return `${(price * 100).toFixed(1)}¢`
  }

  const formatPnL = (pnl, pnlPercent) => {
    if (pnl === null || pnlPercent === null) return '-'
    
    const isPositive = pnl >= 0
    const color = isPositive ? 'text-green-600' : 'text-red-600'
    const icon = isPositive ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />
    
    return (
      <div className={`flex items-center gap-1 ${color}`}>
        {icon}
        <span>${pnl.toFixed(2)} ({pnlPercent.toFixed(1)}%)</span>
      </div>
    )
  }

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin mr-2" />
          Loading positions...
        </CardContent>
      </Card>
    )
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

        {positions.length === 0 ? (
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
                  <TableHead>Entry Price</TableHead>
                  <TableHead>Current Price</TableHead>
                  <TableHead>Volume</TableHead>
                  <TableHead>PnL</TableHead>
                  <TableHead>Targets</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {positions.map((position) => {
                  const currentPrice = getCurrentPrice(position);
                  const pnlData = calculatePnL(position, currentPrice);
                  
                  return (
                    <TableRow key={position.id}>
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
                        {position.outcome?.name || 'Unknown Outcome'}
                      </TableCell>
                      
                      <TableCell>
                        {getStatusBadge(position)}
                      </TableCell>
                      
                      <TableCell>
                        {formatPrice(position.entry_price)}
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
                        {position.volume || '-'}
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
                          
                          {position.status === 'filled' && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleSellPosition(position.id)}
                              disabled={sellingPosition === position.id}
                            >
                              {sellingPosition === position.id ? (
                                <>
                                  <Loader2 className="h-3 w-3 animate-spin mr-1" />
                                  Selling...
                                </>
                              ) : (
                                'Sell'
                              )}
                            </Button>
                          )}
                          
                          {position.status === 'open' && (
                            <div className="flex items-center gap-1 text-xs text-gray-500">
                              <Clock className="h-3 w-3" />
                              Pending
                            </div>
                          )}
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
