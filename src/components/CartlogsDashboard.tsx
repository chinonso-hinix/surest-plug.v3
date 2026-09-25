/**
 * Surest Plug - Admin Cartlogs Dashboard Component
 * 
 * Provider: Cartlogs API (https://api.cartlogs.com/api/v1/)
 * 
 * Features:
 * - Real-time connection testing & latency benchmark
 * - Cartlogs products synchronization & category inspection
 * - International OTP capabilities verification
 * - Supplier cost vs Selling price profit margin analysis
 * - Secure credentials inspector for administrator oversight
 * - Strictly isolated from FollowSPanel boosting provider
 */

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Order, CartlogsProduct, CartlogsCategory, CartlogsConnectionResult } from '../types';
import { store } from '../lib/store';
import { useBodyScrollLock } from '../lib/scrollLock';

interface CartlogsDashboardProps {
  orders: Order[];
  onNavigate?: (route: string) => void;
}

export const CartlogsDashboard: React.FC<CartlogsDashboardProps> = ({
  orders,
  onNavigate
}) => {
  // Connection state
  const [testingConnection, setTestingConnection] = useState<boolean>(false);
  const [connectionResult, setConnectionResult] = useState<CartlogsConnectionResult | null>(null);

  // Sync and live products state
  const [syncingProducts, setSyncingProducts] = useState<boolean>(false);
  const [syncMessage, setSyncMessage] = useState<string | null>(null);
  const [cartlogsProducts, setCartlogsProducts] = useState<CartlogsProduct[]>([]);
  const [cartlogsCategories, setCartlogsCategories] = useState<CartlogsCategory[]>([]);
  const [lastSyncedAt, setLastSyncedAt] = useState<string | null>(null);

  // OTP capabilities inspection state
  const [otpCapability, setOtpCapability] = useState<{ supported: boolean; categories: string[]; message: string } | null>(null);
  const [inspectingOtp, setInspectingOtp] = useState<boolean>(false);

  // Orders filter and search
  const [orderStatusFilter, setOrderStatusFilter] = useState<string>('all');
  const [orderSearch, setOrderSearch] = useState<string>('');
  const [selectedOrderDetails, setSelectedOrderDetails] = useState<Order | null>(null);

  useBodyScrollLock(Boolean(selectedOrderDetails));

  // Filter Cartlogs-only orders
  const cartlogsOrders = useMemo(() => {
    return orders.filter(o => 
      o.customer_details?.supplier === 'cartlogs' || 
      o.category === 'account_logs' ||
      o.order_reference.startsWith('SP-LOG-')
    );
  }, [orders]);

  // Compute Cartlogs financial metrics
  const financialMetrics = useMemo(() => {
    let totalRevenue = 0;
    let totalSupplierCost = 0;
    let totalProfit = 0;

    cartlogsOrders.forEach(o => {
      const revenue = o.amount || 0;
      const cost = o.customer_details?.supplier_cost || (revenue * 0.6);
      const profit = o.customer_details?.profit || (revenue - cost);

      totalRevenue += revenue;
      totalSupplierCost += cost;
      totalProfit += profit;
    });

    return {
      totalRevenue,
      totalSupplierCost,
      totalProfit,
      totalOrders: cartlogsOrders.length,
      marginPercent: totalRevenue > 0 ? ((totalProfit / totalRevenue) * 100).toFixed(1) : '0'
    };
  }, [cartlogsOrders]);

  // Load live products & categories from Cartlogs
  const loadCartlogsData = useCallback(async (isSilent = false) => {
    if (!isSilent) setSyncingProducts(true);
    try {
      const [catRes, prodRes] = await Promise.all([
        store.fetchAdminCartlogsCategories(),
        store.fetchAdminCartlogsProducts()
      ]);

      if (catRes.success && catRes.categories) {
        setCartlogsCategories(catRes.categories);
      }
      if (prodRes.success && prodRes.products) {
        setCartlogsProducts(prodRes.products);
      }
      setLastSyncedAt(new Date().toLocaleTimeString());
    } catch {
      // Handled silently
    } finally {
      if (!isSilent) setSyncingProducts(false);
    }
  }, []);

  // Initial mount: test connection and load live products
  useEffect(() => {
    handleTestConnection();
    loadCartlogsData(true);
    handleInspectOtp();
  }, []);

  // Test Connection
  const handleTestConnection = async () => {
    setTestingConnection(true);
    try {
      const res = await store.testCartlogsConnection();
      if (res.success && res.data) {
        setConnectionResult(res.data);
      } else {
        setConnectionResult({
          connected: false,
          provider: 'Cartlogs',
          error: res.error || 'Connection failed'
        });
      }
    } catch (err: any) {
      setConnectionResult({
        connected: false,
        provider: 'Cartlogs',
        error: err.message || 'Unable to connect to Cartlogs API'
      });
    } finally {
      setTestingConnection(false);
    }
  };

  // Inspect OTP capabilities
  const handleInspectOtp = async () => {
    setInspectingOtp(true);
    try {
      const res = await store.inspectCartlogsOtpCapabilities();
      setOtpCapability(res);
    } catch {
      setOtpCapability({
        supported: false,
        categories: [],
        message: 'Cartlogs does not currently expose international phone/OTP verification numbers.'
      });
    } finally {
      setInspectingOtp(false);
    }
  };

  // Sync Products Handler
  const handleSyncProducts = async () => {
    setSyncingProducts(true);
    setSyncMessage(null);
    try {
      await loadCartlogsData(false);
      setSyncMessage('Successfully synchronized catalog with Cartlogs API.');
      setTimeout(() => setSyncMessage(null), 4000);
    } catch {
      setSyncMessage('Failed to synchronize catalog with Cartlogs.');
      setTimeout(() => setSyncMessage(null), 4000);
    } finally {
      setSyncingProducts(false);
    }
  };

  // Filtered orders
  const filteredOrders = useMemo(() => {
    return cartlogsOrders.filter(ord => {
      const matchesStatus = orderStatusFilter === 'all' || ord.status === orderStatusFilter;
      const matchesSearch = 
        ord.order_reference.toLowerCase().includes(orderSearch.toLowerCase()) ||
        ord.user_name.toLowerCase().includes(orderSearch.toLowerCase()) ||
        ord.user_email.toLowerCase().includes(orderSearch.toLowerCase()) ||
        ord.product_name.toLowerCase().includes(orderSearch.toLowerCase()) ||
        String(ord.customer_details?.cartlogs_order_id || '').toLowerCase().includes(orderSearch.toLowerCase());

      return matchesStatus && matchesSearch;
    });
  }, [cartlogsOrders, orderStatusFilter, orderSearch]);

  return (
    <div className="space-y-8">
      
      {/* Header Bar */}
      <div className="bg-slate-900 rounded-3xl p-6 sm:p-8 text-white border border-slate-800 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-2 max-w-2xl">
          <div className="flex items-center gap-2">
            <span className="px-3 py-1 bg-blue-500/20 text-blue-300 border border-blue-400/30 rounded-full text-xs font-bold uppercase tracking-wider">
              Supplier Integration
            </span>
            <span className="text-xs text-slate-400 font-mono">api.cartlogs.com/api/v1/</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
            Cartlogs Account Logs Engine
          </h2>
          <p className="text-slate-300 text-xs sm:text-sm leading-relaxed">
            Direct connector for social media logs, aged profiles, and account credentials with automated pricing formula calculations and customer credential delivery.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 shrink-0">
          <button
            onClick={handleTestConnection}
            disabled={testingConnection}
            className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 active:bg-slate-600 text-white rounded-xl text-xs font-bold border border-slate-700 transition-all cursor-pointer flex items-center justify-center gap-2"
          >
            {testingConnection ? (
              <>
                <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                <span>Testing...</span>
              </>
            ) : (
              <>
                <svg className="w-4 h-4 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
                <span>Test Connection</span>
              </>
            )}
          </button>

          <button
            onClick={handleSyncProducts}
            disabled={syncingProducts}
            className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-md transition-all cursor-pointer flex items-center justify-center gap-2"
          >
            {syncingProducts ? (
              <>
                <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                <span>Syncing...</span>
              </>
            ) : (
              <>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                <span>Sync Products</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Sync Message Alert */}
      {syncMessage && (
        <div className="p-4 bg-emerald-950/60 border border-emerald-800 text-emerald-300 rounded-2xl text-xs font-semibold flex items-center gap-3">
          <svg className="w-5 h-5 text-emerald-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
          </svg>
          <span>{syncMessage}</span>
        </div>
      )}

      {/* Overview Stat Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* Connection Status Card */}
        <div className="p-5 bg-white rounded-3xl border border-slate-200/80 shadow-xs space-y-2">
          <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Cartlogs API Status</p>
          <div className="flex items-center gap-2.5">
            <span className={`w-3 h-3 rounded-full ${connectionResult?.connected ? 'bg-emerald-500 animate-pulse' : 'bg-red-500'}`}></span>
            <span className="text-base font-extrabold text-slate-900">
              {connectionResult?.connected ? 'Online & Authenticated' : 'Offline / Key Pending'}
            </span>
          </div>
          {connectionResult?.latency_ms !== undefined && (
            <p className="text-xs text-slate-500">Latency: <strong>{connectionResult.latency_ms}ms</strong></p>
          )}
        </div>

        {/* Synchronized Inventory */}
        <div className="p-5 bg-white rounded-3xl border border-slate-200/80 shadow-xs space-y-2">
          <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Synchronized Catalog</p>
          <p className="text-2xl font-black text-slate-900">
            {cartlogsProducts.length} <span className="text-sm font-semibold text-slate-500">products</span>
          </p>
          <p className="text-xs text-slate-500">
            {cartlogsCategories.length} categories active {lastSyncedAt && `• Synced ${lastSyncedAt}`}
          </p>
        </div>

        {/* Total Logs Revenue */}
        <div className="p-5 bg-white rounded-3xl border border-slate-200/80 shadow-xs space-y-2">
          <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Total Customer Revenue</p>
          <p className="text-2xl font-black text-slate-900">
            ₦{financialMetrics.totalRevenue.toLocaleString()}
          </p>
          <p className="text-xs text-slate-500">
            {financialMetrics.totalOrders} total logs ordered
          </p>
        </div>

        {/* Net Profit Margin */}
        <div className="p-5 bg-white rounded-3xl border border-slate-200/80 shadow-xs space-y-2">
          <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Net Profit Margin</p>
          <p className="text-2xl font-black text-emerald-600">
            ₦{financialMetrics.totalProfit.toLocaleString()}
          </p>
          <p className="text-xs text-slate-500">
            {financialMetrics.marginPercent}% effective margin
          </p>
        </div>
      </div>

      {/* International OTP Capabilities Banner */}
      <div className="p-5 bg-slate-50 border border-slate-200 rounded-3xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className="w-9 h-9 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center shrink-0 mt-0.5">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
            </svg>
          </div>
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-900">
              International Phone / OTP Service Inspection
            </h4>
            <p className="text-xs text-slate-600 mt-0.5">
              {otpCapability?.message || 'Inspecting Cartlogs API for virtual verification numbers...'}
            </p>
          </div>
        </div>

        <div className="shrink-0 flex items-center gap-2">
          <span className={`px-3 py-1 rounded-full text-xs font-bold ${
            otpCapability?.supported
              ? 'bg-emerald-100 text-emerald-800'
              : 'bg-slate-200 text-slate-700'
          }`}>
            {otpCapability?.supported ? 'OTP Supported' : 'OTP Not Provided by API (Kept Coming Soon)'}
          </span>
          <button
            onClick={handleInspectOtp}
            disabled={inspectingOtp}
            className="px-3 py-1 bg-white hover:bg-slate-100 border border-slate-300 rounded-lg text-xs font-semibold text-slate-700 cursor-pointer"
          >
            {inspectingOtp ? 'Checking...' : 'Re-check'}
          </button>
        </div>
      </div>

      {/* Orders Management Table */}
      <div className="bg-white rounded-3xl border border-slate-200/80 overflow-hidden shadow-xs space-y-4 p-6">
        
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h3 className="text-lg font-bold text-slate-900">
              Cartlogs Order History & Credentials
            </h3>
            <p className="text-slate-500 text-xs mt-0.5">
              Review fulfilled account orders, compare supplier cost vs customer price, and inspect decrypted credentials.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <select
              value={orderStatusFilter}
              onChange={(e) => setOrderStatusFilter(e.target.value)}
              className="px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-600"
            >
              <option value="all">All Statuses</option>
              <option value="completed">Completed</option>
              <option value="processing">Processing</option>
              <option value="pending">Pending</option>
              <option value="cancelled">Cancelled</option>
            </select>

            <input
              type="text"
              placeholder="Search reference, email..."
              value={orderSearch}
              onChange={(e) => setOrderSearch(e.target.value)}
              className="px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600 w-48 sm:w-60"
            />
          </div>
        </div>

        {filteredOrders.length === 0 ? (
          <div className="py-12 text-center text-slate-400 space-y-2">
            <svg className="w-12 h-12 mx-auto text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <p className="text-sm font-semibold text-slate-600">No Cartlogs orders recorded yet</p>
            <p className="text-xs text-slate-400">When customers purchase social media logs, orders will appear here.</p>
          </div>
        ) : (
          <div className="overflow-x-auto table-responsive">
            <table className="w-full text-left text-xs min-w-[700px]">
              <thead className="bg-slate-50 text-slate-500 font-bold uppercase tracking-wider border-b border-slate-100">
                <tr>
                  <th className="px-4 py-3">Order Ref</th>
                  <th className="px-4 py-3">Customer</th>
                  <th className="px-4 py-3">Product Title</th>
                  <th className="px-4 py-3">Supplier Cost</th>
                  <th className="px-4 py-3">Selling Price</th>
                  <th className="px-4 py-3">Net Profit</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                {filteredOrders.map((ord, idx) => {
                  const revenue = ord.amount || 0;
                  const supplierCost = ord.customer_details?.supplier_cost || (revenue * 0.6);
                  const profit = ord.customer_details?.profit || (revenue - supplierCost);

                  return (
                    <tr key={`cartlogs-ord-${ord.id}-${idx}`} className="hover:bg-slate-50/80 transition-colors">
                      <td className="px-4 py-3 font-mono font-bold text-blue-600 break-all min-w-[130px]">
                        {ord.order_reference}
                      </td>
                      <td className="px-4 py-3 min-w-[140px]">
                        <p className="font-bold text-slate-900 break-words">{ord.user_name}</p>
                        <p className="text-[11px] text-slate-400 break-all">{ord.user_email}</p>
                      </td>
                      <td className="px-4 py-3 min-w-[160px]">
                        <p className="font-bold text-slate-800 break-words">{ord.product_name}</p>
                        <span className="text-[10px] text-blue-600 bg-blue-50 px-2 py-0.5 rounded-md font-bold uppercase inline-block mt-0.5">
                          {ord.customer_details?.category || 'Account'}
                        </span>
                      </td>
                      <td className="px-4 py-3 font-mono font-semibold text-slate-600 whitespace-nowrap">
                        ₦{supplierCost.toLocaleString()}
                      </td>
                      <td className="px-4 py-3 font-mono font-bold text-slate-900 whitespace-nowrap">
                        ₦{revenue.toLocaleString()}
                      </td>
                      <td className="px-4 py-3 font-mono font-bold text-emerald-600 whitespace-nowrap">
                        +₦{profit.toLocaleString()}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className={`px-2.5 py-1 rounded-full text-[10px] font-extrabold uppercase ${
                          ord.status === 'completed' 
                            ? 'bg-emerald-100 text-emerald-800' 
                            : ord.status === 'processing'
                            ? 'bg-blue-100 text-blue-800'
                            : 'bg-amber-100 text-amber-800'
                        }`}>
                          {ord.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right whitespace-nowrap">
                        <button
                          onClick={() => setSelectedOrderDetails(ord)}
                          className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-lg text-xs transition-colors cursor-pointer"
                        >
                          View Credentials
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Credentials Inspector Modal */}
      {selectedOrderDetails && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs"
          onClick={() => setSelectedOrderDetails(null)}
          onTouchMove={(e) => { if (e.target === e.currentTarget) e.preventDefault(); }}
        >
          <div
            className="relative w-full max-w-lg max-h-[calc(100dvh-2rem)] overflow-y-auto overscroll-contain sp-overlay-scroll bg-white rounded-3xl shadow-2xl p-6 sm:p-8 border border-slate-100 space-y-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-4 border-b border-slate-100 pb-4">
              <div>
                <span className="px-2.5 py-1 rounded-full bg-blue-50 text-blue-700 text-xs font-bold uppercase tracking-wider">
                  Admin Credentials Inspector
                </span>
                <h3 className="text-lg font-bold text-slate-900 mt-1">
                  {selectedOrderDetails.product_name}
                </h3>
                <p className="text-xs text-slate-500 font-mono">
                  Reference: {selectedOrderDetails.order_reference}
                </p>
              </div>
              <button
                onClick={() => setSelectedOrderDetails(null)}
                className="text-slate-400 hover:text-slate-600 p-2 rounded-full hover:bg-slate-100"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Financial Ledger */}
            <div className="grid grid-cols-3 gap-2 p-3 bg-slate-50 rounded-2xl text-center text-xs">
              <div>
                <p className="text-[10px] uppercase font-bold text-slate-400">Supplier Cost</p>
                <p className="font-bold text-slate-700">₦{(selectedOrderDetails.customer_details?.supplier_cost || 0).toLocaleString()}</p>
              </div>
              <div>
                <p className="text-[10px] uppercase font-bold text-slate-400">Customer Paid</p>
                <p className="font-bold text-blue-600">₦{selectedOrderDetails.amount.toLocaleString()}</p>
              </div>
              <div>
                <p className="text-[10px] uppercase font-bold text-slate-400">Net Profit</p>
                <p className="font-bold text-emerald-600">+₦{(selectedOrderDetails.customer_details?.profit || 0).toLocaleString()}</p>
              </div>
            </div>

            {/* Decrypted Credentials Box */}
            <div className="p-4 bg-slate-900 text-white rounded-2xl space-y-2.5 font-mono text-xs border border-slate-800">
              <p className="text-[10px] uppercase tracking-wider text-emerald-400 font-sans font-bold border-b border-slate-800 pb-2">
                Decrypted Account Credentials
              </p>
              
              {selectedOrderDetails.customer_details?.credentials?.username && (
                <div className="flex flex-col sm:flex-row sm:justify-between py-1 gap-1">
                  <span className="text-slate-400 font-sans shrink-0">Username:</span>
                  <span className="text-white font-bold select-all break-all">{selectedOrderDetails.customer_details.credentials.username}</span>
                </div>
              )}

              {selectedOrderDetails.customer_details?.credentials?.password && (
                <div className="flex flex-col sm:flex-row sm:justify-between py-1 gap-1">
                  <span className="text-slate-400 font-sans shrink-0">Password:</span>
                  <span className="text-amber-300 font-bold select-all break-all">{selectedOrderDetails.customer_details.credentials.password}</span>
                </div>
              )}

              {selectedOrderDetails.customer_details?.credentials?.email && (
                <div className="flex flex-col sm:flex-row sm:justify-between py-1 gap-1">
                  <span className="text-slate-400 font-sans shrink-0">Master Email:</span>
                  <span className="text-cyan-300 font-bold select-all break-all">{selectedOrderDetails.customer_details.credentials.email}</span>
                </div>
              )}

              {selectedOrderDetails.customer_details?.credentials?.additional_info && (
                <div className="pt-2 border-t border-slate-800 text-slate-300 font-sans text-[11px] break-words">
                  {selectedOrderDetails.customer_details.credentials.additional_info}
                </div>
              )}
            </div>

            <button
              onClick={() => setSelectedOrderDetails(null)}
              className="w-full py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition-colors cursor-pointer"
            >
              Close Inspector
            </button>
          </div>
        </div>
      )}

    </div>
  );
};

export default CartlogsDashboard;
