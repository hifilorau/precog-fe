'use client';

import { memo, useMemo, useState } from 'react';
import { Market, Outcome } from '@/lib/types/markets';
import { Button } from '@/components/ui/button';
import { TrendingUp } from 'lucide-react';
import PlaceBetForm from '@/components/trading/PlaceBetForm';

interface OutcomesCardProps {
  market: Market | null;
}

function OutcomesCard({ market }: OutcomesCardProps) {
  const [selectedOutcome, setSelectedOutcome] = useState<Outcome | null>(null);
  const [showBetForm, setShowBetForm] = useState(false);
  
  const outcomes = market?.outcomes || [];
  const sortedOutcomes = useMemo(() => {
    return [...outcomes].sort((a, b) => {
      return (b.current_price ?? b.probability) - (a.current_price ?? a.probability);
    });
  }, [outcomes]);
  
  const handleBuyClick = (outcome: Outcome) => {
    setSelectedOutcome(outcome);
    setShowBetForm(true);
  };
  
  const handleBetSuccess = (position: any) => {
    console.log('Position created:', position);
    setShowBetForm(false);
    setSelectedOutcome(null);
    // You could add toast notification here
  };
  
  const handleBetCancel = () => {
    setShowBetForm(false);
    setSelectedOutcome(null);
  };
  return (
    <div className="card p-6">
      <h2 className="text-xl font-semibold mb-4">Outcomes</h2>
      {!showBetForm && (
        <>
          {sortedOutcomes.length > 0 ? (
            <div className="space-y-3">
              {sortedOutcomes.map((outcome) => (
                <div key={outcome.id} className="border border-border p-4 hover:bg-muted transition-colors">
                  <div className="flex justify-between items-center mb-2">
                    <h3 className="font-medium">{outcome.name}</h3>
                    <div className="flex items-center gap-3">
                      <span className="text-lg font-semibold">
                        {Math.round(((outcome.current_price ?? outcome.probability) ?? 0) * 100)}%
                      </span>
                      <Button
                        size="sm"
                        onClick={() => handleBuyClick(outcome)}
                        className="flex items-center gap-1"
                      >
                        <TrendingUp className="h-4 w-4" />
                        Buy
                      </Button>
                    </div>
                  </div>
                  <div className="w-full bg-secondary h-2">
                    <div className="bg-primary h-2 transition-all duration-300" style={{ width: `${Math.round(((outcome.current_price ?? outcome.probability) ?? 0) * 100)}%` }}></div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-muted-foreground">No outcomes available for this market.</p>
          )}
        </>
      )}
      
      {/* PlaceBetForm Modal */}
      {showBetForm && selectedOutcome && market && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <PlaceBetForm
                market={market}
                outcome={selectedOutcome}
                onSuccess={handleBetSuccess}
                onCancel={handleBetCancel}
                showCard={false}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default memo(OutcomesCard);
