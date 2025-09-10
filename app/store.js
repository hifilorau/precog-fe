'use client';

import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { getCurrentPrice } from './utils/formatters';

// Create context
const StateContext = createContext(undefined);

const initialState = {
  walletAddress: null,
  balance: null,
  mergedPositions: [],
  currentPrices: new Map(),
  portfolioValue: null,
  updateState: () => {},
  resetState: () => {},
};

export const StateProvider = ({ children }) => {
  // Use in-memory state only (no localStorage hydration to avoid stale reverts)
  const [state, setState] = useState(initialState);

  // Calculate portfolio value based on current state
  const calculatePortfolioValue = useCallback((currentState) => {
    const { balance, mergedPositions, currentPrices } = currentState;

    if (!Array.isArray(mergedPositions) || mergedPositions.length === 0) {
      return balance || 0;
    }

    // Ensure currentPrices is always a Map
    const pricesMap = currentPrices instanceof Map ? currentPrices : new Map();

    // Treat any resolved or redeemed positions as not contributing to open value
    const openPositions = mergedPositions.filter((position) => {
      const marketStatus = position?.market?.status;
      const resolvedStatus = position?.resolved_status;
      const isRedeemed = Array.isArray(position?.redemptions) && position.redemptions.some(r => r?.status === 'completed');

      // Consider resolved if won/lost or market closed/resolved
      const isResolved = resolvedStatus === 'won' || resolvedStatus === 'lost' || marketStatus === 'closed' || marketStatus === 'resolved';
      if (isResolved || isRedeemed) return false;

      // Only include active filled/open positions with non-zero value
      const currentPrice = pricesMap.get(position.outcome_id) ?? getCurrentPrice(position);
      const currentValue = position.size && currentPrice ? position.size * currentPrice : Number(position?.currentValue ?? position?.current_value ?? 0);
      const hasZeroValue = !Number.isFinite(currentValue) || Number(currentValue) === 0;
      return position?.status === 'filled' && !hasZeroValue;
    });

    const totalOpenPositionsValue = openPositions.reduce((total, position) => {
      const currentPrice = pricesMap.get(position.outcome_id) ?? getCurrentPrice(position);
      const currentValue = position.size && currentPrice ? position.size * currentPrice : Number(position?.currentValue ?? position?.current_value ?? 0);
      return total + (Number.isFinite(currentValue) ? currentValue : 0);
    }, 0);

    // Total portfolio value = USDC balance + open positions value
    return (balance || 0) + totalOpenPositionsValue;
  }, []);

  // Note: intentionally not persisting to localStorage to prevent stale rehydration

  // Update state function
  const updateState = useCallback((newState) => {
    setState(prev => {
      const updatedState = {
        ...prev,
        ...(typeof newState === 'function' ? newState(prev) : newState)
      };
      
      // Recalculate portfolio value when relevant data changes
      const hasRelevantChanges = updatedState.balance !== prev.balance || 
                                updatedState.mergedPositions !== prev.mergedPositions || 
                                updatedState.currentPrices !== prev.currentPrices;
      
      if (hasRelevantChanges) {
        updatedState.portfolioValue = calculatePortfolioValue(updatedState);
      }
      
      return updatedState;
    });
  }, [calculatePortfolioValue]);

  // Reset state to initial state
  const resetState = useCallback(() => {
    setState(initialState);
  }, []);

  return (
    <StateContext.Provider value={{ ...state, updateState, resetState }}>
      {children}
    </StateContext.Provider>
  );
};

// Custom hook to use the state
export const useStateContext = () => {
  const context = useContext(StateContext);
  if (context === undefined) {
    throw new Error('useStateContext must be used within a StateProvider');
  }
  return context;
};
