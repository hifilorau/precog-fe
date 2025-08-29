'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { DollarSign, RefreshCw } from 'lucide-react'

export default function PositionsTableSkeleton({ rowCount = 3 }) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2">
          <DollarSign className="h-5 w-5" />
          Open Positions
        </CardTitle>
        <Button variant="outline" size="sm" disabled className="flex items-center gap-1">
          <RefreshCw className="h-3 w-3" />
          Refresh Prices
        </Button>
      </CardHeader>
      
      <CardContent>
        <div className="space-y-4">
          {Array.from({ length: rowCount }).map((_, index) => (
            <div key={index} className="border border-border rounded-lg p-4 bg-card">
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
                {/* Market & Outcome */}
                <div className="lg:col-span-3">
                  <div className="h-4 w-3/4 animate-pulse bg-gray-200 rounded mb-2"></div>
                  <div className="h-3 w-1/2 animate-pulse bg-gray-200 rounded mb-1"></div>
                  <div className="h-3 w-1/3 animate-pulse bg-gray-200 rounded"></div>
                </div>

                {/* Status & Close Date */}
                <div className="lg:col-span-2">
                  <div className="h-6 w-16 animate-pulse bg-gray-200 rounded mb-2"></div>
                  <div className="h-3 w-20 animate-pulse bg-gray-200 rounded"></div>
                </div>

                {/* Prices */}
                <div className="lg:col-span-2">
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <div className="h-3 w-8 animate-pulse bg-gray-200 rounded"></div>
                      <div className="h-3 w-12 animate-pulse bg-gray-200 rounded"></div>
                    </div>
                    <div className="flex justify-between items-center">
                      <div className="h-3 w-12 animate-pulse bg-gray-200 rounded"></div>
                      <div className="h-3 w-12 animate-pulse bg-gray-200 rounded"></div>
                    </div>
                  </div>
                </div>

                {/* Value & Volume */}
                <div className="lg:col-span-2">
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <div className="h-3 w-8 animate-pulse bg-gray-200 rounded"></div>
                      <div className="h-3 w-16 animate-pulse bg-gray-200 rounded"></div>
                    </div>
                    <div className="flex justify-between items-center">
                      <div className="h-3 w-10 animate-pulse bg-gray-200 rounded"></div>
                      <div className="h-3 w-20 animate-pulse bg-gray-200 rounded"></div>
                    </div>
                  </div>
                </div>

                {/* PnL */}
                <div className="lg:col-span-1">
                  <div className="h-3 w-6 animate-pulse bg-gray-200 rounded mb-1"></div>
                  <div className="h-4 w-12 animate-pulse bg-gray-200 rounded"></div>
                </div>

                {/* Targets */}
                <div className="lg:col-span-1">
                  <div className="space-y-1">
                    <div className="h-3 w-10 animate-pulse bg-gray-200 rounded"></div>
                    <div className="h-3 w-8 animate-pulse bg-gray-200 rounded"></div>
                  </div>
                </div>

                {/* Actions */}
                <div className="lg:col-span-1">
                  <div className="space-y-1">
                    <div className="h-8 w-16 animate-pulse bg-gray-200 rounded"></div>
                    <div className="h-6 w-12 animate-pulse bg-gray-200 rounded"></div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}