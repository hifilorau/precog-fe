'use client';

import { formatPrice, formatVolume } from '../../utils/formatters';

export default function OpportunityDetails({ opportunity, getPreviousPrice, getDirectionIcon }) {
  return (
    <div className="opportunity-details">
      <div className="mb-4">
        <h2 className="text-2xl font-bold mb-2">
          {opportunity.outcome.name}
        </h2>
        <p className="text-gray-400 text-sm leading-relaxed">
          {opportunity.market?.question}
        </p>
      </div>
      
      <div className="grid grid-cols-2 gap-4 mb-4">
        <div className="rounded-lg p-3 border border-blue-200">
          <div className="text-xs text-gray-500 mb-1">Current Price</div>
          <div className="text-xl font-bold text-blue-600">
            {formatPrice(opportunity.outcome.current_price)}
          </div>
        </div>
        <div className="rounded-lg p-3 border border-blue-200">
          <div className="text-xs text-gray-500 mb-1">Previous Price</div>
          <div className="text-xl font-bold text-gray-600">
            {getPreviousPrice(opportunity.outcome.price_history) 
              ? formatPrice(getPreviousPrice(opportunity.outcome.price_history))
              : 'N/A'
            }
          </div>
        </div>
      </div>

      <div className="flex items-center space-x-4 text-sm">
        <div className="flex items-center">
          <span className="mr-1">{getDirectionIcon(opportunity.direction)}</span>
          <span className="font-medium text-gray-700">
            {formatPrice(opportunity.magnitude)} movement
          </span>
        </div>
        <div className="text-gray-500">
          {opportunity.window} window
        </div>
      </div>

      <div className="mt-4 flex flex-wrap gap-2 text-sm">
        <div className="px-3 py-1 rounded-full border">
          <span className="text-gray-600">Volume: </span>
          <span className="font-medium">{formatVolume(opportunity.outcome.current_volume || opportunity.market?.volume)}</span>
        </div>
        <div className="px-3 py-1 rounded-full border border-blue-200">
          <span className="text-gray-600">Status: </span>
          <span className="font-medium capitalize">{opportunity.market?.status || 'Unknown'}</span>
        </div>
      </div>

      {opportunity.market?.url && (
        <div className="mt-4">
          <a
            href={opportunity.market.url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            View on Polymarket →
          </a>
        </div>
      )}
    </div>
  );
}
