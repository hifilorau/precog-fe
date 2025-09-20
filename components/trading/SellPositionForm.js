'use client'

import React, { useState, useEffect, useMemo, useCallback, memo } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'
// Using native select for now - can upgrade to custom component later
import { Loader2, TrendingDown, Target, Shield, Info, DollarSign, Percent } from 'lucide-react'
import { useStateContext } from '@/app/store'
import { toast } from 'sonner'
import { formatPrice, getCurrentPrice, calculatePnL } from '@/app/utils/formatters'

function SellPositionForm({
  position,
  onSuccess,
  onCancel,
  showCard = true,
  className = ""
}) {
  // Get wallet balance and portfolio value from global state
  const { balance: globalBalance, portfolioValue, updateState } = useStateContext();
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState('')

  // Form state
  const [formData, setFormData] = useState({
    sellType: 'partial', // 'partial' or 'full'
    orderType: 'limit', // 'limit' or 'market'
    sellPrice: '',
    quantity: '',
    quantityType: 'shares' // 'shares' or 'percentage'
  })

  // Current price and position data
  const currentPrice = getCurrentPrice(position);
  const maxShares = position.volume || 0;
  const entryPrice = position.entry_price || position.max_bid_price || 0;

  // Calculate current position value and PnL
  const currentValue = useMemo(() => maxShares * currentPrice, [maxShares, currentPrice]);
  const pnlData = useMemo(() => calculatePnL(position, currentPrice), [position, currentPrice]);

  // Calculate shares to sell based on input
  const sharesToSell = useMemo(() => {
    if (formData.sellType === 'full') {
      return maxShares;
    }

    if (formData.quantityType === 'percentage') {
      const percentage = parseFloat(formData.quantity) || 0;
      return Math.floor((percentage / 100) * maxShares);
    }

    return parseFloat(formData.quantity) || 0;
  }, [formData.sellType, formData.quantityType, formData.quantity, maxShares]);

  // Calculate estimated proceeds
  const estimatedProceeds = useMemo(() => {
    const price = formData.orderType === 'market' ? currentPrice : (parseFloat(formData.sellPrice) / 100 || 0);
    return sharesToSell * price;
  }, [sharesToSell, formData.orderType, formData.sellPrice, currentPrice]);

  // Calculate PnL for this sell
  const sellPnL = useMemo(() => {
    const avgPrice = formData.orderType === 'market' ? currentPrice : (parseFloat(formData.sellPrice) / 100 || 0);
    const pnl = (avgPrice - entryPrice) * sharesToSell;
    const pnlPercent = entryPrice > 0 ? ((avgPrice - entryPrice) / entryPrice) * 100 : 0;
    return { pnl, pnlPercent };
  }, [sharesToSell, formData.orderType, formData.sellPrice, currentPrice, entryPrice]);

  // Initialize form data
  useEffect(() => {
    if (!position) return;

    // Set default sell price to current market price + small buffer
    const suggestedPrice = Math.min((currentPrice * 1.02 * 100), 99);

    setFormData(prev => ({
      ...prev,
      sellPrice: suggestedPrice.toFixed(1),
      quantity: formData.sellType === 'full' ? '100' : '25' // Default to 25% partial sell
    }));
  }, [position, currentPrice]);

  const updateFormData = useCallback((field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    setError('');
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault()
    setIsSubmitting(true)
    setError('')

    try {
      // Validation
      if (sharesToSell <= 0) {
        throw new Error('Quantity to sell must be greater than 0');
      }

      if (sharesToSell > maxShares) {
        throw new Error(`Cannot sell more than ${maxShares} shares (position size)`);
      }

      if (formData.orderType === 'limit') {
        const price = parseFloat(formData.sellPrice) / 100;
        if (!price || price <= 0 || price > 1) {
          throw new Error('Sell price must be between 0.1¢ and 100¢');
        }
      }

      // Prepare request data
      const sellData = {
        order_type: formData.orderType,
        quantity: sharesToSell,
        ...(formData.orderType === 'limit' && {
          price: parseFloat(formData.sellPrice) / 100
        })
      };

      console.log('Selling position with data:', sellData);

      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/positions/${position.id}/sell`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(sellData)
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.detail || `HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      console.log('Sell response:', result);

      // Show success message
      const orderTypeText = formData.orderType === 'market' ? 'Market' : 'Limit';
      const quantityText = sharesToSell === maxShares ? 'Full position' : `${sharesToSell} shares`;
      toast.success(`${orderTypeText} sell order placed for ${quantityText}`);

      // Call success handler
      onSuccess(result);

    } catch (error) {
      console.error('Error selling position:', error);
      setError(error.message || 'Failed to place sell order');
      toast.error(error.message || 'Failed to place sell order');
    } finally {
      setIsSubmitting(false);
    }
  }

  if (!position) {
    return <div>No position selected</div>;
  }

  return (
    <div className={className}>
      <h3 className='text-lg font-semibold mb-4 flex items-center gap-2'>
        <TrendingDown className="h-5 w-5 text-red-600" />
        Sell Position
      </h3>

      {showCard && (
        <div className="mb-4">
          <div className="bg-gray-50 rounded-lg p-4 text-sm text-gray-600 space-y-2">
            <p><strong>Market:</strong> {position.market?.question || 'Unknown Market'}</p>
            <p><strong>Outcome:</strong> {position.outcome?.name || 'Unknown Outcome'}</p>
            <p><strong>Position Size:</strong> {maxShares} shares</p>
            <p><strong>Entry Price:</strong> {formatPrice(entryPrice)}</p>
            <p><strong>Current Price:</strong> {formatPrice(currentPrice)}</p>
            {pnlData && (
              <p><strong>Current P&L:</strong>
                <span className={`ml-1 font-semibold ${pnlData.pnl >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  ${pnlData.pnl.toFixed(2)} ({pnlData.pnlPercent >= 0 ? '+' : ''}{pnlData.pnlPercent.toFixed(1)}%)
                </span>
              </p>
            )}
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Sell Type */}
        <div className="space-y-2">
          <Label htmlFor="sellType">Sell Type</Label>
          <select
            id="sellType"
            value={formData.sellType}
            onChange={(e) => updateFormData('sellType', e.target.value)}
            className="w-full px-3 py-2 border border-gray-200 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="partial">Partial Sell</option>
            <option value="full">Sell Full Position</option>
          </select>
        </div>

        {/* Quantity (only for partial sells) */}
        {formData.sellType === 'partial' && (
          <div className="space-y-2">
            <Label htmlFor="quantity">Quantity to Sell</Label>
            <div className="flex gap-2">
              <div className="flex-1">
                <Input
                  id="quantity"
                  type="number"
                  min="0"
                  max={formData.quantityType === 'shares' ? maxShares : 100}
                  step={formData.quantityType === 'shares' ? "1" : "0.1"}
                  value={formData.quantity}
                  onChange={(e) => updateFormData('quantity', e.target.value)}
                  placeholder={formData.quantityType === 'shares' ? "Number of shares" : "Percentage"}
                />
              </div>
              <select
                value={formData.quantityType}
                onChange={(e) => updateFormData('quantityType', e.target.value)}
                className="w-32 px-3 py-2 border border-gray-200 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="shares">Shares</option>
                <option value="percentage">%</option>
              </select>
            </div>
            <div className="text-xs text-gray-500">
              Will sell {sharesToSell} shares ({((sharesToSell / maxShares) * 100).toFixed(1)}% of position)
            </div>
          </div>
        )}

        {/* Order Type */}
        <div className="space-y-2">
          <Label htmlFor="orderType">Order Type</Label>
          <select
            id="orderType"
            value={formData.orderType}
            onChange={(e) => updateFormData('orderType', e.target.value)}
            className="w-full px-3 py-2 border border-gray-200 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="limit">Limit Order</option>
            <option value="market">Market Order</option>
          </select>
          <div className="text-xs text-gray-500">
            {formData.orderType === 'limit'
              ? 'Sell at a specific price or better'
              : 'Sell immediately at current market price'
            }
          </div>
        </div>

        {/* Sell Price (only for limit orders) */}
        {formData.orderType === 'limit' && (
          <div className="space-y-2">
            <Label htmlFor="sellPrice" className="flex items-center gap-2">
              <Target className="h-4 w-4" />
              Sell Price (¢)
            </Label>
            <Input
              id="sellPrice"
              type="number"
              min="0.1"
              max="99.9"
              step="0.1"
              value={formData.sellPrice}
              onChange={(e) => updateFormData('sellPrice', e.target.value)}
              placeholder="Price in cents (e.g., 75.5)"
            />
            <div className="text-xs text-gray-500">
              Current market price: {formatPrice(currentPrice)}
            </div>
          </div>
        )}

        {/* Estimated Proceeds */}
        <div className="bg-blue-50 rounded-lg p-4 space-y-2">
          <h4 className="font-semibold text-sm flex items-center gap-2">
            <Info className="h-4 w-4" />
            Estimated Transaction
          </h4>
          <div className="space-y-1 text-sm">
            <div className="flex justify-between">
              <span>Shares to sell:</span>
              <span className="font-semibold">{sharesToSell}</span>
            </div>
            <div className="flex justify-between">
              <span>Price per share:</span>
              <span className="font-semibold">
                {formData.orderType === 'market'
                  ? `${formatPrice(currentPrice)} (market)`
                  : `${formData.sellPrice}¢`
                }
              </span>
            </div>
            <div className="flex justify-between">
              <span>Estimated proceeds:</span>
              <span className="font-semibold">${estimatedProceeds.toFixed(2)}</span>
            </div>
            <div className="flex justify-between">
              <span>P&L for this sell:</span>
              <span className={`font-semibold ${sellPnL.pnl >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                ${sellPnL.pnl.toFixed(2)} ({sellPnL.pnlPercent >= 0 ? '+' : ''}{sellPnL.pnlPercent.toFixed(1)}%)
              </span>
            </div>
          </div>
        </div>

        {/* Submit buttons */}
        <div className="flex gap-3 pt-4">
          <Button
            type="button"
            variant="outline"
            onClick={onCancel}
            className="flex-1"
          >
            Cancel
          </Button>
          <Button
            type="submit"
            disabled={isSubmitting || sharesToSell <= 0}
            className="flex-1 bg-red-600 hover:bg-red-700 text-white"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Placing Order...
              </>
            ) : (
              `Sell ${sharesToSell} Shares`
            )}
          </Button>
        </div>
      </form>
    </div>
  )
}

export default memo(SellPositionForm)