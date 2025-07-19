'use client';

import { Market } from '@/lib/types/markets';

interface OutcomesCardProps {
  market: Market | null;
}

export default function OutcomesCard({ market }: OutcomesCardProps) {
  const outcomes = market?.outcomes || [];
  const sortedOutcomes = [...outcomes].sort((a, b) => {
    return (b.current_price ?? b.probability) - (a.current_price ?? a.probability);
  });
  return (
    <div className="card p-6">
      <h2 className="text-xl font-semibold mb-4">Outcomes</h2>
      {sortedOutcomes.length > 0 ? (
        <div className="space-y-3">
          {sortedOutcomes.map((outcome) => (
            <div key={outcome.id} className="border border-border p-4 hover:bg-muted transition-colors">
              <div className="flex justify-between items-center mb-2">
                <h3 className="font-medium">{outcome.name}</h3>
                <span className="text-lg font-semibold">
                  {Math.round(((outcome.current_price ?? outcome.probability) ?? 0) * 100)}%
                </span>
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
    </div>
  );
}
