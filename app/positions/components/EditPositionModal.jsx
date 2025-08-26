'use client';

import { useState, useEffect } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { X, Loader2, Target, Shield } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { formatPrice, getCurrentPrice } from '@/app/utils/formatters';
import { useStateContext } from '@/app/store';

export default function EditPositionModal({ position, isOpen, onClose, onSuccess }) {
  const [isMounted, setIsMounted] = useState(false);
  const [sellPrice, setSellPrice] = useState('');
  const [stopLossPrice, setStopLossPrice] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { currentPrices } = useStateContext();

  // Handle server-side rendering
  useEffect(() => {
    setIsMounted(true);
    return () => setIsMounted(false);
  }, []);

  // Initialize form values when position changes
  useEffect(() => {
    if (position) {
      setSellPrice(position.sell_price ? position.sell_price.toString() : '');
      setStopLossPrice(position.stop_loss_price ? position.stop_loss_price.toString() : '');
    }
  }, [position]);

  if (!isMounted) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!position?.id) {
      toast.error('Position ID is missing');
      return;
    }

    // Validate inputs
    const sellPriceNum = sellPrice ? parseFloat(sellPrice) : null;
    const stopLossPriceNum = stopLossPrice ? parseFloat(stopLossPrice) : null;

    if (sellPrice && (isNaN(sellPriceNum) || sellPriceNum <= 0 || sellPriceNum > 1)) {
      toast.error('Sell price must be between 0 and 1');
      return;
    }

    if (stopLossPrice && (isNaN(stopLossPriceNum) || stopLossPriceNum <= 0 || stopLossPriceNum > 1)) {
      toast.error('Stop loss price must be between 0 and 1');
      return;
    }

    // Check that at least one value is being updated
    if (!sellPrice && !stopLossPrice) {
      toast.error('Please set at least one price target');
      return;
    }

    setIsSubmitting(true);

    try {
      // Build query parameters
      const params = new URLSearchParams();
      if (sellPrice) params.append('sell_price', sellPriceNum.toString());
      if (stopLossPrice) params.append('stop_loss_price', stopLossPriceNum.toString());

      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/positions/${position.id}/trading-params?${params.toString()}`,
        {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.detail || 'Failed to update position');
      }

      toast.success('Position updated successfully');
      onSuccess?.();
      onClose();
    } catch (error) {
      console.error('Failed to update position:', error);
      toast.error(error.message || 'Failed to update position');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReset = () => {
    setSellPrice(position?.sell_price ? position.sell_price.toString() : '');
    setStopLossPrice(position?.stop_loss_price ? position.stop_loss_price.toString() : '');
  };

  return (
    <Dialog.Root open={isOpen} onOpenChange={onClose}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
        <Dialog.Content className="fixed left-[50%] top-[50%] z-50 grid w-full max-w-md translate-x-[-50%] bg-white translate-y-[-50%] gap-4 border p-6 shadow-lg duration-200 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[state=closed]:slide-out-to-left-1/2 data-[state=closed]:slide-out-to-top-[48%] data-[state=open]:slide-in-from-left-1/2 data-[state=open]:slide-in-from-top-[48%] sm:rounded-lg">
          <div className="flex flex-col space-y-1.5">
            <Dialog.Title className="text-lg font-semibold leading-none tracking-tight">
              Edit Position
            </Dialog.Title>
            {position?.market?.question && (
              <p className="text-sm text-muted-foreground line-clamp-2">
                {position.market.question}
              </p>
            )}
          </div>
          
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Current Position Info */}
            {position && (() => {
              const currentPrice = currentPrices?.get(position.outcome_id) || getCurrentPrice(position);
              return (
                <div className="bg-muted/30 rounded-lg p-3 text-sm space-y-1">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Entry Price:</span>
                    <span className="font-medium">{formatPrice(position.entry_price)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Current Price:</span>
                    <span className="font-medium">{formatPrice(currentPrice)}</span>
                  </div>
                </div>
              );
            })()}

            {/* Sell Price Input */}
            <div className="space-y-2">
              <Label htmlFor="sell-price" className="flex items-center gap-2">
                <Target className="h-4 w-4 text-green-600" />
                Sell Target Price
              </Label>
              <Input
                id="sell-price"
                type="number"
                step="0.001"
                min="0"
                max="1"
                placeholder="e.g. 0.8"
                value={sellPrice}
                onChange={(e) => setSellPrice(e.target.value)}
                disabled={isSubmitting}
              />
              <p className="text-xs text-muted-foreground">
                Automatically sell when price reaches this level
              </p>
            </div>

            {/* Stop Loss Price Input */}
            <div className="space-y-2">
              <Label htmlFor="stop-loss-price" className="flex items-center gap-2">
                <Shield className="h-4 w-4 text-red-600" />
                Stop Loss Price
              </Label>
              <Input
                id="stop-loss-price"
                type="number"
                step="0.001"
                min="0"
                max="1"
                placeholder="e.g. 0.3"
                value={stopLossPrice}
                onChange={(e) => setStopLossPrice(e.target.value)}
                disabled={isSubmitting}
              />
              <p className="text-xs text-muted-foreground">
                Automatically sell when price drops to this level
              </p>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={handleReset}
                disabled={isSubmitting}
                className="flex-1"
              >
                Reset
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={onClose}
                disabled={isSubmitting}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isSubmitting}
                className="flex-1"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    Updating...
                  </>
                ) : (
                  'Update'
                )}
              </Button>
            </div>
          </form>
          
          <Dialog.Close asChild>
            <Button
              variant="ghost"
              className="absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none"
              disabled={isSubmitting}
            >
              <X className="h-4 w-4" />
              <span className="sr-only">Close</span>
            </Button>
          </Dialog.Close>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}