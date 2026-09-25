/**
 * Surest Plug - Header Navigation Component
 * Features collapsible User and Admin dropdown menus with click-outside, Escape key,
 * single-dropdown-at-a-time enforcement, and full role-based security.
 */

import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { User, Notification } from '../types';
import { store } from '../lib/store';
import { useBodyScrollLock } from '../lib/scrollLock';

interface HeaderProps {
  currentUser: User | null;
  onNavigate: (route: string, params?: any) => void;
  onOpenComingSoon: (serviceName: string) => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
}

type DropdownType = 'services' | 'notifications' | 'user' | null;

export const Header: React.FC<HeaderProps> = ({
  currentUser,
  onNavigate,
  onOpenComingSoon,
  searchQuery,
  onSearchChange
}) => {
  // Single active dropdown state ensures only one dropdown is open at any time
  const [activeDropdown, setActiveDropdown] = useState<DropdownType>(null);

  // Lock body scroll when notifications panel is open on mobile/tablet
  useBodyScrollLock(activeDropdown === 'notifications');

  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);

  const headerRef = useRef<HTMLElement>(null);
  const bellRef = useRef<HTMLButtonElement>(null);
  const notifDropdownRef = useRef<HTMLDivElement>(null);
  const [bellPos, setBellPos] = useState<{ top: number; right: number } | null>(null);

  // Update bell position for positioning dropdown on tablets/desktops
  useEffect(() => {
    if (activeDropdown === 'notifications' && bellRef.current) {
      const rect = bellRef.current.getBoundingClientRect();
      setBellPos({
        top: rect.bottom + 8,
        right: Math.max(12, window.innerWidth - rect.right)
      });
    }
  }, [activeDropdown]);

  // Close dropdown on outside click or Escape key press
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      if (notifDropdownRef.current && notifDropdownRef.current.contains(target)) {
        return;
      }
      if (bellRef.current && bellRef.current.contains(target)) {
        return;
      }
      if (headerRef.current && !headerRef.current.contains(target)) {
        setActiveDropdown(null);
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setActiveDropdown(null);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  // Notifications listener
  useEffect(() => {
    if (!currentUser) {
      setNotifications([]);
      setUnreadCount(0);
      return;
    }

    const loadNotifications = () => {
      const list = store.getNotifications(currentUser.id);
      setNotifications(list);
      setUnreadCount(list.filter(n => !n.read_status).length);
    };

    loadNotifications();
    const unsubscribe = store.subscribe(loadNotifications);
    return () => unsubscribe();
  }, [currentUser]);

  const toggleDropdown = (type: DropdownType) => {
    setActiveDropdown(prev => (prev === type ? null : type));
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setActiveDropdown(null);
    onNavigate('marketplace', { search: searchQuery });
  };

  const handleMarkAllRead = () => {
    if (!currentUser) return;
    store.markAllNotificationsAsRead(currentUser.id);
  };

  const handleNotificationClick = (notif: Notification) => {
    if (!currentUser) return;
    store.markNotificationAsRead(notif.id, currentUser.id);
    setActiveDropdown(null);

    if (notif.link_route) {
      onNavigate(notif.link_route);
    } else if (notif.type === 'order') {
      onNavigate(currentUser.role === 'admin' ? 'admin' : 'orders');
    } else if (notif.type === 'deposit') {
      onNavigate(currentUser.role === 'admin' ? 'admin' : 'wallet');
    } else if (notif.type === 'wallet' || notif.type === 'referral') {
      onNavigate('wallet');
    } else if (notif.type === 'support') {
      onNavigate(currentUser.role === 'admin' ? 'admin' : 'support');
    } else if (notif.type === 'product') {
      onNavigate('marketplace');
    } else if (notif.type === 'update') {
      onNavigate('updates');
    }
  };

  const formatTimeAgo = (dateStr: string) => {
    const diff = (Date.now() - new Date(dateStr).getTime()) / 1000;
    if (diff < 60) return 'Just now';
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const navigateAndClose = (route: string, params?: any) => {
    setActiveDropdown(null);
    onNavigate(route, params);
  };

  const isAdmin = currentUser && currentUser.role === 'admin';

  return (
    <header ref={headerRef} className="bg-white border-b border-slate-200/80 select-none relative z-20">
      <div className="max-w-7xl mx-auto px-2.5 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 sm:h-20 gap-1.5 sm:gap-3 lg:gap-4">
          
          {/* Zone 1: Brand & Logo */}
          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            <button 
              onClick={() => navigateAndClose('home')} 
              className="flex items-center gap-1.5 sm:gap-2.5 group text-left cursor-pointer"
            >
              <img 
                src="https://www.image2url.com/r2/default/images/1787828243533-7b9f3864-3fef-41b2-84e9-a00088ba5494.jpg" 
                alt="Surest Plug" 
                className="h-7 w-7 sm:h-9 sm:w-9 rounded-full object-cover shadow-xs ring-1 ring-blue-500/20 transition-transform group-hover:scale-105 shrink-0"
                onError={(e) => {
                  (e.target as HTMLImageElement).src = '/sp-logo.png';
                }}
              />
              <div className="flex flex-col">
                <span className="text-base sm:text-xl font-extrabold tracking-tight text-blue-700 leading-tight whitespace-nowrap">
                  Surest<span className="text-slate-900">Plug</span>
                </span>
              </div>
            </button>
          </div>

          {/* Desktop Search Bar (Hidden on Mobile, takes flex space on desktop) */}
          <div className="hidden md:flex items-center flex-1 min-w-0 max-w-md lg:max-w-xl mx-2 lg:mx-4">
            <form onSubmit={handleSearchSubmit} className="relative w-full min-w-0">
              <input 
                type="text" 
                placeholder="Search ready-made websites, services..." 
                value={searchQuery}
                onChange={(e) => onSearchChange(e.target.value)}
                className="w-full min-w-0 pl-10 pr-4 py-2 text-sm bg-slate-100/80 hover:bg-slate-100 focus:bg-white text-slate-900 placeholder-slate-400 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent transition-all"
              />
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
            </form>
          </div>

          {/* Services Dropdown Control (All Screen Sizes, cleanly positioned between Logo/Search and Actions) */}
          <div className="relative shrink-0 flex items-center">
            <button 
              type="button" 
              onClick={() => toggleDropdown('services')}
              className={`inline-flex items-center gap-1 sm:gap-1.5 px-2 sm:px-3 py-1.5 text-xs sm:text-sm font-semibold rounded-lg sm:rounded-xl transition-colors whitespace-nowrap cursor-pointer shrink-0 ${
                activeDropdown === 'services' ? 'bg-blue-50 text-blue-600 font-semibold ring-1 ring-blue-500/30' : 'text-slate-700 hover:text-blue-600 hover:bg-slate-50'
              }`}
              aria-label="Services Menu"
              aria-expanded={activeDropdown === 'services'}
            >
              <span>Services</span>
              <svg 
                className={`w-3 h-3 sm:w-3.5 sm:h-3.5 transition-transform duration-200 shrink-0 ${activeDropdown === 'services' ? 'rotate-180 text-blue-600' : 'text-slate-500'}`} 
                fill="none" 
                stroke="currentColor" 
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19 9l-7 7-7-7" />
              </svg>
            </button>

            {activeDropdown === 'services' && (
              <>
                {/* Mobile backdrop to dismiss dropdown cleanly on outside tap */}
                <div 
                  className="fixed inset-0 bg-slate-900/20 backdrop-blur-xs z-40 sm:hidden"
                  onClick={() => setActiveDropdown(null)}
                  aria-hidden="true"
                />

                {/* Services Dropdown Menu - bounded to viewport on mobile, anchored on tablet/desktop */}
                <div 
                  className="fixed inset-x-3 top-16 sm:absolute sm:inset-x-auto sm:top-full sm:left-0 sm:mt-2 sm:w-72 max-w-[calc(100vw-24px)] bg-white rounded-2xl shadow-2xl border border-slate-100 py-2 z-50 animate-in fade-in zoom-in-95 duration-150 max-h-[calc(100dvh-5rem)] overflow-y-auto overscroll-contain sp-overlay-scroll"
                  onClick={(e) => e.stopPropagation()}
                >
                  <button 
                    onClick={() => navigateAndClose('marketplace')}
                    className="w-full text-left flex items-center gap-3 px-4 py-2.5 text-sm text-slate-700 hover:bg-blue-50 hover:text-blue-600 cursor-pointer transition-colors"
                  >
                    <span className="w-2 h-2 rounded-full bg-blue-600 shrink-0"></span>
                    <span className="font-medium">Ready-Made Websites</span>
                  </button>
                  <button 
                    onClick={() => navigateAndClose('custom-website')}
                    className="w-full text-left flex items-center gap-3 px-4 py-2.5 text-sm text-slate-700 hover:bg-blue-50 hover:text-blue-600 cursor-pointer transition-colors"
                  >
                    <span className="w-2 h-2 rounded-full bg-indigo-600 shrink-0"></span>
                    <span className="font-medium">Custom Websites</span>
                  </button>
                  <button 
                    onClick={() => navigateAndClose('boosting')}
                    className="w-full text-left flex items-center gap-3 px-4 py-2.5 text-sm text-slate-700 hover:bg-blue-50 hover:text-blue-600 cursor-pointer transition-colors"
                  >
                    <span className="w-2 h-2 rounded-full bg-emerald-600 shrink-0"></span>
                    <span className="font-medium">Boost Account</span>
                  </button>
                  <button 
                    id="dropdown-nav-buy-accounts"
                    onClick={() => navigateAndClose('social-logs')}
                    className="w-full text-left flex items-center justify-between px-4 py-2.5 text-sm text-slate-700 hover:bg-blue-50 hover:text-blue-600 cursor-pointer transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <span className="w-2 h-2 rounded-full bg-cyan-500 shrink-0"></span>
                      <span className="font-medium">Buy Accounts (Social Media & Logs)</span>
                    </div>
                    <span className="text-[10px] font-bold uppercase tracking-wider bg-blue-100 text-blue-800 px-2 py-0.5 rounded-full shrink-0">New</span>
                  </button>
                  <button 
                    onClick={() => navigateAndClose('international-numbers')}
                    className="w-full text-left flex items-center justify-between px-4 py-2.5 text-sm text-slate-700 hover:bg-blue-50 hover:text-blue-600 cursor-pointer transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <span className="w-2 h-2 rounded-full bg-amber-400 shrink-0"></span>
                      <span className="font-medium">International Numbers</span>
                    </div>
                    <span className="text-[10px] font-bold uppercase tracking-wider bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full shrink-0">Live</span>
                  </button>
                </div>
              </>
            )}
          </div>

          {/* Zone 3: Actions, Menus & Accounts */}
          <div className="flex items-center gap-1 sm:gap-2.5 shrink-0">
            {currentUser ? (
              <>
                {/* Wallet Balance Pill */}
                <button 
                  onClick={() => navigateAndClose('wallet')}
                  className="hidden md:flex items-center gap-2 px-3 py-1.5 bg-blue-50 text-blue-700 rounded-xl text-xs sm:text-sm font-semibold border border-blue-100 hover:bg-blue-100 transition-colors cursor-pointer shrink-0"
                  title="View Wallet Balance"
                >
                  <svg className="w-4 h-4 text-blue-600 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                  </svg>
                  <span className="whitespace-nowrap">₦{currentUser.balance.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
                </button>

                {/* Notifications Bell Button */}
                <div className="relative shrink-0">
                  <button 
                    ref={bellRef}
                    onClick={() => toggleDropdown('notifications')}
                    className={`relative p-1.5 sm:p-2 rounded-lg sm:rounded-xl transition-colors cursor-pointer shrink-0 ${
                      activeDropdown === 'notifications' ? 'bg-blue-50 text-blue-600' : 'text-slate-700 hover:text-blue-600 hover:bg-slate-100'
                    }`}
                    title="Notifications"
                    aria-label="Notifications"
                  >
                    <svg 
                      className={`w-5 h-5 sm:w-6 sm:h-6 transition-transform ${unreadCount > 0 ? 'animate-bell-ring text-blue-600' : 'text-slate-600'}`} 
                      fill="none" 
                      stroke="currentColor" 
                      viewBox="0 0 24 24"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                    </svg>
                    
                    {unreadCount > 0 && (
                      <span className="absolute top-0.5 right-0.5 sm:top-1 sm:right-1 flex items-center justify-center min-w-[16px] h-[16px] sm:min-w-[18px] sm:h-[18px] px-1 text-[9px] sm:text-[10px] font-bold text-white bg-blue-600 rounded-full badge-glow ring-2 ring-white">
                        {unreadCount > 99 ? '99+' : unreadCount}
                      </span>
                    )}
                  </button>

                  {/* Independent Native Scroll Notification Overlay (Portal directly on document.body) */}
                  {activeDropdown === 'notifications' && typeof document !== 'undefined' && createPortal(
                    <>
                      {/* Mobile & tablet backdrop to dismiss dropdown cleanly and block outside touch gestures */}
                      <div 
                        className="fixed inset-0 bg-slate-900/25 backdrop-blur-xs sp-backdrop-touch-lock z-50 sm:hidden"
                        onClick={() => setActiveDropdown(null)}
                        onTouchMove={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                        }}
                        aria-hidden="true"
                      />

                      {/* Notification Panel Card - Independent Native Scroll Container */}
                      <div 
                        ref={notifDropdownRef}
                        className="fixed left-1/2 -translate-x-1/2 top-16 sm:left-auto sm:translate-x-0 w-[calc(100vw-24px)] sm:w-96 max-w-[380px] sm:max-w-none max-h-[calc(100dvh-5rem)] flex flex-col bg-white rounded-2xl shadow-2xl border border-slate-200/90 py-3 z-50 overscroll-contain touch-pan-y animate-in fade-in zoom-in-95 duration-150"
                        style={
                          typeof window !== 'undefined' && window.innerWidth >= 640 && bellPos
                            ? { top: `${bellPos.top}px`, right: `${bellPos.right}px` }
                            : undefined
                        }
                        onClick={(e) => e.stopPropagation()}
                      >
                        <div className="flex items-center justify-between px-4 pb-2.5 border-b border-slate-100 gap-2 shrink-0">
                          <div className="flex items-center gap-2 min-w-0">
                            <h4 className="text-sm font-bold text-slate-900 shrink-0">Notifications</h4>
                            {unreadCount > 0 && (
                              <span className="px-2 py-0.5 text-[10px] sm:text-xs font-semibold bg-blue-100 text-blue-700 rounded-full shrink-0">
                                {unreadCount} new
                              </span>
                            )}
                          </div>
                          {unreadCount > 0 && (
                            <button 
                              onClick={handleMarkAllRead}
                              className="text-xs font-semibold text-blue-600 hover:text-blue-800 transition-colors cursor-pointer shrink-0 whitespace-nowrap"
                            >
                              Mark all as read
                            </button>
                          )}
                        </div>

                        {/* Notification List with Native Inertial Scrolling */}
                        <div 
                          className="flex-1 min-h-0 overflow-y-auto overscroll-contain sp-overlay-scroll divide-y divide-slate-100 touch-pan-y"
                          style={{ WebkitOverflowScrolling: 'touch' }}
                        >
                          {notifications.length > 0 ? (
                            notifications.map((n, idx) => (
                              <div 
                                key={`notif-${n.id}-${idx}`}
                                onClick={() => handleNotificationClick(n)}
                                className={`p-3.5 hover:bg-slate-50 transition-colors cursor-pointer flex items-start gap-3 w-full min-w-0 ${
                                  !n.read_status ? 'bg-blue-50/60' : ''
                                }`}
                              >
                                <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 text-sm ${
                                  n.type === 'order' ? 'bg-blue-100 text-blue-600' :
                                  n.type === 'deposit' ? 'bg-emerald-100 text-emerald-600' :
                                  n.type === 'referral' ? 'bg-purple-100 text-purple-600' :
                                  n.type === 'wallet' ? 'bg-amber-100 text-amber-600' :
                                  n.type === 'product' ? 'bg-indigo-100 text-indigo-600' :
                                  n.type === 'update' ? 'bg-teal-100 text-teal-600' :
                                  'bg-slate-100 text-slate-600'
                                }`}>
                                  {n.type === 'order' ? '📦' :
                                   n.type === 'deposit' ? '💳' :
                                   n.type === 'referral' ? '🎁' :
                                   n.type === 'wallet' ? '💰' :
                                   n.type === 'product' ? '🌐' :
                                   n.type === 'update' ? '📢' : '🔔'}
                                </div>
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-start justify-between gap-2 mb-1">
                                    <p className={`text-xs font-bold break-words [overflow-wrap:anywhere] ${!n.read_status ? 'text-blue-900' : 'text-slate-800'}`}>
                                      {n.title}
                                    </p>
                                    <span className="text-[10px] text-slate-400 shrink-0 whitespace-nowrap mt-0.5">
                                      {formatTimeAgo(n.created_at)}
                                    </span>
                                  </div>
                                  <p className="text-xs text-slate-600 leading-relaxed break-words [overflow-wrap:anywhere]">
                                    {n.message}
                                  </p>
                                </div>
                                {!n.read_status && (
                                  <span className="w-2 h-2 rounded-full bg-blue-600 shrink-0 mt-1.5"></span>
                                )}
                              </div>
                            ))
                          ) : (
                            <div className="py-8 text-center px-4">
                              <p className="text-xs text-slate-500 font-medium">No notifications yet</p>
                            </div>
                          )}
                        </div>
                      </div>
                    </>,
                    document.body
                  )}
                </div>

                {/* Dashboard Menu Button: Navigates to user dashboard */}
                <button
                  id="header-dashboard-menu-button"
                  onClick={() => navigateAndClose('dashboard')}
                  className="inline-flex items-center gap-1 sm:gap-1.5 px-2.5 sm:px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white text-xs sm:text-sm font-semibold rounded-lg sm:rounded-xl shadow-xs hover:shadow-md transition-all whitespace-nowrap cursor-pointer shrink-0"
                  title="Open Dashboard"
                  aria-label="Dashboard"
                >
                  <svg className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                  </svg>
                  <span className="hidden min-[360px]:inline">Dashboard</span>
                  <span className="min-[360px]:hidden">Dash</span>
                </button>
              </>
            ) : (
              <>
                {/* Dashboard Button for guest: Quick access to portal */}
                <button
                  id="header-guest-dashboard-btn"
                  onClick={() => navigateAndClose('dashboard')}
                  className="inline-flex items-center gap-1 sm:gap-1.5 px-2 sm:px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs sm:text-sm font-semibold rounded-lg sm:rounded-xl transition-colors whitespace-nowrap cursor-pointer shrink-0"
                  title="Go to Dashboard"
                  aria-label="Dashboard"
                >
                  <svg className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                  </svg>
                  <span className="hidden min-[400px]:inline">Dashboard</span>
                </button>
                <button 
                  onClick={() => navigateAndClose('login')}
                  className="px-2 sm:px-3.5 py-1.5 sm:py-2 text-xs sm:text-sm font-medium text-slate-700 hover:text-blue-600 rounded-lg sm:rounded-xl hover:bg-slate-100 transition-colors whitespace-nowrap cursor-pointer shrink-0"
                >
                  Login
                </button>
                <button 
                  onClick={() => navigateAndClose('register')}
                  className="px-2.5 sm:px-4 py-1.5 sm:py-2 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white text-xs sm:text-sm font-semibold rounded-lg sm:rounded-xl shadow-xs hover:shadow-md transition-all whitespace-nowrap cursor-pointer shrink-0"
                >
                  <span className="hidden sm:inline">Create Account</span>
                  <span className="sm:hidden">Register</span>
                </button>
              </>
            )}

          </div>

        </div>
      </div>
    </header>
  );
};

export default Header;
