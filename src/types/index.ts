/**
 * Surest Plug - TypeScript Data Types matching MySQL Database Schema exactly
 */

export type UserRole = 'user' | 'admin';
export type AccountStatus = 'active' | 'suspended';

export interface User {
  id: number;
  firebase_uid?: string;
  full_name: string;
  email: string;
  password?: string;
  phone?: string;
  google_id?: string;
  profile_image: string;
  role: UserRole;
  balance: number;
  account_status: AccountStatus;
  referral_code?: string;
  referral_unlocked?: boolean;
  referred_by?: number;
  referred_by_code?: string;
  welcome_seen?: boolean;
  admin_welcome_seen?: boolean;
  created_at: string;
  updated_at?: string;
}

export type ProductCategory = 
  | 'ready_made_website'
  | 'custom_website'
  | 'boosting'
  | 'numbers'
  | 'accounts';

export interface Product {
  id: number;
  name: string;
  category: ProductCategory;
  description: string;
  price: number;
  image: string;
  preview_image_path?: string;
  demo_url?: string;
  admin_email?: string;
  admin_password?: string;
  website_zip_path?: string;
  website_zip_name?: string;
  website_zip_size?: number;
  website_zip_data?: string;
  features: string[]; // List of included features
  availability: 'available' | 'out_of_stock' | 'sold';
  is_sold?: boolean;
  sold_at?: string;
  sold_to_user_id?: number;
  sold_to_user_name?: string;
  sold_to_user_email?: string;
  sold_order_id?: number;
  featured: boolean;
  delivery_time?: string;
  created_at: string;
  updated_at?: string;
}

export interface FollowSPanelServiceItem {
  service: number;
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

export type OrderStatus = 'pending' | 'processing' | 'completed' | 'cancelled' | 'refunded';
export type PaymentStatus = 'paid' | 'unpaid' | 'refunded';

export interface Order {
  id: number;
  order_reference: string;
  user_id: number;
  user_name?: string;
  user_email?: string;
  product_id?: number;
  product_name: string;
  category: string;
  amount: number;
  status: OrderStatus;
  payment_status: PaymentStatus;
  delivery_status?: string;
  product_status?: string;
  customer_details?: Record<string, any>;
  admin_note?: string;
  created_at: string;
  updated_at?: string;
}

export type TransactionType = 'deposit' | 'purchase' | 'product_purchase' | 'boosting_purchase' | 'account_logs_purchase' | 'international_number_purchase' | 'custom_request_payment' | 'refund' | 'admin_credit' | 'admin_debit' | 'referral_reward';
export type TransactionStatus = 'pending' | 'successful' | 'approved' | 'failed' | 'rejected';

export interface Transaction {
  id: number;
  user_id: number;
  user_name?: string;
  user_email?: string;
  product_id?: number;
  product_name?: string;
  product_category?: string;
  order_id?: number;
  type: TransactionType;
  amount: number;
  currency?: string;
  balance_before: number;
  balance_after: number;
  reference: string;
  payment_reference?: string;
  status: TransactionStatus;
  payment_status?: string;
  order_status?: string;
  delivery_status?: string;
  product_status?: string;
  description: string;
  payment_method?: string;
  created_at: string;
  updated_at?: string;
}

export interface Referral {
  id: number;
  referrer_user_id: number;
  referred_user_id: number;
  referral_code: string;
  created_at: string;
}

export interface ReferralReward {
  id: number;
  referral_id?: number;
  order_id: number;
  referrer_user_id: number;
  referred_user_id: number;
  buyer_name?: string;
  description?: string;
  amount: number;
  status: 'credited' | 'pending';
  product_name?: string;
  created_at: string;
}

export type DepositStatus = 'pending' | 'approved' | 'rejected';

export interface Deposit {
  id: number;
  deposit_reference: string;
  user_id: number;
  user_name?: string;
  user_email?: string;
  amount: number;
  payment_method: string;
  payment_reference?: string;
  proof_image?: string;
  payment_proof?: string;
  proof_url?: string;
  status: DepositStatus;
  admin_note?: string;
  reviewed_by?: number;
  created_at: string;
  reviewed_at?: string;
}

export type CustomOrderStatus = 'pending' | 'reviewing' | 'in_progress' | 'completed' | 'cancelled';

export interface CustomOrder {
  id: number;
  request_reference: string;
  user_id: number;
  user_name?: string;
  user_email?: string;
  phone?: string;
  project_name: string;
  website_type: string;
  description: string;
  logo_url?: string;
  logo_name?: string;
  logo_size?: number;
  reference_website?: string;
  features_list?: string[];
  required_features: string;
  additional_instructions?: string;
  pages_count?: string;
  budget: string;
  price?: number;
  deadline: string;
  contact_information: string;
  status: CustomOrderStatus;
  admin_note?: string;
  created_at: string;
  updated_at?: string;
}

export interface SupportTicket {
  id: number;
  ticket_code: string;
  user_id: number;
  user_name?: string;
  subject: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  status: 'open' | 'in_progress' | 'answered' | 'closed';
  created_at: string;
  updated_at?: string;
  messages: SupportMessage[];
}

export interface SupportMessage {
  id: number;
  ticket_id: number;
  sender_id: number;
  sender_name: string;
  sender_role: 'user' | 'admin';
  message_type?: 'text' | 'voice';
  message: string;
  audio_data?: string;
  audio_duration?: number;
  created_at: string;
}

export interface SiteUpdate {
  id: number;
  title: string;
  message: string;
  image?: string;
  link?: string;
  status: 'published' | 'draft';
  created_at: string;
  updated_at?: string;
}

export interface Notification {
  id: number;
  user_id: number;
  title: string;
  message: string;
  type: 'order' | 'deposit' | 'wallet' | 'support' | 'system' | 'referral' | 'product' | 'update';
  reference_id?: number | string;
  link_route?: string;
  read_status: boolean;
  created_at: string;
}

export interface SystemSettings {
  site_name: string;
  site_tagline: string;
  currency_symbol: string;
  currency_code: string;
  whatsapp_number: string;
  whatsapp_message: string;
  contact_whatsapp?: string;
  support_email: string;
  bank_name: string;
  bank_account_number: string;
  bank_account_name: string;
  followspanel_api_url: string;
  followspanel_api_key: string;
  followspanel_low_balance_threshold?: number;
  smm_api_url?: string;
  smm_api_key?: string;
  google_client_id?: string;
  google_client_secret?: string;
  cartlogs_api_url?: string;
  cartlogs_api_key?: string;
  announcement_headline?: string;
  announcement_enabled?: boolean;
  announcementHeadline?: string;
  announcementEnabled?: boolean;
}

export interface FollowSPanelOrderDetails {
  service_id: number | string;
  smm_order_id: number;
  platform: string;
  service: string;
  target_link: string;
  quantity: number;
  rate_charged?: number;
  selling_price: number;
  provider_cost: number;
  profit: number;
  provider_status?: string;
  provider_charge?: string | number;
  start_count?: string | number;
  remains?: string | number;
  last_provider_sync?: string;
}

export interface CartlogsCategory {
  id: string | number;
  name: string;
  slug?: string;
  description?: string;
  product_count?: number;
}

export interface CartlogsProduct {
  id: string | number;
  title: string;
  category: string;
  description: string;
  supplier_price: number;
  price: number; // Customer price calculated via Surest Plug pricing formula
  stock: number;
  in_stock: boolean;
  followers_count?: number | string;
  following_count?: number | string;
  account_age?: string;
  verification_status?: 'verified' | 'unverified' | boolean;
  country?: string;
  gender?: string;
  features?: string[];
  created_at?: string;
  updated_at?: string;
}

export interface CartlogsOrderCredentials {
  username?: string;
  password?: string;
  email?: string;
  email_password?: string;
  two_factor_key?: string;
  two_factor_code?: string;
  recovery_email?: string;
  additional_info?: string;
  raw_details?: string;
}

export interface CartlogsOrderDetails {
  supplier: 'cartlogs';
  cartlogs_product_id: string | number;
  cartlogs_order_id?: string | number; // Private supplier order ID (Admin only)
  product_title: string;
  category: string;
  quantity: number;
  supplier_cost: number; // Private supplier cost (Admin only)
  customer_price: number; // Customer selling price
  profit: number; // Admin only
  idempotency_key: string;
  credentials?: CartlogsOrderCredentials; // Securely protected credentials
  provider_status?: string;
  last_sync?: string;
}

export interface CartlogsConnectionResult {
  connected: boolean;
  provider: 'Cartlogs';
  categories_count?: number;
  products_count?: number;
  balance?: string | number;
  currency?: string;
  latency_ms?: number;
  error?: string;
  otp_supported?: boolean;
}

export interface CartlogsSyncStats {
  last_synced_at: string;
  categories_count: number;
  products_count: number;
  in_stock_count: number;
  out_of_stock_count: number;
  categories: string[];
}

export interface IntlCountry {
  id: string;
  name: string;
  code?: string;
  flag?: string;
  prefix?: string;
}

export interface IntlService {
  id: string;
  name: string;
  code?: string;
  price?: number;
  stock?: number;
  available?: boolean;
  category?: string;
  popular?: boolean;
  icon?: string;
}

export type IntlAvailabilityStatus =
  | 'AVAILABLE'
  | 'OUT_OF_STOCK'
  | 'PROVIDER_UNAVAILABLE'
  | 'PROVIDER_INSUFFICIENT_BALANCE'
  | 'INVALID_RESPONSE'
  | 'TIMEOUT'
  | 'API_ERROR';

export interface IntlAvailability {
  country: string;
  service: string;
  available: boolean;
  stock: number | null;
  price: number;
  status?: IntlAvailabilityStatus;
}

export interface IntlOrderDetails {
  provider: 'instantnums';
  orderId: string;
  country: string;
  service: string;
  phoneNumber: string;
  price: number;
  status: 'waiting' | 'finished' | 'cancelled' | string;
  smsCode?: string;
  smsText?: string;
  expiresAt?: string;
  created_at?: string;
}

export interface InstantNumsCountry {
  ID: string | number;
  name: string;
  short_name?: string;
  cc?: string;
  region?: string;
  code?: string;
}

export interface InstantNumsService {
  ID: string | number;
  name: string;
  favourite?: number;
  code?: string;
  price?: number;
  cost_usd?: number;
  stock?: number;
  available?: boolean;
}

export interface InstantNumsPricingConfig {
  usd_to_ngn_rate: number;
  markup_below_1000_ngn: number;
  markup_1000_and_above_ngn: number;
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

export interface InstantNumsOrderDetails {
  provider: 'instantnums';
  provider_order_id: string;
  country_id: string;
  country_name?: string;
  service_id: string;
  service_name?: string;
  phone_number: string;
  cost_usd: number;
  supplier_cost_ngn: number;
  customer_price: number;
  profit_ngn: number;
  provider_status?: string;
  normalized_status?: IntlNormalizedStatus;
  status: 'purchased' | 'waiting' | 'received' | 'completed' | 'cancelled' | 'refunded' | 'expired' | 'error' | string;
  status_label?: string;
  status_check_error?: string | null;
  verification_code?: string;
  full_sms?: string;
  purchased_at?: string | null;
  expires_at?: string | null;
  received_at?: string | null;
  cancelled_at?: string | null;
  provider_cancelled?: boolean;
  cancellation_pending?: boolean;
  refunded?: boolean;
  refund_transaction_reference?: string;
  last_sync?: string;
  last_checked?: string;
}

export interface InstantNumsConnectionResult {
  connected: boolean;
  provider: 'InstantNums';
  balance_usd?: number;
  balance_ngn?: number;
  currency?: string;
  countries_count?: number;
  services_count?: number;
  rate?: number;
  latency_ms?: number;
  error?: string;
}

/**
 * ==========================================================
 * RESELLER API TYPES & INTERFACES
 * ==========================================================
 */

export type ResellerStatus = 'active' | 'suspended' | 'inactive';

export interface ResellerProfile {
  user_id: number | string;
  full_name: string;
  email: string;
  status: ResellerStatus;
  balance: number;
  currency: string;
  min_balance_threshold: number;
  is_eligible: boolean;
  has_api_key: boolean;
  api_key_prefix?: string;
  api_key_masked?: string;
  api_key_created_at?: string;
  api_key_last_used_at?: string | null;
  webhook_url?: string | null;
  webhook_secret?: string | null;
  webhook_enabled?: boolean;
  webhook_last_status?: number | null;
  webhook_last_error?: string | null;
  webhook_last_dispatched_at?: string | null;
  total_orders: number;
  total_spent: number;
  created_at: string;
  updated_at?: string;
}

export interface ResellerApiKeyResult {
  api_key: string;
  api_key_prefix: string;
  api_key_masked: string;
  created_at: string;
  warning: string;
}

export type ResellerOrderCategory = 'smm' | 'accounts' | 'numbers' | 'marketplace';

export interface ResellerOrder {
  id: string;
  reseller_id: number | string;
  reseller_email: string;
  reseller_name?: string;
  idempotency_key: string;
  category: ResellerOrderCategory;
  service_id?: string | number;
  product_id?: string | number;
  product_name: string;
  quantity: number;
  amount: number;
  currency: string;
  balance_before: number;
  balance_after: number;
  status: 'pending' | 'processing' | 'completed' | 'cancelled' | 'failed' | 'refunded';
  provider: string;
  provider_order_id?: string | number;
  order_reference: string;
  details?: Record<string, any>;
  credentials?: Record<string, any>;
  phone_number?: string;
  sms_code?: string;
  sms_text?: string;
  error_message?: string;
  created_at: string;
  updated_at?: string;
}

export interface ResellerApiLog {
  id: string;
  reseller_id: number | string;
  reseller_email: string;
  method: string;
  path: string;
  status_code: number;
  latency_ms: number;
  ip: string;
  user_agent?: string;
  error_message?: string;
  created_at: string;
}

export interface ResellerPricingConfig {
  smm_discount_percent: number;
  accounts_discount_percent: number;
  numbers_discount_percent: number;
  marketplace_discount_percent: number;
  min_balance_threshold: number;
  enabled_categories?: {
    smm: boolean;
    accounts: boolean;
    numbers: boolean;
    marketplace: boolean;
  };
  disabled_product_ids?: string[];
}

export interface ResellerProductItem {
  id: string | number;
  name: string;
  category: ResellerOrderCategory;
  category_label: string;
  description: string;
  price: number;
  original_price?: number;
  currency: string;
  in_stock: boolean;
  stock_count?: number | null;
  rate_per_1000?: number;
  min_quantity?: number;
  max_quantity?: number;
  fields_required: string[];
  sample_request: Record<string, any>;
}


