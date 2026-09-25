/**
 * Surest Plug - Admin Dashboard Sidebar Component
 * Fully responsive:
 * - Desktop: fixed sidebar on the left
 * - Mobile & Tablet: smooth slide-in navigation drawer from the left with overlay backdrop
 */

import React from 'react';
import { 
  LayoutDashboard, 
  Users, 
  Package, 
  ShoppingBag, 
  Zap, 
  Layers, 
  Smartphone, 
  CreditCard, 
  Globe, 
  ArrowLeftRight, 
  LifeBuoy, 
  Megaphone, 
  Settings, 
  LogOut, 
  X, 
  User as UserIcon,
  ChevronRight,
  Code2
} from 'lucide-react';
import { User, Deposit, CustomOrder, SupportTicket, Order } from '../types';
import { useBodyScrollLock } from '../lib/scrollLock';

interface AdminSidebarProps {
  currentTab: string;
  currentUser: User;
  deposits?: Deposit[];
  customOrders?: CustomOrder[];
  supportTickets?: SupportTicket[];
  orders?: Order[];
  mobileOpen?: boolean;
  onCloseMobile?: () => void;
  onTabChange: (tab: string) => void;
  onNavigate: (route: string) => void;
}

export const AdminSidebar: React.FC<AdminSidebarProps> = ({
  currentTab,
  currentUser,
  deposits = [],
  customOrders = [],
  supportTickets = [],
  orders = [],
  mobileOpen = false,
  onCloseMobile,
  onTabChange,
  onNavigate
}) => {
  const pendingDepositsCount = deposits.filter(d => d.status === 'pending').length;
  const pendingCustomOrdersCount = customOrders.filter(c => c.status === 'pending').length;
  const openTicketsCount = supportTickets.filter(s => s.status === 'open' || s.status === 'in_progress').length;
  const activeOrdersCount = orders.filter(o => o.status === 'pending' || o.status === 'processing').length;
  const activeNumberOrdersCount = orders.filter(o => 
    (o.category === 'numbers' || o.order_reference?.startsWith('SP-NUM-')) && 
    (o.status === 'pending' || o.status === 'processing')
  ).length;

  const handleItemClick = (tab: string) => {
    onTabChange(tab);
    if (onCloseMobile) {
      onCloseMobile();
    }
  };

  const handleNavigate = (route: string) => {
    onNavigate(route);
    if (onCloseMobile) {
      onCloseMobile();
    }
  };

  // Lock background page scroll when admin drawer is open on mobile/tablet
  useBodyScrollLock(Boolean(mobileOpen));

  const navRef = React.useRef<HTMLElement>(null);

  // Prevent scroll propagation from nav to window/screen on wheel gestures
  React.useEffect(() => {
    const navEl = navRef.current;
    if (!navEl) return;

    const onWheel = (e: WheelEvent) => {
      const { scrollTop, scrollHeight, clientHeight } = navEl;
      const canScrollUp = scrollTop > 0;
      const canScrollDown = scrollTop < (scrollHeight - clientHeight - 1);

      // If scrolling within bounds, stop propagation so window never receives the event
      if ((e.deltaY < 0 && canScrollUp) || (e.deltaY > 0 && canScrollDown)) {
        e.stopPropagation();
      } else {
        // At the scroll boundaries (top or bottom): prevent the whole screen from moving
        e.preventDefault();
        e.stopPropagation();
      }
    };

    navEl.addEventListener('wheel', onWheel, { passive: false });
    return () => {
      navEl.removeEventListener('wheel', onWheel);
    };
  }, []);

  return (
    <>
      {/* Mobile & Tablet Backdrop Overlay (only active when mobileOpen is true on < lg) */}
      <div 
        onClick={onCloseMobile}
        onTouchMove={(e) => e.preventDefault()}
        className={`fixed inset-0 z-40 bg-black/75 backdrop-blur-xs transition-opacity duration-300 lg:hidden ${
          mobileOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        }`}
        aria-hidden="true"
      />

      {/* Navigation Sidebar / Drawer */}
      <aside 
        className={`
          fixed inset-y-0 left-0 z-50 w-72 sm:w-80 max-w-[85vw] h-[100dvh] bg-slate-900 text-slate-300 border-r border-slate-800 p-4 flex flex-col justify-between shadow-2xl overflow-hidden
          transform transition-transform duration-300 ease-in-out
          lg:sticky lg:top-[140px] lg:h-[calc(100dvh-140px)] lg:self-start lg:inset-auto lg:z-30 lg:w-64 lg:transform-none lg:shadow-none shrink-0
          ${mobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
        `}
      >
        <div className="flex flex-col flex-1 min-h-0 overflow-hidden">
          
          {/* Top Info & Mobile Header */}
          <div className="shrink-0 space-y-4 pb-3">
            {/* Mobile Header with Close Button */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-800 lg:hidden">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse"></span>
                <span className="text-xs font-black uppercase tracking-wider text-white">
                  Admin Navigation
                </span>
              </div>
              <button
                onClick={onCloseMobile}
                aria-label="Close navigation menu"
                className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-all cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Admin Badge & Switch to User View */}
            <div className="p-3 bg-slate-800/80 rounded-2xl border border-slate-700/50 flex items-center justify-between">
              <div className="flex items-center gap-2.5 min-w-0">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse shrink-0"></span>
                <div className="min-w-0">
                  <p className="text-xs font-bold text-white leading-tight">Administrator</p>
                  <p className="text-[11px] text-slate-400 truncate max-w-[120px]">{currentUser.full_name}</p>
                </div>
              </div>
              <button 
                onClick={() => handleNavigate('dashboard')} 
                title="Switch to Customer Dashboard" 
                className="px-2.5 py-1 text-slate-300 hover:text-white rounded-xl bg-slate-700/50 hover:bg-slate-700 text-xs font-semibold cursor-pointer transition-colors shrink-0"
              >
                User View
              </button>
            </div>
          </div>

          {/* Navigation Items - Scrolls independently */}
          <nav 
            ref={navRef}
            className="flex-1 min-h-0 overflow-y-auto overscroll-contain sp-overlay-scroll space-y-1 pr-1.5 touch-pan-y isolate"
            style={{
              overscrollBehavior: 'contain',
              WebkitOverflowScrolling: 'touch'
            }}
          >
            {/* 1. Admin Overview */}
            <button 
              onClick={() => handleItemClick('overview')}
              className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm font-medium transition-colors cursor-pointer text-left min-h-[44px] ${
                currentTab === 'overview' ? 'bg-blue-600 text-white font-semibold shadow-xs' : 'text-slate-300 hover:bg-slate-800 hover:text-white'
              }`}
            >
              <div className="flex items-center gap-3">
                <LayoutDashboard className="w-4 h-4 shrink-0" />
                <span>Admin Overview</span>
              </div>
            </button>

            {/* 2. Users & Balances */}
            <button 
              onClick={() => handleItemClick('users')}
              className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm font-medium transition-colors cursor-pointer text-left min-h-[44px] ${
                currentTab === 'users' ? 'bg-blue-600 text-white font-semibold shadow-xs' : 'text-slate-300 hover:bg-slate-800 hover:text-white'
              }`}
            >
              <div className="flex items-center gap-3">
                <Users className="w-4 h-4 shrink-0" />
                <span>Users & Balances</span>
              </div>
            </button>

            {/* 3. Products Catalog */}
            <button 
              onClick={() => handleItemClick('products')}
              className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm font-medium transition-colors cursor-pointer text-left min-h-[44px] ${
                currentTab === 'products' ? 'bg-blue-600 text-white font-semibold shadow-xs' : 'text-slate-300 hover:bg-slate-800 hover:text-white'
              }`}
            >
              <div className="flex items-center gap-3">
                <Package className="w-4 h-4 shrink-0" />
                <span>Products Catalog</span>
              </div>
            </button>

            {/* 4. Orders Management */}
            <button 
              onClick={() => handleItemClick('orders')}
              className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm font-medium transition-colors cursor-pointer text-left min-h-[44px] ${
                currentTab === 'orders' ? 'bg-blue-600 text-white font-semibold shadow-xs' : 'text-slate-300 hover:bg-slate-800 hover:text-white'
              }`}
            >
              <div className="flex items-center gap-3">
                <ShoppingBag className="w-4 h-4 shrink-0" />
                <span>Orders Management</span>
              </div>
              {activeOrdersCount > 0 && (
                <span className="px-2 py-0.5 text-xs font-bold text-blue-600 bg-white rounded-full shadow-xs">
                  {activeOrdersCount}
                </span>
              )}
            </button>

            {/* 5. FollowSPanel (SMM) */}
            <button 
              onClick={() => handleItemClick('followspanel')}
              className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm font-medium transition-colors cursor-pointer text-left min-h-[44px] ${
                currentTab === 'followspanel' ? 'bg-blue-600 text-white font-semibold shadow-xs' : 'text-slate-300 hover:bg-slate-800 hover:text-white'
              }`}
            >
              <div className="flex items-center gap-3">
                <Zap className="w-4 h-4 shrink-0 text-amber-400" />
                <span>FollowSPanel</span>
              </div>
              <span className="flex items-center gap-1 px-2 py-0.5 text-[10px] font-bold text-emerald-400 bg-emerald-950/60 border border-emerald-800/60 rounded-full">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                SMM
              </span>
            </button>

            {/* 6. Cartlogs Logs */}
            <button 
              onClick={() => handleItemClick('cartlogs')}
              className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm font-medium transition-colors cursor-pointer text-left min-h-[44px] ${
                currentTab === 'cartlogs' ? 'bg-blue-600 text-white font-semibold shadow-xs' : 'text-slate-300 hover:bg-slate-800 hover:text-white'
              }`}
            >
              <div className="flex items-center gap-3">
                <Layers className="w-4 h-4 shrink-0 text-cyan-400" />
                <span>Cartlogs Logs</span>
              </div>
              <span className="flex items-center gap-1 px-2 py-0.5 text-[10px] font-bold text-cyan-400 bg-cyan-950/60 border border-cyan-800/60 rounded-full">
                <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse"></span>
                API
              </span>
            </button>

            {/* 7. International Numbers Provider */}
            <button 
              onClick={() => handleItemClick('numbers')}
              className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm font-medium transition-colors cursor-pointer text-left min-h-[44px] ${
                currentTab === 'numbers' ? 'bg-blue-600 text-white font-semibold shadow-xs' : 'text-slate-300 hover:bg-slate-800 hover:text-white'
              }`}
            >
              <div className="flex items-center gap-3">
                <Smartphone className="w-4 h-4 shrink-0 text-blue-400" />
                <span>International Numbers</span>
              </div>
              <span className="flex items-center gap-1 px-2 py-0.5 text-[10px] font-bold text-blue-400 bg-blue-950/60 border border-blue-800/60 rounded-full">
                <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse"></span>
                {activeNumberOrdersCount > 0 ? `${activeNumberOrdersCount} Active` : 'SMS'}
              </span>
            </button>

            {/* 8. Reseller API Management */}
            <button 
              onClick={() => handleItemClick('reseller')}
              className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm font-medium transition-colors cursor-pointer text-left min-h-[44px] ${
                currentTab === 'reseller' ? 'bg-blue-600 text-white font-semibold shadow-xs' : 'text-slate-300 hover:bg-slate-800 hover:text-white'
              }`}
            >
              <div className="flex items-center gap-3">
                <Code2 className="w-4 h-4 shrink-0 text-purple-400" />
                <span>Reseller API</span>
              </div>
              <span className="flex items-center gap-1 px-2 py-0.5 text-[10px] font-bold text-purple-400 bg-purple-950/60 border border-purple-800/60 rounded-full">
                v1
              </span>
            </button>

            {/* 8. Deposit Approvals */}
            <button 
              onClick={() => handleItemClick('deposits')}
              className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm font-medium transition-colors cursor-pointer text-left min-h-[44px] ${
                currentTab === 'deposits' ? 'bg-blue-600 text-white font-semibold shadow-xs' : 'text-slate-300 hover:bg-slate-800 hover:text-white'
              }`}
            >
              <div className="flex items-center gap-3">
                <CreditCard className="w-4 h-4 shrink-0 text-emerald-400" />
                <span>Deposit Approvals</span>
              </div>
              {pendingDepositsCount > 0 && (
                <span className="px-2 py-0.5 text-xs font-bold text-white bg-blue-500 rounded-full badge-glow">
                  {pendingDepositsCount}
                </span>
              )}
            </button>

            {/* 9. Custom Web Requests */}
            <button 
              onClick={() => handleItemClick('custom-orders')}
              className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm font-medium transition-colors cursor-pointer text-left min-h-[44px] ${
                currentTab === 'custom-orders' ? 'bg-blue-600 text-white font-semibold shadow-xs' : 'text-slate-300 hover:bg-slate-800 hover:text-white'
              }`}
            >
              <div className="flex items-center gap-3">
                <Globe className="w-4 h-4 shrink-0 text-indigo-400" />
                <span>Custom Web Requests</span>
              </div>
              {pendingCustomOrdersCount > 0 && (
                <span className="px-2 py-0.5 text-xs font-bold text-white bg-indigo-500 rounded-full badge-glow">
                  {pendingCustomOrdersCount}
                </span>
              )}
            </button>

            {/* 10. All Transactions */}
            <button 
              onClick={() => handleItemClick('transactions')}
              className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm font-medium transition-colors cursor-pointer text-left min-h-[44px] ${
                currentTab === 'transactions' ? 'bg-blue-600 text-white font-semibold shadow-xs' : 'text-slate-300 hover:bg-slate-800 hover:text-white'
              }`}
            >
              <div className="flex items-center gap-3">
                <ArrowLeftRight className="w-4 h-4 shrink-0" />
                <span>All Transactions</span>
              </div>
            </button>

            {/* 11. Support Tickets */}
            <button 
              onClick={() => handleItemClick('support')}
              className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm font-medium transition-colors cursor-pointer text-left min-h-[44px] ${
                currentTab === 'support' ? 'bg-blue-600 text-white font-semibold shadow-xs' : 'text-slate-300 hover:bg-slate-800 hover:text-white'
              }`}
            >
              <div className="flex items-center gap-3">
                <LifeBuoy className="w-4 h-4 shrink-0 text-amber-400" />
                <span>Support Tickets</span>
              </div>
              {openTicketsCount > 0 && (
                <span className="px-2 py-0.5 text-xs font-bold text-white bg-amber-500 rounded-full badge-glow">
                  {openTicketsCount}
                </span>
              )}
            </button>

            {/* 12. Site Updates & News */}
            <button 
              onClick={() => handleItemClick('updates')}
              className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm font-medium transition-colors cursor-pointer text-left min-h-[44px] ${
                currentTab === 'updates' ? 'bg-blue-600 text-white font-semibold shadow-xs' : 'text-slate-300 hover:bg-slate-800 hover:text-white'
              }`}
            >
              <div className="flex items-center gap-3">
                <Megaphone className="w-4 h-4 shrink-0" />
                <span>Site Updates & News</span>
              </div>
            </button>

            {/* 13. System & API Settings */}
            <button 
              onClick={() => handleItemClick('settings')}
              className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm font-medium transition-colors cursor-pointer text-left min-h-[44px] ${
                currentTab === 'settings' ? 'bg-blue-600 text-white font-semibold shadow-xs' : 'text-slate-300 hover:bg-slate-800 hover:text-white'
              }`}
            >
              <div className="flex items-center gap-3">
                <Settings className="w-4 h-4 shrink-0" />
                <span>System & API Settings</span>
              </div>
            </button>
          </nav>
        </div>

        {/* Logout Button (Pinned at bottom) */}
        <div className="pt-3 border-t border-slate-800 mt-2 shrink-0">
          <button 
            onClick={() => handleNavigate('logout')}
            className="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium text-red-400 hover:bg-red-950/40 hover:text-red-300 transition-colors cursor-pointer text-left min-h-[44px]"
          >
            <LogOut className="w-4 h-4 shrink-0" />
            <span>Logout</span>
          </button>
        </div>
      </aside>
    </>
  );
};

export default AdminSidebar;
