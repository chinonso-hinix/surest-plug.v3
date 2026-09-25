/**
 * Surest Plug - Server-Side Cartlogs Service
 * 
 * SECURITY & AUTHENTICATION RULES:
 * - API authentication uses CARTLOGS_API_KEY for all authenticated Cartlogs API requests.
 * - The API key is read strictly from the server-side environment variable CARTLOGS_API_KEY.
 * - The key is NEVER sent to the client, logged, or exposed in frontend code.
 * - All communication with Cartlogs (https://api.cartlogs.com/api/v1/) happens exclusively on the server.
 * - SMM / Boosting services are strictly EXCLUDED (FollowSPanel remains the ONLY boosting provider).
 * - Supplier cost and Cartlogs Order IDs are strictly isolated to admin-only areas.
 * - CARTLOGS_WEBHOOK_SECRET is strictly OPTIONAL and NEVER required for product catalogs,
 *   order creation, or order status queries.
 * - CARTLOGS_API_KEY is NEVER used as CARTLOGS_WEBHOOK_SECRET.
 * - Webhook secrets are never invented, generated, or hardcoded.
 */

import crypto from 'crypto';
import { calculateSellingPrice } from '../lib/pricing.ts';

const CARTLOGS_API_BASE_URL = 'https://api.cartlogs.com/api/v1';

export interface CartlogsApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  code?: string | number;
}

export interface RawCartlogsCategory {
  id?: string | number;
  pk?: string | number;
  name?: string;
  title?: string;
  slug?: string;
  description?: string;
  products_count?: number;
  count?: number;
}

export interface RawCartlogsProduct {
  id?: string | number;
  pk?: string | number;
  product_id?: string | number;
  name?: string;
  title?: string;
  category?: string | { id?: any; name?: string; title?: string };
  description?: string;
  details?: string;
  price?: string | number;
  cost?: string | number;
  stock?: number | string;
  quantity?: number | string;
  in_stock?: boolean;
  followers?: number | string;
  followers_count?: number | string;
  following?: number | string;
  following_count?: number | string;
  age?: string;
  account_age?: string;
  verified?: boolean | string;
  is_verified?: boolean;
  country?: string;
  gender?: string;
  features?: string[] | string;
  service_type?: string;
  type?: string;
}

export interface SanitizedCartlogsCategory {
  id: string;
  name: string;
  slug: string;
  product_count: number;
}

export interface SanitizedCartlogsProduct {
  id: string;
  title: string;
  category: string;
  description: string;
  supplier_price: number;
  price: number; // Customer price calculated with Surest Plug pricing formula
  stock: number;
  in_stock: boolean;
  followers_count?: string | number;
  following_count?: string | number;
  account_age?: string;
  verification_status?: 'verified' | 'unverified';
  country?: string;
  gender?: string;
  features: string[];
}

/**
 * Helper to check if a category/product is a boosting service (which MUST BE EXCLUDED from Cartlogs)
 */
function isBoostingService(title: string, categoryName: string, type?: string): boolean {
  const combined = `${title || ''} ${categoryName || ''} ${type || ''}`.toLowerCase();
  const boostingKeywords = [
    'boost',
    'boosting',
    'smm',
    'follower boost',
    'likes boost',
    'views boost',
    'custom comments',
    'retweets',
    'upvotes',
    'reactions',
    'drip feed',
    'dripfeed',
    'subscribers boost',
    'members boost',
    'watch hours',
    'live stream viewers'
  ];
  return boostingKeywords.some(keyword => combined.includes(keyword));
}

/**
 * Execute a secure server-side HTTP request to Cartlogs API
 */
async function callCartlogsApi(
  endpoint: string, 
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' = 'GET', 
  body?: any,
  customHeaders: Record<string, string> = {},
  isAdminQuery = false
): Promise<CartlogsApiResponse> {
  const apiKey = process.env.CARTLOGS_API_KEY;

  if (!apiKey || !apiKey.trim()) {
    return {
      success: false,
      error: isAdminQuery
        ? 'CARTLOGS_API_KEY environment variable is not configured on the server. Please add it to your server environment or .env file.'
        : 'Account logs and services are temporarily unavailable. Please try again later.'
    };
  }

  const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  const url = `${CARTLOGS_API_BASE_URL}${cleanEndpoint}`;

  const headers: Record<string, string> = {
    'Authorization': `Bearer ${apiKey.trim()}`,
    'Accept': 'application/json',
    'User-Agent': 'SurestPlug-Server/1.0',
    ...customHeaders
  };

  if (body && (method === 'POST' || method === 'PUT')) {
    headers['Content-Type'] = 'application/json';
  }

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 20000); // 20s timeout

    const response = await fetch(url, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
      signal: controller.signal
    });

    clearTimeout(timeoutId);

    const text = await response.text();
    let json: any = null;

    try {
      json = JSON.parse(text);
    } catch {
      // Non-JSON response
      if (!response.ok) {
        return {
          success: false,
          code: response.status,
          error: isAdminQuery 
            ? `Cartlogs API returned HTTP ${response.status}: ${response.statusText}`
            : 'Service is temporarily unavailable. Please try again later.'
        };
      }
    }

    if (!response.ok) {
      let friendlyError = 'Product is currently unavailable. Please try again later.';
      let adminDetail = json?.detail || json?.message || json?.error || `HTTP error ${response.status}`;

      if (response.status === 401) {
        friendlyError = 'Service configuration issue. Please contact support.';
        adminDetail = '401 INVALID_API_KEY: Authentication failed. Please check CARTLOGS_API_KEY.';
      } else if (response.status === 402) {
        friendlyError = 'Product is currently out of stock or unavailable.';
        adminDetail = '402 INSUFFICIENT_FUNDS / INSUFFICIENT_INVENTORY on Cartlogs supplier account.';
      } else if (response.status === 404) {
        friendlyError = 'The requested account is no longer available.';
        adminDetail = '404 INVALID_PRODUCT_ID: Product was not found on Cartlogs catalog.';
      } else if (response.status === 409) {
        friendlyError = 'Duplicate order request detected. Please check your Orders page.';
        adminDetail = '409 DUPLICATE_IDEMPOTENCY_KEY: This idempotency key was already used.';
      } else if (response.status === 429) {
        friendlyError = 'High demand detected. Please wait a few seconds and try again.';
        adminDetail = '429 RATE_LIMIT_EXCEEDED: Cartlogs API rate limit reached.';
      } else if (response.status >= 500) {
        friendlyError = 'Supplier service is undergoing maintenance. Please try again soon.';
        adminDetail = `500 SERVER_ERROR from Cartlogs: ${adminDetail}`;
      }

      return {
        success: false,
        code: response.status,
        error: isAdminQuery ? String(adminDetail) : friendlyError
      };
    }

    return {
      success: true,
      data: json
    };
  } catch (err: any) {
    const isTimeout = err.name === 'AbortError';
    return {
      success: false,
      error: isTimeout
        ? (isAdminQuery ? 'Cartlogs API request timed out after 20 seconds.' : 'Request timed out. Please try again.')
        : (isAdminQuery ? `Cartlogs connection error: ${err.message}` : 'Account service is temporarily unavailable. Please try again later.')
    };
  }
}

/**
 * 1. Test Connection with Cartlogs API (Admin Diagnostic)
 */
export async function testCartlogsConnection(): Promise<CartlogsApiResponse<{
  connected: boolean;
  provider: 'Cartlogs';
  latency_ms: number;
  categories_count: number;
  products_count: number;
  balance?: string | number;
  currency?: string;
  otp_supported: boolean;
  error?: string;
}>> {
  const startTime = Date.now();
  
  // Try fetching categories first to verify bearer token
  const catRes = await callCartlogsApi('/categories/', 'GET', undefined, {}, true);
  const latency = Date.now() - startTime;

  if (!catRes.success) {
    return {
      success: false,
      data: {
        connected: false,
        provider: 'Cartlogs',
        latency_ms: latency,
        categories_count: 0,
        products_count: 0,
        otp_supported: false,
        error: catRes.error || 'Failed to authenticate with Cartlogs API.'
      },
      error: catRes.error || 'Failed to authenticate with Cartlogs API.'
    };
  }

  const rawCats = Array.isArray(catRes.data) 
    ? catRes.data 
    : (catRes.data?.results || catRes.data?.data || []);
  
  // Try fetching products count
  let productsCount = 0;
  const prodRes = await callCartlogsApi('/products/', 'GET', undefined, {}, true);
  if (prodRes.success) {
    const rawProds = Array.isArray(prodRes.data)
      ? prodRes.data
      : (prodRes.data?.results || prodRes.data?.data || []);
    productsCount = rawProds.length;
  }

  // Check if balance endpoint exists
  let balance: any = undefined;
  let currency = 'NGN';
  try {
    const balRes = await callCartlogsApi('/balance/', 'GET', undefined, {}, true);
    if (balRes.success && balRes.data) {
      balance = balRes.data.balance || balRes.data.amount || balRes.data.wallet;
      currency = balRes.data.currency || 'NGN';
    }
  } catch {
    // Balance endpoint might not be exposed
  }

  // Inspect if OTP is supported
  const otpCheck = await inspectCartlogsOtpCapabilities();

  return {
    success: true,
    data: {
      connected: true,
      provider: 'Cartlogs',
      latency_ms: latency,
      categories_count: rawCats.length,
      products_count: productsCount,
      balance,
      currency,
      otp_supported: otpCheck.supported
    }
  };
}

/**
 * 2. Retrieve real categories from Cartlogs (Filtered & Dynamic)
 */
export async function getCartlogsCategories(isAdmin = false): Promise<CartlogsApiResponse<SanitizedCartlogsCategory[]>> {
  const res = await callCartlogsApi('/categories/', 'GET', undefined, {}, isAdmin);

  if (!res.success) {
    return {
      success: false,
      error: res.error || (isAdmin ? 'Failed to fetch categories from Cartlogs.' : 'Categories are temporarily unavailable.')
    };
  }

  const rawList: RawCartlogsCategory[] = Array.isArray(res.data) 
    ? res.data 
    : (res.data?.results || res.data?.data || []);

  const sanitized: SanitizedCartlogsCategory[] = rawList
    .filter(cat => {
      const name = cat.name || cat.title || '';
      // Strict exclusion: exclude boosting categories if any
      return !isBoostingService('', name);
    })
    .map((cat, idx) => {
      const id = String(cat.id || cat.pk || idx + 1);
      const name = cat.name || cat.title || `Category ${id}`;
      const slug = cat.slug || name.toLowerCase().replace(/[^a-z0-9]+/g, '-');
      const count = Number(cat.products_count || cat.count || 0);

      return {
        id,
        name,
        slug,
        product_count: count
      };
    });

  return {
    success: true,
    data: sanitized
  };
}

/**
 * 3. Retrieve real products from Cartlogs API with Surest Plug Pricing applied
 * - Excludes any boosting products (FollowSPanel remains exclusive boosting supplier)
 * - Sets separate supplier_price and customer price (via calculateSellingPrice)
 * - Returns stock status and account details
 */
export async function getCartlogsProducts(
  categoryFilter?: string, 
  isAdmin = false
): Promise<CartlogsApiResponse<SanitizedCartlogsProduct[]>> {
  let endpoint = '/products/';
  if (categoryFilter && categoryFilter !== 'all') {
    endpoint += `?category=${encodeURIComponent(categoryFilter)}`;
  }

  const res = await callCartlogsApi(endpoint, 'GET', undefined, {}, isAdmin);

  if (!res.success) {
    return {
      success: false,
      error: res.error || (isAdmin ? 'Failed to fetch products from Cartlogs.' : 'Products are temporarily unavailable.')
    };
  }

  const rawList: RawCartlogsProduct[] = Array.isArray(res.data)
    ? res.data
    : (res.data?.results || res.data?.data || []);

  const sanitizedProducts: SanitizedCartlogsProduct[] = [];

  for (const raw of rawList) {
    const title = raw.title || raw.name || 'Social Media Account';
    let catName = 'Social Accounts';
    if (typeof raw.category === 'string') {
      catName = raw.category;
    } else if (raw.category && typeof raw.category === 'object') {
      catName = raw.category.name || raw.category.title || 'Social Accounts';
    }

    // STRICT RULE: Exclude any boosting services
    if (isBoostingService(title, catName, raw.service_type || raw.type)) {
      continue;
    }

    // Parse raw supplier price
    const rawCost = typeof raw.price === 'number' 
      ? raw.price 
      : (typeof raw.cost === 'number' ? raw.cost : parseFloat(String(raw.price || raw.cost || '0')));
    
    const supplierCost = Math.max(0, isNaN(rawCost) ? 0 : rawCost);
    
    // Centralized Surest Plug selling price calculation
    const sellingPrice = calculateSellingPrice(supplierCost);

    // Stock
    const stockVal = typeof raw.stock === 'number' 
      ? raw.stock 
      : (typeof raw.quantity === 'number' ? raw.quantity : parseInt(String(raw.stock || raw.quantity || '0'), 10));
    const stock = isNaN(stockVal) ? 0 : stockVal;
    const inStock = raw.in_stock !== undefined ? Boolean(raw.in_stock) : stock > 0;

    // Account specific details
    const followers = raw.followers_count || raw.followers;
    const following = raw.following_count || raw.following;
    const age = raw.account_age || raw.age;
    const isVerified = raw.is_verified || raw.verified === true || raw.verified === 'verified';

    // Extract features
    let features: string[] = [];
    if (Array.isArray(raw.features)) {
      features = raw.features.map(String);
    } else if (typeof raw.features === 'string' && raw.features.trim()) {
      features = raw.features.split(',').map(f => f.trim()).filter(Boolean);
    } else {
      // Auto-extract features from metadata
      if (isVerified) features.push('Verified Account Badge');
      if (age) features.push(`Aged Account (${age})`);
      if (followers) features.push(`${followers.toLocaleString?.() || followers} Followers`);
      if (raw.country) features.push(`Region: ${raw.country}`);
      features.push('Full Email & Login Access');
      features.push('Instant Delivery');
    }

    sanitizedProducts.push({
      id: String(raw.id || raw.pk || raw.product_id || Math.random().toString(36).substr(2, 9)),
      title,
      category: catName,
      description: raw.description || raw.details || `Authentic ${catName} account ready for business marketing and instant outreach.`,
      supplier_price: supplierCost,
      price: sellingPrice,
      stock,
      in_stock: inStock,
      followers_count: followers,
      following_count: following,
      account_age: age,
      verification_status: isVerified ? 'verified' : 'unverified',
      country: raw.country,
      gender: raw.gender,
      features
    });
  }

  return {
    success: true,
    data: sanitizedProducts
  };
}

/**
 * 4. Create an Order with Cartlogs API
 * - Uses POST /orders/
 * - Includes Idempotency-Key
 * - Customer never sees Cartlogs Order ID or supplier cost
 */
export async function createCartlogsOrder(
  productId: string | number,
  quantity: number = 1,
  surestPlugOrderId: string,
  idempotencyKey?: string,
  isAdmin = false
): Promise<CartlogsApiResponse<{
  cartlogs_order_id: string | number;
  status: string;
  credentials?: {
    username?: string;
    password?: string;
    email?: string;
    email_password?: string;
    two_factor_key?: string;
    two_factor_code?: string;
    recovery_email?: string;
    additional_info?: string;
    raw_details?: string;
  };
}>> {
  const uniqueKey = idempotencyKey || `sp_cartlogs_${surestPlugOrderId}_${Date.now()}`;

  const payload = {
    items: [
      {
        product_id: productId,
        quantity: quantity || 1
      }
    ],
    metadata: {
      customer_reference: surestPlugOrderId
    }
  };

  const headers = {
    'Idempotency-Key': uniqueKey
  };

  const res = await callCartlogsApi('/orders/', 'POST', payload, headers, isAdmin);

  if (!res.success) {
    return {
      success: false,
      code: res.code,
      error: res.error || (isAdmin ? 'Cartlogs order submission failed.' : 'Account is currently unavailable. Please try again.')
    };
  }

  const orderData = res.data;
  const cartlogsOrderId = orderData?.id || orderData?.order_id || orderData?.pk || 'N/A';
  const status = orderData?.status || 'completed';

  // Extract credentials securely if fulfilled immediately
  let credentials: any = undefined;
  const rawCreds = orderData?.credentials || orderData?.items?.[0]?.credentials || orderData?.item?.credentials || orderData?.data;

  if (rawCreds) {
    if (typeof rawCreds === 'object') {
      credentials = {
        username: rawCreds.username || rawCreds.user || rawCreds.login,
        password: rawCreds.password || rawCreds.pass,
        email: rawCreds.email || rawCreds.mail,
        email_password: rawCreds.email_password || rawCreds.mail_password,
        two_factor_key: rawCreds.two_factor_key || rawCreds['2fa_key'] || rawCreds.two_fa,
        two_factor_code: rawCreds.two_factor_code || rawCreds['2fa_code'],
        recovery_email: rawCreds.recovery_email,
        additional_info: rawCreds.additional_info || rawCreds.notes || rawCreds.info,
        raw_details: rawCreds.raw || rawCreds.text
      };
    } else if (typeof rawCreds === 'string') {
      credentials = {
        raw_details: rawCreds
      };
    }
  }

  return {
    success: true,
    data: {
      cartlogs_order_id: cartlogsOrderId,
      status,
      credentials
    }
  };
}

/**
 * 5. Retrieve Order Status from Cartlogs
 */
export async function getCartlogsOrderStatus(
  orderId: string | number,
  isAdmin = false
): Promise<CartlogsApiResponse<any>> {
  if (!orderId || orderId === 'N/A') {
    return { success: false, error: 'Order ID is required.' };
  }

  const res = await callCartlogsApi(`/orders/${orderId}/`, 'GET', undefined, {}, isAdmin);
  return res;
}

/**
 * 6. Verify Cartlogs Webhook HMAC-SHA256 Signature (Optional)
 * - Only verified if CARTLOGS_WEBHOOK_SECRET is explicitly configured.
 * - Otherwise accepts webhook payloads without requiring an invented secret.
 */
export function verifyCartlogsWebhookSignature(
  rawBody: string,
  signatureHeader?: string,
  secret?: string
): boolean {
  const webhookSecret = secret || process.env.CARTLOGS_WEBHOOK_SECRET;

  // If no webhook secret is configured in the environment, signature verification is optional/skipped
  if (!webhookSecret || !webhookSecret.trim()) {
    return true;
  }

  if (!signatureHeader) {
    return false;
  }

  try {
    const computed = crypto
      .createHmac('sha256', webhookSecret.trim())
      .update(rawBody)
      .digest('hex');

    const cleanSignature = signatureHeader.replace(/^sha256=/, '').trim();
    
    // Constant time comparison
    return crypto.timingSafeEqual(
      Buffer.from(computed, 'utf-8'),
      Buffer.from(cleanSignature, 'utf-8')
    );
  } catch {
    return false;
  }
}

/**
 * 7. Inspect Cartlogs Capabilities for International Phone/OTP Numbers
 * - The Cartlogs API documents account products.
 * - This function verifies whether OTP/phone number endpoints or categories exist.
 */
export async function inspectCartlogsOtpCapabilities(): Promise<{
  supported: boolean;
  categories: string[];
  message: string;
}> {
  try {
    const catRes = await callCartlogsApi('/categories/', 'GET', undefined, {}, true);
    if (!catRes.success) {
      return {
        supported: false,
        categories: [],
        message: 'Cartlogs API is not reachable or CARTLOGS_API_KEY is not set.'
      };
    }

    const categoriesList: RawCartlogsCategory[] = Array.isArray(catRes.data)
      ? catRes.data
      : (catRes.data?.results || catRes.data?.data || []);

    const catNames = categoriesList.map(c => (c.name || c.title || '').toLowerCase());
    
    const otpKeywords = ['otp', 'phone', 'virtual number', 'sms verification', 'phone verification', 'sim'];
    const matchingCats = catNames.filter(name => otpKeywords.some(kw => name.includes(kw)));

    if (matchingCats.length > 0) {
      return {
        supported: true,
        categories: matchingCats,
        message: `Cartlogs provides phone/OTP verification in categories: ${matchingCats.join(', ')}`
      };
    }

    return {
      supported: false,
      categories: [],
      message: 'Cartlogs does not currently expose international phone/OTP verification numbers in its documented categories.'
    };
  } catch {
    return {
      supported: false,
      categories: [],
      message: 'Unable to inspect Cartlogs OTP capabilities.'
    };
  }
}
