/**
 * Surest Plug - Collapsible Fixed Dashboard Navigation Menu Component
 * 
 * Replaces permanent sidebar with a fixed collapsible dropdown/drawer menu
 * accessible across Desktop, Tablet, and Mobile devices.
 * 
 * Features:
 * - Position fixed relative to viewport
 * - Retains 100% of all customer dashboard navigation options in exact requested structure
 * - Smooth slide & fade transition animations
 * - Semi-transparent backdrop overlay with click-to-close & Escape key listener
 * - Active item highlighting with badge counters for orders, custom projects, tickets, and rewards
 */

import React, { useEffect } from 'react';
import { User, Order, CustomOrder, SupportTicket } from '../types';
import { useBodyScrollLock } from '../lib/scrollLock';

export interface SidebarProps {
  currentRoute: string;
  currentUser: User;
  orders?: Order[];
  customOrders?: CustomOrder[];
  supportTickets?: SupportTicket[];
  isOpen?: boolean;
  onClose?: () => void;
  onNavigate: (route: string) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentRoute,
  currentUser,
  orders = [],
  customOrders = [],
  supportTickets = [],
  isOpen = false,
  onClose,
  onNavigate
}) => {
  const activeOrdersCount = orders.filter(o => o.status === 'completed' || o.status === 'processing').length;
  const pendingCustomCount = customOrders.filter(c => c.status === 'pending' || c.status === 'reviewing').length;
  const openTicketsCount = supportTickets.filter(s => s.status === 'open' || s.status === 'answered').length;

  // Lock body scroll when mobile/tablet drawer is open
  useBodyScrollLock(isOpen);

  // Handle Escape key to close menu
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen && onClose) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  const handleItemClick = (route: string) => {
    onNavigate(route);
    if (onClose) {
      onClose();
    }
  };

  return (
    <>
      {/* 1. Backdrop Overlay (Fixed, semi-transparent) */}
      <div 
        onClick={onClose}
        onTouchMove={(e) => e.preventDefault()}
        className={`fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 transition-opacity duration-300 ease-in-out ${
          isOpen 
            ? 'opacity-100 pointer-events-auto' 
            : 'opacity-0 pointer-events-none'
        }`}
        aria-hidden={!isOpen}
      />

      {/* 2. Fixed Slide-out Navigation Drawer */}
      <aside 
        className={`fixed top-0 left-0 bottom-0 h-full w-[min(85vw,320px)] sm:w-80 bg-white z-50 shadow-2xl flex flex-col justify-between overflow-y-auto overscroll-contain sp-overlay-scroll transition-transform duration-300 ease-in-out ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
        role="dialog"
        aria-modal="true"
        aria-label="Dashboard Navigation Menu"
      >
        <div className="flex flex-col flex-1 min-h-0">
          
          {/* Top Brand Header & Close Button */}
          <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/80 shrink-0">
            <div className="flex items-center gap-2.5">
              <img 
                src="https://www.image2url.com/r2/default/images/1787828243533-7b9f3864-3fef-41b2-84e9-a00088ba5494.jpg" 
                alt="Surest Plug" 
                className="h-8 w-8 rounded-full object-cover shadow-xs ring-1 ring-blue-500/20"
                onError={(e) => {
                  (e.target as HTMLImageElement).src = '/sp-logo.png';
                }}
              />
              <div className="flex flex-col">
                <span className="text-base font-extrabold text-blue-700 tracking-tight leading-tight">
                  Surest<span className="text-slate-900">Plug</span>
                </span>
                <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">
                  Dashboard Menu
                </span>
              </div>
            </div>

            <button 
              type="button"
              onClick={onClose}
              className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 transition-colors cursor-pointer"
              aria-label="Close navigation menu"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* User Account Snapshot */}
          <div className="p-3.5 pb-2 shrink-0">
            <div className="p-3 bg-gradient-to-r from-blue-50 to-indigo-50/60 rounded-2xl border border-blue-100/80 flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-600 text-white font-bold flex items-center justify-center text-sm shadow-xs shrink-0">
                {currentUser.full_name.charAt(0).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <h4 className="text-xs font-bold text-slate-800 truncate">{currentUser.full_name}</h4>
                <p className="text-xs font-extrabold text-blue-600">
                  ₦{currentUser.balance.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                </p>
              </div>
            </div>
          </div>

          {/* Navigation Items (Categorized exact structure) */}
          <nav className="flex-1 min-h-0 px-3 py-2 space-y-4 overflow-y-auto overscroll-contain sp-overlay-scroll">
            
            {/* 1. OVERVIEW */}
            <div>
              <p className="px-3 pb-1 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                Overview
              </p>
              <div className="space-y-1">
                {currentUser?.role === 'admin' && (
                  <button 
                    type="button"
                    id="admin-view-button"
                    onClick={() => handleItemClick('admin')}
                    className="w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-colors cursor-pointer text-left bg-purple-50 hover:bg-purple-100 text-purple-700 hover:text-purple-800 border border-purple-200/80 shadow-xs"
                    title="Return to Admin Dashboard"
                  >
                    <div className="flex items-center gap-2.5">
                      <svg className="w-4 h-4 sm:w-5 sm:h-5 shrink-0 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                      <span>Admin view</span>
                    </div>
                    <span className="text-[10px] font-bold uppercase tracking-wider bg-purple-200/80 text-purple-800 px-1.5 py-0.5 rounded-md shrink-0">
                      Admin
                    </span>
                  </button>
                )}

                <button 
                  type="button"
                  onClick={() => handleItemClick('dashboard')}
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs sm:text-sm font-medium transition-colors cursor-pointer text-left ${
                    currentRoute === 'dashboard'
                      ? 'bg-blue-600 text-white font-semibold shadow-xs' 
                      : 'text-slate-700 hover:bg-slate-100 hover:text-blue-600'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <svg className="w-4 h-4 sm:w-5 sm:h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                    </svg>
                    <span>Overview</span>
                  </div>
                </button>
              </div>
            </div>

            {/* 2. MARKETPLACE */}
            <div>
              <p className="px-3 pb-1 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                Marketplace
              </p>
              <div className="space-y-0.5">
                <button 
                  type="button"
                  onClick={() => handleItemClick('marketplace')}
                  className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs sm:text-sm font-medium transition-colors cursor-pointer text-left ${
                    currentRoute === 'marketplace'
                      ? 'bg-blue-600 text-white font-semibold shadow-xs'
                      : 'text-slate-700 hover:bg-slate-100 hover:text-blue-600'
                  }`}
                >
                  <svg className="w-4 h-4 sm:w-5 sm:h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                  </svg>
                  <span>Marketplace</span>
                </button>

                <button 
                  type="button"
                  onClick={() => handleItemClick('orders')}
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs sm:text-sm font-medium transition-colors cursor-pointer text-left ${
                    currentRoute === 'orders' 
                      ? 'bg-blue-600 text-white font-semibold shadow-xs' 
                      : 'text-slate-700 hover:bg-slate-100 hover:text-blue-600'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <svg className="w-4 h-4 sm:w-5 sm:h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
                    </svg>
                    <span>My Orders</span>
                  </div>
                  {activeOrdersCount > 0 && (
                    <span className={`px-2 py-0.5 text-[11px] font-bold rounded-full ${
                      currentRoute === 'orders' ? 'bg-white text-blue-600' : 'bg-blue-100 text-blue-700'
                    }`}>
                      {activeOrdersCount}
                    </span>
                  )}
                </button>

                <button 
                  type="button"
                  onClick={() => handleItemClick('custom-orders')}
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs sm:text-sm font-medium transition-colors cursor-pointer text-left ${
                    currentRoute === 'custom-orders' 
                      ? 'bg-blue-600 text-white font-semibold shadow-xs' 
                      : 'text-slate-700 hover:bg-slate-100 hover:text-blue-600'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <svg className="w-4 h-4 sm:w-5 sm:h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
                    </svg>
                    <span>Custom Projects</span>
                  </div>
                  {pendingCustomCount > 0 && (
                    <span className={`px-2 py-0.5 text-[11px] font-bold rounded-full ${
                      currentRoute === 'custom-orders' ? 'bg-white text-blue-600' : 'bg-indigo-100 text-indigo-700'
                    }`}>
                      {pendingCustomCount}
                    </span>
                  )}
                </button>

                <button 
                  type="button"
                  onClick={() => handleItemClick('boosting')}
                  className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs sm:text-sm font-medium transition-colors cursor-pointer text-left ${
                    currentRoute === 'boosting'
                      ? 'bg-blue-600 text-white font-semibold shadow-xs'
                      : 'text-slate-700 hover:bg-slate-100 hover:text-blue-600'
                  }`}
                >
                  <svg className="w-4 h-4 sm:w-5 sm:h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                  </svg>
                  <span>Boosting of Account</span>
                </button>

                <button 
                  type="button"
                  id="sidebar-nav-buy-accounts"
                  onClick={() => handleItemClick('social-logs')}
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs sm:text-sm font-medium transition-colors cursor-pointer text-left ${
                    currentRoute === 'social-logs' || currentRoute === 'logs' || currentRoute === 'accounts'
                      ? 'bg-blue-600 text-white font-semibold shadow-xs'
                      : 'text-slate-700 hover:bg-slate-100 hover:text-blue-600'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <svg className="w-4 h-4 sm:w-5 sm:h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                    </svg>
                    <span>Buy Accounts</span>
                  </div>
                  <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${
                    currentRoute === 'social-logs' || currentRoute === 'logs' || currentRoute === 'accounts'
                      ? 'bg-white text-blue-600' 
                      : 'bg-cyan-100 text-cyan-800'
                  }`}>
                    New
                  </span>
                </button>

                <button 
                  type="button"
                  onClick={() => handleItemClick('international-numbers')}
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs sm:text-sm font-medium transition-colors cursor-pointer text-left ${
                    currentRoute === 'international-numbers' || currentRoute === 'numbers' || currentRoute === 'otp'
                      ? 'bg-blue-600 text-white font-semibold shadow-xs' 
                      : 'text-slate-700 hover:bg-slate-100 hover:text-blue-600'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <svg className="w-4 h-4 sm:w-5 sm:h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                    </svg>
                    <span>International Numbers</span>
                  </div>
                  <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${
                    currentRoute === 'international-numbers' || currentRoute === 'numbers' || currentRoute === 'otp'
                      ? 'bg-white text-blue-600' 
                      : 'bg-emerald-100 text-emerald-700'
                  }`}>
                    Live
                  </span>
                </button>

                <button 
                  type="button"
                  id="sidebar-nav-reseller-api"
                  onClick={() => handleItemClick('reseller-api')}
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs sm:text-sm font-medium transition-colors cursor-pointer text-left ${
                    currentRoute === 'reseller-api' || currentRoute === 'api'
                      ? 'bg-blue-600 text-white font-semibold shadow-xs' 
                      : 'text-slate-700 hover:bg-slate-100 hover:text-blue-600'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <svg className="w-4 h-4 sm:w-5 sm:h-5 shrink-0 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
                    </svg>
                    <span>Reseller API</span>
                  </div>
                  <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${
                    currentRoute === 'reseller-api' || currentRoute === 'api'
                      ? 'bg-white text-blue-600' 
                      : 'bg-purple-100 text-purple-700'
                  }`}>
                    v1
                  </span>
                </button>
              </div>
            </div>

            {/* 3. BILLING & WALLET */}
            <div>
              <p className="px-3 pb-1 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                Billing & Wallet
              </p>
              <div className="space-y-0.5">
                <button 
                  type="button"
                  onClick={() => handleItemClick('wallet')}
                  className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs sm:text-sm font-medium transition-colors cursor-pointer text-left ${
                    currentRoute === 'wallet' 
                      ? 'bg-blue-600 text-white font-semibold shadow-xs' 
                      : 'text-slate-700 hover:bg-slate-100 hover:text-blue-600'
                  }`}
                >
                  <svg className="w-4 h-4 sm:w-5 sm:h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                  </svg>
                  <span>Wallet & Balance</span>
                </button>

                <button 
                  type="button"
                  onClick={() => handleItemClick('fund')}
                  className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs sm:text-sm font-medium transition-colors cursor-pointer text-left ${
                    currentRoute === 'fund' 
                      ? 'bg-blue-600 text-white font-semibold shadow-xs' 
                      : 'text-slate-700 hover:bg-slate-100 hover:text-blue-600'
                  }`}
                >
                  <svg className="w-4 h-4 sm:w-5 sm:h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                  </svg>
                  <span>Fund Account</span>
                </button>

                <button 
                  type="button"
                  onClick={() => handleItemClick('transactions')}
                  className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs sm:text-sm font-medium transition-colors cursor-pointer text-left ${
                    currentRoute === 'transactions' 
                      ? 'bg-blue-600 text-white font-semibold shadow-xs' 
                      : 'text-slate-700 hover:bg-slate-100 hover:text-blue-600'
                  }`}
                >
                  <svg className="w-4 h-4 sm:w-5 sm:h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 14l6-6m0 0l-6-6m6 6H3" />
                  </svg>
                  <span>Transactions</span>
                </button>
              </div>
            </div>

            {/* 4. REFERRALS */}
            <div>
              <p className="px-3 pb-1 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                Referrals
              </p>
              <button 
                type="button"
                onClick={() => handleItemClick('referrals')}
                className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs sm:text-sm font-medium transition-colors cursor-pointer text-left ${
                  currentRoute === 'referrals' 
                    ? 'bg-blue-600 text-white font-semibold shadow-xs' 
                    : 'text-slate-700 hover:bg-slate-100 hover:text-blue-600'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <svg className="w-4 h-4 sm:w-5 sm:h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span>Referrals & Rewards</span>
                </div>
                <span className={`px-2 py-0.5 text-[10px] font-bold rounded-full uppercase ${
                  currentUser.referral_unlocked || currentUser.role === 'admin'
                    ? currentRoute === 'referrals' ? 'bg-white text-purple-600' : 'bg-purple-100 text-purple-700'
                    : currentRoute === 'referrals' ? 'bg-white text-amber-600' : 'bg-amber-100 text-amber-800'
                }`}>
                  {currentUser.referral_unlocked || currentUser.role === 'admin' ? '₦10K' : 'Locked'}
                </span>
              </button>
            </div>

            {/* 5. ACCOUNT */}
            <div>
              <p className="px-3 pb-1 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                Account
              </p>
              <div className="space-y-0.5">
                <button 
                  type="button"
                  onClick={() => handleItemClick('support')}
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs sm:text-sm font-medium transition-colors cursor-pointer text-left ${
                    currentRoute === 'support' 
                      ? 'bg-blue-600 text-white font-semibold shadow-xs' 
                      : 'text-slate-700 hover:bg-slate-100 hover:text-blue-600'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <span className="text-sm">💬</span>
                    <span>Admin Support</span>
                  </div>
                  {openTicketsCount > 0 && (
                    <span className={`px-2 py-0.5 text-[11px] font-bold rounded-full ${
                      currentRoute === 'support' ? 'bg-white text-blue-600' : 'bg-amber-100 text-amber-800'
                    }`}>
                      {openTicketsCount}
                    </span>
                  )}
                </button>

                {/* WhatsApp Support Direct Link */}
                <a
                  href="https://wa.link/qfxlbm"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs sm:text-sm font-medium text-emerald-700 hover:bg-emerald-50 hover:text-emerald-800 transition-colors cursor-pointer text-left"
                >
                  <div className="flex items-center gap-2.5">
                    <span className="text-sm">🟢</span>
                    <span className="font-semibold">WhatsApp Support</span>
                  </div>
                  <span className="text-[10px] font-bold text-emerald-600 bg-emerald-100 px-1.5 py-0.5 rounded">
                    ↗
                  </span>
                </a>

                <button 
                  type="button"
                  onClick={() => handleItemClick('profile')}
                  className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs sm:text-sm font-medium transition-colors cursor-pointer text-left ${
                    currentRoute === 'profile' 
                      ? 'bg-blue-600 text-white font-semibold shadow-xs' 
                      : 'text-slate-700 hover:bg-slate-100 hover:text-blue-600'
                  }`}
                >
                  <svg className="w-4 h-4 sm:w-5 sm:h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                  <span>Profile Settings</span>
                </button>
              </div>
            </div>

          </nav>

          {/* Bottom Logout Area */}
          <div className="p-3 border-t border-slate-100 mt-auto shrink-0 bg-slate-50/50">
            <button 
              type="button"
              onClick={() => handleItemClick('logout')}
              className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs sm:text-sm font-semibold text-red-600 hover:bg-red-50 transition-colors cursor-pointer text-left"
            >
              <svg className="w-4 h-4 sm:w-5 sm:h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
              <span>Logout</span>
            </button>
          </div>

        </div>
      </aside>
    </>
  );
};

export default Sidebar;
