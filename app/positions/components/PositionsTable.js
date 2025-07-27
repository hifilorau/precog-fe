'use client'

import { useState, useEffect } from 'react'
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
  Loader2
} from 'lucide-react'

export default function PositionsTable({ refreshTrigger = 0 }) {
  const [positions, setPositions] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [sellingPosition, setSellingPosition] = useState(null)

  const fetchPositions = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/v1/positions/')
      
      if (!response.ok) {
        throw new Error('Failed to fetch positions')
      }
      
      const data = await response.json()
      setPositions(data)
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

  const getStatusBadge = (status) => {
    const statusConfig = {
      open: { variant: 'secondary', label: 'Open' },
      filled: { variant: 'default', label: 'Filled' },
      closed: { variant: 'outline', label: 'Closed' },
      cancelled: { variant: 'destructive', label: 'Cancelled' }
    }
    
    const config = statusConfig[status] || statusConfig.open
    return <Badge variant={config.variant}>{config.label}</Badge>
  }

  const calculatePnL = (position, currentPrice) => {
    if (!position.entry_price || !currentPrice) return null
    
    const entryPrice = position.entry_price
    const volume = position.volume || 1
    const pnl = (currentPrice - entryPrice) * volume
    const pnlPercent = ((currentPrice - entryPrice) / entryPrice) * 100
    
    return { pnl, pnlPercent }
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
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <DollarSign className="h-5 w-5" />
          Open Positions
        </CardTitle>
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
                  const currentPrice = position.outcome?.probability || 0.5 // Mock current price
                  const pnlData = calculatePnL(position, currentPrice)
                  
                  return (
                    <TableRow key={position.id}>
                      <TableCell className="max-w-xs">
                        <div className="truncate" title={position.market?.question}>
                          {position.market?.question || 'Unknown Market'}
                        </div>
                      </TableCell>
                      
                      <TableCell>
                        {position.outcome?.name || 'Unknown Outcome'}
                      </TableCell>
                      
                      <TableCell>
                        {getStatusBadge(position.status)}
                      </TableCell>
                      
                      <TableCell>
                        {formatPrice(position.entry_price)}
                      </TableCell>
                      
                      <TableCell>
                        {formatPrice(currentPrice)}
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
