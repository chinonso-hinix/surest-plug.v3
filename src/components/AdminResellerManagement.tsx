import React, { useState, useEffect } from 'react';
import { 
  ShieldCheck, 
  Key, 
  Layers, 
  TrendingUp, 
  Activity, 
  RefreshCw, 
  Search, 
  Ban, 
  CheckCircle, 
  Trash2, 
  Settings, 
  Filter,
  AlertTriangle
} from 'lucide-react';
import { ResellerProfile, ResellerApiLog, ResellerPricingConfig } from '../types';
import db from '../lib/store';

export const AdminResellerManagement: React.FC = () => {
  const [resellers, setResellers] = useState<ResellerProfile[]>([]);
  const [stats, setStats] = useState<{
    total_resellers: number;
    active_keys: number;
    total_orders: number;
    total_volume: number;
    avg_latency_ms: number;
  }>({
    total_resellers: 0,
    active_keys: 0,
    total_orders: 0,
    total_volume: 0,
    avg_latency_ms: 0
  });

  const [logs, setLogs] = useState<ResellerApiLog[]>([]);
  const [pricing, setPricing] = useState<ResellerPricingConfig>({
    smm_discount_percent: 5,
    accounts_discount_percent: 5,
    numbers_discount_percent: 5,
    marketplace_discount_percent: 5,
    min_balance_threshold: 5000,
    enabled_categories: { smm: true, accounts: true, numbers: true, marketplace: true },
    disabled_product_ids: []
  });

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'resellers' | 'logs' | 'pricing'>('resellers');
  const [logStatusFilter, setLogStatusFilter] = useState<'all' | '2xx' | '4xx' | '5xx'>('all');

  const [savingPricing, setSavingPricing] = useState(false);
  const [pricingSuccessMsg, setPricingSuccessMsg] = useState(false);

  const loadAdminData = async (isManual = false) => {
    if (isManual) setRefreshing(true);
    try {
      const resellersData = await db.getAdminResellers();
      if (resellersData.success) {
        setResellers(resellersData.resellers || []);
        if (resellersData.stats) setStats(resellersData.stats);
      }

      const logsData = await db.getAdminResellerLogs(100, logStatusFilter);
      if (logsData.success && logsData.logs) {
        setLogs(logsData.logs);
      }

      const pricingData = await db.getResellerPricing();
      if (pricingData.success && pricingData.pricing) {
        setPricing(pricingData.pricing);
      }
    } catch (err) {
      console.error('Error loading admin reseller data:', err);
    } finally {
      setLoading(false);
      if (isManual) setRefreshing(false);
    }
  };

  useEffect(() => {
    loadAdminData();
  }, [logStatusFilter]);

  const handleToggleStatus = async (userId: string | number, currentStatus: string) => {
    const nextStatus = currentStatus === 'active' ? 'suspended' : 'active';
    const confirmMsg = nextStatus === 'suspended'
      ? 'Suspend this reseller? All automated API calls using their key will be rejected.'
      : 'Reactivate this reseller? Their API access will be restored immediately.';

    if (!window.confirm(confirmMsg)) return;

    try {
      const res = await db.toggleResellerStatus(userId, nextStatus as any);
      if (res.success) {
        await loadAdminData();
      } else {
        alert(res.error || 'Failed to update reseller status');
      }
    } catch (err: any) {
      alert(err?.message || 'Error updating status');
    }
  };

  const handleRevokeKey = async (userId: string | number, email: string) => {
    if (!window.confirm(`Revoke active API Key for ${email}?`)) return;

    try {
      const res = await db.adminRevokeResellerKey(userId);
      if (res.success) {
        await loadAdminData();
      } else {
        alert(res.error || 'Failed to revoke key');
      }
    } catch (err: any) {
      alert(err?.message || 'Error revoking key');
    }
  };

  const handleSavePricing = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingPricing(true);
    try {
      const res = await db.updateResellerPricing(pricing);
      if (res.success) {
        setPricingSuccessMsg(true);
        setTimeout(() => setPricingSuccessMsg(false), 3000);
      }
    } catch (err: any) {
      alert(err?.message || 'Error saving reseller pricing');
    } finally {
      setSavingPricing(false);
    }
  };

  const filteredResellers = resellers.filter(r => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      r.email.toLowerCase().includes(q) ||
      (r.full_name && r.full_name.toLowerCase().includes(q)) ||
      String(r.user_id).includes(q)
    );
  });

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[350px] text-gray-500">
        <RefreshCw className="w-8 h-8 animate-spin text-emerald-600 mb-2" />
        <p className="text-sm font-medium">Loading reseller administration console...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-gray-100 pb-5">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Reseller API Administration</h1>
            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-blue-100 text-blue-800">
              Admin Suite
            </span>
          </div>
          <p className="text-sm text-gray-600">
            Monitor automated API users, enforce the ₦5,000 balance rule, manage margins, and inspect real-time request logs.
          </p>
        </div>

        <button
          onClick={() => loadAdminData(true)}
          disabled={refreshing}
          className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors self-start sm:self-auto"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
          Refresh Data
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <div className="bg-white p-4 rounded-xl border border-gray-200/80 shadow-xs">
          <div className="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-1">Total Resellers</div>
          <div className="text-2xl font-bold text-gray-900">{stats.total_resellers}</div>
          <div className="text-[11px] text-gray-500 mt-1">Registered API profiles</div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-gray-200/80 shadow-xs">
          <div className="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-1">Active API Keys</div>
          <div className="text-2xl font-bold text-emerald-700">{stats.active_keys}</div>
          <div className="text-[11px] text-gray-500 mt-1">Live Bearer tokens</div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-gray-200/80 shadow-xs">
          <div className="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-1">Total API Orders</div>
          <div className="text-2xl font-bold text-gray-900">{stats.total_orders.toLocaleString()}</div>
          <div className="text-[11px] text-gray-500 mt-1">Processed programmatically</div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-gray-200/80 shadow-xs">
          <div className="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-1">API Gross Volume</div>
          <div className="text-2xl font-bold text-gray-900">₦{stats.total_volume.toLocaleString()}</div>
          <div className="text-[11px] text-gray-500 mt-1">Automated revenue</div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-gray-200/80 shadow-xs">
          <div className="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-1">Avg API Latency</div>
          <div className="text-2xl font-bold text-emerald-700">{stats.avg_latency_ms}ms</div>
          <div className="text-[11px] text-gray-500 mt-1">Endpoint response speed</div>
        </div>
      </div>

      {/* Admin Navigation Tabs */}
      <div className="flex items-center gap-4 border-b border-gray-200">
        <button
          onClick={() => setActiveTab('resellers')}
          className={`pb-3 text-sm font-semibold border-b-2 transition-colors flex items-center gap-2 ${
            activeTab === 'resellers'
              ? 'border-emerald-600 text-emerald-700'
              : 'border-transparent text-gray-500 hover:text-gray-900'
          }`}
        >
          <ShieldCheck className="w-4 h-4" />
          Reseller Accounts ({filteredResellers.length})
        </button>

        <button
          onClick={() => setActiveTab('logs')}
          className={`pb-3 text-sm font-semibold border-b-2 transition-colors flex items-center gap-2 ${
            activeTab === 'logs'
              ? 'border-emerald-600 text-emerald-700'
              : 'border-transparent text-gray-500 hover:text-gray-900'
          }`}
        >
          <Activity className="w-4 h-4" />
          Audit & Telemetry Logs
        </button>

        <button
          onClick={() => setActiveTab('pricing')}
          className={`pb-3 text-sm font-semibold border-b-2 transition-colors flex items-center gap-2 ${
            activeTab === 'pricing'
              ? 'border-emerald-600 text-emerald-700'
              : 'border-transparent text-gray-500 hover:text-gray-900'
          }`}
        >
          <Settings className="w-4 h-4" />
          Discount Margins & Thresholds
        </button>
      </div>

      {/* TAB 1: RESELLERS LIST */}
      {activeTab === 'resellers' && (
        <div className="bg-white rounded-xl border border-gray-200 shadow-xs overflow-hidden">
          <div className="p-4 border-b border-gray-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="relative flex-1 max-w-sm">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Search reseller by name, email, or ID..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 text-xs border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
              />
            </div>
            <span className="text-xs text-gray-500">
              Rule: <strong>₦5,000 minimum wallet balance</strong> enforced server-side.
            </span>
          </div>

          {filteredResellers.length === 0 ? (
            <div className="p-12 text-center text-gray-500">
              <p className="text-sm font-medium">No resellers found</p>
              <p className="text-xs text-gray-400 mt-1">Users who generate an API key will appear in this list.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-gray-50 text-gray-600 font-semibold border-b border-gray-100">
                  <tr>
                    <th className="py-3 px-4">User</th>
                    <th className="py-3 px-4">Wallet Balance</th>
                    <th className="py-3 px-4">Eligibility</th>
                    <th className="py-3 px-4">API Key</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4">Orders</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filteredResellers.map((r) => {
                    const isEligible = (r.balance ?? 0) >= (r.min_balance_threshold ?? 5000);
                    return (
                      <tr key={String(r.user_id)} className="hover:bg-gray-50/50">
                        <td className="py-3 px-4">
                          <div className="font-semibold text-gray-900">{r.full_name || 'Reseller'}</div>
                          <div className="text-gray-500 text-[11px]">{r.email}</div>
                        </td>
                        <td className="py-3 px-4 font-bold text-gray-900">
                          ₦{(r.balance || 0).toLocaleString()}
                        </td>
                        <td className="py-3 px-4">
                          <span className={`px-2 py-0.5 rounded text-[11px] font-semibold ${
                            isEligible ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                          }`}>
                            {isEligible ? 'Eligible (≥ ₦5k)' : 'Under ₦5k'}
                          </span>
                        </td>
                        <td className="py-3 px-4 font-mono text-gray-600">
                          {r.has_api_key ? (
                            <span className="text-emerald-700 font-semibold">{r.api_key_masked}</span>
                          ) : (
                            <span className="text-gray-400">None</span>
                          )}
                        </td>
                        <td className="py-3 px-4">
                          <span className={`px-2 py-0.5 rounded text-[11px] font-semibold ${
                            r.status === 'active' ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                          }`}>
                            {r.status}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-gray-700">
                          <span className="font-semibold">{r.total_orders || 0}</span> orders
                          <span className="block text-[11px] text-gray-400">₦{(r.total_spent || 0).toLocaleString()}</span>
                        </td>
                        <td className="py-3 px-4 text-right space-x-2">
                          <button
                            onClick={() => handleToggleStatus(r.user_id, r.status)}
                            className={`px-2.5 py-1 rounded text-xs font-semibold transition-colors ${
                              r.status === 'active'
                                ? 'bg-amber-50 text-amber-700 hover:bg-amber-100 border border-amber-200'
                                : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200'
                            }`}
                          >
                            {r.status === 'active' ? 'Suspend' : 'Activate'}
                          </button>

                          {r.has_api_key && (
                            <button
                              onClick={() => handleRevokeKey(r.user_id, r.email)}
                              className="px-2.5 py-1 rounded text-xs font-semibold bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200 transition-colors"
                            >
                              Revoke Key
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* TAB 2: AUDIT & TELEMETRY LOGS */}
      {activeTab === 'logs' && (
        <div className="bg-white rounded-xl border border-gray-200 shadow-xs overflow-hidden">
          <div className="p-4 border-b border-gray-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-gray-400" />
              <span className="text-xs font-semibold text-gray-700">Filter Response:</span>
              {(['all', '2xx', '4xx', '5xx'] as const).map((code) => (
                <button
                  key={code}
                  onClick={() => setLogStatusFilter(code)}
                  className={`px-2.5 py-1 rounded text-xs font-semibold uppercase transition-colors ${
                    logStatusFilter === code 
                      ? 'bg-gray-900 text-white' 
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {code}
                </button>
              ))}
            </div>

            <span className="text-xs text-gray-500">
              Showing last {logs.length} API requests
            </span>
          </div>

          {logs.length === 0 ? (
            <div className="p-12 text-center text-gray-500 text-xs">
              No API requests found matching filter.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs font-mono">
                <thead className="bg-gray-50 text-gray-600 font-semibold border-b border-gray-100 font-sans">
                  <tr>
                    <th className="py-2.5 px-4">Method</th>
                    <th className="py-2.5 px-4">Path</th>
                    <th className="py-2.5 px-4">Reseller</th>
                    <th className="py-2.5 px-4">Status</th>
                    <th className="py-2.5 px-4">Latency</th>
                    <th className="py-2.5 px-4">IP</th>
                    <th className="py-2.5 px-4">Timestamp</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 text-[11px]">
                  {logs.map((l) => (
                    <tr key={l.id} className="hover:bg-gray-50/50">
                      <td className="py-2.5 px-4">
                        <span className={`px-2 py-0.5 rounded font-bold ${
                          l.method === 'GET' ? 'bg-blue-50 text-blue-700' :
                          l.method === 'POST' ? 'bg-emerald-50 text-emerald-700' :
                          'bg-gray-100 text-gray-700'
                        }`}>
                          {l.method}
                        </span>
                      </td>
                      <td className="py-2.5 px-4 font-semibold text-gray-900">
                        {l.path}
                        {l.error_message && (
                          <span className="block text-[10px] text-rose-600 font-sans mt-0.5">
                            {l.error_message}
                          </span>
                        )}
                      </td>
                      <td className="py-2.5 px-4 font-sans text-gray-600">
                        {l.reseller_email}
                      </td>
                      <td className="py-2.5 px-4">
                        <span className={`px-2 py-0.5 rounded font-semibold ${
                          l.status_code >= 200 && l.status_code < 300 ? 'bg-emerald-100 text-emerald-800' :
                          l.status_code >= 400 && l.status_code < 500 ? 'bg-amber-100 text-amber-800' :
                          'bg-rose-100 text-rose-800'
                        }`}>
                          {l.status_code}
                        </span>
                      </td>
                      <td className="py-2.5 px-4 text-gray-600">
                        {l.latency_ms}ms
                      </td>
                      <td className="py-2.5 px-4 text-gray-500">
                        {l.ip}
                      </td>
                      <td className="py-2.5 px-4 font-sans text-gray-400">
                        {new Date(l.created_at).toLocaleTimeString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* TAB 3: PRICING & MARGINS */}
      {activeTab === 'pricing' && (
        <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-xs max-w-2xl">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-base font-bold text-gray-900">Reseller Discount Rates & Eligibility</h3>
              <p className="text-xs text-gray-500">Configure global discounts applied to automated API order requests.</p>
            </div>
            <span className="text-xs font-semibold px-2.5 py-1 bg-emerald-100 text-emerald-800 rounded-full">
              Unified Reseller Policy (No Tiers)
            </span>
          </div>

          <form onSubmit={handleSavePricing} className="space-y-5">
            <div>
              <h4 className="text-xs font-bold text-gray-900 uppercase tracking-wider mb-2">Category Availability via API</h4>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {[
                  { key: 'smm', label: 'SMM Boosting' },
                  { key: 'accounts', label: 'Social Accounts' },
                  { key: 'numbers', label: 'Virtual Numbers' },
                  { key: 'marketplace', label: 'Marketplace' }
                ].map(cat => {
                  const isEnabled = pricing.enabled_categories?.[cat.key as keyof typeof pricing.enabled_categories] !== false;
                  return (
                    <label key={cat.key} className={`flex items-center gap-2 p-2.5 rounded-lg border text-xs font-medium cursor-pointer transition-colors ${isEnabled ? 'bg-emerald-50/50 border-emerald-300 text-emerald-900' : 'bg-gray-50 border-gray-200 text-gray-400'}`}>
                      <input
                        type="checkbox"
                        checked={isEnabled}
                        onChange={(e) => {
                          const updated = {
                            ...(pricing.enabled_categories || { smm: true, accounts: true, numbers: true, marketplace: true }),
                            [cat.key]: e.target.checked
                          };
                          setPricing({ ...pricing, enabled_categories: updated });
                        }}
                        className="rounded text-emerald-600 focus:ring-emerald-500 h-4 w-4"
                      />
                      <span>{cat.label}</span>
                    </label>
                  );
                })}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  SMM Boosting Discount (%)
                </label>
                <input
                  type="number"
                  min="0"
                  max="50"
                  value={pricing.smm_discount_percent}
                  onChange={(e) => setPricing({ ...pricing, smm_discount_percent: Number(e.target.value) })}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
                />
                <span className="text-[11px] text-gray-500">Off standard retail rates</span>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Aged Social Accounts Discount (%)
                </label>
                <input
                  type="number"
                  min="0"
                  max="50"
                  value={pricing.accounts_discount_percent}
                  onChange={(e) => setPricing({ ...pricing, accounts_discount_percent: Number(e.target.value) })}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
                />
                <span className="text-[11px] text-gray-500">Off standard retail rates</span>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Virtual Numbers Discount (%)
                </label>
                <input
                  type="number"
                  min="0"
                  max="50"
                  value={pricing.numbers_discount_percent}
                  onChange={(e) => setPricing({ ...pricing, numbers_discount_percent: Number(e.target.value) })}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
                />
                <span className="text-[11px] text-gray-500">Off standard retail rates</span>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Minimum Wallet Balance (₦)
                </label>
                <input
                  type="number"
                  disabled
                  value={5000}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg bg-gray-100 text-gray-700 font-semibold cursor-not-allowed"
                />
                <span className="text-[11px] text-emerald-700 font-medium">Strict requirement: ₦5,000</span>
              </div>
            </div>

            {pricingSuccessMsg && (
              <div className="p-3 bg-emerald-50 text-emerald-800 text-xs font-semibold rounded-lg border border-emerald-200">
                Reseller pricing configuration saved successfully!
              </div>
            )}

            <div className="pt-2">
              <button
                type="submit"
                disabled={savingPricing}
                className="px-5 py-2.5 text-xs font-semibold rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white transition-colors"
              >
                {savingPricing ? 'Saving Settings...' : 'Save Reseller Margins'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
export default AdminResellerManagement;
