'use client'

import { useState, useEffect, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { 
  TrendingUp, 
  TrendingDown, 
  Clock, 
  DollarSign, 
  BarChart3, 
  Activity,
  CheckCircle,
  XCircle,
  AlertCircle,
  Loader2
} from 'lucide-react'

const StatusBadge = ({ status }) => {
  const statusConfig = {
    open: { color: 'bg-blue-500', icon: Clock, label: 'Open' },
    filled: { color: 'bg-green-500', icon: CheckCircle, label: 'Filled' },
    closed: { color: 'bg-gray-500', icon: CheckCircle, label: 'Closed' },
    cancelled: { color: 'bg-red-500', icon: XCircle, label: 'Cancelled' },
    rejected: { color: 'bg-red-600', icon: XCircle, label: 'Rejected' },
    pending: { color: 'bg-yellow-500', icon: Loader2, label: 'Pending' },
    submitted: { color: 'bg-blue-400', icon: Activity, label: 'Submitted' }
  }
  
  const config = statusConfig[status] || statusConfig.open
  const Icon = config.icon
  
  return (
    <Badge className={`${config.color} text-white`}>
      <Icon className="w-3 h-3 mr-1" />
      {config.label}
    </Badge>
  )
}

const OrderCard = ({ order }) => {
  return (
    <Card className="mb-4">
      <CardHeader className="pb-3">
        <div className="flex justify-between items-center">
          <CardTitle className="text-sm font-medium">
            {order.side.toUpperCase()} {order.order_type.toUpperCase()}
          </CardTitle>
          <StatusBadge status={order.status} />
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <p className="text-gray-500">Price</p>
            <p className="font-medium">${order.price?.toFixed(4) || 'Market'}</p>
          </div>
          <div>
            <p className="text-gray-500">Quantity</p>
            <p className="font-medium">{order.quantity}</p>
          </div>
          <div>
            <p className="text-gray-500">Filled</p>
            <p className="font-medium">{order.filled_quantity || 0} / {order.quantity}</p>
          </div>
          <div>
            <p className="text-gray-500">Created</p>
            <p className="font-medium">{new Date(order.created_at).toLocaleDateString()}</p>
          </div>
        </div>
        
        {order.external_order_id && (
          <div className="mt-3 pt-3 border-t">
            <p className="text-xs text-gray-500">External ID: {order.external_order_id}</p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

const FillCard = ({ fill }) => {
  return (
    <Card className="mb-3">
      <CardContent className="pt-4">
        <div className="grid grid-cols-3 gap-4 text-sm">
          <div>
            <p className="text-gray-500">Price</p>
            <p className="font-medium">${fill.price.toFixed(4)}</p>
          </div>
          <div>
            <p className="text-gray-500">Quantity</p>
            <p className="font-medium">{fill.quantity}</p>
          </div>
          <div>
            <p className="text-gray-500">Value</p>
            <p className="font-medium">${(fill.price * fill.quantity).toFixed(2)}</p>
          </div>
        </div>
        
        <div className="flex justify-between items-center mt-3 pt-3 border-t text-xs text-gray-500">
          <span>Filled: {new Date(fill.filled_at).toLocaleString()}</span>
          {fill.fee && <span>Fee: ${fill.fee.toFixed(4)}</span>}
        </div>
      </CardContent>
    </Card>
  )
}

const StatCard = ({ title, value, subtitle, icon: Icon, trend }) => {
  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-500">{title}</p>
            <p className="text-2xl font-bold">{value}</p>
            {subtitle && <p className="text-xs text-gray-500">{subtitle}</p>}
          </div>
          <div className="flex flex-col items-center">
            <Icon className="h-8 w-8 text-gray-400" />
            {trend && (
              <div className={`flex items-center mt-1 ${trend > 0 ? 'text-green-500' : 'text-red-500'}`}>
                {trend > 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                <span className="text-xs ml-1">{Math.abs(trend).toFixed(1)}%</span>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

export default function PositionDetails({ positionId, onClose }) {
  const [details, setDetails] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const fetchPositionDetails = useCallback(async () => {
    try {
      setLoading(true)
      const response = await fetch(`/api/v1/positions/${positionId}/details`)
      if (!response.ok) {
        throw new Error('Failed to fetch position details')
      }
      const data = await response.json()
      setDetails(data)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [positionId])

  useEffect(() => {
    fetchPositionDetails()
  }, [fetchPositionDetails])

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="p-8 text-center">
        <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
        <p className="text-red-600">{error}</p>
        <Button onClick={fetchPositionDetails} className="mt-4">
          Retry
        </Button>
      </div>
    )
  }

  if (!details) return null

  const { position, orders, fills, order_statistics, fill_statistics, pnl_info } = details

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Position Details</h2>
          <p className="text-gray-500">ID: {position.id}</p>
        </div>
        <div className="flex gap-2">
          <StatusBadge status={position.status} />
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <StatCard
          title="Entry Price"
          value={position.entry_price ? `$${position.entry_price.toFixed(4)}` : 'N/A'}
          subtitle={`Max Bid: $${position.max_bid_price.toFixed(4)}`}
          icon={DollarSign}
        />
        <StatCard
          title="Volume"
          value={position.volume}
          subtitle={`Value: $${position.entry_price ? (position.entry_price * position.volume).toFixed(2) : 'N/A'}`}
          icon={BarChart3}
        />
        <StatCard
          title="P&L"
          value={pnl_info ? `$${pnl_info.pnl_amount.toFixed(2)}` : 'N/A'}
          subtitle={pnl_info ? `${pnl_info.pnl_percentage.toFixed(1)}%` : ''}
          icon={TrendingUp}
          trend={pnl_info?.pnl_percentage}
        />
        <StatCard
          title="Total Fills"
          value={fill_statistics.total_fills}
          subtitle={`Avg: $${fill_statistics.average_price?.toFixed(4) || 'N/A'}`}
          icon={Activity}
        />
      </div>

      {/* Detailed Tabs */}
      <Tabs defaultValue="orders" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="orders">
            Orders ({order_statistics.total_orders})
          </TabsTrigger>
          <TabsTrigger value="fills">
            Fills ({fill_statistics.total_fills})
          </TabsTrigger>
          <TabsTrigger value="statistics">
            Statistics
          </TabsTrigger>
        </TabsList>

        <TabsContent value="orders" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-4">
            <StatCard
              title="Open Orders"
              value={order_statistics.open_orders}
              icon={Clock}
            />
            <StatCard
              title="Filled Orders"
              value={order_statistics.filled_orders}
              icon={CheckCircle}
            />
            <StatCard
              title="Cancelled/Rejected"
              value={order_statistics.cancelled_orders + order_statistics.rejected_orders}
              icon={XCircle}
            />
          </div>
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {orders.map((order) => (
              <OrderCard key={order.id} order={order} />
            ))}
          </div>
          
          {orders.length === 0 && (
            <div className="text-center py-8 text-gray-500">
              No orders found for this position
            </div>
          )}
        </TabsContent>

        <TabsContent value="fills" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            <StatCard
              title="Total Quantity"
              value={fill_statistics.total_quantity}
              icon={BarChart3}
            />
            <StatCard
              title="Total Value"
              value={`$${fill_statistics.total_value.toFixed(2)}`}
              icon={DollarSign}
            />
            <StatCard
              title="Total Fees"
              value={`$${fill_statistics.total_fees.toFixed(4)}`}
              icon={Activity}
            />
          </div>
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {fills.map((fill) => (
              <FillCard key={fill.id} fill={fill} />
            ))}
          </div>
          
          {fills.length === 0 && (
            <div className="text-center py-8 text-gray-500">
              No fills found for this position
            </div>
          )}
        </TabsContent>

        <TabsContent value="statistics" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Position Info */}
            <Card>
              <CardHeader>
                <CardTitle>Position Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-gray-500">Status</span>
                  <StatusBadge status={position.status} />
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Created</span>
                  <span>{new Date(position.created_at).toLocaleString()}</span>
                </div>
                {position.filled_at && (
                  <div className="flex justify-between">
                    <span className="text-gray-500">Filled</span>
                    <span>{new Date(position.filled_at).toLocaleString()}</span>
                  </div>
                )}
                {position.closed_at && (
                  <div className="flex justify-between">
                    <span className="text-gray-500">Closed</span>
                    <span>{new Date(position.closed_at).toLocaleString()}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-gray-500">Stop Loss</span>
                  <span>${position.stop_loss_price.toFixed(4)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Sell Target</span>
                  <span>${position.sell_price.toFixed(4)}</span>
                </div>
              </CardContent>
            </Card>

            {/* Trading Statistics */}
            <Card>
              <CardHeader>
                <CardTitle>Trading Statistics</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-gray-500">Total Orders</span>
                  <span>{order_statistics.total_orders}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Fill Rate</span>
                  <span>
                    {order_statistics.total_orders > 0 
                      ? ((order_statistics.filled_orders / order_statistics.total_orders) * 100).toFixed(1)
                      : 0}%
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Average Fill Price</span>
                  <span>${fill_statistics.average_price?.toFixed(4) || 'N/A'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Total Fees Paid</span>
                  <span>${fill_statistics.total_fees.toFixed(4)}</span>
                </div>
                {pnl_info && (
                  <>
                    <div className="flex justify-between">
                      <span className="text-gray-500">Entry Value</span>
                      <span>${pnl_info.entry_value.toFixed(2)}</span>
                    </div>
                    {pnl_info.exit_value && (
                      <div className="flex justify-between">
                        <span className="text-gray-500">Exit Value</span>
                        <span>${pnl_info.exit_value.toFixed(2)}</span>
                      </div>
                    )}
                  </>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}
