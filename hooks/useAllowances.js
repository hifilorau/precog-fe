import { useState, useEffect, useCallback, useContext, createContext } from 'react';

// Create a context for allowances
const AllowanceContext = createContext();

// Provider component
export const AllowanceProvider = ({ children }) => {
  const [allowances, setAllowances] = useState({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [lastChecked, setLastChecked] = useState(null);

  const checkAllowances = useCallback(async () => {
    if (loading) return;
    
    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/allowances/check`);
      if (!response.ok) throw new Error('Failed to fetch allowances');
      
      const data = await response.json();
      
      // The backend now returns an object with contract keys as top-level properties
      setAllowances(data);
      setLastChecked(new Date());
      return data;
      
    } catch (err) {
      console.error('Error checking allowances:', err);
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [loading]);

  // Initial load
  useEffect(() => {
    checkAllowances();
  }, []);

  return (
    <AllowanceContext.Provider value={{ 
      allowances, 
      loading, 
      error, 
      lastChecked, 
      checkAllowances 
    }}>
      {children}
    </AllowanceContext.Provider>
  );
};

// Custom hook to use allowances
const useAllowances = () => {
  const context = useContext(AllowanceContext);
  if (!context) {
    throw new Error('useAllowances must be used within an AllowanceProvider');
  }
  return context;
};

export default useAllowances;
