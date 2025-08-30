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
  console.log('initial state', initialState);
  // Initialize state with localStorage if available
  const [state, setState] = useState(() => {
    if (typeof window !== 'undefined') {
      const savedState = localStorage.getItem('appState');
      return savedState ? JSON.parse(savedState) : initialState;
    }
    return initialState;
  });

  // Calculate portfolio value based on current state
  const calculatePortfolioValue = useCallback((currentState) => {
    const { balance, mergedPositions, currentPrices } = currentState;
    
    if (!Array.isArray(mergedPositions) || mergedPositions.length === 0) {
      return balance || 0;
    }

    // Ensure currentPrices is always a Map
    const pricesMap = currentPrices instanceof Map ? currentPrices : new Map();

    // Filter for actual open positions (not resolved/lost)
    const openPositions = mergedPositions.filter(position => {
      const currentPrice = pricesMap.get(position.outcome_id) || getCurrentPrice(position);
      const currentValue = position.size && currentPrice ? position.size * currentPrice : Number(position?.currentValue ?? position?.current_value ?? 0);
      const isResolved = position?.resolved_status === 'lost' || position?.market?.status === 'closed';
      const hasZeroValue = currentValue === 0 || (currentPrice !== undefined && Number(currentPrice) === 0);
      
      // Position is open if it's not resolved and has value
      return !isResolved && !hasZeroValue && position.status === 'filled';
    });

    // Calculate total value of open positions
    const totalOpenPositionsValue = openPositions.reduce((total, position) => {
      const currentPrice = pricesMap.get(position.outcome_id) || getCurrentPrice(position);
      const currentValue = position.size && currentPrice ? position.size * currentPrice : Number(position?.currentValue ?? position?.current_value ?? 0);
      return total + currentValue;
    }, 0);

    // Total portfolio value = USDC balance + open positions value
    return (balance || 0) + totalOpenPositionsValue;
  }, []);

  // Persist state to localStorage whenever it changes
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('appState', JSON.stringify(state));
    }
  }, [state]);

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
