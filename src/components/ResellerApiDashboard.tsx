import React, { useState, useEffect } from 'react';
import { 
  Key, 
  Code2, 
  Webhook, 
  Copy, 
  Check, 
  AlertCircle, 
  ShieldCheck, 
  Terminal, 
  RefreshCw, 
  Trash2, 
  Send, 
  Zap, 
  CreditCard, 
  ArrowRight, 
  CheckCircle2, 
  Clock, 
  FileText,
  Activity,
  Layers,
  Lock
} from 'lucide-react';
import { ResellerProfile, ResellerOrder, ResellerApiLog } from '../types';
import db from '../lib/store';

interface ResellerApiDashboardProps {
  onNavigateToFundWallet?: () => void;
}

export const ResellerApiDashboard: React.FC<ResellerApiDashboardProps> = ({ onNavigateToFundWallet }) => {
  const [profile, setProfile] = useState<ResellerProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [orders, setOrders] = useState<ResellerOrder[]>([]);
  const [logs, setLogs] = useState<ResellerApiLog[]>([]);
  
  // Tab within documentation / playground
  const [activeDocTab, setActiveDocTab] = useState<'overview' | 'orders' | 'products' | 'webhooks'>('overview');
  const [codeLang, setCodeLang] = useState<'curl' | 'node' | 'python' | 'php'>('curl');

  // Key Generation State & Modal
  const [generatingKey, setGeneratingKey] = useState(false);
  const [newKeyData, setNewKeyData] = useState<{ key: string; masked: string } | null>(null);
  const [showKeyModal, setShowKeyModal] = useState(false);
  const [copiedKey, setCopiedKey] = useState(false);
  const [copiedSecret, setCopiedSecret] = useState(false);

  // Webhook Configuration State
  const [webhookUrlInput, setWebhookUrlInput] = useState('');
  const [savingWebhook, setSavingWebhook] = useState(false);
  const [testingWebhook, setTestingWebhook] = useState(false);
  const [webhookTestResult, setWebhookTestResult] = useState<{ success: boolean; message: string } | null>(null);

  // Filter state for orders
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  const loadData = async (isManualRefresh = false) => {
    if (isManualRefresh) setRefreshing(true);
    try {
      const res = await db.getResellerProfile();
      if (res.success && res.profile) {
        setProfile(res.profile);
        if (res.profile.webhook_url) {
          setWebhookUrlInput(res.profile.webhook_url);
        }
      }

      const ordersRes = await db.getResellerOrders();
      if (ordersRes.success && ordersRes.orders) {
        setOrders(ordersRes.orders);
      }

      const logsRes = await db.getResellerLogs(25);
      if (logsRes.success && logsRes.logs) {
        setLogs(logsRes.logs);
      }
    } catch (err) {
      console.error('Error loading reseller data:', err);
    } finally {
      setLoading(false);
      if (isManualRefresh) setRefreshing(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleGenerateKey = async () => {
    setGeneratingKey(true);
    try {
      const res = await db.generateResellerApiKey();
      if (res.success && res.apiKey) {
        setNewKeyData({
          key: res.apiKey,
          masked: res.maskedKey || res.apiKey.substring(0, 12) + '...'
        });
        setShowKeyModal(true);
        await loadData();
      } else {
        alert(res.error || 'Failed to generate API Key');
      }
    } catch (err: any) {
      alert(err?.message || 'Error generating key');
    } finally {
      setGeneratingKey(false);
    }
  };

  const handleRevokeKey = async () => {
    if (!window.confirm('Are you sure you want to revoke your live API key? Any active bots, scripts, or apps using it will immediately lose access.')) {
      return;
    }
    try {
      const res = await db.revokeResellerApiKey();
      if (res.success) {
        await loadData();
      } else {
        alert(res.error || 'Failed to revoke API key');
      }
    } catch (err: any) {
      alert(err?.message || 'Error revoking key');
    }
  };

  const handleSaveWebhook = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingWebhook(true);
    setWebhookTestResult(null);
    try {
      const res = await db.updateResellerWebhook(webhookUrlInput.trim() || null);
      if (res.success) {
        await loadData();
        alert('Webhook endpoint configuration updated successfully.');
      } else {
        alert(res.error || 'Failed to update webhook URL');
      }
    } catch (err: any) {
      alert(err?.message || 'Error saving webhook');
    } finally {
      setSavingWebhook(false);
    }
  };

  const handleTestWebhook = async () => {
    setTestingWebhook(true);
    setWebhookTestResult(null);
    try {
      const res = await db.testResellerWebhook();
      if (res.success) {
        setWebhookTestResult({
          success: true,
          message: 'Ping event delivered successfully! Upstream listener responded with 200 OK.'
        });
      } else {
        setWebhookTestResult({
          success: false,
          message: res.error || 'Failed to deliver ping payload to webhook URL.'
        });
      }
      await loadData();
    } catch (err: any) {
      setWebhookTestResult({
        success: false,
        message: err?.message || 'Network error during webhook test'
      });
    } finally {
      setTestingWebhook(false);
    }
  };

  const copyToClipboard = (text: string, type: 'key' | 'secret') => {
    navigator.clipboard.writeText(text);
    if (type === 'key') {
      setCopiedKey(true);
      setTimeout(() => setCopiedKey(false), 2500);
    } else {
      setCopiedSecret(true);
      setTimeout(() => setCopiedSecret(false), 2500);
    }
  };

  const filteredOrders = orders.filter(o => {
    if (selectedCategory === 'all') return true;
    return o.category === selectedCategory;
  });

  const isEligible = (profile?.balance ?? 0) >= (profile?.min_balance_threshold ?? 5000);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] text-gray-500">
        <RefreshCw className="w-8 h-8 animate-spin text-emerald-600 mb-3" />
        <p className="text-sm font-medium">Loading Reseller API configuration...</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-16">
      {/* Header & Quick Action */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-gray-100 pb-5">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Surest Plug Reseller API</h1>
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800">
              v1.0 Live
            </span>
          </div>
          <p className="text-sm text-gray-600">
            Automate social media boosting, aged account purchases, and international virtual numbers via REST API.
          </p>
        </div>

        <button
          onClick={() => loadData(true)}
          disabled={refreshing}
          className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors self-start sm:self-auto"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
          Refresh Stats
        </button>
      </div>

      {/* Strict ₦5,000 Minimum Balance Rule & Eligibility Banner */}
      <div className={`p-5 rounded-xl border ${
        isEligible 
          ? 'bg-emerald-50/70 border-emerald-200' 
          : 'bg-amber-50/90 border-amber-200'
      }`}>
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-start gap-3.5">
            <div className={`p-2.5 rounded-lg shrink-0 ${isEligible ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
              {isEligible ? <ShieldCheck className="w-6 h-6" /> : <AlertCircle className="w-6 h-6" />}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className={`text-base font-semibold ${isEligible ? 'text-emerald-900' : 'text-amber-900'}`}>
                  {isEligible ? 'Reseller Eligibility Verified' : 'Minimum ₦5,000 Wallet Balance Required'}
                </h3>
                <span className={`text-xs px-2 py-0.5 rounded font-medium ${
                  isEligible ? 'bg-emerald-200/80 text-emerald-800' : 'bg-amber-200/80 text-amber-800'
                }`}>
                  {isEligible ? 'Active Status' : 'Action Needed'}
                </span>
              </div>
              <p className={`text-sm mt-1 leading-relaxed ${isEligible ? 'text-emerald-800' : 'text-amber-800'}`}>
                {isEligible ? (
                  <>
                    Your wallet balance is <strong>₦{(profile?.balance || 0).toLocaleString()}</strong> (Minimum threshold: ₦5,000). All automated API requests and order endpoints are fully operational.
                  </>
                ) : (
                  <>
                    To prevent service disruption and qualify for the Reseller API, accounts must maintain a minimum wallet balance of <strong>₦5,000</strong>. Your current balance is <strong>₦{(profile?.balance || 0).toLocaleString()}</strong>.
                  </>
                )}
              </p>
            </div>
          </div>

          {!isEligible && onNavigateToFundWallet && (
            <button
              onClick={onNavigateToFundWallet}
              className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-amber-600 hover:bg-amber-700 text-white text-sm font-semibold rounded-lg shadow-sm transition-colors shrink-0"
            >
              <CreditCard className="w-4 h-4" />
              Fund Wallet Now
            </button>
          )}
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-xl border border-gray-200/80 shadow-xs">
          <div className="flex items-center justify-between text-gray-500 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Wallet Balance</span>
            <CreditCard className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-2xl font-bold text-gray-900">
            ₦{(profile?.balance || 0).toLocaleString()}
          </div>
          <p className="text-xs text-gray-500 mt-1">
            Single wallet architecture (No duplicate balances)
          </p>
        </div>

        <div className="bg-white p-5 rounded-xl border border-gray-200/80 shadow-xs">
          <div className="flex items-center justify-between text-gray-500 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">API Key Status</span>
            <Key className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="flex items-center gap-2">
            <span className={`inline-block w-2.5 h-2.5 rounded-full ${
              profile?.has_api_key ? 'bg-emerald-500' : 'bg-gray-300'
            }`} />
            <div className="text-lg font-bold text-gray-900">
              {profile?.has_api_key ? 'Active Key' : 'No Key Generated'}
            </div>
          </div>
          <p className="text-xs text-gray-500 mt-1 font-mono">
            {profile?.api_key_masked || 'Not configured'}
          </p>
        </div>

        <div className="bg-white p-5 rounded-xl border border-gray-200/80 shadow-xs">
          <div className="flex items-center justify-between text-gray-500 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">API Orders Processed</span>
            <Layers className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-2xl font-bold text-gray-900">
            {(profile?.total_orders || orders.length || 0).toLocaleString()}
          </div>
          <p className="text-xs text-gray-500 mt-1">
            Across SMM, Accounts & Numbers
          </p>
        </div>

        <div className="bg-white p-5 rounded-xl border border-gray-200/80 shadow-xs">
          <div className="flex items-center justify-between text-gray-500 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Webhook Endpoint</span>
            <Webhook className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="flex items-center gap-2">
            <span className={`inline-block w-2.5 h-2.5 rounded-full ${
              profile?.webhook_enabled ? 'bg-emerald-500' : 'bg-gray-300'
            }`} />
            <div className="text-lg font-bold text-gray-900">
              {profile?.webhook_enabled ? 'Configured' : 'Disabled'}
            </div>
          </div>
          <p className="text-xs text-gray-500 mt-1 truncate">
            {profile?.webhook_url ? profile.webhook_url : 'No listener active'}
          </p>
        </div>
      </div>

      {/* Main Sections: Key Management & Webhooks */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* API Credentials Card */}
        <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-emerald-50 rounded-lg text-emerald-700">
                  <Key className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-gray-900">Live API Authentication</h2>
                  <p className="text-xs text-gray-500">Bearer Token with SHA-256 server-side encryption</p>
                </div>
              </div>
            </div>

            {profile?.has_api_key ? (
              <div className="space-y-4">
                <div className="p-3.5 bg-gray-50 rounded-lg border border-gray-200">
                  <div className="text-xs font-medium text-gray-500 mb-1">Active Key (Masked)</div>
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-sm font-semibold text-gray-800">
                      {profile.api_key_masked}
                    </span>
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-emerald-100 text-emerald-800">
                      Live
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 text-xs text-gray-500">
                  <div>
                    <span className="block font-medium text-gray-700">Created:</span>
                    <span>{profile.api_key_created_at ? new Date(profile.api_key_created_at).toLocaleDateString() : 'Recent'}</span>
                  </div>
                  <div>
                    <span className="block font-medium text-gray-700">Last Used:</span>
                    <span>{profile.api_key_last_used_at ? new Date(profile.api_key_last_used_at).toLocaleTimeString() : 'Never'}</span>
                  </div>
                </div>

                <p className="text-xs text-gray-500 leading-relaxed">
                  Pass this key in the <code>Authorization</code> header as <code>Bearer sp_live_...</code> on all HTTP requests.
                </p>
              </div>
            ) : (
              <div className="py-6 text-center space-y-3">
                <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center mx-auto text-gray-400">
                  <Lock className="w-6 h-6" />
                </div>
                <div>
                  <h4 className="text-sm font-semibold text-gray-900">No API Key Generated Yet</h4>
                  <p className="text-xs text-gray-500 max-w-sm mx-auto mt-1">
                    Generate your live secret key to start placing orders programmatically with custom discounts.
                  </p>
                </div>
              </div>
            )}
          </div>

          <div className="pt-5 border-t border-gray-100 mt-6 flex flex-wrap items-center gap-3">
            {profile?.has_api_key ? (
              <>
                <button
                  onClick={handleGenerateKey}
                  disabled={generatingKey || !isEligible}
                  className="px-3.5 py-2 text-xs font-semibold rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white transition-colors disabled:opacity-50"
                >
                  {generatingKey ? 'Generating...' : 'Roll / Regenerate Key'}
                </button>
                <button
                  onClick={handleRevokeKey}
                  className="px-3.5 py-2 text-xs font-semibold rounded-lg bg-white border border-rose-300 text-rose-600 hover:bg-rose-50 transition-colors"
                >
                  Revoke Key
                </button>
              </>
            ) : (
              <button
                onClick={handleGenerateKey}
                disabled={generatingKey || !isEligible}
                className="w-full py-2.5 text-sm font-semibold rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
              >
                <Zap className="w-4 h-4" />
                {generatingKey ? 'Generating...' : 'Generate Live API Key'}
              </button>
            )}
          </div>
        </div>

        {/* Webhooks Configuration Card */}
        <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-purple-50 rounded-lg text-purple-700">
                  <Webhook className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-gray-900">Webhook Notifications</h2>
                  <p className="text-xs text-gray-500">Receive real-time push events signed with HMAC-SHA256</p>
                </div>
              </div>
            </div>

            <form onSubmit={handleSaveWebhook} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Listener URL (HTTP POST)
                </label>
                <input
                  type="url"
                  placeholder="https://yourdomain.com/webhooks/surestplug"
                  value={webhookUrlInput}
                  onChange={(e) => setWebhookUrlInput(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                />
              </div>

              {profile?.webhook_secret && (
                <div className="p-3 bg-gray-50 rounded-lg border border-gray-200">
                  <div className="flex items-center justify-between text-xs text-gray-500 mb-1">
                    <span className="font-medium text-gray-700">Webhook Secret</span>
                    <button
                      type="button"
                      onClick={() => copyToClipboard(profile.webhook_secret!, 'secret')}
                      className="text-emerald-700 hover:underline flex items-center gap-1 font-semibold"
                    >
                      {copiedSecret ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                      {copiedSecret ? 'Copied' : 'Copy Secret'}
                    </button>
                  </div>
                  <div className="font-mono text-xs text-gray-800 break-all select-all">
                    {profile.webhook_secret}
                  </div>
                </div>
              )}

              {webhookTestResult && (
                <div className={`p-3 rounded-lg text-xs ${
                  webhookTestResult.success 
                    ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' 
                    : 'bg-rose-50 text-rose-800 border border-rose-200'
                }`}>
                  {webhookTestResult.message}
                </div>
              )}

              <div className="flex items-center gap-2 pt-2">
                <button
                  type="submit"
                  disabled={savingWebhook}
                  className="px-4 py-2 text-xs font-semibold rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white transition-colors"
                >
                  {savingWebhook ? 'Saving...' : 'Save Endpoint'}
                </button>

                {profile?.webhook_url && (
                  <button
                    type="button"
                    onClick={handleTestWebhook}
                    disabled={testingWebhook}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-lg bg-white border border-gray-300 text-gray-700 hover:bg-gray-50 transition-colors"
                  >
                    <Send className="w-3.5 h-3.5" />
                    {testingWebhook ? 'Sending Ping...' : 'Test Webhook'}
                  </button>
                )}
              </div>
            </form>
          </div>

          <div className="pt-4 border-t border-gray-100 mt-6 text-xs text-gray-500">
            Events sent: <code>order.created</code>, <code>order.completed</code>, <code>order.cancelled</code>. Signature verified via header <code>X-SurestPlug-Signature</code>.
          </div>
        </div>
      </div>

      {/* Interactive API Documentation & Code Playground */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-xs overflow-hidden">
        <div className="border-b border-gray-200 px-6 py-4 bg-gray-50/50 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h3 className="text-base font-bold text-gray-900">API Documentation & Code Examples</h3>
            <p className="text-xs text-gray-500">Production REST API v1 endpoints with live sample requests</p>
          </div>

          {/* Language Selector */}
          <div className="flex items-center gap-1 p-1 bg-gray-200/80 rounded-lg text-xs font-semibold text-gray-600 self-start sm:self-auto">
            {(['curl', 'node', 'python', 'php'] as const).map((lang) => (
              <button
                key={lang}
                onClick={() => setCodeLang(lang)}
                className={`px-3 py-1.5 rounded-md transition-all uppercase ${
                  codeLang === lang 
                    ? 'bg-white text-gray-900 shadow-xs' 
                    : 'hover:text-gray-900'
                }`}
              >
                {lang === 'node' ? 'Node.js' : lang}
              </button>
            ))}
          </div>
        </div>

        {/* Documentation Sub-Tabs */}
        <div className="border-b border-gray-200 px-6 flex items-center gap-6 text-xs font-semibold">
          {[
            { id: 'overview', label: '1. Authentication & Balance' },
            { id: 'products', label: '2. Product Catalog' },
            { id: 'orders', label: '3. Create Order (Idempotent)' },
            { id: 'webhooks', label: '4. Webhooks' }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveDocTab(tab.id as any)}
              className={`py-3 border-b-2 transition-colors ${
                activeDocTab === tab.id
                  ? 'border-emerald-600 text-emerald-700'
                  : 'border-transparent text-gray-500 hover:text-gray-800'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Code Content */}
        <div className="p-6">
          {activeDocTab === 'overview' && (
            <div className="space-y-4">
              <div className="text-xs text-gray-600">
                Verify authentication and inspect your live reseller wallet balance. Send your API key in the standard <code>Authorization: Bearer</code> header.
              </div>

              <div className="relative bg-gray-950 rounded-xl p-4 text-emerald-400 font-mono text-xs overflow-x-auto">
                <pre>{
                  codeLang === 'curl' ? 
`curl -X GET https://surestplug.com/api/v1/balance \\
  -H "Authorization: Bearer ${profile?.api_key_masked || 'sp_live_your_api_key'}"`
                  : codeLang === 'node' ?
`const res = await fetch('https://surestplug.com/api/v1/balance', {
  headers: {
    'Authorization': 'Bearer ${profile?.api_key_masked || 'sp_live_your_api_key'}'
  }
});
const data = await res.json();
console.log(data);`
                  : codeLang === 'python' ?
`import requests

res = requests.get(
    'https://surestplug.com/api/v1/balance',
    headers={'Authorization': 'Bearer ${profile?.api_key_masked || 'sp_live_your_api_key'}'}
)
print(res.json())`
                  :
`<?php
$ch = curl_init('https://surestplug.com/api/v1/balance');
curl_setopt($ch, CURLOPT_HTTPHEADER, [
    'Authorization: Bearer ${profile?.api_key_masked || 'sp_live_your_api_key'}'
]);
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
$response = curl_exec($ch);
curl_close($ch);
echo $response;`
                }</pre>
              </div>

              <div className="p-4 bg-gray-50 rounded-xl border border-gray-200">
                <div className="text-xs font-bold text-gray-700 mb-2">Sample 200 OK Response:</div>
                <pre className="font-mono text-xs text-gray-800 bg-white p-3 rounded-lg border border-gray-200 overflow-x-auto">{
`{
  "success": true,
  "balance": 15000,
  "currency": "NGN",
  "min_required_balance": 5000,
  "is_eligible": true
}`
                }</pre>
              </div>
            </div>
          )}

          {activeDocTab === 'products' && (
            <div className="space-y-4">
              <div className="text-xs text-gray-600">
                Fetch all services and accounts with discounted reseller rates across <strong>smm</strong>, <strong>accounts</strong>, and <strong>numbers</strong>.
              </div>

              <div className="relative bg-gray-950 rounded-xl p-4 text-emerald-400 font-mono text-xs overflow-x-auto">
                <pre>{
                  codeLang === 'curl' ? 
`curl -X GET "https://surestplug.com/api/v1/products?category=smm" \\
  -H "Authorization: Bearer ${profile?.api_key_masked || 'sp_live_your_api_key'}"`
                  : codeLang === 'node' ?
`const res = await fetch('https://surestplug.com/api/v1/products?category=smm', {
  headers: {
    'Authorization': 'Bearer ${profile?.api_key_masked || 'sp_live_your_api_key'}'
  }
});
const { products } = await res.json();`
                  : codeLang === 'python' ?
`import requests

res = requests.get(
    'https://surestplug.com/api/v1/products',
    params={'category': 'smm'},
    headers={'Authorization': 'Bearer ${profile?.api_key_masked || 'sp_live_your_api_key'}'}
)
print(res.json())`
                  :
`<?php
$ch = curl_init('https://surestplug.com/api/v1/products?category=smm');
curl_setopt($ch, CURLOPT_HTTPHEADER, [
    'Authorization: Bearer ${profile?.api_key_masked || 'sp_live_your_api_key'}'
]);
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
$res = curl_exec($ch);
echo $res;`
                }</pre>
              </div>
            </div>
          )}

          {activeDocTab === 'orders' && (
            <div className="space-y-4">
              <div className="text-xs text-gray-600">
                Submit an order. Always pass an <code>Idempotency-Key</code> header to prevent accidental double debits upon network retries.
              </div>

              <div className="relative bg-gray-950 rounded-xl p-4 text-emerald-400 font-mono text-xs overflow-x-auto">
                <pre>{
                  codeLang === 'curl' ? 
`# 1. Social Boosting Order (SMM)
curl -X POST https://surestplug.com/api/v1/orders \\
  -H "Authorization: Bearer ${profile?.api_key_masked || 'sp_live_your_api_key'}" \\
  -H "Idempotency-Key: your_unique_req_id_123" \\
  -H "Content-Type: application/json" \\
  -d '{
    "category": "smm",
    "service_id": 105,
    "link": "https://instagram.com/myaccount",
    "quantity": 500
  }'

# 2. International Virtual Number Order
curl -X POST https://surestplug.com/api/v1/orders \\
  -H "Authorization: Bearer ${profile?.api_key_masked || 'sp_live_your_api_key'}" \\
  -H "Content-Type: application/json" \\
  -d '{
    "category": "numbers",
    "country": "0",
    "service": "wa"
  }'`
                  : codeLang === 'node' ?
`const res = await fetch('https://surestplug.com/api/v1/orders', {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer ${profile?.api_key_masked || 'sp_live_your_api_key'}',
    'Idempotency-Key': 'unique_order_uuid_123',
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    category: 'smm',
    service_id: 105,
    link: 'https://instagram.com/myaccount',
    quantity: 500
  })
});
const result = await res.json();`
                  : codeLang === 'python' ?
`import requests

payload = {
    "category": "smm",
    "service_id": 105,
    "link": "https://instagram.com/myaccount",
    "quantity": 500
}
res = requests.post(
    'https://surestplug.com/api/v1/orders',
    headers={
        'Authorization': 'Bearer ${profile?.api_key_masked || 'sp_live_your_api_key'}',
        'Idempotency-Key': 'unique_key_123'
    },
    json=payload
)
print(res.json())`
                  :
`<?php
$payload = json_encode([
    'category' => 'smm',
    'service_id' => 105,
    'link' => 'https://instagram.com/myaccount',
    'quantity' => 500
]);

$ch = curl_init('https://surestplug.com/api/v1/orders');
curl_setopt($ch, CURLOPT_POST, true);
curl_setopt($ch, CURLOPT_POSTFIELDS, $payload);
curl_setopt($ch, CURLOPT_HTTPHEADER, [
    'Authorization: Bearer ${profile?.api_key_masked || 'sp_live_your_api_key'}',
    'Idempotency-Key: unique_order_ref_123',
    'Content-Type: application/json'
]);
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
$res = curl_exec($ch);
echo $res;`
                }</pre>
              </div>
            </div>
          )}

          {activeDocTab === 'webhooks' && (
            <div className="space-y-4">
              <div className="text-xs text-gray-600">
                All webhook deliveries include an HMAC-SHA256 signature in the <code>X-SurestPlug-Signature</code> header. Verify it using your Webhook Secret.
              </div>

              <div className="relative bg-gray-950 rounded-xl p-4 text-emerald-400 font-mono text-xs overflow-x-auto">
                <pre>{
`// Node.js Webhook Signature Verification Example
const crypto = require('crypto');

app.post('/webhooks/surestplug', (req, res) => {
  const signature = req.headers['x-surestplug-signature'];
  const secret = '${profile?.webhook_secret || 'sp_whsec_your_secret'}';
  
  const expectedSignature = 'sha256=' + crypto
    .createHmac('sha256', secret)
    .update(JSON.stringify(req.body))
    .digest('hex');

  if (signature !== expectedSignature) {
    return res.status(401).send('Invalid signature');
  }

  const { event, data } = req.body;
  console.log('Received event:', event, data);
  res.sendStatus(200);
});`
                }</pre>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Orders Table */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-xs overflow-hidden">
        <div className="p-5 border-b border-gray-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h3 className="text-base font-bold text-gray-900">Reseller API Orders</h3>
            <p className="text-xs text-gray-500">Orders placed through your API key or automated integrations</p>
          </div>

          <div className="flex items-center gap-2">
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="text-xs border border-gray-300 rounded-lg px-2.5 py-1.5 font-medium text-gray-700 bg-white"
            >
              <option value="all">All Categories</option>
              <option value="smm">SMM Boosting</option>
              <option value="accounts">Aged Accounts</option>
              <option value="numbers">Virtual Numbers</option>
            </select>
          </div>
        </div>

        {filteredOrders.length === 0 ? (
          <div className="p-12 text-center text-gray-500">
            <FileText className="w-8 h-8 text-gray-400 mx-auto mb-2" />
            <p className="text-sm font-medium text-gray-700">No API orders found</p>
            <p className="text-xs text-gray-500 mt-1">
              Orders placed via <code>POST /api/v1/orders</code> will be tracked and displayed here in real time.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-gray-50 text-gray-600 font-semibold border-b border-gray-100">
                <tr>
                  <th className="py-3 px-4">Order Reference</th>
                  <th className="py-3 px-4">Category</th>
                  <th className="py-3 px-4">Item Details</th>
                  <th className="py-3 px-4">Amount</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredOrders.map((ord) => (
                  <tr key={ord.id} className="hover:bg-gray-50/50">
                    <td className="py-3 px-4 font-mono font-semibold text-gray-900">
                      {ord.order_reference}
                    </td>
                    <td className="py-3 px-4">
                      <span className="capitalize px-2 py-0.5 rounded bg-gray-100 text-gray-700 font-medium">
                        {ord.category}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-gray-800 max-w-xs truncate">
                      {ord.product_name}
                      {ord.phone_number && (
                        <span className="block font-mono text-emerald-700 text-[11px]">
                          📞 {ord.phone_number} {ord.sms_code ? `(OTP: ${ord.sms_code})` : ''}
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4 font-semibold text-gray-900">
                      ₦{ord.amount.toLocaleString()}
                    </td>
                    <td className="py-3 px-4">
                      <span className={`px-2 py-0.5 rounded text-[11px] font-semibold ${
                        ord.status === 'completed'
                          ? 'bg-emerald-100 text-emerald-800'
                          : ord.status === 'processing'
                          ? 'bg-blue-100 text-blue-800'
                          : ord.status === 'cancelled'
                          ? 'bg-amber-100 text-amber-800'
                          : 'bg-gray-100 text-gray-700'
                      }`}>
                        {ord.status}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-gray-500">
                      {new Date(ord.created_at).toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Live Request Activity Logs */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-xs overflow-hidden">
        <div className="p-5 border-b border-gray-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Activity className="w-4 h-4 text-emerald-600" />
            <h3 className="text-base font-bold text-gray-900">Recent API Audit & Telemetry</h3>
          </div>
          <span className="text-xs text-gray-500 font-medium">Last 25 requests</span>
        </div>

        {logs.length === 0 ? (
          <div className="p-8 text-center text-gray-500 text-xs">
            No API activity recorded yet. Calls made to <code>/api/v1/*</code> with your Bearer token will appear here.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-gray-50 text-gray-600 font-semibold border-b border-gray-100">
                <tr>
                  <th className="py-2.5 px-4">Method</th>
                  <th className="py-2.5 px-4">Path</th>
                  <th className="py-2.5 px-4">Status</th>
                  <th className="py-2.5 px-4">Latency</th>
                  <th className="py-2.5 px-4">IP</th>
                  <th className="py-2.5 px-4">Timestamp</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 font-mono text-[11px]">
                {logs.map((log) => (
                  <tr key={log.id} className="hover:bg-gray-50/50">
                    <td className="py-2.5 px-4">
                      <span className={`px-2 py-0.5 rounded font-bold ${
                        log.method === 'GET' ? 'bg-blue-50 text-blue-700' :
                        log.method === 'POST' ? 'bg-emerald-50 text-emerald-700' :
                        'bg-gray-100 text-gray-700'
                      }`}>
                        {log.method}
                      </span>
                    </td>
                    <td className="py-2.5 px-4 text-gray-900 font-semibold">
                      {log.path}
                    </td>
                    <td className="py-2.5 px-4">
                      <span className={`px-2 py-0.5 rounded font-semibold ${
                        log.status_code >= 200 && log.status_code < 300 ? 'bg-emerald-100 text-emerald-800' :
                        log.status_code >= 400 && log.status_code < 500 ? 'bg-amber-100 text-amber-800' :
                        'bg-rose-100 text-rose-800'
                      }`}>
                        {log.status_code}
                      </span>
                    </td>
                    <td className="py-2.5 px-4 text-gray-600">
                      {log.latency_ms}ms
                    </td>
                    <td className="py-2.5 px-4 text-gray-500">
                      {log.ip}
                    </td>
                    <td className="py-2.5 px-4 text-gray-400 font-sans text-xs">
                      {new Date(log.created_at).toLocaleTimeString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Secret API Key One-Time Display Modal */}
      {showKeyModal && newKeyData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-950/70 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-gray-200">
            <div className="flex items-center gap-3 text-emerald-700 mb-3">
              <div className="p-2.5 bg-emerald-100 rounded-full">
                <Key className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-gray-900">Your Live API Key</h3>
                <p className="text-xs text-gray-500">Generated successfully</p>
              </div>
            </div>

            <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl my-4 text-xs text-amber-900">
              <div className="flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <p className="font-semibold leading-relaxed">
                  Make sure to copy your API key now. For your security, this key is hashed with SHA-256 and will NEVER be shown to you again.
                </p>
              </div>
            </div>

            <div className="p-3 bg-gray-900 rounded-xl flex items-center justify-between gap-3 text-white font-mono text-xs select-all break-all my-4">
              <span className="text-emerald-400 font-semibold">{newKeyData.key}</span>
              <button
                onClick={() => copyToClipboard(newKeyData.key, 'key')}
                className="shrink-0 p-2 bg-gray-800 hover:bg-gray-700 text-gray-200 rounded-lg transition-colors flex items-center gap-1.5 text-xs font-sans"
              >
                {copiedKey ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                {copiedKey ? 'Copied' : 'Copy'}
              </button>
            </div>

            <div className="flex justify-end pt-3">
              <button
                onClick={() => setShowKeyModal(false)}
                className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-lg transition-colors"
              >
                I Have Saved My Key Securely
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
export default ResellerApiDashboard;
