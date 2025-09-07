'use client'

import React, { useState, useRef, useEffect, useMemo, useCallback, memo } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Loader2, TrendingUp, Shield, Target, Sparkles, BookOpen, ArrowDown, ArrowUp, Wallet } from 'lucide-react'
import { useStateContext } from '@/app/store'
import { toast } from 'sonner'
import { useRealTimePrices } from '@/hooks/useRealTimePrices'

// Helper function to calculate number of shares based on balance and price
const calculateShares = (balance, price, percentage = 0.08) => {
  if (!balance || !price || price <= 0) return 0;
  const amountToSpend = balance * percentage;
  return Math.floor(amountToSpend / price);
};

function PlaceBetForm({ 
  market, 
  outcome, 
  onSuccess, 
  onCancel,
  showCard = true,
  className = ""
}) {
  // Get wallet balance and portfolio value from global state
  const { balance: globalBalance, portfolioValue, updateState } = useStateContext();
  const [isLoadingBalance, setIsLoadingBalance] = useState(false);
  
  // Memoize balance and portfolio value to prevent unnecessary re-renders
  const balance = useMemo(() => globalBalance, [globalBalance]);
  const totalPortfolioValue = useMemo(() => portfolioValue || globalBalance || 0, [portfolioValue, globalBalance]);
  
  // Stable refs for input elements
  const maxBidPriceRef = useRef(null);
  const volumeRef = useRef(null);
  const sellPriceRef = useRef(null);
  const stopLossRef = useRef(null);
  
  // Memoize refs object to maintain stability
  const inputRefs = useMemo(() => ({
    max_bid_price: maxBidPriceRef,
    volume: volumeRef,
    sell_price: sellPriceRef,
    stop_loss_price: stopLossRef
  }), []);

  // Form state
  const [formData, setFormData] = useState({
    max_bid_price: '',
    volume: '',
    sell_price: '',
    stop_loss_price: '',
    order_type: 'limit',
    time_in_force: 'gtc',
    post_only: true
  });

  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState('')
  
  // Price suggestions based on current market price and order book data
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [activeField, setActiveField] = useState(null)
  
  // Create a single-item array for the useRealtimePrices hook
  const outcomeForPricing = useMemo(() => {
    if (!outcome || !market) return [];
    return [{ outcome, market }];
  }, [outcome, market]);

  // Use the real-time prices hook for this specific outcome
  const { currentPrices, loading: pricesLoading, error: pricesError } = useRealTimePrices(
    outcomeForPricing,
    `bet-form-${outcome?.id || 'unknown'}`,
    'opportunity',
    { pollMs: 0, immediate: true }
  );
  
  // Price statistics from historical data and real-time prices
  const [priceStats, setPriceStats] = useState({
    dayHigh: null,
    dayLow: null,
    hourChange: null,
    bestBid: null,
    bestAsk: null,
    spread: null
  })

  // Update price stats when real-time prices change
  useEffect(() => {
    if (!outcome?.id || !currentPrices.has(outcome.id)) return;
    
    const currentPrice = currentPrices.get(outcome.id);
    if (currentPrice !== null && currentPrice !== undefined) {
      setPriceStats(prev => ({
        ...prev,
        bestAsk: currentPrice, // For opportunities, this is the asking price
        bestBid: currentPrice * 0.98, // Approximate bid as 2% below ask
        spread: currentPrice * 0.02 // Approximate 2% spread
      }));
    }
  }, [currentPrices, outcome?.id]);


  // Stable update form data function - defined early since it's used by other functions
  const updateFormData = useCallback((updater) => {
    setFormData(prev => ({
      ...prev,
      ...(typeof updater === 'function' ? updater(prev) : updater)
    }));
  }, []);

  // Fetch wallet balance and update form
  const fetchWalletBalance = useCallback(async () => {
    try {
      setIsLoadingBalance(true);
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1';
      const response = await fetch(`${apiUrl}/wallet/balance/usdc`, { cache: 'no-store' });
      if (!response.ok) throw new Error('Failed to fetch wallet balance');
      const { balance: usdcBalance } = await response.json();
      const numeric = typeof usdcBalance === 'string' ? parseFloat(usdcBalance) : usdcBalance;
      
      // Update global state
      updateState({ balance: Number.isFinite(numeric) ? numeric : 0 });
      return Number.isFinite(numeric) ? numeric : 0;
    } catch (error) {
      console.error('Error fetching wallet balance:', error);
      toast.error('Failed to load wallet balance');
      return 0;
    } finally {
      setIsLoadingBalance(false);
    }
  }, [updateState]);


  // Stable input change handler with proper validation
  const handleInputChange = useCallback((e) => {
    const { name, value } = e.target;
    
    // Allow empty values for better UX
    if (value === '') {
      updateFormData({ [name]: '' });
      return;
    }
    
    // Validate numeric inputs
    if (['max_bid_price', 'sell_price', 'stop_loss_price'].includes(name)) {
      // Allow partial decimal input (e.g., "1.", "1.2")
      const decimalPattern = /^\d*\.?\d*$/;
      if (!decimalPattern.test(value)) {
        return; // Don't update if invalid pattern
      }
    }
    
    // Volume should only allow integers
    if (name === 'volume') {
      const integerPattern = /^\d*$/;
      if (!integerPattern.test(value)) {
        return; // Don't update if invalid pattern
      }
    }
    
    // Update the form data
    updateFormData(prev => {
      const newData = { ...prev, [name]: value };
      
      // Recalculate shares when max bid price changes and has valid value
      if (name === 'max_bid_price' && value && !isNaN(parseFloat(value))) {
        const price = parseFloat(value) / 100; // Convert percentage to decimal
        if (price > 0 && price <= 1) { // Valid price range
          const shares = calculateShares(totalPortfolioValue || 0, price);
          newData.volume = shares.toString();
        }
      }
      
      return newData;
    });
  }, [totalPortfolioValue, updateFormData]);
  
  // Stable refresh balance handler
  const handleRefreshBalance = useCallback(async (e) => {
    e?.preventDefault();
    const newBalance = await fetchWalletBalance();
    if (newBalance > 0) {
      // Get current form data without depending on it in useCallback
      const currentPrice = parseFloat(document.getElementById('max_bid_price')?.value || '0');
      if (currentPrice > 0) {
        // Use the updated portfolio value (balance will be updated via updateState)
        const updatedPortfolioValue = portfolioValue || newBalance;
        const shares = calculateShares(updatedPortfolioValue, currentPrice / 100); // Convert percentage to decimal
        updateFormData(prev => ({ ...prev, volume: shares.toString() }));
      }
      toast.success('Balance refreshed');
    }
  }, [fetchWalletBalance, updateFormData, portfolioValue]);

  // Auto-fill price fields based on order book data and historical data
  const autoFillPrices = async () => {
    // Ensure we have historical stats if user asks for auto-fill
    await ensurePriceHistoryLoaded();
    const currentPricePercent = (outcome.probability * 100).toFixed(2)
    const currentPrice = parseFloat(currentPricePercent)
    
    // Intelligent price suggestions based on order book data
    let maxBid, sellTarget, stopLoss
    
    // For limit buy orders, use the best ask from the order book if available
    if (priceStats.bestAsk && !isNaN(priceStats.bestAsk)) {
      // Set max_bid_price to slightly below best ask for better fills
      const bestAskPercent = priceStats.bestAsk * 100
      maxBid = Math.max(bestAskPercent - 0.2, 1).toFixed(2)
    } else {
      // Fall back to current price if no order book data
      maxBid = Math.max(currentPrice - 1, 1).toFixed(2)
    }
    
    // For take profit (sell price), use the best ask + increment if available
    if (priceStats.bestAsk && !isNaN(priceStats.bestAsk)) {
      const bestAskPercent = priceStats.bestAsk * 100
      sellTarget = Math.min(bestAskPercent + 2, 99).toFixed(2)
    } else if (priceStats.dayHigh && !isNaN(priceStats.dayHigh)) {
      // Fall back to day high if available
      const dayHigh = priceStats.dayHigh * 100
      sellTarget = Math.min(dayHigh + 2, 99).toFixed(2)
    } else {
      // Last resort: use current price + percentage
      sellTarget = Math.min(currentPrice + 10, 99).toFixed(2)
    }
    
    // For stop loss, use the best bid - decrement if available
    if (priceStats.bestBid && !isNaN(priceStats.bestBid)) {
      const bestBidPercent = priceStats.bestBid * 100
      stopLoss = Math.max(bestBidPercent - 2, 1).toFixed(2)
    } else if (priceStats.dayLow && !isNaN(priceStats.dayLow)) {
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
    // Load history on-demand when opening suggestion-heavy fields
    if (field === 'sell_price' || field === 'stop_loss_price' || field === 'max_bid_price') {
      // Fire and forget
      ensurePriceHistoryLoaded();
    }
  }
  
  const handleBlur = () => {
    // Short delay to allow clicking on suggestions
    setTimeout(() => setShowSuggestions(false), 200)
  }
  
  // Apply a suggested price to a specific field
  const applySuggestion = (field, value) => {
    handleInputChange({ target: { name: field, value } })
    if (inputRefs[field].current) {
      inputRefs[field].current.focus()
    }
  }

  // Calculate potential loss at stop loss price
  const calculateStopLossAmount = (stopLossPrice, shares, entryPrice) => {
    if (!stopLossPrice || !shares || !entryPrice) return null;
    const stopDecimal = parseFloat(stopLossPrice) / 100;
    const entryDecimal = parseFloat(entryPrice) / 100;
    const numShares = parseInt(shares);
    
    if (stopDecimal >= entryDecimal) return null; // Stop loss should be below entry
    
    const lossPerShare = entryDecimal - stopDecimal;
    const totalLoss = lossPerShare * numShares;
    return totalLoss;
  };

  // Calculate potential gain at sell target price  
  const calculateSellTargetAmount = (sellPrice, shares, entryPrice) => {
    if (!sellPrice || !shares || !entryPrice) return null;
    const sellDecimal = parseFloat(sellPrice) / 100;
    const entryDecimal = parseFloat(entryPrice) / 100;
    const numShares = parseInt(shares);
    
    if (sellDecimal <= entryDecimal) return null; // Sell target should be above entry
    
    const gainPerShare = sellDecimal - entryDecimal;
    const totalGain = gainPerShare * numShares;
    return totalGain;
  };

  const validateForm = () => {
    const { max_bid_price, sell_price, stop_loss_price } = formData
    
    if (!max_bid_price || parseFloat(max_bid_price) <= 0) {
      return 'Max bid price is required and must be greater than 0'
    }
    
    if (parseFloat(max_bid_price) >= 100) {
      return 'Max bid price must be less than 100 (1.00)'
    }
    
    if (sell_price) {
      if (parseFloat(sell_price) <= parseFloat(max_bid_price)) {
        return 'Sell price must be greater than max bid price'
      }
      if (parseFloat(sell_price) >= 100) {
        return 'Sell price must be less than 100 (1.00)'
      }
    }
    
    if (stop_loss_price) {
      if (parseFloat(stop_loss_price) >= parseFloat(max_bid_price)) {
        return 'Stop loss price must be less than max bid price'
      }
      if (parseFloat(stop_loss_price) <= 0) {
        return 'Stop loss price must be greater than 0'
      }
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
      const positionData = {
        market_id: market.id,
        outcome_id: outcome.id,
        max_bid_price: parseFloat(formData.max_bid_price) / 100, // Convert to decimal for backend
        volume: parseFloat(formData.volume),
        sell_price: formData.sell_price ? parseFloat(formData.sell_price) / 100 : null,
        stop_loss_price: formData.stop_loss_price ? parseFloat(formData.stop_loss_price) / 100 : null,
        order_type: formData.order_type,
        time_in_force: formData.time_in_force,
        post_only: formData.post_only
      }

      console.log('Sending position data to backend:', positionData);

      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/positions/`, {
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
  
  
  // Lazily fetch price history (24h) only when needed
  const priceHistoryRequestedRef = useRef(false);
  const ensurePriceHistoryLoaded = useCallback(async () => {
    if (!market?.id || !outcome?.id) return;
    if (priceHistoryRequestedRef.current) return;
    priceHistoryRequestedRef.current = true;

    const abortController = new AbortController();
    try {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const startTimeParam = yesterday.toISOString();
      const base = process.env.NEXT_PUBLIC_API_URL?.replace(/\/?$/, '/');
      const url = `${base}markets/${market.id}/price-history?interval=hour&start_time=${startTimeParam}`;

      const response = await fetch(url, { signal: abortController.signal });
      if (!response.ok) throw new Error('Failed to fetch price history');
      const data = await response.json();

      if (data?.outcomes && data.outcomes.length > 0) {
        const outcomeData = data.outcomes.find(o => o.outcome_id === outcome.id) || data.outcomes[0];
        if (outcomeData?.prices && outcomeData.prices.length > 0) {
          const prices = outcomeData.prices.map(p => p.price);
          const dayHigh = Math.max(...prices);
          const dayLow = Math.min(...prices);
          const recentPrice = prices[prices.length - 1] || outcome.probability;
          const hourAgoPrice = prices.length > 1 ? prices[prices.length - 2] : recentPrice;
          const hourChange = recentPrice - hourAgoPrice;
          setPriceStats(prev => ({ ...prev, dayHigh, dayLow, hourChange }));
        }
      }
    } catch (error) {
      if (error?.name !== 'AbortError') {
        console.error('Error fetching price history:', error);
      }
    }
    // no explicit abort on unmount; single-shot fetch guarded by ref
  }, [market?.id, outcome?.id, outcome?.probability]);
  
  const currentPrice = outcome.probability || 0.5

  // Memoized PnL previews for UI labels
  const potentialGain = useMemo(() => (
    calculateSellTargetAmount(formData.sell_price, formData.volume, formData.max_bid_price)
  ), [formData.sell_price, formData.volume, formData.max_bid_price]);

  const potentialLoss = useMemo(() => (
    calculateStopLossAmount(formData.stop_loss_price, formData.volume, formData.max_bid_price)
  ), [formData.stop_loss_price, formData.volume, formData.max_bid_price]);

  // Set initial values when outcome changes (not on every render)
  useEffect(() => {
    if (!outcome?.id) return;
    
    const decimalPrice = outcome.current_price || outcome.probability || 0.5;
    const percentagePrice = (decimalPrice * 100).toFixed(2); // Convert 0.65 -> "65.00"
    
    // Use functional update to avoid dependency on updateFormData
    setFormData(prev => {
      // Only update if values are actually different
      const needsUpdate = prev.max_bid_price !== percentagePrice;
      if (!needsUpdate) return prev;
      
      const shares = totalPortfolioValue > 0 ? calculateShares(totalPortfolioValue, decimalPrice) : 0;
      
      return {
        ...prev,
        max_bid_price: percentagePrice,
        volume: shares > 0 ? shares.toString() : prev.volume
      };
    });
    
    // Only depend on outcome ID and specific price fields
  }, [outcome?.id, outcome?.current_price, outcome?.probability, totalPortfolioValue]);

  return (
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
              {pricesLoading && <Loader2 className="ml-1 h-3 w-3 inline animate-spin" />}
            </p>
            
            {/* Real-time Price Data */}
            {priceStats.bestBid !== null && priceStats.bestAsk !== null && (
              <div className="mt-2 p-2 bg-gray-50 rounded border border-gray-200">
                <div className="flex items-center gap-1 mb-1">
                  <BookOpen className="h-4 w-4 text-gray-600" />
                  <span className="text-sm font-medium text-gray-700">Market Data</span>
                </div>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div className="flex items-center">
                    <ArrowUp className="h-3 w-3 text-green-600 mr-1" />
                    <span>Bid: </span>
                    <span className="ml-auto font-medium text-green-600">{(priceStats.bestBid * 100).toFixed(2)}¢</span>
                  </div>
                  <div className="flex items-center">
                    <ArrowDown className="h-3 w-3 text-red-600 mr-1" />
                    <span>Ask: </span>
                    <span className="ml-auto font-medium text-red-600">{(priceStats.bestAsk * 100).toFixed(2)}¢</span>
                  </div>
            {priceStats.spread !== null && (
              <div className="col-span-2 mt-1 flex justify-between">
                <span>Spread: </span>
                <span className="font-medium">{(priceStats.spread * 100).toFixed(2)}¢</span>
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
            
            {pricesError && (
              <p className="text-xs text-red-500 mt-1">
                Price data error: {pricesError.message || 'Failed to load prices'}
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
              name="max_bid_price"
              type="text"
              inputMode="decimal"
              value={formData.max_bid_price}
              onChange={handleInputChange}
              ref={inputRefs.max_bid_price}
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

        <div className="grid gap-4">
          <div className="flex items-center justify-between p-3 bg-muted/50 rounded-md">
            <div className="flex items-center space-x-2">
              <Wallet className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">Available Balance:</span>
              {isLoadingBalance ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <span className="font-mono">{balance?.toFixed(2) || '0.00'} USDC</span>
              )}
            </div>
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={handleRefreshBalance}
              disabled={isLoadingBalance}
            >
              {isLoadingBalance ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                'Refresh'
              )}
            </Button>
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="max_bid_price">Max Bid Price (USDC)</Label>
              <Input
                id="max_bid_price"
                name="max_bid_price"
                type="text"
                inputMode="decimal"
                value={formData.max_bid_price}
                onChange={handleInputChange}
                ref={inputRefs.max_bid_price}
                placeholder="0.50"
              />
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="volume">Number of Shares</Label>
                <span className="text-xs text-muted-foreground">
                  ~{((parseFloat(formData.max_bid_price || 0) / 100) * (parseInt(formData.volume) || 0)).toFixed(2)} USDC
                </span>
              </div>
              <Input
                id="volume"
                name="volume"
                type="text"
                inputMode="numeric"
                value={formData.volume}
                onChange={handleInputChange}
                ref={inputRefs.volume}
                placeholder="10"
              />
              <p className="text-xs text-muted-foreground">
                Based on 8% of total portfolio value
              </p>
            </div>
          </div>
        </div>

        {/* Sell Price - Optional */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label htmlFor="sell_price" className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-green-600" />
              Sell Target Price (¢)
            </Label>
            {potentialGain ? (
              <span className="text-xs text-green-600 font-medium">
                +${potentialGain.toFixed(2)} gain
              </span>
            ) : null}
          </div>
          <div className="relative">
            <Input
              id="sell_price"
              ref={inputRefs.sell_price}
              type="text"
              inputMode="decimal"
              value={formData.sell_price}
              name="sell_price"
              onChange={handleInputChange}
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
          <div className="flex items-center justify-between">
            <Label htmlFor="stop_loss_price" className="flex items-center gap-2">
              <Shield className="h-4 w-4 text-red-600" />
              Stop Loss Price (¢)
            </Label>
            {potentialLoss ? (
              <span className="text-xs text-red-600 font-medium">
                -${potentialLoss.toFixed(2)} loss
              </span>
            ) : null}
          </div>
          <div className="relative">
            <Input
              id="stop_loss_price"
              ref={inputRefs.stop_loss_price}
              type="text"
              inputMode="decimal"
              value={formData.stop_loss_price}
              name="stop_loss_price"
              onChange={handleInputChange}
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
}

export default memo(PlaceBetForm);
