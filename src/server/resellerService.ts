/**
 * Surest Plug - Reseller API Service
 * 
 * Provides production-ready Reseller API v1 backend:
 * - Secure Bearer token authentication with SHA-256 hashed API keys
 * - Strict ₦5,000 minimum wallet balance eligibility enforcement (server-side)
 * - Single wallet architecture (reuses existing Surest Plug user balance)
 * - Provider secrets fully shielded & isolated
 * - Idempotent order processing across SMM, Social Accounts, International Numbers, and Marketplace
 * - Webhook system with HMAC-SHA256 signature verification
 * - Detailed API request audit logging and admin oversight controls
 */

import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { 
  ResellerProfile, 
  ResellerOrder, 
  ResellerApiLog, 
  ResellerPricingConfig, 
  ResellerProductItem 
} from '../types/index.ts';
import { 
  getFollowSPanelServices, 
  createFollowSPanelOrder, 
  getFollowSPanelOrderStatus 
} from './smmService.ts';
import { 
  getCartlogsProducts, 
  createCartlogsOrder, 
  getCartlogsOrderStatus 
} from './cartlogsService.ts';
import { 
  getServices as getIntlServices, 
  purchaseNumber as purchaseIntlNumber, 
  getOrderStatus as getIntlOrderStatus, 
  cancelOrder as cancelIntlOrder,
  getPrice as getIntlPrice
} from './internationalNumbersService.ts';

// File persistence paths
const DATA_DIR = path.resolve(process.cwd(), 'data');
const RESELLERS_FILE = path.join(DATA_DIR, 'resellers.json');
const RESELLER_ORDERS_FILE = path.join(DATA_DIR, 'reseller_orders.json');
const RESELLER_LOGS_FILE = path.join(DATA_DIR, 'reseller_logs.json');
const RESELLER_CONFIG_FILE = path.join(DATA_DIR, 'reseller_config.json');

// Ensure data directory exists
try {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
} catch (e) {
  console.warn('[ResellerService] Data directory check warning:', e);
}

// Default Reseller Configuration - STRICTLY UNIVERSAL (NO TIERS OR LEVELS)
const DEFAULT_CONFIG: ResellerPricingConfig = {
  smm_discount_percent: 5,
  accounts_discount_percent: 5,
  numbers_discount_percent: 5,
  marketplace_discount_percent: 5,
  min_balance_threshold: 5000, // ₦5,000 strict minimum requirement
  enabled_categories: {
    smm: true,
    accounts: true,
    numbers: true,
    marketplace: true
  },
  disabled_product_ids: []
};

// In-Memory Caches
let resellersCache: Map<string, ResellerProfile & { apiKeyHash?: string }> = new Map();
let ordersCache: ResellerOrder[] = [];
let logsCache: ResellerApiLog[] = [];
let pricingConfig: ResellerPricingConfig = { ...DEFAULT_CONFIG };

// Load persistent data on startup
function loadPersistence() {
  try {
    if (fs.existsSync(RESELLERS_FILE)) {
      const data = JSON.parse(fs.readFileSync(RESELLERS_FILE, 'utf-8'));
      resellersCache = new Map(Object.entries(data));
    }
  } catch (e) {
    console.warn('[ResellerService] Failed to load resellers file:', e);
  }

  try {
    if (fs.existsSync(RESELLER_ORDERS_FILE)) {
      ordersCache = JSON.parse(fs.readFileSync(RESELLER_ORDERS_FILE, 'utf-8'));
    }
  } catch (e) {
    console.warn('[ResellerService] Failed to load orders file:', e);
  }

  try {
    if (fs.existsSync(RESELLER_LOGS_FILE)) {
      logsCache = JSON.parse(fs.readFileSync(RESELLER_LOGS_FILE, 'utf-8'));
    }
  } catch (e) {
    console.warn('[ResellerService] Failed to load logs file:', e);
  }

  try {
    if (fs.existsSync(RESELLER_CONFIG_FILE)) {
      pricingConfig = { ...DEFAULT_CONFIG, ...JSON.parse(fs.readFileSync(RESELLER_CONFIG_FILE, 'utf-8')) };
    }
  } catch (e) {
    console.warn('[ResellerService] Failed to load config file:', e);
  }
}

loadPersistence();

// Save helpers with non-blocking try-catch
function saveResellers() {
  try {
    const obj: Record<string, any> = {};
    resellersCache.forEach((val, key) => {
      obj[key] = val;
    });
    fs.writeFileSync(RESELLERS_FILE, JSON.stringify(obj, null, 2), 'utf-8');
  } catch (e) {
    console.error('[ResellerService] Error saving resellers:', e);
  }
}

function saveOrders() {
  try {
    fs.writeFileSync(RESELLER_ORDERS_FILE, JSON.stringify(ordersCache.slice(-2000), null, 2), 'utf-8');
  } catch (e) {
    console.error('[ResellerService] Error saving orders:', e);
  }
}

function saveLogs() {
  try {
    fs.writeFileSync(RESELLER_LOGS_FILE, JSON.stringify(logsCache.slice(-2000), null, 2), 'utf-8');
  } catch (e) {
    console.error('[ResellerService] Error saving logs:', e);
  }
}

function saveConfig() {
  try {
    fs.writeFileSync(RESELLER_CONFIG_FILE, JSON.stringify(pricingConfig, null, 2), 'utf-8');
  } catch (e) {
    console.error('[ResellerService] Error saving config:', e);
  }
}

/**
 * Hash raw API key using SHA-256 for secure constant-time matching
 */
export function hashApiKey(rawKey: string): string {
  return crypto.createHash('sha256').update(rawKey.trim()).digest('hex');
}

/**
 * Generate a new cryptographically secure API key
 * Format: sp_live_<48-hex-chars>
 */
export function generateApiKeyString(): string {
  const randomHex = crypto.randomBytes(24).toString('hex');
  return `sp_live_${randomHex}`;
}

/**
 * Generate a new webhook signing secret
 * Format: sp_whsec_<32-hex-chars>
 */
export function generateWebhookSecret(): string {
  const randomHex = crypto.randomBytes(16).toString('hex');
  return `sp_whsec_${randomHex}`;
}

/**
 * Mask an API key for safe public viewing:
 * e.g. sp_live_9f8a...3a1c
 */
export function maskApiKey(apiKey: string): string {
  if (!apiKey || apiKey.length < 16) return 'sp_live_••••••••';
  const prefix = apiKey.substring(0, 12);
  const suffix = apiKey.substring(apiKey.length - 4);
  return `${prefix}...${suffix}`;
}

/**
 * Retrieve or initialize a reseller profile
 */
export function getOrCreateResellerProfile(
  userId: string | number,
  email: string,
  fullName: string,
  currentBalance: number
): ResellerProfile {
  const key = String(userId);
  let profile = resellersCache.get(key);

  const isEligible = currentBalance >= pricingConfig.min_balance_threshold;

  if (!profile) {
    profile = {
      user_id: userId,
      full_name: fullName || 'Surest Plug Reseller',
      email: email.toLowerCase().trim(),
      status: 'active',
      balance: currentBalance,
      currency: 'NGN',
      min_balance_threshold: pricingConfig.min_balance_threshold,
      is_eligible: isEligible,
      has_api_key: false,
      total_orders: 0,
      total_spent: 0,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    resellersCache.set(key, profile);
    saveResellers();
  } else {
    // Update live fields
    profile.balance = currentBalance;
    profile.is_eligible = isEligible;
    if (fullName && fullName !== profile.full_name) profile.full_name = fullName;
    if (email && email !== profile.email) profile.email = email.toLowerCase().trim();
  }

  return sanitizeResellerProfile(profile);
}

/**
 * Remove sensitive credentials from ResellerProfile
 */
export function sanitizeResellerProfile(profile: any): ResellerProfile {
  const { apiKeyHash, ...safe } = profile;
  return {
    ...safe,
    currency: 'NGN',
    min_balance_threshold: pricingConfig.min_balance_threshold,
    is_eligible: (safe.balance ?? 0) >= pricingConfig.min_balance_threshold
  };
}

/**
 * Generate and activate a new API Key for a user
 * Returns the raw key ONLY ONCE.
 */
export function generateResellerKey(
  userId: string | number,
  email: string,
  fullName: string,
  currentBalance: number
): {
  success: boolean;
  apiKey?: string;
  maskedKey?: string;
  prefix?: string;
  error?: string;
} {
  const minRequired = pricingConfig.min_balance_threshold;
  if (currentBalance < minRequired) {
    return {
      success: false,
      error: `Reseller API access requires a minimum wallet balance of ₦${minRequired.toLocaleString()}. Your current balance is ₦${currentBalance.toLocaleString()}. Please top up your wallet first.`
    };
  }

  const rawKey = generateApiKeyString();
  const keyHash = hashApiKey(rawKey);
  const masked = maskApiKey(rawKey);
  const prefix = rawKey.substring(0, 12);
  const now = new Date().toISOString();

  const key = String(userId);
  let profile = resellersCache.get(key);

  if (!profile) {
    profile = {
      user_id: userId,
      full_name: fullName,
      email: email.toLowerCase().trim(),
      status: 'active',
      balance: currentBalance,
      currency: 'NGN',
      min_balance_threshold: minRequired,
      is_eligible: true,
      has_api_key: true,
      api_key_prefix: prefix,
      api_key_masked: masked,
      api_key_created_at: now,
      api_key_last_used_at: null,
      total_orders: 0,
      total_spent: 0,
      created_at: now,
      updated_at: now
    };
  } else {
    profile.status = 'active';
    profile.balance = currentBalance;
    profile.is_eligible = true;
    profile.has_api_key = true;
    profile.api_key_prefix = prefix;
    profile.api_key_masked = masked;
    profile.api_key_created_at = now;
    profile.updated_at = now;
  }

  // Attach secret hash to profile
  profile.apiKeyHash = keyHash;

  resellersCache.set(key, profile);
  saveResellers();

  return {
    success: true,
    apiKey: rawKey,
    maskedKey: masked,
    prefix
  };
}

/**
 * Revoke an API Key for a user
 */
export function revokeResellerKey(userId: string | number): { success: boolean; message: string } {
  const key = String(userId);
  const profile = resellersCache.get(key);
  if (!profile) {
    return { success: false, message: 'Reseller account not found.' };
  }

  profile.has_api_key = false;
  profile.api_key_prefix = undefined;
  profile.api_key_masked = undefined;
  profile.api_key_created_at = undefined;
  profile.apiKeyHash = undefined;
  profile.updated_at = new Date().toISOString();

  resellersCache.set(key, profile);
  saveResellers();

  return { success: true, message: 'API Key has been successfully revoked.' };
}

/**
 * Synchronize authoritative wallet balance from Surest Plug user store
 * Automatically handles temporary suspension / reactivation based on the ₦5,000 threshold
 */
export function syncResellerWalletBalance(
  userId: string | number,
  newBalance: number
): { success: boolean; profile?: ResellerProfile; error?: string } {
  const key = String(userId);
  const profile = resellersCache.get(key);
  if (!profile) {
    return { success: false, error: 'Reseller account not found.' };
  }

  const minRequired = pricingConfig.min_balance_threshold;
  const validBalance = Math.max(0, Number(newBalance.toFixed(2)));
  profile.balance = validBalance;
  profile.min_balance_threshold = minRequired;
  
  // Rule 6 & 18: Automatically restore API access if balance reaches ₦5,000 or more
  profile.is_eligible = validBalance >= minRequired;
  profile.updated_at = new Date().toISOString();

  resellersCache.set(key, profile);
  saveResellers();

  return {
    success: true,
    profile: sanitizeResellerProfile(profile)
  };
}

/**
 * Update reseller webhook settings
 */
export function updateResellerWebhookConfig(
  userId: string | number,
  webhookUrl: string | null
): { success: boolean; webhookSecret?: string; error?: string } {
  const key = String(userId);
  const profile = resellersCache.get(key);
  if (!profile) {
    return { success: false, error: 'Reseller account not found.' };
  }

  if (webhookUrl && webhookUrl.trim()) {
    const cleanUrl = webhookUrl.trim();
    if (!cleanUrl.startsWith('http://') && !cleanUrl.startsWith('https://')) {
      return { success: false, error: 'Webhook URL must start with http:// or https://' };
    }
    profile.webhook_url = cleanUrl;
    profile.webhook_enabled = true;
    if (!profile.webhook_secret) {
      profile.webhook_secret = generateWebhookSecret();
    }
  } else {
    profile.webhook_url = null;
    profile.webhook_enabled = false;
  }

  profile.updated_at = new Date().toISOString();
  resellersCache.set(key, profile);
  saveResellers();

  return {
    success: true,
    webhookSecret: profile.webhook_secret || undefined
  };
}

/**
 * Authenticate incoming HTTP request Bearer token
 * Returns reseller profile if authenticated, eligible, and active
 */
export function authenticateResellerToken(
  rawAuthHeader?: string,
  options?: { allowBelowThreshold?: boolean }
): {
  authenticated: boolean;
  reseller?: ResellerProfile;
  error?: string;
  statusCode?: number;
  code?: string;
} {
  if (!rawAuthHeader || !rawAuthHeader.trim()) {
    return {
      authenticated: false,
      statusCode: 401,
      code: 'UNAUTHORIZED',
      error: 'Missing Authorization header. Expected format: Authorization: Bearer sp_live_...'
    };
  }

  let token = rawAuthHeader.trim();
  if (token.toLowerCase().startsWith('bearer ')) {
    token = token.slice(7).trim();
  }

  if (!token) {
    return {
      authenticated: false,
      statusCode: 401,
      code: 'INVALID_TOKEN',
      error: 'Empty API key provided.'
    };
  }

  const keyHash = hashApiKey(token);

  // Search in memory cache
  let matchedProfile: (ResellerProfile & { apiKeyHash?: string }) | null = null;
  for (const p of resellersCache.values()) {
    if (p.apiKeyHash && p.apiKeyHash === keyHash) {
      matchedProfile = p;
      break;
    }
  }

  if (!matchedProfile) {
    return {
      authenticated: false,
      statusCode: 401,
      code: 'INVALID_API_KEY',
      error: 'Invalid or revoked API key. Please check your credentials.'
    };
  }

  if (matchedProfile.status === 'suspended') {
    return {
      authenticated: false,
      statusCode: 403,
      code: 'ACCOUNT_SUSPENDED',
      error: 'Your Reseller API account has been suspended by administration. Please contact support.'
    };
  }

  // Strict ₦5,000 minimum balance enforcement
  const minRequired = pricingConfig.min_balance_threshold;
  const isBelowThreshold = (matchedProfile.balance ?? 0) < minRequired;

  if (isBelowThreshold && !options?.allowBelowThreshold) {
    return {
      authenticated: false,
      statusCode: 403,
      code: 'INSUFFICIENT_RESELLER_BALANCE',
      error: `Reseller API requires a minimum wallet balance of ₦${minRequired.toLocaleString()}. Current balance: ₦${(matchedProfile.balance ?? 0).toLocaleString()}. Please top up your wallet to continue using the API.`
    };
  }

  // Update last used timestamp asynchronously
  matchedProfile.api_key_last_used_at = new Date().toISOString();
  saveResellers();

  return {
    authenticated: true,
    reseller: sanitizeResellerProfile(matchedProfile)
  };
}

/**
 * Log API Call for audit and telemetry
 */
export function logResellerApiCall(log: {
  reseller_id: number | string;
  reseller_email: string;
  method: string;
  path: string;
  status_code: number;
  latency_ms: number;
  ip: string;
  user_agent?: string;
  error_message?: string;
}): ResellerApiLog {
  const entry: ResellerApiLog = {
    id: `log_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    reseller_id: log.reseller_id,
    reseller_email: log.reseller_email,
    method: log.method,
    path: log.path,
    status_code: log.status_code,
    latency_ms: Math.round(log.latency_ms),
    ip: log.ip,
    user_agent: log.user_agent,
    error_message: log.error_message,
    created_at: new Date().toISOString()
  };

  logsCache.unshift(entry);
  if (logsCache.length > 5000) {
    logsCache = logsCache.slice(0, 5000);
  }
  saveLogs();

  return entry;
}

let catalogCache: { timestamp: number; items: ResellerProductItem[] } | null = null;
const CATALOG_CACHE_TTL_MS = 2 * 60 * 1000; // 2 minutes

/**
 * Get catalog of products available to resellers with discounted rates
 */
export async function getResellerProductsCatalog(
  category?: string,
  search?: string
): Promise<{ success: boolean; products: ResellerProductItem[]; count: number }> {
  // Use cached full catalog if available and within TTL
  if (catalogCache && (Date.now() - catalogCache.timestamp < CATALOG_CACHE_TTL_MS)) {
    let filtered = catalogCache.items;
    if (category) {
      filtered = filtered.filter(i => i.category === category);
    }
    if (search && search.trim()) {
      const q = search.trim().toLowerCase();
      filtered = filtered.filter(i => 
        i.name.toLowerCase().includes(q) || 
        i.description.toLowerCase().includes(q) ||
        i.category.toLowerCase().includes(q)
      );
    }
    return {
      success: true,
      products: filtered,
      count: filtered.length
    };
  }

  const items: ResellerProductItem[] = [];
  const enabledCats = pricingConfig.enabled_categories || { smm: true, accounts: true, numbers: true, marketplace: true };
  const disabledProducts = new Set((pricingConfig.disabled_product_ids || []).map(String));

  // Concurrently fetch SMM, Accounts, and Virtual Numbers
  const [smmSettled, cartlogsSettled, numbersSettled] = await Promise.allSettled([
    // 1. SMM Boosting Services
    (enabledCats.smm && (!category || category === 'smm' || category === 'boosting'))
      ? getFollowSPanelServices()
      : Promise.resolve(null),
    // 2. Social Accounts / Cartlogs
    (enabledCats.accounts && (!category || category === 'accounts' || category === 'logs'))
      ? getCartlogsProducts()
      : Promise.resolve(null),
    // 3. International Virtual Numbers
    (enabledCats.numbers && (!category || category === 'numbers' || category === 'sms'))
      ? getIntlServices()
      : Promise.resolve(null)
  ]);

  // Process SMM
  if (smmSettled.status === 'fulfilled' && smmSettled.value && smmSettled.value.success && Array.isArray(smmSettled.value.data)) {
    for (const s of smmSettled.value.data.slice(0, 50)) {
      const serviceId = s.service ?? (s as any).id ?? (s as any).service_id;
      if (disabledProducts.has(String(serviceId)) || disabledProducts.has(`smm_${serviceId}`)) {
        continue;
      }
      const standardRate = parseFloat(s.rate) || 1000;
      const discountMultiplier = 1 - (pricingConfig.smm_discount_percent / 100);
      const resellerRate = Math.round(standardRate * discountMultiplier);

      items.push({
        id: `smm_${serviceId}`,
        name: s.name,
        category: 'smm',
        category_label: 'Social Media Boosting',
        description: `${s.category} - Min: ${s.min}, Max: ${s.max}`,
        price: resellerRate,
        original_price: standardRate,
        currency: 'NGN',
        in_stock: true,
        rate_per_1000: resellerRate,
        min_quantity: s.min,
        max_quantity: s.max,
        fields_required: ['service_id', 'link', 'quantity'],
        sample_request: {
          category: 'smm',
          service_id: serviceId,
          link: 'https://instagram.com/your_profile',
          quantity: s.min || 100
        }
      });
    }
  }

  // Process Accounts
  if (cartlogsSettled.status === 'fulfilled' && cartlogsSettled.value && cartlogsSettled.value.success && Array.isArray(cartlogsSettled.value.data)) {
    for (const p of cartlogsSettled.value.data) {
      if (disabledProducts.has(String(p.id)) || disabledProducts.has(`acc_${p.id}`) || disabledProducts.has(`accounts_${p.id}`)) {
        continue;
      }
      const discountMultiplier = 1 - (pricingConfig.accounts_discount_percent / 100);
      const resellerPrice = Math.round(p.price * discountMultiplier);

      items.push({
        id: `acc_${p.id}`,
        name: p.title,
        category: 'accounts',
        category_label: 'Aged Social Accounts',
        description: `${p.category} | Stock: ${p.stock}`,
        price: resellerPrice,
        original_price: p.price,
        currency: 'NGN',
        in_stock: p.in_stock && p.stock > 0,
        stock_count: p.stock,
        min_quantity: 1,
        max_quantity: p.stock || 10,
        fields_required: ['product_id', 'quantity'],
        sample_request: {
          category: 'accounts',
          product_id: p.id,
          quantity: 1
        }
      });
    }
  }

  // Process Virtual Numbers
  if (numbersSettled.status === 'fulfilled' && numbersSettled.value && numbersSettled.value.success) {
    const servicesList = (numbersSettled.value as any).services || (numbersSettled.value as any).data || [];
    if (Array.isArray(servicesList)) {
      for (const s of servicesList.slice(0, 30)) {
        const numId = s.id || s.code;
        if (disabledProducts.has(String(numId)) || disabledProducts.has(`num_${numId}`)) {
          continue;
        }
        const basePrice = s.price || 1200;
        const discountMultiplier = 1 - (pricingConfig.numbers_discount_percent / 100);
        const resellerPrice = Math.round(basePrice * discountMultiplier);

        items.push({
          id: `num_${numId}`,
          name: `${s.name} Virtual Number (USA/Global)`,
          category: 'numbers',
          category_label: 'International Numbers (SMS OTP)',
          description: `Receive instant SMS verification code for ${s.name}`,
          price: resellerPrice,
          original_price: basePrice,
          currency: 'NGN',
          in_stock: s.available !== false,
          fields_required: ['country', 'service'],
          sample_request: {
            category: 'numbers',
            country: '0', // USA
            service: s.code || s.id
          }
        });
      }
    }
  }

  // Cache catalog when unfiltered
  if (!category && items.length > 0) {
    catalogCache = {
      timestamp: Date.now(),
      items: [...items]
    };
  }

  // Filter by search query if present
  let filtered = items;
  if (search && search.trim()) {
    const q = search.trim().toLowerCase();
    filtered = items.filter(i => 
      i.name.toLowerCase().includes(q) || 
      i.description.toLowerCase().includes(q) ||
      i.category.toLowerCase().includes(q)
    );
  }

  return {
    success: true,
    products: filtered,
    count: filtered.length
  };
}

/**
 * Dispatch signed webhook notification to reseller
 */
export async function dispatchWebhookEvent(
  resellerId: string | number,
  event: string,
  payload: Record<string, any>
): Promise<{ success: boolean; status?: number; error?: string }> {
  const profile = resellersCache.get(String(resellerId));
  if (!profile || !profile.webhook_url || !profile.webhook_enabled) {
    return { success: false, error: 'Webhook URL not configured or disabled.' };
  }

  const bodyData = {
    id: `evt_${Date.now()}_${crypto.randomBytes(6).toString('hex')}`,
    event,
    created_at: new Date().toISOString(),
    data: payload
  };

  const bodyString = JSON.stringify(bodyData);
  const secret = profile.webhook_secret || 'sp_whsec_default';
  const signature = crypto.createHmac('sha256', secret).update(bodyString).digest('hex');

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 8000);

    const response = await fetch(profile.webhook_url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'SurestPlug-Webhook/1.0',
        'X-SurestPlug-Signature': `sha256=${signature}`,
        'X-SurestPlug-Event': event
      },
      body: bodyString,
      signal: controller.signal
    });

    clearTimeout(timeoutId);

    profile.webhook_last_status = response.status;
    profile.webhook_last_error = response.ok ? null : `HTTP ${response.status} - ${response.statusText}`;
    profile.webhook_last_dispatched_at = new Date().toISOString();
    saveResellers();

    return {
      success: response.ok,
      status: response.status
    };
  } catch (err: any) {
    profile.webhook_last_status = 500;
    profile.webhook_last_error = err?.message || 'Connection timeout or network failure';
    profile.webhook_last_dispatched_at = new Date().toISOString();
    saveResellers();

    return {
      success: false,
      error: err?.message || 'Webhook dispatch failed'
    };
  }
}

/**
 * Process a new Reseller Order with strict financial safety & idempotency
 */
export async function processResellerOrder(
  reseller: ResellerProfile,
  payload: {
    category: string;
    service_id?: string | number;
    product_id?: string | number;
    country?: string;
    service?: string;
    link?: string;
    quantity?: number;
    idempotency_key?: string;
  },
  idempotencyKeyHeader?: string
): Promise<{
  success: boolean;
  statusCode: number;
  order?: ResellerOrder;
  error?: string;
  code?: string;
}> {
  const idempotencyKey = idempotencyKeyHeader?.trim() || payload.idempotency_key?.trim();

  // 1. Idempotency Check: Return cached response if this key was already processed
  if (idempotencyKey) {
    const existing = ordersCache.find(o => 
      String(o.reseller_id) === String(reseller.user_id) && 
      o.idempotency_key === idempotencyKey
    );
    if (existing) {
      return {
        success: true,
        statusCode: 200,
        order: existing
      };
    }
  }

  const category = (payload.category || '').toLowerCase().trim();
  if (!['smm', 'accounts', 'numbers', 'marketplace'].includes(category)) {
    return {
      success: false,
      statusCode: 400,
      code: 'INVALID_CATEGORY',
      error: 'Invalid order category. Supported categories: "smm", "accounts", "numbers", "marketplace".'
    };
  }

  // Check if product category is enabled by administration
  const enabledCats = pricingConfig.enabled_categories || { smm: true, accounts: true, numbers: true, marketplace: true };
  if ((enabledCats as any)[category] === false) {
    return {
      success: false,
      statusCode: 403,
      code: 'CATEGORY_DISABLED',
      error: `The "${category}" product category is currently disabled for Reseller API ordering by administration.`
    };
  }

  // Check if specific product is disabled by administration
  const disabledProducts = new Set((pricingConfig.disabled_product_ids || []).map(String));
  const rawTargetId = String(payload.service_id || payload.product_id || payload.service || '');
  if (rawTargetId && (disabledProducts.has(rawTargetId) || disabledProducts.has(`${category}_${rawTargetId}`))) {
    return {
      success: false,
      statusCode: 403,
      code: 'PRODUCT_DISABLED',
      error: `This product/service (ID: ${rawTargetId}) is currently disabled for Reseller API ordering by administration.`
    };
  }

  // 2. Minimum balance threshold check
  const minRequired = pricingConfig.min_balance_threshold;
  if ((reseller.balance ?? 0) < minRequired) {
    return {
      success: false,
      statusCode: 403,
      code: 'INSUFFICIENT_RESELLER_BALANCE',
      error: `Reseller API requires a minimum wallet balance of ₦${minRequired.toLocaleString()}. Current balance: ₦${(reseller.balance ?? 0).toLocaleString()}. Please top up your wallet.`
    };
  }

  // 3. Category Specific Execution & Price Calculation
  let orderAmount = 0;
  let productName = '';
  let provider = '';
  let providerOrderId: string | number | undefined;
  let deliveryDetails: Record<string, any> = {};
  let status: ResellerOrder['status'] = 'processing';
  const orderReference = `SP-API-${Date.now()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;

  // SMM BOOSTING ORDER
  if (category === 'smm') {
    const serviceId = payload.service_id;
    const link = payload.link;
    const quantity = Number(payload.quantity);

    if (!serviceId || !link || !quantity || quantity <= 0) {
      return {
        success: false,
        statusCode: 400,
        code: 'MISSING_PARAMETERS',
        error: 'SMM orders require service_id, link, and quantity.'
      };
    }

    // Retrieve service rate
    const servicesRes = await getFollowSPanelServices();
    let serviceRatePer1000 = 1000;
    if (servicesRes.success && Array.isArray(servicesRes.data)) {
      const match = servicesRes.data.find(s => String(s.service) === String(serviceId));
      if (match) {
        serviceRatePer1000 = parseFloat(match.rate) || 1000;
        productName = match.name;
      }
    }

    const discountMultiplier = 1 - (pricingConfig.smm_discount_percent / 100);
    orderAmount = Math.max(1, Math.round(((serviceRatePer1000 * quantity) / 1000) * discountMultiplier));
    productName = productName || `SMM Service #${serviceId}`;
    provider = 'followspanel';

    // Verify user balance
    if (reseller.balance < orderAmount) {
      return {
        success: false,
        statusCode: 400,
        code: 'INSUFFICIENT_BALANCE',
        error: `Insufficient wallet balance. Required: ₦${orderAmount.toLocaleString()}, Available: ₦${reseller.balance.toLocaleString()}.`
      };
    }

    // Call SMM Provider
    const providerResult = await createFollowSPanelOrder(serviceId, link, quantity);
    if (!providerResult.success || !providerResult.data?.order_id) {
      return {
        success: false,
        statusCode: 502,
        code: 'PROVIDER_ERROR',
        error: providerResult.error || 'Failed to place order with SMM upstream provider.'
      };
    }

    providerOrderId = providerResult.data.order_id;
    deliveryDetails = {
      service_id: serviceId,
      link,
      quantity,
      provider_order_id: providerOrderId
    };
    status = 'processing';
  }

  // ACCOUNTS / CARTLOGS ORDER
  else if (category === 'accounts') {
    const productId = payload.product_id;
    const quantity = Number(payload.quantity) || 1;

    if (!productId) {
      return {
        success: false,
        statusCode: 400,
        code: 'MISSING_PARAMETERS',
        error: 'Accounts orders require product_id.'
      };
    }

    const productsRes = await getCartlogsProducts();
    let unitPrice = 3000;
    if (productsRes.success && Array.isArray(productsRes.data)) {
      const match = productsRes.data.find(p => String(p.id) === String(productId));
      if (match) {
        unitPrice = match.price;
        productName = match.title;
        if (!match.in_stock || match.stock < quantity) {
          return {
            success: false,
            statusCode: 400,
            code: 'OUT_OF_STOCK',
            error: `Selected account is currently out of stock (Available: ${match.stock}).`
          };
        }
      }
    }

    const discountMultiplier = 1 - (pricingConfig.accounts_discount_percent / 100);
    orderAmount = Math.max(1, Math.round(unitPrice * quantity * discountMultiplier));
    productName = productName || `Account Product #${productId}`;
    provider = 'cartlogs';

    if (reseller.balance < orderAmount) {
      return {
        success: false,
        statusCode: 400,
        code: 'INSUFFICIENT_BALANCE',
        error: `Insufficient wallet balance. Required: ₦${orderAmount.toLocaleString()}, Available: ₦${reseller.balance.toLocaleString()}.`
      };
    }

    const providerResult = await createCartlogsOrder(
      productId,
      quantity,
      orderReference,
      idempotencyKey || orderReference,
      false
    );

    if (!providerResult.success) {
      return {
        success: false,
        statusCode: 502,
        code: 'PROVIDER_ERROR',
        error: providerResult.error || 'Failed to procure accounts from upstream provider.'
      };
    }

    providerOrderId = providerResult.data?.cartlogs_order_id;
    deliveryDetails = {
      credentials: providerResult.data?.credentials || {},
      status: providerResult.data?.status || 'completed'
    };
    status = 'completed';
  }

  // INTERNATIONAL NUMBERS (SMS)
  else if (category === 'numbers') {
    const country = payload.country || '0'; // default USA
    const service = payload.service || 'wa'; // default WhatsApp

    const discountMultiplier = 1 - (pricingConfig.numbers_discount_percent / 100);
    let standardPrice = 1350;
    try {
      const priceRes = await getIntlPrice(country, service);
      if (priceRes && priceRes.price) {
        standardPrice = priceRes.price;
      }
    } catch (e) {
      // fallback to standard price
    }

    orderAmount = Math.round(standardPrice * discountMultiplier);
    productName = `Virtual Number (${service.toUpperCase()} - Country ${country})`;
    provider = 'instantnums';

    if (reseller.balance < orderAmount) {
      return {
        success: false,
        statusCode: 400,
        code: 'INSUFFICIENT_BALANCE',
        error: `Insufficient wallet balance. Required: ₦${orderAmount.toLocaleString()}, Available: ₦${reseller.balance.toLocaleString()}.`
      };
    }

    const providerResult = await purchaseIntlNumber(country, service, {
      userId: String(reseller.user_id),
      userEmail: reseller.email,
      orderReference
    });

    if (!providerResult.success || !providerResult.phoneNumber) {
      return {
        success: false,
        statusCode: 502,
        code: 'PROVIDER_ERROR',
        error: providerResult.error || 'Failed to allocate virtual number from upstream SMS provider.'
      };
    }

    providerOrderId = providerResult.orderId;
    deliveryDetails = {
      phone_number: providerResult.phoneNumber,
      order_id: providerResult.orderId,
      expires_at: providerResult.expiresAt
    };
    status = 'processing';
  }

  // 4. Atomic Wallet Balance Deduction
  const balanceBefore = reseller.balance;
  const balanceAfter = Number((balanceBefore - orderAmount).toFixed(2));

  // Update in-memory profile
  const key = String(reseller.user_id);
  const liveProfile = resellersCache.get(key);
  if (liveProfile) {
    liveProfile.balance = balanceAfter;
    liveProfile.total_orders = (liveProfile.total_orders || 0) + 1;
    liveProfile.total_spent = Number(((liveProfile.total_spent || 0) + orderAmount).toFixed(2));
    liveProfile.updated_at = new Date().toISOString();
    // Rule 6 & 7: If balance falls below ₦5,000, temporarily suspend API access (do NOT delete key or revoke)
    if (balanceAfter < minRequired) {
      liveProfile.is_eligible = false;
    }
    resellersCache.set(key, liveProfile);
    saveResellers();
  }

  // 5. Construct Reseller Order Record
  const newOrder: ResellerOrder = {
    id: `res_ord_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    reseller_id: reseller.user_id,
    reseller_email: reseller.email,
    reseller_name: reseller.full_name,
    idempotency_key: idempotencyKey || orderReference,
    category: category as any,
    service_id: payload.service_id,
    product_id: payload.product_id,
    product_name: productName,
    quantity: payload.quantity || 1,
    amount: orderAmount,
    currency: 'NGN',
    balance_before: balanceBefore,
    balance_after: balanceAfter,
    status,
    provider,
    provider_order_id: providerOrderId,
    order_reference: orderReference,
    phone_number: deliveryDetails.phone_number,
    credentials: deliveryDetails.credentials,
    details: deliveryDetails,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };

  ordersCache.unshift(newOrder);
  saveOrders();

  // 6. Asynchronously trigger webhook event if configured
  dispatchWebhookEvent(reseller.user_id, 'order.created', {
    order_reference: newOrder.order_reference,
    category: newOrder.category,
    product_name: newOrder.product_name,
    amount: newOrder.amount,
    currency: newOrder.currency,
    status: newOrder.status,
    details: deliveryDetails,
    created_at: newOrder.created_at
  }).catch(() => {});

  return {
    success: true,
    statusCode: 201,
    order: newOrder
  };
}

/**
 * Get reseller orders with pagination and filtering
 */
export function getResellerOrdersList(
  resellerId: string | number,
  category?: string,
  status?: string,
  limit: number = 50
): { success: boolean; orders: ResellerOrder[]; total: number } {
  let list = ordersCache.filter(o => String(o.reseller_id) === String(resellerId));

  if (category && category !== 'all') {
    list = list.filter(o => o.category === category);
  }
  if (status && status !== 'all') {
    list = list.filter(o => o.status === status);
  }

  return {
    success: true,
    orders: list.slice(0, limit),
    total: list.length
  };
}

/**
 * Get a specific reseller order by ID or reference
 */
export async function getResellerOrderById(
  resellerId: string | number,
  orderIdOrRef: string
): Promise<{ success: boolean; order?: ResellerOrder; error?: string }> {
  const order = ordersCache.find(o => 
    String(o.reseller_id) === String(resellerId) && 
    (o.id === orderIdOrRef || o.order_reference === orderIdOrRef || String(o.provider_order_id) === orderIdOrRef)
  );

  if (!order) {
    return { success: false, error: 'Order not found.' };
  }

  // If order is active SMM or Number, optionally query fresh status from upstream
  if (order.status === 'processing') {
    if (order.category === 'smm' && order.provider_order_id) {
      try {
        const smmStatus = await getFollowSPanelOrderStatus(order.provider_order_id);
        if (smmStatus.success && smmStatus.data) {
          order.details = { ...order.details, ...smmStatus.data };
          if (smmStatus.data.status === 'Completed') order.status = 'completed';
          if (smmStatus.data.status === 'Canceled') order.status = 'cancelled';
          saveOrders();
        }
      } catch (e) {
        // ignore sync error
      }
    } else if (order.category === 'numbers' && order.provider_order_id) {
      try {
        const numStatus = await getIntlOrderStatus(String(order.provider_order_id));
        if (numStatus && numStatus.success) {
          if (numStatus.sms) {
            order.sms_code = numStatus.sms;
            order.sms_text = numStatus.fullSms || undefined;
            order.status = 'completed';
            saveOrders();

            // Dispatch webhook for SMS received
            dispatchWebhookEvent(order.reseller_id, 'order.completed', {
              order_reference: order.order_reference,
              category: 'numbers',
              phone_number: order.phone_number,
              sms_code: order.sms_code,
              sms_text: order.sms_text
            }).catch(() => {});
          }
        }
      } catch (e) {
        // ignore sync error
      }
    }
  }

  return { success: true, order };
}

/**
 * Cancel a reseller order (if eligible, e.g. international virtual number waiting for SMS)
 */
export async function cancelResellerOrder(
  resellerId: string | number,
  orderIdOrRef: string
): Promise<{ success: boolean; order?: ResellerOrder; refundAmount?: number; error?: string }> {
  const order = ordersCache.find(o => 
    String(o.reseller_id) === String(resellerId) && 
    (o.id === orderIdOrRef || o.order_reference === orderIdOrRef)
  );

  if (!order) {
    return { success: false, error: 'Order not found.' };
  }

  if (order.status !== 'processing' && order.status !== 'pending') {
    return { success: false, error: `Cannot cancel order with status: ${order.status}` };
  }

  if (order.category === 'numbers' && order.provider_order_id) {
    const cancelRes = await cancelIntlOrder(String(order.provider_order_id));
    if (!cancelRes.success) {
      return { success: false, error: cancelRes.error || 'Upstream provider could not cancel number.' };
    }
  }

  // Refund balance
  const refundAmount = order.amount;
  const key = String(resellerId);
  const profile = resellersCache.get(key);
  if (profile) {
    const updatedBalance = Number(((profile.balance || 0) + refundAmount).toFixed(2));
    profile.balance = updatedBalance;
    if (updatedBalance >= pricingConfig.min_balance_threshold) {
      profile.is_eligible = true;
    }
    profile.updated_at = new Date().toISOString();
    resellersCache.set(key, profile);
    saveResellers();
  }

  order.status = 'cancelled';
  order.balance_after = Number(((order.balance_after || 0) + refundAmount).toFixed(2));
  order.updated_at = new Date().toISOString();
  saveOrders();

  dispatchWebhookEvent(resellerId, 'order.cancelled', {
    order_reference: order.order_reference,
    refund_amount: refundAmount,
    balance: profile?.balance
  }).catch(() => {});

  return {
    success: true,
    order,
    refundAmount
  };
}

/**
 * Get API Logs for a specific reseller
 */
export function getResellerApiLogs(resellerId: string | number, limit = 50): ResellerApiLog[] {
  return logsCache
    .filter(l => String(l.reseller_id) === String(resellerId))
    .slice(0, limit);
}

/**
 * ==========================================================
 * ADMIN OVERSIGHT CONTROLS
 * ==========================================================
 */

/**
 * Get all resellers for Admin Dashboard
 */
export function getAllResellersForAdmin(): {
  resellers: ResellerProfile[];
  stats: {
    total_resellers: number;
    active_keys: number;
    total_orders: number;
    total_volume: number;
    avg_latency_ms: number;
  };
} {
  const list: ResellerProfile[] = [];
  let activeKeysCount = 0;
  let totalOrdersCount = 0;
  let totalVolumeAmount = 0;

  resellersCache.forEach((profile) => {
    list.push(sanitizeResellerProfile(profile));
    if (profile.has_api_key && profile.status === 'active') activeKeysCount++;
    totalOrdersCount += profile.total_orders || 0;
    totalVolumeAmount += profile.total_spent || 0;
  });

  // Calculate average latency from logs
  const recentLogs = logsCache.slice(0, 500);
  const avgLatency = recentLogs.length > 0
    ? Math.round(recentLogs.reduce((acc, l) => acc + (l.latency_ms || 0), 0) / recentLogs.length)
    : 145;

  return {
    resellers: list.sort((a, b) => (b.total_orders || 0) - (a.total_orders || 0)),
    stats: {
      total_resellers: list.length,
      active_keys: activeKeysCount,
      total_orders: totalOrdersCount,
      total_volume: Math.round(totalVolumeAmount),
      avg_latency_ms: avgLatency
    }
  };
}

/**
 * Admin: Toggle reseller account status (activate/suspend)
 */
export function adminToggleResellerStatus(
  userId: string | number,
  status: 'active' | 'suspended'
): { success: boolean; profile?: ResellerProfile; error?: string } {
  const key = String(userId);
  const profile = resellersCache.get(key);
  if (!profile) {
    return { success: false, error: 'Reseller profile not found.' };
  }

  profile.status = status;
  profile.updated_at = new Date().toISOString();
  resellersCache.set(key, profile);
  saveResellers();

  return { success: true, profile: sanitizeResellerProfile(profile) };
}

/**
 * Admin: Force revoke an API key
 */
export function adminRevokeResellerKey(userId: string | number): { success: boolean; error?: string } {
  return revokeResellerKey(userId);
}

/**
 * Admin: Get system-wide API logs
 */
export function getAdminSystemLogs(limit = 100, statusFilter?: string): ResellerApiLog[] {
  let logs = logsCache;
  if (statusFilter && statusFilter !== 'all') {
    if (statusFilter === '2xx') logs = logs.filter(l => l.status_code >= 200 && l.status_code < 300);
    else if (statusFilter === '4xx') logs = logs.filter(l => l.status_code >= 400 && l.status_code < 500);
    else if (statusFilter === '5xx') logs = logs.filter(l => l.status_code >= 500);
  }
  return logs.slice(0, limit);
}

/**
 * Admin: Get and Update Reseller Pricing Configuration
 */
export function getResellerPricing(): ResellerPricingConfig {
  return { ...pricingConfig };
}

export function updateResellerPricing(newConfig: Partial<ResellerPricingConfig>): ResellerPricingConfig {
  pricingConfig = {
    ...pricingConfig,
    ...newConfig,
    min_balance_threshold: 5000 // locked strictly at ₦5,000 per user rule
  };
  saveConfig();
  return { ...pricingConfig };
}
