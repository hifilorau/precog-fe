'use client'

import React from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { DollarSign, TrendingUp, PieChart, Target } from 'lucide-react'
import { useStateContext } from '@/app/store'
import { calculatePnL, getCurrentPrice } from '@/app/utils/formatters'

export default function StatsCards({ mergedPositions = [] }) {
  const { balance: usdcBalance, currentPrices } = useStateContext()
  
  // Ensure currentPrices is always a Map
  const pricesMap = currentPrices instanceof Map ? currentPrices : new Map()

  // Calculate stats from merged positions
  const calculateStats = () => {
    if (!Array.isArray(mergedPositions) || mergedPositions.length === 0) {
      return {
        openPositionsCount: 0,
        totalOpenPositionsValue: 0,
        totalPnL: 0,
        totalPortfolioValue: usdcBalance || 0
      }
    }

    // Filter for actual open positions (not resolved/lost)
    const openPositions = mergedPositions.filter(position => {
      const currentPrice = pricesMap.get(position.outcome_id) || getCurrentPrice(position)
      const currentValue = position.size && currentPrice ? position.size * currentPrice : Number(position?.currentValue ?? position?.current_value ?? 0)
      const isResolved = position?.resolved_status === 'lost' || position?.market?.status === 'closed'
      const hasZeroValue = currentValue === 0 || (currentPrice !== undefined && Number(currentPrice) === 0)
      
      // Position is open if it's not resolved and has value
      return !isResolved && !hasZeroValue && position.status === 'filled'
    })

    // Calculate total value of open positions
    const totalOpenPositionsValue = openPositions.reduce((total, position) => {
      const currentPrice = pricesMap.get(position.outcome_id) || getCurrentPrice(position)
      const currentValue = position.size && currentPrice ? position.size * currentPrice : Number(position?.currentValue ?? position?.current_value ?? 0)
      return total + currentValue
    }, 0)

    // Calculate total P&L from all positions (including closed ones for overall performance)
    // Always use real-time prices for accurate PnL calculations
    const totalPnL = mergedPositions.reduce((total, position) => {
      const currentPrice = pricesMap.get(position.outcome_id) || getCurrentPrice(position)
      const pnlData = calculatePnL(position, currentPrice)
      return total + (pnlData?.pnl || 0)
    }, 0)

    // Total portfolio value = USDC balance + open positions value
    const totalPortfolioValue = (usdcBalance || 0) + totalOpenPositionsValue

    return {
      openPositionsCount: openPositions.length,
      totalOpenPositionsValue,
      totalPnL,
      totalPortfolioValue
    }
  }

  const stats = calculateStats()

  const formatCurrency = (amount) => {
    if (amount == null || isNaN(amount)) return '$0.00'
    return `$${Math.abs(amount).toLocaleString(undefined, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`
  }

  const formatPnLWithSign = (amount) => {
    if (amount == null || isNaN(amount)) return '$0.00'
    const isPositive = amount >= 0
    const formatted = formatCurrency(amount)
    return isPositive ? `+${formatted}` : `-${formatted}`
  }

  const getPnLColor = (amount) => {
    if (amount == null || isNaN(amount) || amount === 0) return 'text-gray-600'
    return amount >= 0 ? 'text-green-600' : 'text-red-600'
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
      {/* Open Positions Card */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-gray-600 flex items-center gap-2">
            <Target className="h-4 w-4" />
            Open Positions
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{stats.openPositionsCount}</div>
          <p className="text-xs text-gray-500">Active trades</p>
          <div className="text-sm font-medium text-gray-700 mt-1">
            {formatCurrency(stats.totalOpenPositionsValue)}
          </div>
          <p className="text-xs text-gray-500">Total value</p>
        </CardContent>
      </Card>

      {/* Total P&L Card */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-gray-600 flex items-center gap-2">
            <TrendingUp className="h-4 w-4" />
            Total P&L
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className={`text-2xl font-bold ${getPnLColor(stats.totalPnL)}`}>
            {formatPnLWithSign(stats.totalPnL)}
          </div>
          <p className="text-xs text-gray-500">All-time gains/losses</p>
        </CardContent>
      </Card>

      {/* USDC Balance Card */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-gray-600 flex items-center gap-2">
            <DollarSign className="h-4 w-4" />
            USDC Balance
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{formatCurrency(usdcBalance)}</div>
          <p className="text-xs text-gray-500">Available to trade</p>
        </CardContent>
      </Card>

      {/* Portfolio Value Card */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-gray-600 flex items-center gap-2">
            <PieChart className="h-4 w-4" />
            Portfolio Value
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{formatCurrency(stats.totalPortfolioValue)}</div>
          <p className="text-xs text-gray-500">USDC + open positions</p>
          <div className="text-xs text-gray-600 mt-1">
            {formatCurrency(usdcBalance)} + {formatCurrency(stats.totalOpenPositionsValue)}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}