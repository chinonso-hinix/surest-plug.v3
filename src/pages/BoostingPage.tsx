/**
 * Surest Plug - Social Media Account Boosting Page
 * 
 * Direct Server-Side Integration with FollowSPanel API (https://followspanel.com/api/v2)
 * Features:
 * - Real Live Services Catalog dynamically loaded from server
 * - Categorization across Instagram, TikTok, YouTube, Facebook, X (Twitter), Telegram, Music
 * - Exact real rate calculation per 1,000 units
 * - Link/Target and Quantity range validation (Min - Max)
 * - Atomic wallet balance check and deduction upon confirmed provider dispatch
 * - Duplicate submission prevention
 * - Order tracking with real FollowSPanel Order ID
 */

import React, { useState, useEffect, useMemo } from 'react';
import { User, FollowSPanelServiceItem } from '../types';
import { store } from '../lib/store';
import { calculateSellingPrice, calculateSmmPrice } from '../lib/pricing';

interface BoostingPageProps {
  currentUser: User | null;
  onSubmitSmmOrder: (
    platform: string,
    serviceName: string,
    targetLink: string,
    quantity: number,
    price: number,
    serviceId: number | string,
    ratePer1k?: number
  ) => void;
  onNavigate: (route: string) => void;
}

interface PlatformOption {
  id: string;
  label: string;
  icon: string;
  iconImage?: string;
  keywords: string[];
}

const PLATFORMS: PlatformOption[] = [
  { 
    id: 'instagram', 
    label: 'Instagram', 
    icon: '📸', 
    iconImage: 'https://www.image2url.com/r2/default/images/1787298994827-461aeca3-c4cb-4de3-b287-4df6b0398be5.png',
    keywords: ['instagram', 'ig', 'threads'] 
  },
  { 
    id: 'tiktok', 
    label: 'TikTok', 
    icon: '🎵', 
    iconImage: 'https://plain-weur-prod-public.komododecks.com/202608/21/iY5cJfJ9LAWrFJ3Ymfpv/image.png',
    keywords: ['tiktok', 'tik tok'] 
  },
  { 
    id: 'youtube', 
    label: 'YouTube', 
    icon: '▶️', 
    iconImage: 'https://plain-weur-prod-public.komododecks.com/202608/21/8ZciXozg9vshuSgcgUA9/image.png',
    keywords: ['youtube', 'yt'] 
  },
  { 
    id: 'facebook', 
    label: 'Facebook', 
    icon: '👥', 
    iconImage: 'https://plain-weur-prod-public.komododecks.com/202608/21/R4JkYsxxaj39xpgq2gC6/image.png',
    keywords: ['facebook', 'fb'] 
  },
  { id: 'twitter', label: 'X / Twitter', icon: '𝕏', keywords: ['twitter', ' x ', '[x]', 'x ('] },
  { 
    id: 'telegram', 
    label: 'Telegram', 
    icon: '✈️', 
    iconImage: 'https://plain-weur-prod-public.komododecks.com/202608/21/2gE0hVxXnW0V5Y72TP7I/image.png',
    keywords: ['telegram', 'tg'] 
  },
  { id: 'music', label: 'Music & Streaming', icon: '🎧', keywords: ['spotify', 'audiomack', 'boomplay', 'apple music', 'soundclound'] },
  { id: 'all', label: 'All Services', icon: '🌐', keywords: [] }
];

export const BoostingPage: React.FC<BoostingPageProps> = ({
  currentUser,
  onSubmitSmmOrder,
  onNavigate
}) => {
  // Services & Loading State
  const [services, setServices] = useState<FollowSPanelServiceItem[]>([]);
  const [isLoadingServices, setIsLoadingServices] = useState<boolean>(true);
  const [serviceError, setServiceError] = useState<string | null>(null);

  // Form State
  const [selectedPlatform, setSelectedPlatform] = useState<string>('instagram');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedServiceId, setSelectedServiceId] = useState<number | null>(null);
  const [searchFilter, setSearchFilter] = useState<string>('');
  const [targetLink, setTargetLink] = useState<string>('');
  const [quantity, setQuantity] = useState<number>(1000);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Load real services from FollowSPanel API
  const loadServices = async () => {
    setIsLoadingServices(true);
    setServiceError(null);
    try {
      const res = await store.fetchSmmServices();
      if (res.success && res.services && res.services.length > 0) {
        setServices(res.services);
        // Automatically select the first service
        const defaultService = res.services.find(s => 
          s.name.toLowerCase().includes('instagram') || s.category.toLowerCase().includes('instagram')
        ) || res.services[0];
        
        if (defaultService) {
          setSelectedServiceId(defaultService.service);
          setQuantity(defaultService.min || 100);
        }
      } else {
        setServiceError(res.error || 'Social media services are temporarily unavailable. Please try again later.');
      }
    } catch (err: any) {
      setServiceError('Social media services are temporarily unavailable. Please try again later.');
    } finally {
      setIsLoadingServices(false);
    }
  };

  useEffect(() => {
    loadServices();
  }, []);

  // Filter services by platform, category and search term
  const filteredServices = useMemo(() => {
    if (!services || services.length === 0) return [];

    let list = services;

    // Platform filter
    const activePlat = PLATFORMS.find(p => p.id === selectedPlatform);
    if (activePlat && activePlat.id !== 'all') {
      list = list.filter(s => {
        const text = `${s.category} ${s.name}`.toLowerCase();
        return activePlat.keywords.some(k => text.includes(k));
      });
    }

    // Category filter
    if (selectedCategory !== 'all') {
      list = list.filter(s => s.category === selectedCategory);
    }

    // Search term filter
    if (searchFilter.trim()) {
      const q = searchFilter.toLowerCase().trim();
      list = list.filter(s => 
        s.name.toLowerCase().includes(q) || 
        s.category.toLowerCase().includes(q) || 
        String(s.service).includes(q)
      );
    }

    return list;
  }, [services, selectedPlatform, selectedCategory, searchFilter]);

  // Available categories for the currently selected platform
  const platformCategories = useMemo(() => {
    if (!services || services.length === 0) return [];
    const activePlat = PLATFORMS.find(p => p.id === selectedPlatform);
    let list = services;
    if (activePlat && activePlat.id !== 'all') {
      list = list.filter(s => {
        const text = `${s.category} ${s.name}`.toLowerCase();
        return activePlat.keywords.some(k => text.includes(k));
      });
    }
    const cats = Array.from(new Set(list.map(s => s.category))).filter(Boolean);
    return cats.slice(0, 15); // Top 15 categories for clean UI
  }, [services, selectedPlatform]);

  // Current selected service
  const currentService = useMemo(() => {
    if (!selectedServiceId) return filteredServices[0] || null;
    return services.find(s => s.service === selectedServiceId) || filteredServices[0] || null;
  }, [services, selectedServiceId, filteredServices]);

  // Update quantity when service changes
  useEffect(() => {
    if (currentService) {
      if (quantity < currentService.min || quantity > currentService.max) {
        setQuantity(currentService.min);
      }
    }
  }, [currentService?.service]);

  // Accurate price calculation based on centralized pricing rules
  const calculatedPrice = useMemo(() => {
    if (!currentService || !quantity || quantity <= 0) return 0;
    const { sellingPrice } = calculateSmmPrice(currentService.rate, quantity);
    return sellingPrice;
  }, [currentService, quantity]);

  // Switch platform
  const handlePlatformChange = (platformId: string) => {
    setSelectedPlatform(platformId);
    setSelectedCategory('all');
    setSearchFilter('');
    const activePlat = PLATFORMS.find(p => p.id === platformId);
    if (activePlat) {
      const match = services.find(s => {
        const text = `${s.category} ${s.name}`.toLowerCase();
        return activePlat.keywords.some(k => text.includes(k));
      });
      if (match) {
        setSelectedServiceId(match.service);
        setQuantity(match.min || 100);
      }
    }
  };

  // Submit Order with duplicate prevention
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (isSubmitting) return; // Prevent duplicate clicks

    if (!currentUser) {
      onNavigate('login');
      return;
    }

    if (!currentService) {
      setFormError('Please select a boosting service to continue.');
      return;
    }

    // Target Link validation
    const trimmedLink = targetLink.trim();
    if (!trimmedLink || trimmedLink.length < 3) {
      setFormError('Please enter a valid social media profile URL, username, or post link.');
      return;
    }

    // Quantity range validation
    if (quantity < currentService.min || quantity > currentService.max) {
      setFormError(`Quantity must be between ${currentService.min.toLocaleString()} and ${currentService.max.toLocaleString()} for this service.`);
      return;
    }

    // Wallet balance check
    if (currentUser.balance < calculatedPrice) {
      setFormError(`Insufficient wallet balance (Current: ₦${currentUser.balance.toLocaleString('en-US', { minimumFractionDigits: 2 })}, Required: ₦${calculatedPrice.toLocaleString()}). Please fund your wallet.`);
      return;
    }

    const platformObj = PLATFORMS.find(p => p.id === selectedPlatform);
    const platformLabel = platformObj ? platformObj.label : 'Social Media';

    setIsSubmitting(true);

    try {
      const rateVal = parseFloat(currentService.rate) || 0;
      await onSubmitSmmOrder(
        platformLabel,
        currentService.name,
        trimmedLink,
        quantity,
        calculatedPrice,
        currentService.service,
        rateVal
      );
    } catch (err: any) {
      setFormError(err.message || 'Social media services are temporarily unavailable. Please try again later.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10 pb-24 space-y-8 animate-tab-enter">
      
      {/* Header */}
      <div className="text-center space-y-3 max-w-2xl mx-auto">
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-50 border border-emerald-200/80 text-emerald-700 text-xs font-bold uppercase tracking-wider">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
          Direct High-Speed Growth Network
        </div>
        <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
          Social Media Boosting
        </h1>
        <p className="text-slate-600 text-sm sm:text-base">
          Automated engagement, organic growth, followers, views, and reach with instant server dispatch.
        </p>
      </div>

      {/* Safety & Anti-Password Guarantee */}
      <div className="p-4 bg-emerald-50/90 border border-emerald-200 rounded-2xl flex items-center gap-3 text-emerald-900 text-sm shadow-xs">
        <div className="w-8 h-8 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
          </svg>
        </div>
        <div>
          <strong className="font-semibold">100% Account Safety:</strong> We <u>NEVER</u> ask for your passwords or private logins. Simply provide your public handle or post link.
        </div>
      </div>

      {/* Error State if Provider Cannot Be Reached */}
      {serviceError && (
        <div className="p-6 bg-amber-50 border border-amber-200 rounded-3xl text-center space-y-3">
          <div className="w-12 h-12 mx-auto rounded-full bg-amber-100 text-amber-700 flex items-center justify-center font-bold text-xl">
            ⚠️
          </div>
          <h3 className="text-base font-bold text-amber-900">Service Notice</h3>
          <p className="text-sm text-amber-800 max-w-md mx-auto">
            Social media services are temporarily unavailable. Please try again later.
          </p>
          <button
            onClick={loadServices}
            className="px-5 py-2 bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold rounded-xl transition-colors cursor-pointer"
          >
            Retry Connection
          </button>
        </div>
      )}

      {/* Main Form */}
      {!serviceError && (
        <form onSubmit={handleSubmit} className="bg-white rounded-3xl p-6 sm:p-10 border border-slate-200/80 shadow-xl space-y-8">
          
          {/* Step 1: Select Platform */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                1. Select Social Media Platform
              </label>
              {services.length > 0 && (
                <span className="text-[11px] text-slate-400 font-medium">
                  {services.length} Live Services Available
                </span>
              )}
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2.5">
              {PLATFORMS.map((plat) => (
                <button
                  key={plat.id}
                  type="button"
                  onClick={() => handlePlatformChange(plat.id)}
                  className={`p-3 rounded-2xl border text-center transition-all cursor-pointer flex flex-col items-center gap-1.5 ${
                    selectedPlatform === plat.id
                      ? 'border-blue-600 bg-blue-50/80 text-blue-900 font-bold shadow-xs'
                      : 'border-slate-200 hover:border-slate-300 bg-white text-slate-700 font-medium'
                  }`}
                >
                  {plat.iconImage ? (
                    <img 
                      src={plat.iconImage} 
                      alt={plat.label} 
                      referrerPolicy="no-referrer"
                      className="w-7 h-7 object-contain rounded-md" 
                    />
                  ) : (
                    <span className="text-2xl">{plat.icon}</span>
                  )}
                  <span className="text-xs truncate max-w-full">{plat.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Step 2: Choose Category & Search */}
          <div className="space-y-3 pt-4 border-t border-slate-100">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                2. Select Service Package
              </label>
              
              {/* Quick Search */}
              <div className="relative w-full sm:w-72">
                <input
                  type="text"
                  value={searchFilter}
                  onChange={(e) => setSearchFilter(e.target.value)}
                  placeholder="Search service name or ID..."
                  className="w-full pl-9 pr-4 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-600 focus:outline-none"
                />
                <svg className="w-4 h-4 text-slate-400 absolute left-3 top-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
            </div>

            {/* Category Pills */}
            {platformCategories.length > 1 && (
              <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-thin">
                <button
                  type="button"
                  onClick={() => setSelectedCategory('all')}
                  className={`px-3 py-1.5 rounded-xl text-xs whitespace-nowrap cursor-pointer transition-colors ${
                    selectedCategory === 'all'
                      ? 'bg-slate-900 text-white font-bold'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200 font-medium'
                  }`}
                >
                  All Categories ({filteredServices.length})
                </button>
                {platformCategories.map((cat, catIdx) => (
                  <button
                    key={`cat-${cat}-${catIdx}`}
                    type="button"
                    onClick={() => setSelectedCategory(cat)}
                    className={`px-3 py-1.5 rounded-xl text-xs whitespace-nowrap cursor-pointer transition-colors ${
                      selectedCategory === cat
                        ? 'bg-blue-600 text-white font-bold'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200 font-medium'
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            )}

            {/* Service Selection List */}
            {isLoadingServices ? (
              <div className="p-8 text-center text-slate-400 space-y-2">
                <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
                <p className="text-xs">Loading live services catalog...</p>
              </div>
            ) : filteredServices.length === 0 ? (
              <div className="p-8 text-center bg-slate-50 rounded-2xl border border-dashed border-slate-200 text-slate-500 text-xs">
                No matching services found for this filter. Try adjusting your search.
              </div>
            ) : (
              <div className="space-y-2.5 max-h-96 overflow-y-auto pr-1">
                {filteredServices.slice(0, 40).map((service, srvIdx) => {
                  const isSelected = (currentService?.service === service.service);
                  const rawRate = parseFloat(service.rate) || 0;
                  const customerRate = calculateSellingPrice(rawRate);
                  return (
                    <label
                      key={`smm-srv-${service.service}-${srvIdx}`}
                      className={`block p-4 rounded-2xl border transition-all cursor-pointer ${
                        isSelected
                          ? 'border-blue-600 bg-blue-50/50 shadow-xs ring-1 ring-blue-600/30'
                          : 'border-slate-200 hover:border-slate-300 bg-white'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-start gap-3">
                          <input 
                            type="radio" 
                            name="smm_service"
                            checked={isSelected}
                            onChange={() => {
                              setSelectedServiceId(service.service);
                              setQuantity(service.min || 100);
                            }}
                            className="mt-1 text-blue-600 focus:ring-blue-500 cursor-pointer"
                          />
                          <div>
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-[10px] font-mono font-bold bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded">
                                #{service.service}
                              </span>
                              <span className="text-xs font-semibold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-full">
                                {service.category}
                              </span>
                              {service.refill && (
                                <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded">
                                  ♻️ Refill Guaranteed
                                </span>
                              )}
                            </div>
                            <h4 className="text-sm font-bold text-slate-900 mt-1 leading-snug">
                              {service.name}
                            </h4>
                            <div className="flex items-center gap-3 text-[11px] text-slate-400 mt-1.5">
                              <span>Min: {service.min?.toLocaleString()}</span>
                              <span>•</span>
                              <span>Max: {service.max?.toLocaleString()}</span>
                              <span>•</span>
                              <span>Speed: Fast / Instant</span>
                            </div>
                          </div>
                        </div>
                        <div className="text-right shrink-0">
                          <div className="text-base font-black text-blue-600">
                            ₦{customerRate.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </div>
                          <div className="text-[10px] text-slate-400">per 1,000 units</div>
                        </div>
                      </div>
                    </label>
                  );
                })}
              </div>
            )}
          </div>

          {/* Step 3: Target Link / Handle & Quantity */}
          <div className="space-y-4 pt-4 border-t border-slate-100">
            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              3. Target & Quantity Details
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Target Link or Username *
                </label>
                <input 
                  type="text" 
                  required
                  value={targetLink}
                  onChange={(e) => setTargetLink(e.target.value)}
                  placeholder="e.g. https://instagram.com/username or @handle"
                  className="w-full px-4 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-600 focus:outline-none"
                />
                <p className="text-[11px] text-slate-400 mt-1">
                  Ensure account, video, or post is strictly set to Public.
                </p>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-semibold text-slate-700">
                    Quantity *
                  </label>
                  {currentService && (
                    <span className="text-[11px] text-slate-500">
                      Min: {currentService.min.toLocaleString()} — Max: {currentService.max.toLocaleString()}
                    </span>
                  )}
                </div>
                <input 
                  type="number" 
                  required
                  min={currentService?.min || 1}
                  max={currentService?.max || 1000000}
                  value={quantity}
                  onChange={(e) => setQuantity(parseInt(e.target.value) || 0)}
                  className={`w-full px-4 py-2.5 text-sm bg-slate-50 border rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-600 focus:outline-none ${
                    currentService && (quantity < currentService.min || quantity > currentService.max)
                      ? 'border-red-300 ring-1 ring-red-300'
                      : 'border-slate-200'
                  }`}
                />
                {currentService && (quantity < currentService.min || quantity > currentService.max) && (
                  <p className="text-[11px] text-red-600 mt-1">
                    Quantity must be between {currentService.min.toLocaleString()} and {currentService.max.toLocaleString()}.
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Form Error Notice */}
          {formError && (
            <div className="p-3.5 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl flex items-center gap-2">
              <svg className="w-4 h-4 text-red-500 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span>{formError}</span>
            </div>
          )}

          {/* Summary & Checkout */}
          <div className="p-6 bg-slate-50 rounded-2xl border border-slate-200/80 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 text-sm">
              <span className="text-slate-600 font-medium">Calculated Total Price:</span>
              <span className="text-2xl font-black text-slate-900 break-words">
                ₦{calculatedPrice.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
            </div>

            {currentUser ? (
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 text-xs pt-2 border-t border-slate-200 text-slate-600">
                <span>Your Wallet Balance:</span>
                <span className={`font-bold break-words ${currentUser.balance >= calculatedPrice ? 'text-emerald-600' : 'text-red-600'}`}>
                  ₦{currentUser.balance.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                  {currentUser.balance < calculatedPrice && ' (Insufficient Funds)'}
                </span>
              </div>
            ) : (
              <div className="text-xs text-amber-800 bg-amber-50 p-3 rounded-xl flex items-center justify-between">
                <span>You must be logged in to submit boosting orders.</span>
                <button
                  type="button"
                  onClick={() => onNavigate('login')}
                  className="font-bold text-blue-600 underline cursor-pointer"
                >
                  Sign In
                </button>
              </div>
            )}

            <button
              type="submit"
              disabled={isSubmitting || !currentService || (currentUser && currentUser.balance < calculatedPrice)}
              className="w-full py-3.5 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 disabled:bg-slate-300 disabled:cursor-not-allowed text-white font-bold text-sm rounded-xl shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              {isSubmitting ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  <span>Processing Order...</span>
                </>
              ) : !currentUser ? (
                'Sign In to Place Order'
              ) : currentUser.balance < calculatedPrice ? (
                'Insufficient Balance — Fund Wallet'
              ) : (
                `Confirm & Pay ₦${calculatedPrice.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
              )}
            </button>
          </div>

        </form>
      )}

    </div>
  );
};

export default BoostingPage;
