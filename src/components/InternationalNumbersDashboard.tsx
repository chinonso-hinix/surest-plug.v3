import React, { useState, useEffect, useMemo } from 'react';
import { Order } from '../types';
import { 
  Globe, 
  Smartphone, 
  RefreshCw, 
  CheckCircle, 
  AlertCircle, 
  DollarSign, 
  Settings, 
  ExternalLink,
  Search,
  Clock,
  Tag,
  CheckCircle2,
  AlertTriangle,
  Copy,
  Check
} from 'lucide-react';

interface InternationalNumbersDashboardProps {
  orders: Order[];
  onNavigate: (route: string, params?: any) => void;
}

interface CountryOption {
  id: string;
  name: string;
  code?: string;
  flag?: string;
  prefix?: string;
}

interface ServiceOption {
  id: string;
  name: string;
  category?: string;
}

export const InternationalNumbersDashboard: React.FC<InternationalNumbersDashboardProps> = ({
  orders,
  onNavigate
}) => {
  const [balanceInfo, setBalanceInfo] = useState<{
    balance_usd: number;
    balance_ngn: number;
    balanceUsd?: number;
    balanceNgn?: number;
    exchangeRate?: number;
    rate: number;
    currency?: string;
    wallets?: { usd: number; ngn: number };
  } | null>(null);
  const [balanceError, setBalanceError] = useState<string | null>(null);
  const [balanceLastUpdated, setBalanceLastUpdated] = useState<Date | null>(null);
  const [loadingBalance, setLoadingBalance] = useState(false);
  const [pricingConfig, setPricingConfig] = useState<{ usd_to_ngn_rate: number; markup_below_1000_ngn: number; markup_1000_and_above_ngn: number }>({
    usd_to_ngn_rate: 1600,
    markup_below_1000_ngn: 1000,
    markup_1000_and_above_ngn: 2000
  });
  const [savingConfig, setSavingConfig] = useState(false);
  const [configMessage, setConfigMessage] = useState<string | null>(null);

  // Dynamic verification tool state (dynamic selection, not hardcoded)
  const [countries, setCountries] = useState<CountryOption[]>([]);
  const [loadingCountries, setLoadingCountries] = useState(false);
  const [selectedCountryId, setSelectedCountryId] = useState<string>('1');
  const [countrySearch, setCountrySearch] = useState('');

  const [services, setServices] = useState<ServiceOption[]>([]);
  const [loadingServices, setLoadingServices] = useState(false);
  const [selectedServiceId, setSelectedServiceId] = useState<string>('');
  const [serviceSearch, setServiceSearch] = useState('');

  const [customCountryId, setCustomCountryId] = useState('');
  const [customServiceId, setCustomServiceId] = useState('');

  const [testResult, setTestResult] = useState<{
    countryName: string;
    countryId: string;
    serviceName: string;
    serviceId: string;
    stock: number;
    price: number;
    status: string;
    error?: string;
    checkedAt: string;
    raw?: any;
  } | null>(null);
  const [testing, setTesting] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const handleCopy = (text: string, id: string) => {
    if (!text) return;
    navigator.clipboard?.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  // Filter number orders
  const numberOrders = orders.filter(
    o => o.category === 'numbers' || o.product_name?.toLowerCase().includes('number') || (o.customer_details as any)?.provider === 'instantnums'
  );

  const fetchBalance = async () => {
    setLoadingBalance(true);
    setBalanceError(null);
    try {
  const res = await fetch('/api/international-numbers/balance');
  const data = await res.json();

const balance = data.data ?? data;

if (data.success && typeof balance.balance_usd !== 'undefined') {
  setBalanceInfo({
    balance_usd: Number(balance.balance_usd) || 0,
    balance_ngn: Number(balance.balance_ngn) || 0,
    balanceUsd: Number(balance.balanceUsd ?? balance.balance_usd) || 0,
    balanceNgn: Number(balance.balanceNgn ?? balance.balance_ngn) || 0,
    exchangeRate: Number(balance.exchangeRate ?? balance.rate ?? 1600),
    rate: Number(balance.rate ?? balance.exchangeRate ?? 1600),
    currency: balance.currency || 'USD',
    wallets: balance.wallets
  });
fetch('/api/auth.php?action=login', {
  method: 'POST',
  credentials: 'include',
  headers: {'Content-Type': 'application/json'},
  body: JSON.stringify({
    email: 'test@example.com',
    password: 'wrong-password'
  })
}).then(async r => console.log(r.status, await r.text()))
  setBalanceLastUpdated(new Date());
} else {
  setBalanceInfo(null);
  setBalanceError(
    data.error || balance?.error || 'Unable to retrieve live InstantNums balance'
  );
}
} catch (e: any) {
  setBalanceInfo(null);
  setBalanceError(e?.message || 'Unable to retrieve live InstantNums balance');
} finally {
  setLoadingBalance(false);
    }
  };

  const fetchPricingConfig = async () => {
    try {
      const res = await fetch('/api/international-numbers/admin/pricing-config');
      const data = await res.json();
      if (data.success && data.data) {
        setPricingConfig(data.data);
      }
    } catch {
      // Ignore
    }
  };

  const fetchCountries = async () => {
    setLoadingCountries(true);
    try {
      const res = await fetch('/api/international-numbers/countries');
      const data = await res.json();
      if (data.success && Array.isArray(data.countries) && data.countries.length > 0) {
        setCountries(data.countries);
        if (!selectedCountryId) {
          setSelectedCountryId(data.countries[0].id);
        }
      } else {
        // Fallback standard countries
        setCountries([
          { id: '1', name: 'USA', flag: '🇺🇸', prefix: '+1', code: 'US' },
          { id: '2', name: 'United Kingdom (UK)', flag: '🇬🇧', prefix: '+44', code: 'GB' },
          { id: '3', name: 'Netherlands', flag: '🇳🇱', prefix: '+31', code: 'NL' },
          { id: '14', name: 'Nigeria', flag: '🇳🇬', prefix: '+234', code: 'NG' },
          { id: '15', name: 'India', flag: '🇮🇳', prefix: '+91', code: 'IN' },
          { id: '16', name: 'Kenya', flag: '🇰🇪', prefix: '+254', code: 'KE' },
          { id: '23', name: 'France', flag: '🇫🇷', prefix: '+33', code: 'FR' },
          { id: '24', name: 'Germany', flag: '🇩🇪', prefix: '+49', code: 'DE' },
          { id: '36', name: 'Canada', flag: '🇨🇦', prefix: '+1', code: 'CA' },
          { id: '42', name: 'Ghana', flag: '🇬🇭', prefix: '+233', code: 'GH' },
          { id: '68', name: 'Brazil', flag: '🇧🇷', prefix: '+55', code: 'BR' }
        ]);
      }
    } catch {
      // Fallback
      setCountries([
        { id: '1', name: 'USA', flag: '🇺🇸', prefix: '+1', code: 'US' },
        { id: '2', name: 'United Kingdom (UK)', flag: '🇬🇧', prefix: '+44', code: 'GB' },
        { id: '16', name: 'Kenya', flag: '🇰🇪', prefix: '+254', code: 'KE' }
      ]);
    } finally {
      setLoadingCountries(false);
    }
  };

  const fetchServicesForCountry = async (countryId: string) => {
    setLoadingServices(true);
    try {
      const res = await fetch(`/api/international-numbers/services?country=${encodeURIComponent(countryId)}`);
      const data = await res.json();
      if (data.success && Array.isArray(data.services) && data.services.length > 0) {
        setServices(data.services);
        // If current service isn't in list, select first
        if (!data.services.some((s: ServiceOption) => s.id === selectedServiceId)) {
          setSelectedServiceId(data.services[0].id);
        }
      } else {
        const fallback = [
          { id: '900', name: 'WhatsApp' },
          { id: '901', name: 'Telegram' },
          { id: '924', name: 'TikTok/Douyin' },
          { id: '902', name: 'Google/Gmail' },
          { id: '904', name: 'Facebook' },
          { id: '905', name: 'Instagram' },
          { id: '907', name: 'Twitter / X' }
        ];
        setServices(fallback);
      }
    } catch {
      setServices([
        { id: '900', name: 'WhatsApp' },
        { id: '901', name: 'Telegram' },
        { id: '924', name: 'TikTok/Douyin' }
      ]);
    } finally {
      setLoadingServices(false);
    }
  };

  // Trigger service refresh whenever country changes
  useEffect(() => {
    if (selectedCountryId) {
      fetchServicesForCountry(selectedCountryId);
    }
  }, [selectedCountryId]);

  const handleSavePricingConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingConfig(true);
    setConfigMessage(null);
    try {
      const res = await fetch('/api/international-numbers/admin/pricing-config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(pricingConfig)
      });
      const data = await res.json();
      if (data.success) {
        setConfigMessage('Pricing config updated successfully!');
      } else {
        setConfigMessage(data.error || 'Failed to update config.');
      }
    } catch (err: any) {
      setConfigMessage(err.message || 'Error updating config.');
    } finally {
      setSavingConfig(false);
    }
  };

  const handleRunTest = async () => {
    const finalCountryId = customCountryId.trim() || selectedCountryId;
    const finalServiceId = customServiceId.trim() || selectedServiceId;

    if (!finalCountryId || !finalServiceId) return;

    setTesting(true);
    setTestResult(null);

    const countryObj = countries.find(c => c.id === finalCountryId);
    const serviceObj = services.find(s => s.id === finalServiceId);

    const countryLabel = countryObj ? `${countryObj.flag || ''} ${countryObj.name}`.trim() : `Country ID ${finalCountryId}`;
    const serviceLabel = serviceObj ? serviceObj.name : `Service ID ${finalServiceId}`;

    try {
      const res = await fetch(
        `/api/international-numbers/availability?country=${encodeURIComponent(finalCountryId)}&service=${encodeURIComponent(finalServiceId)}`
      );
      const data = await res.json();

      const checkedAt = new Date().toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
      });

      let status = 'OUT_OF_STOCK';
      if (data.available && Number(data.stock) > 0) {
        status = 'AVAILABLE';
      } else if (data.status) {
        status = data.status;
      } else if (!data.success) {
        status = 'API_ERROR';
      }

      setTestResult({
        countryName: countryLabel,
        countryId: finalCountryId,
        serviceName: serviceLabel,
        serviceId: finalServiceId,
        stock: Number(data.stock || 0),
        price: Number(data.price || 0),
        status,
        error: data.error,
        checkedAt,
        raw: data
      });
    } catch (err: any) {
      setTestResult({
        countryName: countryLabel,
        countryId: finalCountryId,
        serviceName: serviceLabel,
        serviceId: finalServiceId,
        stock: 0,
        price: 0,
        status: 'API_ERROR',
        error: err.message || 'Network error verifying availability.',
        checkedAt: new Date().toLocaleTimeString(),
        raw: null
      });
    } finally {
      setTesting(false);
    }
  };

  useEffect(() => {
    fetchBalance();
    fetchPricingConfig();
    fetchCountries();
  }, []);

  // Filtered lists for selectors
  const filteredCountries = useMemo(() => {
    const q = countrySearch.toLowerCase().trim();
    if (!q) return countries;
    return countries.filter(c => 
      c.name.toLowerCase().includes(q) || 
      c.id.includes(q) || 
      (c.code && c.code.toLowerCase().includes(q)) ||
      (c.prefix && c.prefix.includes(q))
    );
  }, [countries, countrySearch]);

  const filteredServices = useMemo(() => {
    const q = serviceSearch.toLowerCase().trim();
    if (!q) return services;
    return services.filter(s => 
      s.name.toLowerCase().includes(q) || 
      s.id.includes(q) ||
      (s.category && s.category.toLowerCase().includes(q))
    );
  }, [services, serviceSearch]);

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 text-white shadow-xl">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-blue-400">
              <Smartphone className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl font-black">International Numbers Provider</h2>
              <p className="text-xs text-slate-400">Unified SMS activation service with real-time stock & pricing</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={fetchBalance}
              disabled={loadingBalance}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold rounded-xl transition-all cursor-pointer flex items-center gap-2"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loadingBalance ? 'animate-spin' : ''}`} />
              <span>Refresh Balance</span>
            </button>
            <button
              onClick={() => onNavigate('numbers')}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-xl transition-all cursor-pointer flex items-center gap-2"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span>Customer View</span>
            </button>
          </div>
        </div>

        {/* Error Notification */}
        {balanceError && (
          <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-2xl text-xs text-red-400 flex items-start gap-2.5 mt-4">
            <span className="text-red-400 font-bold">⚠️</span>
            <div className="flex-1">
              <div className="font-semibold text-red-300">Unable to retrieve live InstantNums balance</div>
              <div className="text-slate-400 text-[11px] mt-0.5">{balanceError}</div>
            </div>
          </div>
        )}

        {/* Live Balance Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-6">
          <div className="bg-slate-950/70 border border-slate-800/80 rounded-2xl p-4">
            <div className="flex items-center justify-between">
              <div className="text-[11px] text-slate-400 font-bold uppercase tracking-wider">Provider USD Balance</div>
              {balanceLastUpdated && (
                <span className="text-[10px] text-slate-500">{balanceLastUpdated.toLocaleTimeString()}</span>
              )}
            </div>
            <div className="text-2xl font-black text-emerald-400 mt-1">
              ${balanceInfo ? (balanceInfo.balanceUsd ?? balanceInfo.balance_usd).toFixed(2) : '---'}
            </div>
            <div className="text-[10px] text-slate-400 mt-0.5">Wholesale supplier balance</div>
          </div>
          <div className="bg-slate-950/70 border border-slate-800/80 rounded-2xl p-4">
            <div className="text-[11px] text-slate-400 font-bold uppercase tracking-wider">Equivalent NGN Value</div>
            <div className="text-2xl font-black text-white mt-1">
              ₦{balanceInfo ? (balanceInfo.balanceNgn ?? balanceInfo.balance_ngn).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '---'}
            </div>
            <div className="text-[10px] text-slate-400 mt-0.5">
              At ₦{(balanceInfo?.exchangeRate ?? balanceInfo?.rate ?? pricingConfig.usd_to_ngn_rate).toLocaleString()}/USD
            </div>
          </div>
          <div className="bg-slate-950/70 border border-slate-800/80 rounded-2xl p-4">
            <div className="text-[11px] text-slate-400 font-bold uppercase tracking-wider">Total Number Orders</div>
            <div className="text-2xl font-black text-blue-400 mt-1">
              {numberOrders.length}
            </div>
            <div className="text-[10px] text-slate-400 mt-0.5">All customer activations</div>
          </div>
        </div>
      </div>

      {/* Pricing Configuration & Stock Tester */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Pricing Config */}
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 text-white shadow-xl">
          <div className="flex items-center gap-2 mb-4">
            <Settings className="w-5 h-5 text-blue-400" />
            <h3 className="font-black text-base">Exchange Rate & Tiered Markup</h3>
          </div>
          <form onSubmit={handleSavePricingConfig} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-400 mb-1">USD to NGN Exchange Rate</label>
              <input
                type="number"
                value={pricingConfig.usd_to_ngn_rate}
                onChange={e => setPricingConfig({ ...pricingConfig, usd_to_ngn_rate: Number(e.target.value) })}
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white font-mono"
                required
              />
              <p className="text-[10px] text-slate-400 mt-1">Wholesale USD cost is converted to NGN at this rate.</p>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-400 mb-1">Tier 1 Markup (Wholesale &lt; ₦1,000)</label>
              <input
                type="number"
                value={pricingConfig.markup_below_1000_ngn}
                onChange={e => setPricingConfig({ ...pricingConfig, markup_below_1000_ngn: Number(e.target.value) })}
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white font-mono"
                required
              />
              <p className="text-[10px] text-slate-400 mt-1">Added profit when supplier price is below ₦1,000 (Default: ₦1,000).</p>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-400 mb-1">Tier 2 Markup (Wholesale &ge; ₦1,000)</label>
              <input
                type="number"
                value={pricingConfig.markup_1000_and_above_ngn}
                onChange={e => setPricingConfig({ ...pricingConfig, markup_1000_and_above_ngn: Number(e.target.value) })}
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white font-mono"
                required
              />
              <p className="text-[10px] text-slate-400 mt-1">Added profit when supplier price is ₦1,000 or above (Default: ₦2,000).</p>
            </div>

            {configMessage && (
              <div className="p-3 bg-blue-950/60 border border-blue-800 rounded-xl text-xs text-blue-200">
                {configMessage}
              </div>
            )}

            <button
              type="submit"
              disabled={savingConfig}
              className="w-full py-2.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-xl transition-all cursor-pointer flex items-center justify-center gap-2"
            >
              {savingConfig ? 'Saving...' : 'Save Pricing Settings'}
            </button>
          </form>
        </div>

        {/* Live Availability Tester */}
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 text-white shadow-xl flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Globe className="w-5 h-5 text-emerald-400" />
                <h3 className="font-black text-base">Live Stock & Pricing Verification</h3>
              </div>
              <span className="text-[10px] bg-slate-800 text-slate-400 px-2.5 py-1 rounded-full font-bold">
                Dynamic Diagnostic
              </span>
            </div>
            <p className="text-xs text-slate-400 mb-5">
              Directly query the international numbers engine for any country and service. Services refresh dynamically when country is switched.
            </p>

            {/* Country Selector with Search */}
            <div className="space-y-3 mb-4">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-[11px] font-bold text-slate-400">1. Select Country</label>
                  <span className="text-[10px] text-slate-500 font-mono">
                    {loadingCountries ? 'Loading countries...' : `${countries.length} supported`}
                  </span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <div className="relative">
                    <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-2.5" />
                    <input
                      type="text"
                      value={countrySearch}
                      onChange={e => setCountrySearch(e.target.value)}
                      placeholder="Filter country..."
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-8 pr-3 py-2 text-xs text-white placeholder:text-slate-600 focus:border-blue-500 outline-none"
                    />
                  </div>
                  <select
                    value={selectedCountryId}
                    onChange={e => {
                      setSelectedCountryId(e.target.value);
                      setCustomCountryId('');
                    }}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:border-blue-500 outline-none"
                  >
                    {filteredCountries.map(c => (
                      <option key={c.id} value={c.id}>
                        {c.flag ? `${c.flag} ` : ''}{c.name} {c.prefix ? `(${c.prefix})` : ''} [ID: {c.id}]
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Service Selector with Search */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-[11px] font-bold text-slate-400">2. Select App / Service</label>
                  <span className="text-[10px] text-slate-500 font-mono">
                    {loadingServices ? 'Fetching services...' : `${services.length} services loaded`}
                  </span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <div className="relative">
                    <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-2.5" />
                    <input
                      type="text"
                      value={serviceSearch}
                      onChange={e => setServiceSearch(e.target.value)}
                      placeholder="Filter app (WhatsApp, TikTok...)"
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-8 pr-3 py-2 text-xs text-white placeholder:text-slate-600 focus:border-blue-500 outline-none"
                    />
                  </div>
                  <select
                    value={selectedServiceId}
                    onChange={e => {
                      setSelectedServiceId(e.target.value);
                      setCustomServiceId('');
                    }}
                    disabled={loadingServices}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:border-blue-500 outline-none disabled:opacity-50"
                  >
                    {filteredServices.map(s => (
                      <option key={s.id} value={s.id}>
                        {s.name} [ID: {s.id}]
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Advanced Custom Override (Optional for testing arbitrary provider IDs) */}
              <details className="text-[11px] text-slate-400">
                <summary className="cursor-pointer text-slate-500 hover:text-slate-300 font-medium select-none">
                  Manual ID Overrides (Optional)
                </summary>
                <div className="grid grid-cols-2 gap-2 mt-2 pt-2 border-t border-slate-800/60">
                  <div>
                    <label className="block text-[10px] text-slate-500 mb-0.5">Raw Country ID</label>
                    <input
                      type="text"
                      value={customCountryId}
                      onChange={e => setCustomCountryId(e.target.value)}
                      placeholder={`Default: ${selectedCountryId}`}
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-white placeholder:text-slate-600"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] text-slate-500 mb-0.5">Raw Service ID</label>
                    <input
                      type="text"
                      value={customServiceId}
                      onChange={e => setCustomServiceId(e.target.value)}
                      placeholder={`Default: ${selectedServiceId}`}
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-white placeholder:text-slate-600"
                    />
                  </div>
                </div>
              </details>
            </div>

            {/* Test Button */}
            <button
              type="button"
              onClick={handleRunTest}
              disabled={testing || loadingServices || loadingCountries}
              className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-800 disabled:text-slate-600 text-white text-xs font-bold rounded-xl transition-all cursor-pointer flex items-center justify-center gap-2 mb-4 shadow-lg shadow-emerald-950/40"
            >
              {testing ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  <span>Querying Live Availability...</span>
                </>
              ) : (
                <>
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>
                    Test Availability
                    {(() => {
                      const activeC = countries.find(c => c.id === (customCountryId || selectedCountryId));
                      const activeS = services.find(s => s.id === (customServiceId || selectedServiceId));
                      return activeC && activeS ? ` (${activeC.name} + ${activeS.name})` : '';
                    })()}
                  </span>
                </>
              )}
            </button>

            {/* Verification Results Card */}
            {testResult && (
              <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 font-mono text-xs space-y-2.5">
                <div className="flex items-center justify-between pb-2 border-b border-slate-800/80">
                  <span className="text-slate-400 flex items-center gap-1">
                    <Globe className="w-3.5 h-3.5 text-blue-400" />
                    <span>Country:</span>
                  </span>
                  <span className="text-white font-bold">{testResult.countryName}</span>
                </div>

                <div className="flex items-center justify-between pb-2 border-b border-slate-800/80">
                  <span className="text-slate-400 flex items-center gap-1">
                    <Smartphone className="w-3.5 h-3.5 text-blue-400" />
                    <span>Service:</span>
                  </span>
                  <span className="text-white font-bold">{testResult.serviceName}</span>
                </div>

                <div className="flex items-center justify-between pb-2 border-b border-slate-800/80">
                  <span className="text-slate-400 flex items-center gap-1">
                    <Tag className="w-3.5 h-3.5 text-blue-400" />
                    <span>Service ID:</span>
                  </span>
                  <span className="text-slate-300 font-bold">{testResult.serviceId}</span>
                </div>

                <div className="flex items-center justify-between pb-2 border-b border-slate-800/80">
                  <span className="text-slate-400">Live Stock:</span>
                  <span className={`font-bold ${testResult.stock > 0 ? 'text-emerald-400' : 'text-amber-400'}`}>
                    {testResult.stock.toLocaleString()} lines available
                  </span>
                </div>

                <div className="flex items-center justify-between pb-2 border-b border-slate-800/80">
                  <span className="text-slate-400">Current Customer Price:</span>
                  <span className="text-emerald-400 font-bold">₦{testResult.price.toLocaleString()}</span>
                </div>

                <div className="flex items-center justify-between pb-2 border-b border-slate-800/80">
                  <span className="text-slate-400">Provider Response Status:</span>
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                    testResult.status === 'AVAILABLE'
                      ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                      : testResult.status === 'OUT_OF_STOCK'
                      ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                      : testResult.status === 'PROVIDER_INSUFFICIENT_BALANCE'
                      ? 'bg-purple-500/20 text-purple-400 border border-purple-500/30'
                      : 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                  }`}>
                    {testResult.status}
                  </span>
                </div>

                <div className="flex items-center justify-between text-[11px] pt-0.5 text-slate-500">
                  <span className="flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    <span>Last Checked Time:</span>
                  </span>
                  <span>{testResult.checkedAt}</span>
                </div>

                {testResult.error && (
                  <div className="text-[11px] text-amber-400 bg-amber-950/40 p-2.5 rounded-xl border border-amber-800/60 mt-2">
                    <span className="font-bold">Provider Note: </span>
                    {testResult.error}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Recent Orders Section (Responsive Cards for Mobile, Full Table for Tablet/Desktop) */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-4 sm:p-6 text-white shadow-xl">
        <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
          <div>
            <h3 className="font-black text-base">Recent International Number Orders</h3>
            <p className="text-xs text-slate-400">Live SMS verifications, phone assignments and status logs</p>
          </div>
          <span className="text-xs font-bold text-blue-400 bg-blue-950/80 px-2.5 py-1 rounded-full border border-blue-800/60">
            {numberOrders.length} {numberOrders.length === 1 ? 'Order' : 'Orders'}
          </span>
        </div>

        {numberOrders.length === 0 ? (
          <div className="p-8 text-center text-slate-400 text-xs">
            No international number orders recorded yet.
          </div>
        ) : (
          <>
            {/* MOBILE VIEW: Clean Vertical Cards (fits 320px+ viewports without horizontal scroll) */}
            <div className="block md:hidden space-y-3">
              {numberOrders.slice(0, 20).map((ord) => {
                const details = (ord.customer_details as any) || {};
                const phoneNumber = details.phone_number || details.number || '—';
                const code = details.verification_code || details.sms_code || '—';
                const isCodeValid = code && code !== '—' && code !== 'null' && code !== 'undefined';

                return (
                  <div
                    key={`mob-num-ord-${ord.id}`}
                    className="bg-slate-950/90 border border-slate-800/90 rounded-2xl p-4 shadow-sm space-y-3"
                  >
                    {/* Card Header: Product & Status */}
                    <div className="flex items-start justify-between gap-2 border-b border-slate-800/70 pb-2.5">
                      <div>
                        <span className="text-[10px] font-bold text-blue-400 uppercase tracking-wider block">
                          Service
                        </span>
                        <h4 className="font-bold text-white text-sm leading-snug">
                          {ord.product_name}
                        </h4>
                      </div>
                      <span
                        className={`px-2.5 py-1 rounded-full text-[10px] font-extrabold uppercase shrink-0 ${
                          ord.status === 'completed'
                            ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                            : ord.status === 'cancelled'
                            ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                            : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                        }`}
                      >
                        {ord.status}
                      </span>
                    </div>

                    {/* Card Key-Value Details */}
                    <div className="space-y-2 text-xs">
                      {/* Reference */}
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-slate-400 text-[11px]">Reference</span>
                        <div className="flex items-center gap-1.5 font-mono font-bold text-blue-400 text-xs">
                          <span>{ord.order_reference}</span>
                          <button
                            onClick={() => handleCopy(ord.order_reference, `ref-${ord.id}`)}
                            className="p-1 hover:bg-slate-800 rounded text-slate-400 hover:text-white transition-colors cursor-pointer"
                            title="Copy reference"
                          >
                            {copiedId === `ref-${ord.id}` ? (
                              <Check className="w-3 h-3 text-emerald-400" />
                            ) : (
                              <Copy className="w-3 h-3" />
                            )}
                          </button>
                        </div>
                      </div>

                      {/* User */}
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-slate-400 text-[11px]">User</span>
                        <span className="font-medium text-slate-200 truncate max-w-[200px] text-right">
                          {ord.user_email || ord.user_name}
                        </span>
                      </div>

                      {/* Phone */}
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-slate-400 text-[11px]">Phone</span>
                        <div className="flex items-center gap-1.5 font-mono text-slate-200">
                          <span>{phoneNumber}</span>
                          {phoneNumber !== '—' && (
                            <button
                              onClick={() => handleCopy(phoneNumber, `phone-${ord.id}`)}
                              className="p-1 hover:bg-slate-800 rounded text-slate-400 hover:text-white transition-colors cursor-pointer"
                              title="Copy phone"
                            >
                              {copiedId === `phone-${ord.id}` ? (
                                <Check className="w-3 h-3 text-emerald-400" />
                              ) : (
                                <Copy className="w-3 h-3" />
                              )}
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Price */}
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-slate-400 text-[11px]">Price</span>
                        <span className="font-bold text-emerald-400 text-sm font-mono">
                          ₦{ord.amount.toLocaleString()}
                        </span>
                      </div>

                      {/* Code */}
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-slate-400 text-[11px]">Code</span>
                        {isCodeValid ? (
                          <div className="flex items-center gap-1.5">
                            <span className="px-2 py-0.5 bg-emerald-950/80 text-emerald-300 border border-emerald-700/50 rounded font-mono font-bold text-xs">
                              {code}
                            </span>
                            <button
                              onClick={() => handleCopy(code, `code-${ord.id}`)}
                              className="p-1 hover:bg-slate-800 rounded text-slate-400 hover:text-white transition-colors cursor-pointer"
                              title="Copy OTP code"
                            >
                              {copiedId === `code-${ord.id}` ? (
                                <Check className="w-3 h-3 text-emerald-400" />
                              ) : (
                                <Copy className="w-3 h-3" />
                              )}
                            </button>
                          </div>
                        ) : (
                          <span className="text-slate-500 font-mono">—</span>
                        )}
                      </div>

                      {/* Date */}
                      <div className="flex items-center justify-between gap-2 pt-1 border-t border-slate-800/60 text-slate-400 text-[11px]">
                        <span>Date</span>
                        <span>{new Date(ord.created_at).toLocaleString()}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* TABLET / DESKTOP VIEW: Clean Non-Breaking Table */}
            <div className="hidden md:block overflow-x-auto table-responsive rounded-2xl border border-slate-800/80">
              <table className="w-full text-xs text-left border-collapse min-w-[760px]">
                <thead className="bg-slate-950/80 text-slate-400 font-bold uppercase text-[10px] tracking-wider border-b border-slate-800">
                  <tr>
                    <th className="p-3.5 pl-4 whitespace-nowrap">Reference</th>
                    <th className="p-3.5 whitespace-nowrap">User</th>
                    <th className="p-3.5 whitespace-nowrap">Product / Phone</th>
                    <th className="p-3.5 whitespace-nowrap">Price</th>
                    <th className="p-3.5 whitespace-nowrap">Status</th>
                    <th className="p-3.5 whitespace-nowrap">Code</th>
                    <th className="p-3.5 pr-4 whitespace-nowrap">Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {numberOrders.slice(0, 20).map((ord) => {
                    const details = (ord.customer_details as any) || {};
                    const phoneNumber = details.phone_number || details.number;
                    const code = details.verification_code || details.sms_code;
                    const isCodeValid = code && code !== '---' && code !== 'null';

                    return (
                      <tr key={ord.id} className="hover:bg-slate-800/40 transition-colors">
                        <td className="p-3.5 pl-4 whitespace-nowrap">
                          <div className="flex items-center gap-1.5 font-mono font-bold text-blue-400">
                            <span>{ord.order_reference}</span>
                            <button
                              onClick={() => handleCopy(ord.order_reference, `tbl-ref-${ord.id}`)}
                              className="p-1 hover:bg-slate-800 rounded text-slate-500 hover:text-slate-300 transition-colors cursor-pointer"
                              title="Copy reference"
                            >
                              {copiedId === `tbl-ref-${ord.id}` ? (
                                <Check className="w-3 h-3 text-emerald-400" />
                              ) : (
                                <Copy className="w-3 h-3" />
                              )}
                            </button>
                          </div>
                        </td>
                        <td className="p-3.5 whitespace-nowrap">
                          <div className="font-semibold text-white">{ord.user_name || 'Customer'}</div>
                          <div className="text-[11px] text-slate-400 font-mono">{ord.user_email}</div>
                        </td>
                        <td className="p-3.5 whitespace-nowrap">
                          <div className="font-bold text-white">{ord.product_name}</div>
                          {phoneNumber && (
                            <div className="text-[11px] text-slate-400 font-mono mt-0.5">
                              {phoneNumber}
                            </div>
                          )}
                        </td>
                        <td className="p-3.5 whitespace-nowrap font-mono font-bold text-emerald-400 text-sm">
                          ₦{ord.amount.toLocaleString()}
                        </td>
                        <td className="p-3.5 whitespace-nowrap">
                          <span
                            className={`px-2.5 py-1 rounded-full text-[10px] font-extrabold uppercase ${
                              ord.status === 'completed'
                                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                                : ord.status === 'cancelled'
                                ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                                : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                            }`}
                          >
                            {ord.status}
                          </span>
                        </td>
                        <td className="p-3.5 whitespace-nowrap font-mono font-bold">
                          {isCodeValid ? (
                            <div className="inline-flex items-center gap-1.5 px-2 py-0.5 bg-emerald-950/80 text-emerald-300 border border-emerald-700/50 rounded">
                              <span>{code}</span>
                              <button
                                onClick={() => handleCopy(code, `tbl-code-${ord.id}`)}
                                className="p-0.5 hover:bg-slate-800 rounded text-slate-400 hover:text-white transition-colors cursor-pointer"
                                title="Copy code"
                              >
                                {copiedId === `tbl-code-${ord.id}` ? (
                                  <Check className="w-3 h-3 text-emerald-400" />
                                ) : (
                                  <Copy className="w-3 h-3" />
                                )}
                              </button>
                            </div>
                          ) : (
                            <span className="text-slate-500">—</span>
                          )}
                        </td>
                        <td className="p-3.5 pr-4 whitespace-nowrap text-slate-400 text-[11px]">
                          {new Date(ord.created_at).toLocaleString()}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>
    </div>
  );
};
