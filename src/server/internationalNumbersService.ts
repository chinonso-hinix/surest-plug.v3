import fs from 'fs';
import path from 'path';

/**
 * Surest Plug - International Numbers Isolated Provider Service (Server-Side)
 * Strictly server-side: API keys and upstream vendor details are never exposed to the client.
 */

function getProviderBaseUrl(): string {
  let url = (process.env.INSTANTNUM_BASE_URL || process.env.INSTANTNUMS_BASE_URL || 'https://instantnums.com/v1').trim();
  if (!url) return 'https://instantnums.com/v1';
  // Strip quotes if accidentally entered
  url = url.replace(/^["']|["']$/g, '').trim();
  if (!/^https?:\/\//i.test(url)) {
    url = 'https://' + url;
  }
  url = url.replace(/\/+$/, '');
  if (!/\/v1$/i.test(url)) {
    url += '/v1';
  }
  return url;
}

function getProviderApiKey(): string {
  const raw = (process.env.INSTANTNUM_API_KEY || process.env.INSTANTNUMS_API_KEY || '').trim();
  return raw.replace(/^["']|["']$/g, '').trim();
}

export interface PricingConfig {
  usd_to_ngn_rate: number;
  markup_below_1000_ngn: number;
  markup_1000_and_above_ngn: number;
}

let pricingConfig: PricingConfig = {
  usd_to_ngn_rate: Number(process.env.INSTANTNUMS_USD_TO_NGN_RATE || 1600),
  markup_below_1000_ngn: Number(process.env.INSTANTNUMS_MARKUP_BELOW_1000_NGN || 1000),
  markup_1000_and_above_ngn: Number(process.env.INSTANTNUMS_MARKUP_1000_AND_ABOVE_NGN || 2000)
};

export function getPricingConfig(): PricingConfig {
  return { ...pricingConfig };
}

export function updatePricingConfig(newConfig: Partial<PricingConfig>): PricingConfig {
  if (typeof newConfig.usd_to_ngn_rate === 'number' && newConfig.usd_to_ngn_rate > 0) {
    pricingConfig.usd_to_ngn_rate = newConfig.usd_to_ngn_rate;
  }
  if (typeof newConfig.markup_below_1000_ngn === 'number' && newConfig.markup_below_1000_ngn >= 0) {
    pricingConfig.markup_below_1000_ngn = newConfig.markup_below_1000_ngn;
  }
  if (typeof newConfig.markup_1000_and_above_ngn === 'number' && newConfig.markup_1000_and_above_ngn >= 0) {
    pricingConfig.markup_1000_and_above_ngn = newConfig.markup_1000_and_above_ngn;
  }
  return { ...pricingConfig };
}

/**
 * Calculate retail customer price in NGN from upstream wholesale cost (USD)
 */
export function calculateRetailPrice(costUsd: number): {
  costUsd: number;
  rate: number;
  supplierCostNgn: number;
  customerPrice: number;
  markupNgn: number;
} {
  const rate = pricingConfig.usd_to_ngn_rate;
  const supplierCostNgn = Math.round(costUsd * rate * 100) / 100;
  const markupNgn = supplierCostNgn < 1000
    ? pricingConfig.markup_below_1000_ngn
    : pricingConfig.markup_1000_and_above_ngn;
  const customerPrice = Math.round((supplierCostNgn + markupNgn) * 100) / 100;

  return {
    costUsd,
    rate,
    supplierCostNgn,
    customerPrice,
    markupNgn
  };
}

/**
 * Canonical country resolver mapping country codes/names to provider numeric ID
 */
export function resolveCanonicalCountry(input: string | number): string {
  const raw = String(input || '').trim();
  if (!raw) return '1';
  if (/^\d+$/.test(raw)) return raw;

  // Strip parenthetical text e.g. "United Kingdom (UK)" -> "United Kingdom", "USA (+1)" -> "USA"
  const withoutParens = raw.replace(/\(.*?\)/g, '').trim().toLowerCase();
  const insideParens = (raw.match(/\((.*?)\)/)?.[1] || '').trim().toLowerCase().replace(/^\+/, '');
  const str = withoutParens.replace(/['"]/g, '').replace(/\s+/g, ' ').trim();

  // USA and popular countries
  if (['usa', 'us', 'united states', 'united states of america', 'america', 'u.s.a.', 'u.s.', 'u.s', '1'].includes(str) || ['us', 'usa', '1'].includes(insideParens)) {
    return '1';
  }
  if (['uk', 'gb', 'united kingdom', 'great britain', 'england', 'britain', '44'].includes(str) || ['uk', 'gb', '44'].includes(insideParens)) {
    return '2';
  }
  if (['netherlands', 'holland', 'nl', '31'].includes(str) || insideParens === 'nl') return '3';
  if (['latvia', 'lv'].includes(str)) return '5';
  if (['sweden', 'se'].includes(str)) return '6';
  if (['russia', 'ru', 'kazakhstan', 'kz'].includes(str)) return '7';
  if (['portugal', 'pt'].includes(str)) return '8';
  if (['indonesia', 'id'].includes(str)) return '9';
  if (['estonia', 'ee'].includes(str)) return '10';
  if (['vietnam', 'vn'].includes(str)) return '11';
  if (['philippines', 'ph'].includes(str)) return '12';
  if (['romania', 'ro'].includes(str)) return '13';
  if (['nigeria', 'ng', '234'].includes(str) || insideParens === 'ng') return '14';
  if (['india', 'in', '91'].includes(str) || insideParens === 'in') return '15';
  if (['kenya', 'ke', '254'].includes(str) || insideParens === 'ke') return '16';
  if (['denmark', 'dk'].includes(str)) return '19';
  if (['malaysia', 'my'].includes(str)) return '20';
  if (['poland', 'pl'].includes(str)) return '21';
  if (['france', 'fr', '33'].includes(str) || insideParens === 'fr') return '23';
  if (['germany', 'de', '49'].includes(str) || insideParens === 'de') return '24';
  if (['ukraine', 'ua'].includes(str)) return '25';
  if (['egypt', 'eg', '20'].includes(str)) return '31';
  if (['ireland', 'ie'].includes(str)) return '32';
  if (['canada', 'ca'].includes(str) || insideParens === 'ca') return '36';
  if (['ghana', 'gh', '233'].includes(str) || insideParens === 'gh') return '42';
  if (['argentina', 'ar'].includes(str)) return '43';
  if (['cameroon', 'cm'].includes(str)) return '45';
  if (['mexico', 'mx'].includes(str)) return '53';
  if (['spain', 'es'].includes(str)) return '55';
  if (['turkey', 'tr'].includes(str)) return '60';
  if (['brazil', 'br', '55'].includes(str) || insideParens === 'br') return '68';
  if (['italy', 'it'].includes(str)) return '79';
  if (['south africa', 'za', '27'].includes(str) || insideParens === 'za') return '153';
  if (['australia', 'au', '61'].includes(str) || insideParens === 'au') return '159';

  return raw;
}

export type ProviderStatus =
  | 'AVAILABLE'
  | 'OUT_OF_STOCK'
  | 'PROVIDER_UNAVAILABLE'
  | 'PROVIDER_INSUFFICIENT_BALANCE'
  | 'INVALID_RESPONSE'
  | 'TIMEOUT'
  | 'API_ERROR';

/**
 * Classifies raw provider errors into strict architectural states
 */
export function classifyProviderError(rawError?: string): {
  code: ProviderStatus;
  customerMessage: string;
  adminDetails: string;
} {
  if (!rawError) {
    return {
      code: 'PROVIDER_UNAVAILABLE',
      customerMessage: 'Number service is temporarily unavailable. Please try again shortly.',
      adminDetails: 'Unknown provider error.'
    };
  }

  const lower = rawError.toLowerCase();

  // Check for provider wallet / wholesale balance / insufficient funds
  // Provider balance != stock availability! This is a funding error, NOT out of stock.
  if (
    lower.includes('balance') ||
    lower.includes('need $') ||
    lower.includes('insufficient') ||
    lower.includes('fund') ||
    lower.includes('credit') ||
    lower.includes('wallet') ||
    lower.includes('usd') ||
    lower.includes('account balance')
  ) {
    return {
      code: 'PROVIDER_INSUFFICIENT_BALANCE',
      customerMessage: 'Number service is temporarily unavailable. Please try again shortly.',
      adminDetails: rawError
    };
  }

  // Check for genuine OUT OF STOCK
  if (
    lower.includes('out of stock') ||
    lower.includes('no number') ||
    lower.includes('no_numbers') ||
    lower.includes('not enough numbers') ||
    lower.includes('no available number')
  ) {
    return {
      code: 'OUT_OF_STOCK',
      customerMessage: 'Numbers are temporarily out of stock for this selection. Please try another country or app.',
      adminDetails: rawError
    };
  }

  // General API/Rate limit/Network/Server error
  return {
    code: 'PROVIDER_UNAVAILABLE',
    customerMessage: 'Number service is temporarily unavailable. Please try again shortly.',
    adminDetails: rawError
  };
}

/**
 * Sanitizes supplier/provider error messages to ensure zero financial or account information leaks
 */
export function sanitizeProviderError(rawError?: string): string {
  return classifyProviderError(rawError).customerMessage;
}

/**
 * Internal upstream HTTP requester
 */
async function callUpstreamApi(endpoint: string, options: { method?: string; body?: any; params?: Record<string, string> } = {}) {
  const apiKey = getProviderApiKey();

  if (!apiKey) {
    return {
      success: false,
      errorCode: 'API_ERROR' as ProviderStatus,
      error: 'International numbers provider is not configured with an API key.',
      adminDetails: 'Missing INSTANTNUM_API_KEY or INSTANTNUMS_API_KEY environment variable.'
    };
  }

  const cleanEndpoint = '/' + endpoint.replace(/^\/+/, '');
  let url = `${getProviderBaseUrl()}${cleanEndpoint}`;

  if (options.params && Object.keys(options.params).length > 0) {
    const searchParams = new URLSearchParams(options.params);
    url += (url.includes('?') ? '&' : '?') + searchParams.toString();
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 12000);

  try {
    const fetchOptions: RequestInit = {
      method: options.method || 'GET',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Accept': 'application/json',
        'User-Agent': 'SurestPlug-InternationalNumbers/2.0'
      },
      signal: controller.signal
    };

    if (options.body && options.method === 'POST') {
      fetchOptions.headers = {
        ...fetchOptions.headers,
        'Content-Type': 'application/json'
      };
      fetchOptions.body = JSON.stringify(options.body);
    }

    const response = await fetch(url, fetchOptions);
    clearTimeout(timeoutId);

    const text = await response.text();
    let data: any = null;
    try {
      data = JSON.parse(text);
    } catch {
      return {
        success: false,
        errorCode: 'INVALID_RESPONSE' as ProviderStatus,
        error: 'Invalid response format received from international numbers provider.',
        adminDetails: text.slice(0, 200)
      };
    }

    if (response.ok) {
      if (data && typeof data.success !== 'undefined' && (data.success === 0 || data.success === false)) {
        const rawErr = data?.message || data?.error || 'Provider returned unsuccessful response';
        const classified = classifyProviderError(rawErr);
        return {
          success: false,
          errorCode: classified.code,
          error: classified.customerMessage,
          adminDetails: classified.adminDetails,
          data
        };
      }
      return { success: true, data };
    }

    const rawErr = data?.message || data?.error || `Provider error (${response.status})`;
    const classified = classifyProviderError(rawErr);
    return {
      success: false,
      errorCode: classified.code,
      error: classified.customerMessage,
      adminDetails: classified.adminDetails,
      data
    };
  } catch (err: any) {
    clearTimeout(timeoutId);
    const isTimeout = err?.name === 'AbortError';
    return {
      success: false,
      errorCode: (isTimeout ? 'TIMEOUT' : 'PROVIDER_UNAVAILABLE') as ProviderStatus,
      error: isTimeout
        ? 'Request to international numbers provider timed out.'
        : 'Network error connecting to international numbers provider.',
      adminDetails: err?.message || String(err)
    };
  }
}

/**
 * Static Fallback Countries List
 */
const DEFAULT_COUNTRIES = [
  { id: '1', name: 'USA', code: 'us', flag: '🇺🇸', prefix: '+1' },
  { id: '2', name: 'United Kingdom (UK)', code: 'uk', flag: '🇬🇧', prefix: '+44' },
  { id: '3', name: 'Netherlands', code: 'nl', flag: '🇳🇱', prefix: '+31' },
  { id: '23', name: 'France', code: 'fr', flag: '🇫🇷', prefix: '+33' },
  { id: '24', name: 'Germany', code: 'de', flag: '🇩🇪', prefix: '+49' },
  { id: '68', name: 'Brazil', code: 'br', flag: '🇧🇷', prefix: '+55' },
  { id: '15', name: 'India', code: 'in', flag: '🇮🇳', prefix: '+91' },
  { id: '14', name: 'Nigeria', code: 'ng', flag: '🇳🇬', prefix: '+234' },
  { id: '42', name: 'Ghana', code: 'gh', flag: '🇬🇭', prefix: '+233' },
  { id: '16', name: 'Kenya', code: 'ke', flag: '🇰🇪', prefix: '+254' },
  { id: '70', name: 'Uganda', code: 'ug', flag: '🇺🇬', prefix: '+256' },
  { id: '71', name: 'Angola', code: 'ao', flag: '🇦🇴', prefix: '+244' },
  { id: '9', name: 'Indonesia', code: 'id', flag: '🇮🇩', prefix: '+62' },
  { id: '12', name: 'Philippines', code: 'ph', flag: '🇵🇭', prefix: '+63' },
  { id: '11', name: 'Vietnam', code: 'vn', flag: '🇻🇳', prefix: '+84' },
  { id: '20', name: 'Malaysia', code: 'my', flag: '🇲🇾', prefix: '+60' },
  { id: '52', name: 'Thailand', code: 'th', flag: '🇹🇭', prefix: '+66' },
  { id: '21', name: 'Poland', code: 'pl', flag: '🇵🇱', prefix: '+48' },
  { id: '25', name: 'Ukraine', code: 'ua', flag: '🇺🇦', prefix: '+380' },
  { id: '60', name: 'Turkey', code: 'tr', flag: '🇹🇷', prefix: '+90' },
  { id: '55', name: 'Spain', code: 'es', flag: '🇪🇸', prefix: '+34' },
  { id: '79', name: 'Italy', code: 'it', flag: '🇮🇹', prefix: '+39' },
  { id: '50', name: 'Austria', code: 'at', flag: '🇦🇹', prefix: '+43' },
  { id: '75', name: 'Belgium', code: 'be', flag: '🇧🇪', prefix: '+32' },
  { id: '53', name: 'Mexico', code: 'mx', flag: '🇲🇽', prefix: '+52' },
  { id: '39', name: 'Colombia', code: 'co', flag: '🇨🇴', prefix: '+57' },
  { id: '43', name: 'Argentina', code: 'ar', flag: '🇦🇷', prefix: '+54' },
  { id: '31', name: 'Egypt', code: 'eg', flag: '🇪🇬', prefix: '+20' },
  { id: '82', name: 'Tunisia', code: 'tn', flag: '🇹🇳', prefix: '+216' },
  { id: '41', name: 'Morocco', code: 'ma', flag: '🇲🇦', prefix: '+212' },
  { id: '88', name: 'Kuwait', code: 'kw', flag: '🇰🇼', prefix: '+965' },
  { id: '92', name: 'Qatar', code: 'qa', flag: '🇶🇦', prefix: '+974' },
  { id: '91', name: 'Oman', code: 'om', flag: '🇴🇲', prefix: '+968' },
  { id: '29', name: 'Israel', code: 'il', flag: '🇮🇱', prefix: '+972' }
];

/**
 * Static Fallback Popular Services List
 */
const DEFAULT_SERVICES = [
  { id: '924', name: 'TikTok/Douyin', category: 'social', popular: true },
  { id: '900', name: 'WhatsApp', category: 'messaging', popular: true },
  { id: '901', name: 'Telegram', category: 'messaging', popular: true },
  { id: '902', name: 'Google / Gmail / YouTube', category: 'tech', popular: true },
  { id: '903', name: 'Instagram', category: 'social', popular: true },
  { id: '904', name: 'Facebook', category: 'social', popular: true },
  { id: '905', name: 'X / Twitter', category: 'social', popular: true },
  { id: '906', name: 'OpenAI / ChatGPT', category: 'ai', popular: true },
  { id: '907', name: 'Netflix', category: 'entertainment', popular: true },
  { id: '908', name: 'Discord', category: 'gaming', popular: true },
  { id: '909', name: 'PayPal', category: 'finance', popular: true },
  { id: '910', name: 'Snapchat', category: 'social', popular: true },
  { id: '911', name: 'Amazon', category: 'shopping', popular: true },
  { id: '912', name: 'Apple', category: 'tech', popular: true },
  { id: '913', name: 'LinkedIn', category: 'business', popular: true },
  { id: '914', name: 'Tinder', category: 'dating', popular: true },
  { id: '915', name: 'Steam', category: 'gaming', popular: true },
  { id: '916', name: 'Uber / UberEats', category: 'transport', popular: true },
  { id: '917', name: 'Coinbase', category: 'crypto', popular: true },
  { id: '918', name: 'Binance', category: 'crypto', popular: true },
  { id: '919', name: 'WeChat', category: 'messaging', popular: false },
  { id: '920', name: 'Viber', category: 'messaging', popular: false },
  { id: '921', name: 'LINE', category: 'messaging', popular: false },
  { id: '922', name: 'Claude / Anthropic', category: 'ai', popular: true },
  { id: '923', name: 'Claude AI', category: 'ai', popular: true },
  { id: '925', name: 'Spotify', category: 'music', popular: true }
];

/**
 * 1. Get Countries
 */
export async function getCountries(): Promise<{ success: boolean; countries: any[] }> {
  const result = await callUpstreamApi('/countries');
  if (result.success && result.data) {
    const rawList = result.data.countries || (Array.isArray(result.data) ? result.data : []);
    if (Array.isArray(rawList) && rawList.length > 0) {
      const normalized = rawList.map((c: any) => {
        const id = String(c.ID ?? c.id ?? c.country_id ?? c.code ?? resolveCanonicalCountry(c.name || ''));
        const rawName = String(c.name || c.country_name || id);
        let displayName = rawName;
        if (id === '1' || rawName.toLowerCase().includes('united states') || rawName.toLowerCase() === 'usa') {
          displayName = 'USA';
        } else if (id === '2' || rawName.toLowerCase().includes('kingdom') || rawName.toLowerCase() === 'uk') {
          displayName = 'United Kingdom (UK)';
        }
        return {
          id: resolveCanonicalCountry(id || displayName),
          name: displayName,
          code: String(c.short_name || c.code || c.iso || id).toLowerCase(),
          flag: c.flag || '',
          prefix: c.cc ? `+${c.cc}` : (c.prefix || '')
        };
      });
      return { success: true, countries: normalized };
    }
  }

  // Fallback to rich default list if upstream is unavailable
  return { success: true, countries: DEFAULT_COUNTRIES };
}

/**
 * 2. Get Services (scoped to country when provided)
 */
export async function getServices(country?: string): Promise<{ success: boolean; services: any[] }> {
  const params: Record<string, string> = {};
  if (country) {
    params.country = resolveCanonicalCountry(country);
  }
  const result = await callUpstreamApi('/services', { params });
  if (result.success && result.data) {
    const rawList = result.data.services || (Array.isArray(result.data) ? result.data : []);
    if (Array.isArray(rawList) && rawList.length > 0) {
      const normalized = rawList.map((s: any) => ({
        id: String(s.ID ?? s.id ?? s.service_id ?? s.code ?? ''),
        name: String(s.name || s.title || s.service_name || ''),
        category: s.category || 'other',
        popular: !!(s.popular || s.is_popular || s.favourite)
      }));
      return { success: true, services: normalized };
    }
  }

  return { success: true, services: DEFAULT_SERVICES };
}

/**
 * 3. Get Stock
 * Never coerces undefined, null, or API errors into 0 stock or OUT_OF_STOCK.
 */
export async function getStock(country: string, service: string): Promise<{
  success: boolean;
  stock: number | null;
  status: ProviderStatus;
  error?: string;
}> {
  const canonicalCountry = resolveCanonicalCountry(country);
  const result = await callUpstreamApi('/stock', {
    method: 'GET',
    params: { service: String(service), country: canonicalCountry }
  });

  if (!result.success || !result.data) {
    const status: ProviderStatus =
      result.errorCode === 'TIMEOUT' ? 'TIMEOUT' :
      result.errorCode === 'INVALID_RESPONSE' ? 'INVALID_RESPONSE' :
      result.errorCode === 'PROVIDER_INSUFFICIENT_BALANCE' ? 'PROVIDER_INSUFFICIENT_BALANCE' :
      'PROVIDER_UNAVAILABLE';

    return {
      success: false,
      stock: null, // NEVER default to 0 on failure!
      status,
      error: result.error || 'Failed to retrieve stock from provider.'
    };
  }

  const raw = result.data;
  let detectedStock: number | null = null;

  // Inspect known provider fields without JavaScript truthiness traps
  const candidates = [
    raw.available,
    raw.stock,
    raw.count,
    raw.quantity,
    raw.data?.available,
    raw.data?.stock
  ];

  for (const c of candidates) {
    if (typeof c === 'number' && !isNaN(c)) {
      detectedStock = c;
      break;
    } else if (typeof c === 'string' && c.trim() !== '' && !isNaN(Number(c))) {
      detectedStock = Number(c);
      break;
    }
  }

  // If the provider returned a response missing a verified numeric stock field, do not invent 0
  if (detectedStock === null) {
    return {
      success: false,
      stock: null,
      status: 'INVALID_RESPONSE',
      error: 'Provider response did not contain a valid numeric stock value.'
    };
  }

  const stock = Math.max(0, detectedStock);
  return {
    success: true,
    stock,
    status: stock > 0 ? 'AVAILABLE' : 'OUT_OF_STOCK'
  };
}

/**
 * 4. Get Price
 */
export async function getPrice(country: string, service: string): Promise<{
  success: boolean;
  price: number;
  costUsd?: number;
  error?: string;
}> {
  const canonicalCountry = resolveCanonicalCountry(country);
  const result = await callUpstreamApi('/price', {
    method: 'GET',
    params: { service: String(service), country: canonicalCountry }
  });

  if (!result.success || !result.data) {
    return {
      success: false,
      price: 1352,
      error: result.error || 'Failed to check price from provider'
    };
  }

  const raw = result.data;
  let costUsd: number | null = null;
  const candidates = [raw.price_usd, raw.cost_usd, raw.price, raw.cost, raw.data?.price_usd, raw.data?.cost_usd];
  for (const c of candidates) {
    if (typeof c === 'number' && !isNaN(c)) {
      costUsd = c;
      break;
    } else if (typeof c === 'string' && c.trim() !== '' && !isNaN(Number(c))) {
      costUsd = Number(c);
      break;
    }
  }

  const finalCostUsd = costUsd !== null ? costUsd : 0.22;
  const pricing = calculateRetailPrice(finalCostUsd);

  return {
    success: true,
    price: pricing.customerPrice,
    costUsd: finalCostUsd
  };
}

/**
 * 5. Get Combined Availability
 * Strictly distinguishes AVAILABLE, OUT_OF_STOCK, PROVIDER_UNAVAILABLE, and INVALID_RESPONSE.
 */
export async function getAvailability(country: string, service: string): Promise<{
  success: boolean;
  available: boolean;
  stock: number | null;
  price: number;
  status: ProviderStatus;
  error?: string;
}> {
  const canonicalCountry = resolveCanonicalCountry(country);

  // Fetch stock and price in parallel
  const [stockRes, priceRes] = await Promise.all([
    getStock(canonicalCountry, service),
    getPrice(canonicalCountry, service)
  ]);

  const price = (priceRes.success && typeof priceRes.price === 'number') ? priceRes.price : 1352;

  // RULE: If stock lookup was NOT successful, the result is an API failure, NEVER out of stock!
  if (!stockRes.success || stockRes.stock === null || typeof stockRes.stock !== 'number') {
    return {
      success: false,
      available: false,
      stock: null,
      price,
      status: stockRes.status || 'PROVIDER_UNAVAILABLE',
      error: stockRes.error || 'Unable to verify live stock with provider.'
    };
  }

  // At this point, stock is verified to be a real number from the provider
  const verifiedStock = stockRes.stock;
  if (verifiedStock > 0) {
    return {
      success: true,
      available: true,
      stock: verifiedStock,
      price,
      status: 'AVAILABLE'
    };
  } else {
    // Only OUT_OF_STOCK when the provider explicitly returned 0 available
    return {
      success: true,
      available: false,
      stock: 0,
      price,
      status: 'OUT_OF_STOCK',
      error: 'Numbers are temporarily out of stock for this selection.'
    };
  }
}

/**
 * OTP Code Sanitizer
 * Rejects placeholder texts such as "None", "null", "undefined", "N/A", "false", or non-OTP words.
 * NEVER returns "None" as an OTP code.
 */
export function sanitizeOtpCode(val: any): string | null {
  if (val === null || val === undefined) return null;
  const str = String(val).trim();
  if (!str) return null;

  const forbidden = [
    'none',
    'null',
    'undefined',
    'n/a',
    'na',
    'false',
    'true',
    'waiting',
    'pending',
    '0',
    '---',
    'no code',
    'none received',
    'awaiting'
  ];

  if (forbidden.includes(str.toLowerCase())) {
    return null;
  }

  // If it's a full sentence, try extracting a 4 to 8 digit OTP or return null
  if (str.length > 25 && str.includes(' ')) {
    const match = str.match(/\b\d{4,8}\b/);
    return match ? match[0] : null;
  }

  return str;
}

/**
 * Sanitize SMS Text
 * HTML-escapes content before client rendering to prevent script injection.
 */
export function sanitizeSmsText(val: any): string | null {
  if (val === null || val === undefined) return null;
  const str = String(val).trim();
  if (!str) return null;

  const forbidden = ['none', 'null', 'undefined', 'n/a', 'na', 'false'];
  if (forbidden.includes(str.toLowerCase())) return null;

  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

export type IntlNormalizedStatus =
  | 'purchased'
  | 'waiting'
  | 'received'
  | 'completed'
  | 'cancelled'
  | 'refunded'
  | 'expired'
  | 'cancellation_pending'
  | 'error';

export interface ServerIntlOrder {
  id: string;
  orderId: string;
  userId?: string;
  userEmail?: string;
  orderReference?: string;
  countryId: string;
  countryName?: string;
  serviceId: string;
  serviceName?: string;
  phoneNumber: string;
  customerPrice: number;
  costUsd: number;
  providerStatus: string;
  normalizedStatus: IntlNormalizedStatus;
  statusLabel: string;
  sms: string | null;
  fullSms: string | null;
  purchasedAt: string;
  expiresAt: string;
  receivedAt?: string | null;
  createdAt: string;
  updatedAt: string;
  refunded?: boolean;
  cancelledAt?: string | null;
  providerCancelled?: boolean;
  cancellationPending?: boolean;
  cancellationAttempts?: number;
  cancellationError?: string | null;
}

const ORDERS_FILE = path.resolve(process.cwd(), 'intl_orders_store.json');

function loadOrdersFromDisk(): ServerIntlOrder[] {
  try {
    if (fs.existsSync(ORDERS_FILE)) {
      const content = fs.readFileSync(ORDERS_FILE, 'utf-8');
      return JSON.parse(content) || [];
    }
  } catch (e) {
    console.warn('[Server Orders] Failed to read intl_orders_store.json:', e);
  }
  return [];
}

let serverOrdersCache: ServerIntlOrder[] = loadOrdersFromDisk();

function persistOrdersToDisk() {
  try {
    fs.writeFileSync(ORDERS_FILE, JSON.stringify(serverOrdersCache.slice(-500), null, 2), 'utf-8');
  } catch (e) {
    console.warn('[Server Orders] Failed to write intl_orders_store.json:', e);
  }
}

export function recordServerOrder(order: Partial<ServerIntlOrder>): ServerIntlOrder {
  const existingIdx = serverOrdersCache.findIndex(o => o.orderId === order.orderId);
  const nowIso = new Date().toISOString();

  // REQUIREMENT 1 & 2: purchasedAt and expiresAt (purchasedAt + 20 minutes)
  const purchasedAt = order.purchasedAt || (existingIdx !== -1 ? serverOrdersCache[existingIdx].purchasedAt : null) || order.createdAt || nowIso;
  const expiryDurationMinutes = Number(process.env.INTL_ORDER_EXPIRY_MINUTES) || 20;
  const defaultExpiresAt = new Date(new Date(purchasedAt).getTime() + expiryDurationMinutes * 60 * 1000).toISOString();
  const expiresAt = order.expiresAt || (existingIdx !== -1 ? serverOrdersCache[existingIdx].expiresAt : null) || defaultExpiresAt;

  const record: ServerIntlOrder = {
    id: String(order.orderId || order.id || Date.now()),
    orderId: String(order.orderId || order.id || ''),
    userId: order.userId || (existingIdx !== -1 ? serverOrdersCache[existingIdx].userId : undefined),
    userEmail: order.userEmail || (existingIdx !== -1 ? serverOrdersCache[existingIdx].userEmail : undefined),
    orderReference: order.orderReference || (existingIdx !== -1 ? serverOrdersCache[existingIdx].orderReference : undefined),
    countryId: String(order.countryId || (existingIdx !== -1 ? serverOrdersCache[existingIdx].countryId : '1')),
    countryName: order.countryName || (existingIdx !== -1 ? serverOrdersCache[existingIdx].countryName : 'USA'),
    serviceId: String(order.serviceId || (existingIdx !== -1 ? serverOrdersCache[existingIdx].serviceId : '')),
    serviceName: order.serviceName || (existingIdx !== -1 ? serverOrdersCache[existingIdx].serviceName : 'App'),
    phoneNumber: order.phoneNumber || (existingIdx !== -1 ? serverOrdersCache[existingIdx].phoneNumber : ''),
    customerPrice: Number(order.customerPrice || (existingIdx !== -1 ? serverOrdersCache[existingIdx].customerPrice : 0)),
    costUsd: Number(order.costUsd || (existingIdx !== -1 ? serverOrdersCache[existingIdx].costUsd : 0)),
    providerStatus: order.providerStatus || (existingIdx !== -1 ? serverOrdersCache[existingIdx].providerStatus : 'waiting'),
    normalizedStatus: order.normalizedStatus || (existingIdx !== -1 ? serverOrdersCache[existingIdx].normalizedStatus : 'waiting'),
    statusLabel: order.statusLabel || (existingIdx !== -1 ? serverOrdersCache[existingIdx].statusLabel : 'Waiting for SMS code...'),
    sms: sanitizeOtpCode(order.sms ?? (existingIdx !== -1 ? serverOrdersCache[existingIdx].sms : null)),
    fullSms: sanitizeSmsText(order.fullSms ?? (existingIdx !== -1 ? serverOrdersCache[existingIdx].fullSms : null)),
    purchasedAt,
    expiresAt,
    receivedAt: order.receivedAt || (existingIdx !== -1 ? serverOrdersCache[existingIdx].receivedAt : null),
    createdAt: order.createdAt || (existingIdx !== -1 ? serverOrdersCache[existingIdx].createdAt : purchasedAt),
    updatedAt: nowIso,
    refunded: order.refunded !== undefined ? Boolean(order.refunded) : (existingIdx !== -1 ? Boolean(serverOrdersCache[existingIdx].refunded) : false),
    cancelledAt: order.cancelledAt || (existingIdx !== -1 ? serverOrdersCache[existingIdx].cancelledAt : null),
    providerCancelled: order.providerCancelled !== undefined ? Boolean(order.providerCancelled) : (existingIdx !== -1 ? Boolean(serverOrdersCache[existingIdx].providerCancelled) : false),
    cancellationPending: order.cancellationPending !== undefined ? Boolean(order.cancellationPending) : (existingIdx !== -1 ? Boolean(serverOrdersCache[existingIdx].cancellationPending) : false),
    cancellationAttempts: order.cancellationAttempts ?? (existingIdx !== -1 ? serverOrdersCache[existingIdx].cancellationAttempts : 0),
    cancellationError: order.cancellationError ?? (existingIdx !== -1 ? serverOrdersCache[existingIdx].cancellationError : null)
  };

  if (existingIdx !== -1) {
    serverOrdersCache[existingIdx] = { ...serverOrdersCache[existingIdx], ...record, updatedAt: nowIso };
  } else {
    serverOrdersCache.unshift(record);
  }

  persistOrdersToDisk();
  return record;
}

export function getServerOrder(orderId: string): ServerIntlOrder | null {
  return serverOrdersCache.find(o => o.orderId === orderId || o.id === orderId) || null;
}

export function getServerOrders(userId?: string, userEmail?: string): ServerIntlOrder[] {
  let list = [...serverOrdersCache];
  if (userId) {
    list = list.filter(o => !o.userId || o.userId === userId);
  }
  if (userEmail) {
    list = list.filter(o => !o.userEmail || o.userEmail.toLowerCase() === userEmail.toLowerCase());
  }
  return list;
}

export function updateServerOrderStatus(
  orderId: string,
  updates: Partial<ServerIntlOrder>
): ServerIntlOrder | null {
  const idx = serverOrdersCache.findIndex(o => o.orderId === orderId || o.id === orderId);
  if (idx === -1) return null;

  serverOrdersCache[idx] = {
    ...serverOrdersCache[idx],
    ...updates,
    updatedAt: new Date().toISOString()
  };
  persistOrdersToDisk();
  return serverOrdersCache[idx];
}

/**
 * 6. Purchase Number
 */
export async function purchaseNumber(
  country: string,
  service: string,
  meta?: { userId?: string; userEmail?: string; orderReference?: string }
): Promise<{
  success: boolean;
  orderId?: string;
  phoneNumber?: string;
  price?: number;
  customer_price?: number;
  costUsd?: number;
  purchasedAt?: string | null;
  expiresAt?: string | null;
  status?: string;
  errorCode?: ProviderStatus;
  error?: string;
  data?: any;
}> {
  const canonicalCountry = resolveCanonicalCountry(country);
  const result = await callUpstreamApi('/sms/purchase', {
    method: 'POST',
    body: { service: String(service), country: canonicalCountry }
  });

  if (!result.success || !result.data) {
    return {
      success: false,
      errorCode: result.errorCode || 'API_ERROR',
      error: result.error || 'Number service is temporarily unavailable. Please try again shortly.'
    };
  }

  const costUsd = Number(result.data.cost_usd || 0);
  const pricing = calculateRetailPrice(costUsd);
  const orderId = String(result.data.order_id || result.data.id || '');
  const phoneNumber = String(result.data.phone_number || result.data.number || '');
  const orderStatus = String(result.data.status || 'waiting').toLowerCase();

  // REQUIREMENT 1 & 2: purchasedAt and expiresAt MUST be exactly purchasedAt + 20 minutes
  const nowMs = Date.now();
  const purchasedAt = new Date(nowMs).toISOString();
  const expiryMinutes = Number(process.env.INTL_ORDER_EXPIRY_MINUTES) || 20;
  const expiresAt = new Date(nowMs + expiryMinutes * 60 * 1000).toISOString();

  const orderPayload = {
    order_id: orderId,
    phone_number: phoneNumber,
    customer_price: pricing.customerPrice,
    price: pricing.customerPrice,
    cost_usd: costUsd,
    purchased_at: purchasedAt,
    expires_at: expiresAt,
    status: orderStatus
  };

  // Register in server-side order store
  recordServerOrder({
    orderId,
    phoneNumber,
    customerPrice: pricing.customerPrice,
    costUsd,
    countryId: canonicalCountry,
    serviceId: String(service),
    userId: meta?.userId,
    userEmail: meta?.userEmail,
    orderReference: meta?.orderReference,
    providerStatus: orderStatus,
    normalizedStatus: 'waiting',
    statusLabel: 'Waiting for SMS code...',
    sms: null,
    fullSms: null,
    purchasedAt,
    expiresAt
  });

  return {
    success: true,
    orderId,
    phoneNumber,
    price: pricing.customerPrice,
    customer_price: pricing.customerPrice,
    costUsd,
    purchasedAt,
    expiresAt,
    status: orderStatus,
    data: orderPayload
  };
}

/**
 * 7. Query Order Status / Poll for SMS OTP
 * Follows InstantNums GET /v1/sms/{order_id}
 * Distinguishes waiting, received, completed, cancelled, refunded, expired, and provider error.
 * NEVER returns 'None' as an OTP or marks order completed without confirmed SMS.
 */
export async function getOrderStatus(orderId: string): Promise<{
  success: boolean;
  orderId: string;
  providerStatus: string;
  normalizedStatus: IntlNormalizedStatus;
  status: string;
  statusLabel: string;
  isTerminal: boolean;
  sms: string | null;
  fullSms: string | null;
  expiresAt?: string | null;
  receivedAt?: string | null;
  error?: string;
}> {
  const cleanOrderId = encodeURIComponent(orderId);
  const existing = getServerOrder(orderId);

  const result = await callUpstreamApi(`/sms/${cleanOrderId}`, { method: 'GET' });

  // If upstream check failed (network, 500, etc.), preserve last valid state
  if (!result.success || !result.data) {
    return {
      success: false,
      orderId,
      providerStatus: existing?.providerStatus || 'error',
      normalizedStatus: 'error',
      status: existing?.normalizedStatus || 'waiting',
      statusLabel: 'Temporary connection check issue with provider',
      isTerminal: false,
      sms: existing?.sms || null,
      fullSms: existing?.fullSms || null,
      error: result.error || 'Failed to check order status with provider'
    };
  }

  const rawData = result.data;
  const rawStatus = String(rawData.status || 'waiting').toLowerCase().trim();
  const rawSms = rawData.sms;
  const rawFullSms = rawData.full_sms;

  // Validate and sanitize OTP
  let validSms = sanitizeOtpCode(rawSms);
  const cleanFullSms = sanitizeSmsText(rawFullSms || rawSms);

  // If no direct sms field but full_sms has digits, extract if plausible
  if (!validSms && rawFullSms) {
    const match = String(rawFullSms).match(/\b\d{4,8}\b/);
    if (match) {
      validSms = match[0];
    }
  }

  // Determine normalized status
  let normalizedStatus: IntlNormalizedStatus = 'waiting';
  let statusLabel = 'Waiting for SMS code...';

  if (rawStatus === 'cancelled' || rawStatus === 'canceled') {
    normalizedStatus = 'cancelled';
    statusLabel = 'Cancelled';
  } else if (rawStatus === 'refunded') {
    normalizedStatus = 'refunded';
    statusLabel = 'Refunded to Wallet';
  } else if (rawStatus === 'expired' || rawStatus === 'timeout') {
    normalizedStatus = 'expired';
    statusLabel = 'Expired (Refunded)';
  } else if (validSms !== null || rawStatus === 'received' || rawStatus === 'code_received' || rawStatus === 'sms_received') {
    normalizedStatus = 'received';
    statusLabel = 'SMS Received';
  } else if (rawStatus === 'finished' || rawStatus === 'completed') {
    // Only completed if an SMS was actually received
    if (validSms !== null || existing?.sms) {
      normalizedStatus = 'completed';
      statusLabel = 'Completed';
    } else {
      normalizedStatus = 'expired';
      statusLabel = 'Expired (No Code Received)';
    }
  } else {
    normalizedStatus = 'waiting';
    statusLabel = 'Waiting for SMS code...';
  }

  const isTerminal = ['completed', 'cancelled', 'refunded', 'expired'].includes(normalizedStatus) || normalizedStatus === 'received';

  // Update server cache
  updateServerOrderStatus(orderId, {
    providerStatus: rawStatus,
    normalizedStatus,
    statusLabel,
    sms: validSms || existing?.sms || null,
    fullSms: cleanFullSms || existing?.fullSms || null,
    receivedAt: validSms ? (existing?.receivedAt || new Date().toISOString()) : null,
    expiresAt: rawData.expires_at || existing?.expiresAt || null
  });

  return {
    success: true,
    orderId: String(rawData.order_id || orderId),
    providerStatus: rawStatus,
    normalizedStatus,
    status: normalizedStatus,
    statusLabel,
    isTerminal,
    sms: validSms,
    fullSms: cleanFullSms,
    expiresAt: rawData.expires_at || existing?.expiresAt || null,
    receivedAt: validSms ? (existing?.receivedAt || new Date().toISOString()) : null
  };
}

/**
 * 8. Cancel Order & Refund
 */
export async function cancelOrder(orderId: string): Promise<{
  success: boolean;
  orderId: string;
  providerStatus: string;
  normalizedStatus: IntlNormalizedStatus;
  status: string;
  refunded: boolean;
  error?: string;
}> {
  const cleanOrderId = encodeURIComponent(orderId);
  const existing = getServerOrder(orderId);

  // Idempotency check 1 (Requirement 11): If already cancelled, refunded, or expired, return immediately without re-cancelling
  if (existing && (existing.normalizedStatus === 'cancelled' || existing.normalizedStatus === 'refunded' || existing.normalizedStatus === 'expired' || existing.refunded)) {
    return {
      success: true,
      orderId,
      providerStatus: existing.providerStatus || 'cancelled',
      normalizedStatus: existing.normalizedStatus,
      status: existing.normalizedStatus,
      refunded: true
    };
  }

  // Idempotency check 2 (Requirement 12): If an SMS code was already received, do NOT cancel
  if (existing && (existing.sms || existing.normalizedStatus === 'received' || existing.normalizedStatus === 'completed')) {
    return {
      success: false,
      orderId,
      providerStatus: existing.providerStatus || 'completed',
      normalizedStatus: existing.normalizedStatus,
      status: existing.normalizedStatus,
      refunded: false,
      error: 'Cannot cancel an order that has already received an SMS verification code.'
    };
  }

  const result = await callUpstreamApi(`/sms/${cleanOrderId}/cancel`, {
    method: 'POST',
    body: {}
  });

  if (!result.success || !result.data) {
    // If upstream says order is already cancelled/refunded/not active, treat as idempotent success
    const errText = String(result.error || '').toLowerCase();
    if (
      errText.includes('already cancelled') ||
      errText.includes('already canceled') ||
      errText.includes('already refunded') ||
      errText.includes('expired') ||
      errText.includes('not active')
    ) {
      updateServerOrderStatus(orderId, {
        providerStatus: 'cancelled',
        normalizedStatus: 'cancelled',
        statusLabel: 'Cancelled (Refunded)',
        refunded: true,
        cancelledAt: existing?.cancelledAt || new Date().toISOString(),
        providerCancelled: true,
        cancellationPending: false
      });
      return {
        success: true,
        orderId,
        providerStatus: 'cancelled',
        normalizedStatus: 'cancelled',
        status: 'cancelled',
        refunded: true
      };
    }

    return {
      success: false,
      orderId,
      providerStatus: 'error',
      normalizedStatus: 'error',
      status: 'error',
      refunded: false,
      error: result.error || 'Failed to cancel order with provider'
    };
  }

  const rawStatus = String(result.data.status || 'cancelled').toLowerCase().trim();

  updateServerOrderStatus(orderId, {
    providerStatus: rawStatus,
    normalizedStatus: 'cancelled',
    statusLabel: 'Cancelled (Refunded)',
    refunded: true,
    cancelledAt: new Date().toISOString(),
    providerCancelled: true,
    cancellationPending: false,
    cancellationError: null
  });

  return {
    success: true,
    orderId: String(result.data.order_id || orderId),
    providerStatus: rawStatus,
    normalizedStatus: 'cancelled',
    status: 'cancelled',
    refunded: true
  };
}

/**
 * 9. Server-Side Automatic Expiry Worker (Requirements 6, 7, 8, 9, 10, 11, 12, 13)
 * Automatically evaluates all active international orders against server expiresAt.
 * Idempotent, safe concurrency lock, retries temporary provider failures safely.
 */
let isExpiryProcessing = false;
let expiryIntervalTimer: NodeJS.Timeout | null = null;

export async function processExpiredOrders(): Promise<{
  processed: number;
  cancelled: number;
  failed: number;
}> {
  if (isExpiryProcessing) {
    return { processed: 0, cancelled: 0, failed: 0 };
  }
  isExpiryProcessing = true;

  let processed = 0;
  let cancelled = 0;
  let failed = 0;

  try {
    const nowMs = Date.now();

    // Find all active orders that have expired or are pending retryable cancellation
    const candidates = serverOrdersCache.filter(o => {
      // 1. Skip terminal or already refunded orders (Requirement 11)
      if (
        o.normalizedStatus === 'cancelled' ||
        o.normalizedStatus === 'refunded' ||
        o.normalizedStatus === 'expired' ||
        o.refunded === true
      ) {
        return false;
      }

      // 2. Skip if SMS code was already received or completed (Requirement 12)
      if (o.sms || o.normalizedStatus === 'received' || o.normalizedStatus === 'completed') {
        return false;
      }

      // 3. Include if retryable cancellation is pending (Requirement 10)
      if (o.cancellationPending) {
        return true;
      }

      // 4. Include if expiresAt <= current server time (Requirement 6)
      if (o.expiresAt) {
        const expMs = new Date(o.expiresAt).getTime();
        if (!isNaN(expMs) && expMs <= nowMs) {
          return true;
        }
      }

      return false;
    });

    for (const order of candidates) {
      processed++;

      // Check with upstream if an SMS arrived right at or before expiration (Requirement 12)
      try {
        const checkRes = await callUpstreamApi(`/sms/${encodeURIComponent(order.orderId)}`, { method: 'GET' });
        if (checkRes.success && checkRes.data) {
          const rawSms = sanitizeOtpCode(checkRes.data.sms);
          const rawFullSms = sanitizeSmsText(checkRes.data.full_sms || checkRes.data.sms);
          let extractedOtp = rawSms;
          if (!extractedOtp && rawFullSms) {
            const match = String(rawFullSms).match(/\b\d{4,8}\b/);
            if (match) extractedOtp = match[0];
          }

          if (extractedOtp) {
            // SMS code arrived! Preserve the order and do NOT cancel (Requirement 12)
            console.log(`[Expiry Worker] Order ${order.orderId} received SMS ${extractedOtp}. Preserving order.`);
            updateServerOrderStatus(order.orderId, {
              sms: extractedOtp,
              fullSms: rawFullSms,
              normalizedStatus: 'received',
              statusLabel: 'SMS Received',
              cancellationPending: false,
              receivedAt: new Date().toISOString()
            });
            continue;
          }

          const rawStatus = String(checkRes.data.status || '').toLowerCase();
          if (rawStatus === 'cancelled' || rawStatus === 'canceled' || rawStatus === 'expired' || rawStatus === 'refunded') {
            console.log(`[Expiry Worker] Order ${order.orderId} already terminal on provider (${rawStatus}).`);
            updateServerOrderStatus(order.orderId, {
              normalizedStatus: 'expired',
              providerStatus: rawStatus,
              statusLabel: 'Expired / Cancelled',
              cancellationPending: false,
              providerCancelled: true,
              cancelledAt: order.cancelledAt || new Date().toISOString(),
              refunded: true
            });
            cancelled++;
            continue;
          }
        }
      } catch {
        // Network blip checking status, proceed to cancellation attempt
      }

      // Mark status as cancelling (Requirement 16)
      updateServerOrderStatus(order.orderId, {
        cancellationPending: true,
        statusLabel: 'Expired — Cancelling...'
      });

      console.log(`[Expiry Worker] Auto-cancelling expired order ${order.orderId} (expired at ${order.expiresAt})...`);
      const cancelRes = await cancelOrder(order.orderId);

      if (cancelRes.success) {
        console.log(`[Expiry Worker] Successfully cancelled expired order ${order.orderId}.`);
        updateServerOrderStatus(order.orderId, {
          normalizedStatus: 'expired',
          providerStatus: cancelRes.providerStatus || 'cancelled',
          statusLabel: 'Expired / Cancelled',
          cancellationPending: false,
          providerCancelled: true,
          cancelledAt: new Date().toISOString(),
          refunded: true,
          cancellationError: null
        });
        cancelled++;
      } else {
        // Requirement 10: If InstantNums cancellation fails temporarily:
        // DO NOT immediately mark the order successfully cancelled/refunded.
        // Keep a retryable state such as: CANCELLATION_PENDING.
        console.warn(`[Expiry Worker] Cancellation failed for order ${order.orderId}: ${cancelRes.error}. Will retry on next tick.`);
        updateServerOrderStatus(order.orderId, {
          cancellationPending: true,
          cancellationAttempts: (order.cancellationAttempts || 0) + 1,
          cancellationError: cancelRes.error || 'Provider cancellation failed',
          statusLabel: 'Cancellation Pending (Retrying...)'
        });
        failed++;
      }
    }
  } catch (err: any) {
    console.error('[Expiry Worker] Error processing expired orders:', err?.message || err);
  } finally {
    isExpiryProcessing = false;
  }

  return { processed, cancelled, failed };
}

export function startIntlExpiryWorker(intervalMs: number = 5000): void {
  if (expiryIntervalTimer) {
    clearInterval(expiryIntervalTimer);
  }
  // Run an immediate sweep on boot (handles server restart with stored expiresAt - TEST 8)
  processExpiredOrders().catch(e => console.warn('[Expiry Worker Boot] Error:', e));
  expiryIntervalTimer = setInterval(() => {
    processExpiredOrders().catch(e => console.warn('[Expiry Worker Loop] Error:', e));
  }, intervalMs);
  console.log(`[Expiry Worker] International numbers expiry worker started (interval: ${intervalMs}ms).`);
}

export function stopIntlExpiryWorker(): void {
  if (expiryIntervalTimer) {
    clearInterval(expiryIntervalTimer);
    expiryIntervalTimer = null;
  }
}

/**
 * Admin: Get Provider Balance
 * Dual-currency wallet support: InstantNums holds accounts with both USD and NGN balances.
 * The authoritative total balance displayed on the InstantNums dashboard is the combined total:
 * Total USD = balance_usd + (balance_ngn / rate)
 * Equivalent NGN = Total USD * rate
 */
export async function getBalance(): Promise<{
  success: boolean;
  balance_usd: number;
  balance_ngn: number;
  balanceUsd: number;
  balanceNgn: number;
  exchangeRate: number;
  rate: number;
  currency: string;
  wallets?: { usd: number; ngn: number };
  lastUpdated?: string;
  error?: string;
}> {
  const rate = pricingConfig.usd_to_ngn_rate > 0 ? pricingConfig.usd_to_ngn_rate : 1600;
  const result = await callUpstreamApi('/balance', { method: 'GET' });

  if (!result.success || !result.data) {
    console.warn('[InstantNums Balance] Query failed:', result.error);
    return {
      success: false,
      balance_usd: 0,
      balance_ngn: 0,
      balanceUsd: 0,
      balanceNgn: 0,
      exchangeRate: rate,
      rate,
      currency: 'USD',
      error: result.error || 'Failed to fetch provider balance'
    };
  }

  const raw = result.data;
  // Safely log upstream response with secrets completely redacted
  console.log('[InstantNums Balance] Upstream returned:', {
    success: raw.success,
    balance_usd: raw.balance_usd,
    balance_ngn: raw.balance_ngn,
    currency: raw.currency
  });

  // Parse raw provider wallet values
  const rawUsd = typeof raw.balance_usd === 'number' ? raw.balance_usd : parseFloat(raw.balance_usd) || 0;
  const rawNgn = typeof raw.balance_ngn === 'number' ? raw.balance_ngn : parseFloat(raw.balance_ngn) || 0;

  // Convert NGN wallet balance to USD if present
  const ngnInUsd = rawNgn > 0 ? (rawNgn / rate) : 0;
  // Combine wallets with 2 decimal places precision (e.g. $0.22 + $0.09 = $0.31)
  const totalUsd = Math.round((rawUsd + ngnInUsd) * 100) / 100;
  // Equivalent NGN calculation (e.g. $0.31 * 1600 = 496.00)
  const totalNgn = Math.round(totalUsd * rate * 100) / 100;

  return {
    success: true,
    balance_usd: totalUsd,
    balance_ngn: totalNgn,
    balanceUsd: totalUsd,
    balanceNgn: totalNgn,
    exchangeRate: rate,
    rate,
    currency: raw.currency || 'USD',
    wallets: {
      usd: rawUsd,
      ngn: rawNgn
    },
    lastUpdated: new Date().toISOString()
  };
}
