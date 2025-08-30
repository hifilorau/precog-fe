'use client';

import { useState, useEffect, createContext, useContext } from 'react';

const AuthContext = createContext();

// Get authorized address from environment variable
const AUTHORIZED_ADDRESS = process.env.NEXT_PUBLIC_AUTH_WALLET;

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
}

export function AuthProvider({ children }) {
  const [isConnected, setIsConnected] = useState(false);
  const [address, setAddress] = useState('');
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const getMetaMask = () => {
    if (typeof window !== 'undefined') {
      console.log('Debugging wallet detection...');
      console.log('window.ethereum:', window.ethereum);
      console.log('window.ethereum.isMetaMask:', window.ethereum?.isMetaMask);
      console.log('window.ethereum.isCoinbaseWallet:', window.ethereum?.isCoinbaseWallet);
      console.log('window.ethereum.providers:', window.ethereum?.providers);
      
      // Method 1: Check if there are multiple providers
      if (window.ethereum?.providers?.length > 0) {
        console.log('Found providers array');
        const metamask = window.ethereum.providers.find(provider => {
          console.log('Provider:', provider, 'isMetaMask:', provider.isMetaMask, 'isCoinbaseWallet:', provider.isCoinbaseWallet);
          return provider.isMetaMask === true && provider.isCoinbaseWallet !== true;
        });
        if (metamask) {
          console.log('Found MetaMask in providers');
          return metamask;
        }
      }
      
      // Method 2: Direct MetaMask check (only if not Coinbase)
      if (window.ethereum?.isMetaMask === true && window.ethereum?.isCoinbaseWallet !== true) {
        console.log('Found MetaMask directly');
        return window.ethereum;
      }
      
      // Method 3: Try to find MetaMask even if mixed with Coinbase
      if (window.ethereum?.providers) {
        const metamask = window.ethereum.providers.find(p => p.isMetaMask && !p.isCoinbaseWallet);
        if (metamask) {
          console.log('Found clean MetaMask provider');
          return metamask;
        }
      }
      
      console.log('MetaMask not found');
    }
    return null;
  };

  const checkConnection = async () => {
    const metamask = getMetaMask();
    if (metamask) {
      try {
        const accounts = await metamask.request({ 
          method: 'eth_accounts' 
        });
        
        if (accounts.length > 0) {
          const userAddress = accounts[0];
          setAddress(userAddress);
          setIsConnected(true);
          setIsAuthorized(AUTHORIZED_ADDRESS && userAddress.toLowerCase() === AUTHORIZED_ADDRESS.toLowerCase());
        }
      } catch (error) {
        console.error('Error checking connection:', error);
      }
    }
    setIsLoading(false);
  };

  const connectWallet = async () => {
    const metamask = getMetaMask();
    console.log('MetaMask provider:', metamask);
    
    if (!metamask) {
      alert('MetaMask not found. Please make sure MetaMask is installed and enabled. You may need to disable other wallet extensions temporarily.');
      return;
    }

    try {
      setIsLoading(true);
      console.log('Requesting accounts from MetaMask...');
      
      const accounts = await metamask.request({ 
        method: 'eth_requestAccounts' 
      });
      
      console.log('Accounts received:', accounts);
      
      if (accounts.length > 0) {
        const userAddress = accounts[0];
        setAddress(userAddress);
        setIsConnected(true);
        
        const authorized = AUTHORIZED_ADDRESS && userAddress.toLowerCase() === AUTHORIZED_ADDRESS.toLowerCase();
        setIsAuthorized(authorized);
        
        if (!authorized) {
          alert('This wallet address is not authorized to access this app.');
        }
      }
    } catch (error) {
      console.error('Error connecting wallet:', error);
      if (error.code === 4001) {
        alert('Please connect your wallet to continue');
      } else if (error.message?.includes('No provider selected')) {
        alert('Multiple wallets detected. Please disable Coinbase Wallet extension temporarily and try again.');
      } else {
        alert(`Connection failed: ${error.message}`);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const disconnect = () => {
    setIsConnected(false);
    setAddress('');
    setIsAuthorized(false);
  };

  useEffect(() => {
    checkConnection();

    const metamask = getMetaMask();
    if (metamask) {
      const handleAccountsChanged = (accounts) => {
        if (accounts.length === 0) {
          disconnect();
        } else {
          const userAddress = accounts[0];
          setAddress(userAddress);
          setIsAuthorized(AUTHORIZED_ADDRESS && userAddress.toLowerCase() === AUTHORIZED_ADDRESS.toLowerCase());
        }
      };

      const handleChainChanged = () => {
        window.location.reload();
      };

      metamask.on('accountsChanged', handleAccountsChanged);
      metamask.on('chainChanged', handleChainChanged);

      return () => {
        metamask.removeListener('accountsChanged', handleAccountsChanged);
        metamask.removeListener('chainChanged', handleChainChanged);
      };
    }
  }, []);

  return (
    <AuthContext.Provider
      value={{
        isConnected,
        address,
        isAuthorized,
        isLoading,
        connectWallet,
        disconnect,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function WalletConnect() {
  const { isConnected, address, isAuthorized, isLoading, connectWallet, disconnect } = useAuth();

  if (isLoading) {
    return <div className="text-center">Loading...</div>;
  }

  if (!isConnected) {
    return (
      <button 
        onClick={connectWallet}
        className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg"
      >
        Connect Wallet
      </button>
    );
  }

  return (
    <div className="flex items-center gap-4">
      <div className="text-sm">
        <div className="text-gray-400">Connected:</div>
        <div className="font-mono text-xs">
          {address.slice(0, 6)}...{address.slice(-4)}
        </div>
        {isAuthorized ? (
          <div className="text-green-400 text-xs">✓ Authorized</div>
        ) : (
          <div className="text-red-400 text-xs">✗ Not Authorized</div>
        )}
      </div>
      <button 
        onClick={disconnect}
        className="bg-gray-600 hover:bg-gray-700 text-white px-3 py-1 rounded text-sm"
      >
        Disconnect
      </button>
    </div>
  );
}

export function AuthGuard({ children }) {
  const { isAuthorized, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-400">Checking wallet connection...</p>
        </div>
      </div>
    );
  }

  if (!isAuthorized) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center max-w-md mx-auto p-8">
          <h1 className="text-2xl font-bold mb-4">Access Restricted</h1>
          <p className="text-gray-400 mb-8">
            This app is currently in private beta. Please connect an authorized wallet to continue.
          </p>
          <WalletConnect />
        </div>
      </div>
    );
  }

  return children;
}