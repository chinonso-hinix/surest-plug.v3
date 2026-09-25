/**
 * Surest Plug - Social Media Logs & Accounts Marketplace
 * Powered securely by the Cartlogs API connector
 * 
 * Features:
 * - Dynamic category navigation
 * - Real live account inventory
 * - Surest Plug pricing applied
 * - Instant delivery of credentials upon purchase
 * - Safety guidance for newly acquired accounts
 */

import React, { useState, useEffect, useMemo } from 'react';
import { User, CartlogsProduct, CartlogsCategory, Order } from '../types';
import { store } from '../lib/store';
import { calculateSellingPrice } from '../lib/pricing';
import { useBodyScrollLock } from '../lib/scrollLock';

interface SocialMediaLogsPageProps {
  currentUser: User | null;
  onNavigate: (route: string, params?: any) => void;
  onRequireAuth?: () => void;
}

// Fallback high-quality catalog for offline/preview when API key is pending
const FALLBACK_LOGS_PRODUCTS: CartlogsProduct[] = [
  {
    id: 'sp-log-ig-1',
    title: 'Instagram Aged Creator Account (2019) • 12.5k Followers',
    category: 'Instagram',
    description: 'High-trust 2019 aged Instagram account with 12,500 organic followers, clean status, and full original email access.',
    supplier_price: 18000,
    price: calculateSellingPrice(18000), // ₦23,000
    stock: 4,
    in_stock: true,
    followers_count: '12,500',
    following_count: '240',
    account_age: '2019 (5+ Years)',
    verification_status: 'verified',
    features: ['12.5k Organic Followers', 'Aged 2019 (High Trust Score)', 'Original Gmail Included', 'Instant Login Access', 'Clean Security History']
  },
  {
    id: 'sp-log-fb-1',
    title: 'Facebook Aged Marketplace Account (2018) • 2FA Active',
    category: 'Facebook',
    description: 'Aged 2018 Facebook profile with active Marketplace access, 2-Factor Authentication enabled, and clean identity history.',
    supplier_price: 12000,
    price: calculateSellingPrice(12000), // ₦17,000
    stock: 6,
    in_stock: true,
    followers_count: '850 Friends',
    account_age: '2018 (6 Years)',
    verification_status: 'verified',
    features: ['Active FB Marketplace Enabled', 'Aged 2018 Account', '2FA Backup Codes Included', 'Full Email Access Included']
  },
  {
    id: 'sp-log-tt-1',
    title: 'TikTok Creator Rewards Monetized Account • 25k Followers',
    category: 'TikTok',
    description: 'Live-enabled and Creator Rewards beta eligible TikTok account with 25,000 organic tier-1 viewers and zero strikes.',
    supplier_price: 35000,
    price: calculateSellingPrice(35000), // ₦40,000
    stock: 2,
    in_stock: true,
    followers_count: '25,400',
    account_age: '2021',
    verification_status: 'unverified',
    features: ['Creator Rewards Eligible', 'Live Streaming Enabled', '25.4k Organic Followers', 'Zero Copyright Strikes']
  },
  {
    id: 'sp-log-tw-1',
    title: 'Twitter / X Aged Business Profile (2017) • 5k Followers',
    category: 'Twitter (X)',
    description: 'Established 2017 Twitter/X profile with 5,000 real tech/crypto followers and clean algorithmic standing.',
    supplier_price: 15000,
    price: calculateSellingPrice(15000), // ₦20,000
    stock: 5,
    in_stock: true,
    followers_count: '5,100',
    account_age: '2017 (7 Years)',
    verification_status: 'verified',
    features: ['2017 Aged Account', '5.1k Active Followers', 'API & Developer Enabled', 'Clean Spam Score']
  },
  {
    id: 'sp-log-tg-1',
    title: 'Telegram Aged Account with Crypto / Trading Channel Admin',
    category: 'Telegram',
    description: 'Aged Telegram session + phone ownership with 3,200 member organic crypto discussion channel included.',
    supplier_price: 20000,
    price: calculateSellingPrice(20000), // ₦25,000
    stock: 3,
    in_stock: true,
    followers_count: '3,200 Channel Members',
    account_age: '2020',
    verification_status: 'unverified',
    features: ['Aged 2020 Telegram Account', '3.2k Member Channel Admin', 'Session + TData Files', 'Clean Standing']
  },
  {
    id: 'sp-log-gm-1',
    title: 'Google / Gmail Aged PVA Master Bundle (Pack of 5)',
    category: 'Google / Gmail',
    description: 'Pack of 5 high-reputation aged Google accounts (2019-2021) with YouTube channels created and recovery emails set.',
    supplier_price: 8000,
    price: calculateSellingPrice(8000), // ₦16,000
    stock: 12,
    in_stock: true,
    account_age: '2019-2021',
    verification_status: 'verified',
    features: ['5 Individual Aged Accounts', 'Phone Verified (PVA)', 'YouTube Channel Activated', 'POP3 / IMAP Enabled']
  }
];

export const SocialMediaLogsPage: React.FC<SocialMediaLogsPageProps> = ({
  currentUser,
  onNavigate,
  onRequireAuth
}) => {
  const [categories, setCategories] = useState<CartlogsCategory[]>([]);
  const [products, setProducts] = useState<CartlogsProduct[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  // Purchase Modal State
  const [selectedProduct, setSelectedProduct] = useState<CartlogsProduct | null>(null);
  const [detailsModalProduct, setDetailsModalProduct] = useState<CartlogsProduct | null>(null);
  const [purchasing, setPurchasing] = useState<boolean>(false);
  const [purchaseError, setPurchaseError] = useState<string | null>(null);
  const [purchaseSuccessOrder, setPurchaseSuccessOrder] = useState<Order | null>(null);

  // Lock body scroll when any modal is open on mobile/tablet
  useBodyScrollLock(Boolean(selectedProduct || detailsModalProduct || purchaseSuccessOrder));

  // Load Categories & Products from Cartlogs
  useEffect(() => {
    let isMounted = true;

    async function loadData() {
      setLoading(true);
      try {
        const [catRes, prodRes] = await Promise.all([
          store.fetchCartlogsCategories(),
          store.fetchCartlogsProducts()
        ]);

        if (!isMounted) return;

        if (catRes.success && catRes.categories && catRes.categories.length > 0) {
          setCategories(catRes.categories);
        } else {
          // Dynamic category extraction from fallback list
          const uniqueCats = Array.from(new Set(FALLBACK_LOGS_PRODUCTS.map(p => p.category)));
          setCategories(uniqueCats.map((name, idx) => ({ id: idx + 1, name, slug: name.toLowerCase() })));
        }

        if (prodRes.success && prodRes.products && prodRes.products.length > 0) {
          setProducts(prodRes.products);
        } else {
          setProducts(FALLBACK_LOGS_PRODUCTS);
        }
      } catch {
        if (isMounted) {
          setProducts(FALLBACK_LOGS_PRODUCTS);
          const uniqueCats = Array.from(new Set(FALLBACK_LOGS_PRODUCTS.map(p => p.category)));
          setCategories(uniqueCats.map((name, idx) => ({ id: idx + 1, name, slug: name.toLowerCase() })));
        }
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    loadData();

    return () => {
      isMounted = false;
    };
  }, []);

  // Filter products by category and search
  const filteredProducts = useMemo(() => {
    return products.filter(prod => {
      const matchesCat = selectedCategory === 'all' || prod.category.toLowerCase() === selectedCategory.toLowerCase();
      const matchesQuery = 
        prod.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        prod.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        prod.category.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesCat && matchesQuery;
    });
  }, [products, selectedCategory, searchQuery]);

  // Handle Quick Buy
  const handleInitiateBuy = (product: CartlogsProduct) => {
    if (!currentUser) {
      if (onRequireAuth) {
        onRequireAuth();
      } else {
        onNavigate('login');
      }
      return;
    }
    setPurchaseError(null);
    setSelectedProduct(product);
  };

  // Handle Confirm Purchase
  const handleConfirmPurchase = async () => {
    if (!selectedProduct || !currentUser) return;
    
    setPurchasing(true);
    setPurchaseError(null);

    try {
      const res = await store.submitCartlogsOrder(currentUser.id, selectedProduct, 1);
      if (res.success && res.order) {
        setPurchaseSuccessOrder(res.order);
        setSelectedProduct(null);
      } else {
        setPurchaseError(res.error || 'Failed to complete order. Please try again.');
      }
    } catch (e: any) {
      setPurchaseError(e.message || 'An unexpected error occurred during purchase.');
    } finally {
      setPurchasing(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 pb-24 space-y-8">
      
      {/* Header Banner */}
      <div className="bg-slate-900 rounded-3xl p-8 sm:p-10 text-white relative overflow-hidden border border-slate-800 shadow-xl">
        <div className="relative z-10 max-w-3xl space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/20 border border-blue-400/30 text-blue-300 text-xs font-bold tracking-wide uppercase">
            <span className="w-2 h-2 rounded-full bg-blue-400 animate-pulse"></span>
            Verified Account Inventory
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-white leading-tight">
            Social Media Account Logs & Profiles
          </h1>
          <p className="text-slate-300 text-sm sm:text-base leading-relaxed">
            Acquire verified, high-trust, and aged social media accounts with instant credential delivery. 
            All credentials are encrypted and accessible immediately after purchase.
          </p>
        </div>

        {/* Subtle background decoration */}
        <div className="absolute right-0 top-0 bottom-0 w-1/3 bg-gradient-to-l from-blue-900/20 to-transparent pointer-events-none"></div>
      </div>

      {/* Filter and Search Controls */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        
        {/* Dynamic Category Tabs */}
        <div className="flex items-center gap-2 overflow-x-auto pb-2 sm:pb-0 scrollbar-none">
          <button
            onClick={() => setSelectedCategory('all')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
              selectedCategory === 'all'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
            }`}
          >
            All Accounts ({products.length})
          </button>
          {categories.map(cat => (
            <button
              key={`cat-tab-${cat.id}`}
              onClick={() => setSelectedCategory(cat.name)}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
                selectedCategory.toLowerCase() === cat.name.toLowerCase()
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
              }`}
            >
              {cat.name}
            </button>
          ))}
        </div>

        {/* Search Input */}
        <div className="relative w-full md:w-72 shrink-0">
          <input
            type="text"
            placeholder="Search accounts, platforms..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600 shadow-xs"
          />
          <svg className="w-4 h-4 text-slate-400 absolute left-3.5 top-3 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </div>
      </div>

      {/* Loading Skeleton or Products Grid */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3, 4, 5, 6].map(i => (
            <div key={`skel-${i}`} className="bg-white rounded-3xl border border-slate-200/80 p-6 space-y-4 animate-pulse">
              <div className="h-6 bg-slate-100 rounded-lg w-1/3"></div>
              <div className="h-5 bg-slate-100 rounded-lg w-3/4"></div>
              <div className="h-16 bg-slate-50 rounded-xl w-full"></div>
              <div className="h-10 bg-slate-100 rounded-xl w-full"></div>
            </div>
          ))}
        </div>
      ) : filteredProducts.length === 0 ? (
        <div className="p-16 text-center bg-white rounded-3xl border border-slate-200/80 shadow-xs">
          <div className="w-16 h-16 bg-slate-100 text-slate-400 rounded-full mx-auto flex items-center justify-center mb-4">
            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
          </div>
          <h3 className="text-lg font-bold text-slate-900 mb-1">No Accounts Found</h3>
          <p className="text-slate-500 text-xs max-w-md mx-auto">
            {searchQuery ? `No account listings matched "${searchQuery}".` : 'Accounts for this category will be available shortly.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredProducts.map((prod, idx) => (
            <div
              key={`prod-card-${prod.id}-${idx}`}
              className="bg-white rounded-3xl border border-slate-200/80 p-6 flex flex-col justify-between hover:shadow-xl hover:border-slate-300 transition-all duration-300 group"
            >
              <div className="space-y-4">
                
                {/* Platform & Status Badges */}
                <div className="flex items-center justify-between gap-2">
                  <span className="px-3 py-1 rounded-full text-[11px] font-extrabold uppercase tracking-wider bg-blue-50 text-blue-700 border border-blue-100">
                    {prod.category}
                  </span>
                  
                  <div className="flex items-center gap-1.5">
                    {prod.verification_status === 'verified' && (
                      <span className="flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                        <svg className="w-3 h-3 text-emerald-600" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                        </svg>
                        Verified
                      </span>
                    )}
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                      prod.in_stock 
                        ? 'bg-slate-100 text-slate-700' 
                        : 'bg-red-50 text-red-600 border border-red-100'
                    }`}>
                      {prod.in_stock ? `${prod.stock} in stock` : 'Sold out'}
                    </span>
                  </div>
                </div>

                {/* Title */}
                <h3 className="text-base font-bold text-slate-900 group-hover:text-blue-600 transition-colors leading-snug">
                  {prod.title}
                </h3>

                {/* Description */}
                <p className="text-slate-600 text-xs line-clamp-2 leading-relaxed">
                  {prod.description}
                </p>

                {/* Key Attributes Pills */}
                <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-100">
                  {prod.account_age && (
                    <div className="p-2 bg-slate-50 rounded-xl">
                      <p className="text-[10px] uppercase font-bold text-slate-400">Account Age</p>
                      <p className="text-xs font-bold text-slate-800 truncate">{prod.account_age}</p>
                    </div>
                  )}
                  {prod.followers_count && (
                    <div className="p-2 bg-slate-50 rounded-xl">
                      <p className="text-[10px] uppercase font-bold text-slate-400">Audience</p>
                      <p className="text-xs font-bold text-slate-800 truncate">{prod.followers_count}</p>
                    </div>
                  )}
                </div>

                {/* Features List */}
                {prod.features && prod.features.length > 0 && (
                  <ul className="space-y-1 pt-1">
                    {prod.features.slice(0, 3).map((feat, fIdx) => (
                      <li key={`feat-${prod.id}-${fIdx}`} className="flex items-center gap-2 text-xs text-slate-600">
                        <svg className="w-3.5 h-3.5 text-emerald-500 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 13l4 4L19 7" />
                        </svg>
                        <span className="truncate">{feat}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              {/* Price & Action Row */}
              <div className="pt-6 mt-4 border-t border-slate-100 flex items-center justify-between gap-3">
                <div>
                  <p className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Price</p>
                  <p className="text-lg font-black text-slate-900">
                    ₦{prod.price.toLocaleString()}
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setDetailsModalProduct(prod)}
                    className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition-colors cursor-pointer whitespace-nowrap"
                  >
                    Details
                  </button>
                  <button
                    onClick={() => handleInitiateBuy(prod)}
                    disabled={!prod.in_stock}
                    className={`px-4 py-2 text-xs font-bold rounded-xl shadow-xs transition-all whitespace-nowrap cursor-pointer ${
                      prod.in_stock
                        ? 'bg-blue-600 hover:bg-blue-700 text-white'
                        : 'bg-slate-200 text-slate-400 cursor-not-allowed'
                    }`}
                  >
                    {prod.in_stock ? 'Buy Now' : 'Out of Stock'}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Product Details Modal */}
      {detailsModalProduct && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs"
          onClick={() => setDetailsModalProduct(null)}
          onTouchMove={(e) => { if (e.target === e.currentTarget) e.preventDefault(); }}
        >
          <div
            className="relative w-full max-w-xl bg-white rounded-3xl shadow-2xl p-6 sm:p-8 border border-slate-100 max-h-[calc(100dvh-2rem)] overflow-y-auto overscroll-contain sp-overlay-scroll space-y-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-4 border-b border-slate-100 pb-4">
              <div>
                <span className="px-3 py-1 rounded-full text-xs font-extrabold uppercase tracking-wider bg-blue-50 text-blue-700">
                  {detailsModalProduct.category}
                </span>
                <h2 className="text-xl font-bold text-slate-900 mt-2">
                  {detailsModalProduct.title}
                </h2>
              </div>
              <button
                onClick={() => setDetailsModalProduct(null)}
                className="text-slate-400 hover:text-slate-600 p-2 rounded-full hover:bg-slate-100 cursor-pointer"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">Description</h4>
                <p className="text-slate-700 text-sm leading-relaxed">
                  {detailsModalProduct.description}
                </p>
              </div>

              {/* Attributes Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 p-4 bg-slate-50 rounded-2xl">
                <div>
                  <p className="text-[10px] uppercase font-bold text-slate-400">Account Age</p>
                  <p className="text-xs font-bold text-slate-900">{detailsModalProduct.account_age || 'Established'}</p>
                </div>
                <div>
                  <p className="text-[10px] uppercase font-bold text-slate-400">Audience / Followers</p>
                  <p className="text-xs font-bold text-slate-900">{detailsModalProduct.followers_count || 'Standard'}</p>
                </div>
                <div>
                  <p className="text-[10px] uppercase font-bold text-slate-400">Verification</p>
                  <p className="text-xs font-bold text-slate-900 capitalize">{detailsModalProduct.verification_status || 'Standard'}</p>
                </div>
              </div>

              {/* Included Features */}
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">Package Inclusions</h4>
                <ul className="space-y-2">
                  {(detailsModalProduct.features || ['Full Email Access', 'Instant Credentials', 'Clean Security History']).map((feat, idx) => (
                    <li key={`detail-feat-${idx}`} className="flex items-center gap-2.5 text-xs text-slate-700">
                      <div className="w-4 h-4 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center shrink-0">
                        <svg className="w-2.5 h-2.5" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                      </div>
                      <span>{feat}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Security Guidance Note */}
              <div className="p-4 bg-amber-50 border border-amber-200/80 rounded-2xl flex items-start gap-3">
                <svg className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                <p className="text-xs text-amber-900 leading-relaxed">
                  <strong>Important Security Notice:</strong> Upon receiving credentials, immediately log in, update the recovery email, change passwords, and enable 2-Factor Authentication for maximum ownership security.
                </p>
              </div>
            </div>

            <div className="pt-4 border-t border-slate-100 flex items-center justify-between gap-4">
              <div>
                <p className="text-xs text-slate-400 font-bold">Total Price</p>
                <p className="text-2xl font-black text-slate-900">₦{detailsModalProduct.price.toLocaleString()}</p>
              </div>
              <button
                onClick={() => {
                  const p = detailsModalProduct;
                  setDetailsModalProduct(null);
                  handleInitiateBuy(p);
                }}
                disabled={!detailsModalProduct.in_stock}
                className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-md transition-all cursor-pointer"
              >
                Proceed to Purchase
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Buy Confirmation Modal */}
      {selectedProduct && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs"
          onClick={() => !purchasing && setSelectedProduct(null)}
          onTouchMove={(e) => { if (e.target === e.currentTarget) e.preventDefault(); }}
        >
          <div
            className="relative w-full max-w-md bg-white rounded-3xl shadow-2xl p-6 sm:p-8 border border-slate-100 max-h-[calc(100dvh-2rem)] overflow-y-auto overscroll-contain sp-overlay-scroll space-y-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="text-center space-y-2">
              <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-full mx-auto flex items-center justify-center">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
              </div>
              <h3 className="text-xl font-extrabold text-slate-900">
                Confirm Account Purchase
              </h3>
              <p className="text-slate-500 text-xs">
                {selectedProduct.title}
              </p>
            </div>

            {/* Price & Balance Breakdown */}
            <div className="p-4 bg-slate-50 rounded-2xl space-y-2.5 text-xs">
              <div className="flex justify-between text-slate-600">
                <span>Account Item:</span>
                <span className="font-semibold text-slate-800">{selectedProduct.category}</span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>Your Wallet Balance:</span>
                <span className="font-semibold text-slate-800">₦{(currentUser?.balance || 0).toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-slate-900 font-bold pt-2 border-t border-slate-200">
                <span>Purchase Amount:</span>
                <span className="text-blue-600 text-sm font-extrabold">₦{selectedProduct.price.toLocaleString()}</span>
              </div>
            </div>

            {/* Balance Check warning if insufficient */}
            {currentUser && currentUser.balance < selectedProduct.price && (
              <div className="p-4 bg-red-50 border border-red-200 rounded-2xl flex items-start gap-2.5 text-red-800 text-xs">
                <svg className="w-4 h-4 text-red-600 shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
                <div>
                  <p className="font-bold">Insufficient Wallet Balance</p>
                  <p className="mt-0.5">Please fund your wallet with at least ₦{(selectedProduct.price - (currentUser?.balance || 0)).toLocaleString()} to complete this purchase.</p>
                </div>
              </div>
            )}

            {/* Error Message */}
            {purchaseError && (
              <div className="p-3 bg-red-50 text-red-700 rounded-xl text-xs font-semibold">
                {purchaseError}
              </div>
            )}

            {/* Modal Actions */}
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setSelectedProduct(null)}
                disabled={purchasing}
                className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition-colors cursor-pointer"
              >
                Cancel
              </button>
              
              {currentUser && currentUser.balance >= selectedProduct.price ? (
                <button
                  type="button"
                  onClick={handleConfirmPurchase}
                  disabled={purchasing}
                  className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-xs transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60"
                >
                  {purchasing ? (
                    <>
                      <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      <span>Processing...</span>
                    </>
                  ) : (
                    <span>Pay ₦{selectedProduct.price.toLocaleString()}</span>
                  )}
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    setSelectedProduct(null);
                    onNavigate('deposits');
                  }}
                  className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-xs transition-all cursor-pointer"
                >
                  Fund Wallet
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Purchase Success & Instant Credentials Modal */}
      {purchaseSuccessOrder && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs"
          onClick={() => setPurchaseSuccessOrder(null)}
          onTouchMove={(e) => { if (e.target === e.currentTarget) e.preventDefault(); }}
        >
          <div
            className="relative w-full max-w-lg bg-white rounded-3xl shadow-2xl p-6 sm:p-8 border border-slate-100 max-h-[calc(100dvh-2rem)] overflow-y-auto overscroll-contain sp-overlay-scroll space-y-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="text-center space-y-2">
              <div className="w-14 h-14 bg-emerald-50 text-emerald-600 rounded-full mx-auto flex items-center justify-center">
                <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h3 className="text-2xl font-extrabold text-slate-900">
                Purchase Successful! 🎉
              </h3>
              <p className="text-slate-500 text-xs">
                Order Reference: <strong>{purchaseSuccessOrder.order_reference}</strong>
              </p>
            </div>

            {/* Credentials Card */}
            <div className="p-5 bg-slate-900 text-white rounded-2xl space-y-3 font-mono text-xs border border-slate-800 shadow-inner">
              <div className="flex items-center justify-between border-b border-slate-800 pb-2 text-slate-400 font-sans">
                <span className="font-bold text-[11px] uppercase tracking-wider text-emerald-400">Account Credentials</span>
                <span className="text-[10px]">Encrypted Delivery</span>
              </div>
              
              {purchaseSuccessOrder.customer_details?.credentials?.username && (
                <div className="flex justify-between items-center py-1">
                  <span className="text-slate-400 font-sans">Username / Handle:</span>
                  <span className="text-white font-bold select-all">{purchaseSuccessOrder.customer_details.credentials.username}</span>
                </div>
              )}

              {purchaseSuccessOrder.customer_details?.credentials?.password && (
                <div className="flex justify-between items-center py-1">
                  <span className="text-slate-400 font-sans">Password:</span>
                  <span className="text-amber-300 font-bold select-all">{purchaseSuccessOrder.customer_details.credentials.password}</span>
                </div>
              )}

              {purchaseSuccessOrder.customer_details?.credentials?.email && (
                <div className="flex justify-between items-center py-1">
                  <span className="text-slate-400 font-sans">Master Email:</span>
                  <span className="text-cyan-300 font-bold select-all">{purchaseSuccessOrder.customer_details.credentials.email}</span>
                </div>
              )}

              {purchaseSuccessOrder.customer_details?.credentials?.additional_info && (
                <div className="pt-2 border-t border-slate-800 text-slate-300 font-sans text-[11px] leading-relaxed">
                  {purchaseSuccessOrder.customer_details.credentials.additional_info}
                </div>
              )}
            </div>

            <p className="text-xs text-slate-500 text-center">
              These credentials have been saved to your account and can be retrieved at any time from your <strong>Orders</strong> page.
            </p>

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => {
                  setPurchaseSuccessOrder(null);
                  onNavigate('orders');
                }}
                className="flex-1 py-3 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-xs transition-all cursor-pointer text-center"
              >
                View in Orders
              </button>
              <button
                type="button"
                onClick={() => setPurchaseSuccessOrder(null)}
                className="px-6 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition-colors cursor-pointer"
              >
                Continue Browsing
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default SocialMediaLogsPage;
