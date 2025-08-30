'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Plus, RefreshCw } from 'lucide-react'
import { AllowanceProvider } from '@/hooks/useAllowances'
import PositionsTable from './components/PositionsTable'
import PlaceBetForm from './components/PlaceBetForm'
import PositionDetails from './components/PositionDetails'
import StatsCards from './components/StatsCards'
import useUserPositions from '@/hooks/useUserPositions'
import { useStateContext } from '@/app/store'

function PositionsPageContent() {
  const [showPlaceBetForm, setShowPlaceBetForm] = useState(false)
  const [refreshTrigger, setRefreshTrigger] = useState(0)
  const [selectedMarket] = useState(null)
  const [selectedOutcome] = useState(null)
  const [selectedPositionId, setSelectedPositionId] = useState(null)
  const [showPositionDetails, setShowPositionDetails] = useState(false)
  const { mergedPositions } = useStateContext()

  const handlePlaceBetSuccess = (position) => {
    setShowPlaceBetForm(false)
    setRefreshTrigger(prev => prev + 1) // Trigger positions table refresh
    
    // Show success notification (you can implement a toast system)
    console.log('Position created successfully:', position)
  }

  const handleRefresh = () => {
    setRefreshTrigger(prev => prev + 1)
  }

  // Call the hook at the top level of the component
  const { positions, loading, error } = useUserPositions();

  useEffect(() => {
    if (loading) {
      console.log('Loading positions...')
    } else if (error) {
      console.error('Error fetching positions:', error)
    } else {
      console.log('User positions:', positions)
    }
  }, [positions, loading, error])

  const handleViewPositionDetails = (positionId) => {
    setSelectedPositionId(positionId)
    setShowPositionDetails(true)
  }

  const handleClosePositionDetails = () => {
    setShowPositionDetails(false)
    setSelectedPositionId(null)
  }

  // Mock data for demonstration - in real app, this would come from props or context
  const mockMarket = {
    id: 'mock-market-id',
    question: 'Will Bitcoin reach $100,000 by end of 2024?',
    name: 'Bitcoin $100k by 2024'
  }

  const mockOutcome = {
    id: 'mock-outcome-id',
    name: 'Yes',
    probability: 0.65
  }

  if (showPositionDetails && selectedPositionId) {
    return (
      <div className="container mx-auto px-4 py-8">
        <PositionDetails
          positionId={selectedPositionId}
          onClose={handleClosePositionDetails}
        />
      </div>
    )
  }



  if (showPlaceBetForm) {
    return (
      <div className="container mx-auto px-4 py-8">
        <PlaceBetForm
          market={selectedMarket || mockMarket}
          outcome={selectedOutcome || mockOutcome}
          onSuccess={handlePlaceBetSuccess}
          onCancel={() => setShowPlaceBetForm(false)}
        />
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-8 space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Trading Positions</h1>
          <p className="text-gray-600 mt-1">
            Manage your prediction market positions with automated stop loss and sell targets
          </p>
        </div>
        
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={handleRefresh}
            className="flex items-center gap-2"
          >
            <RefreshCw className="h-4 w-4" />
            Refresh
          </Button>
          
          <Button
            onClick={() => setShowPlaceBetForm(true)}
            className="flex items-center gap-2"
          >
            <Plus className="h-4 w-4" />
            Place Bet
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <StatsCards mergedPositions={mergedPositions || []} />

      {/* Positions Table */}
      <PositionsTable 
        refreshTrigger={refreshTrigger} 
        onViewDetails={handleViewPositionDetails}
      />

      {/* Information Card */}
      <Card className="bg-blue-50 border-blue-200">
        <CardContent className="pt-6">
          <div className="flex items-start gap-3">
            <div className="bg-blue-100 rounded-full p-2">
              <Plus className="h-4 w-4 text-blue-600" />
            </div>
            <div>
              <h3 className="font-semibold text-blue-900">
                Automated Position Management
              </h3>
              <p className="text-blue-700 text-sm mt-1">
                Set stop loss and sell target prices when placing bets. Our system will automatically 
                monitor prices and execute trades when your conditions are met, even when you are not online.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

export default function PositionsPage() {
  return (
    <AllowanceProvider>
      <PositionsPageContent />
    </AllowanceProvider>
  )
}
