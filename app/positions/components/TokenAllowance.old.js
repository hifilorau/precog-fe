// 'use client';

// import { useState, useEffect, useCallback, useMemo } from 'react';
// import { Button } from '@/components/ui/button';
// import { Loader2, CheckCircle, AlertCircle, ShieldAlert, RefreshCw, Info } from 'lucide-react';
// import { toast } from 'sonner';
// import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
// import { cn } from '@/lib/utils';

// // All required approvals based on Polymarket documentation
// const REQUIRED_APPROVALS = [
//   {
//     key: 'usdc_for_exchange', s      s
//     name: 'USDC for Exchange',
//     token: { 
//       symbol: 'USDC',
//       type: 'ERC20',
//       address: '0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174'
//     },
//     spender: '0x4bFb41d5B3570DeFd03C39a9A4D8dE6Bd8B8982E',
//     description: 'Allow Exchange to spend USDC'
//   },
//   {
//     key: 'usdc_for_neg_risk_exchange',
//     name: 'USDC for NegRisk Exchange',
//     token: { 
//       symbol: 'USDC',
//       type: 'ERC20',
//       address: '0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174'
//     },
//     spender: '0xC5d563A36AE78145C45a50134d48A1215220f80a',
//     description: 'Allow NegRisk Exchange to spend USDC'
//   },
//   {
//     key: 'usdc_for_neg_risk_adapter',
//     name: 'USDC for NegRisk Adapter',
//     token: { 
//       symbol: 'USDC',
//       type: 'ERC20',
//       address: '0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174'
//     },
//     spender: '0xd91E80cF2E7be2e162c6513ceD06f1dD0dA35296',
//     description: 'Allow NegRisk Adapter to spend USDC'
//   },
//   {
//     key: 'ctf_for_exchange',
//     name: 'CTF for Exchange',
//     token: { 
//       symbol: 'CTF',
//       type: 'ERC1155',
//       address: '0x4D97DCd97eC945f40cF65F87097ACe5EA0476045'
//     },
//     operator: '0x4bFb41d5B3570DeFd03C39a9A4D8dE6Bd8B8982E',
//     description: 'Allow Exchange to manage your CTF tokens'
//   },
//   {
//     key: 'ctf_for_neg_risk_exchange',
//     name: 'CTF for NegRisk Exchange',
//     token: { 
//       symbol: 'CTF',
//       type: 'ERC1155',
//       address: '0x4D97DCd97eC945f40cF65F87097ACe5EA0476045'
//     },
//     operator: '0xC5d563A36AE78145C45a50134d48A1215220f80a',
//     description: 'Allow NegRisk Exchange to manage your CTF tokens'
//   },
//   {
//     key: 'ctf_for_neg_risk_adapter',
//     name: 'CTF for NegRisk Adapter',
//     token: { 
//       symbol: 'CTF',
//       type: 'ERC1155',
//       address: '0x4D97DCd97eC945f40cF65F87097ACe5EA0476045'
//     },
//     operator: '0xd91E80cF2E7be2e162c6513ceD06f1dD0dA35296',
//     description: 'Allow NegRisk Adapter to manage your CTF tokens'
//   }
// ];

// export default function TokenAllowance({ onAllowanceUpdated, className = '' }) {
//   const [allowances, setAllowances] = useState({});
//   const [isLoading, setIsLoading] = useState(false);
//   const [error, setError] = useState(null);
//   const [lastUpdated, setLastUpdated] = useState(null);

//   // Initialize allowances state
//   useEffect(() => {
//     const initialAllowances = {};
//     REQUIRED_APPROVALS.forEach(approval => {
//       initialAllowances[approval.key] = {
//         ...approval,
//         approved: false,
//         loading: false,
//         amount: '0',
//         status: 'not_approved'
//       };
//     });
//     setAllowances(initialAllowances);
//   }, []);

//   // Check all allowances
//   const checkAllowances = useCallback(async () => {
//     if (isLoading) return;
//   const [error, setError] = useState(null);
//   const [lastUpdated, setLastUpdated] = useState(null);

//   // Format token amount for display
//   const formatTokenAmount = useCallback((amount) => {
//     if (!amount) return '0';
//     const num = parseFloat(amount);
//     if (isNaN(num)) return amount;
    
//     if (num > 1e9) return '∞ (Unlimited)';
//     if (num > 1e6) return (num / 1e6).toFixed(2) + 'M';
//     if (num > 1e3) return (num / 1e3).toFixed(2) + 'K';
    
//     return num.toLocaleString(undefined, {
//       minimumFractionDigits: 0,
//       maximumFractionDigits: 4
//     });
//   }, []);

//   // Check current allowances
//   const checkAllowances = useCallback(async (force = false) => {
//     // Get current loading state to avoid stale closures
//     setAllowances(prev => {
//       // Prevent concurrent requests
//       if (!force && Object.values(prev).some(a => a.loading)) {
//         return prev; // No change if already loading
//       }
//       // Start loading
//       return {
//         USDC: { ...prev.USDC, loading: true },
//         CTF: { ...prev.CTF, loading: true }
//       };
//     });
//     try {
//       setAllowances(prev => ({
//         USDC: { ...prev.USDC, loading: true },
//         CTF: { ...prev.CTF, loading: true }
//       }));
//       setError(null);
      
//       const response = await fetch(process.env.NEXT_PUBLIC_API_URL + '/allowances/check');
//       if (!response.ok) {
//         throw new Error('Failed to fetch allowances');
//       }
      
//       const allowancesData = await response.json();
//       const allowancesMap = {};
      
//       allowancesData.forEach(allowance => {
//         allowancesMap[allowance.contract_key] = allowance;
//       });
      
//       const usdcAllowance = allowancesMap['usdc_for_exchange_v1'] || {};
//       // Transform the array of allowances into a structured format for the UI
//       const newAllowances = {};
      
//       // Initialize all required approvals as not approved
//       const REQUIRED_APPROVALS = [
//         {
//           key: 'usdc_for_exchange',
//           name: 'USDC for Exchange',
//           token: { symbol: 'USDC', type: 'ERC20' },
//           spender: '0x4bFb41d5B3570DeFd03C39a9A4D8dE6Bd8B8982E',
//           description: 'Allow Exchange to spend USDC'
//         },
//         {
//           key: 'usdc_for_neg_risk_exchange',
//           name: 'USDC for NegRisk Exchange',
//           token: { symbol: 'USDC', type: 'ERC20' },
//           spender: '0xC5d563A36AE78145C45a50134d48A1215220f80a',
//           description: 'Allow NegRisk Exchange to spend USDC'
//         },
//         {
//           key: 'usdc_for_neg_risk_adapter',
//           name: 'USDC for NegRisk Adapter',
//           token: { symbol: 'USDC', type: 'ERC20' },
//           spender: '0xd91E80cF2E7be2e162c6513ceD06f1dD0dA35296',
//           description: 'Allow NegRisk Adapter to spend USDC'
//         },
//         {
//           key: 'ctf_for_exchange',
//           name: 'CTF for Exchange',
//           token: { symbol: 'CTF', type: 'ERC1155' },
//           operator: '0x4bFb41d5B3570DeFd03C39a9A4D8dE6Bd8B8982E',
//           description: 'Allow Exchange to manage your CTF tokens'
//         },
//         {
//           key: 'ctf_for_neg_risk_exchange',
//           name: 'CTF for NegRisk Exchange',
//           token: { symbol: 'CTF', type: 'ERC1155' },
//           operator: '0xC5d563A36AE78145C45a50134d48A1215220f80a',
//           description: 'Allow NegRisk Exchange to manage your CTF tokens'
//         },
//         {
//           key: 'ctf_for_neg_risk_adapter',
//           name: 'CTF for NegRisk Adapter',
//           token: { symbol: 'CTF', type: 'ERC1155' },
//           operator: '0xd91E80cF2E7be2e162c6513ceD06f1dD0dA35296',
//           description: 'Allow NegRisk Adapter to manage your CTF tokens'
//         }
//       ];

//       // Initialize all approvals as not approved
//       REQUIRED_APPROVALS.forEach(approval => {
//         newAllowances[approval.key] = {
//           ...approval,
//           approved: false,
//           loading: false,
//           amount: '0',
//           status: 'not_approved'
//         };
//       });

//       // Update with actual allowance data from the backend
//       if (Array.isArray(allowancesMap)) {
//         allowancesMap.forEach(allowance => {
//           if (newAllowances[allowance.contract_key]) {
//             newAllowances[allowance.contract_key] = {
//               ...newAllowances[allowance.contract_key],
//               approved: allowance.approved === true,
//               loading: false,
//               status: allowance.status || 'not_approved',
//               amount: allowance.allowance || '0',
//               ...(allowance.spender && { spender: allowance.spender }),
//               ...(allowance.operator && { operator: allowance.operator })
//             };
//           }
//         });
//       }
      
//       setAllowances(newAllowances);
//       setLastUpdated(new Date());
      
//       // Notify parent if all allowances are approved
//       if (onAllowanceUpdated) {
//         const allApproved = Object.values(newAllowances).every(a => a.approved);
//         onAllowanceUpdated(allApproved);
//       }
      
//       if (onAllowanceUpdated) {
//         onAllowanceUpdated({
//           USDC: newAllowances.USDC.approved,
//           CTF: newAllowances.CTF.approved
//         });
//       }
      
//       return newAllowances;
//     } catch (err) {
//       console.error('Error checking allowances:', err);
//       setError(`Failed to check token allowances: ${err.message}`);
//       setAllowances(prev => ({
//         USDC: { ...prev.USDC, loading: false },
//         CTF: { ...prev.CTF, loading: false }
//       }));
//       return null;
//     }
//   }, [onAllowanceUpdated]);
  
//   // Handle token approval
//   const handleApprove = useCallback(async (contractKey) => {
//     const contract = CONTRACTS[contractKey];
//     if (!contract) return;
    
//     // Prevent multiple approval clicks
//     setAllowances(prev => ({
//       ...prev,
//       [contractKey]: { ...prev[contractKey], loading: true }
//     }));
    
//     try {
//       setAllowances(prev => ({
//         ...prev,
//         [contractKey]: { ...prev[contractKey], loading: true }
//       }));
      
//       setError(null);
//       const toastId = toast.loading(`Approving ${contract.name}...`);
      
//       const contractMap = {
//         'USDC': 'usdc_for_exchange_v1',
//         'CTF': 'ctf_for_exchange_v1'
//       };
      
//       const response = await fetch(process.env.NEXT_PUBLIC_API_URL + '/allowances/set', {
//         method: 'POST',
//         headers: { 'Content-Type': 'application/json' },
//         body: JSON.stringify({
//           contract: contractMap[contractKey]
//         })
//       });
      
//       if (!response.ok) {
//         const error = await response.json();
//         throw new Error(error.detail || 'Failed to approve token');
//       }
      
//       const result = await response.json();
      
//       // Refresh all allowances after approval with force=true
//       await checkAllowances(true);
      
//       toast.success(`${contract.name} approved successfully!`, { 
//         id: toastId,
//         duration: 3000
//       });
//     } catch (err) {
//       console.error(`Error approving ${contractKey}:`, err);
//       setError(`Failed to approve ${contract.name}: ${err.message}`);
//       setAllowances(prev => ({
//         ...prev,
//         [contractKey]: { ...prev[contractKey], loading: false }
//       }));
      
//       toast.error(`Failed to approve ${contract.name}: ${err.message}`);
//     }
//   }, [checkAllowances]);
  
//   // Initial load
//   useEffect(() => {
//     let isMounted = true;
    
//     const load = async () => {
//       await checkAllowances(true);
//     };
    
//     load();
    
//     // Setup refresh listener
//     const handleRefresh = () => {
//       if (isMounted) {
//         checkAllowances(true);
//       }
//     };
    
//     window.addEventListener('refresh-allowances', handleRefresh);
    
//     return () => {
//       isMounted = false;
//       window.removeEventListener('refresh-allowances', handleRefresh);
//     };
//     // We only want this to run once on mount
//     // eslint-disable-next-line react-hooks/exhaustive-deps
//   }, []);
  
//   // Check if all allowances are approved
//   const allApproved = useMemo(() => {
//     return Object.values(allowances).every(a => a.approved);
//   }, [allowances]);
  

//   return (
//     <div className={`space-y-4 ${className}`}>
//       <div className="flex items-center justify-between">
//         <h3 className="text-lg font-medium">Token Approvals</h3>
//         <Button 
//           variant="ghost" 
//           size="sm" 
//           onClick={() => checkAllowances(true)}
//           disabled={Object.values(allowances).some(a => a.loading)}
//         >
//           <RefreshCw 
//             className={`h-4 w-4 mr-2 ${Object.values(allowances).some(a => a.loading) ? 'animate-spin' : ''}`} 
//           />
//           Refresh
//         </Button>
//       </div>
      
//       <p className="text-sm text-gray-600">
//         Approve the following tokens to enable trading on Polymarket:
//       </p>
      
//       <div className="space-y-3">
//         {Object.entries(CONTRACTS).map(([key, contract]) => {
//           const allowance = allowances[key];
//         </Alert>
//       )}
//     </div>
//   );
// }
