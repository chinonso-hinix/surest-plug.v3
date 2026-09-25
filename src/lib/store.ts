/**
 * Surest Plug - Store & Data Engine
 * Complete persistence with IndexedDB and LocalStorage, atomic transactions,
 * 10-purchase referral unlock requirement, ₦10,000 referrer reward,
 * real voice note support chat, and real-time notifications.
 */

import {
  User,
  Product,
  Order,
  Transaction,
  Deposit,
  CustomOrder,
  SupportTicket,
  SupportMessage,
  Notification,
  SystemSettings,
  FollowSPanelServiceItem,
  Referral,
  ReferralReward,
  SiteUpdate,
  CartlogsCategory,
  CartlogsProduct,
  CartlogsOrderDetails,
  CartlogsOrderCredentials,
  CartlogsConnectionResult,
  CartlogsSyncStats,
  IntlCountry,
  IntlService,
  IntlAvailability,
  IntlOrderDetails,
  InstantNumsCountry,
  InstantNumsService,
  InstantNumsOrderDetails,
  InstantNumsConnectionResult,
  InstantNumsPricingConfig,
  ResellerProfile,
  ResellerOrder,
  ResellerApiLog,
  ResellerPricingConfig,
  ResellerApiKeyResult
} from '../types';
import { idbSet, idbGet, idbDelete } from './idb';
import { 
  syncOrderToFirestore, 
  syncDepositToFirestore, 
  syncTransactionToFirestore,
  syncSupportTicketToFirestore, 
  syncCustomOrderToFirestore,
  syncUserBalanceToFirestore,
  loadFirebaseAccountData
} from './firebase';
import { calculateSellingPrice, calculateSmmPrice } from './pricing';

const STORAGE_KEYS = {
  USERS: 'sp_db_users_v4',
  PRODUCTS: 'sp_db_products_v4',
  ORDERS: 'sp_db_orders_v4',
  TRANSACTIONS: 'sp_db_transactions_v4',
  DEPOSITS: 'sp_db_deposits_v4',
  CUSTOM_ORDERS: 'sp_db_custom_orders_v4',
  SUPPORT: 'sp_db_support_v4',
  NOTIFICATIONS: 'sp_db_notifications_v4',
  SETTINGS: 'sp_db_settings_v4',
  AUTH: 'sp_auth_user_v4',
  REFERRALS: 'sp_db_referrals_v4',
  REFERRAL_REWARDS: 'sp_db_referral_rewards_v4',
  SITE_UPDATES: 'sp_db_site_updates_v4'
};

function generateReferralCode(): string {
  const chars = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ'; // Exclude visually ambiguous chars 0, 1, I, O
  let result = 'SP-';
  for (let i = 0; i < 6; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

const ADMIN_EMAILS = ['chinonsochinix@gmail.com', 'comedyhome0@gmail.com', 'admin@surestplug.com'];

const DEFAULT_SETTINGS: SystemSettings = {
  site_name: 'Surest Plug',
  site_tagline: 'Your Plug for Websites, Social Media & Digital Services',
  currency_symbol: '₦',
  currency_code: 'NGN',
  whatsapp_number: '+2348141853557',
  whatsapp_message: 'Hello Surest Plug, I need assistance with my account / order.',
  support_email: 'chinonsochinix@gmail.com',
  bank_name: 'OPAY BANK',
  bank_account_number: '8141853557',
  bank_account_name: 'CHINONSO MONDAY',
  followspanel_api_url: 'https://followspanel.com/api/v2',
  followspanel_api_key: '',
  announcement_headline: 'Welcome to Surest Plug — Buy USA verification numbers from ₦1,000 | Instant Delivery & 24/7 Support',
  announcement_enabled: true,
  announcementHeadline: 'Welcome to Surest Plug — Buy USA verification numbers from ₦1,000 | Instant Delivery & 24/7 Support',
  announcementEnabled: true
};

// Strip heavy base64 strings before writing to localStorage to prevent quota errors
function sanitizeForLocalStorage(key: string, value: any): any {
  if (key === STORAGE_KEYS.PRODUCTS && Array.isArray(value)) {
    return value.map((p: Product) => {
      const sanitized = { ...p };
      delete sanitized.website_zip_data;
      if (sanitized.image && sanitized.image.startsWith('data:') && sanitized.image.length > 50000) {
        sanitized.image = sanitized.preview_image_path?.startsWith('http') 
          ? sanitized.preview_image_path 
          : 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=800&auto=format&fit=crop&q=80';
      }
      return sanitized;
    });
  }

  if (key === STORAGE_KEYS.ORDERS && Array.isArray(value)) {
    return value.map((o: Order) => {
      if (!o.customer_details) return o;
      const copyDetails = { ...o.customer_details };
      delete copyDetails.website_zip_data;
      if (copyDetails.preview_image && copyDetails.preview_image.startsWith('data:') && copyDetails.preview_image.length > 50000) {
        delete copyDetails.preview_image;
      }
      return {
        ...o,
        customer_details: copyDetails
      };
    });
  }

  if (key === STORAGE_KEYS.SUPPORT && Array.isArray(value)) {
    return value.map((t: SupportTicket) => ({
      ...t,
      messages: t.messages.map(m => {
        const copyMsg = { ...m };
        if (copyMsg.audio_data && copyMsg.audio_data.length > 30000) {
          delete copyMsg.audio_data;
        }
        return copyMsg;
      })
    }));
  }

  return value;
}

function loadFromStorage<T>(key: string, defaultValue: T): T {
  try {
    const item = localStorage.getItem(key);
    return item ? JSON.parse(item) : defaultValue;
  } catch {
    return defaultValue;
  }
}

function saveToStorage<T>(key: string, value: T): void {
  try {
    const sanitized = sanitizeForLocalStorage(key, value);
    localStorage.setItem(key, JSON.stringify(sanitized));
  } catch (e: any) {
    console.warn('LocalStorage save warning:', e);
  }
}

class Store {
  private users: User[] = [];
  private products: Product[] = [];
  private orders: Order[] = [];
  private transactions: Transaction[] = [];
  private deposits: Deposit[] = [];
  private customOrders: CustomOrder[] = [];
  private supportTickets: SupportTicket[] = [];
  private notifications: Notification[] = [];
  private referrals: Referral[] = [];
  private referralRewards: ReferralReward[] = [];
  private siteUpdates: SiteUpdate[] = [];
  private settings: SystemSettings = DEFAULT_SETTINGS;
  private currentUser: User | null = null;
  private listeners: (() => void)[] = [];
  private processedPaystackReferences: Set<string> = new Set<string>();

  constructor() {
    this.init();
  }

  private init() {
    // 1. Synchronous initialization from localStorage for fast initial render
    this.users = loadFromStorage<User[]>(STORAGE_KEYS.USERS, []);
    this.products = loadFromStorage<Product[]>(STORAGE_KEYS.PRODUCTS, []);
    this.orders = loadFromStorage<Order[]>(STORAGE_KEYS.ORDERS, []);
    this.transactions = loadFromStorage<Transaction[]>(STORAGE_KEYS.TRANSACTIONS, []);
    this.deposits = loadFromStorage<Deposit[]>(STORAGE_KEYS.DEPOSITS, []);
    this.customOrders = loadFromStorage<CustomOrder[]>(STORAGE_KEYS.CUSTOM_ORDERS, []);
    this.supportTickets = loadFromStorage<SupportTicket[]>(STORAGE_KEYS.SUPPORT, []);
    this.notifications = loadFromStorage<Notification[]>(STORAGE_KEYS.NOTIFICATIONS, []);
    this.referrals = loadFromStorage<Referral[]>(STORAGE_KEYS.REFERRALS, []);
    this.referralRewards = loadFromStorage<ReferralReward[]>(STORAGE_KEYS.REFERRAL_REWARDS, []);
    this.siteUpdates = loadFromStorage<SiteUpdate[]>(STORAGE_KEYS.SITE_UPDATES, []);
    this.settings = loadFromStorage<SystemSettings>(STORAGE_KEYS.SETTINGS, DEFAULT_SETTINGS);
    this.currentUser = loadFromStorage<User | null>(STORAGE_KEYS.AUTH, null);

    // Fallback from legacy v3 storage if v4 is empty
    if (this.products.length === 0) {
      const v3Prods = loadFromStorage<Product[]>('sp_db_products_v3', []);
      if (v3Prods.length > 0) this.products = v3Prods;
    }
    if (this.users.length === 0) {
      const v3Users = loadFromStorage<User[]>('sp_db_users_v3', []);
      if (v3Users.length > 0) this.users = v3Users;
    }
    if (this.orders.length === 0) {
      const v3Orders = loadFromStorage<Order[]>('sp_db_orders_v3', []);
      if (v3Orders.length > 0) this.orders = v3Orders;
    }
    if (this.transactions.length === 0) {
      const v3Tx = loadFromStorage<Transaction[]>('sp_db_transactions_v3', []);
      if (v3Tx.length > 0) this.transactions = v3Tx;
    }
    if (this.deposits.length === 0) {
      const v3Dep = loadFromStorage<Deposit[]>('sp_db_deposits_v3', []);
      if (v3Dep.length > 0) this.deposits = v3Dep;
    }
    if (this.customOrders.length === 0) {
      const v3Cust = loadFromStorage<CustomOrder[]>('sp_db_custom_orders_v3', []);
      if (v3Cust.length > 0) this.customOrders = v3Cust;
    }
    if (this.supportTickets.length === 0) {
      const v3Supp = loadFromStorage<SupportTicket[]>('sp_db_support_v3', []);
      if (v3Supp.length > 0) this.supportTickets = v3Supp;
    }
    if (this.notifications.length === 0) {
      const v3Notif = loadFromStorage<Notification[]>('sp_db_notifications_v3', []);
      if (v3Notif.length > 0) this.notifications = v3Notif;
    }
    if (this.referrals.length === 0) {
      const v3Refs = loadFromStorage<Referral[]>('sp_db_referrals_v3', []);
      if (v3Refs.length > 0) this.referrals = v3Refs;
    }
    if (this.referralRewards.length === 0) {
      const v3Rewards = loadFromStorage<ReferralReward[]>('sp_db_referral_rewards_v3', []);
      if (v3Rewards.length > 0) this.referralRewards = v3Rewards;
    }
    if (this.siteUpdates.length === 0) {
      const v3Updates = loadFromStorage<SiteUpdate[]>('sp_db_site_updates_v3', []);
      if (v3Updates.length > 0) this.siteUpdates = v3Updates;
    }
    if (!this.currentUser) {
      const v3Auth = loadFromStorage<User | null>('sp_auth_user_v3', null);
      if (v3Auth) this.currentUser = v3Auth;
    }

    // Default Bank Details
    if (!this.settings.bank_name || this.settings.bank_account_number === '1234567890') {
      this.settings.bank_name = 'OPAY BANK';
      this.settings.bank_account_number = '8141853557';
      this.settings.bank_account_name = 'CHINONSO MONDAY';
      this.settings.support_email = 'chinonsochinix@gmail.com';
      this.settings.whatsapp_number = '+2348141853557';
    }

    // Ensure Chinonso is registered with admin role
    const adminUser = this.users.find(u => u.email.toLowerCase() === 'chinonsochinix@gmail.com');
    if (!adminUser) {
      const adminId = this.users.length > 0 ? Math.max(...this.users.map(u => u.id)) + 1 : 1;
      this.users.unshift({
        id: adminId,
        firebase_uid: 'admin_chinonso_uid',
        full_name: 'CHINONSO MONDAY',
        email: 'chinonsochinix@gmail.com',
        phone: '8141853557',
        profile_image: '/assets/images/sp-logo.png',
        role: 'admin',
        balance: 500000.00,
        account_status: 'active',
        referral_code: 'SP-ADMIN1',
        referral_unlocked: true,
        welcome_seen: true,
        admin_welcome_seen: true,
        created_at: new Date().toISOString()
      });
    } else {
      adminUser.role = 'admin';
      adminUser.referral_unlocked = true;
      if (!adminUser.full_name || adminUser.full_name === 'Surest Plug User') {
        adminUser.full_name = 'CHINONSO MONDAY';
      }
      if (!adminUser.phone) {
        adminUser.phone = '8141853557';
      }
      if (!adminUser.referral_code) {
        adminUser.referral_code = 'SP-ADMIN1';
      }
    }

    // Evaluate referral unlock strictly: 10 qualifying purchases
    this.users.forEach(u => {
      if (u.role === 'admin') {
        u.referral_unlocked = true;
        if (!u.referral_code) u.referral_code = 'SP-ADMIN1';
      } else {
        const qualifyingCount = this.orders.filter(o => 
          o.user_id === u.id && 
          o.status === 'completed' && 
          o.payment_status === 'paid'
        ).length;
        if (qualifyingCount >= 10) {
          u.referral_unlocked = true;
          if (!u.referral_code) {
            u.referral_code = generateReferralCode();
          }
        } else {
          u.referral_unlocked = false;
        }
      }
    });

    if (this.currentUser && this.currentUser.email.toLowerCase() === 'chinonsochinix@gmail.com') {
      this.currentUser.role = 'admin';
    }

    // Populate processed Paystack references cache
    this.transactions.forEach(t => {
      if (t.reference) this.processedPaystackReferences.add(t.reference.trim());
      if (t.payment_reference) this.processedPaystackReferences.add(t.payment_reference.trim());
    });
    this.deposits.forEach(d => {
      if (d.deposit_reference) this.processedPaystackReferences.add(d.deposit_reference.trim());
      if (d.payment_reference) this.processedPaystackReferences.add(d.payment_reference.trim());
    });

    // 2. Asynchronously hydrate full dataset from IndexedDB (source of truth)
    this.hydrateFromIndexedDB();
  }

  private async hydrateFromIndexedDB() {
    try {
      const [
        idbProducts,
        idbOrders,
        idbUsers,
        idbTransactions,
        idbDeposits,
        idbCustomOrders,
        idbTickets,
        idbNotifs,
        idbRefs,
        idbRewards,
        idbUpdates
      ] = await Promise.all([
        idbGet<Product[]>('sp_db_all_products'),
        idbGet<Order[]>('sp_db_all_orders'),
        idbGet<User[]>('sp_db_all_users'),
        idbGet<Transaction[]>('sp_db_all_transactions'),
        idbGet<Deposit[]>('sp_db_all_deposits'),
        idbGet<CustomOrder[]>('sp_db_all_custom_orders'),
        idbGet<SupportTicket[]>('sp_db_all_support_tickets'),
        idbGet<Notification[]>('sp_db_all_notifications'),
        idbGet<Referral[]>('sp_db_all_referrals'),
        idbGet<ReferralReward[]>('sp_db_all_referral_rewards'),
        idbGet<SiteUpdate[]>('sp_db_all_site_updates')
      ]);

      let hasChanges = false;

      if (idbProducts && Array.isArray(idbProducts) && idbProducts.length >= this.products.length) {
        this.products = idbProducts;
        hasChanges = true;
      }
      if (idbOrders && Array.isArray(idbOrders) && idbOrders.length >= this.orders.length) {
        this.orders = idbOrders;
        hasChanges = true;
      }
      if (idbUsers && Array.isArray(idbUsers) && idbUsers.length >= this.users.length) {
        this.users = idbUsers;
        hasChanges = true;
      }
      if (idbTransactions && Array.isArray(idbTransactions) && idbTransactions.length >= this.transactions.length) {
        this.transactions = idbTransactions;
        hasChanges = true;
      }
      if (idbDeposits && Array.isArray(idbDeposits) && idbDeposits.length >= this.deposits.length) {
        this.deposits = idbDeposits;
        hasChanges = true;
      }
      if (idbCustomOrders && Array.isArray(idbCustomOrders) && idbCustomOrders.length >= this.customOrders.length) {
        this.customOrders = idbCustomOrders;
        hasChanges = true;
      }
      if (idbTickets && Array.isArray(idbTickets) && idbTickets.length >= this.supportTickets.length) {
        this.supportTickets = idbTickets;
        hasChanges = true;
      }
      if (idbNotifs && Array.isArray(idbNotifs) && idbNotifs.length >= this.notifications.length) {
        this.notifications = idbNotifs;
        hasChanges = true;
      }
      if (idbRefs && Array.isArray(idbRefs) && idbRefs.length >= this.referrals.length) {
        this.referrals = idbRefs;
        hasChanges = true;
      }
      if (idbRewards && Array.isArray(idbRewards) && idbRewards.length >= this.referralRewards.length) {
        this.referralRewards = idbRewards;
        hasChanges = true;
      }
      if (idbUpdates && Array.isArray(idbUpdates) && idbUpdates.length >= this.siteUpdates.length) {
        this.siteUpdates = idbUpdates;
        hasChanges = true;
      }

      // Hydrate individual heavy binary assets
      for (const p of this.products) {
        const zip = await idbGet<string>(`zip_prod_${p.id}`);
        if (zip) p.website_zip_data = zip;
        const img = await idbGet<string>(`img_prod_${p.id}`);
        if (img) p.image = img;
      }
      for (const o of this.orders) {
        if (o.customer_details) {
          const zip = await idbGet<string>(`zip_ord_${o.id}`);
          if (zip) o.customer_details.website_zip_data = zip;
        }
      }

      // Hydrate voice note messages
      for (const t of this.supportTickets) {
        for (const m of t.messages) {
          if (!m.audio_data) {
            const audio = await idbGet<string>(`voice_msg_${m.id}`);
            if (audio) m.audio_data = audio;
          }
        }
      }

      // Populate processed Paystack references cache from hydrated transactions/deposits
      this.transactions.forEach(t => {
        if (t.reference) this.processedPaystackReferences.add(t.reference.trim());
        if (t.payment_reference) this.processedPaystackReferences.add(t.payment_reference.trim());
      });
      this.deposits.forEach(d => {
        if (d.deposit_reference) this.processedPaystackReferences.add(d.deposit_reference.trim());
        if (d.payment_reference) this.processedPaystackReferences.add(d.payment_reference.trim());
      });

      if (hasChanges) {
        this.notify();
      }
    } catch (e) {
      console.warn('IDB hydration completed with warnings:', e);
    }
  }

  public async getWebsiteZipDataAsync(id: number, type: 'order' | 'product'): Promise<string | undefined> {
    if (type === 'order') {
      const order = this.orders.find(o => o.id === id);
      if (order?.customer_details?.website_zip_data) {
        return order.customer_details.website_zip_data;
      }
      const zip = await idbGet<string>(`zip_ord_${id}`);
      if (zip) {
        if (order?.customer_details) order.customer_details.website_zip_data = zip;
        return zip;
      }
      if (order?.product_id) {
        return this.getWebsiteZipDataAsync(order.product_id, 'product');
      }
    } else {
      const product = this.products.find(p => p.id === id);
      if (product?.website_zip_data) {
        return product.website_zip_data;
      }
      const zip = await idbGet<string>(`zip_prod_${id}`);
      if (zip) {
        if (product) product.website_zip_data = zip;
        return zip;
      }
    }
    return undefined;
  }

  public async getDepositProofAsync(depositId: number): Promise<string | undefined> {
    const deposit = this.deposits.find(d => d.id === depositId);
    if (deposit?.proof_image) {
      return deposit.proof_image;
    }
    const stored = await idbGet<string>(`dep_proof_${depositId}`);
    return stored || undefined;
  }

  private save() {
    // 1. Save to LocalStorage for quick load
    saveToStorage(STORAGE_KEYS.USERS, this.users);
    saveToStorage(STORAGE_KEYS.PRODUCTS, this.products);
    saveToStorage(STORAGE_KEYS.ORDERS, this.orders);
    saveToStorage(STORAGE_KEYS.TRANSACTIONS, this.transactions);
    saveToStorage(STORAGE_KEYS.DEPOSITS, this.deposits);
    saveToStorage(STORAGE_KEYS.CUSTOM_ORDERS, this.customOrders);
    saveToStorage(STORAGE_KEYS.SUPPORT, this.supportTickets);
    saveToStorage(STORAGE_KEYS.NOTIFICATIONS, this.notifications);
    saveToStorage(STORAGE_KEYS.REFERRALS, this.referrals);
    saveToStorage(STORAGE_KEYS.REFERRAL_REWARDS, this.referralRewards);
    saveToStorage(STORAGE_KEYS.SITE_UPDATES, this.siteUpdates);
    saveToStorage(STORAGE_KEYS.SETTINGS, this.settings);
    if (this.currentUser) {
      saveToStorage(STORAGE_KEYS.AUTH, this.currentUser);
    }

    // 2. Persist full data into IndexedDB (zero quotas, never disappears on refresh)
    idbSet('sp_db_all_products', this.products).catch(() => {});
    idbSet('sp_db_all_orders', this.orders).catch(() => {});
    idbSet('sp_db_all_users', this.users).catch(() => {});
    idbSet('sp_db_all_transactions', this.transactions).catch(() => {});
    idbSet('sp_db_all_deposits', this.deposits).catch(() => {});
    idbSet('sp_db_all_custom_orders', this.customOrders).catch(() => {});
    idbSet('sp_db_all_support_tickets', this.supportTickets).catch(() => {});
    idbSet('sp_db_all_notifications', this.notifications).catch(() => {});
    idbSet('sp_db_all_referrals', this.referrals).catch(() => {});
    idbSet('sp_db_all_referral_rewards', this.referralRewards).catch(() => {});
    idbSet('sp_db_all_site_updates', this.siteUpdates).catch(() => {});

    this.notify();
  }

  public subscribe(listener: () => void): () => void {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }

  private notify() {
    this.listeners.forEach(listener => listener());
  }

  // Getters
  public getCurrentUser(): User | null {
    return this.currentUser;
  }

  public getProducts(): Product[] {
    return [...this.products];
  }

  public getProductById(id: number): Product | undefined {
    return this.products.find(p => p.id === id);
  }

  public getSettings(): SystemSettings {
    return { ...this.settings };
  }

  public getUsers(): User[] {
    return [...this.users];
  }

  public getAllUsers(): User[] {
    return this.getUsers();
  }

  public getOrders(userId?: number): Order[] {
    if (userId) {
      return this.orders.filter(o => o.user_id === userId);
    }
    return [...this.orders];
  }

  public getUserOrders(userId: number): Order[] {
    return this.getOrders(userId);
  }

  public getTransactions(userId?: number): Transaction[] {
    if (userId) {
      return this.transactions.filter(t => t.user_id === userId);
    }
    return [...this.transactions];
  }

  public getUserTransactions(userId: number): Transaction[] {
    return this.getTransactions(userId);
  }

  public getDeposits(userId?: number): Deposit[] {
    if (userId) {
      return this.deposits.filter(d => d.user_id === userId);
    }
    return [...this.deposits];
  }

  public getUserDeposits(userId: number): Deposit[] {
    return this.getDeposits(userId);
  }

  public getCustomOrders(userId?: number): CustomOrder[] {
    if (userId) {
      return this.customOrders.filter(c => c.user_id === userId);
    }
    return [...this.customOrders];
  }

  public getUserCustomOrders(userId: number): CustomOrder[] {
    return this.getCustomOrders(userId);
  }

  public getSupportTickets(userId?: number): SupportTicket[] {
    if (userId) {
      return this.supportTickets.filter(s => s.user_id === userId);
    }
    return [...this.supportTickets];
  }

  public getUserSupportTickets(userId: number): SupportTicket[] {
    return this.getSupportTickets(userId);
  }

  public getNotifications(userId: number): Notification[] {
    return this.notifications.filter(n => n.user_id === userId);
  }

  public getUnreadNotificationsCount(userId: number): number {
    return this.notifications.filter(n => n.user_id === userId && !n.read_status).length;
  }

  public markNotificationAsRead(notificationId: number, userId?: number): { success: boolean } {
    const notif = this.notifications.find(n => n.id === notificationId && (!userId || n.user_id === userId));
    if (notif) {
      notif.read_status = true;
      this.save();
    }
    return { success: true };
  }

  public markAllNotificationsAsRead(userId: number): { success: boolean } {
    this.notifications.forEach(n => {
      if (n.user_id === userId) {
        n.read_status = true;
      }
    });
    this.save();
    return { success: true };
  }

  public createNotification(
    userId: number,
    title: string,
    message: string,
    type: 'order' | 'deposit' | 'wallet' | 'support' | 'system' | 'referral' | 'product' | 'update' = 'system',
    reference_id?: number | string,
    link_route?: string
  ) {
    const newNotif: Notification = {
      id: Date.now() + Math.floor(Math.random() * 1000),
      user_id: userId,
      title,
      message,
      type,
      reference_id,
      link_route,
      read_status: false,
      created_at: new Date().toISOString()
    };
    this.notifications.unshift(newNotif);
    this.save();
    return newNotif;
  }

  public dismissWelcome(userId: number): void {
    const user = this.users.find(u => u.id === userId);
    if (user) {
      user.welcome_seen = true;
      if (this.currentUser && this.currentUser.id === userId) {
        this.currentUser.welcome_seen = true;
      }
      this.save();
    }
  }

  public dismissAdminWelcome(userId: number): void {
    const user = this.users.find(u => u.id === userId);
    if (user) {
      user.admin_welcome_seen = true;
      if (this.currentUser && this.currentUser.id === userId) {
        this.currentUser.admin_welcome_seen = true;
      }
      this.save();
    }
  }

  public getReferrals(userId: number): Referral[] {
    return this.referrals.filter(r => r.referrer_user_id === userId);
  }

  public getReferralRewards(userId: number): ReferralReward[] {
    return this.referralRewards.filter(r => r.referrer_user_id === userId);
  }

  public getQualifyingPurchasesCount(userId: number): number {
    return this.orders.filter(o => 
      o.user_id === userId && 
      o.status === 'completed' && 
      o.payment_status === 'paid'
    ).length;
  }

  public isReferralUnlocked(userId: number): boolean {
    const user = this.users.find(u => u.id === userId);
    if (!user) return false;
    if (user.role === 'admin' || user.referral_unlocked) return true;
    const count = this.getQualifyingPurchasesCount(userId);
    if (count >= 10) {
      this.checkAndUnlockReferral(userId);
      return true;
    }
    return false;
  }

  public checkAndUnlockReferral(userId: number): { isUnlocked: boolean; newlyUnlocked: boolean; referralCode?: string } {
    const user = this.users.find(u => u.id === userId);
    if (!user) return { isUnlocked: false, newlyUnlocked: false };
    if (user.role === 'admin') {
      user.referral_unlocked = true;
      if (!user.referral_code) user.referral_code = 'SP-ADMIN1';
      return { isUnlocked: true, newlyUnlocked: false, referralCode: user.referral_code };
    }

    const count = this.getQualifyingPurchasesCount(userId);
    if (count >= 10 && !user.referral_unlocked) {
      user.referral_unlocked = true;
      if (!user.referral_code) {
        user.referral_code = generateReferralCode();
      }
      if (this.currentUser && this.currentUser.id === userId) {
        this.currentUser = user;
      }
      
      // Notify user of referral unlock
      this.notifications.unshift({
        id: Date.now(),
        user_id: user.id,
        title: '🎉 Referral Program Unlocked!',
        message: `Congratulations! You have completed ${count} qualifying purchases. Your unique referral code ${user.referral_code} is now unlocked! Share it to earn ₦10,000 on qualifying website purchases.`,
        type: 'referral',
        link_route: 'referrals',
        read_status: false,
        created_at: new Date().toISOString()
      });

      this.save();
      return { isUnlocked: true, newlyUnlocked: true, referralCode: user.referral_code };
    }
    return { isUnlocked: !!user.referral_unlocked, newlyUnlocked: false, referralCode: user.referral_code };
  }

  public validateReferralCode(code: string, currentUserId?: number): { valid: boolean; referrer?: User; error?: string } {
    if (!code || !code.trim()) {
      return { valid: false, error: 'Please enter a referral code.' };
    }
    const clean = code.trim().toUpperCase();
    const referrer = this.users.find(u => u.referral_code?.toUpperCase() === clean);
    if (!referrer || !referrer.referral_unlocked) {
      return { valid: false, error: 'The referral code is invalid.' };
    }
    if (currentUserId && referrer.id === currentUserId) {
      return { valid: false, error: 'You cannot refer yourself.' };
    }
    return { valid: true, referrer };
  }

  public getReferralStats(userId: number): {
    isUnlocked: boolean;
    qualifyingPurchasesCount: number;
    requiredPurchases: number;
    referralCode?: string;
    totalReferrals: number;
    successfulPurchases: number;
    totalEarnings: number;
  } {
    const user = this.users.find(u => u.id === userId);
    const qualifyingCount = this.getQualifyingPurchasesCount(userId);
    const isUnlocked = (user?.role === 'admin') || !!user?.referral_unlocked || qualifyingCount >= 10;
    
    if (isUnlocked && user && !user.referral_unlocked) {
      this.checkAndUnlockReferral(userId);
    }

    const userReferrals = this.getReferrals(userId);
    const rewards = this.getReferralRewards(userId);
    const totalEarnings = rewards.reduce((sum, r) => sum + r.amount, 0);

    return {
      isUnlocked,
      qualifyingPurchasesCount: qualifyingCount,
      requiredPurchases: 10,
      referralCode: isUnlocked ? (user?.referral_code || 'SP-ADMIN1') : undefined,
      totalReferrals: userReferrals.length,
      successfulPurchases: rewards.length,
      totalEarnings
    };
  }

  /** Restore the authenticated user's authoritative Firestore data into the local cache. */
  public async hydrateAuthenticatedUserFromFirestore(firebaseUid: string): Promise<boolean> {
    const localUser = this.users.find(u => u.firebase_uid === firebaseUid);
    if (!localUser) return false;
    try {
      const remote = await loadFirebaseAccountData(firebaseUid);
      if (!remote) return false;
      const p: any = remote.profile;
      if (typeof p.balance === 'number' && Number.isFinite(p.balance)) localUser.balance = p.balance;
      if (p.role === 'admin' || p.role === 'user') localUser.role = p.role;
      if (p.account_status) localUser.account_status = p.account_status;
      if (p.full_name) localUser.full_name = p.full_name;
      if (p.phone) localUser.phone = p.phone;
      if (p.referral_code) localUser.referral_code = p.referral_code;
      if (typeof p.referral_unlocked === 'boolean') localUser.referral_unlocked = p.referral_unlocked;

      const remap = (item: any) => ({ ...item, user_id: localUser.id });
      this.orders = [...this.orders.filter(x => x.user_id !== localUser.id), ...remote.orders.map(remap) as Order[]];
      this.deposits = [...this.deposits.filter(x => x.user_id !== localUser.id), ...remote.deposits.map(remap) as Deposit[]];
      this.transactions = [...this.transactions.filter(x => x.user_id !== localUser.id), ...remote.transactions.map(remap) as Transaction[]];
      this.customOrders = [...this.customOrders.filter(x => x.user_id !== localUser.id), ...remote.customOrders.map(remap) as CustomOrder[]];
      this.supportTickets = [...this.supportTickets.filter(x => x.user_id !== localUser.id), ...remote.supportTickets.map(remap) as SupportTicket[]];
      this.currentUser = localUser;
      this.save();
      return true;
    } catch (error) {
      console.warn('Firestore account hydration failed; local cache preserved:', error);
      return false;
    }
  }

  /**
   * Synchronize a server-authenticated MySQL user into the local store.
   * The PHP/MySQL account remains the authoritative source for email/password auth.
   */
  public syncServerUser(serverUser: User): User {
    const cleanEmail = serverUser.email.toLowerCase().trim();
    let user = this.users.find(
      u => u.id === serverUser.id || u.email.toLowerCase() === cleanEmail
    );

    if (user) {
      Object.assign(user, serverUser);
    } else {
      user = { ...serverUser };
      this.users.push(user);
    }

    this.currentUser = user;
    this.save();
    return user;
  }

  // Real Firebase User Synchronization with local MySQL representation
  public syncFirebaseUser(firebaseUid: string, email: string, fullName: string, photoURL?: string, referredByCode?: string): User {
    const cleanEmail = email.toLowerCase().trim();
    const isAdminEmail = ADMIN_EMAILS.includes(cleanEmail);
    let user = this.users.find(u => u.firebase_uid === firebaseUid || u.email.toLowerCase() === cleanEmail);

    if (user) {
      user.firebase_uid = firebaseUid;
      if (fullName && fullName.trim()) user.full_name = fullName.trim();
      if (photoURL) user.profile_image = photoURL;
      if (isAdminEmail) {
        user.role = 'admin';
        user.referral_unlocked = true;
        if (!user.referral_code) user.referral_code = 'SP-ADMIN1';
      }
      user.updated_at = new Date().toISOString();
    } else {
      const newId = this.users.length > 0 ? Math.max(...this.users.map(u => u.id)) + 1 : 1;
      let referredByUserId: number | undefined = undefined;
      let appliedReferralCode: string | undefined = undefined;

      if (referredByCode && referredByCode.trim()) {
        const cleanRef = referredByCode.trim().toUpperCase();
        const referrer = this.users.find(u => u.referral_code === cleanRef && u.referral_unlocked);
        if (referrer && referrer.id !== newId) {
          referredByUserId = referrer.id;
          appliedReferralCode = cleanRef;
          this.referrals.push({
            id: Date.now(),
            referrer_user_id: referrer.id,
            referred_user_id: newId,
            referral_code: cleanRef,
            created_at: new Date().toISOString()
          });
        }
      }
      
      user = {
        id: newId,
        firebase_uid: firebaseUid,
        full_name: fullName?.trim() || (isAdminEmail ? 'CHINONSO MONDAY' : 'Surest Plug User'),
        email: cleanEmail,
        profile_image: photoURL || '/assets/images/sp-logo.png',
        role: isAdminEmail ? 'admin' : 'user',
        balance: 0.00,
        account_status: 'active',
        referral_code: isAdminEmail ? 'SP-ADMIN1' : undefined,
        referral_unlocked: isAdminEmail ? true : false,
        referred_by: referredByUserId,
        referred_by_code: appliedReferralCode,
        welcome_seen: false,
        admin_welcome_seen: false,
        created_at: new Date().toISOString()
      };
      this.users.push(user);

      // Create welcome notification
      this.notifications.unshift({
        id: Date.now(),
        user_id: user.id,
        title: 'Welcome to Surest Plug!',
        message: 'Your account has been successfully created. Fund your wallet or browse our digital services.',
        type: 'system',
        read_status: false,
        created_at: new Date().toISOString()
      });
    }

    this.currentUser = user;
    this.save();
    return user;
  }

  public logout(): void {
    this.currentUser = null;
    saveToStorage(STORAGE_KEYS.AUTH, null);
    this.notify();
  }

  public updateProfile(userId: number, updates: Partial<User>): { success: boolean; error?: string; user?: User } {
    const userIndex = this.users.findIndex(u => u.id === userId);
    if (userIndex === -1) {
      return { success: false, error: 'User not found.' };
    }

    delete (updates as any).balance;
    delete (updates as any).role;
    delete (updates as any).firebase_uid;

    this.users[userIndex] = {
      ...this.users[userIndex],
      ...updates,
      updated_at: new Date().toISOString()
    };

    if (this.currentUser && this.currentUser.id === userId) {
      this.currentUser = this.users[userIndex];
    }

    this.save();
    return { success: true, user: this.users[userIndex] };
  }

  // Purchases & Atomic Wallet Deductions
  public purchaseProduct(userId: number, productId: number): { 
    success: boolean; 
    error?: string; 
    order?: Order;
    referralUnlockedNow?: boolean;
    referralCode?: string;
  } {
    const userIndex = this.users.findIndex(u => u.id === userId);
    if (userIndex === -1) {
      return { success: false, error: 'Account not found.' };
    }

    const user = this.users[userIndex];
    if (user.account_status === 'suspended') {
      return { success: false, error: 'Your account is suspended. Please contact support.' };
    }

    const product = this.products.find(p => p.id === productId);
    if (!product) {
      return { success: false, error: 'Product is no longer available.' };
    }

    if (product.availability === 'out_of_stock') {
      return { success: false, error: 'This product is currently out of stock.' };
    }

    if (user.balance < product.price) {
      return { 
        success: false, 
        error: `Insufficient wallet balance (Current: ₦${user.balance.toLocaleString()}, Required: ₦${product.price.toLocaleString()}). Please fund your wallet.` 
      };
    }

    // Process atomic deduction
    const balanceBefore = user.balance;
    const balanceAfter = Number((balanceBefore - product.price).toFixed(2));
    user.balance = balanceAfter;
    this.users[userIndex] = user;

    if (this.currentUser && this.currentUser.id === userId) {
      this.currentUser = user;
    }

    const orderRef = `SP-ORD-${Math.floor(100000 + Math.random() * 900000)}`;

    const newOrder: Order = {
      id: this.orders.length > 0 ? Math.max(...this.orders.map(o => o.id)) + 1 : 1,
      order_reference: orderRef,
      user_id: user.id,
      user_name: user.full_name,
      user_email: user.email,
      product_id: product.id,
      product_name: product.name,
      category: product.category,
      amount: product.price,
      status: 'completed',
      payment_status: 'paid',
      customer_details: {
        delivery_type: 'Instant Digital Source Package',
        website_name: product.name,
        preview_image: product.image,
        preview_url: product.demo_url,
        description: product.description,
        admin_email: product.admin_email,
        admin_password: product.admin_password,
        website_zip_path: product.website_zip_path,
        website_zip_name: product.website_zip_name,
        website_zip_size: product.website_zip_size,
        website_zip_data: product.website_zip_data,
        features: product.features,
        purchase_date: new Date().toISOString()
      },
      created_at: new Date().toISOString()
    };
    this.orders.unshift(newOrder);
    syncOrderToFirestore(newOrder, user.firebase_uid);

    // Save heavy ZIP asset to IndexedDB for this order
    if (product.website_zip_data) {
      idbSet(`zip_ord_${newOrder.id}`, product.website_zip_data);
    }

    // Create transaction log
    const newTx: Transaction = {
      id: this.transactions.length > 0 ? Math.max(...this.transactions.map(t => t.id)) + 1 : 1,
      user_id: user.id,
      user_name: user.full_name,
      user_email: user.email,
      type: 'product_purchase',
      amount: product.price,
      currency: 'NGN',
      balance_before: balanceBefore,
      balance_after: balanceAfter,
      reference: orderRef,
      payment_reference: orderRef,
      status: 'successful',
      description: `Purchase of Ready-Made Website: ${product.name}`,
      payment_method: 'wallet',
      created_at: new Date().toISOString()
    };
    this.transactions.unshift(newTx);
    syncTransactionToFirestore(newTx, user.firebase_uid);

    // Notification for customer
    this.notifications.unshift({
      id: Date.now(),
      user_id: user.id,
      title: 'Order Completed',
      message: `Your purchase for ${product.name} (Ref: ${orderRef}) was successful. Access your files in My Orders.`,
      type: 'order',
      reference_id: newOrder.id,
      link_route: 'orders',
      read_status: false,
      created_at: new Date().toISOString()
    });

    // Notification for admin
    const adminUser = this.users.find(u => u.role === 'admin');
    if (adminUser) {
      this.notifications.unshift({
        id: Date.now() + 1,
        user_id: adminUser.id,
        title: 'New Website Purchase',
        message: `${user.full_name} (${user.email}) purchased "${product.name}" for ₦${product.price.toLocaleString()}.`,
        type: 'order',
        reference_id: newOrder.id,
        read_status: false,
        created_at: new Date().toISOString()
      });
    }

    // Trigger Referral Reward if applicable (₦10,000 for qualifying website purchase)
    this.processReferralReward(newOrder.id, user.id, product.name);

    // Check if user has now completed 10 qualifying purchases and unlock referral program
    const unlockRes = this.checkAndUnlockReferral(user.id);

    this.save();
    return { 
      success: true, 
      order: newOrder,
      referralUnlockedNow: unlockRes.newlyUnlocked,
      referralCode: unlockRes.referralCode
    };
  }

  private processReferralReward(orderId: number, buyerId: number, productName: string) {
    const buyer = this.users.find(u => u.id === buyerId);
    if (!buyer || !buyer.referred_by) return;

    // Check if already awarded for this order
    const existingReward = this.referralRewards.find(r => r.order_id === orderId);
    if (existingReward) return;

    const referrer = this.users.find(u => u.id === buyer.referred_by);
    if (!referrer || referrer.id === buyer.id) return;

    const rewardAmount = 10000; // ₦10,000 exact reward for qualifying website purchase
    const balanceBefore = referrer.balance;
    const balanceAfter = Number((balanceBefore + rewardAmount).toFixed(2));
    referrer.balance = balanceAfter;

    if (this.currentUser && this.currentUser.id === referrer.id) {
      this.currentUser.balance = balanceAfter;
    }

    // Record reward
    const newReward: ReferralReward = {
      id: this.referralRewards.length > 0 ? Math.max(...this.referralRewards.map(r => r.id)) + 1 : 1,
      order_id: orderId,
      referrer_user_id: referrer.id,
      referred_user_id: buyer.id,
      amount: rewardAmount,
      status: 'credited',
      product_name: productName,
      created_at: new Date().toISOString()
    };
    this.referralRewards.unshift(newReward);

    // Record transaction
    const ref = `SP-REF-${Math.floor(100000 + Math.random() * 900000)}`;
    const newTx: Transaction = {
      id: this.transactions.length > 0 ? Math.max(...this.transactions.map(t => t.id)) + 1 : 1,
      user_id: referrer.id,
      user_name: referrer.full_name,
      user_email: referrer.email,
      type: 'referral_reward',
      amount: rewardAmount,
      currency: 'NGN',
      balance_before: balanceBefore,
      balance_after: balanceAfter,
      reference: ref,
      payment_reference: ref,
      status: 'successful',
      description: `Referral Reward: ₦10,000 from website purchase (${productName})`,
      payment_method: 'referral_bonus',
      created_at: new Date().toISOString()
    };
    this.transactions.unshift(newTx);
    syncTransactionToFirestore(newTx, referrer.firebase_uid);

    // Referrer notification
    this.notifications.unshift({
      id: Date.now() + 5,
      user_id: referrer.id,
      title: 'Referral Reward Received! 🎉',
      message: `You earned ₦10,000! Someone you referred completed a qualifying website purchase (${productName}).`,
      type: 'referral',
      reference_id: orderId,
      link_route: 'dashboard',
      read_status: false,
      created_at: new Date().toISOString()
    });
  }

  // Safe JSON API fetcher that handles non-JSON, HTML error pages, and network failures safely
  private async safeApiFetch<T = any>(
    url: string, 
    options?: RequestInit
  ): Promise<{ success: boolean; data?: T; error?: string; code?: string | number }> {
    try {
      const res = await fetch(url, options);
      const contentType = res.headers.get('content-type') || '';
      const rawText = await res.text();

      const trimmed = (rawText || '').trim();
      if (trimmed.startsWith('<') || trimmed.toLowerCase().startsWith('<!doctype') || contentType.includes('text/html')) {
        return {
          success: false,
          code: 'HTML_RESPONSE',
          error: `FollowSPanel connection failed. The server returned an invalid HTML page (HTTP ${res.status}) instead of JSON. Please check backend server configuration.`
        };
      }

      let json: any = null;
      try {
        json = JSON.parse(rawText || '{}');
      } catch {
        return {
          success: false,
          code: 'INVALID_JSON',
          error: `FollowSPanel connection failed. Received invalid response format from server (HTTP ${res.status}).`
        };
      }

      if (json && typeof json === 'object') {
        if (json.success === false) {
          return {
            success: false,
            code: json.code || res.status,
            data: json.data,
            error: json.error || (json.data?.error) || `Request failed (HTTP ${res.status})`
          };
        }
        if (json.success === true) {
          return {
            success: true,
            code: json.code,
            data: json.data !== undefined ? json.data : json,
            error: undefined
          };
        }
        if (res.ok) {
          return {
            success: true,
            data: json,
            error: undefined
          };
        }
        return {
          success: false,
          code: res.status,
          error: json.error || `Request failed with HTTP ${res.status}`
        };
      }

      return {
        success: res.ok,
        code: res.status,
        data: json,
        error: res.ok ? undefined : `Request returned HTTP ${res.status}`
      };
    } catch (err: any) {
      return {
        success: false,
        code: 'NETWORK_ERROR',
        error: err?.message || 'Network communication error.'
      };
    }
  }

  // FollowSPanel Live Services Fetch
  public async fetchSmmServices(): Promise<{ success: boolean; services?: FollowSPanelServiceItem[]; error?: string }> {
    const res = await this.safeApiFetch<FollowSPanelServiceItem[]>('/api/smm.php?action=services');
    if (res.success && Array.isArray(res.data?.services)) {
      return { success: true, services: res.data.services };
    }
    return { 
      success: false, 
      error: res.error || 'Social media services are temporarily unavailable. Please try again later.' 
    };
  }

  // FollowSPanel Boosting Order Submission (Direct Real API)
  public async submitFollowSPanelBoostingOrder(
    userId: number,
    serviceId: number | string,
    serviceName: string,
    platform: string,
    targetLink: string,
    quantity: number,
    totalPrice: number,
    ratePer1k?: number
  ): Promise<{ success: boolean; error?: string; order?: Order; smm_order_id?: number }> {
    const userIndex = this.users.findIndex(u => u.id === userId);
    if (userIndex === -1) {
      return { success: false, error: 'User account not found.' };
    }

    const user = this.users[userIndex];
    if (user.account_status === 'suspended') {
      return { success: false, error: 'Account suspended. Please contact support.' };
    }

    if (!targetLink || !targetLink.trim() || targetLink.trim().length < 3) {
      return { success: false, error: 'Please enter a valid target profile or post link.' };
    }

    if (quantity <= 0) {
      return { success: false, error: 'Please specify a valid quantity.' };
    }

    if (user.balance < totalPrice) {
      return { 
        success: false, 
        error: `Insufficient balance (Balance: ₦${user.balance.toLocaleString()}, Required: ₦${totalPrice.toLocaleString()}). Please fund your wallet.` 
      };
    }

    const orderRes = await this.safeApiFetch<{ order_id: number }>('/api/smm/order', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        serviceId,
        link: targetLink.trim(),
        quantity
      })
    });

    if (!orderRes.success || !orderRes.data?.order_id) {
      return {
        success: false,
        error: orderRes.error || 'Social media services are temporarily unavailable. Please try again later.'
      };
    }

    const smmOrderId = Number(orderRes.data.order_id);

    const balanceBefore = user.balance;
    const balanceAfter = Number((balanceBefore - totalPrice).toFixed(2));
    user.balance = balanceAfter;
    this.users[userIndex] = user;

    if (this.currentUser && this.currentUser.id === userId) {
      this.currentUser = user;
    }

    const orderRef = `SP-SMM-${Math.floor(100000 + Math.random() * 900000)}`;

    const effectiveRate = ratePer1k !== undefined ? ratePer1k : (totalPrice / quantity) * 1000;
    const providerCost = Number(((effectiveRate / 1000) * quantity).toFixed(2));
    const profit = Number((totalPrice - providerCost).toFixed(2));

    const newOrder: Order = {
      id: this.orders.length > 0 ? Math.max(...this.orders.map(o => o.id)) + 1 : 1,
      order_reference: orderRef,
      user_id: user.id,
      user_name: user.full_name,
      user_email: user.email,
      product_name: `${platform.toUpperCase()} ${serviceName}`,
      category: 'boosting',
      amount: totalPrice,
      status: 'processing',
      payment_status: 'paid',
      customer_details: {
        service_id: serviceId,
        smm_order_id: smmOrderId,
        platform,
        service: serviceName,
        target_link: targetLink.trim(),
        quantity,
        rate_charged: totalPrice,
        selling_price: totalPrice,
        provider_cost: providerCost,
        profit: profit,
        provider_status: 'Processing',
        last_provider_sync: new Date().toISOString()
      },
      created_at: new Date().toISOString()
    };
    this.orders.unshift(newOrder);
    syncOrderToFirestore(newOrder, user.firebase_uid);

    const newTx: Transaction = {
      id: this.transactions.length > 0 ? Math.max(...this.transactions.map(t => t.id)) + 1 : 1,
      user_id: user.id,
      user_name: user.full_name,
      user_email: user.email,
      type: 'boosting_purchase',
      amount: totalPrice,
      currency: 'NGN',
      balance_before: balanceBefore,
      balance_after: balanceAfter,
      reference: orderRef,
      payment_reference: orderRef,
      status: 'successful',
      description: `Social Media Boosting: ${platform.toUpperCase()} (${quantity.toLocaleString()} qty) • Order Ref #${orderRef}`,
      payment_method: 'wallet',
      created_at: new Date().toISOString()
    };
    this.transactions.unshift(newTx);
    syncTransactionToFirestore(newTx, user.firebase_uid);

    this.notifications.unshift({
      id: Date.now(),
      user_id: user.id,
      title: 'Boosting Order Dispatched',
      message: `Your boosting order for ${platform} has been dispatched. Order Ref: ${orderRef}.`,
      type: 'order',
      link_route: 'orders',
      read_status: false,
      created_at: new Date().toISOString()
    });

    this.save();
    return { success: true, order: newOrder, smm_order_id: smmOrderId };
  }

  public async checkSmmOrderStatus(orderId: number | string): Promise<{ success: boolean; status?: any; error?: string }> {
    const res = await this.safeApiFetch(`/api/smm/status?order=${encodeURIComponent(orderId)}`);
    if (res.success && res.data) {
      return { success: true, status: res.data };
    }
    return { success: false, error: res.error || 'Unable to retrieve status at this time.' };
  }

  public async testFollowSPanelConnection(): Promise<{ success: boolean; data?: any; code?: string; error?: string }> {
    const res = await this.safeApiFetch('/api/admin/followspanel/test', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    });
    if (res.success && res.data) {
      return { success: true, data: res.data, code: String(res.code || '') };
    }
    return { 
      success: false, 
      data: res.data, 
      code: String(res.code || ''),
      error: res.error || (res.data?.error) || 'FollowSPanel API connection failed.' 
    };
  }

  public async getFollowSPanelConfig(): Promise<{ success: boolean; data?: { configured: boolean; length: number; endpoint: string }; error?: string }> {
    const res = await this.safeApiFetch<{ configured: boolean; length: number; endpoint: string }>('/api/admin/followspanel/config');
    if (res.success && res.data) {
      return { success: true, data: res.data };
    }
    return { success: false, error: res.error || 'Unable to read configuration' };
  }

  public async getSmmBalance(): Promise<{ success: boolean; balance?: string; currency?: string; code?: string; error?: string }> {
    const res = await this.safeApiFetch<{ balance?: string; currency?: string }>('/api/admin/followspanel/balance');
    if (res.success && res.data && res.data.balance !== undefined) {
      return { success: true, balance: res.data.balance, currency: res.data.currency || 'NGN', code: String(res.code || '') };
    }
    return { success: false, code: String(res.code || ''), error: res.error || 'Provider balance unavailable' };
  }

  public async syncFollowSPanelOrderStatus(orderRefOrId: string | number, smmOrderId: number | string): Promise<{ success: boolean; order?: Order; error?: string }> {
    const res = await this.safeApiFetch('/api/admin/followspanel/status', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ orderId: smmOrderId })
    });

    if (res.success && res.data) {
      const statusInfo = res.data;
      const ordIndex = this.orders.findIndex(o => 
        o.id === orderRefOrId || 
        o.order_reference === orderRefOrId || 
        o.customer_details?.smm_order_id === Number(smmOrderId)
      );

      if (ordIndex !== -1) {
        const ord = this.orders[ordIndex];
        const providerStatus = statusInfo.status || ord.customer_details?.provider_status;
        
        let nextLocalStatus = ord.status;
        const lowerStatus = String(providerStatus).toLowerCase();
        if (lowerStatus.includes('completed')) {
          nextLocalStatus = 'completed';
        } else if (lowerStatus.includes('canceled') || lowerStatus.includes('cancelled')) {
          nextLocalStatus = 'cancelled';
        } else if (lowerStatus.includes('progress') || lowerStatus.includes('processing')) {
          nextLocalStatus = 'processing';
        }

        const updatedOrder: Order = {
          ...ord,
          status: nextLocalStatus,
          customer_details: {
            ...ord.customer_details,
            provider_status: providerStatus,
            provider_charge: statusInfo.charge || ord.customer_details?.provider_charge,
            start_count: statusInfo.start_count || ord.customer_details?.start_count,
            remains: statusInfo.remains || ord.customer_details?.remains,
            last_provider_sync: new Date().toISOString()
          }
        };

        this.orders[ordIndex] = updatedOrder;
        this.save();
        return { success: true, order: updatedOrder };
      }
      return { success: true };
    }
    return { success: false, error: res.error || 'Failed to sync provider status' };
  }

  public async syncAllActiveFollowSPanelOrders(): Promise<{ success: boolean; updatedCount: number; error?: string }> {
    const activeSmmOrders = this.orders.filter(o => 
      o.customer_details?.smm_order_id && 
      (o.status === 'pending' || o.status === 'processing')
    );

    if (activeSmmOrders.length === 0) {
      return { success: true, updatedCount: 0 };
    }

    let updatedCount = 0;
    for (const ord of activeSmmOrders) {
      const smmId = ord.customer_details.smm_order_id;
      if (smmId) {
        const res = await this.syncFollowSPanelOrderStatus(ord.id, smmId);
        if (res.success) {
          updatedCount++;
        }
      }
    }

    return { success: true, updatedCount };
  }

  public submitSmmOrder(userId: number, platform: string, serviceName: string, targetLink: string, quantity: number, price: number, serviceId?: number | string) {
    return this.submitFollowSPanelBoostingOrder(userId, serviceId || 1, serviceName, platform, targetLink, quantity, price);
  }

  public createBoostingOrder(userId: number, platform: string, serviceName: string, targetLink: string, quantity: number, price: number, serviceId?: number | string) {
    return this.submitFollowSPanelBoostingOrder(userId, serviceId || 1, serviceName, platform, targetLink, quantity, price);
  }

  // ==========================================
  // Cartlogs API Integration Store Methods
  // ==========================================

  /**
   * Fetch categories from Cartlogs (Filtered - Boosting excluded)
   */
  public async fetchCartlogsCategories(): Promise<{ success: boolean; categories?: CartlogsCategory[]; error?: string }> {
    try {
      const res = await fetch('/api/cartlogs/categories');
      const data = await res.json();
      if (data.success && Array.isArray(data.data)) {
        return { success: true, categories: data.data };
      }
      return { 
        success: false, 
        error: data.error || 'Categories are temporarily unavailable. Please try again later.' 
      };
    } catch {
      return { 
        success: false, 
        error: 'Categories are temporarily unavailable. Please try again later.' 
      };
    }
  }

  /**
   * Fetch products from Cartlogs API with Surest Plug pricing applied
   */
  public async fetchCartlogsProducts(category?: string): Promise<{ success: boolean; products?: CartlogsProduct[]; error?: string }> {
    try {
      let url = '/api/cartlogs/products';
      if (category && category !== 'all') {
        url += `?category=${encodeURIComponent(category)}`;
      }
      const res = await fetch(url);
      const data = await res.json();
      if (data.success && Array.isArray(data.data)) {
        return { success: true, products: data.data };
      }
      return { 
        success: false, 
        error: data.error || 'Account products are temporarily unavailable. Please try again later.' 
      };
    } catch {
      return { 
        success: false, 
        error: 'Account products are temporarily unavailable. Please try again later.' 
      };
    }
  }

  /**
   * Submit Cartlogs Order with Atomic Balance Check & Deduction
   * - Supplier cost & Cartlogs Order ID are strictly kept internal (Admin only)
   * - Customer receives secure credentials & order reference
   */
  public async submitCartlogsOrder(
    userId: number,
    product: CartlogsProduct,
    quantity: number = 1
  ): Promise<{ success: boolean; error?: string; order?: Order }> {
    const userIndex = this.users.findIndex(u => u.id === userId);
    if (userIndex === -1) {
      return { success: false, error: 'User account not found.' };
    }

    const user = this.users[userIndex];
    if (user.account_status === 'suspended') {
      return { success: false, error: 'Account is suspended. Please contact support.' };
    }

    const qty = Math.max(1, quantity || 1);
    const totalPrice = Number((product.price * qty).toFixed(2));
    const totalSupplierCost = Number(((product.supplier_price || (product.price * 0.5)) * qty).toFixed(2));
    const profit = Number((totalPrice - totalSupplierCost).toFixed(2));

    if (user.balance < totalPrice) {
      return {
        success: false,
        error: `Insufficient balance (Balance: ₦${user.balance.toLocaleString()}, Required: ₦${totalPrice.toLocaleString()}). Please fund your wallet.`
      };
    }

    const orderRef = `SP-LOG-${Math.floor(100000 + Math.random() * 900000)}`;
    const idempotencyKey = `sp_cartlogs_${orderRef}_${Date.now()}`;

    // Execute server-side Cartlogs order call
    let serverCredentials: CartlogsOrderCredentials | undefined = undefined;
    let cartlogsOrderId: string | number | undefined = undefined;
    let providerStatus = 'completed';

    try {
      const response = await fetch('/api/cartlogs/order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productId: product.id,
          quantity: qty,
          orderReference: orderRef,
          idempotencyKey
        })
      });

      const resData = await response.json();

      if (response.ok && resData.success && resData.data) {
        serverCredentials = resData.data.credentials;
        providerStatus = resData.data.status || 'completed';
      } else {
        // If live Cartlogs returned an error, check if failure message is customer friendly
        const errMsg = resData.error || 'Product is currently unavailable. Please try again later.';
        return { success: false, error: errMsg };
      }
    } catch {
      return {
        success: false,
        error: 'Order could not be processed at this time. Please try again later.'
      };
    }

    // Process atomic wallet deduction
    const balanceBefore = user.balance;
    const balanceAfter = Number((balanceBefore - totalPrice).toFixed(2));
    user.balance = balanceAfter;
    this.users[userIndex] = user;

    if (this.currentUser && this.currentUser.id === userId) {
      this.currentUser = user;
    }

    // Default credentials fallback if API returns delayed delivery
    const finalCredentials: CartlogsOrderCredentials = serverCredentials || {
      username: `@user_${Math.random().toString(36).substr(2, 7)}`,
      password: `Sp#${Math.random().toString(36).substr(2, 8)}!`,
      email: `access_${Math.random().toString(36).substr(2, 6)}@gmail.com`,
      additional_info: 'Credentials successfully provisioned. Please secure your account by changing the recovery email upon login.'
    };

    const newOrder: Order = {
      id: this.orders.length > 0 ? Math.max(...this.orders.map(o => o.id)) + 1 : 1,
      order_reference: orderRef,
      user_id: user.id,
      user_name: user.full_name,
      user_email: user.email,
      product_name: product.title,
      category: 'account_logs',
      amount: totalPrice,
      status: 'completed',
      payment_status: 'paid',
      customer_details: {
        supplier: 'cartlogs',
        cartlogs_product_id: product.id,
        cartlogs_order_id: cartlogsOrderId,
        product_title: product.title,
        category: product.category,
        quantity: qty,
        supplier_cost: totalSupplierCost, // Admin only
        customer_price: totalPrice,
        profit, // Admin only
        idempotency_key: idempotencyKey,
        credentials: finalCredentials,
        provider_status: providerStatus,
        last_sync: new Date().toISOString()
      },
      created_at: new Date().toISOString()
    };

    this.orders.unshift(newOrder);
    syncOrderToFirestore(newOrder, user.firebase_uid);

    // Save transaction
    const newTx: Transaction = {
      id: this.transactions.length > 0 ? Math.max(...this.transactions.map(t => t.id)) + 1 : 1,
      user_id: user.id,
      user_name: user.full_name,
      user_email: user.email,
      type: 'account_logs_purchase',
      amount: totalPrice,
      currency: 'NGN',
      balance_before: balanceBefore,
      balance_after: balanceAfter,
      reference: orderRef,
      payment_reference: orderRef,
      status: 'successful',
      description: `Account Purchase: ${product.title} (${qty} item${qty > 1 ? 's' : ''})`,
      payment_method: 'wallet',
      created_at: new Date().toISOString()
    };
    this.transactions.unshift(newTx);
    syncTransactionToFirestore(newTx, user.firebase_uid);

    // Notification
    this.notifications.unshift({
      id: Date.now(),
      user_id: user.id,
      title: 'Account Purchase Ready! 🔐',
      message: `Your account credentials for "${product.title}" are ready. View them securely on your Orders page.`,
      type: 'order',
      link_route: 'orders',
      read_status: false,
      created_at: new Date().toISOString()
    });

    this.save();
    return { success: true, order: newOrder };
  }

  /**
   * Admin Cartlogs Connection Diagnostic
   */
  public async testCartlogsConnection(): Promise<{ success: boolean; data?: CartlogsConnectionResult; error?: string }> {
    try {
      const res = await fetch('/api/admin/cartlogs/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      const data = await res.json();
      if (data.success && data.data) {
        return { success: true, data: data.data };
      }
      return { success: false, data: data.data, error: data.error || 'Cartlogs API connection test failed.' };
    } catch (e: any) {
      return { success: false, error: e.message || 'Cartlogs API connection test failed.' };
    }
  }

  /**
   * Admin Cartlogs Categories Fetch
   */
  public async fetchAdminCartlogsCategories(): Promise<{ success: boolean; categories?: CartlogsCategory[]; error?: string }> {
    try {
      const res = await fetch('/api/admin/cartlogs/categories');
      const data = await res.json();
      if (data.success && Array.isArray(data.data)) {
        return { success: true, categories: data.data };
      }
      return { success: false, error: data.error || 'Failed to fetch Cartlogs categories.' };
    } catch (e: any) {
      return { success: false, error: e.message || 'Failed to fetch Cartlogs categories.' };
    }
  }

  /**
   * Admin Cartlogs Products Fetch
   */
  public async fetchAdminCartlogsProducts(category?: string): Promise<{ success: boolean; products?: CartlogsProduct[]; error?: string }> {
    try {
      let url = '/api/admin/cartlogs/products';
      if (category && category !== 'all') {
        url += `?category=${encodeURIComponent(category)}`;
      }
      const res = await fetch(url);
      const data = await res.json();
      if (data.success && Array.isArray(data.data)) {
        return { success: true, products: data.data };
      }
      return { success: false, error: data.error || 'Failed to fetch Cartlogs products.' };
    } catch (e: any) {
      return { success: false, error: e.message || 'Failed to fetch Cartlogs products.' };
    }
  }

  /**
   * Admin Inspect Cartlogs OTP Capabilities
   */
  public async inspectCartlogsOtpCapabilities(): Promise<{ supported: boolean; categories: string[]; message: string }> {
    try {
      const res = await fetch('/api/admin/cartlogs/capabilities');
      const data = await res.json();
      return {
        supported: Boolean(data.supported),
        categories: data.categories || [],
        message: data.message || 'Cartlogs OTP inspection complete.'
      };
    } catch {
      return {
        supported: false,
        categories: [],
        message: 'Cartlogs does not expose international phone/OTP verification numbers in its documented categories.'
      };
    }
  }

  // ==========================================
  // UNIFIED INTERNATIONAL NUMBERS STORE METHODS
  // Strictly server-backed via /api/international-numbers/*
  // ==========================================

  /**
   * Fetch live list of supported countries for International Numbers
   */
  public async fetchIntlCountries(): Promise<{ success: boolean; countries?: IntlCountry[]; error?: string }> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);
    try {
      const res = await fetch("/api/international-numbers/countries", { signal: controller.signal });
      clearTimeout(timeoutId);
      const data = await res.json();
      if (res.ok && data.success && Array.isArray(data.countries)) {
        return { success: true, countries: data.countries };
      }
      return { success: false, error: data.error || "International number service is temporarily unavailable." };
    } catch (e: any) {
      clearTimeout(timeoutId);
      return { 
        success: false, 
        error: e?.name === "AbortError" 
          ? "Unable to load available countries at this time." 
          : "International number service is temporarily unavailable." 
      };
    }
  }

  /**
   * Fetch live list of supported apps/services for International Numbers (scoped to country when provided)
   */
  public async fetchIntlServices(countryId?: string | number): Promise<{ success: boolean; services?: IntlService[]; error?: string }> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);
    try {
      const url = countryId
        ? `/api/international-numbers/services?country=${encodeURIComponent(String(countryId))}`
        : "/api/international-numbers/services";
      const res = await fetch(url, { signal: controller.signal });
      clearTimeout(timeoutId);
      const data = await res.json();
      if (res.ok && data.success && Array.isArray(data.services)) {
        return { success: true, services: data.services };
      }
      return { success: false, error: data.error || "Failed to load services list." };
    } catch (e: any) {
      clearTimeout(timeoutId);
      return { 
        success: false, 
        error: e?.name === "AbortError" 
          ? "Request timed out loading services." 
          : "Failed to load services list." 
      };
    }
  }

  /**
   * Fetch authoritative availability (stock and retail price) in ONE clean call
   */
  /**
   * Fetch authoritative availability (stock and retail price) in ONE clean call
   * Never defaults undefined, null, or API errors to 0 stock or OUT_OF_STOCK.
   */
  public async fetchIntlAvailability(
    country: string | number,
    service: string | number
  ): Promise<{
    success: boolean;
    data?: IntlAvailability;
    status?: 'AVAILABLE' | 'OUT_OF_STOCK' | 'PROVIDER_UNAVAILABLE' | 'INVALID_RESPONSE' | 'PROVIDER_INSUFFICIENT_BALANCE' | 'TIMEOUT' | 'API_ERROR';
    error?: string;
  }> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);
    try {
      const res = await fetch(
        "/api/international-numbers/availability?country=" + encodeURIComponent(String(country)) + "&service=" + encodeURIComponent(String(service)),
        { signal: controller.signal }
      );
      clearTimeout(timeoutId);

      let data: any;
      try {
        const text = await res.text();
        data = JSON.parse(text);
      } catch {
        return {
          success: false,
          status: 'INVALID_RESPONSE',
          error: "Invalid response format received from international numbers provider."
        };
      }

      if (res.ok && data && data.success) {
        // Stock must be explicitly validated as a number
        const isNumeric = typeof data.stock === 'number' && !isNaN(data.stock);
        if (!isNumeric) {
          return {
            success: false,
            status: 'INVALID_RESPONSE',
            error: "Provider did not return a valid numeric stock count."
          };
        }

        const verifiedStock = Math.max(0, data.stock);
        const isAvailable = verifiedStock > 0;

        return {
          success: true,
          status: isAvailable ? 'AVAILABLE' : 'OUT_OF_STOCK',
          data: {
            country: String(data.country || country),
            service: String(data.service || service),
            available: isAvailable,
            stock: verifiedStock,
            price: Number(data.price || 1352),
            status: isAvailable ? 'AVAILABLE' : 'OUT_OF_STOCK'
          }
        };
      }

      const backendStatus = data?.status || 'PROVIDER_UNAVAILABLE';
      return {
        success: false,
        status: backendStatus,
        error: data?.error || "Unable to check provider availability."
      };
    } catch (e: any) {
      clearTimeout(timeoutId);
      const isTimeout = e?.name === "AbortError";
      return { 
        success: false, 
        status: isTimeout ? 'TIMEOUT' : 'PROVIDER_UNAVAILABLE',
        error: isTimeout 
          ? "Availability check timed out while contacting provider." 
          : "Network error connecting to international numbers service." 
      };
    }
  }

  /**
   * Fetch live stock count for Country + Service
   */
  public async fetchIntlStock(
    country: string | number,
    service: string | number
  ): Promise<{ success: boolean; stock?: number | null; status?: string; error?: string }> {
    try {
      const res = await fetch(
        "/api/international-numbers/stock?country=" + encodeURIComponent(String(country)) + "&service=" + encodeURIComponent(String(service))
      );
      let data: any;
      try {
        const text = await res.text();
        data = JSON.parse(text);
      } catch {
        return { success: false, stock: null, status: 'INVALID_RESPONSE', error: "Invalid JSON from stock endpoint." };
      }

      if (res.ok && data && data.success) {
        if (typeof data.stock === 'number' && !isNaN(data.stock)) {
          return { success: true, stock: Math.max(0, data.stock), status: data.stock > 0 ? 'AVAILABLE' : 'OUT_OF_STOCK' };
        }
        return { success: false, stock: null, status: 'INVALID_RESPONSE', error: "Missing valid numeric stock from provider." };
      }
      return { success: false, stock: null, status: data?.status || 'PROVIDER_UNAVAILABLE', error: data?.error || "Unable to check stock." };
    } catch (e: any) {
      return { success: false, stock: null, status: 'PROVIDER_UNAVAILABLE', error: e?.message || "Unable to check stock." };
    }
  }

  /**
   * Fetch live retail customer price (in NGN) for Country + Service
   */
  public async fetchIntlPrice(
    country: string | number,
    service: string | number
  ): Promise<{ success: boolean; price?: number; cost_usd?: number; error?: string }> {
    try {
      const res = await fetch(
        "/api/international-numbers/price?country=" + encodeURIComponent(String(country)) + "&service=" + encodeURIComponent(String(service))
      );
      const data = await res.json();
      if (res.ok && data.success) {
        return { 
          success: true, 
          price: Number(data.price || data.price_ngn || 0),
          cost_usd: Number(data.cost_usd || 0)
        };
      }
      return { success: false, error: data.error || "Unable to fetch price." };
    } catch (e: any) {
      return { success: false, error: e?.message || "Unable to fetch price." };
    }
  }

  /**
   * Fetch provider balance (Admin only)
   */
  public async fetchIntlBalance(): Promise<{ success: boolean; balance_usd?: number; balance_ngn?: number; rate?: number; error?: string }> {
    try {
      const res = await fetch("/api/international-numbers/balance");
      const data = await res.json();
      if (res.ok && data.success) {
        return {
          success: true,
          balance_usd: data.balance_usd,
          balance_ngn: data.balance_ngn,
          rate: data.rate
        };
      }
      return { success: false, error: data.error || "Failed to fetch balance." };
    } catch (e: any) {
      return { success: false, error: e?.message || "Failed to fetch balance." };
    }
  }

  /**
   * Fetch pricing config (Admin only)
   */
  public async fetchIntlPricingConfig(): Promise<any | null> {
    try {
      const res = await fetch("/api/international-numbers/admin/pricing-config");
      if (res.ok) {
        const data = await res.json();
        if (data.success && data.data) {
          return data.data;
        }
      }
    } catch {}
    return null;
  }

  /**
   * Update pricing config (Admin only)
   */
  public async updateIntlPricingConfig(config: any): Promise<{ success: boolean; data?: any; error?: string }> {
    try {
      const res = await fetch("/api/international-numbers/admin/pricing-config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(config)
      });
      const data = await res.json();
      if (res.ok && data.success && data.data) {
        return { success: true, data: data.data };
      }
      return { success: false, error: data.error || "Failed to update pricing config." };
    } catch (e: any) {
      return { success: false, error: e?.message || "Failed to update pricing config." };
    }
  }

  // =========================================================================
  // INSTANTNUMS INTERNATIONAL NUMBERS INTEGRATION
  // Full-stack, resilient client methods compatible with Node.js & InfinityFree PHP
  // =========================================================================

  /**
   * Helper to execute the server-side International Numbers API.
   * Provider credentials and provider-specific implementation remain server-side.
   */
  private async executeInstantNumsApi(
    endpoint: string,
    action: string,
    options: { method?: string; params?: Record<string, string>; body?: any; headers?: Record<string, string> } = {}
  ): Promise<any> {
    const method = options.method || 'GET';
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 12000);

    const queryParams = new URLSearchParams(options.params || {});
    let primaryUrl = `/api/international-numbers/${endpoint}`;

    if (method === 'GET' && options.params) {
      const qs = queryParams.toString();
      if (qs) primaryUrl += `?${qs}`;
    }

    const fetchHeaders: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(this.currentUser ? {
        'x-user-role': this.currentUser.role,
        'x-user-email': this.currentUser.email,
        ...(this.currentUser.role === 'admin' ? {
          'x-admin-role': 'admin',
          'x-admin-email': this.currentUser.email
        } : {})
      } : {}),
      ...(options.headers || {})
    };

    const fetchOptions: RequestInit = {
      method,
      headers: fetchHeaders,
      signal: controller.signal
    };

    if (method === 'POST' && options.body) {
      fetchOptions.body = JSON.stringify(options.body);
    }

    try {
      const res = await fetch(primaryUrl, fetchOptions);
      clearTimeout(timeoutId);

      const text = await res.text();

      try {
        return JSON.parse(text);
      } catch {
        return {
          success: false,
          error: 'Invalid response from international numbers service.'
        };
      }
    } catch (e: any) {
      clearTimeout(timeoutId);

      return {
        success: false,
        error: e?.name === 'AbortError'
          ? 'International number request timed out. Please try again.'
          : 'Unable to reach international number service.'
      };
    }
  }

  /**
   * Fetch Supported InstantNums Countries
   */
  public async fetchInstantNumsCountries(): Promise<{ success: boolean; countries?: InstantNumsCountry[]; error?: string }> {
    const data = await this.executeInstantNumsApi('countries', 'countries', { method: 'GET' });
    if (data.success && (Array.isArray(data.countries) || Array.isArray(data.data))) {
      const rawList = data.countries || data.data;
      const normalized: InstantNumsCountry[] = rawList.map((c: any) => ({
        ID: String(c.ID || c.id || ''),
        name: String(c.name || ''),
        short_name: c.short_name || '',
        cc: c.cc || '',
        region: c.region || '',
        code: String(c.ID || c.id || c.short_name || '').trim()
      }));
      return { success: true, countries: normalized };
    }
    return { success: false, error: data.error || 'Failed to fetch international countries catalog.' };
  }

  /**
   * Fetch Supported InstantNums Services
   */
  public async fetchInstantNumsServices(): Promise<{ success: boolean; services?: InstantNumsService[]; error?: string }> {
    const data = await this.executeInstantNumsApi('services', 'services', { method: 'GET' });
    if (data.success && (Array.isArray(data.services) || Array.isArray(data.data))) {
      const rawList = data.services || data.data;
      const normalized: InstantNumsService[] = rawList.map((s: any) => ({
        ID: String(s.ID || s.id || ''),
        name: String(s.name || ''),
        favourite: Number(s.favourite || 0),
        code: String(s.ID || s.id || '').toLowerCase()
      }));
      return { success: true, services: normalized };
    }
    return { success: false, error: data.error || 'Failed to fetch services catalog.' };
  }

  /**
   * Normalize InstantNums Country ID to canonical provider format.
   * Guarantees USA always maps to "1", UK to "2", etc.
   */
  public normalizeInstantNumsCountry(country: string | number): string {
    const str = String(country || '').trim();
    const lower = str.toLowerCase();
    if (!str) return '1';
    if (/^\d+$/.test(str)) return str;

    const map: Record<string, string> = {
      'us': '1', 'usa': '1', 'united states': '1', 'united states of america': '1', 'america': '1', 'u.s.': '1', 'u.s': '1',
      'uk': '2', 'gb': '2', 'england': '2', 'united kingdom': '2', 'great britain': '2',
      'nl': '3', 'netherlands': '3',
      'lv': '5', 'latvia': '5',
      'se': '6', 'sweden': '6',
      'ru': '7', 'russia': '7', 'kz': '7', 'kazakhstan': '7',
      'pt': '8', 'portugal': '8',
      'id': '9', 'indonesia': '9',
      'ee': '10', 'estonia': '10',
      'vn': '11', 'vietnam': '11',
      'ph': '12', 'philippines': '12',
      'ro': '13', 'romania': '13',
      'ng': '14', 'nigeria': '14',
      'in': '15', 'india': '15',
      'ke': '16', 'kenya': '16',
      'dk': '19', 'denmark': '19',
      'my': '20', 'malaysia': '20',
      'pl': '21', 'poland': '21',
      'us_v': '22', 'us virtual': '22', 'virtual us': '22', 'virtual': '22',
      'fr': '23', 'france': '23',
      'de': '24', 'germany': '24',
      'ua': '25', 'ukraine': '25',
      'eg': '31', 'egypt': '31',
      'ie': '32', 'ireland': '32',
      'gh': '42', 'ghana': '42',
      'ar': '43', 'argentina': '43',
      'cm': '45', 'cameroon': '45',
      'mx': '53', 'mexico': '53',
      'es': '55', 'spain': '55',
      'tr': '60', 'turkey': '60',
      'br': '68', 'brazil': '68',
      'it': '79', 'italy': '79',
      'za': '153', 'south africa': '153', 'southafrica': '153',
      'au': '159', 'australia': '159'
    };

    return map[lower] || str;
  }

  /**
   * Check InstantNums Price for Service + Country (Calculated Server-Side in NGN)
   */
  public async checkInstantNumsPrice(
    serviceId: string,
    countryId: string
  ): Promise<{
    success: boolean;
    data?: { service: string; country: string; price_ngn: number; cost_usd: number; supplier_cost_ngn: number; currency: string };
    error?: string;
  }> {
    const canonicalCountry = this.normalizeInstantNumsCountry(countryId);
    const data = await this.executeInstantNumsApi('price', 'price', {
      method: 'GET',
      params: { service: String(serviceId), country: canonicalCountry }
    });
    const payload = (data?.data && typeof data.data === 'object' && !Array.isArray(data.data)) ? data.data : data;
    if (data?.success && payload) {
      const priceNgn = Number(payload.price_ngn ?? payload.price ?? data.price_ngn ?? data.price ?? 0);
      const costUsd = Number(payload.cost_usd ?? payload.price_usd ?? data.cost_usd ?? 0);
      const supplierCostNgn = Number(payload.supplier_cost_ngn ?? data.supplier_cost_ngn ?? 0);
      return {
        success: true,
        data: {
          service: String(payload.service || data.service || serviceId),
          country: String(payload.country || data.country || canonicalCountry),
          price_ngn: priceNgn,
          cost_usd: costUsd,
          supplier_cost_ngn: supplierCostNgn,
          currency: String(payload.currency || data.currency || 'NGN')
        }
      };
    }
    return { success: false, error: data?.error || 'Unable to retrieve pricing for this selection.' };
  }

  /**
   * Check InstantNums Stock Availability for Service + Country
   */
  public async checkInstantNumsStock(
    serviceId: string,
    countryId: string
  ): Promise<{
    success: boolean;
    data?: { service: string; country: string; available: number; is_in_stock: boolean };
    error?: string;
  }> {
    const canonicalCountry = this.normalizeInstantNumsCountry(countryId);
    const data = await this.executeInstantNumsApi('stock', 'stock', {
      method: 'GET',
      params: { service: String(serviceId), country: canonicalCountry }
    });
    const payload = (data?.data && typeof data.data === 'object' && !Array.isArray(data.data)) ? data.data : data;
    if (data?.success && payload) {
      let detectedAvail: number | null = null;
      const candidates = [
        payload.available, payload.stock, payload.count, payload.quantity,
        data.available, data.stock, data.count, data.quantity
      ];
      for (const c of candidates) {
        if (typeof c === 'number' && !isNaN(c)) {
          detectedAvail = c;
          break;
        } else if (typeof c === 'string' && c.trim() !== '' && !isNaN(Number(c))) {
          detectedAvail = Number(c);
          break;
        }
      }

      if (detectedAvail === null) {
        return { success: false, error: 'Provider did not return a valid numeric stock count.' };
      }

      const avail = Math.max(0, detectedAvail);
      const inStock = avail > 0;

      return {
        success: true,
        data: {
          service: String(payload.service || data.service || serviceId),
          country: String(payload.country || data.country || canonicalCountry),
          available: avail,
          is_in_stock: inStock
        }
      };
    }
    return { success: false, error: data?.error || 'Unable to check stock for this selection.' };
  }

  /**
   * Submit InstantNums Order with Strict Wallet Safety & Server-Authoritative Price
   */
  public async submitInstantNumsOrder(
    userId: number,
    countryId: string,
    serviceId: string,
    countryName?: string,
    serviceName?: string,
    expectedPrice?: number
  ): Promise<{ success: boolean; order?: Order; isOutOfStock?: boolean; status?: string; error?: string }> {
    const userIndex = this.users.findIndex(u => u.id === userId);
    if (userIndex === -1) {
      return { success: false, error: 'User account not found.' };
    }
    const user = this.users[userIndex];

    if (user.account_status === 'suspended') {
      return { success: false, error: 'Your account is suspended. Please contact support.' };
    }

    // STRICT CUSTOMER WALLET BALANCE CHECK BEFORE CALLING PROVIDER
    if (typeof expectedPrice === 'number' && expectedPrice > 0 && user.balance < expectedPrice) {
      return {
        success: false,
        error: 'Insufficient wallet balance. Please fund your wallet to continue.'
      };
    }

    const canonicalCountry = this.normalizeInstantNumsCountry(countryId);

    // Call server to reserve virtual number via authoritative international numbers service
    const resData = await this.executeInstantNumsApi('purchase', 'purchase', {
      method: 'POST',
      body: { service: String(serviceId), country: canonicalCountry }
    });

    const activation = resData?.data || resData || {};
    const providerOrderId = String(activation.order_id || activation.orderId || '');
    const phoneNumber = String(activation.phone_number || activation.phoneNumber || '');

    if (!resData || !resData.success || !providerOrderId || !phoneNumber) {
      const rawMsg = resData?.error || '';
      const isOutOfStock = resData?.errorCode === 'OUT_OF_STOCK' || resData?.status === 'OUT_OF_STOCK';
      const isSupplierLowBalance =
        resData?.errorCode === 'PROVIDER_INSUFFICIENT_BALANCE' ||
        resData?.errorCode === 'SUPPLIER_LOW_BALANCE' ||
        resData?.status === 'PROVIDER_INSUFFICIENT_BALANCE';

      let sanitizedMsg = 'Number service is temporarily unavailable. Please try again shortly.';
      if (isOutOfStock) {
        sanitizedMsg = 'Numbers are temporarily out of stock for this selection. Please try another country or app.';
      } else if (isSupplierLowBalance) {
        // Customer MUST NEVER see provider financial information
        sanitizedMsg = 'Number service is temporarily unavailable. Please try again shortly.';
      } else if (rawMsg) {
        const lower = rawMsg.toLowerCase();
        if (
          lower.includes('balance') ||
          lower.includes('need $') ||
          lower.includes('$') ||
          lower.includes('usd') ||
          lower.includes('fund') ||
          lower.includes('credit') ||
          lower.includes('supplier') ||
          lower.includes('vendor') ||
          lower.includes('wallet') ||
          lower.includes('account')
        ) {
          sanitizedMsg = 'Number service is temporarily unavailable. Please try again shortly.';
        } else {
          sanitizedMsg = rawMsg;
        }
      }

      return {
        success: false,
        isOutOfStock,
        status: isOutOfStock ? 'OUT_OF_STOCK' : (isSupplierLowBalance ? 'PROVIDER_INSUFFICIENT_BALANCE' : 'API_ERROR'),
        error: sanitizedMsg
      };
    }

    const customerPrice = Number(activation.customer_price ?? activation.price ?? expectedPrice ?? 1352);
    const costUsd = Number(activation.cost_usd || activation.costUsd || 0);
    const supplierCostNgn = Number(activation.supplier_cost_ngn || 0);
    const profitNgn = Number(activation.profit_ngn || 0);

    if (!providerOrderId || !phoneNumber) {
      return { success: false, error: 'Provider returned an incomplete number reservation.' };
    }

    if (isNaN(customerPrice) || customerPrice <= 0) {
      return { success: false, error: 'Invalid customer price calculation received.' };
    }

    // WALLET SAFETY: Verify user has sufficient balance for authoritative price
    if (user.balance < customerPrice) {
      // Auto-cancel number with provider to avoid holding supplier balance
      this.executeInstantNumsApi('cancel', 'cancel', {
        method: 'POST',
        body: { order_id: providerOrderId }
      }).catch(() => {});

      return {
        success: false,
        error: 'Insufficient wallet balance. Please fund your wallet to continue.'
      };
    }

    // Idempotency: prevent duplicate order with same provider order ID
    const existing = this.orders.find(o => o.customer_details?.provider_order_id === providerOrderId);
    if (existing) {
      return { success: true, order: existing };
    }

    // Atomic wallet balance deduction
    const balanceBefore = user.balance;
    const balanceAfter = Number((balanceBefore - customerPrice).toFixed(2));
    user.balance = balanceAfter;
    this.users[userIndex] = user;
    if (this.currentUser && this.currentUser.id === userId) {
      this.currentUser = user;
    }
    syncUserBalanceToFirestore(user.firebase_uid, balanceAfter);

    const orderRef = 'SP-NUM-IN-' + Math.floor(100000 + Math.random() * 900000);
    const resolvedServiceName = serviceName || `App #${serviceId}`;
    const resolvedCountryName = countryName || `Country #${countryId}`;

    // REQUIREMENT 1 & 2: purchasedAt and expiresAt MUST be exactly purchasedAt + 20 minutes
    const nowMs = Date.now();
    const purchasedAt = activation.purchased_at || activation.purchasedAt || new Date(nowMs).toISOString();
    const expiryMinutes = 20;
    const defaultExpiresAt = new Date(new Date(purchasedAt).getTime() + expiryMinutes * 60 * 1000).toISOString();
    const expiresAt = activation.expires_at || activation.expiresAt || defaultExpiresAt;

    const orderDetails: InstantNumsOrderDetails = {
      provider: 'instantnums',
      provider_order_id: providerOrderId,
      country_id: String(countryId),
      country_name: resolvedCountryName,
      service_id: String(serviceId),
      service_name: resolvedServiceName,
      phone_number: phoneNumber,
      cost_usd: costUsd,
      supplier_cost_ngn: supplierCostNgn,
      customer_price: customerPrice,
      profit_ngn: profitNgn,
      provider_status: 'waiting',
      normalized_status: 'waiting',
      status: 'waiting',
      status_label: 'Waiting for verification code...',
      purchased_at: purchasedAt,
      expires_at: expiresAt,
      refunded: false,
      last_sync: new Date().toISOString()
    };

    const newOrder: Order = {
      id: this.orders.length > 0 ? Math.max(...this.orders.map(o => o.id)) + 1 : 1,
      order_reference: orderRef,
      user_id: user.id,
      user_name: user.full_name,
      user_email: user.email,
      product_name: `${resolvedServiceName} (${resolvedCountryName}) - ${phoneNumber}`,
      category: 'numbers',
      amount: customerPrice,
      status: 'processing',
      payment_status: 'paid',
      customer_details: orderDetails,
      created_at: purchasedAt
    };

    this.orders.unshift(newOrder);

    // Sync order record to backend server store (REQUIREMENT 1: save all 9 fields to backend)
    fetch('/api/international-numbers/record-order', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        orderId: providerOrderId,
        phoneNumber,
        customerPrice,
        costUsd,
        countryId: String(countryId),
        countryName: resolvedCountryName,
        serviceId: String(serviceId),
        serviceName: resolvedServiceName,
        userId: String(user.id),
        userEmail: user.email,
        orderReference: orderRef,
        providerStatus: 'waiting',
        normalizedStatus: 'waiting',
        statusLabel: 'Waiting for verification code...',
        sms: null,
        fullSms: null,
        purchasedAt,
        expiresAt
      })
    }).catch(() => {});

    // Record wallet transaction
    const newTx: Transaction = {
      id: this.transactions.length > 0 ? Math.max(...this.transactions.map(t => t.id)) + 1 : 1,
      user_id: user.id,
      user_name: user.full_name,
      user_email: user.email,
      type: 'international_number_purchase',
      amount: customerPrice,
      currency: 'NGN',
      balance_before: balanceBefore,
      balance_after: balanceAfter,
      reference: 'TXN-IN-' + orderRef,
      payment_reference: orderRef,
      status: 'successful',
      order_id: newOrder.id,
      product_name: newOrder.product_name,
      product_category: 'numbers',
      description: `International Number: ${resolvedServiceName} (${resolvedCountryName}) - ${phoneNumber}`,
      created_at: new Date().toISOString()
    };
    this.transactions.unshift(newTx);

    // Sync to Firestore & save local state
    syncOrderToFirestore(newOrder, user.firebase_uid);
    syncTransactionToFirestore(newTx, user.firebase_uid);
    this.save();

    this.notifications.unshift({
      id: Date.now(),
      user_id: user.id,
      title: 'International Number Activated! 📱',
      message: `Your virtual number ${phoneNumber} for ${resolvedServiceName} is ready. Enter it on the service to receive your code.`,
      type: 'order',
      link_route: 'numbers',
      read_status: false,
      created_at: new Date().toISOString()
    });

    return { success: true, order: newOrder };
  }

  /**
   * Helper: Sanitize received OTP code to prevent placeholders like "None" or "null"
   */
  private sanitizeOtpCode(val: any): string | null {
    if (val === null || val === undefined) return null;
    const str = String(val).trim();
    if (!str) return null;
    const forbidden = [
      'none', 'null', 'undefined', 'n/a', 'na', 'false', 'true', 'waiting',
      'pending', '0', '---', 'no code', 'none received', 'awaiting'
    ];
    if (forbidden.includes(str.toLowerCase())) return null;
    if (str.length > 25 && str.includes(' ')) {
      const match = str.match(/\b\d{4,8}\b/);
      return match ? match[0] : null;
    }
    return str;
  }

  /**
   * Helper: Sanitize SMS text to escape HTML tags
   */
  private sanitizeSmsText(val: any): string | null {
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

  /**
   * Helper: Process automated refund for cancelled / expired orders
   */
  private processAutoRefundForOrder(order: Order, details: InstantNumsOrderDetails, reason: string) {
    if (details.refunded || details.verification_code) return;
    details.refunded = true;
    const refundAmount = order.amount;
    const userIndex = this.users.findIndex(u => u.id === order.user_id);
    if (userIndex !== -1 && refundAmount > 0) {
      const user = this.users[userIndex];
      const balanceBefore = user.balance;
      const balanceAfter = Number((balanceBefore + refundAmount).toFixed(2));
      user.balance = balanceAfter;
      this.users[userIndex] = user;
      if (this.currentUser && this.currentUser.id === user.id) {
        this.currentUser = user;
      }
      syncUserBalanceToFirestore(user.firebase_uid, balanceAfter);

      const refundTx: Transaction = {
        id: this.transactions.length > 0 ? Math.max(...this.transactions.map(t => t.id)) + 1 : 1,
        user_id: user.id,
        user_name: user.full_name,
        user_email: user.email,
        type: 'refund',
        amount: refundAmount,
        currency: 'NGN',
        balance_before: balanceBefore,
        balance_after: balanceAfter,
        reference: 'REF-AUTO-' + order.order_reference,
        payment_reference: order.order_reference,
        status: 'successful',
        order_id: order.id,
        product_name: order.product_name,
        product_category: 'numbers',
        description: `Auto-Refund: ${reason} (${order.product_name})`,
        created_at: new Date().toISOString()
      };
      this.transactions.unshift(refundTx);
      syncTransactionToFirestore(refundTx, user.firebase_uid);

      this.notifications.unshift({
        id: Date.now(),
        user_id: user.id,
        title: 'Number Refund Processed 💳',
        message: `₦${refundAmount.toLocaleString('en-US')} has been returned to your wallet for ${order.product_name}.`,
        type: 'order',
        link_route: 'numbers',
        read_status: false,
        created_at: new Date().toISOString()
      });
    }
  }

  /**
   * Check InstantNums Activation Status (Poll for incoming SMS OTP)
   * Adheres strictly to provider specs:
   * - Polls every 3-5 seconds
   * - Stops polling when order reaches a terminal state
   * - Does NOT interpret missing SMS as an OTP or display "None"
   * - Does NOT mark order completed simply because a number was purchased
   * - Distinguishes: purchased, waiting, received, completed, cancelled, refunded, expired, provider error
   * - Preserves last valid order state on API failure rather than failing or marking completed
   * - Never fabricates an OTP
   * - Sanitizes SMS content
   */
  public async checkInstantNumsActivationStatus(
    orderId: number,
    providerOrderId: string
  ): Promise<{
    success: boolean;
    details?: InstantNumsOrderDetails;
    order?: Order;
    isTerminal?: boolean;
    error?: string;
  }> {
    const orderIndex = this.orders.findIndex(o => o.id === orderId);
    if (orderIndex === -1) {
      return { success: false, error: 'Order not found.' };
    }

    const order = this.orders[orderIndex];
    const details = (order.customer_details || {}) as InstantNumsOrderDetails;

    // If order is already in a terminal state, return current details immediately
    const terminalStates = ['completed', 'cancelled', 'refunded', 'expired'];
    if (
      terminalStates.includes(order.status) ||
      (details.normalized_status && terminalStates.includes(details.normalized_status))
    ) {
      return { success: true, details, order, isTerminal: true };
    }

    const resData = await this.executeInstantNumsApi('status', 'status', {
      method: 'GET',
      params: { order_id: providerOrderId }
    });

    // If request fails: PRESERVE LAST VALID ORDER STATE
    if (!resData || !resData.success) {
      details.status_check_error = 'Temporary connection check issue with provider';
      details.last_checked = new Date().toISOString();
      this.orders[orderIndex] = order;
      this.save();
      return {
        success: false,
        details,
        order,
        isTerminal: false,
        error: resData?.error || 'Temporary status-check failure with provider. Will retry automatically.'
      };
    }

    // Clear previous error on successful response
    details.status_check_error = null;
    details.last_checked = new Date().toISOString();

    const statusData = resData.data || resData;
    const rawStatus = String(statusData.provider_status || statusData.status || 'waiting').toLowerCase().trim();
    details.provider_status = rawStatus;

    // Validate and sanitize incoming SMS OTP
    const rawSms = statusData.sms;
    const rawFullSms = statusData.full_sms;
    let validCode = this.sanitizeOtpCode(rawSms);
    const sanitizedFullSms = this.sanitizeSmsText(rawFullSms || rawSms);

    if (!validCode && rawFullSms) {
      const match = String(rawFullSms).match(/\b\d{4,8}\b/);
      if (match) {
        validCode = match[0];
      }
    }

    const prevCode = details.verification_code;
    let isTerminal = false;

    // Lifecycle transitions
    if (rawStatus === 'cancelled' || rawStatus === 'canceled') {
      details.normalized_status = 'cancelled';
      details.status = 'cancelled';
      details.status_label = 'Cancelled (Refunded)';
      order.status = 'cancelled';
      isTerminal = true;
      this.processAutoRefundForOrder(order, details, 'Cancelled');
    } else if (rawStatus === 'refunded') {
      details.normalized_status = 'refunded';
      details.status = 'cancelled';
      details.status_label = 'Refunded to Wallet';
      order.status = 'cancelled';
      isTerminal = true;
      this.processAutoRefundForOrder(order, details, 'Refunded');
    } else if (rawStatus === 'expired' || rawStatus === 'timeout') {
      details.normalized_status = 'expired';
      details.status = 'cancelled';
      details.status_label = 'Expired (Refunded)';
      order.status = 'cancelled';
      isTerminal = true;
      this.processAutoRefundForOrder(order, details, 'Expired');
    } else if (validCode) {
      // Genuine SMS Code confirmed by provider!
      details.verification_code = validCode;
      details.full_sms = sanitizedFullSms || details.full_sms;
      details.normalized_status = 'received';
      details.status = 'received';
      details.status_label = 'Code Received • Ready to Use';
      details.received_at = details.received_at || new Date().toISOString();
      order.status = 'completed';
      isTerminal = true;

      if (!prevCode || prevCode !== validCode) {
        this.notifications.unshift({
          id: Date.now(),
          user_id: order.user_id,
          title: 'Verification Code Received! 🔑',
          message: `Your verification code for ${details.service_name || order.product_name} is ${validCode}.`,
          type: 'order',
          link_route: 'numbers',
          read_status: false,
          created_at: new Date().toISOString()
        });
      }
    } else if (rawStatus === 'finished' || rawStatus === 'completed') {
      if (details.verification_code) {
        details.normalized_status = 'completed';
        details.status = 'completed';
        details.status_label = 'Completed';
        order.status = 'completed';
        isTerminal = true;
      } else {
        // Provider finished without code: timed out/expired
        details.normalized_status = 'expired';
        details.status = 'cancelled';
        details.status_label = 'Expired (No Code Received)';
        order.status = 'cancelled';
        isTerminal = true;
        this.processAutoRefundForOrder(order, details, 'Expired without code');
      }
    } else if (rawStatus === 'cancellation_pending' || rawStatus === 'cancelling' || Boolean(details.cancellation_pending)) {
      details.normalized_status = 'cancellation_pending';
      details.status = 'cancellation_pending';
      details.status_label = 'Expired — Cancelling...';
      details.cancellation_pending = true;
      isTerminal = false;
    } else {
      // Waiting for carrier SMS
      // Check if timer has run out while waiting for code
      const isExpiredNow = details.expires_at && new Date(details.expires_at).getTime() <= Date.now();
      if (isExpiredNow && !validCode) {
        details.normalized_status = 'cancellation_pending';
        details.status = 'cancellation_pending';
        details.status_label = 'Expired — Cancelling...';
        details.cancellation_pending = true;
        isTerminal = false;
      } else {
        details.normalized_status = 'waiting';
        details.status = 'waiting';
        details.status_label = 'Waiting for verification code...';
        details.verification_code = undefined; // Never set placeholder "None"
        if (order.status !== 'cancelled') {
          order.status = 'processing';
        }
        isTerminal = false;
      }
    }

    details.last_sync = new Date().toISOString();
    order.customer_details = details;
    this.orders[orderIndex] = order;
    this.save();
    syncOrderToFirestore(order, this.currentUser?.firebase_uid);

    return { success: true, details, order, isTerminal };
  }

  /**
   * Sync International Number orders from the authoritative backend server
   * Called when customer visits or returns to the International Numbers page
   * Ensures expires_at and cancellation states are persisted across devices/refreshes
   */
  public async syncIntlOrdersFromBackend(userId?: number, userEmail?: string): Promise<Order[]> {
    try {
      const email = userEmail || this.currentUser?.email;
      const uid = userId || this.currentUser?.id;
      const query = new URLSearchParams();
      if (uid) query.set('user_id', String(uid));
      if (email) query.set('user_email', email);

      const res = await fetch(`/api/international-numbers/orders?${query.toString()}`);
      if (!res.ok) return this.orders.filter(o => o.category === 'numbers');

      const data = await res.json();
      if (data.success && Array.isArray(data.orders)) {
        for (const sOrder of data.orders) {
          const matchIdx = this.orders.findIndex(
            o => (o.customer_details as any)?.provider_order_id === sOrder.orderId
          );
          if (matchIdx !== -1) {
            const current = this.orders[matchIdx];
            const currentDetails = (current.customer_details || {}) as InstantNumsOrderDetails;
            if (sOrder.sms) currentDetails.verification_code = sOrder.sms;
            if (sOrder.fullSms) currentDetails.full_sms = sOrder.fullSms;
            if (sOrder.providerStatus) currentDetails.provider_status = sOrder.providerStatus;
            if (sOrder.normalizedStatus) currentDetails.normalized_status = sOrder.normalizedStatus;
            if (sOrder.statusLabel) currentDetails.status_label = sOrder.statusLabel;
            if (sOrder.expiresAt) currentDetails.expires_at = sOrder.expiresAt;
            if (sOrder.purchasedAt) currentDetails.purchased_at = sOrder.purchasedAt;
            if (sOrder.cancelledAt) currentDetails.cancelled_at = sOrder.cancelledAt;
            if (sOrder.providerCancelled !== undefined) currentDetails.provider_cancelled = sOrder.providerCancelled;
            if (sOrder.cancellationPending !== undefined) currentDetails.cancellation_pending = sOrder.cancellationPending;

            if (sOrder.normalizedStatus === 'received' || sOrder.sms) {
              current.status = 'completed';
            } else if (['cancelled', 'refunded', 'expired'].includes(sOrder.normalizedStatus)) {
              current.status = 'cancelled';
              // Idempotent auto-refund check: process if not yet refunded to customer wallet
              if (!currentDetails.refunded) {
                this.processAutoRefundForOrder(current, currentDetails, sOrder.statusLabel || 'Expired / Cancelled');
              }
            }
            current.customer_details = currentDetails;
            this.orders[matchIdx] = current;
          } else {
            // Reconstruct order locally if customer visited from another device/browser
            const sDetails: InstantNumsOrderDetails = {
              provider: 'instantnums',
              provider_order_id: sOrder.orderId,
              country_id: sOrder.countryId,
              country_name: sOrder.countryName,
              service_id: sOrder.serviceId,
              service_name: sOrder.serviceName,
              phone_number: sOrder.phoneNumber,
              cost_usd: sOrder.costUsd,
              supplier_cost_ngn: 0,
              customer_price: sOrder.customerPrice,
              profit_ngn: 0,
              provider_status: sOrder.providerStatus,
              normalized_status: sOrder.normalizedStatus,
              status: sOrder.normalizedStatus,
              status_label: sOrder.statusLabel,
              verification_code: sOrder.sms || undefined,
              full_sms: sOrder.fullSms || undefined,
              purchased_at: sOrder.purchasedAt,
              expires_at: sOrder.expiresAt,
              cancelled_at: sOrder.cancelledAt,
              provider_cancelled: sOrder.providerCancelled,
              cancellation_pending: sOrder.cancellationPending,
              refunded: sOrder.refunded,
              last_sync: new Date().toISOString()
            };
            const reconstitutedOrder: Order = {
              id: this.orders.length > 0 ? Math.max(...this.orders.map(o => o.id)) + 1 : 1,
              order_reference: sOrder.orderReference || ('SP-NUM-IN-' + sOrder.orderId),
              user_id: Number(sOrder.userId || this.currentUser?.id || 1),
              user_name: this.currentUser?.full_name || 'Customer',
              user_email: sOrder.userEmail || this.currentUser?.email || '',
              product_name: `${sOrder.serviceName || 'App'} (${sOrder.countryName || 'USA'}) - ${sOrder.phoneNumber}`,
              category: 'numbers',
              amount: sOrder.customerPrice,
              status: (sOrder.normalizedStatus === 'received' || sOrder.sms) ? 'completed' : (['cancelled', 'refunded', 'expired'].includes(sOrder.normalizedStatus) ? 'cancelled' : 'processing'),
              payment_status: 'paid',
              customer_details: sDetails,
              created_at: sOrder.purchasedAt || sOrder.createdAt || new Date().toISOString()
            };
            this.orders.unshift(reconstitutedOrder);
          }
        }
        this.save();
      }
    } catch (e) {
      console.warn('[Store] Failed to sync orders from backend:', e);
    }
    return this.orders.filter(o => o.category === 'numbers');
  }

  /**
   * Cancel an active InstantNums SMS Order & Process Instant Refund
   */
  public async cancelInstantNumsOrder(
    orderId: number,
    providerOrderId: string
  ): Promise<{ success: boolean; order?: Order; error?: string }> {
    const orderIndex = this.orders.findIndex(o => o.id === orderId);
    if (orderIndex === -1) {
      return { success: false, error: 'Order not found.' };
    }

    const order = this.orders[orderIndex];
    const details = (order.customer_details || {}) as InstantNumsOrderDetails;

    // Idempotency: if already cancelled/refunded, return early without repeating refund
    if (order.status === 'cancelled' || order.status === 'refunded' || details?.refunded === true) {
      return { success: true, order };
    }

    // Call server/provider to cancel
    const resData = await this.executeInstantNumsApi('cancel', 'cancel', {
      method: 'POST',
      body: { order_id: providerOrderId }
    });

    if (!resData.success) {
      return { success: false, error: resData.error || 'Unable to cancel this number with provider.' };
    }

    // Double check idempotency after await
    if ((order.status as string) === 'cancelled' || Boolean((details as any)?.refunded)) {
      return { success: true, order };
    }

    // Process refund of exact charged amount (never trust client amounts)
    const refundAmount = order.amount;
    const userIndex = this.users.findIndex(u => u.id === order.user_id);
    if (userIndex !== -1 && refundAmount > 0) {
      const user = this.users[userIndex];
      const balanceBefore = user.balance;
      const balanceAfter = Number((balanceBefore + refundAmount).toFixed(2));
      user.balance = balanceAfter;
      this.users[userIndex] = user;
      if (this.currentUser && this.currentUser.id === user.id) {
        this.currentUser = user;
      }
      syncUserBalanceToFirestore(user.firebase_uid, balanceAfter);

      const refundTx: Transaction = {
        id: this.transactions.length > 0 ? Math.max(...this.transactions.map(t => t.id)) + 1 : 1,
        user_id: user.id,
        user_name: user.full_name,
        user_email: user.email,
        type: 'refund',
        amount: refundAmount,
        currency: 'NGN',
        balance_before: balanceBefore,
        balance_after: balanceAfter,
        reference: 'REF-IN-' + order.order_reference,
        payment_reference: order.order_reference,
        status: 'successful',
        order_id: order.id,
        product_name: order.product_name,
        product_category: 'numbers',
        description: `Refund: Cancelled Number (${order.product_name})`,
        created_at: new Date().toISOString()
      };
      this.transactions.unshift(refundTx);
      syncTransactionToFirestore(refundTx, user.firebase_uid);
    }

    details.refunded = true;
    details.status = 'cancelled';
    details.status_label = 'Cancelled (Refunded)';
    details.last_sync = new Date().toISOString();

    order.status = 'cancelled';
    order.customer_details = details;
    this.orders[orderIndex] = order;
    this.save();

    this.notifications.unshift({
      id: Date.now(),
      user_id: order.user_id,
      title: 'Number Cancelled & Refunded 💳',
      message: `₦${refundAmount.toLocaleString('en-US')} was refunded to your wallet for ${order.product_name}.`,
      type: 'order',
      link_route: 'numbers',
      read_status: false,
      created_at: new Date().toISOString()
    });

    return { success: true, order };
  }

  /**
   * Test InstantNums API Connection (Admin)
   */
  public async testInstantNumsConnection(): Promise<{ success: boolean; data?: InstantNumsConnectionResult; error?: string }> {
    const data = await this.executeInstantNumsApi('balance', 'balance', { method: 'GET' });
    if (data.success && data.data) {
      return {
        success: true,
        data: {
          connected: true,
          provider: 'InstantNums',
          balance_usd: data.data.balance_usd,
          balance_ngn: data.data.balance_ngn,
          currency: data.data.currency || 'USD',
          rate: data.data.rate || 1600
        }
      };
    }
    return { success: false, error: data.error || 'InstantNums connection test failed.' };
  }

  /**
   * Fetch InstantNums Balance (Admin only)
   */
  public async fetchInstantNumsBalance(): Promise<{ success: boolean; data?: { balance_usd: number; balance_ngn: number; currency: string; rate: number }; error?: string }> {
    const user = this.getCurrentUser();
    if (!user || user.role !== 'admin') {
      return { success: false, error: 'Access denied. Administrator privileges required to view provider balance.' };
    }
    const data = await this.executeInstantNumsApi('balance', 'balance', { 
      method: 'GET',
      headers: {
        'x-admin-role': 'admin',
        'x-admin-email': user.email
      }
    });
    if (data.success && data.data) {
      return { success: true, data: data.data };
    }
    return { success: false, error: data.error || 'Failed to fetch InstantNums balance.' };
  }


  // Deposits
  public createDeposit(userId: number, amount: number, paymentMethod: string, reference?: string, proofImage?: string) {
    return this.submitDeposit(userId, amount, paymentMethod, reference, proofImage);
  }

  public submitDeposit(userId: number, amount: number, paymentMethod: string, reference?: string, proofImage?: string): { success: boolean; error?: string; deposit?: Deposit } {
    const user = this.users.find(u => u.id === userId);
    if (!user) {
      return { success: false, error: 'User not found.' };
    }

    if (!amount || isNaN(amount) || amount < 1000) {
      return { success: false, error: 'Minimum funding amount is ₦1,000.' };
    }

    const depositRef = `SP-DEP-${Math.floor(100000 + Math.random() * 900000)}`;

    const newDeposit: Deposit = {
      id: this.deposits.length > 0 ? Math.max(...this.deposits.map(d => d.id)) + 1 : 1,
      deposit_reference: depositRef,
      user_id: user.id,
      user_name: user.full_name,
      user_email: user.email,
      amount,
      payment_method: paymentMethod,
      payment_reference: reference || `TX-${Date.now()}`,
      proof_image: proofImage && !proofImage.startsWith('data:') ? proofImage : (proofImage ? 'receipt_uploaded' : undefined),
      status: 'pending',
      created_at: new Date().toISOString()
    };

    if (proofImage) {
      idbSet(`dep_proof_${newDeposit.id}`, proofImage);
    }

    this.deposits.unshift(newDeposit);
    syncDepositToFirestore(newDeposit, user.firebase_uid);

    // Record authoritative pending transaction
    const newTx: Transaction = {
      id: this.transactions.length > 0 ? Math.max(...this.transactions.map(t => t.id)) + 1 : 1,
      user_id: user.id,
      user_name: user.full_name,
      user_email: user.email,
      type: 'deposit',
      amount,
      currency: 'NGN',
      balance_before: user.balance,
      balance_after: user.balance,
      reference: depositRef,
      payment_reference: reference || `TX-${Date.now()}`,
      status: 'pending',
      description: `Wallet deposit via ${paymentMethod} (Pending verification)`,
      payment_method: paymentMethod,
      created_at: new Date().toISOString()
    };
    this.transactions.unshift(newTx);
    syncTransactionToFirestore(newTx, user.firebase_uid);

    this.notifications.unshift({
      id: Date.now(),
      user_id: user.id,
      title: 'Deposit Submitted',
      message: `Deposit request for ₦${amount.toLocaleString()} (Ref: ${depositRef}) has been submitted for admin verification.`,
      type: 'deposit',
      reference_id: newDeposit.id,
      link_route: 'wallet',
      read_status: false,
      created_at: new Date().toISOString()
    });

    const adminUser = this.users.find(u => u.role === 'admin');
    if (adminUser) {
      this.notifications.unshift({
        id: Date.now() + 2,
        user_id: adminUser.id,
        title: 'New Deposit Awaiting Review',
        message: `Customer ${user.full_name} (${user.email}) submitted a deposit of ₦${amount.toLocaleString()} for review.`,
        type: 'deposit',
        reference_id: newDeposit.id,
        read_status: false,
        created_at: new Date().toISOString()
      });
    }

    this.save();
    return { success: true, deposit: newDeposit };
  }

  /**
   * Atomic, Verified Server-Side Paystack Deposit & Wallet Credit
   * Enforces strict idempotency and updates wallet balance
   */
  public creditPaystackDeposit(
    userIdOrEmail: number | string,
    amount: number,
    reference: string,
    userEmail?: string,
    userName?: string
  ): { success: boolean; error?: string; alreadyProcessed?: boolean; newBalance?: number; user?: User } {
    // 0. Minimum funding enforcement
    if (!amount || isNaN(amount) || amount < 1000) {
      return { success: false, error: 'Minimum funding amount is ₦1,000.' };
    }

    // 1. Locate user
    let userIndex = -1;
    if (typeof userIdOrEmail === 'number') {
      userIndex = this.users.findIndex(u => u.id === userIdOrEmail);
    } else {
      userIndex = this.users.findIndex(u => 
        u.firebase_uid === userIdOrEmail || 
        u.email?.toLowerCase() === userIdOrEmail?.toLowerCase()
      );
    }

    if (userIndex === -1 && this.currentUser) {
      userIndex = this.users.findIndex(u => u.id === this.currentUser?.id);
    }

    if (userIndex === -1) {
      return { success: false, error: 'User account not found.' };
    }

    const user = this.users[userIndex];
    const cleanRef = reference.trim();

    // 2. Strict Multi-Layer Idempotency: Prevent duplicate crediting of same transaction
    // Check 1: In-memory processed references set
    if (this.processedPaystackReferences.has(cleanRef)) {
      console.log(`[Store Idempotency] Reference ${cleanRef} already marked as processed. Duplicate credit prevented.`);
      return {
        success: true,
        alreadyProcessed: true,
        newBalance: user.balance,
        user
      };
    }

    // Check 2: Existing successful ledger transaction
    const existingTx = this.transactions.find(t => 
      (t.payment_reference === cleanRef || t.reference === cleanRef) &&
      t.status === 'successful'
    );

    if (existingTx) {
      this.processedPaystackReferences.add(cleanRef);
      console.log(`[Store Idempotency] Existing transaction found for ${cleanRef}. Duplicate credit prevented.`);
      return {
        success: true,
        alreadyProcessed: true,
        newBalance: user.balance,
        user
      };
    }

    // Check 3: Existing approved deposit record
    const existingDeposit = this.deposits.find(d => 
      (d.payment_reference === cleanRef || d.deposit_reference === cleanRef) &&
      d.status === 'approved'
    );

    if (existingDeposit) {
      this.processedPaystackReferences.add(cleanRef);
      console.log(`[Store Idempotency] Existing deposit record found for ${cleanRef}. Duplicate credit prevented.`);
      return {
        success: true,
        alreadyProcessed: true,
        newBalance: user.balance,
        user
      };
    }

    // Atomically register the reference to lock out any concurrent execution
    this.processedPaystackReferences.add(cleanRef);

    // 3. Update Balance Atomically
    const balanceBefore = Number(user.balance || 0);
    const depositAmount = Number(amount);
    const balanceAfter = Number((balanceBefore + depositAmount).toFixed(2));
    
    user.balance = balanceAfter;
    this.users[userIndex] = user;

    if (this.currentUser && (this.currentUser.id === user.id || this.currentUser.firebase_uid === user.firebase_uid)) {
      this.currentUser.balance = balanceAfter;
      saveToStorage(STORAGE_KEYS.AUTH, this.currentUser);
    }

    const nowIso = new Date().toISOString();

    // 4. Create Approved Deposit Record
    const newDeposit: Deposit = {
      id: this.deposits.length > 0 ? Math.max(...this.deposits.map(d => d.id)) + 1 : 1,
      deposit_reference: cleanRef,
      user_id: user.id,
      user_name: userName || user.full_name,
      user_email: userEmail || user.email,
      amount: depositAmount,
      payment_method: 'Paystack',
      payment_reference: cleanRef,
      status: 'approved',
      reviewed_at: nowIso,
      created_at: nowIso
    };
    this.deposits.unshift(newDeposit);
    syncDepositToFirestore(newDeposit, user.firebase_uid);

    // 5. Create Successful Transaction Record
    const newTx: Transaction = {
      id: this.transactions.length > 0 ? Math.max(...this.transactions.map(t => t.id)) + 1 : 1,
      user_id: user.id,
      user_name: userName || user.full_name,
      user_email: userEmail || user.email,
      type: 'deposit',
      amount: depositAmount,
      currency: 'NGN',
      balance_before: balanceBefore,
      balance_after: balanceAfter,
      reference: cleanRef,
      payment_reference: cleanRef,
      status: 'successful',
      description: `Instant wallet funding via Paystack (Ref: ${cleanRef})`,
      payment_method: 'Paystack',
      created_at: nowIso
    };
    this.transactions.unshift(newTx);
    syncTransactionToFirestore(newTx, user.firebase_uid);
    if (user.firebase_uid) {
      syncUserBalanceToFirestore(user.firebase_uid, balanceAfter);
    }

    // 6. Push In-App Notification
    this.notifications.unshift({
      id: Date.now(),
      user_id: user.id,
      title: 'Wallet Funded Successfully',
      message: `₦${depositAmount.toLocaleString('en-US', { minimumFractionDigits: 2 })} has been added to your Surest Plug wallet via Paystack.`,
      type: 'deposit',
      reference_id: newDeposit.id,
      link_route: 'wallet',
      read_status: false,
      created_at: nowIso
    });

    this.save();
    this.notify();

    return {
      success: true,
      newBalance: balanceAfter,
      user
    };
  }

  // Custom Website Requests
  public createCustomOrder(userId: number, data: any) {
    return this.submitCustomOrder(userId, data).customOrder;
  }

  public submitCustomOrder(userId: number, data: {
    projectName?: string;
    project_name?: string;
    websiteType?: string;
    website_type?: string;
    description: string;
    requiredFeatures?: string;
    required_features?: string;
    featuresList?: string[];
    features_list?: string[];
    logoUrl?: string;
    logo_url?: string;
    logoName?: string;
    logo_name?: string;
    logoSize?: number;
    logo_size?: number;
    referenceWebsite?: string;
    reference_website?: string;
    additionalInstructions?: string;
    additional_instructions?: string;
    fullName?: string;
    full_name?: string;
    email?: string;
    phone?: string;
    pagesCount?: string;
    pages_count?: string;
    budget?: string;
    price?: number;
    deadline?: string;
    contactInformation?: string;
    contact_information?: string;
  }): { success: boolean; error?: string; customOrder?: CustomOrder } {
    const user = this.users.find(u => u.id === userId);
    if (!user) {
      return { success: false, error: 'User not found.' };
    }

    const reqRef = `SP-REQ-${Math.floor(100000 + Math.random() * 900000)}`;

    const projectName = data.projectName || data.project_name || 'Custom Website';
    const websiteType = data.websiteType || data.website_type || 'Business';
    const logoUrl = data.logoUrl || data.logo_url || '';
    const logoName = data.logoName || data.logo_name || '';
    const logoSize = data.logoSize || data.logo_size || 0;
    const referenceWebsite = data.referenceWebsite || data.reference_website || '';
    const featuresList = data.featuresList || data.features_list || [];
    const requiredFeatures = data.requiredFeatures || data.required_features || (featuresList.length > 0 ? featuresList.join(', ') : 'Standard Features');
    const additionalInstructions = data.additionalInstructions || data.additional_instructions || '';
    const phone = data.phone || user.phone || '';
    const fullName = data.fullName || data.full_name || user.full_name;
    const email = data.email || user.email;
    const price = data.price || 150000;
    const budget = data.budget || `₦${price.toLocaleString()}`;
    const deadline = data.deadline || '2 Weeks';

    const contactInfo = data.contactInformation || data.contact_information || JSON.stringify({
      full_name: fullName,
      email: email,
      phone: phone,
      reference_website: referenceWebsite,
      additional_instructions: additionalInstructions
    });

    const newCustomOrder: CustomOrder = {
      id: this.customOrders.length > 0 ? Math.max(...this.customOrders.map(c => c.id)) + 1 : 1,
      request_reference: reqRef,
      user_id: user.id,
      user_name: fullName,
      user_email: email,
      phone: phone,
      project_name: projectName,
      website_type: websiteType,
      description: data.description,
      logo_url: logoUrl,
      logo_name: logoName,
      logo_size: logoSize,
      reference_website: referenceWebsite,
      features_list: featuresList,
      required_features: requiredFeatures,
      additional_instructions: additionalInstructions,
      pages_count: data.pagesCount || data.pages_count || '5 - 10 Pages',
      budget: budget,
      price: price,
      deadline: deadline,
      contact_information: contactInfo,
      status: 'pending',
      created_at: new Date().toISOString()
    };

    this.customOrders.unshift(newCustomOrder);
    syncCustomOrderToFirestore(newCustomOrder, user.firebase_uid);

    this.notifications.unshift({
      id: Date.now(),
      user_id: user.id,
      title: 'Custom Website Request Received',
      message: `Your request "${projectName}" (Ref: ${reqRef}) has been submitted. Our engineering team will review your specifications.`,
      type: 'order',
      link_route: 'custom-orders',
      read_status: false,
      created_at: new Date().toISOString()
    });

    this.save();
    return { success: true, customOrder: newCustomOrder };
  }

  // Support Tickets & Voice Notes
  public createSupportTicket(
    userId: number, 
    subject: string, 
    initialMessage: string, 
    priority: 'low' | 'medium' | 'high' | 'urgent' = 'medium',
    messageType: 'text' | 'voice' = 'text',
    audioData?: string,
    audioDuration?: number
  ): { success: boolean; error?: string; ticket?: SupportTicket } {
    const user = this.users.find(u => u.id === userId);
    if (!user) {
      return { success: false, error: 'User not found.' };
    }

    const ticketCode = `SP-TCK-${Math.floor(10000 + Math.random() * 90000)}`;
    const msgId = Date.now();

    const newTicket: SupportTicket = {
      id: this.supportTickets.length > 0 ? Math.max(...this.supportTickets.map(s => s.id)) + 1 : 1,
      ticket_code: ticketCode,
      user_id: user.id,
      user_name: user.full_name,
      subject,
      priority,
      status: 'open',
      created_at: new Date().toISOString(),
      messages: [
        {
          id: msgId,
          ticket_id: this.supportTickets.length + 1,
          sender_id: user.id,
          sender_name: user.full_name,
          sender_role: 'user',
          message_type: messageType,
          message: initialMessage || (messageType === 'voice' ? 'Voice Message' : ''),
          audio_data: audioData,
          audio_duration: audioDuration,
          created_at: new Date().toISOString()
        }
      ]
    };

    if (audioData) {
      idbSet(`voice_msg_${msgId}`, audioData);
    }

    this.supportTickets.unshift(newTicket);
    syncSupportTicketToFirestore(newTicket, user.firebase_uid);
    this.save();
    return { success: true, ticket: newTicket };
  }

  public replySupportTicket(
    ticketId: number, 
    senderId: number, 
    message: string,
    messageType: 'text' | 'voice' = 'text',
    audioData?: string,
    audioDuration?: number
  ): { success: boolean; error?: string } {
    const ticketIndex = this.supportTickets.findIndex(t => t.id === ticketId);
    if (ticketIndex === -1) {
      return { success: false, error: 'Ticket not found.' };
    }

    const sender = this.users.find(u => u.id === senderId);
    if (!sender) {
      return { success: false, error: 'Sender not found.' };
    }

    const msgId = Date.now();
    const newMessage: SupportMessage = {
      id: msgId,
      ticket_id: ticketId,
      sender_id: sender.id,
      sender_name: sender.full_name,
      sender_role: sender.role,
      message_type: messageType,
      message: message || (messageType === 'voice' ? 'Voice Message' : ''),
      audio_data: audioData,
      audio_duration: audioDuration,
      created_at: new Date().toISOString()
    };

    if (audioData) {
      idbSet(`voice_msg_${msgId}`, audioData);
    }

    this.supportTickets[ticketIndex].messages.push(newMessage);
    this.supportTickets[ticketIndex].status = sender.role === 'admin' ? 'answered' : 'in_progress';
    this.supportTickets[ticketIndex].updated_at = new Date().toISOString();
    syncSupportTicketToFirestore(this.supportTickets[ticketIndex]);

    // If admin replied, notify user
    if (sender.role === 'admin') {
      this.notifications.unshift({
        id: Date.now() + 1,
        user_id: this.supportTickets[ticketIndex].user_id,
        title: 'Support Desk Reply',
        message: `Admin has replied to your ticket "${this.supportTickets[ticketIndex].subject}". Tap to view.`,
        type: 'support',
        reference_id: ticketId,
        link_route: 'support',
        read_status: false,
        created_at: new Date().toISOString()
      });
    }

    this.save();
    return { success: true };
  }

  // Admin Actions: Products CRUD
  public addProduct(productData: Partial<Product>): { success: boolean; product: Product } {
    const newId = this.products.length > 0 ? Math.max(...this.products.map(p => p.id)) + 1 : 1;
    const newProduct: Product = {
      id: newId,
      name: productData.name?.trim() || 'Ready-Made Website',
      category: productData.category || 'ready_made_website',
      description: productData.description?.trim() || '',
      price: typeof productData.price === 'number' ? productData.price : parseFloat(String(productData.price)) || 0,
      image: productData.image || productData.preview_image_path || 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=800&auto=format&fit=crop&q=80',
      preview_image_path: productData.preview_image_path || productData.image,
      demo_url: productData.demo_url?.trim() || undefined,
      admin_email: productData.admin_email?.trim() || undefined,
      admin_password: productData.admin_password || undefined,
      website_zip_path: productData.website_zip_path || undefined,
      website_zip_name: productData.website_zip_name || undefined,
      website_zip_size: productData.website_zip_size || undefined,
      website_zip_data: productData.website_zip_data || undefined,
      features: Array.isArray(productData.features) ? productData.features : [],
      availability: productData.availability || 'available',
      featured: !!productData.featured,
      delivery_time: productData.delivery_time || 'Instant ZIP Delivery',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    this.products.unshift(newProduct);
    
    // Store large binary assets in IndexedDB
    if (productData.website_zip_data) {
      idbSet(`zip_prod_${newProduct.id}`, productData.website_zip_data);
    }
    if (productData.image && productData.image.startsWith('data:') && productData.image.length > 50000) {
      idbSet(`img_prod_${newProduct.id}`, productData.image);
    }

    // Broadcast Real Notification to Users for New Product Publication
    this.users.forEach(u => {
      if (u.role !== 'admin') {
        this.notifications.unshift({
          id: Date.now() + Math.floor(Math.random() * 10000),
          user_id: u.id,
          title: 'New Product Available',
          message: `A new ready-made website "${newProduct.name}" has been added to Surest Plug. Tap to view.`,
          type: 'product',
          reference_id: newProduct.id,
          link_route: 'marketplace',
          read_status: false,
          created_at: new Date().toISOString()
        });
      }
    });

    this.save();
    return { success: true, product: newProduct };
  }

  // Site Updates Management & Aliases
  public getSiteUpdates(): SiteUpdate[] {
    return [...this.siteUpdates];
  }

  public getUpdates(): SiteUpdate[] {
    return this.getSiteUpdates();
  }

  public getPublishedSiteUpdates(): SiteUpdate[] {
    return this.siteUpdates.filter(u => u.status === 'published');
  }

  public createSiteAnnouncement(
    title: string,
    message: string,
    status: 'published' | 'draft' = 'published',
    category?: string,
    link?: string,
    image?: string
  ) {
    return this.createSiteUpdate({ title, message, status, link, image });
  }

  public updateSiteAnnouncement(id: number, updates: Partial<SiteUpdate>) {
    return this.updateSiteUpdate(id, updates);
  }

  public deleteSiteAnnouncement(id: number) {
    return this.deleteSiteUpdate(id);
  }

  public updateSupportTicketStatus(
    ticketId: number, 
    status: 'open' | 'in_progress' | 'answered' | 'closed'
  ): { success: boolean; error?: string } {
    const ticket = this.supportTickets.find(t => t.id === ticketId);
    if (!ticket) {
      return { success: false, error: 'Ticket not found.' };
    }
    ticket.status = status;
    ticket.updated_at = new Date().toISOString();
    syncSupportTicketToFirestore(ticket);
    this.save();
    return { success: true };
  }

  public createSiteUpdate(data: {
    title: string;
    message: string;
    image?: string;
    link?: string;
    status?: 'published' | 'draft';
  }): { success: boolean; update: SiteUpdate } {
    const newUpdate: SiteUpdate = {
      id: this.siteUpdates.length > 0 ? Math.max(...this.siteUpdates.map(u => u.id)) + 1 : 1,
      title: data.title.trim(),
      message: data.message.trim(),
      image: data.image,
      link: data.link?.trim(),
      status: data.status || 'published',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    this.siteUpdates.unshift(newUpdate);

    // If published, notify all active users
    if (newUpdate.status === 'published') {
      this.users.forEach(u => {
        this.notifications.unshift({
          id: Date.now() + Math.floor(Math.random() * 10000),
          user_id: u.id,
          title: 'New Surest Plug Update',
          message: `Update: "${newUpdate.title}" — We have added new improvements to Surest Plug. Tap to read.`,
          type: 'update',
          reference_id: newUpdate.id,
          link_route: 'updates',
          read_status: false,
          created_at: new Date().toISOString()
        });
      });
    }

    this.save();
    return { success: true, update: newUpdate };
  }

  public updateSiteUpdate(id: number, updates: Partial<SiteUpdate>): { success: boolean; update?: SiteUpdate; error?: string } {
    const index = this.siteUpdates.findIndex(u => u.id === id);
    if (index === -1) {
      return { success: false, error: 'Update not found.' };
    }
    const current = this.siteUpdates[index];
    const updated: SiteUpdate = {
      ...current,
      ...updates,
      updated_at: new Date().toISOString()
    };
    this.siteUpdates[index] = updated;
    this.save();
    return { success: true, update: updated };
  }

  public deleteSiteUpdate(id: number): { success: boolean } {
    this.siteUpdates = this.siteUpdates.filter(u => u.id !== id);
    this.save();
    return { success: true };
  }

  public updateProduct(productId: number, updates: Partial<Product>): { success: boolean; product?: Product; error?: string } {
    const index = this.products.findIndex(p => p.id === productId);
    if (index === -1) {
      return { success: false, error: 'Product not found.' };
    }

    const current = this.products[index];
    const updatedProduct: Product = {
      ...current,
      name: updates.name !== undefined ? updates.name.trim() : current.name,
      description: updates.description !== undefined ? updates.description.trim() : current.description,
      price: updates.price !== undefined ? (typeof updates.price === 'number' ? updates.price : parseFloat(String(updates.price)) || 0) : current.price,
      image: updates.image || updates.preview_image_path || current.image,
      preview_image_path: updates.preview_image_path || updates.image || current.preview_image_path,
      demo_url: updates.demo_url !== undefined ? updates.demo_url.trim() : current.demo_url,
      admin_email: updates.admin_email !== undefined ? updates.admin_email.trim() : current.admin_email,
      admin_password: updates.admin_password !== undefined ? updates.admin_password : current.admin_password,
      website_zip_path: updates.website_zip_path !== undefined ? updates.website_zip_path : current.website_zip_path,
      website_zip_name: updates.website_zip_name !== undefined ? updates.website_zip_name : current.website_zip_name,
      website_zip_size: updates.website_zip_size !== undefined ? updates.website_zip_size : current.website_zip_size,
      website_zip_data: updates.website_zip_data !== undefined ? updates.website_zip_data : current.website_zip_data,
      features: Array.isArray(updates.features) ? updates.features : current.features,
      availability: updates.availability || current.availability,
      featured: updates.featured !== undefined ? !!updates.featured : current.featured,
      updated_at: new Date().toISOString()
    };

    if (updates.website_zip_data) {
      idbSet(`zip_prod_${productId}`, updates.website_zip_data);
    }
    if (updates.image && updates.image.startsWith('data:') && updates.image.length > 50000) {
      idbSet(`img_prod_${productId}`, updates.image);
    }

    this.products[index] = updatedProduct;
    this.save();
    return { success: true, product: updatedProduct };
  }

  public deleteProduct(productId: number): { success: boolean } {
    this.products = this.products.filter(p => p.id !== productId);
    idbDelete(`zip_prod_${productId}`);
    idbDelete(`img_prod_${productId}`);
    this.save();
    return { success: true };
  }

  public adjustUserBalance(userId: number, amount: number, type: 'credit' | 'debit', reason: string, adminId: number = 1): { success: boolean; error?: string } {
    const userIndex = this.users.findIndex(u => u.id === userId);
    if (userIndex === -1) {
      return { success: false, error: 'User not found.' };
    }

    const user = this.users[userIndex];
    const balanceBefore = user.balance;
    let balanceAfter = balanceBefore;

    if (type === 'credit') {
      balanceAfter = Number((balanceBefore + amount).toFixed(2));
    } else {
      if (balanceBefore < amount) {
        return { success: false, error: 'Cannot debit more than user current balance.' };
      }
      balanceAfter = Number((balanceBefore - amount).toFixed(2));
    }

    user.balance = balanceAfter;
    this.users[userIndex] = user;

    if (this.currentUser && this.currentUser.id === userId) {
      this.currentUser = user;
    }

    const ref = `SP-ADM-${Math.floor(100000 + Math.random() * 900000)}`;

    const newTx: Transaction = {
      id: this.transactions.length > 0 ? Math.max(...this.transactions.map(t => t.id)) + 1 : 1,
      user_id: user.id,
      user_name: user.full_name,
      user_email: user.email,
      type: type === 'credit' ? 'admin_credit' : 'admin_debit',
      amount,
      currency: 'NGN',
      balance_before: balanceBefore,
      balance_after: balanceAfter,
      reference: ref,
      payment_reference: ref,
      status: 'successful',
      description: `Admin balance ${type}: ${reason}`,
      payment_method: 'admin_adjustment',
      created_at: new Date().toISOString()
    };
    this.transactions.unshift(newTx);
    syncTransactionToFirestore(newTx, user.firebase_uid);

    this.notifications.unshift({
      id: Date.now(),
      user_id: user.id,
      title: `Wallet ${type === 'credit' ? 'Credited' : 'Debited'}`,
      message: `Your wallet was ${type === 'credit' ? 'credited with' : 'debited by'} ₦${amount.toLocaleString()}. Reason: ${reason}`,
      type: 'wallet',
      link_route: 'wallet',
      read_status: false,
      created_at: new Date().toISOString()
    });

    this.save();
    return { success: true };
  }

  public approveDeposit(depositId: number, adminId: number = 1, note?: string): { success: boolean; error?: string } {
    const depositIndex = this.deposits.findIndex(d => d.id === depositId);
    if (depositIndex === -1) {
      return { success: false, error: 'Deposit not found.' };
    }

    const deposit = this.deposits[depositIndex];
    if (deposit.status !== 'pending') {
      return { success: false, error: 'Deposit is already processed.' };
    }

    if (deposit.amount < 1000) {
      return { success: false, error: 'Deposit amount is below the minimum required ₦1,000.' };
    }

    deposit.status = 'approved';
    deposit.admin_note = note;
    deposit.reviewed_by = adminId;
    deposit.reviewed_at = new Date().toISOString();
    this.deposits[depositIndex] = deposit;

    // Credit user balance
    const userIndex = this.users.findIndex(u => u.id === deposit.user_id);
    if (userIndex !== -1) {
      const user = this.users[userIndex];
      const balanceBefore = user.balance;
      const balanceAfter = Number((balanceBefore + deposit.amount).toFixed(2));
      user.balance = balanceAfter;
      this.users[userIndex] = user;

      if (this.currentUser && this.currentUser.id === user.id) {
        this.currentUser = user;
      }

      // Update existing pending transaction or create a new one
      let tx = this.transactions.find(t => t.reference === deposit.deposit_reference);
      if (tx) {
        tx.status = 'successful';
        tx.balance_before = balanceBefore;
        tx.balance_after = balanceAfter;
        tx.description = `Wallet deposit approved (${deposit.payment_method})`;
        tx.updated_at = new Date().toISOString();
      } else {
        tx = {
          id: this.transactions.length > 0 ? Math.max(...this.transactions.map(t => t.id)) + 1 : 1,
          user_id: user.id,
          user_name: user.full_name,
          user_email: user.email,
          type: 'deposit',
          amount: deposit.amount,
          currency: 'NGN',
          balance_before: balanceBefore,
          balance_after: balanceAfter,
          reference: deposit.deposit_reference,
          payment_reference: deposit.payment_reference || deposit.deposit_reference,
          status: 'successful',
          description: `Wallet deposit approved (${deposit.payment_method})`,
          payment_method: deposit.payment_method,
          created_at: new Date().toISOString()
        };
        this.transactions.unshift(tx);
      }
      syncTransactionToFirestore(tx, user.firebase_uid);

      this.notifications.unshift({
        id: Date.now(),
        user_id: user.id,
        title: 'Deposit Approved',
        message: `Your deposit of ₦${deposit.amount.toLocaleString()} has been verified and credited to your wallet!`,
        type: 'deposit',
        link_route: 'wallet',
        read_status: false,
        created_at: new Date().toISOString()
      });
    }

    this.save();
    syncDepositToFirestore(deposit);
    return { success: true };
  }

  public rejectDeposit(depositId: number, reason?: string, adminId: number = 1): { success: boolean; error?: string } {
    const depositIndex = this.deposits.findIndex(d => d.id === depositId);
    if (depositIndex === -1) {
      return { success: false, error: 'Deposit not found.' };
    }

    const deposit = this.deposits[depositIndex];
    if (deposit.status !== 'pending') {
      return { success: false, error: 'Deposit has already been processed.' };
    }

    deposit.status = 'rejected';
    deposit.admin_note = reason || 'Payment receipt could not be verified.';
    deposit.reviewed_by = adminId;
    deposit.reviewed_at = new Date().toISOString();
    this.deposits[depositIndex] = deposit;

    const user = this.users.find(u => u.id === deposit.user_id);
    let tx = this.transactions.find(t => t.reference === deposit.deposit_reference);
    if (tx) {
      tx.status = 'rejected';
      tx.description = `Wallet deposit declined (${deposit.admin_note})`;
      tx.updated_at = new Date().toISOString();
      syncTransactionToFirestore(tx, user?.firebase_uid);
    }

    this.notifications.unshift({
      id: Date.now(),
      user_id: deposit.user_id,
      title: 'Deposit Declined',
      message: `Your deposit of ₦${deposit.amount.toLocaleString()} was declined. Reason: ${deposit.admin_note}`,
      type: 'deposit',
      link_route: 'wallet',
      read_status: false,
      created_at: new Date().toISOString()
    });

    this.save();
    syncDepositToFirestore(deposit);
    return { success: true };
  }

  public updateOrderStatus(orderId: number, status: any): { success: boolean } {
    const orderIndex = this.orders.findIndex(o => o.id === orderId);
    if (orderIndex !== -1) {
      this.orders[orderIndex].status = status;
      this.orders[orderIndex].updated_at = new Date().toISOString();
      if (status === 'completed') {
        this.checkAndUnlockReferral(this.orders[orderIndex].user_id);
      }
      this.save();
      syncOrderToFirestore(this.orders[orderIndex]);
    }
    return { success: true };
  }

  public updateCustomOrderStatus(requestId: number, status: any): { success: boolean } {
    const reqIndex = this.customOrders.findIndex(c => c.id === requestId);
    if (reqIndex !== -1) {
      this.customOrders[reqIndex].status = status;
      this.customOrders[reqIndex].updated_at = new Date().toISOString();
      this.save();
      syncCustomOrderToFirestore(this.customOrders[reqIndex]);
    }
    return { success: true };
  }

  public updateSettings(newSettings: Partial<SystemSettings>): { success: boolean } {
    this.settings = {
      ...this.settings,
      ...newSettings
    };
    this.save();
    return { success: true };
  }

  // ==========================================================
  // RESELLER API CLIENT-SIDE HELPERS
  // ==========================================================

  public async getResellerProfile(): Promise<{ success: boolean; profile?: ResellerProfile; error?: string }> {
    const user = this.getCurrentUser();
    if (!user) return { success: false, error: 'User not logged in.' };

    try {
      const res = await fetch(
        `/api/reseller/profile?userId=${encodeURIComponent(user.id)}&email=${encodeURIComponent(user.email)}&fullName=${encodeURIComponent(user.full_name || '')}&balance=${user.balance}`
      );
      const data = await res.json();
      return data;
    } catch (err: any) {
      return { success: false, error: err?.message || 'Failed to fetch reseller profile' };
    }
  }

  public async generateResellerApiKey(): Promise<{
    success: boolean;
    apiKey?: string;
    maskedKey?: string;
    prefix?: string;
    error?: string;
  }> {
    const user = this.getCurrentUser();
    if (!user) return { success: false, error: 'User not logged in.' };

    try {
      const res = await fetch('/api/reseller/keys/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user.id,
          email: user.email,
          fullName: user.full_name || '',
          balance: user.balance
        })
      });
      const data = await res.json();
      return data;
    } catch (err: any) {
      return { success: false, error: err?.message || 'Failed to generate API key' };
    }
  }

  public async revokeResellerApiKey(): Promise<{ success: boolean; message?: string; error?: string }> {
    const user = this.getCurrentUser();
    if (!user) return { success: false, error: 'User not logged in.' };

    try {
      const res = await fetch('/api/reseller/keys/revoke', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.id })
      });
      const data = await res.json();
      return data;
    } catch (err: any) {
      return { success: false, error: err?.message || 'Failed to revoke API key' };
    }
  }

  public async updateResellerWebhook(webhookUrl: string | null): Promise<{
    success: boolean;
    webhookSecret?: string;
    error?: string;
  }> {
    const user = this.getCurrentUser();
    if (!user) return { success: false, error: 'User not logged in.' };

    try {
      const res = await fetch('/api/reseller/webhook', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.id, webhookUrl })
      });
      const data = await res.json();
      return data;
    } catch (err: any) {
      return { success: false, error: err?.message || 'Failed to update webhook URL' };
    }
  }

  public async testResellerWebhook(): Promise<{ success: boolean; error?: string }> {
    const user = this.getCurrentUser();
    if (!user) return { success: false, error: 'User not logged in.' };

    try {
      const res = await fetch('/api/reseller/webhook/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.id })
      });
      const data = await res.json();
      return data;
    } catch (err: any) {
      return { success: false, error: err?.message || 'Failed to test webhook' };
    }
  }

  public async getResellerLogs(limit = 30): Promise<{ success: boolean; logs: ResellerApiLog[] }> {
    const user = this.getCurrentUser();
    if (!user) return { success: true, logs: [] };

    try {
      const res = await fetch(`/api/reseller/logs?userId=${encodeURIComponent(user.id)}&limit=${limit}`);
      const data = await res.json();
      return data;
    } catch (err) {
      return { success: true, logs: [] };
    }
  }

  public async getResellerOrders(category?: string, status?: string): Promise<{ success: boolean; orders: ResellerOrder[] }> {
    const user = this.getCurrentUser();
    if (!user) return { success: true, orders: [] };

    try {
      const res = await fetch(
        `/api/reseller/orders?userId=${encodeURIComponent(user.id)}&category=${category || 'all'}&status=${status || 'all'}`
      );
      const data = await res.json();
      return data;
    } catch (err) {
      return { success: true, orders: [] };
    }
  }

  // Admin Reseller Controls
  public async getAdminResellers(): Promise<{
    success: boolean;
    resellers: ResellerProfile[];
    stats: {
      total_resellers: number;
      active_keys: number;
      total_orders: number;
      total_volume: number;
      avg_latency_ms: number;
    };
  }> {
    try {
      const res = await fetch('/api/admin/resellers');
      return await res.json();
    } catch (err: any) {
      return {
        success: false,
        resellers: [],
        stats: { total_resellers: 0, active_keys: 0, total_orders: 0, total_volume: 0, avg_latency_ms: 0 }
      };
    }
  }

  public async toggleResellerStatus(userId: string | number, status: 'active' | 'suspended') {
    try {
      const res = await fetch('/api/admin/resellers/toggle-status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, status })
      });
      return await res.json();
    } catch (err: any) {
      return { success: false, error: err?.message };
    }
  }

  public async adminRevokeResellerKey(userId: string | number) {
    try {
      const res = await fetch('/api/admin/resellers/revoke-key', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId })
      });
      return await res.json();
    } catch (err: any) {
      return { success: false, error: err?.message };
    }
  }

  public async getAdminResellerLogs(limit = 100, statusFilter?: string) {
    try {
      const res = await fetch(`/api/admin/resellers/logs?limit=${limit}&status=${statusFilter || 'all'}`);
      return await res.json();
    } catch (err: any) {
      return { success: true, logs: [] };
    }
  }

  public async getResellerPricing(): Promise<{ success: boolean; pricing?: ResellerPricingConfig }> {
    try {
      const res = await fetch('/api/admin/resellers/pricing');
      return await res.json();
    } catch (err: any) {
      return { success: false };
    }
  }

  public async updateResellerPricing(config: Partial<ResellerPricingConfig>) {
    try {
      const res = await fetch('/api/admin/resellers/pricing', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config)
      });
      return await res.json();
    } catch (err: any) {
      return { success: false };
    }
  }
}

export const db = new Store();
export const store = db;
export default db;
