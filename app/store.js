'use client';

import { createContext, useContext, useState, useEffect, useCallback } from 'react';

// Create context
const StateContext = createContext(undefined);

const initialState = {
  walletAddress: null,
  balance: null,
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

  // Persist state to localStorage whenever it changes
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('appState', JSON.stringify(state));
    }
  }, [state]);

  // Update state function
  const updateState = useCallback((newState) => {
    setState(prev => ({
      ...prev,
      ...(typeof newState === 'function' ? newState(prev) : newState)
    }));
  }, []);

  // Reset state to initial state
  const resetState = useCallback(() => {
    setState(initialState);
  }, [initialState]);

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
