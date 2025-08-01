'use client'

import { useState, useRef, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Loader2, TrendingUp, Shield, Target, Sparkles, BookOpen, ArrowDown, ArrowUp } from 'lucide-react'

export default function PlaceBetForm({ 
  market, 
  outcome, 
  onSuccess, 
  onCancel,
  showCard = true,
  className = ""
}) {
  // References for input fields to maintain focus
  const inputRefs = {
    max_bid_price: useRef(null),
    sell_price: useRef(null),
    stop_loss_price: useRef(null),
    volume: useRef(null)
  }
  
  const [formData, setFormData] = useState({
    max_bid_price: '',
    sell_price: '',
    stop_loss_price: '',
    volume: ''
  })
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState('')
  
  // Price suggestions based on current market price and order book data
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [activeField, setActiveField] = useState(null)
  
  // Order book data state
  const [orderBook, setOrderBook] = useState(null)
  const [orderBookLoading, setOrderBookLoading] = useState(false)
  const [orderBookError, setOrderBookError] = useState(null)
  
  // Price statistics from historical data and order book
  const [priceStats, setPriceStats] = useState({
    dayHigh: null,
    dayLow: null,
    hourChange: null,
    bestBid: null,
    bestAsk: null,
    spread: null
  })

  const handleInputChange = (field, value) => {
    // Store the current selection position
    const input = inputRefs[field].current
    const selectionStart = input ? input.selectionStart : null
    const selectionEnd = input ? input.selectionEnd : null
    
    setFormData(prev => ({
      ...prev,
      [field]: value
    }))
    setError('') // Clear error when user types
    
    // Restore cursor position after state update
    if (selectionStart !== null && selectionEnd !== null) {
      setTimeout(() => {
        if (input) {
          input.setSelectionRange(selectionStart, selectionEnd)
        }
      }, 0)
    }
  }
  
  // Auto-fill price fields based on order book data and historical data
  const autoFillPrices = () => {
    const currentPricePercent = (outcome.probability * 100).toFixed(2)
    const currentPrice = parseFloat(currentPricePercent)
    
    // Intelligent price suggestions based on order book data
    let maxBid, sellTarget, stopLoss
    
    // For limit buy orders, use the best ask from the order book if available
    if (priceStats.bestAsk) {
      // Set max_bid_price to slightly below best ask for better fills
      const bestAskPercent = priceStats.bestAsk * 100
      maxBid = Math.max(bestAskPercent - 0.2, 1).toFixed(2)
    } else {
      // Fall back to current price if no order book data
      maxBid = Math.max(currentPrice - 1, 1).toFixed(2)
    }
    
    // For take profit (sell price), use the best ask + increment if available
    if (priceStats.bestAsk) {
      const bestAskPercent = priceStats.bestAsk * 100
      sellTarget = Math.min(bestAskPercent + 2, 99).toFixed(2)
    } else if (priceStats.dayHigh) {
      // Fall back to day high if available
      const dayHigh = priceStats.dayHigh * 100
      sellTarget = Math.min(dayHigh + 2, 99).toFixed(2)
    } else {
      // Last resort: use current price + percentage
      sellTarget = Math.min(currentPrice + 10, 99).toFixed(2)
    }
    
    // For stop loss, use the best bid - decrement if available
    if (priceStats.bestBid) {
      const bestBidPercent = priceStats.bestBid * 100
      stopLoss = Math.max(bestBidPercent - 2, 1).toFixed(2)
    } else if (priceStats.dayLow) {
      // Fall back to day low if available
      const dayLow = priceStats.dayLow * 100
      stopLoss = Math.max(dayLow - 2, 1).toFixed(2)
    } else {
      // Last resort: use current price - percentage
      stopLoss = Math.max(currentPrice - 7, 1).toFixed(2)
    }
    
    setFormData(prev => ({
      ...prev,
      max_bid_price: maxBid,
      sell_price: sellTarget,
      stop_loss_price: stopLoss
    }))
  }
  
  // Show price suggestions for the field with focus
  const handleFocus = (field) => {
    setActiveField(field)
    setShowSuggestions(true)
  }
  
  const handleBlur = () => {
    // Short delay to allow clicking on suggestions
    setTimeout(() => setShowSuggestions(false), 200)
  }
  
  // Apply a suggested price to a specific field
  const applySuggestion = (field, value) => {
    handleInputChange(field, value)
    if (inputRefs[field].current) {
      inputRefs[field].current.focus()
    }
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
    console.log('Form submitted with data:', formData);
    e.preventDefault()
    
    const validationError = validateForm()
    if (validationError) {
      setError(validationError)
      return
    }

    setIsSubmitting(true)
    setError('')

    try {
      // Convert percentage values (0-100) to decimal values (0-1) for the backend
      const convertToDecimal = (percentValue) => {
        if (!percentValue) return undefined;
        const decimalValue = parseFloat(percentValue) / 100;
        return decimalValue;
      };
      
      const positionData = {
        market_id: market.id,
        outcome_id: outcome.id,
        max_bid_price: convertToDecimal(formData.max_bid_price),
        ...(formData.sell_price && { sell_price: convertToDecimal(formData.sell_price) }),
        ...(formData.stop_loss_price && { stop_loss_price: convertToDecimal(formData.stop_loss_price) }),
        ...(formData.volume && { volume: parseFloat(formData.volume) }) // Volume is not a percentage
      }

      console.log('Sending position data to backend:', positionData);

      const response = await fetch('http://localhost:8000/api/v1/positions/', {
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

  // Suggested price values based on current price, historical data and order book data
  const getSuggestions = (field) => {
    const currentPricePercent = (outcome.probability * 100).toFixed(2)
    const currentPrice = parseFloat(currentPricePercent)
    
    // Price stats from historical data (converted to percentages)
    const dayHigh = priceStats.dayHigh ? (priceStats.dayHigh * 100).toFixed(2) : null
    const dayLow = priceStats.dayLow ? (priceStats.dayLow * 100).toFixed(2) : null
    
    // Order book data (converted to percentages)
    const bestBid = priceStats.bestBid ? (priceStats.bestBid * 100).toFixed(2) : null
    const bestAsk = priceStats.bestAsk ? (priceStats.bestAsk * 100).toFixed(2) : null
    
    // Different suggestions based on field type
    switch (field) {
      case 'max_bid_price': {
        const suggestions = [
          { label: 'Current Price', value: currentPricePercent }
        ]
        
        // Add best bid from order book (best for limit orders)
        if (bestBid) {
          suggestions.push({ label: 'Best Bid', value: bestBid })
          // Add slightly above best bid
          const aboveBid = Math.min(parseFloat(bestBid) + 0.5, 99).toFixed(2)
          suggestions.push({ label: 'Above Best Bid', value: aboveBid })
        }
        
        // Add best ask from order book
        if (bestAsk) {
          suggestions.push({ label: 'Best Ask', value: bestAsk })
          // Add slightly below best ask for better fills
          const belowAsk = Math.max(parseFloat(bestAsk) - 0.5, 1).toFixed(2)
          suggestions.push({ label: 'Below Best Ask', value: belowAsk })
        }
        
        // Add suggestions based on historical data if available
        if (dayLow) {
          suggestions.push({ label: '24h Low', value: dayLow })
        }
        
        return suggestions
      }
      
      case 'sell_price': {
        const suggestions = [
          { label: 'Target +10%', value: Math.min(currentPrice + 10, 99).toFixed(2) },
          { label: 'Target +5%', value: Math.min(currentPrice + 5, 99).toFixed(2) }
        ]
        
        // Add best ask from order book as potential target
        if (bestAsk) {
          // Add slightly above best ask as target
          const aboveAsk = Math.min(parseFloat(bestAsk) + 1, 99).toFixed(2)
          suggestions.push({ label: 'Above Best Ask', value: aboveAsk })
        }
        
        // Add suggestions based on historical data if available
        if (dayHigh) {
          suggestions.push({ label: '24h High', value: dayHigh })
          // Add slightly above 24h high as potential exit
          const aboveHigh = Math.min(parseFloat(dayHigh) + 2, 99).toFixed(2)
          suggestions.push({ label: 'Above 24h High', value: aboveHigh })
        }
        
        return suggestions
      }
      
      case 'stop_loss_price': {
        const suggestions = [
          { label: 'Stop -5%', value: Math.max(currentPrice - 5, 1).toFixed(2) },
          { label: 'Stop -10%', value: Math.max(currentPrice - 10, 1).toFixed(2) }
        ]
        
        // Add best bid from order book as potential stop
        if (bestBid) {
          // Add slightly below best bid as stop
          const belowBid = Math.max(parseFloat(bestBid) - 1, 1).toFixed(2)
          suggestions.push({ label: 'Below Best Bid', value: belowBid })
        }
        
        // Add suggestions based on historical data if available
        if (dayLow) {
          const belowLow = Math.max(parseFloat(dayLow) - 1, 1).toFixed(2)
          suggestions.push({ label: 'Below 24h Low', value: belowLow })
        }
        
        return suggestions
      }
      
      default:
        return []
    }
  }
  
  // Fetch order book data when component mounts
  useEffect(() => {
    if (!outcome?.clob_id) return
    
    // Function to fetch order book data
    const fetchOrderBook = async () => {
      setOrderBookLoading(true)
      try {
        const url = `https://clob.polymarket.com/book?token_id=${outcome.clob_id}`
        console.log('Fetching order book from URL:', url)
        
        const response = await fetch(url)
        if (!response.ok) {
          throw new Error(`Failed to fetch order book: ${response.status}`)
        }
        
        const data = await response.json()
        console.log('Received order book data:', data)
        setOrderBook(data)
        
        // Extract best bid and ask prices
        if (data) {
          // Find highest bid (buy order)
          let bestBid = null
          if (data.bids && data.bids.length > 0) {
            bestBid = Math.max(...data.bids.map(bid => bid.price))
          }
          
          // Find lowest ask (sell order)
          let bestAsk = null
          if (data.asks && data.asks.length > 0) {
            bestAsk = Math.min(...data.asks.map(ask => ask.price))
          }
          
          // Calculate spread
          let spread = null
          if (bestBid !== null && bestAsk !== null) {
            spread = bestAsk - bestBid
          }
          
          // Update price statistics with order book data
          setPriceStats(prev => ({
            ...prev,
            bestBid,
            bestAsk,
            spread
          }))
        }
      } catch (error) {
        console.error('Error fetching order book:', error)
        setOrderBookError(error.message || 'Failed to load order book')
      } finally {
        setOrderBookLoading(false)
      }
    }
    
    // Fetch order book initially
    fetchOrderBook()
    
    // Set up polling for order book updates
    const intervalId = setInterval(() => {
      fetchOrderBook()
    }, 15000) // Update every 15 seconds
    
    return () => clearInterval(intervalId)
  }, [outcome?.clob_id])
  
  // Fetch price history data for 24h high/low
  useEffect(() => {
    if (!market?.id) return
    
    const fetchPriceHistory = async () => {
      try {
        // Get the last 24 hours of price history data
        const yesterday = new Date()
        yesterday.setDate(yesterday.getDate() - 1)
        
        const startTimeParam = yesterday.toISOString()
        const url = `http://localhost:8000/api/v1/markets/${market.id}/price-history?interval=hour&start_time=${startTimeParam}`
        
        const response = await fetch(url)
        if (!response.ok) {
          throw new Error('Failed to fetch price history')
        }
        
        const data = await response.json()
        
        // Calculate price statistics
        if (data?.outcomes && data.outcomes.length > 0) {
          const outcomeData = data.outcomes.find(o => o.outcome_id === outcome.id) || data.outcomes[0]
          if (outcomeData?.prices && outcomeData.prices.length > 0) {
            const prices = outcomeData.prices.map(p => p.price)
            
            // Calculate day stats
            const dayHigh = Math.max(...prices)
            const dayLow = Math.min(...prices)
            
            // Calculate hour change (most recent vs. hour ago)
            const recentPrice = prices[prices.length - 1] || outcome.probability
            const hourAgoPrice = prices.length > 1 ? prices[prices.length - 2] : recentPrice
            const hourChange = recentPrice - hourAgoPrice
            
            // Update price stats (preserve order book data)
            setPriceStats(prev => ({
              ...prev,
              dayHigh,
              dayLow,
              hourChange
            }))
          }
        }
      } catch (error) {
        console.error('Error fetching price history:', error)
      }
    }
    
    fetchPriceHistory()
  }, [market?.id, outcome?.id, outcome?.probability])
  
  const currentPrice = outcome.probability || 0.5

  const FormContent = () => (
    <div className={className}>
      <h3 className='text-lg font-semibold mb-4'>Place Limit Order</h3>
      {showCard && (
        <div className="mb-4">
          <h3 className="text-lg font-semibold flex items-center gap-2 mb-2">
            <TrendingUp className="h-5 w-5" />
            Place Bet
          </h3>
          <div className="text-sm text-gray-600 space-y-1">
            <p><strong>Market:</strong> {market.question}</p>
            <p><strong>Outcome:</strong> {outcome.name}</p>
            <p>
              <strong>Current Price:</strong> {(currentPrice * 100).toFixed(1)}¢
              {orderBookLoading && <Loader2 className="ml-1 h-3 w-3 inline animate-spin" />}
            </p>
            
            {/* Order Book Data */}
            {priceStats.bestBid !== null && priceStats.bestAsk !== null && (
              <div className="mt-2 p-2 bg-gray-50 rounded border border-gray-200">
                <div className="flex items-center gap-1 mb-1">
                  <BookOpen className="h-4 w-4 text-gray-600" />
                  <span className="text-sm font-medium text-gray-700">Order Book</span>
                </div>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div className="flex items-center">
                    <ArrowUp className="h-3 w-3 text-green-600 mr-1" />
                    <span>Best Bid: </span>
                    <span className="ml-auto font-medium text-green-600">{(priceStats.bestBid * 100).toFixed(2)}¢</span>
                    {orderBook?.bids?.length > 0 && (
                      <span className="ml-1 text-xs text-gray-500">({orderBook.bids.length})</span>
                    )}
                  </div>
                  <div className="flex items-center">
                    <ArrowDown className="h-3 w-3 text-red-600 mr-1" />
                    <span>Best Ask: </span>
                    <span className="ml-auto font-medium text-red-600">{(priceStats.bestAsk * 100).toFixed(2)}¢</span>
                    {orderBook?.asks?.length > 0 && (
                      <span className="ml-1 text-xs text-gray-500">({orderBook.asks.length})</span>
                    )}
                  </div>
                  {priceStats.spread !== null && (
                    <div className="col-span-2 mt-1 flex justify-between">
                      <span>Spread: </span>
                      <span className="font-medium">{(priceStats.spread * 100).toFixed(2)}¢</span>
                      <span className="text-xs text-gray-500">
                        Updated: {orderBook?.timestamp ? new Date(orderBook.timestamp).toLocaleTimeString() : 'now'}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            )}
            
            {/* Historical Data */}
            {priceStats.hourChange !== null && (
              <p className="mt-2">
                <strong>1h Change:</strong>{' '}
                <span className={priceStats.hourChange >= 0 ? 'text-green-600' : 'text-red-600'}>
                  {(priceStats.hourChange * 100).toFixed(2)}¢
                  {priceStats.hourChange >= 0 ? ' ↑' : ' ↓'}
                </span>
              </p>
            )}
            
            {priceStats.dayHigh !== null && priceStats.dayLow !== null && (
              <p>
                <strong>24h Range:</strong>{' '}
                {(priceStats.dayLow * 100).toFixed(1)}¢ - {(priceStats.dayHigh * 100).toFixed(1)}¢
              </p>
            )}
            
            {orderBookError && (
              <p className="text-xs text-red-500 mt-1">
                Order book error: {orderBookError}
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

        {/* Max Bid Price - Required */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label htmlFor="max_bid_price" className="flex items-center gap-2">
              <Target className="h-4 w-4" />
              Limit Order Price (¢) *
            </Label>
            <button 
              type="button" 
              className="text-xs text-blue-500 hover:underline flex items-center gap-1"
              onClick={() => autoFillPrices()}
            >
              <Sparkles className="h-3 w-3" />
              Auto-Fill
            </button>
          </div>
          <div className="relative">
            <Input
              id="max_bid_price"
              ref={inputRefs.max_bid_price}
              type="number"
              step="0.01"
              min="0.01"
              max="99.99"
              value={formData.max_bid_price}
              onChange={(e) => handleInputChange('max_bid_price', e.target.value)}
              onFocus={() => handleFocus('max_bid_price')}
              onBlur={handleBlur}
              placeholder="e.g., 65.50"
              required
              className="text-lg"
            />
            {showSuggestions && activeField === 'max_bid_price' && (
              <div className="absolute z-10 mt-1 w-full bg-white border border-gray-200 shadow-lg rounded-md p-2 flex flex-wrap gap-2">
                {getSuggestions('max_bid_price').map((suggestion) => (
                  <button
                    key={suggestion.label}
                    type="button"
                    onClick={() => applySuggestion('max_bid_price', suggestion.value)}
                    className="text-xs px-2 py-1 bg-blue-100 hover:bg-blue-200 rounded"
                  >
                    {suggestion.label}: {suggestion.value}¢
                  </button>
                ))}
              </div>
            )}
          </div>
          <p className="text-xs text-gray-500">
            Your order will execute at this price or better (current: {(currentPrice * 100).toFixed(2)}¢)
          </p>
        </div>

        {/* Volume - Optional */}
        <div className="space-y-2">
          <Label htmlFor="volume">
            Number of Shares (optional)
          </Label>
          <Input
            id="volume"
            ref={inputRefs.volume}
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
          <div className="relative">
            <Input
              id="sell_price"
              ref={inputRefs.sell_price}
              type="number"
              step="0.01"
              min="0.01"
              max="99.99"
              value={formData.sell_price}
              onChange={(e) => handleInputChange('sell_price', e.target.value)}
              onFocus={() => handleFocus('sell_price')}
              onBlur={handleBlur}
              placeholder="e.g., 75.00"
            />
            {showSuggestions && activeField === 'sell_price' && (
              <div className="absolute z-10 mt-1 w-full bg-white border border-gray-200 shadow-lg rounded-md p-2 flex flex-wrap gap-2">
                {getSuggestions('sell_price').map((suggestion) => (
                  <button
                    key={suggestion.label}
                    type="button"
                    onClick={() => applySuggestion('sell_price', suggestion.value)}
                    className="text-xs px-2 py-1 bg-blue-100 hover:bg-blue-200 rounded"
                  >
                    {suggestion.label}: {suggestion.value}¢
                  </button>
                ))}
              </div>
            )}
          </div>
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
          <div className="relative">
            <Input
              id="stop_loss_price"
              ref={inputRefs.stop_loss_price}
              type="number"
              step="0.01"
              min="0.01"
              max="99.99"
              value={formData.stop_loss_price}
              onChange={(e) => handleInputChange('stop_loss_price', e.target.value)}
              onFocus={() => handleFocus('stop_loss_price')}
              onBlur={handleBlur}
              placeholder="e.g., 55.00"
            />
            {showSuggestions && activeField === 'stop_loss_price' && (
              <div className="absolute z-10 mt-1 w-full bg-white border border-gray-200 shadow-lg rounded-md p-2 flex flex-wrap gap-2">
                {getSuggestions('stop_loss_price').map((suggestion) => (
                  <button
                    key={suggestion.label}
                    type="button"
                    onClick={() => applySuggestion('stop_loss_price', suggestion.value)}
                    className="text-xs px-2 py-1 bg-blue-100 hover:bg-blue-200 rounded"
                  >
                    {suggestion.label}: {suggestion.value}¢
                  </button>
                ))}
              </div>
            )}
          </div>
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
                Placing Order...
              </>
            ) : (
              'Place Limit Order'
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
