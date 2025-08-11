'use client';

import { useCallback, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Loader2, CheckCircle, AlertCircle, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { cn } from '@/lib/utils';
import useAllowances from '@/hooks/useAllowances';

// All required approvals based on Polymarket documentation
const REQUIRED_APPROVALS = [
  {
    key: 'usdc_for_exchange',
    name: 'USDC for Exchange',
    token: { 
      symbol: 'USDC',
      type: 'ERC20',
      address: '0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174'
    },
    spender: '0x4bFb41d5B3570DeFd03C39a9A4D8dE6Bd8B8982E',
    description: 'Allow Exchange to spend USDC'
  },
  {
    key: 'usdc_for_neg_risk_exchange',
    name: 'USDC for NegRisk Exchange',
    token: { 
      symbol: 'USDC',
      type: 'ERC20',
      address: '0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174'
    },
    spender: '0xC5d563A36AE78145C45a50134d48A1215220f80a',
    description: 'Allow NegRisk Exchange to spend USDC'
  },
  {
    key: 'usdc_for_neg_risk_adapter',
    name: 'USDC for NegRisk Adapter',
    token: { 
      symbol: 'USDC',
      type: 'ERC20',
      address: '0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174'
    },
    spender: '0xd91E80cF2E7be2e162c6513ceD06f1dD0dA35296',
    description: 'Allow NegRisk Adapter to spend USDC'
  },
  {
    key: 'ctf_for_exchange',
    name: 'CTF for Exchange',
    token: { 
      symbol: 'CTF',
      type: 'ERC1155',
      address: '0x4D97DCd97eC945f40cF65F87097ACe5EA0476045'
    },
    operator: '0x4bFb41d5B3570DeFd03C39a9A4D8dE6Bd8B8982E',
    description: 'Allow Exchange to manage your CTF tokens'
  },
  {
    key: 'ctf_for_neg_risk_exchange',
    name: 'CTF for NegRisk Exchange',
    token: { 
      symbol: 'CTF',
      type: 'ERC1155',
      address: '0x4D97DCd97eC945f40cF65F87097ACe5EA0476045'
    },
    operator: '0xC5d563A36AE78145C45a50134d48A1215220f80a',
    description: 'Allow NegRisk Exchange to manage your CTF tokens'
  },
  {
    key: 'ctf_for_neg_risk_adapter',
    name: 'CTF for NegRisk Adapter',
    token: { 
      symbol: 'CTF',
      type: 'ERC1155',
      address: '0x4D97DCd97eC945f40cF65F87097ACe5EA0476045'
    },
    operator: '0xd91E80cF2E7be2e162c6513ceD06f1dD0dA35296',
    description: 'Allow NegRisk Adapter to manage your CTF tokens'
  }
];

export default function TokenAllowance({ onAllowanceUpdated, className = '' }) {
  const { 
    allowances, 
    loading: isLoading, 
    error, 
    lastChecked: lastUpdated,
    checkAllowances 
  } = useAllowances();
  
  // Transform allowances into the format expected by the UI
  const formattedAllowances = useMemo(() => {
    return REQUIRED_APPROVALS.map(approval => ({
      ...approval,
      ...(allowances[approval.key] || {}),
      // Fallback to default values if not in allowances
      approved: allowances[approval.key]?.approved || false,
      loading: false, // Loading state handled by the context
      amount: allowances[approval.key]?.allowance || '0',
      status: allowances[approval.key]?.status || 'not_approved'
    }));
  }, [allowances]);

  // Handle approval for a specific contract
  const handleApprove = useCallback(async (approvalKey) => {
    const approval = formattedAllowances.find(a => a.key === approvalKey);
    if (!approval || isLoading) return;
    
    try {
      const toastId = toast.loading(`Approving ${approval.name}...`);
      
      // Call backend to set approval
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/allowances/set`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contract_key: approvalKey,
          ...(approval.spender && { spender_address: approval.spender }),
          ...(approval.operator && { operator_address: approval.operator })
        })
      });
      
      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(error.detail || 'Failed to set allowance');
      }
      
      // Refresh all allowances
      await checkAllowances();
      
      toast.success(`${approval.name} approved successfully!`, { 
        id: toastId,
        duration: 4000
      });
      
      // Notify parent if needed
      if (onAllowanceUpdated) {
        const allApproved = formattedAllowances.every(a => a.key === approvalKey || a.approved);
        onAllowanceUpdated(allApproved);
      }
      
    } catch (err) {
      console.error(`Error approving ${approvalKey}:`, err);
      toast.error(`Failed to approve ${approval.name}: ${err.message}`);
    }
  }, [formattedAllowances, isLoading, checkAllowances, onAllowanceUpdated]);
  
  // Group approvals by token type for better UI organization
  const groupedApprovals = useMemo(() => {
    const groups = {
      USDC: [],
      CTF: []
    };
    
    formattedAllowances.forEach(approval => {
      if (approval.token.symbol === 'USDC') {
        groups.USDC.push(approval);
      } else if (approval.token.symbol === 'CTF') {
        groups.CTF.push(approval);
      }
    });
    
    return groups;
  }, [formattedAllowances]);
  
  // Format token amount for display
  const formatTokenAmount = useCallback((amount) => {
    if (!amount) return '0';
    try {
      const num = BigInt(amount);
      if (num === 0n) return '0';
      if (num >= 2n ** 255n) return '∞ (Unlimited)';
      return num.toString();
    } catch {
      return amount;
    }
  }, []);
  
  // Check if all allowances are approved
  const allApproved = useMemo(() => {
    return formattedAllowances.every(a => a.approved);
  }, [formattedAllowances]);

  // Render a single approval item
  const renderApprovalItem = (approval) => (
    <div key={approval.key} className="flex items-center justify-between py-3 px-4 bg-muted/30 rounded-lg mb-2">
      <div className="space-y-1">
        <p className="text-sm font-medium">{approval.name}</p>
        <p className="text-xs text-muted-foreground">{approval.description}</p>
        <div className="text-xs font-mono text-muted-foreground break-all">
          {approval.spender || approval.operator}
        </div>
      </div>
      <div className="flex items-center space-x-2">
        <span className={cn(
          'text-xs px-2 py-1 rounded-full whitespace-nowrap',
          approval.approved 
            ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400' 
            : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400'
        )}>
          {approval.approved ? 'Approved' : 'Not Approved'}
        </span>
        {!approval.approved && (
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => handleApprove(approval.key)}
            disabled={approval.loading}
            className="h-7 text-xs whitespace-nowrap"
          >
            {approval.loading ? (
              <Loader2 className="w-3 h-3 mr-1.5 animate-spin" />
            ) : (
              <CheckCircle className="w-3 h-3 mr-1.5" />
            )}
            Approve
          </Button>
        )}
      </div>
    </div>
  );

  return (
    <div className={cn("space-y-4", className)}>
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium">Token Allowances</h3>
        <div className="flex items-center space-x-2">
          <span className={cn(
            'text-xs px-2 py-0.5 rounded-full',
            allApproved
              ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
              : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400'
          )}>
            {allApproved ? 'All Approved' : 'Approvals Needed'}
          </span>
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={checkAllowances}
            disabled={isLoading}
            className="text-xs text-muted-foreground"
          >
            <RefreshCw className={`w-3 h-3 mr-1.5 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </div>
      
      <div className="space-y-4">
        <div className="space-y-2">
          <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
            USDC Approvals
          </h4>
          <div className="space-y-2">
            {groupedApprovals.USDC.map(renderApprovalItem)}
          </div>
        </div>
        
        <div className="space-y-2">
          <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
            Conditional Token (CTF) Approvals
          </h4>
          <div className="space-y-2">
            {groupedApprovals.CTF.map(renderApprovalItem)}
          </div>
        </div>
      </div>
      
      {lastUpdated && (
        <p className="text-xs text-muted-foreground text-right">
          Last updated: {new Date(lastUpdated).toLocaleTimeString()}
        </p>
      )}
      
      {error && (
        <Alert variant="destructive" className="mt-4">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription className="text-xs">
            {error}
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}
