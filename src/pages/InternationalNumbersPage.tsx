/**
 * Surest Plug - International Numbers (SMS Verification & OTP Service)
 * Light Color Appearance (Restored from Image 2)
 * 
 * Features:
 * - Clean White / Light background & White card styling
 * - Light gray borders, Dark text, Blue primary accents & Light blue highlights
 * - STEP 1: Country-first selection (with search & popular quick chips)
 * - STEP 2: Country-scoped service catalog (no global service list before country is chosen)
 * - STEP 3: Single authoritative live stock & price engine (InstantNums backed)
 * - Strict customer wallet checks before purchase
 * - ZERO exposure of provider/supplier balances, USD costs, or internal errors
 * - Active numbers monitoring with auto-polling & 1-click refund
 */

import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { User, Order, IntlCountry, IntlService } from '../types';
import { store } from '../lib/store';
import { useBodyScrollLock } from '../lib/scrollLock';
import {
  Smartphone,
  Globe,
  Search,
  CheckCircle2,
  AlertTriangle,
  AlertCircle,
  Clock,
  Copy,
  Check,
  RefreshCw,
  Wallet,
  ShieldCheck,
  X,
  ChevronRight,
  Sparkles,
  Zap
} from 'lucide-react';

interface InternationalNumbersPageProps {
  currentUser: User | null;
  onNavigate: (route: string, params?: any) => void;
  onRequireAuth?: () => void;
}

export type AvailabilityStatus =
  | 'idle'
  | 'loading'
  | 'available'
  | 'out_of_stock'
  | 'provider_unavailable'
  | 'invalid_response';

export interface AuthoritativeAvailabilityState {
  countryId: string;
  countryName: string;
  serviceId: string;
  serviceName: string;
  status: AvailabilityStatus;
  available: boolean;
  stock: number | null;
  price: number;
  loading: boolean;
  error: string | null;
}

// Popular countries for fast 1-click selection
const POPULAR_COUNTRIES: IntlCountry[] = [
  { id: '1', name: 'USA', flag: '🇺🇸', prefix: '+1', code: 'us' },
  { id: '2', name: 'United Kingdom (UK)', flag: '🇬🇧', prefix: '+44', code: 'uk' },
  { id: '36', name: 'Canada', flag: '🇨🇦', prefix: '+1', code: 'ca' },
  { id: '3', name: 'Netherlands', flag: '🇳🇱', prefix: '+31', code: 'nl' },
  { id: '23', name: 'France', flag: '🇫🇷', prefix: '+33', code: 'fr' },
  { id: '24', name: 'Germany', flag: '🇩🇪', prefix: '+49', code: 'de' },
  { id: '68', name: 'Brazil', flag: '🇧🇷', prefix: '+55', code: 'br' },
  { id: '16', name: 'Kenya', flag: '🇰🇪', prefix: '+254', code: 'ke' },
  { id: '14', name: 'Nigeria', flag: '🇳🇬', prefix: '+234', code: 'ng' },
  { id: '42', name: 'Ghana', flag: '🇬🇭', prefix: '+233', code: 'gh' },
  { id: '153', name: 'South Africa', flag: '🇿🇦', prefix: '+27', code: 'za' }
];

// Curated high-demand services mapping for priority display
const POPULAR_SERVICES_MAP: Record<string, { name: string; icon: string; category: string }> = {
  '924': { name: 'TikTok / Douyin', icon: '🎵', category: 'social' },
  '900': { name: 'WhatsApp', icon: '💬', category: 'messaging' },
  '901': { name: 'Telegram', icon: '✈️', category: 'messaging' },
  '902': { name: 'Google / YouTube', icon: '🔍', category: 'ai' },
  '906': { name: 'OpenAI / ChatGPT', icon: '🤖', category: 'ai' },
  '903': { name: 'Instagram', icon: '📸', category: 'social' },
  '904': { name: 'Facebook', icon: '👥', category: 'social' },
  '905': { name: 'Twitter / X', icon: '🐦', category: 'social' },
  '907': { name: 'Netflix', icon: '🍿', category: 'entertainment' },
  '908': { name: 'Discord', icon: '🎮', category: 'messaging' },
  '910': { name: 'Snapchat', icon: '👻', category: 'social' },
  '909': { name: 'PayPal', icon: '💳', category: 'finance' },
  '914': { name: 'Tinder', icon: '🔥', category: 'social' },
  '918': { name: 'Binance', icon: '🪙', category: 'finance' },
  '925': { name: 'Spotify', icon: '🎧', category: 'entertainment' },
  '922': { name: 'Claude / Anthropic', icon: '🧠', category: 'ai' }
};

function getServiceIcon(name: string, id: string): string {
  if (POPULAR_SERVICES_MAP[id]?.icon) return POPULAR_SERVICES_MAP[id].icon;
  const n = name.toLowerCase();
  if (n.includes('tiktok') || n.includes('douyin')) return '🎵';
  if (n.includes('whatsapp')) return '💬';
  if (n.includes('telegram')) return '✈️';
  if (n.includes('google') || n.includes('gmail') || n.includes('youtube')) return '🔍';
  if (n.includes('openai') || n.includes('chatgpt')) return '🤖';
  if (n.includes('instagram')) return '📸';
  if (n.includes('facebook')) return '👥';
  if (n.includes('twitter') || n.includes(' x')) return '🐦';
  if (n.includes('netflix')) return '🍿';
  if (n.includes('discord')) return '🎮';
  if (n.includes('snapchat')) return '👻';
  if (n.includes('tinder')) return '🔥';
  if (n.includes('paypal')) return '💳';
  if (n.includes('binance') || n.includes('crypto')) return '🪙';
  if (n.includes('spotify')) return '🎧';
  if (n.includes('apple')) return '🍎';
  if (n.includes('amazon')) return '📦';
  if (n.includes('uber')) return '🚗';
  if (n.includes('linkedin')) return '💼';
  return '📱';
}

function getServiceCategory(name: string, id: string): string {
  if (POPULAR_SERVICES_MAP[id]?.category) return POPULAR_SERVICES_MAP[id].category;
  const n = name.toLowerCase();
  if (n.includes('whatsapp') || n.includes('telegram') || n.includes('wechat') || n.includes('viber') || n.includes('signal') || n.includes('discord') || n.includes('line')) {
    return 'messaging';
  }
  if (n.includes('tiktok') || n.includes('instagram') || n.includes('facebook') || n.includes('twitter') || n.includes('snapchat') || n.includes('linkedin') || n.includes('tinder') || n.includes('reddit')) {
    return 'social';
  }
  if (n.includes('openai') || n.includes('chatgpt') || n.includes('claude') || n.includes('google') || n.includes('gmail') || n.includes('apple') || n.includes('microsoft')) {
    return 'ai';
  }
  if (n.includes('netflix') || n.includes('spotify') || n.includes('steam') || n.includes('twitch') || n.includes('youtube')) {
    return 'entertainment';
  }
  if (n.includes('paypal') || n.includes('binance') || n.includes('coinbase') || n.includes('crypto') || n.includes('cash app') || n.includes('bybit') || n.includes('bank')) {
    return 'finance';
  }
  return 'other';
}

/**
 * 20-Minute Order Countdown Badge Component (Requirements 3, 4, 5, 14, 15, 16, 17)
 * - Calculated strictly from server-saved expiresAt timestamp (purchasedAt + 20 minutes)
 * - Updates smoothly once per second: 20:00 -> 00:00
 * - Persists across page refreshes, tab closures, and device switches
 * - When < 1 minute remains (< 60s): visually obvious amber/rose badge with subtle pulse
 * - When timer reaches 00:00: displays 'Expired — Cancelling...' then 'Expired / Cancelled'
 * - Never restarts at 20:00 on page refresh
 */
const OrderCountdownBadge: React.FC<{
  order: Order;
  onExpire?: () => void;
  className?: string;
}> = ({ order, onExpire, className = '' }) => {
  const details = (order.customer_details as any) || {};
  const hasCode = Boolean(details.verification_code);
  const isCancelledOrRefunded =
    order.status === 'cancelled' ||
    order.status === 'refunded' ||
    details.status === 'cancelled' ||
    details.normalized_status === 'cancelled' ||
    details.normalized_status === 'refunded' ||
    details.refunded === true;
  const isExpired =
    details.normalized_status === 'expired' ||
    details.status === 'expired';
  const isCancellationPending =
    Boolean(details.cancellation_pending) ||
    details.normalized_status === 'cancellation_pending';

  // Calculate authoritative expiresAt from server-saved timestamp
  const expiresAtMs = useMemo(() => {
    const rawExpires = details.expires_at || details.expiresAt;
    if (rawExpires) {
      const parsed = new Date(rawExpires).getTime();
      if (!isNaN(parsed)) return parsed;
    }
    // Fallback: strictly purchased_at or created_at + 20 minutes (never reset to 20 mins from now)
    const rawPurchased = details.purchased_at || details.purchasedAt || order.created_at;
    const purchasedParsed = rawPurchased ? new Date(rawPurchased).getTime() : Date.now();
    return purchasedParsed + 20 * 60 * 1000;
  }, [details.expires_at, details.expiresAt, details.purchased_at, details.purchasedAt, order.created_at]);

  const [now, setNow] = useState<number>(() => Date.now());

  useEffect(() => {
    if (hasCode || isCancelledOrRefunded || isExpired) return;

    const interval = setInterval(() => {
      setNow(Date.now());
    }, 1000);
    return () => clearInterval(interval);
  }, [hasCode, isCancelledOrRefunded, isExpired]);

  const diffMs = expiresAtMs - now;
  const remainingSeconds = Math.max(0, Math.floor(diffMs / 1000));

  // Trigger auto-expiry callback once when remainingSeconds reaches 0
  const hasExpiredFired = useRef(false);
  useEffect(() => {
    if (remainingSeconds === 0 && !hasCode && !isCancelledOrRefunded && !isExpired && !hasExpiredFired.current) {
      hasExpiredFired.current = true;
      if (onExpire) onExpire();
    }
  }, [remainingSeconds, hasCode, isCancelledOrRefunded, isExpired, onExpire]);

  // If SMS was received, no countdown required
  if (hasCode) {
    return null;
  }

  // If order is terminal (Expired or Cancelled/Refunded)
  if (isExpired || isCancelledOrRefunded) {
    return (
      <span className={`px-2.5 py-1 rounded-full bg-slate-100 text-slate-700 text-xs font-bold border border-slate-200 inline-flex items-center gap-1.5 ${className}`}>
        <Clock className="w-3.5 h-3.5 text-slate-500" />
        <span>Expired / Cancelled</span>
      </span>
    );
  }

  // If countdown reached 00:00 or cancellation is pending with provider
  if (remainingSeconds === 0 || isCancellationPending) {
    return (
      <span className={`px-2.5 py-1 rounded-full bg-amber-50 text-amber-800 text-xs font-bold border border-amber-200 inline-flex items-center gap-1.5 animate-pulse ${className}`}>
        <RefreshCw className="w-3 h-3 animate-spin text-amber-600" />
        <span>Expired — Cancelling...</span>
      </span>
    );
  }

  // Format countdown mm:ss
  const minutes = Math.floor(remainingSeconds / 60);
  const seconds = remainingSeconds % 60;
  const formattedCountdown = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;

  // REQUIREMENT 15: When less than 1 minute remains (< 60s), make visually obvious without redesigning
  if (remainingSeconds < 60) {
    return (
      <span className={`px-2.5 py-1 rounded-full bg-rose-50 text-rose-700 text-xs font-bold border border-rose-300 inline-flex items-center gap-1.5 shadow-xs animate-pulse ${className}`}>
        <Clock className="w-3.5 h-3.5 text-rose-600" />
        <span className="font-mono font-black text-rose-700 tracking-wider">{formattedCountdown}</span>
        <span className="text-[10px] uppercase font-black text-rose-600 tracking-wider">Expiring</span>
      </span>
    );
  }

  // Standard Countdown Badge (20:00 -> 01:00)
  return (
    <span className={`px-2.5 py-1 rounded-full bg-blue-50 text-blue-800 text-xs font-bold border border-blue-200 inline-flex items-center gap-1.5 ${className}`}>
      <Clock className="w-3.5 h-3.5 text-blue-600" />
      <span className="font-mono font-black text-slate-900 tracking-wider">{formattedCountdown}</span>
      <span className="text-[10px] text-blue-600 font-semibold">remaining</span>
    </span>
  );
};

export const InternationalNumbersPage: React.FC<InternationalNumbersPageProps> = ({
  currentUser,
  onNavigate,
  onRequireAuth
}) => {
  // Step 1: Countries catalog
  const [countries, setCountries] = useState<IntlCountry[]>(POPULAR_COUNTRIES);
  const [selectedCountry, setSelectedCountry] = useState<IntlCountry | null>(null);
  const [countrySearch, setCountrySearch] = useState<string>('');
  const [showCountryDropdown, setShowCountryDropdown] = useState<boolean>(false);

  // Step 2: Country-scoped services catalog
  const [services, setServices] = useState<IntlService[]>([]);
  const [loadingServices, setLoadingServices] = useState<boolean>(false);
  const [selectedService, setSelectedService] = useState<IntlService | null>(null);
  const [serviceSearch, setServiceSearch] = useState<string>('');
  const [serviceCategory, setServiceCategory] = useState<string>('all');

  // Step 3: Authoritative stock & price availability
  const [availability, setAvailability] = useState<AuthoritativeAvailabilityState>({
    countryId: '',
    countryName: '',
    serviceId: '',
    serviceName: '',
    status: 'idle',
    available: false,
    stock: null,
    price: 1352,
    loading: false,
    error: null
  });

  // Guard against race conditions when user switches selections quickly
  const availabilityRequestIdRef = useRef<number>(0);

  // Purchase & Confirmation State
  const [isPurchasing, setIsPurchasing] = useState<boolean>(false);
  const [showConfirmModal, setShowConfirmModal] = useState<boolean>(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  // Lock background scroll when purchase confirmation modal is open
  useBodyScrollLock(showConfirmModal);

  // Orders & Active OTP Polling
  const [userOrders, setUserOrders] = useState<Order[]>([]);
  const [pollingOrderId, setPollingOrderId] = useState<number | null>(null);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [cancellingOrderId, setCancellingOrderId] = useState<number | null>(null);
  const [activeTab, setActiveTab] = useState<'buy' | 'active' | 'history'>('buy');

  const countryInputRef = useRef<HTMLInputElement>(null);
  const pollingTimerRef = useRef<any>(null);

  // Copy helper
  const copyToClipboard = (text: string, key: string) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2500);
  };

  // Play audio chime when OTP arrives
  const playChime = () => {
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(587.33, audioCtx.currentTime); // D5
      osc.frequency.setValueAtTime(880, audioCtx.currentTime + 0.15); // A5
      gain.gain.setValueAtTime(0.3, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.6);
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.start();
      osc.stop(audioCtx.currentTime + 0.6);
    } catch {
      // Audio fallback
    }
  };

  // 1. Fetch Countries catalog on mount ONLY (do not load global services)
  useEffect(() => {
    let isMounted = true;
    const loadCountries = async () => {
      try {
        const cRes = await store.fetchIntlCountries();
        if (isMounted && cRes.success && cRes.countries && cRes.countries.length > 0) {
          setCountries(cRes.countries);
        }
      } catch {
        // Fallback to POPULAR_COUNTRIES
      }
    };
    loadCountries();
    return () => {
      isMounted = false;
    };
  }, []);

  // 2. Fetch Services scoped specifically to the selected country when a country is chosen
  useEffect(() => {
    let isMounted = true;
    if (!selectedCountry) {
      setServices([]);
      setSelectedService(null);
      return;
    }

    const loadServicesForCountry = async () => {
      setLoadingServices(true);
      try {
        const sRes = await store.fetchIntlServices(selectedCountry.id);
        if (!isMounted) return;
        if (sRes.success && sRes.services && sRes.services.length > 0) {
          setServices(sRes.services);
        } else {
          // If provider returned empty for this specific country, provide default list
          setServices([
            { id: '924', name: 'TikTok / Douyin', category: 'social', popular: true },
            { id: '900', name: 'WhatsApp', category: 'messaging', popular: true },
            { id: '901', name: 'Telegram', category: 'messaging', popular: true },
            { id: '902', name: 'Google / YouTube', category: 'ai', popular: true },
            { id: '906', name: 'OpenAI / ChatGPT', category: 'ai', popular: true },
            { id: '903', name: 'Instagram', category: 'social', popular: true },
            { id: '904', name: 'Facebook', category: 'social', popular: true },
            { id: '905', name: 'Twitter / X', category: 'social', popular: true }
          ]);
        }
      } catch {
        if (isMounted) {
          setServices([
            { id: '924', name: 'TikTok / Douyin', category: 'social', popular: true },
            { id: '900', name: 'WhatsApp', category: 'messaging', popular: true },
            { id: '901', name: 'Telegram', category: 'messaging', popular: true }
          ]);
        }
      } finally {
        if (isMounted) setLoadingServices(false);
      }
    };

    loadServicesForCountry();
    return () => {
      isMounted = false;
    };
  }, [selectedCountry?.id]);

  // 3. Single authoritative availability fetch whenever country or service changes
  const checkAvailability = useCallback(async (cId: string, cName: string, sId: string, sName: string) => {
    if (!cId || !sId) return;

    // Increment request ID to cancel/ignore any earlier in-flight requests (Requirement 13)
    const currentRequestId = ++availabilityRequestIdRef.current;

    setAvailability({
      countryId: cId,
      countryName: cName,
      serviceId: sId,
      serviceName: sName,
      status: 'loading',
      available: false,
      stock: null, // Wipe stock during loading (Requirement 2 & 7)
      price: 1352,
      loading: true,
      error: null
    });

    try {
      const res = await store.fetchIntlAvailability(cId, sId);

      // Discard stale response if selection changed while waiting (Requirement 10 & 13)
      if (availabilityRequestIdRef.current !== currentRequestId) {
        return;
      }

      if (res.success && res.data) {
        const d = res.data;
        // Verify numeric stock without truthiness tricks (Requirement 8 & 9)
        const isNumeric = typeof d.stock === 'number' && !isNaN(d.stock);
        if (!isNumeric) {
          setAvailability({
            countryId: cId,
            countryName: cName,
            serviceId: sId,
            serviceName: sName,
            status: 'invalid_response',
            available: false,
            stock: null,
            price: Number(d.price || 1352),
            loading: false,
            error: 'Provider returned an unverified stock value.'
          });
          return;
        }

        const verifiedStock = Math.max(0, d.stock);
        const hasStock = verifiedStock > 0;

        setAvailability({
          countryId: cId,
          countryName: cName,
          serviceId: sId,
          serviceName: sName,
          status: hasStock ? 'available' : 'out_of_stock',
          available: hasStock,
          stock: verifiedStock,
          price: Number(d.price || 1352),
          loading: false,
          error: hasStock ? null : 'Numbers are temporarily out of stock for this selection.'
        });
      } else {
        // Classify failure explicitly: out of stock ONLY if provider confirmed stock is 0
        let status: AvailabilityStatus = 'provider_unavailable';
        if (res.status === 'INVALID_RESPONSE') {
          status = 'invalid_response';
        } else if (res.status === 'OUT_OF_STOCK') {
          status = 'out_of_stock';
        } else {
          status = 'provider_unavailable';
        }

        const isConfirmedZero = status === 'out_of_stock';
        setAvailability({
          countryId: cId,
          countryName: cName,
          serviceId: sId,
          serviceName: sName,
          status,
          available: false,
          stock: isConfirmedZero ? 0 : null,
          price: 1352,
          loading: false,
          error: res.error || (status === 'invalid_response'
            ? 'Invalid response received from provider.'
            : isConfirmedZero
            ? 'Numbers are temporarily out of stock for this selection.'
            : 'Number service is temporarily unavailable. Please try again shortly.')
        });
      }
    } catch {
      if (availabilityRequestIdRef.current !== currentRequestId) return;
      setAvailability({
        countryId: cId,
        countryName: cName,
        serviceId: sId,
        serviceName: sName,
        status: 'provider_unavailable',
        available: false,
        stock: null,
        price: 1352,
        loading: false,
        error: 'Network error verifying live stock from provider.'
      });
    }
  }, []);

  // Dedicated selection handlers ensuring previous stock state is cleared immediately (Requirements 10, 11, 12)
  const handleSelectCountry = useCallback((c: IntlCountry) => {
    availabilityRequestIdRef.current++;
    setSelectedCountry(c);
    setSelectedService(null);
    setShowCountryDropdown(false);
    setCountrySearch('');
    // Clear previous stock state immediately
    setAvailability({
      countryId: c.id,
      countryName: c.name,
      serviceId: '',
      serviceName: '',
      status: 'idle',
      available: false,
      stock: null,
      price: 1352,
      loading: false,
      error: null
    });
  }, []);

  const handleResetCountry = useCallback(() => {
    availabilityRequestIdRef.current++;
    setSelectedCountry(null);
    setSelectedService(null);
    setShowCountryDropdown(false);
    setCountrySearch('');
    setAvailability({
      countryId: '',
      countryName: '',
      serviceId: '',
      serviceName: '',
      status: 'idle',
      available: false,
      stock: null,
      price: 1352,
      loading: false,
      error: null
    });
  }, []);

  const handleSelectService = useCallback((s: IntlService) => {
    setSelectedService(s);
    if (selectedCountry) {
      checkAvailability(selectedCountry.id, selectedCountry.name, s.id, s.name);
    }
  }, [selectedCountry, checkAvailability]);

  // Trigger availability check when both selectedCountry and selectedService are selected
  useEffect(() => {
    if (selectedCountry?.id && selectedService?.id) {
      checkAvailability(
        selectedCountry.id,
        selectedCountry.name,
        selectedService.id,
        selectedService.name
      );
    }
  }, [selectedCountry?.id, selectedService?.id, checkAvailability]);

  // Refresh User Orders from store
  const refreshOrders = useCallback(() => {
    if (!currentUser) {
      setUserOrders([]);
      return;
    }
    const allOrders = store.getOrders();
    const myOrders = allOrders.filter(
      o => o.user_id === currentUser.id && (o.category === 'numbers' || o.order_reference?.startsWith('SP-NUM-') || o.order_reference?.startsWith('ORD-IN-'))
    );
    setUserOrders(myOrders);

    // If there's an active waiting order, switch to active tab
    const hasWaiting = myOrders.some(
      o => o.status === 'processing' && !(o.customer_details as any)?.verification_code
    );
    if (hasWaiting && activeTab === 'buy') {
      setActiveTab('active');
    }
  }, [currentUser, activeTab]);

  useEffect(() => {
    refreshOrders();
    // Sync active orders from server backend store
    if (currentUser?.id) {
      store.syncIntlOrdersFromBackend(currentUser.id, currentUser.email).then(() => {
        refreshOrders();
      });
    }
  }, [currentUser, refreshOrders]);

  // Live SMS Polling for Active Numbers (3-5 second interval recommended by InstantNums)
  useEffect(() => {
    const activeWaitingOrders = userOrders.filter(
      o => o.status === 'processing' && !(o.customer_details as any)?.verification_code
    );

    if (activeWaitingOrders.length === 0) {
      if (pollingTimerRef.current) {
        clearInterval(pollingTimerRef.current);
        pollingTimerRef.current = null;
      }
      return;
    }

    const pollActiveOrders = async () => {
      for (const order of activeWaitingOrders) {
        const details = (order.customer_details as any) || {};
        const providerOrderId = details.order_id || details.provider_order_id || details.activation_id;
        if (!providerOrderId) continue;

        setPollingOrderId(order.id);
        try {
          const res = await store.checkInstantNumsActivationStatus(order.id, String(providerOrderId));
          // Stop polling if terminal state or verification code received
          if (res.isTerminal || (res.success && res.details?.verification_code)) {
            if (res.details?.verification_code) {
              playChime();
            }
            refreshOrders();
          } else if (res.details?.status_check_error) {
            // Preserve state and update UI with non-blocking error badge
            refreshOrders();
          }
        } catch {
          // Keep last valid state on network error
        } finally {
          setPollingOrderId(null);
        }
      }
    };

    pollActiveOrders();
    pollingTimerRef.current = setInterval(pollActiveOrders, 4000);

    return () => {
      if (pollingTimerRef.current) {
        clearInterval(pollingTimerRef.current);
        pollingTimerRef.current = null;
      }
    };
  }, [userOrders, refreshOrders]);

  // Manual immediate status check
  const handleManualStatusCheck = async (order: Order) => {
    const details = (order.customer_details as any) || {};
    const providerOrderId = details.order_id || details.provider_order_id || details.activation_id;
    if (!providerOrderId) return;

    setPollingOrderId(order.id);
    try {
      const res = await store.checkInstantNumsActivationStatus(order.id, String(providerOrderId));
      if (res.details?.verification_code) {
        playChime();
      }
      refreshOrders();
    } catch {
      // Retain last state
    } finally {
      setPollingOrderId(null);
    }
  };

  // Auto-expire callback when 20-minute countdown hits 00:00
  const autoExpireInProgressRef = useRef<Record<string, boolean>>({});
  const handleAutoExpire = useCallback(async (order: Order) => {
    const orderKey = String(order.id);
    if (autoExpireInProgressRef.current[orderKey]) return;
    autoExpireInProgressRef.current[orderKey] = true;

    const details = (order.customer_details as any) || {};
    const providerOrderId = details.order_id || details.provider_order_id || details.activation_id;

    try {
      // 1. Trigger background server-side expired processor
      await fetch('/api/international-numbers/process-expired', { method: 'POST' }).catch(() => {});

      // 2. Client store safe cancellation check (Idempotent: store.cancelInstantNumsOrder will not double refund)
      if (providerOrderId && order.status !== 'cancelled' && !details.refunded) {
        await store.cancelInstantNumsOrder(order.id, String(providerOrderId)).catch(() => {});
      }

      // 3. Resync from backend to ensure consistent state
      if (currentUser?.id) {
        await store.syncIntlOrdersFromBackend(currentUser.id, currentUser.email);
      }
      refreshOrders();
    } catch (e) {
      console.warn('[Auto-Expire] Cancellation error:', e);
    }
  }, [currentUser, refreshOrders]);

  // Cancel order & auto-refund
  const handleCancelOrder = async (order: Order) => {
    const details = (order.customer_details as any) || {};
    const providerOrderId = details.order_id || details.provider_order_id || details.activation_id;
    if (!providerOrderId) return;

    setCancellingOrderId(order.id);
    setActionError(null);
    try {
      const res = await store.cancelInstantNumsOrder(order.id, String(providerOrderId));
      if (res.success) {
        setActionSuccess(`Order #${order.order_reference} was cancelled and ₦${order.amount.toLocaleString()} was refunded to your wallet.`);
        refreshOrders();
      } else {
        setActionError(res.error || 'Failed to cancel order with provider.');
      }
    } catch (err: any) {
      setActionError(err?.message || 'Error cancelling order.');
    } finally {
      setCancellingOrderId(null);
    }
  };

  // Purchase Number with Strict Wallet Safety
  const handleExecutePurchase = async () => {
    if (!currentUser) {
      if (onRequireAuth) onRequireAuth();
      else onNavigate('login');
      return;
    }

    if (!selectedCountry || !selectedService) {
      setActionError('Please select both a country and a service before proceeding.');
      return;
    }

    const price = availability.price;
    if (!price || price <= 0) {
      setActionError('Price is currently unavailable for this selection. Please try another app or country.');
      return;
    }

    // STRICT CUSTOMER WALLET BALANCE CHECK
    if (currentUser.balance < price) {
      setActionError('Insufficient wallet balance. Please fund your wallet to continue.');
      setShowConfirmModal(false);
      return;
    }

    setIsPurchasing(true);
    setActionError(null);
    setActionSuccess(null);
    setShowConfirmModal(false);

    try {
      const res = await store.submitInstantNumsOrder(
        currentUser.id,
        selectedCountry.id,
        selectedService.id,
        selectedCountry.name,
        selectedService.name,
        price
      );

      if (res.success && res.order) {
        const details = (res.order.customer_details as any) || {};
        setActionSuccess(`Success! Virtual number ${details.phone_number || res.order.product_name} is active.`);
        refreshOrders();
        setActiveTab('active');
      } else {
        setActionError(res.error || 'Failed to reserve number. Please try another country or app.');
      }
    } catch {
      setActionError('Failed to complete purchase. Please try again.');
    } finally {
      setIsPurchasing(false);
    }
  };

  // Filtered Country List
  const filteredCountries = useMemo(() => {
    const q = countrySearch.toLowerCase().trim();
    if (!q) return countries;
    return countries.filter(c =>
      c.name.toLowerCase().includes(q) ||
      (c.code && c.code.toLowerCase().includes(q)) ||
      (c.prefix && c.prefix.includes(q))
    );
  }, [countries, countrySearch]);

  // Filtered Services List for Selected Country
  const filteredServices = useMemo(() => {
    if (!selectedCountry) return [];

    let list = services;

    // Apply category filter
    if (serviceCategory !== 'all') {
      list = list.filter(s => {
        const cat = getServiceCategory(s.name, s.id);
        if (serviceCategory === 'popular') return s.popular || cat === 'popular' || POPULAR_SERVICES_MAP[s.id];
        return cat === serviceCategory;
      });
    }

    // Apply search filter
    const q = serviceSearch.toLowerCase().trim();
    if (q) {
      list = list.filter(s => s.name.toLowerCase().includes(q));
    }

    // Prioritize high-stock / popular apps at top
    return [...list].sort((a, b) => {
      const aPop = POPULAR_SERVICES_MAP[a.id] ? 1 : (a.popular ? 2 : 3);
      const bPop = POPULAR_SERVICES_MAP[b.id] ? 1 : (b.popular ? 2 : 3);
      return aPop - bPop;
    });
  }, [services, selectedCountry, serviceCategory, serviceSearch]);

  // Active / History orders count
  const activeOrders = userOrders.filter(
    o => o.status === 'processing' || o.status === 'pending'
  );
  const historyOrders = userOrders.filter(
    o => o.status === 'completed' || o.status === 'cancelled' || o.status === 'refunded'
  );

  // Authoritative in-stock condition: strictly verified numeric stock > 0, confirmed available, not loading
  const isVerifiedInStock =
    availability.status === 'available' &&
    typeof availability.stock === 'number' &&
    !isNaN(availability.stock) &&
    availability.stock > 0 &&
    !availability.loading;

  const isInStock = isVerifiedInStock;

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-6xl mx-auto space-y-8">
        
        {/* OLD LIGHT DESIGN: PAGE HEADER & BALANCE CARD */}
        <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 shadow-sm">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 border border-blue-200 text-blue-700 text-xs font-bold mb-3 whitespace-nowrap shrink-0">
                <ShieldCheck className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                <span className="whitespace-nowrap">Instant SMS & OTP Verification</span>
              </div>
              <h1 className="text-xl sm:text-2xl md:text-3xl font-black tracking-tight text-slate-900 flex items-center gap-2.5 sm:gap-3 flex-nowrap whitespace-nowrap">
                <span className="whitespace-nowrap shrink-0">International Numbers</span>
                <span className="text-xs px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 font-bold whitespace-nowrap shrink-0 inline-flex items-center">
                  Live Stock
                </span>
              </h1>
              <p className="text-sm text-slate-600 mt-2 max-w-2xl leading-relaxed">
                Activate virtual numbers for TikTok, WhatsApp, Telegram, Google, and 500+ apps. Instant SMS delivery with automatic refund if no code arrives.
              </p>
            </div>

            {/* Former Balance Card Placement (Only Customer Balance Shown) */}
            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 sm:p-5 flex items-center justify-between gap-4 sm:gap-6 shrink-0 shadow-xs">
              <div className="flex items-center gap-3 shrink-0">
                <div className="w-10 h-10 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-600 shrink-0">
                  <Wallet className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-[11px] text-slate-500 font-bold uppercase tracking-wider whitespace-nowrap">Your Balance</div>
                  <div className="text-xl font-black text-slate-900 whitespace-nowrap">
                    ₦{currentUser ? currentUser.balance.toLocaleString('en-US', { minimumFractionDigits: 2 }) : '0.00'}
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => onNavigate('dashboard')}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl transition-all cursor-pointer shadow-xs flex items-center gap-1.5 whitespace-nowrap shrink-0"
              >
                <span className="whitespace-nowrap">Fund Wallet</span>
                <ChevronRight className="w-3.5 h-3.5 shrink-0" />
              </button>
            </div>
          </div>

          {/* Navigation Tabs */}
          <div className="flex items-center gap-2 mt-6 pt-6 border-t border-slate-100 flex-wrap">
            <button
              type="button"
              onClick={() => setActiveTab('buy')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 ${
                activeTab === 'buy'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200 hover:text-slate-900 border border-slate-200/80'
              }`}
            >
              <Smartphone className="w-3.5 h-3.5" />
              <span>Get Virtual Number</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('active')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 relative ${
                activeTab === 'active'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200 hover:text-slate-900 border border-slate-200/80'
              }`}
            >
              <Zap className="w-3.5 h-3.5 text-amber-500" />
              <span>Active Numbers</span>
              {activeOrders.length > 0 && (
                <span className="px-1.5 py-0.2 rounded-full bg-emerald-600 text-white text-[10px] font-black animate-pulse">
                  {activeOrders.length}
                </span>
              )}
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('history')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 ${
                activeTab === 'history'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200 hover:text-slate-900 border border-slate-200/80'
              }`}
            >
              <Clock className="w-3.5 h-3.5" />
              <span>Order History ({historyOrders.length})</span>
            </button>
          </div>
        </div>

        {/* Global Action Feedback Alerts */}
        {actionSuccess && (
          <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl text-emerald-900 text-xs flex items-center justify-between gap-3 shadow-xs">
            <div className="flex items-center gap-2.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span className="font-medium">{actionSuccess}</span>
            </div>
            <button onClick={() => setActionSuccess(null)} className="text-emerald-600 hover:text-emerald-900 cursor-pointer">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {actionError && (
          <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl text-rose-900 text-xs flex items-center justify-between gap-3 shadow-xs">
            <div className="flex items-center gap-2.5">
              <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
              <span className="font-medium">{actionError}</span>
            </div>
            <button onClick={() => setActionError(null)} className="text-rose-600 hover:text-rose-900 cursor-pointer">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* TAB 1: BUY NUMBER (COUNTRY FIRST FLOW) */}
        {activeTab === 'buy' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            
            {/* LEFT COLUMN: STEP 1 (COUNTRY) + STEP 2 (SERVICE) (7 cols) */}
            <div className="lg:col-span-7 space-y-6">
              
              {/* STEP 1: SELECT COUNTRY */}
              <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <span className="w-6 h-6 rounded-full bg-blue-600 text-white font-black text-xs flex items-center justify-center">1</span>
                    <h2 className="text-base font-black text-slate-900">Select Country</h2>
                  </div>
                  {selectedCountry && (
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-blue-700 bg-blue-50 px-2.5 py-1 rounded-full border border-blue-200 flex items-center gap-1.5">
                        <span>{selectedCountry.flag}</span>
                        <span>{selectedCountry.name}</span>
                        <span className="font-mono text-blue-500">({selectedCountry.prefix})</span>
                      </span>
                      <button
                        type="button"
                        onClick={handleResetCountry}
                        className="text-[11px] text-blue-600 hover:text-blue-800 font-semibold underline cursor-pointer"
                      >
                        Change
                      </button>
                    </div>
                  )}
                </div>

                <p className="text-xs text-slate-500 mb-3">
                  Choose the destination country for your virtual number:
                </p>

                {/* Popular Country Quick Chips */}
                <div className="flex items-center gap-2 overflow-x-auto pb-2 mb-3 scrollbar-none">
                  {POPULAR_COUNTRIES.map(c => {
                    const isSelected = selectedCountry?.id === c.id;
                    return (
                      <button
                        key={c.id}
                        type="button"
                        onClick={() => handleSelectCountry(c)}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold shrink-0 transition-all cursor-pointer flex items-center gap-1.5 ${
                          isSelected
                            ? 'bg-blue-600 text-white shadow-xs'
                            : 'bg-white text-slate-700 hover:bg-slate-100 hover:text-slate-900 border border-slate-200'
                        }`}
                      >
                        <span>{c.flag}</span>
                        <span>{c.name}</span>
                      </button>
                    );
                  })}
                </div>

                {/* Country Search Bar & Dropdown */}
                <div className="relative">
                  <div className="relative">
                    <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      ref={countryInputRef}
                      type="text"
                      value={countrySearch}
                      onChange={e => {
                        setCountrySearch(e.target.value);
                        setShowCountryDropdown(true);
                      }}
                      onFocus={() => setShowCountryDropdown(true)}
                      placeholder="Search countries by name or code (e.g. USA, UK, Canada, +1, +44)..."
                      className="w-full bg-slate-50 border border-slate-200 focus:border-blue-500 focus:bg-white rounded-2xl pl-10 pr-4 py-2.5 text-xs text-slate-900 placeholder-slate-400 transition-colors outline-none"
                    />
                  </div>

                  {showCountryDropdown && (
                    <div className="absolute z-30 left-0 right-0 top-full mt-2 bg-white border border-slate-200 rounded-2xl shadow-xl max-h-60 overflow-y-auto overscroll-contain sp-overlay-scroll p-2">
                      <div className="flex items-center justify-between p-2 border-b border-slate-100 mb-1">
                        <span className="text-[11px] font-bold text-slate-500">Select Country</span>
                        <button
                          type="button"
                          onClick={() => setShowCountryDropdown(false)}
                          className="text-[11px] text-slate-400 hover:text-slate-700 cursor-pointer"
                        >
                          Close
                        </button>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-1">
                        {filteredCountries.slice(0, 30).map(c => (
                          <button
                            key={c.id}
                            type="button"
                            onClick={() => handleSelectCountry(c)}
                            className={`p-2.5 rounded-xl text-xs text-left transition-all cursor-pointer flex items-center justify-between ${
                              selectedCountry?.id === c.id
                                ? 'bg-blue-600 text-white font-bold'
                                : 'hover:bg-slate-100 text-slate-800'
                            }`}
                          >
                            <span className="truncate">{c.flag ? `${c.flag} ` : ''}{c.name}</span>
                            <span className={`text-[10px] font-mono ml-2 shrink-0 ${selectedCountry?.id === c.id ? 'text-blue-100' : 'text-slate-400'}`}>
                              {c.prefix}
                            </span>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* STEP 2: SELECT APP OR SERVICE */}
              <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <span className="w-6 h-6 rounded-full bg-blue-600 text-white font-black text-xs flex items-center justify-center">2</span>
                    <h2 className="text-base font-black text-slate-900">Select App or Service</h2>
                  </div>
                  {selectedService && (
                    <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200">
                      {selectedService.name}
                    </span>
                  )}
                </div>

                {/* COUNTRY FIRST CONSTRAINT: If no country selected, display prompt */}
                {!selectedCountry ? (
                  <div className="bg-slate-50 border border-dashed border-slate-200 rounded-2xl p-8 text-center my-2">
                    <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center mx-auto mb-3 border border-blue-100">
                      <Globe className="w-6 h-6" />
                    </div>
                    <h3 className="text-sm font-bold text-slate-900 mb-1">Please select a country first</h3>
                    <p className="text-xs text-slate-500 max-w-sm mx-auto">
                      Choose a country in Step 1 to load and display available apps, services, and live stock.
                    </p>
                  </div>
                ) : (
                  <div>
                    <div className="flex items-center justify-between text-xs text-slate-500 mb-3">
                      <span>Showing available apps for <strong className="text-slate-900">{selectedCountry.name}</strong>:</span>
                      {loadingServices && (
                        <span className="text-blue-600 flex items-center gap-1">
                          <RefreshCw className="w-3 h-3 animate-spin" />
                          <span>Loading services...</span>
                        </span>
                      )}
                    </div>

                    {/* Former Service Category Filter Tabs */}
                    <div className="flex items-center gap-2 overflow-x-auto pb-2 mb-3 scrollbar-none">
                      {[
                        { id: 'all', label: 'All Apps' },
                        { id: 'popular', label: 'Popular' },
                        { id: 'social', label: 'Social Media' },
                        { id: 'messaging', label: 'Messaging' },
                        { id: 'ai', label: 'AI & Tech' },
                        { id: 'entertainment', label: 'Entertainment' },
                        { id: 'finance', label: 'Finance' }
                      ].map(cat => (
                        <button
                          key={cat.id}
                          type="button"
                          onClick={() => setServiceCategory(cat.id)}
                          className={`px-3 py-1.5 rounded-xl text-xs font-bold shrink-0 transition-all cursor-pointer ${
                            serviceCategory === cat.id
                              ? 'bg-blue-600 text-white shadow-xs'
                              : 'bg-slate-100 text-slate-700 hover:bg-slate-200 hover:text-slate-900 border border-slate-200/80'
                          }`}
                        >
                          {cat.label}
                        </button>
                      ))}
                    </div>

                    {/* Service Search Bar */}
                    <div className="relative mb-4">
                      <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        value={serviceSearch}
                        onChange={e => setServiceSearch(e.target.value)}
                        placeholder={`Search apps for ${selectedCountry.name} (e.g. TikTok, WhatsApp, Telegram, ChatGPT)...`}
                        className="w-full bg-slate-50 border border-slate-200 focus:border-blue-500 focus:bg-white rounded-2xl pl-10 pr-4 py-2.5 text-xs text-slate-900 placeholder-slate-400 transition-colors outline-none"
                      />
                    </div>

                    {/* Former Service Cards Grid */}
                    {loadingServices ? (
                      <div className="py-12 text-center text-xs text-slate-500 flex flex-col items-center justify-center gap-2">
                        <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                        <span>Querying available services for {selectedCountry.name}...</span>
                      </div>
                    ) : filteredServices.length === 0 ? (
                      <div className="py-8 text-center text-xs text-slate-500">
                        No services matching "{serviceSearch}" for {selectedCountry.name}.
                      </div>
                    ) : (
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 max-h-72 overflow-y-auto overscroll-contain sp-overlay-scroll pr-1">
                        {filteredServices.slice(0, 36).map(s => {
                          const isSelected = selectedService?.id === s.id;
                          const icon = getServiceIcon(s.name, s.id);
                          return (
                            <button
                              key={s.id}
                              type="button"
                              onClick={() => handleSelectService(s)}
                              className={`p-3 rounded-2xl text-left border transition-all cursor-pointer flex flex-col justify-between ${
                                isSelected
                                  ? 'bg-blue-50/90 border-blue-500 text-blue-900 ring-1 ring-blue-500'
                                  : 'bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50 text-slate-800'
                              }`}
                            >
                              <div className="flex items-center gap-2 mb-1.5">
                                <span className="text-base">{icon}</span>
                                <div className="font-bold text-xs truncate w-full text-slate-900">{s.name}</div>
                              </div>
                              <div className="text-[10px] text-slate-500 flex items-center justify-between">
                                <span className="capitalize">{getServiceCategory(s.name, s.id)}</span>
                                {isSelected && <span className="text-blue-600 font-bold">Selected</span>}
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* RIGHT COLUMN: ORDER SUMMARY & ACTIVATION CARD (5 cols) */}
            <div className="lg:col-span-5 space-y-6">
              <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-7 shadow-sm sticky top-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-5 h-5 text-blue-600" />
                    <h3 className="font-black text-base text-slate-900">Order Summary</h3>
                  </div>
                  {selectedCountry && selectedService && (
                    <button
                      type="button"
                      onClick={() => checkAvailability(
                        selectedCountry.id,
                        selectedCountry.name,
                        selectedService.id,
                        selectedService.name
                      )}
                      disabled={availability.loading}
                      className="text-slate-500 hover:text-slate-800 text-xs cursor-pointer flex items-center gap-1"
                    >
                      <RefreshCw className={`w-3.5 h-3.5 ${availability.loading ? 'animate-spin' : ''}`} />
                      <span>Check Live</span>
                    </button>
                  )}
                </div>

                {/* Selection Details Box */}
                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-3 mb-5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-500">Target Country:</span>
                    <span className="font-bold text-slate-900 flex items-center gap-1.5">
                      {selectedCountry ? (
                        <>
                          <span>{selectedCountry.flag}</span>
                          <span>{selectedCountry.name}</span>
                          <span className="text-slate-500 font-mono">({selectedCountry.prefix})</span>
                        </>
                      ) : (
                        <span className="text-slate-400 font-normal">Select a country first</span>
                      )}
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-500">App / Platform:</span>
                    <span className="font-bold text-slate-900">
                      {selectedService ? selectedService.name : <span className="text-slate-400 font-normal">Select an app</span>}
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-xs pt-2 border-t border-slate-200">
                    <span className="text-slate-500">Live Availability:</span>
                    {!selectedCountry ? (
                      <span className="text-slate-400">Awaiting Country</span>
                    ) : !selectedService ? (
                      <span className="text-slate-400">Awaiting App</span>
                    ) : availability.loading || availability.status === 'loading' ? (
                      <span className="text-blue-600 flex items-center gap-1.5 font-bold">
                        <div className="w-3 h-3 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                        <span>Querying Provider...</span>
                      </span>
                    ) : isVerifiedInStock ? (
                      <span className="text-emerald-600 font-bold flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Ready to Activate</span>
                      </span>
                    ) : availability.status === 'out_of_stock' ? (
                      <span className="text-amber-600 font-bold flex items-center gap-1">
                        <AlertTriangle className="w-3.5 h-3.5" />
                        <span>Temporarily Out of Stock</span>
                      </span>
                    ) : availability.status === 'invalid_response' ? (
                      <span className="text-rose-600 font-bold flex items-center gap-1">
                        <AlertCircle className="w-3.5 h-3.5" />
                        <span>Invalid Provider Response</span>
                      </span>
                    ) : (
                      <span className="text-rose-600 font-bold flex items-center gap-1">
                        <AlertCircle className="w-3.5 h-3.5" />
                        <span>Provider Unavailable</span>
                      </span>
                    )}
                  </div>

                  {/* Explicit status banner when error or out of stock */}
                  {availability.error && !availability.loading && availability.status !== 'loading' && selectedCountry && selectedService && (
                    <div className={`text-[11px] p-2.5 rounded-xl border mt-1 flex items-start gap-2 ${
                      availability.status === 'out_of_stock'
                        ? 'text-amber-800 bg-amber-50/90 border-amber-200'
                        : 'text-rose-800 bg-rose-50/90 border-rose-200'
                    }`}>
                      {availability.status === 'out_of_stock' ? (
                        <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5 text-amber-600" />
                      ) : (
                        <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5 text-rose-600" />
                      )}
                      <span>{availability.error}</span>
                    </div>
                  )}

                  {/* Authoritative Stock Count Display */}
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-500">Available Numbers:</span>
                    <span className="font-mono font-bold text-slate-900">
                      {!selectedCountry || !selectedService ? (
                        '—'
                      ) : availability.loading || availability.status === 'loading' ? (
                        <span className="text-blue-600 font-normal">Checking live stock...</span>
                      ) : isVerifiedInStock && typeof availability.stock === 'number' ? (
                        <span className="text-emerald-700">{availability.stock.toLocaleString()} in stock</span>
                      ) : availability.status === 'out_of_stock' ? (
                        <span className="text-amber-700">0 in stock</span>
                      ) : availability.status === 'invalid_response' ? (
                        <span className="text-rose-600 font-normal">Invalid response format</span>
                      ) : (
                        <span className="text-rose-600 font-normal">Provider unavailable</span>
                      )}
                    </span>
                  </div>
                </div>

                {/* Final Customer Price Display */}
                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 mb-6 flex items-center justify-between">
                  <div>
                    <div className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Total Price (NGN)</div>
                    <div className="text-2xl font-black text-slate-900 mt-0.5">
                      ₦{availability.price > 0 ? availability.price.toLocaleString('en-US') : '1,352'}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-[10px] text-emerald-600 font-bold flex items-center gap-1 justify-end">
                      <CheckCircle2 className="w-3 h-3" />
                      <span>Instant SMS</span>
                    </div>
                    <div className="text-[10px] text-slate-500 mt-0.5">100% Refund Guarantee</div>
                  </div>
                </div>

                {/* Buy Now Button */}
                <button
                  type="button"
                  onClick={() => {
                    if (!currentUser) {
                      if (onRequireAuth) onRequireAuth();
                      else onNavigate('login');
                      return;
                    }
                    if (currentUser.balance < availability.price) {
                      setActionError('Insufficient wallet balance. Please fund your wallet to continue.');
                      return;
                    }
                    setShowConfirmModal(true);
                  }}
                  disabled={!selectedCountry || !selectedService || !isVerifiedInStock || isPurchasing || availability.loading || availability.status === 'loading'}
                  className={`w-full py-3.5 rounded-2xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer flex items-center justify-center gap-2 shadow-sm ${
                    selectedCountry && selectedService && isVerifiedInStock && !isPurchasing && !availability.loading && availability.status !== 'loading'
                      ? 'bg-blue-600 hover:bg-blue-700 text-white shadow-blue-500/20'
                      : 'bg-slate-100 text-slate-400 cursor-not-allowed border border-slate-200'
                  }`}
                >
                  {isPurchasing ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      <span>Activating Virtual Number...</span>
                    </>
                  ) : !selectedCountry ? (
                    <span>1. Select Country First</span>
                  ) : !selectedService ? (
                    <span>2. Select App or Service</span>
                  ) : availability.loading || availability.status === 'loading' ? (
                    <>
                      <div className="w-4 h-4 border-2 border-slate-400 border-t-transparent rounded-full animate-spin"></div>
                      <span>Checking Live Stock...</span>
                    </>
                  ) : isVerifiedInStock ? (
                    <>
                      <Zap className="w-4 h-4 text-amber-300" />
                      <span>Buy Now • ₦{availability.price.toLocaleString()}</span>
                    </>
                  ) : availability.status === 'out_of_stock' ? (
                    <span>Temporarily Out of Stock</span>
                  ) : availability.status === 'invalid_response' ? (
                    <span>Provider Response Error • Retry</span>
                  ) : (
                    <span>Provider Unavailable • Retry</span>
                  )}
                </button>

                {/* Guarantee notes */}
                <div className="mt-5 space-y-2 text-[11px] text-slate-500">
                  <div className="flex items-start gap-2">
                    <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
                    <span>Real non-VoIP carrier lines verified for SMS OTPs.</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
                    <span>Full 100% auto-refund if verification code is not received.</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: ACTIVE NUMBERS & OTP RETRIEVAL */}
        {activeTab === 'active' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-black text-slate-900">Active Numbers ({activeOrders.length})</h2>
                <p className="text-xs text-slate-500">Numbers are ready to receive SMS verification codes in real time.</p>
              </div>
              <button
                type="button"
                onClick={refreshOrders}
                className="px-3 py-1.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-bold rounded-xl transition-all cursor-pointer flex items-center gap-1.5 shadow-xs"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${pollingOrderId ? 'animate-spin' : ''}`} />
                <span>Refresh Status</span>
              </button>
            </div>

            {activeOrders.length === 0 ? (
              <div className="bg-white border border-slate-200 rounded-3xl p-12 text-center shadow-sm">
                <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center mx-auto mb-3 border border-blue-100">
                  <Smartphone className="w-6 h-6" />
                </div>
                <h3 className="text-base font-bold text-slate-900 mb-1">No Active Virtual Numbers</h3>
                <p className="text-xs text-slate-500 max-w-sm mx-auto mb-5">
                  You don't have any active numbers awaiting SMS codes right now. Select a country and app to buy a number.
                </p>
                <button
                  type="button"
                  onClick={() => setActiveTab('buy')}
                  className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl transition-all cursor-pointer shadow-xs"
                >
                  Get a Number Now
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                {activeOrders.map(order => {
                  const details = (order.customer_details as any) || {};
                  const phoneNumber = details.phone_number || order.product_name;
                  const rawCode = details.verification_code || details.sms_code;
                  const isValidOtp = (c: any) => {
                    if (!c) return false;
                    const s = String(c).trim().toLowerCase();
                    return !['none', 'null', 'undefined', 'n/a', 'na', 'false', 'true', 'waiting', 'pending', '0', '---', 'no code', 'none received'].includes(s);
                  };
                  const code = isValidOtp(rawCode) ? String(rawCode).trim() : null;
                  const hasCode = Boolean(code);
                  const fullSms = details.sms_text || details.full_sms;
                  const providerOrderId = details.order_id || details.provider_order_id || details.activation_id;

                  return (
                    <div
                      key={order.id}
                      className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm relative overflow-hidden"
                    >
                      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-100">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-2xl bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-600 font-bold">
                            📱
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <h4 className="text-sm font-black text-slate-900">{(order as any).service_name || details.service_name || order.product_name}</h4>
                              <span className="px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 text-[10px] font-bold border border-blue-200">
                                {(order as any).platform || details.platform || 'Virtual Line'}
                              </span>
                            </div>
                            <div className="text-[11px] text-slate-500 mt-0.5">
                              Order #{order.order_reference} • ₦{order.amount.toLocaleString()}
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 flex-wrap">
                          <OrderCountdownBadge order={order} onExpire={() => handleAutoExpire(order)} />
                          {hasCode ? (
                            <span className="px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 text-xs font-bold border border-emerald-200 flex items-center gap-1.5">
                              <Check className="w-3 h-3 text-emerald-600" />
                              <span>Code Received</span>
                            </span>
                          ) : details.status_check_error ? (
                            <span className="px-2.5 py-1 rounded-full bg-amber-50 text-amber-700 text-xs font-bold border border-amber-200 flex items-center gap-1.5">
                              <AlertTriangle className="w-3 h-3 text-amber-600" />
                              <span>Line Active • Re-checking</span>
                            </span>
                          ) : (
                            <span className="px-2.5 py-1 rounded-full bg-blue-50 text-blue-700 text-xs font-bold border border-blue-200 flex items-center gap-1.5">
                              <span className="w-1.5 h-1.5 rounded-full bg-blue-600 animate-ping"></span>
                              <span>Waiting for Carrier SMS</span>
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Number Display & SMS Reception Area */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                        {/* Phone Number Box */}
                        <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 flex flex-col justify-between">
                          <div className="text-[11px] text-slate-500 font-bold uppercase tracking-wider mb-1">
                            Phone Number
                          </div>
                          <div className="flex items-center justify-between gap-3">
                            <span className="text-lg font-black font-mono text-slate-900 tracking-wider">
                              {phoneNumber}
                            </span>
                            <button
                              type="button"
                              onClick={() => copyToClipboard(phoneNumber, `num-${order.id}`)}
                              className="px-3 py-1.5 bg-white border border-slate-200 hover:bg-slate-100 text-slate-700 text-xs font-bold rounded-xl transition-all cursor-pointer flex items-center gap-1 shadow-xs"
                            >
                              {copiedKey === `num-${order.id}` ? (
                                <>
                                  <Check className="w-3 h-3 text-emerald-600" />
                                  <span className="text-emerald-600">Copied</span>
                                </>
                              ) : (
                                <>
                                  <Copy className="w-3 h-3" />
                                  <span>Copy</span>
                                </>
                              )}
                            </button>
                          </div>
                          <div className="text-[10px] text-slate-500 mt-2">
                            Paste this number into {(order as any).service_name || details.service_name || 'the app'} to send your code.
                          </div>
                        </div>

                        {/* SMS Code Box */}
                        <div className={`border rounded-2xl p-4 flex flex-col justify-between transition-all ${
                          hasCode
                            ? 'bg-emerald-50/80 border-emerald-200 text-emerald-900'
                            : 'bg-amber-50/60 border-amber-200 text-amber-900'
                        }`}>
                          <div className="flex items-center justify-between text-[11px] font-bold uppercase tracking-wider mb-1">
                            <span>{hasCode ? 'Verification Code (OTP)' : 'Awaiting Carrier SMS'}</span>
                            <div className="flex items-center gap-2">
                              {!hasCode && (
                                <button
                                  type="button"
                                  onClick={() => handleManualStatusCheck(order)}
                                  disabled={pollingOrderId === order.id}
                                  className="text-blue-600 hover:text-blue-800 text-[11px] font-bold flex items-center gap-1 cursor-pointer transition-colors"
                                  title="Check status now"
                                >
                                  <RefreshCw className={`w-3 h-3 ${pollingOrderId === order.id ? 'animate-spin' : ''}`} />
                                  <span>{pollingOrderId === order.id ? 'Checking...' : 'Check Status'}</span>
                                </button>
                              )}
                            </div>
                          </div>

                          {hasCode ? (
                            <div>
                              <div className="flex items-center justify-between gap-3">
                                <span className="text-2xl font-black font-mono tracking-widest text-emerald-700 bg-white px-3 py-1 rounded-xl border border-emerald-200">
                                  {code}
                                </span>
                                <button
                                  type="button"
                                  onClick={() => copyToClipboard(code, `code-${order.id}`)}
                                  className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl transition-all cursor-pointer flex items-center gap-1 shadow-xs"
                                >
                                  {copiedKey === `code-${order.id}` ? (
                                    <>
                                      <Check className="w-3 h-3" />
                                      <span>Copied</span>
                                    </>
                                  ) : (
                                    <>
                                      <Copy className="w-3 h-3" />
                                      <span>Copy Code</span>
                                    </>
                                  )}
                                </button>
                              </div>
                              {fullSms && (
                                <p className="text-[11px] text-emerald-800 mt-2 bg-white/70 p-2 rounded-lg border border-emerald-200 font-mono break-all">
                                  "{fullSms}"
                                </p>
                              )}
                            </div>
                          ) : (
                            <div>
                              <div className="flex items-center gap-2 text-xs text-amber-800 my-1 font-semibold">
                                <div className="w-3 h-3 border-2 border-amber-600 border-t-transparent rounded-full animate-spin"></div>
                                <span>Waiting for SMS code from carrier...</span>
                              </div>
                              <div className="mt-2.5 pt-2.5 border-t border-amber-200/80 flex items-center justify-between flex-wrap gap-2">
                                <span className="text-[11px] font-bold text-amber-900 flex items-center gap-1.5">
                                  <Clock className="w-3.5 h-3.5 text-amber-700" />
                                  <span>20-Min Activation Window:</span>
                                </span>
                                <OrderCountdownBadge order={order} onExpire={() => handleAutoExpire(order)} />
                              </div>
                              <p className="text-[10px] text-amber-700 mt-2">
                                {details.status_check_error ? (
                                  <span className="text-amber-800 font-medium">Carrier line active. Polling line automatically every 4 seconds.</span>
                                ) : (
                                  'System polls carrier line every 4 seconds. If no code arrives before 00:00, line is automatically cancelled and refunded.'
                                )}
                              </p>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Cancel & Refund Controls */}
                      {!hasCode && providerOrderId && (
                        <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between flex-wrap gap-2">
                          <span className="text-[11px] text-slate-500">
                            Haven't received SMS yet? You can cancel for an immediate full wallet refund.
                          </span>
                          <button
                            type="button"
                            onClick={() => handleCancelOrder(order)}
                            disabled={cancellingOrderId === order.id}
                            className="px-3 py-1.5 bg-white hover:bg-rose-50 border border-slate-200 hover:border-rose-200 text-rose-600 text-xs font-bold rounded-xl transition-all cursor-pointer flex items-center gap-1.5 shadow-xs disabled:opacity-50"
                          >
                            {cancellingOrderId === order.id ? (
                              <>
                                <RefreshCw className="w-3 h-3 animate-spin" />
                                <span>Cancelling & Refunding...</span>
                              </>
                            ) : (
                              <>
                                <X className="w-3 h-3" />
                                <span>Cancel & Refund ₦{order.amount.toLocaleString()}</span>
                              </>
                            )}
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* TAB 3: ORDER HISTORY */}
        {activeTab === 'history' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-black text-slate-900">Virtual Number History ({historyOrders.length})</h2>
                <p className="text-xs text-slate-500">Past activations, completed verifications, and refunds.</p>
              </div>
            </div>

            {historyOrders.length === 0 ? (
              <div className="bg-white border border-slate-200 rounded-3xl p-12 text-center shadow-sm">
                <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto mb-3">
                  <Clock className="w-6 h-6 text-slate-400" />
                </div>
                <h3 className="text-base font-bold text-slate-900 mb-1">No Past Orders Found</h3>
                <p className="text-xs text-slate-500 max-w-sm mx-auto">
                  When you activate virtual numbers, your receipt history and OTP codes will be securely recorded here.
                </p>
              </div>
            ) : (
              <div className="bg-white border border-slate-200 rounded-3xl overflow-hidden shadow-xs">
                {/* Mobile View: Clean Card Layout */}
                <div className="block md:hidden divide-y divide-slate-100">
                  {historyOrders.map(order => {
                    const details = (order.customer_details as any) || {};
                    const phoneNumber = details.phone_number || order.product_name;
                    const rawCode = details.verification_code || details.sms_code;
                    const isValidCode = (c: any) => {
                      if (!c) return false;
                      const s = String(c).trim().toLowerCase();
                      return !['none', 'null', 'undefined', 'n/a', 'na', 'false', 'true', 'waiting', 'pending', '0', '---', 'no code', 'none received'].includes(s);
                    };
                    const code = isValidCode(rawCode) ? String(rawCode).trim() : null;

                    return (
                      <div key={`mob-hist-${order.id}`} className="p-4 space-y-2.5">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <span className="text-[10px] font-bold text-blue-600 uppercase tracking-wider block">Service</span>
                            <h4 className="font-bold text-slate-900 text-sm">
                              {(order as any).service_name || details.service_name || order.product_name}
                            </h4>
                          </div>
                          <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border shrink-0 ${
                            order.status === 'completed'
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                              : order.status === 'cancelled' || order.status === 'refunded'
                              ? 'bg-slate-100 text-slate-600 border-slate-200'
                              : 'bg-blue-50 text-blue-700 border-blue-200'
                          }`}>
                            {details.status_label || (order.status === 'cancelled' ? 'Expired / Cancelled' : order.status)}
                          </span>
                        </div>

                        <div className="space-y-1.5 text-xs">
                          <div className="flex items-center justify-between">
                            <span className="text-slate-500">Order Ref:</span>
                            <span className="font-mono font-bold text-slate-900">#{order.order_reference}</span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-slate-500">Phone Number:</span>
                            <span className="font-mono font-semibold text-slate-800">{phoneNumber}</span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-slate-500">OTP Code:</span>
                            {code ? (
                              <span className="text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded border border-emerald-200 font-mono font-black text-xs">
                                {code}
                              </span>
                            ) : (
                              <span className="text-slate-400 font-mono">—</span>
                            )}
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-slate-500">Amount:</span>
                            <span className="font-bold text-slate-900">₦{order.amount.toLocaleString()}</span>
                          </div>
                          <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1 border-t border-slate-100">
                            <span>Date:</span>
                            <span>{new Date(order.created_at).toLocaleString()}</span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Tablet / Desktop View: Clean Non-Squeezed Table */}
                <div className="hidden md:block overflow-x-auto table-responsive">
                  <table className="w-full text-left text-xs min-w-[720px]">
                    <thead className="bg-slate-50 text-slate-500 font-bold border-b border-slate-200 uppercase tracking-wider text-[10px]">
                      <tr>
                        <th className="py-3.5 px-4 whitespace-nowrap">Date</th>
                        <th className="py-3.5 px-4 whitespace-nowrap">Order Ref</th>
                        <th className="py-3.5 px-4 whitespace-nowrap">Service</th>
                        <th className="py-3.5 px-4 whitespace-nowrap">Phone Number</th>
                        <th className="py-3.5 px-4 whitespace-nowrap">OTP Code</th>
                        <th className="py-3.5 px-4 whitespace-nowrap">Amount</th>
                        <th className="py-3.5 px-4 text-right whitespace-nowrap">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-slate-700">
                      {historyOrders.map(order => {
                        const details = (order.customer_details as any) || {};
                        const phoneNumber = details.phone_number || order.product_name;
                        const rawCode = details.verification_code || details.sms_code;
                        const isValidCode = (c: any) => {
                          if (!c) return false;
                          const s = String(c).trim().toLowerCase();
                          return !['none', 'null', 'undefined', 'n/a', 'na', 'false', 'true', 'waiting', 'pending', '0', '---', 'no code', 'none received'].includes(s);
                        };
                        const code = isValidCode(rawCode) ? String(rawCode).trim() : null;

                        return (
                          <tr key={order.id} className="hover:bg-slate-50/70 transition-colors">
                            <td className="py-3.5 px-4 text-slate-500 whitespace-nowrap">
                              {new Date(order.created_at).toLocaleDateString()}
                            </td>
                            <td className="py-3.5 px-4 font-mono font-bold text-slate-900 whitespace-nowrap">
                              #{order.order_reference}
                            </td>
                            <td className="py-3.5 px-4 font-bold text-slate-900 whitespace-nowrap">
                              {(order as any).service_name || details.service_name || order.product_name}
                            </td>
                            <td className="py-3.5 px-4 font-mono text-slate-800 whitespace-nowrap">
                              {phoneNumber}
                            </td>
                            <td className="py-3.5 px-4 font-mono font-bold whitespace-nowrap">
                              {code ? (
                                <span className="text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                                  {code}
                                </span>
                              ) : (
                                <span className="text-slate-400">—</span>
                              )}
                            </td>
                            <td className="py-3.5 px-4 font-bold text-slate-900 whitespace-nowrap">
                              ₦{order.amount.toLocaleString()}
                            </td>
                            <td className="py-3.5 px-4 text-right whitespace-nowrap">
                              <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold border ${
                                order.status === 'completed'
                                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                  : order.status === 'cancelled' || order.status === 'refunded'
                                  ? 'bg-slate-100 text-slate-600 border-slate-200'
                                  : 'bg-blue-50 text-blue-700 border-blue-200'
                              }`}>
                                {details.status_label || (order.status === 'cancelled' ? 'Expired / Cancelled' : order.status)}
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}

        {/* PURCHASE CONFIRMATION MODAL */}
        {showConfirmModal && selectedCountry && selectedService && (
          <div 
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs"
            onClick={(e) => { if (e.target === e.currentTarget) setShowConfirmModal(false); }}
            onTouchMove={(e) => { if (e.target === e.currentTarget) e.preventDefault(); }}
          >
            <div className="bg-white border border-slate-200 rounded-3xl p-5 sm:p-7 max-w-md w-full max-h-[calc(100dvh-2rem)] overflow-y-auto overscroll-contain sp-overlay-scroll shadow-2xl space-y-5 animate-in fade-in zoom-in duration-150">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
                    🛒
                  </div>
                  <h3 className="font-black text-base text-slate-900">Confirm Order</h3>
                </div>
                <button
                  type="button"
                  onClick={() => setShowConfirmModal(false)}
                  className="text-slate-400 hover:text-slate-700 cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <p className="text-xs text-slate-600 leading-relaxed">
                You are about to purchase an international virtual number for:
              </p>

              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-2.5 text-xs">
                <div className="flex justify-between">
                  <span className="text-slate-500">Country:</span>
                  <span className="font-bold text-slate-900 flex items-center gap-1">
                    <span>{selectedCountry.flag}</span>
                    <span>{selectedCountry.name}</span>
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Service:</span>
                  <span className="font-bold text-slate-900">{selectedService.name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Available Stock:</span>
                  <span className="font-mono font-bold text-emerald-600">
                    {typeof availability.stock === 'number' && availability.stock > 0
                      ? `${availability.stock.toLocaleString()} lines`
                      : 'Verified in stock'}
                  </span>
                </div>
                <div className="flex justify-between pt-2 border-t border-slate-200 font-bold">
                  <span className="text-slate-700">Total Price:</span>
                  <span className="text-sm text-slate-900">₦{availability.price.toLocaleString()}</span>
                </div>
              </div>

              <div className="flex items-center gap-2 text-[11px] text-slate-500 bg-blue-50/80 p-3 rounded-xl border border-blue-200">
                <ShieldCheck className="w-4 h-4 text-blue-600 shrink-0" />
                <span>If no SMS code is received within 15 minutes, your ₦{availability.price.toLocaleString()} is fully auto-refunded.</span>
              </div>

              <div className="flex flex-col-reverse sm:flex-row items-stretch sm:items-center gap-2.5 sm:gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowConfirmModal(false)}
                  className="w-full sm:flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition-colors cursor-pointer border border-slate-200"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleExecutePurchase}
                  disabled={isPurchasing}
                  className="w-full sm:flex-1 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl transition-all cursor-pointer shadow-sm shadow-blue-500/20 flex items-center justify-center gap-1.5 disabled:opacity-50"
                >
                  {isPurchasing ? (
                    <>
                      <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      <span>Activating...</span>
                    </>
                  ) : (
                    <span>Confirm & Pay ₦{availability.price.toLocaleString()}</span>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};
