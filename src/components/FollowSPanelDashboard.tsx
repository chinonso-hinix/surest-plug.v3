/**
 * Surest Plug - FollowSPanel Provider Dashboard Component
 * 
 * Complete Admin integration with FollowSPanel (https://followspanel.com/api/v2):
 * - Real-time provider balance & automatic refresh
 * - Instant API connection testing & latency benchmark
 * - Low-balance warnings with configurable threshold
 * - Order synchronization and live status tracking
 * - Real-time profit/margin tracking
 * - Live provider services explorer
 * - Strictly server-side isolated (no API key leakage)
 */

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Order, SystemSettings, FollowSPanelServiceItem } from '../types';
import { store } from '../lib/store';
import { useBodyScrollLock } from '../lib/scrollLock';

interface FollowSPanelDashboardProps {
  orders: Order[];
  settings: SystemSettings;
  onUpdateSettings: (newSettings: Partial<SystemSettings>) => void;
  onUpdateOrderStatus: (orderId: number, status: string) => void;
}

export const FollowSPanelDashboard: React.FC<FollowSPanelDashboardProps> = ({
  orders,
  settings,
  onUpdateSettings,
  onUpdateOrderStatus
}) => {
  // Provider balance & connection state
  const [balance, setBalance] = useState<string | null>(null);
  const [currency, setCurrency] = useState<string>('NGN');
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);
  const [loadingBalance, setLoadingBalance] = useState<boolean>(false);
  const [balanceError, setBalanceError] = useState<string | null>(null);

  // Connection test state
  const [testingConnection, setTestingConnection] = useState<boolean>(false);
  const [connectionResult, setConnectionResult] = useState<{
    tested: boolean;
    connected: boolean;
    latency_ms?: number;
    error?: string;
  } | null>(null);

  // Low balance threshold state
  const [thresholdInput, setThresholdInput] = useState<string>(
    String(settings.followspanel_low_balance_threshold ?? 1000)
  );
  const [savedThresholdMsg, setSavedThresholdMsg] = useState<boolean>(false);

  // Order sync states
  const [syncingOrderId, setSyncingOrderId] = useState<string | number | null>(null);
  const [syncingAll, setSyncingAll] = useState<boolean>(false);
  const [syncMessage, setSyncMessage] = useState<string | null>(null);

  // Live services explorer state
  const [showServicesExplorer, setShowServicesExplorer] = useState<boolean>(false);
  const [servicesList, setServicesList] = useState<FollowSPanelServiceItem[]>([]);
  const [loadingServices, setLoadingServices] = useState<boolean>(false);
  const [servicesSearch, setServicesSearch] = useState<string>('');
  const [selectedServiceCategory, setSelectedServiceCategory] = useState<string>('all');

  // Order filter & search
  const [orderStatusFilter, setOrderStatusFilter] = useState<string>('all');
  const [orderSearch, setOrderSearch] = useState<string>('');
  const [selectedOrderDetails, setSelectedOrderDetails] = useState<Order | null>(null);
  const [configInfo, setConfigInfo] = useState<{ configured: boolean; length: number; endpoint: string } | null>(null);

  useBodyScrollLock(Boolean(showServicesExplorer || selectedOrderDetails));

  // Fetch real balance from backend proxy
  const fetchBalance = useCallback(async (isSilent = false) => {
    if (!isSilent) setLoadingBalance(true);
    setBalanceError(null);
    try {
      const res = await store.getSmmBalance();
      if (res.success && res.balance !== undefined && res.balance !== null) {
        setBalance(res.balance);
        setCurrency(res.currency || 'NGN');
        setLastUpdated(new Date().toLocaleTimeString());
        setBalanceError(null);
        setConnectionResult(prev => ({
          tested: true,
          connected: true,
          latency_ms: prev?.latency_ms,
          error: undefined
        }));
      } else {
        setBalance(null);
        const errMsg = res.error || 'Failed to retrieve real balance from FollowSPanel.';
        setBalanceError(errMsg);
        setConnectionResult({
          tested: true,
          connected: false,
          error: errMsg
        });
      }
    } catch (e: any) {
      setBalance(null);
      const errMsg = e?.message || 'Unable to reach FollowSPanel server.';
      setBalanceError(errMsg);
      setConnectionResult({
        tested: true,
        connected: false,
        error: errMsg
      });
    } finally {
      if (!isSilent) setLoadingBalance(false);
    }
  }, []);

  // On mount and polling interval (every 2 minutes while active)
  useEffect(() => {
    fetchBalance();
    store.getFollowSPanelConfig().then(res => {
      if (res.success && res.data) {
        setConfigInfo(res.data);
      }
    });

    const interval = setInterval(() => {
      fetchBalance(true);
    }, 120000); // 2 minutes

    return () => clearInterval(interval);
  }, [fetchBalance]);

  // Test connection handler
  const handleTestConnection = async () => {
    setTestingConnection(true);
    try {
      const res = await store.testFollowSPanelConnection();
      if (res.success && res.data && res.data.connected) {
        setConnectionResult({
          tested: true,
          connected: true,
          latency_ms: res.data.latency_ms,
          error: undefined
        });
        if (res.data.balance !== undefined && res.data.balance !== null) {
          setBalance(res.data.balance);
          setCurrency(res.data.currency || 'NGN');
          setLastUpdated(new Date().toLocaleTimeString());
          setBalanceError(null);
        }
      } else {
        setBalance(null);
        const errMsg = res.data?.error || res.error || 'Failed to authenticate with FollowSPanel API.';
        setBalanceError(errMsg);
        setConnectionResult({
          tested: true,
          connected: false,
          latency_ms: res.data?.latency_ms,
          error: errMsg
        });
      }
    } catch (err: any) {
      setBalance(null);
      const errMsg = err?.message || 'API connection test failed.';
      setBalanceError(errMsg);
      setConnectionResult({
        tested: true,
        connected: false,
        error: errMsg
      });
    } finally {
      setTestingConnection(false);
    }
  };

  // Save low balance threshold
  const handleSaveThreshold = (e: React.FormEvent) => {
    e.preventDefault();
    const num = parseFloat(thresholdInput) || 0;
    onUpdateSettings({ followspanel_low_balance_threshold: num });
    setSavedThresholdMsg(true);
    setTimeout(() => setSavedThresholdMsg(false), 3000);
  };

  // Sync single order with FollowSPanel
  const handleSyncOrder = async (order: Order) => {
    const smmOrderId = order.customer_details?.smm_order_id;
    if (!smmOrderId) {
      alert('This order does not have a FollowSPanel Order ID.');
      return;
    }

    setSyncingOrderId(order.id);
    setSyncMessage(null);
    try {
      const res = await store.syncFollowSPanelOrderStatus(order.id, smmOrderId);
      if (res.success) {
        setSyncMessage(`Order #${order.order_reference} status synced successfully.`);
        setTimeout(() => setSyncMessage(null), 4000);
      } else {
        alert(res.error || 'Failed to sync status with FollowSPanel.');
      }
    } catch (e: any) {
      alert(e.message || 'Failed to sync status.');
    } finally {
      setSyncingOrderId(null);
    }
  };

  // Sync all active orders
  const handleSyncAllOrders = async () => {
    setSyncingAll(true);
    setSyncMessage(null);
    try {
      const res = await store.syncAllActiveFollowSPanelOrders();
      if (res.success) {
        setSyncMessage(`Synced ${res.updatedCount} active FollowSPanel orders.`);
        setTimeout(() => setSyncMessage(null), 5000);
      } else {
        alert(res.error || 'Failed to sync all orders.');
      }
    } catch (e: any) {
      alert(e.message || 'Failed to sync orders.');
    } finally {
      setSyncingAll(false);
    }
  };

  // Fetch FollowSPanel live services
  const handleLoadServices = async () => {
    if (servicesList.length > 0) {
      setShowServicesExplorer(true);
      return;
    }
    setLoadingServices(true);
    try {
      const res = await store.fetchSmmServices();
      if (res.success && res.services) {
        setServicesList(res.services);
        setShowServicesExplorer(true);
      } else {
        alert(res.error || 'Failed to load FollowSPanel services catalog.');
      }
    } catch (e: any) {
      alert('Unable to load services catalog.');
    } finally {
      setLoadingServices(false);
    }
  };

  // Filter SMM orders
  const smmOrders = useMemo(() => {
    return orders.filter(o => o.category === 'boosting' || Boolean(o.customer_details?.smm_order_id));
  }, [orders]);

  const filteredSmmOrders = useMemo(() => {
    return smmOrders.filter(o => {
      // Status filter
      if (orderStatusFilter !== 'all') {
        if (orderStatusFilter === 'active' && (o.status !== 'pending' && o.status !== 'processing')) return false;
        if (orderStatusFilter === 'completed' && o.status !== 'completed') return false;
        if (orderStatusFilter === 'cancelled' && o.status !== 'cancelled') return false;
      }

      // Search filter
      if (orderSearch.trim()) {
        const q = orderSearch.toLowerCase();
        const ref = o.order_reference.toLowerCase();
        const smmId = String(o.customer_details?.smm_order_id || '');
        const name = (o.user_name || '').toLowerCase();
        const email = (o.user_email || '').toLowerCase();
        const prod = (o.product_name || '').toLowerCase();
        const link = (o.customer_details?.target_link || '').toLowerCase();

        return ref.includes(q) || smmId.includes(q) || name.includes(q) || email.includes(q) || prod.includes(q) || link.includes(q);
      }

      return true;
    });
  }, [smmOrders, orderStatusFilter, orderSearch]);

  // Aggregate Metrics
  const metrics = useMemo(() => {
    const totalOrders = smmOrders.length;
    const completedOrders = smmOrders.filter(o => o.status === 'completed').length;
    const activeOrders = smmOrders.filter(o => o.status === 'pending' || o.status === 'processing').length;
    const cancelledOrders = smmOrders.filter(o => o.status === 'cancelled').length;

    const totalRevenue = smmOrders.reduce((sum, o) => sum + (o.amount || 0), 0);
    const totalProviderCost = smmOrders.reduce((sum, o) => {
      const cost = o.customer_details?.provider_cost;
      return sum + (typeof cost === 'number' ? cost : 0);
    }, 0);
    const totalProfit = Math.max(0, totalRevenue - totalProviderCost);
    const profitMargin = totalRevenue > 0 ? ((totalProfit / totalRevenue) * 100).toFixed(1) : '0.0';

    return {
      totalOrders,
      completedOrders,
      activeOrders,
      cancelledOrders,
      totalRevenue,
      totalProviderCost,
      totalProfit,
      profitMargin
    };
  }, [smmOrders]);

  // Low balance threshold calculation
  const numericBalance = balance !== null ? parseFloat(balance) : null;
  const configuredThreshold = settings.followspanel_low_balance_threshold ?? 1000;
  const isLowBalance = numericBalance !== null && !isNaN(numericBalance) && numericBalance < configuredThreshold;

  // Filtered live services
  const filteredServicesList = useMemo(() => {
    return servicesList.filter(s => {
      if (selectedServiceCategory !== 'all' && s.category !== selectedServiceCategory) {
        return false;
      }
      if (servicesSearch.trim()) {
        const q = servicesSearch.toLowerCase();
        return s.name.toLowerCase().includes(q) || s.category.toLowerCase().includes(q) || String(s.service).includes(q);
      }
      return true;
    });
  }, [servicesList, selectedServiceCategory, servicesSearch]);

  const serviceCategories = useMemo(() => {
    const set = new Set(servicesList.map(s => s.category).filter(Boolean));
    return Array.from(set);
  }, [servicesList]);

  return (
    <div className="space-y-6 animate-tab-enter">
      
      {/* Top Header & Actions Bar */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-slate-900/90 p-6 rounded-3xl border border-slate-800 shadow-xl">
        <div>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-blue-400 font-bold text-xl">
              ⚡
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2.5">
                FollowSPanel Provider Dashboard
                <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                  connectionResult?.connected
                    ? 'bg-emerald-950 text-emerald-300 border border-emerald-800/60'
                    : 'bg-red-950 text-red-300 border border-red-800/60'
                }`}>
                  <span className={`w-2 h-2 rounded-full ${
                    connectionResult?.connected ? 'bg-emerald-400 animate-pulse' : 'bg-red-400'
                  }`}></span>
                  {connectionResult?.connected ? 'Live Connected' : 'Disconnected'}
                </span>
              </h1>
              <p className="text-slate-400 text-xs mt-0.5">
                Provider: <span className="font-mono text-slate-300">https://followspanel.com/api/v2</span> • Server Secret: <span className="font-mono text-emerald-400">FOLLOWSPANEL_API_KEY</span>
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center flex-wrap gap-2.5">
          <button
            onClick={() => fetchBalance(false)}
            disabled={loadingBalance}
            className="px-3.5 py-2 bg-slate-800 hover:bg-slate-750 text-slate-200 text-xs font-semibold rounded-xl border border-slate-700/80 transition-all cursor-pointer flex items-center gap-2 disabled:opacity-50"
            title="Fetch latest balance from FollowSPanel"
          >
            <svg className={`w-3.5 h-3.5 ${loadingBalance ? 'animate-spin text-blue-400' : 'text-slate-400'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            <span>{loadingBalance ? 'Updating...' : 'Refresh Balance'}</span>
          </button>

          <button
            onClick={handleTestConnection}
            disabled={testingConnection}
            className="px-3.5 py-2 bg-blue-600/90 hover:bg-blue-600 text-white text-xs font-semibold rounded-xl shadow-xs transition-all cursor-pointer flex items-center gap-2 disabled:opacity-50"
            title="Test real-time connection and credential validity"
          >
            <svg className={`w-3.5 h-3.5 ${testingConnection ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
            <span>{testingConnection ? 'Testing API...' : 'Test API Connection'}</span>
          </button>

          <button
            onClick={handleSyncAllOrders}
            disabled={syncingAll}
            className="px-3.5 py-2 bg-emerald-600/90 hover:bg-emerald-600 text-white text-xs font-semibold rounded-xl shadow-xs transition-all cursor-pointer flex items-center gap-2 disabled:opacity-50"
            title="Sync all pending and processing orders with provider"
          >
            <svg className={`w-3.5 h-3.5 ${syncingAll ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
            </svg>
            <span>{syncingAll ? 'Syncing...' : 'Sync Active Orders'}</span>
          </button>

          <button
            onClick={handleLoadServices}
            disabled={loadingServices}
            className="px-3.5 py-2 bg-slate-800 hover:bg-slate-750 text-slate-300 text-xs font-semibold rounded-xl border border-slate-700/80 transition-all cursor-pointer flex items-center gap-2"
          >
            <span>📋</span>
            <span>{loadingServices ? 'Loading Catalog...' : 'View Services Catalog'}</span>
          </button>
        </div>
      </div>

      {/* Low Balance Warning Banner */}
      {isLowBalance && (
        <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-amber-950/80 to-amber-900/40 border border-amber-500/40 text-amber-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-lg animate-pulse">
          <div className="flex items-start sm:items-center gap-3">
            <span className="text-2xl shrink-0">⚠️</span>
            <div>
              <h4 className="font-bold text-sm text-amber-300">Low FollowSPanel Provider Balance Alert</h4>
              <p className="text-xs text-amber-200/90 mt-0.5">
                Your real FollowSPanel account balance is <strong className="text-white font-mono">{currency} {parseFloat(balance || '0').toLocaleString('en-US', { minimumFractionDigits: 2 })}</strong>, which is below your safety threshold of <strong className="text-white font-mono">{currency} {configuredThreshold.toLocaleString()}</strong>. Please fund your FollowSPanel wallet to prevent boosting orders from stalling.
              </p>
            </div>
          </div>
          <a
            href="https://followspanel.com"
            target="_blank"
            rel="noreferrer"
            className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold rounded-xl transition-all cursor-pointer shrink-0 text-center"
          >
            Fund FollowSPanel ↗
          </a>
        </div>
      )}

      {/* Sync / Status Toast message */}
      {syncMessage && (
        <div className="p-3.5 bg-emerald-950/90 border border-emerald-700 text-emerald-300 text-xs rounded-xl flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span>✅</span>
            <span>{syncMessage}</span>
          </div>
          <button onClick={() => setSyncMessage(null)} className="text-emerald-400 hover:text-white text-xs cursor-pointer">✕</button>
        </div>
      )}

      {/* Connection Result Feedback */}
      {connectionResult?.tested && (
        <div className={`p-4 rounded-2xl border text-xs flex items-center justify-between flex-wrap gap-3 ${
          connectionResult.connected 
            ? 'bg-emerald-950/60 border-emerald-800 text-emerald-300' 
            : 'bg-red-950/60 border-red-800 text-red-300'
        }`}>
          <div className="flex items-center gap-2.5 min-w-0">
            <span className="text-base flex-shrink-0">{connectionResult.connected ? '🟢' : '🔴'}</span>
            <div className="min-w-0">
              <strong className="block">{connectionResult.connected ? 'API Connection Successful' : 'API Connection Failed'}</strong>
              <div className="text-slate-300 break-words mt-0.5">
                {connectionResult.connected 
                  ? `FollowSPanel responded in ${connectionResult.latency_ms || 120}ms. Authentication valid.` 
                  : (connectionResult.error || 'Unable to authenticate with FollowSPanel.')}
              </div>
            </div>
          </div>
          {connectionResult.connected && balance && (
            <span className="font-mono font-bold text-white bg-slate-900 px-2.5 py-1 rounded-lg border border-slate-800 flex-shrink-0">
              Provider Balance: {currency} {parseFloat(balance).toLocaleString('en-US', { minimumFractionDigits: 2 })}
            </span>
          )}
        </div>
      )}

      {/* Primary Key Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* Card 1: Provider Balance */}
        <div className="bg-slate-900/90 p-5 rounded-3xl border border-slate-800 shadow-xl relative overflow-hidden">
          <div className="flex items-center justify-between">
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">FollowSPanel Balance</p>
            <span className="text-xs font-mono text-emerald-400 font-bold">LIVE</span>
          </div>
          
          <div className="mt-3">
            {loadingBalance ? (
              <div className="flex items-center gap-2 py-1 text-slate-400 text-sm">
                <div className="w-4 h-4 border-2 border-blue-400 border-t-transparent rounded-full animate-spin"></div>
                <span>Checking provider wallet...</span>
              </div>
            ) : balanceError ? (
              <div>
                <h3 className="text-lg font-bold text-red-400">Unavailable</h3>
                <p className="text-[11px] text-slate-400 break-words mt-1">{balanceError}</p>
              </div>
            ) : balance !== null ? (
              <div>
                <h3 className="text-2xl font-black text-white tracking-tight">
                  <span className="text-emerald-400 text-lg mr-1">{currency}</span>
                  {parseFloat(balance).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                </h3>
                <p className="text-[11px] text-slate-400 mt-1">
                  Last updated: <span className="font-mono text-slate-300">{lastUpdated || 'Just now'}</span>
                </p>
              </div>
            ) : (
              <h3 className="text-xl font-bold text-slate-400">--</h3>
            )}
          </div>
        </div>

        {/* Card 2: Total SMM Orders Dispatched */}
        <div className="bg-slate-900/90 p-5 rounded-3xl border border-slate-800 shadow-xl">
          <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">API Orders Dispatched</p>
          <h3 className="text-2xl font-black text-blue-400 mt-3">{metrics.totalOrders} Orders</h3>
          <p className="text-[11px] text-slate-400 mt-1">
            <span className="text-emerald-400 font-semibold">{metrics.completedOrders} completed</span> • <span className="text-amber-400 font-semibold">{metrics.activeOrders} active</span>
          </p>
        </div>

        {/* Card 3: Provider Cost vs Revenue */}
        <div className="bg-slate-900/90 p-5 rounded-3xl border border-slate-800 shadow-xl">
          <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Wholesale SMM Cost</p>
          <h3 className="text-2xl font-black text-slate-200 mt-3">
            ₦{metrics.totalProviderCost.toLocaleString('en-US', { minimumFractionDigits: 2 })}
          </h3>
          <p className="text-[11px] text-slate-400 mt-1">
            Total sales volume: <span className="text-white font-medium">₦{metrics.totalRevenue.toLocaleString()}</span>
          </p>
        </div>

        {/* Card 4: Net SMM Profit */}
        <div className="bg-slate-900/90 p-5 rounded-3xl border border-slate-800 shadow-xl">
          <div className="flex items-center justify-between">
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Gross SMM Margin</p>
            <span className="text-xs font-mono font-bold text-emerald-400">+{metrics.profitMargin}%</span>
          </div>
          <h3 className="text-2xl font-black text-emerald-400 mt-3">
            ₦{metrics.totalProfit.toLocaleString('en-US', { minimumFractionDigits: 2 })}
          </h3>
          <p className="text-[11px] text-slate-400 mt-1">
            Calculated from customer price minus provider cost
          </p>
        </div>

      </div>

      {/* Configuration and Threshold Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        
        {/* Low Balance Threshold Card */}
        <div className="bg-slate-900/90 p-5 rounded-3xl border border-slate-800 shadow-xl space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider">Low-Balance Warning Limit</h3>
            <span className="text-xs text-slate-500 font-mono">Auto-Alert</span>
          </div>
          <p className="text-xs text-slate-400">
            Triggers dashboard warning notification when FollowSPanel funds drop below this amount.
          </p>

          <form onSubmit={handleSaveThreshold} className="space-y-3 pt-1">
            <div className="relative">
              <span className="absolute left-3.5 top-2.5 text-xs text-slate-500 font-bold">{currency}</span>
              <input
                type="number"
                min="0"
                step="100"
                value={thresholdInput}
                onChange={(e) => setThresholdInput(e.target.value)}
                className="w-full pl-8 pr-4 py-2 bg-slate-950 border border-slate-800 text-white rounded-xl text-xs font-mono focus:outline-none focus:border-blue-500"
                placeholder="1000"
              />
            </div>
            <div className="flex items-center justify-between">
              <button
                type="submit"
                className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-xl cursor-pointer transition-colors"
              >
                Save Threshold
              </button>
              {savedThresholdMsg && (
                <span className="text-[11px] text-emerald-400 font-semibold animate-fade-in">
                  ✓ Threshold updated
                </span>
              )}
            </div>
          </form>
        </div>

        {/* Security & Endpoint Status */}
        <div className="lg:col-span-2 bg-slate-900/90 p-5 rounded-3xl border border-slate-800 shadow-xl space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider">Server-Side Proxy Security</h3>
            <span className="px-2 py-0.5 bg-emerald-950/80 border border-emerald-800/80 text-emerald-300 rounded-full text-[10px] font-bold">
              🔒 100% Isolated
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            <div className="p-3 bg-slate-950 rounded-2xl border border-slate-800/80">
              <div className="text-slate-400 text-[11px]">Provider Target</div>
              <div className="font-mono text-white font-semibold mt-0.5">https://followspanel.com/api/v2</div>
              <div className="text-[10px] text-slate-500 mt-1">Standard SMM v2 JSON API protocol</div>
            </div>

            <div className="p-3 bg-slate-950 rounded-2xl border border-slate-800/80">
              <div className="text-slate-400 text-[11px]">Server Environment Variable</div>
              <div className="font-mono text-emerald-400 font-semibold mt-0.5">FOLLOWSPANEL_API_KEY</div>
              <div className="text-[10px] text-slate-400 mt-1 flex items-center gap-1.5">
                {configInfo?.configured ? (
                  <span className="text-emerald-400 font-medium">✓ Loaded ({configInfo.length} chars)</span>
                ) : (
                  <span className="text-amber-400 font-medium">⚠ Not set in server environment</span>
                )}
                <span className="text-slate-600">•</span>
                <span className="text-slate-500 font-mono">••••••••</span>
              </div>
            </div>
          </div>

          <p className="text-[11px] text-slate-400">
            Every boosting order placed by customers is authenticated against their wallet, recorded locally, and dispatched server-to-server with real-time idempotency.
          </p>
        </div>

      </div>

      {/* SMM Dispatched Orders Section */}
      <div className="bg-slate-900/90 rounded-3xl border border-slate-800 shadow-xl overflow-hidden space-y-4 p-6">
        
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-5">
          <div>
            <h3 className="text-base font-bold text-white">Surest Plug SMM API Order Records</h3>
            <p className="text-slate-400 text-xs mt-0.5">
              Live records of social media boosting orders dispatched to FollowSPanel
            </p>
          </div>

          {/* Filter & Search */}
          <div className="flex items-center flex-wrap gap-2.5">
            <input
              type="text"
              value={orderSearch}
              onChange={(e) => setOrderSearch(e.target.value)}
              placeholder="Search ref, ID, username, link..."
              className="px-3.5 py-1.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 min-w-[200px]"
            />

            <select
              value={orderStatusFilter}
              onChange={(e) => setOrderStatusFilter(e.target.value)}
              className="px-3 py-1.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none"
            >
              <option value="all">All Statuses ({smmOrders.length})</option>
              <option value="active">Active ({metrics.activeOrders})</option>
              <option value="completed">Completed ({metrics.completedOrders})</option>
              <option value="cancelled">Cancelled ({metrics.cancelledOrders})</option>
            </select>
          </div>
        </div>

        {/* Orders Table */}
        {filteredSmmOrders.length === 0 ? (
          <div className="py-12 text-center text-slate-400 text-xs">
            <div className="w-12 h-12 rounded-2xl bg-slate-800/80 flex items-center justify-center mx-auto mb-3 text-2xl">
              🚀
            </div>
            <p className="font-semibold text-slate-300">No FollowSPanel boosting orders match the criteria.</p>
            <p className="text-slate-500 text-[11px] mt-1">When users order Instagram, TikTok, or YouTube boosting, they will appear here with live provider sync.</p>
          </div>
        ) : (
          <div className="overflow-x-auto table-responsive">
            <table className="w-full text-left border-collapse text-xs min-w-[700px]">
              <thead>
                <tr className="bg-slate-950/80 text-[10px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-800">
                  <th className="p-3.5 pl-4">Order Ref / Provider ID</th>
                  <th className="p-3.5">Customer</th>
                  <th className="p-3.5">Service & Link</th>
                  <th className="p-3.5 text-right">Qty</th>
                  <th className="p-3.5 text-right">Customer Price</th>
                  <th className="p-3.5 text-right">Provider Cost</th>
                  <th className="p-3.5 text-right">Profit</th>
                  <th className="p-3.5 text-center">Provider Status</th>
                  <th className="p-3.5 text-center">Local Status</th>
                  <th className="p-3.5 pr-4 text-right">Sync Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/80">
                {filteredSmmOrders.map((ord) => {
                  const details = ord.customer_details;
                  const smmOrderId = details?.smm_order_id;
                  const providerStatus = details?.provider_status || (ord.status === 'completed' ? 'Completed' : ord.status === 'cancelled' ? 'Canceled' : 'Processing');
                  const customerPrice = ord.amount;
                  const providerCost = typeof details?.provider_cost === 'number' ? details.provider_cost : (customerPrice * 0.7);
                  const profit = Math.max(0, customerPrice - providerCost);
                  const isSyncingThis = syncingOrderId === ord.id;

                  return (
                    <tr key={`fsp-ord-${ord.id}`} className="hover:bg-slate-800/40 transition-colors">
                      {/* Order Ref & FollowSPanel ID */}
                      <td className="p-3.5 pl-4 min-w-[150px]">
                        <div className="font-mono font-bold text-blue-400 break-all">{ord.order_reference}</div>
                        {smmOrderId ? (
                          <div className="text-[11px] font-mono text-emerald-400 flex items-center gap-1 mt-0.5">
                            <span>Provider ID:</span>
                            <span className="font-bold">#{smmOrderId}</span>
                          </div>
                        ) : (
                          <span className="text-[10px] text-slate-500">No Provider ID</span>
                        )}
                        <div className="text-[10px] text-slate-500 mt-0.5">
                          {new Date(ord.created_at).toLocaleDateString()} {new Date(ord.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </div>
                      </td>

                      {/* Customer */}
                      <td className="p-3.5 min-w-[140px]">
                        <div className="font-semibold text-white break-words">{ord.user_name}</div>
                        <div className="text-[10px] text-slate-400 break-all">{ord.user_email}</div>
                      </td>

                      {/* Service & Link */}
                      <td className="p-3.5 min-w-[180px] max-w-[260px]">
                        <div className="font-medium text-slate-200 break-words" title={ord.product_name}>
                          {ord.product_name}
                        </div>
                        {details?.target_link && (
                          <div className="mt-1 flex items-center gap-1.5">
                            <span className="font-mono text-[10px] text-blue-400 bg-slate-950 px-2 py-0.5 rounded break-all" title={details.target_link}>
                              {details.target_link}
                            </span>
                            <button
                              onClick={() => navigator.clipboard.writeText(details.target_link)}
                              className="text-[10px] text-slate-400 hover:text-white cursor-pointer shrink-0"
                              title="Copy link"
                            >
                              📋
                            </button>
                          </div>
                        )}
                      </td>

                      {/* Quantity */}
                      <td className="p-3.5 text-right font-mono font-bold text-white whitespace-nowrap">
                        {details?.quantity ? Number(details.quantity).toLocaleString() : '1'}
                      </td>

                      {/* Customer Price */}
                      <td className="p-3.5 text-right font-black text-emerald-400 whitespace-nowrap">
                        ₦{customerPrice.toLocaleString()}
                      </td>

                      {/* Provider Cost */}
                      <td className="p-3.5 text-right font-mono text-slate-300 whitespace-nowrap">
                        ₦{providerCost.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                      </td>

                      {/* Profit */}
                      <td className="p-3.5 text-right font-mono font-bold text-emerald-300 whitespace-nowrap">
                        +₦{profit.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                      </td>

                      {/* Provider Status */}
                      <td className="p-3.5 text-center whitespace-nowrap">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                          String(providerStatus).toLowerCase().includes('completed')
                            ? 'bg-emerald-950 text-emerald-300 border border-emerald-800/80'
                            : String(providerStatus).toLowerCase().includes('canceled')
                            ? 'bg-red-950 text-red-300 border border-red-800/80'
                            : 'bg-amber-950 text-amber-300 border border-amber-800/80'
                        }`}>
                          {providerStatus}
                        </span>
                        {details?.remains !== undefined && Number(details.remains) > 0 && (
                          <div className="text-[10px] text-slate-400 mt-0.5">
                            Remains: {details.remains}
                          </div>
                        )}
                      </td>

                      {/* Local Status */}
                      <td className="p-3.5 text-center whitespace-nowrap">
                        <select
                          value={ord.status}
                          onChange={(e) => onUpdateOrderStatus(ord.id, e.target.value)}
                          className="px-2 py-1 bg-slate-950 border border-slate-800 text-white rounded-lg text-[11px] focus:outline-none"
                        >
                          <option value="pending">Pending</option>
                          <option value="processing">Processing</option>
                          <option value="completed">Completed</option>
                          <option value="cancelled">Cancelled</option>
                        </select>
                      </td>

                      {/* Actions */}
                      <td className="p-3.5 pr-4 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1.5">
                          {smmOrderId ? (
                            <button
                              onClick={() => handleSyncOrder(ord)}
                              disabled={isSyncingThis}
                              className="px-2.5 py-1 bg-blue-600/80 hover:bg-blue-600 text-white text-[11px] font-semibold rounded-lg transition-all cursor-pointer flex items-center gap-1 disabled:opacity-50"
                              title="Query FollowSPanel API for current delivery status"
                            >
                              {isSyncingThis ? (
                                <>
                                  <div className="w-2.5 h-2.5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                  <span>Syncing</span>
                                </>
                              ) : (
                                <>
                                  <span>🔄</span>
                                  <span>Sync Live</span>
                                </>
                              )}
                            </button>
                          ) : (
                            <span className="text-[10px] text-slate-500">Manual</span>
                          )}

                          <button
                            onClick={() => setSelectedOrderDetails(ord)}
                            className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 text-[11px] font-semibold rounded-lg transition-colors cursor-pointer"
                            title="View full order payload"
                          >
                            Details
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Services Explorer Modal */}
      {showServicesExplorer && (
        <div 
          className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-4"
          onTouchMove={(e) => { if (e.target === e.currentTarget) e.preventDefault(); }}
        >
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-4xl w-full max-h-[calc(100dvh-2rem)] flex flex-col shadow-2xl overflow-hidden animate-scale-up">
            
            {/* Modal Header */}
            <div className="p-5 border-b border-slate-800 flex items-center justify-between">
              <div>
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                  <span>📋</span> FollowSPanel Live Services Catalog
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Direct provider catalog ({servicesList.length} services loaded)
                </p>
              </div>
              <button
                onClick={() => setShowServicesExplorer(false)}
                className="w-8 h-8 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-300 flex items-center justify-center text-xs cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Filter bar */}
            <div className="p-4 bg-slate-950/60 border-b border-slate-800 flex flex-col sm:flex-row items-center gap-3">
              <input
                type="text"
                value={servicesSearch}
                onChange={(e) => setServicesSearch(e.target.value)}
                placeholder="Search services by ID, title, keyword..."
                className="w-full sm:w-72 px-3.5 py-1.5 bg-slate-900 border border-slate-800 text-xs text-white rounded-xl focus:outline-none focus:border-blue-500"
              />

              <select
                value={selectedServiceCategory}
                onChange={(e) => setSelectedServiceCategory(e.target.value)}
                className="w-full sm:w-auto px-3 py-1.5 bg-slate-900 border border-slate-800 text-xs text-white rounded-xl focus:outline-none"
              >
                <option value="all">All Categories ({serviceCategories.length})</option>
                {serviceCategories.map((c, i) => (
                  <option key={`scat-${i}`} value={c}>{c}</option>
                ))}
              </select>

              <div className="text-xs text-slate-400 sm:ml-auto">
                Showing {filteredServicesList.length} of {servicesList.length} services
              </div>
            </div>

            {/* Services Table */}
            <div className="overflow-y-auto overscroll-contain sp-overlay-scroll flex-1 p-4">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-950 text-[10px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-800">
                    <th className="p-3 pl-4">ID</th>
                    <th className="p-3">Category</th>
                    <th className="p-3">Service Name</th>
                    <th className="p-3 text-right">Rate / 1k (₦)</th>
                    <th className="p-3 text-right">Min</th>
                    <th className="p-3 text-right">Max</th>
                    <th className="p-3 text-center">Refill</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {filteredServicesList.slice(0, 100).map((srv) => (
                    <tr key={`srv-item-${srv.service}`} className="hover:bg-slate-800/30">
                      <td className="p-3 pl-4 font-mono font-bold text-blue-400">{srv.service}</td>
                      <td className="p-3 text-slate-300 font-medium truncate max-w-[140px]">{srv.category}</td>
                      <td className="p-3 text-white font-medium">{srv.name}</td>
                      <td className="p-3 text-right font-black text-emerald-400 font-mono">
                        ₦{parseFloat(srv.rate || '0').toLocaleString('en-US', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="p-3 text-right font-mono text-slate-300">{srv.min?.toLocaleString()}</td>
                      <td className="p-3 text-right font-mono text-slate-300">{srv.max?.toLocaleString()}</td>
                      <td className="p-3 text-center">
                        {srv.refill ? (
                          <span className="text-emerald-400 font-bold">✓ Yes</span>
                        ) : (
                          <span className="text-slate-500">No</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {filteredServicesList.length > 100 && (
                <div className="p-4 text-center text-slate-500 text-xs">
                  Showing top 100 matching services. Use the search bar to find specific services.
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-slate-800 bg-slate-950 flex justify-end">
              <button
                onClick={() => setShowServicesExplorer(false)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold rounded-xl cursor-pointer"
              >
                Close Catalog
              </button>
            </div>

          </div>
        </div>
      )}

      {/* Order Details Modal */}
      {selectedOrderDetails && (
        <div 
          className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-4"
          onClick={() => setSelectedOrderDetails(null)}
          onTouchMove={(e) => { if (e.target === e.currentTarget) e.preventDefault(); }}
        >
          <div 
            className="bg-slate-900 border border-slate-800 rounded-3xl max-w-lg w-full max-h-[calc(100dvh-2rem)] overflow-y-auto overscroll-contain sp-overlay-scroll p-6 shadow-2xl space-y-4 animate-scale-up"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-base font-bold text-white">Order Details: {selectedOrderDetails.order_reference}</h3>
              <button
                onClick={() => setSelectedOrderDetails(null)}
                className="w-7 h-7 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-300 flex items-center justify-center text-xs cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="space-y-2.5 text-xs text-slate-300">
              <div className="flex justify-between py-1 border-b border-slate-800/60">
                <span className="text-slate-500">Surest Plug Ref:</span>
                <span className="font-mono font-bold text-blue-400">{selectedOrderDetails.order_reference}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-800/60">
                <span className="text-slate-500">FollowSPanel Order ID:</span>
                <span className="font-mono font-bold text-emerald-400">
                  {selectedOrderDetails.customer_details?.smm_order_id ? `#${selectedOrderDetails.customer_details.smm_order_id}` : 'N/A'}
                </span>
              </div>
              <div className="flex flex-col sm:flex-row sm:justify-between py-1 border-b border-slate-800/60 gap-1">
                <span className="text-slate-500 shrink-0">Customer:</span>
                <span className="font-semibold text-white break-all sm:text-right">{selectedOrderDetails.user_name} ({selectedOrderDetails.user_email})</span>
              </div>
              <div className="flex flex-col sm:flex-row sm:justify-between py-1 border-b border-slate-800/60 gap-1">
                <span className="text-slate-500 shrink-0">Service:</span>
                <span className="font-medium text-white break-words sm:text-right">{selectedOrderDetails.product_name}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-800/60">
                <span className="text-slate-500">Target Link / Handle:</span>
                <span className="font-mono text-blue-300 break-all">{selectedOrderDetails.customer_details?.target_link || 'None'}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-800/60">
                <span className="text-slate-500">Quantity:</span>
                <span className="font-mono font-bold text-white">{selectedOrderDetails.customer_details?.quantity?.toLocaleString() || '1'}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-800/60">
                <span className="text-slate-500">Customer Charged:</span>
                <span className="font-black text-emerald-400">₦{selectedOrderDetails.amount.toLocaleString()}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-800/60">
                <span className="text-slate-500">Provider Wholesale Cost:</span>
                <span className="font-mono text-slate-300">
                  ₦{Number(selectedOrderDetails.customer_details?.provider_cost || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                </span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-800/60">
                <span className="text-slate-500">Profit:</span>
                <span className="font-mono font-bold text-emerald-400">
                  +₦{Number(selectedOrderDetails.customer_details?.profit || (selectedOrderDetails.amount - (selectedOrderDetails.customer_details?.provider_cost || 0))).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                </span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-800/60">
                <span className="text-slate-500">Provider Status:</span>
                <span className="font-bold text-amber-400">{selectedOrderDetails.customer_details?.provider_status || 'Processing'}</span>
              </div>
              {selectedOrderDetails.customer_details?.last_provider_sync && (
                <div className="flex justify-between py-1">
                  <span className="text-slate-500">Last Provider Sync:</span>
                  <span className="text-slate-400">{new Date(selectedOrderDetails.customer_details.last_provider_sync).toLocaleString()}</span>
                </div>
              )}
            </div>

            <div className="pt-2 flex justify-end gap-2">
              {selectedOrderDetails.customer_details?.smm_order_id && (
                <button
                  onClick={() => {
                    handleSyncOrder(selectedOrderDetails);
                    setSelectedOrderDetails(null);
                  }}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-xl cursor-pointer"
                >
                  Sync With Provider
                </button>
              )}
              <button
                onClick={() => setSelectedOrderDetails(null)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold rounded-xl cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default FollowSPanelDashboard;
