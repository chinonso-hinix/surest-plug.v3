/**
 * Surest Plug - Server-Side FollowSPanel Service
 * 
 * SECURITY RULES:
 * - The API key is read strictly from the server-side environment variable FOLLOWSPANEL_API_KEY (or aliases).
 * - The key is NEVER sent to the client, logged in full, or exposed in client responses.
 * - All communication with FollowSPanel (https://followspanel.com/api/v2) happens exclusively on the server.
 * - Always maintains a live, resilient service catalog using FollowSPanel's official API with live catalog sync fallback.
 */

import dotenv from 'dotenv';

try {
  dotenv.config();
} catch (e) {
  // Ignore in environments without .env
}

const FOLLOWSPANEL_API_URL = 'https://followspanel.com/api/v2';
const FOLLOWSPANEL_SERVICES_URL = 'https://followspanel.com/services';

export interface FollowSPanelServiceItem {
  service: number | string;
  name: string;
  type: string;
  category: string;
  rate: string; // Rate per 1000 in NGN
  min: number;
  max: number;
  refill?: boolean;
  cancel?: boolean;
  dripfeed?: boolean;
}

export interface SmmServiceResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  code?: string | number;
}

export interface SmmConnectionTestResult {
  connected: boolean;
  provider: string;
  balance?: string;
  currency?: string;
  latency_ms?: number;
  error?: string;
  details?: string;
}

// In-memory cache for live services to maximize speed and resilience
let servicesCache: {
  timestamp: number;
  data: FollowSPanelServiceItem[];
} | null = null;

const CACHE_TTL_MS = 10 * 60 * 1000; // 10 minutes cache

/**
 * Safely retrieve and diagnostically validate the FollowSPanel API key from server environment.
 * - Strips leading/trailing whitespace, newlines, carriage returns, tabs, and Unicode byte-order marks.
 * - Strips accidental enclosing single or double quotes.
 * - Detects and flags placeholder values or typographical errors.
 * - NEVER prints or exposes the key itself; only logs safe diagnostic info (configured: true/false, length: XX).
 */
export function getFollowSPanelConfigStatus(): { configured: boolean; length: number; endpoint: string } {
  const key = getApiKey();
  return {
    configured: Boolean(key),
    length: key ? key.length : 0,
    endpoint: FOLLOWSPANEL_API_URL
  };
}

function getApiKey(): string {
  const rawKey = (
    process.env.FOLLOWSPANEL_API_KEY ||
    process.env.FOLLOWS_PANEL_API_KEY ||
    process.env.FOLLOWSPANEL_KEY ||
    process.env.FOLLOWS_PANEL_KEY ||
    ''
  );

  // 1. Strip leading and trailing whitespace, newlines, tabs, and zero-width/BOM characters
  let cleanKey = rawKey.trim().replace(/^[\uFEFF\xA0]+|[\uFEFF\xA0]+$/g, '').replace(/[\r\n\t]/g, '');

  // 2. Strip accidental enclosing double quotes or single quotes (e.g. "key" or 'key')
  if (
    (cleanKey.startsWith('"') && cleanKey.endsWith('"') && cleanKey.length >= 2) ||
    (cleanKey.startsWith("'") && cleanKey.endsWith("'") && cleanKey.length >= 2)
  ) {
    cleanKey = cleanKey.slice(1, -1).trim();
  }

  // 3. Detect placeholder values or accidental variable name assignment
  const isPlaceholder = 
    cleanKey.toLowerCase() === 'followspanel_api_key' ||
    cleanKey.toLowerCase() === 'undefined' ||
    cleanKey.toLowerCase() === 'null' ||
    cleanKey.toLowerCase() === 'my_api_key' ||
    cleanKey.toLowerCase() === 'your_api_key_here';

  if (!cleanKey || isPlaceholder) {
    console.warn(
      `[FollowSPanel Diagnostic] FOLLOWSPANEL_API_KEY configured: false (missing or placeholder in environment)`
    );
    return '';
  }

  return cleanKey;
}

/**
 * Safely mask an API key for server-side diagnostic logging (never exposes full secret)
 */
function maskApiKey(key: string): string {
  if (!key) return '[NOT_SET]';
  if (key.length <= 6) return '***';
  return `*** (length: ${key.length})`;
}

/**
 * Execute a secure server-side POST request to FollowSPanel API v2
 */
async function callFollowSPanelApi(params: Record<string, string | number>, isAdminQuery = false): Promise<SmmServiceResponse> {
  const apiKey = getApiKey();

  if (!apiKey) {
    console.warn(
      `[FollowSPanel Diagnostic] Request aborted for action "${params.action}": FOLLOWSPANEL_API_KEY configured: false (missing or invalid).`
    );
    return {
      success: false,
      code: 'MISSING_API_KEY',
      error: isAdminQuery
        ? 'FOLLOWSPANEL_API_KEY is not configured on the server. Please configure your FollowSPanel API key in server environment variables / secrets.'
        : 'Provider authentication is required for this action. Please contact administrator.'
    };
  }

  // Safe server-side diagnostic logging: logs configuration status and length only - NEVER the key
  console.log(`[FollowSPanel Request] action: "${params.action}", FOLLOWSPANEL_API_KEY configured: true, length: ${apiKey.length}`);

  const postParams = new URLSearchParams();
  postParams.append('key', apiKey);
  for (const [k, v] of Object.entries(params)) {
    postParams.append(k, String(v));
  }

  const startTime = Date.now();

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 20000); // 20s timeout

    const response = await fetch(FOLLOWSPANEL_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'User-Agent': 'SurestPlug-Server/1.0'
      },
      body: postParams.toString(),
      signal: controller.signal
    });

    clearTimeout(timeoutId);
    const latency = Date.now() - startTime;

    // Strictly check for HTTP 200 OK
    if (response.status !== 200) {
      let errDetail = `HTTP ${response.status} (${response.statusText})`;
      try {
        const errText = await response.text();
        const trimmed = (errText || '').trim();
        if (trimmed.startsWith('<') || trimmed.toLowerCase().startsWith('<!doctype')) {
          errDetail = `Provider returned HTML error page (HTTP ${response.status})`;
        } else {
          try {
            const errJson = JSON.parse(errText);
            if (errJson && errJson.error) {
              errDetail = String(errJson.error);
            }
          } catch {
            if (errText && errText.length < 200) {
              errDetail = errText.trim();
            }
          }
        }
      } catch {}

      if (
        response.status === 401 ||
        errDetail.toLowerCase().includes('api key') ||
        errDetail.toLowerCase().includes('invalid key')
      ) {
        const adminAuthError = 'FollowSPanel authentication failed: The configured FOLLOWSPANEL_API_KEY was rejected by followspanel.com (Invalid API key). Please generate or copy your active API key from your FollowSPanel account (https://followspanel.com/account) and update the FOLLOWSPANEL_API_KEY secret.';
        return {
          success: false,
          code: 'AUTH_FAILED',
          error: isAdminQuery ? adminAuthError : 'Social media boosting services are temporarily unavailable.'
        };
      }

      return {
        success: false,
        code: response.status,
        error: isAdminQuery
          ? `FollowSPanel API returned HTTP ${response.status}: ${errDetail}`
          : 'Provider returned an error. Please try again later.'
      };
    }

    const text = await response.text();
    const trimmed = (text || '').trim();

    // Guard against HTML pages (e.g. maintenance pages, Cloudflare challenges, or SPA fallbacks)
    if (trimmed.startsWith('<') || trimmed.toLowerCase().startsWith('<!doctype') || trimmed.includes('<html')) {
      console.warn(`[FollowSPanel API] HTML response received (HTTP 200) in ${latency}ms for action: ${params.action}`);
      return {
        success: false,
        code: 'HTML_RESPONSE',
        error: isAdminQuery
          ? 'FollowSPanel API returned an HTML webpage instead of JSON. The provider endpoint (https://followspanel.com/api/v2) may be under maintenance, redirecting, or blocked.'
          : 'Social media boosting provider returned an invalid response format. Please try again later.'
      };
    }

    let json: any = null;
    try {
      json = JSON.parse(text);
    } catch {
      // Non-JSON response despite HTTP 200
      console.warn(`[FollowSPanel API] Non-JSON response (HTTP 200) in ${latency}ms for action: ${params.action}`);
      return {
        success: false,
        code: 'INVALID_JSON',
        error: isAdminQuery
          ? `Non-JSON response from FollowSPanel (HTTP 200): ${text.slice(0, 150)}`
          : 'Invalid response received from provider.'
      };
    }

    // Check for provider-level errors in JSON (e.g. {"error": "Invalid API key"} or {"error": "Incorrect request"})
    if (json && typeof json === 'object' && 'error' in json && json.error) {
      const errStr = String(json.error);
      if (errStr.toLowerCase().includes('api key') || errStr.toLowerCase().includes('invalid key')) {
        const adminAuthError = 'FollowSPanel authentication failed: The configured FOLLOWSPANEL_API_KEY was rejected by followspanel.com (Invalid API key). Please generate or copy your active API key from your FollowSPanel account (https://followspanel.com/account) and update the FOLLOWSPANEL_API_KEY secret.';
        return {
          success: false,
          code: 'AUTH_FAILED',
          error: isAdminQuery ? adminAuthError : 'Social media boosting services are temporarily unavailable.'
        };
      }

      return {
        success: false,
        code: 'PROVIDER_ERROR',
        error: errStr
      };
    }

    return {
      success: true,
      data: json
    };
  } catch (err: any) {
    const isTimeout = err.name === 'AbortError';
    const msg = isTimeout 
      ? 'FollowSPanel API request timed out after 20 seconds.' 
      : (err?.message || 'Network unreachable');
      
    console.error(`[FollowSPanel API] Request failed for action: ${params.action} - ${msg}`);
    return {
      success: false,
      code: isTimeout ? 'TIMEOUT' : 'NETWORK_ERROR',
      error: isAdminQuery ? `Connection error: ${msg}` : 'Could not reach boosting provider. Please check your network connection.'
    };
  }
}

/**
 * Robust live parser to scrape and extract genuine services from FollowSPanel public catalog
 */
async function fetchFollowSPanelPublicCatalog(): Promise<FollowSPanelServiceItem[]> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000);

    const res = await fetch(FOLLOWSPANEL_SERVICES_URL, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
      },
      signal: controller.signal
    });

    clearTimeout(timeoutId);

    if (!res.ok) {
      throw new Error(`Failed to fetch FollowSPanel services page: HTTP ${res.status}`);
    }

    const html = await res.text();
    const rows = html.split('<tr').slice(1);
    const services: FollowSPanelServiceItem[] = [];
    let currentCategory = 'General';

    for (const r of rows) {
      if (r.includes('data-filter-table-category-id') && r.includes('colspan="100%"')) {
        const m = r.match(/<strong>([\s\S]*?)<\/strong>/);
        if (m) {
          currentCategory = m[1].replace(/<[^>]+>/g, '').trim();
        }
      } else if (r.includes('data-filter-table-service-id=')) {
        const idM = r.match(/data-filter-table-service-id="(\d+)"/);
        const nameM = r.match(/class="service-name"[^>]*>([\s\S]*?)<\/td>/);
        if (idM && nameM) {
          const id = parseInt(idM[1], 10);
          const name = nameM[1].replace(/<[^>]+>/g, '').trim();
          const parts = r.split('<td').slice(1).map(p => 
            p.replace(/[\s\S]*?>/, '').replace(/<\/td>[\s\S]*/, '').replace(/<[^>]+>/g, '').trim()
          );

          let rate = '0';
          let min = 10;
          let max = 100000;
          if (parts.length >= 5) {
            rate = parts[2].replace(/[^0-9.]/g, '') || '0';
            min = parseInt(parts[3].replace(/[^0-9]/g, ''), 10) || 10;
            max = parseInt(parts[4].replace(/[^0-9]/g, ''), 10) || 100000;
          }

          services.push({
            service: id,
            name,
            type: 'Default',
            category: currentCategory,
            rate,
            min,
            max
          });
        }
      }
    }

    if (services.length > 0) {
      return services;
    }
  } catch (err: any) {
    console.error('Error in fetchFollowSPanelPublicCatalog:', err?.message);
  }

  return [];
}

/**
 * 1. Test API connection and credentials (Admin only)
 * Executes a real live server-side call to FollowSPanel with action: 'balance'
 */
export async function testFollowSPanelConnection(): Promise<SmmServiceResponse<SmmConnectionTestResult>> {
  const startTime = Date.now();
  const apiKey = getApiKey();

  if (!apiKey) {
    return {
      success: false,
      code: 'MISSING_API_KEY',
      data: {
        connected: false,
        provider: 'FollowSPanel',
        latency_ms: 0,
        error: 'FOLLOWSPANEL_API_KEY environment variable is not configured on the server.',
        details: 'Please set your FollowSPanel API key in the server environment secrets.'
      },
      error: 'FOLLOWSPANEL_API_KEY environment variable is not configured on the server.'
    };
  }

  const res = await callFollowSPanelApi({ action: 'balance' }, true);
  const latency = Date.now() - startTime;

  if (!res.success || !res.data) {
    return {
      success: false,
      data: {
        connected: false,
        provider: 'FollowSPanel',
        latency_ms: latency,
        error: res.error || 'Failed to authenticate with FollowSPanel API.',
        details: res.code ? `Error Code: ${res.code}` : undefined
      },
      error: res.error || 'Failed to authenticate with FollowSPanel API.'
    };
  }

  let balanceVal: string | undefined = undefined;
  if (res.data.balance !== undefined && res.data.balance !== null) {
    balanceVal = String(res.data.balance).trim();
  } else if (res.data.funds !== undefined && res.data.funds !== null) {
    balanceVal = String(res.data.funds).trim();
  }

  return {
    success: true,
    data: {
      connected: true,
      provider: 'FollowSPanel',
      balance: balanceVal,
      currency: String(res.data.currency || 'NGN').toUpperCase(),
      latency_ms: latency
    }
  };
}

/**
 * 2. Retrieve real available services from FollowSPanel
 * Automatically uses authenticated API or live catalog sync to guarantee high availability.
 */
export async function getFollowSPanelServices(): Promise<SmmServiceResponse<FollowSPanelServiceItem[]>> {
  // Check in-memory cache first
  const now = Date.now();
  if (servicesCache && (now - servicesCache.timestamp) < CACHE_TTL_MS && servicesCache.data.length > 0) {
    return {
      success: true,
      data: servicesCache.data
    };
  }

  // Attempt 1: Call authenticated API
  const apiRes = await callFollowSPanelApi({ action: 'services' }, false);
  if (apiRes.success && Array.isArray(apiRes.data) && apiRes.data.length > 0) {
      const formattedServices: FollowSPanelServiceItem[] = apiRes.data.map((item: any) => ({
        service: isNaN(Number(item.service)) ? String(item.service ?? '') : Number(item.service),
        name: String(item.name || ''),
        type: String(item.type || 'Default'),
        category: String(item.category || 'General'),
        rate: String(item.rate || '0'),
        min: Number(item.min) || 10,
        max: Number(item.max) || 100000,
        refill: Boolean(item.refill),
        cancel: Boolean(item.cancel),
        dripfeed: Boolean(item.dripfeed)
      }));

      servicesCache = {
        timestamp: now,
        data: formattedServices
      };

    return {
      success: true,
      data: formattedServices
    };
  }

  // Attempt 2: Live catalog sync from FollowSPanel public catalog
  const publicServices = await fetchFollowSPanelPublicCatalog();
  if (publicServices.length > 0) {
    servicesCache = {
      timestamp: now,
      data: publicServices
    };

    return {
      success: true,
      data: publicServices
    };
  }

  // Return stale cache if available
  if (servicesCache && servicesCache.data.length > 0) {
    return {
      success: true,
      data: servicesCache.data
    };
  }

  return {
    success: false,
    error: 'Failed to retrieve social media boosting services from FollowSPanel.'
  };
}

/**
 * 3. Submit real order to FollowSPanel
 */
export async function createFollowSPanelOrder(
  serviceId: number | string,
  link: string,
  quantity: number
): Promise<SmmServiceResponse<{ order_id: number }>> {
  // Input validations
  if (!link || !link.trim() || link.trim().length < 3) {
    return {
      success: false,
      error: 'Please provide a valid target URL or social media username.'
    };
  }

  const parsedQty = Number(quantity);
  if (isNaN(parsedQty) || parsedQty <= 0) {
    return {
      success: false,
      error: 'Please provide a valid quantity.'
    };
  }

  if (!serviceId) {
    return {
      success: false,
      error: 'Please select a valid boosting service.'
    };
  }

  const res = await callFollowSPanelApi({
    action: 'add',
    service: Number(serviceId),
    link: link.trim(),
    quantity: parsedQty
  }, true);

  if (!res.success) {
    return {
      success: false,
      error: res.error || 'Failed to dispatch order with provider. Please verify your details.'
    };
  }

  if (res.data && res.data.order) {
    return {
      success: true,
      data: { order_id: Number(res.data.order) }
    };
  }

  return {
    success: false,
    error: res.data?.error ? String(res.data.error) : 'Failed to dispatch order with provider.'
  };
}

/**
 * 4. Retrieve real order status from FollowSPanel
 */
export async function getFollowSPanelOrderStatus(orderId: number | string): Promise<SmmServiceResponse<any>> {
  if (!orderId) {
    return {
      success: false,
      error: 'Order ID is required.'
    };
  }

  const res = await callFollowSPanelApi({
    action: 'status',
    order: orderId
  }, true);

  if (!res.success) {
    return {
      success: false,
      error: res.error || 'Unable to fetch status from provider.'
    };
  }

  return {
    success: true,
    data: res.data
  };
}

/**
 * 5. Retrieve multiple orders status from FollowSPanel
 */
export async function getFollowSPanelMultipleOrderStatus(orderIds: (number | string)[]): Promise<SmmServiceResponse<any>> {
  if (!orderIds || orderIds.length === 0) {
    return {
      success: false,
      error: 'Order IDs are required.'
    };
  }

  const res = await callFollowSPanelApi({
    action: 'status',
    orders: orderIds.join(',')
  }, true);

  if (!res.success) {
    return {
      success: false,
      error: res.error || 'Unable to fetch status from provider.'
    };
  }

  return {
    success: true,
    data: res.data
  };
}

/**
 * 6. Retrieve real provider balance directly from FollowSPanel (Admin verification)
 * Performs a real-time request to the FollowSPanel API with action: 'balance'
 * Strictly verifies HTTP 200 response and valid numerical balance before returning.
 */
export async function getFollowSPanelBalance(): Promise<SmmServiceResponse<{ balance: string; currency: string; connected?: boolean; status?: string }>> {
  const res = await callFollowSPanelApi({ action: 'balance' }, true);
  if (!res.success || !res.data) {
    return {
      success: false,
      code: res.code,
      error: res.error || 'Unable to retrieve FollowSPanel balance.'
    };
  }

  // Parse balance value safely (FollowSPanel returns { "balance": "...", "currency": "NGN" })
  let balanceVal: string | null = null;
  if (res.data.balance !== undefined && res.data.balance !== null) {
    balanceVal = String(res.data.balance).trim();
  } else if (res.data.funds !== undefined && res.data.funds !== null) {
    balanceVal = String(res.data.funds).trim();
  }

  if (balanceVal === null || balanceVal === '' || isNaN(Number(balanceVal))) {
    return {
      success: false,
      code: 'INVALID_BALANCE_FORMAT',
      error: 'FollowSPanel API did not return a valid numeric balance.'
    };
  }

  return {
    success: true,
    data: {
      balance: balanceVal,
      currency: String(res.data.currency || 'NGN').toUpperCase(),
      connected: true,
      status: 'Connected'
    }
  };
}

export default {
  testFollowSPanelConnection,
  getFollowSPanelServices,
  createFollowSPanelOrder,
  getFollowSPanelOrderStatus,
  getFollowSPanelMultipleOrderStatus,
  getFollowSPanelBalance
};
