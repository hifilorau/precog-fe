'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Loader2, TrendingUp, Shield, Target } from 'lucide-react'

export default function PlaceBetForm({ 
  market, 
  outcome, 
  onSuccess, 
  onCancel,
  showCard = true,
  className = ""
}) {
  const [formData, setFormData] = useState({
    max_bid_price: '',
    sell_price: '',
    stop_loss_price: '',
    volume: ''
  })
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState('')

  const handleInputChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }))
    setError('') // Clear error when user types
  }

  const validateForm = () => {
    const { max_bid_price, sell_price, stop_loss_price } = formData
    
    if (!max_bid_price || parseFloat(max_bid_price) <= 0) {
      return 'Max bid price is required and must be greater than 0'
    }
    
    if (sell_price && parseFloat(sell_price) <= parseFloat(max_bid_price)) {
      return 'Sell price must be greater than max bid price'
    }
    
    if (stop_loss_price && parseFloat(stop_loss_price) >= parseFloat(max_bid_price)) {
      return 'Stop loss price must be less than max bid price'
    }
    
    return null
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    
    const validationError = validateForm()
    if (validationError) {
      setError(validationError)
      return
    }

    setIsSubmitting(true)
    setError('')

    try {
      const positionData = {
        market_id: market.id,
        outcome_id: outcome.id,
        max_bid_price: parseFloat(formData.max_bid_price),
        ...(formData.sell_price && { sell_price: parseFloat(formData.sell_price) }),
        ...(formData.stop_loss_price && { stop_loss_price: parseFloat(formData.stop_loss_price) }),
        ...(formData.volume && { volume: parseFloat(formData.volume) })
      }

      const response = await fetch('/api/v1/positions/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(positionData)
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.detail || 'Failed to create position')
      }

      const position = await response.json()
      onSuccess(position)
    } catch (err) {
      setError(err.message)
    } finally {
      setIsSubmitting(false)
    }
  }

  const currentPrice = outcome.probability || 0.5

  const FormContent = () => (
    <div className={className}>
      <h3 className='text-lg font-semibold mb-4'>Place Bet</h3>
      {showCard && (
        <div className="mb-4">
          <h3 className="text-lg font-semibold flex items-center gap-2 mb-2">
            <TrendingUp className="h-5 w-5" />
            Place Bet
          </h3>
          <div className="text-sm text-gray-600 space-y-1">
            <p><strong>Market:</strong> {market.question}</p>
            <p><strong>Outcome:</strong> {outcome.name}</p>
            <p><strong>Current Price:</strong> {(currentPrice * 100).toFixed(1)}¢</p>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Max Bid Price - Required */}
        <div className="space-y-2">
          <Label htmlFor="max_bid_price" className="flex items-center gap-2">
            <Target className="h-4 w-4" />
            Max Bid Price (¢) *
          </Label>
          <Input
            id="max_bid_price"
            type="number"
            step="0.01"
            min="0.01"
            max="99.99"
            value={formData.max_bid_price}
            onChange={(e) => handleInputChange('max_bid_price', e.target.value)}
            placeholder="e.g., 65.50"
            required
            className="text-lg"
          />
          <p className="text-xs text-gray-500">
            Maximum price you&apos;re willing to pay per share
          </p>
        </div>

        {/* Volume - Optional */}
        <div className="space-y-2">
          <Label htmlFor="volume">
            Number of Shares (optional)
          </Label>
          <Input
            id="volume"
            type="number"
            step="1"
            min="1"
            value={formData.volume}
            onChange={(e) => handleInputChange('volume', e.target.value)}
            placeholder="e.g., 100"
          />
          <p className="text-xs text-gray-500">
            Leave empty to use available balance
          </p>
        </div>

        {/* Sell Price - Optional */}
        <div className="space-y-2">
          <Label htmlFor="sell_price" className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-green-600" />
            Sell Target Price (¢)
          </Label>
          <Input
            id="sell_price"
            type="number"
            step="0.01"
            min="0.01"
            max="99.99"
            value={formData.sell_price}
            onChange={(e) => handleInputChange('sell_price', e.target.value)}
            placeholder="e.g., 75.00"
          />
          <p className="text-xs text-gray-500">
            Automatically sell when price reaches this level
          </p>
        </div>

        {/* Stop Loss Price - Optional */}
        <div className="space-y-2">
          <Label htmlFor="stop_loss_price" className="flex items-center gap-2">
            <Shield className="h-4 w-4 text-red-600" />
            Stop Loss Price (¢)
          </Label>
          <Input
            id="stop_loss_price"
            type="number"
            step="0.01"
            min="0.01"
            max="99.99"
            value={formData.stop_loss_price}
            onChange={(e) => handleInputChange('stop_loss_price', e.target.value)}
            placeholder="e.g., 55.00"
          />
          <p className="text-xs text-gray-500">
            Automatically sell when price drops to this level
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-3 pt-4">
          {onCancel && (
            <Button
              type="button"
              variant="outline"
              onClick={onCancel}
              className="flex-1"
              disabled={isSubmitting}
            >
              Cancel
            </Button>
          )}
          <Button
            type="submit"
            className={onCancel ? "flex-1" : "w-full"}
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Placing Bet...
              </>
            ) : (
              'Place Bet'
            )}
          </Button>
        </div>
      </form>
    </div>
  )

  if (showCard) {
    return (
      <Card className="w-full max-w-2xl mx-auto">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Place Bet
          </CardTitle>
          <div className="text-sm text-gray-600">
            <p><strong>Market:</strong> {market.question}</p>
            <p><strong>Outcome:</strong> {outcome.name}</p>
            <p><strong>Current Price:</strong> {(currentPrice * 100).toFixed(1)}¢</p>
          </div>
        </CardHeader>
        <CardContent>
          <FormContent />
        </CardContent>
      </Card>
    )
  }

  return <FormContent />
}
