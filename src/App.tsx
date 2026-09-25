/**
 * Surest Plug - Main React Application
 * Full-featured digital marketplace for Ready-Made Websites, Custom Development, and SMM Boosting.
 * Direct real Firebase Authentication + FollowSPanel SMM integration.
 * Deployable on InfinityFree (PHP 8.x + MySQL backend + Vite React SPA).
 */

import React, { useState, useEffect } from 'react';
import { store } from './lib/store';
import { 
  loginWithFirebase, 
  registerWithFirebase, 
  loginWithGoogle, 
  logoutFirebase, 
  onFirebaseAuthStateChanged 
} from './lib/firebase';
import { User, Product, Order, Transaction, Deposit, CustomOrder, SupportTicket, SystemSettings } from './types';
import { loginWithPHP, registerWithPHP, getPHPCurrentUser } from './lib/phpAuth';

// Components
import { Header } from './components/Header';
import { AnnouncementTicker } from './components/AnnouncementTicker';
import { Footer } from './components/Footer';
import { SPLoader } from './components/SPLoader';
import { ErrorBoundary } from './components/ErrorBoundary';
import { ComingSoonModal } from './components/ComingSoonModal';
import { PurchaseCelebrationModal } from './components/PurchaseCelebrationModal';
import { PurchaseCelebrationToast } from './components/PurchaseCelebrationToast';
import { MilestoneCelebrationModal } from './components/MilestoneCelebrationModal';

// Pages
import { HomePage } from './pages/HomePage';
import { MarketplacePage } from './pages/MarketplacePage';
import { CustomWebsitePage } from './pages/CustomWebsitePage';
import { BoostingPage } from './pages/BoostingPage';
import { SocialMediaLogsPage } from './pages/SocialMediaLogsPage';
import { InternationalNumbersPage } from './pages/InternationalNumbersPage';
import { DashboardPage } from './pages/DashboardPage';
import { AdminDashboardPage } from './pages/AdminDashboardPage';
import { AuthPage } from './pages/AuthPages';
import { StaticPage } from './pages/StaticPages';
import { DeploymentZipPage } from './pages/DeploymentZipPage';

export const App: React.FC = () => {
  // Navigation & UI State
  const [currentRoute, setCurrentRoute] = useState<string>('home');
  const [dashboardTab, setDashboardTab] = useState<string>('dashboard');
  const [adminTab, setAdminTab] = useState<string>('overview');
  const [searchQuery, setSearchQuery] = useState<string>('');
  
  // Loading & Modal State
  const [isInitialLoading, setIsInitialLoading] = useState<boolean>(true);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [loadingMessage, setLoadingMessage] = useState<string>('Loading digital marketplace & services...');
  const [comingSoonService, setComingSoonService] = useState<string | null>(null);

  // Startup splash screen controller: Enforces minimum 5s duration with 8s failsafe timeout
  useEffect(() => {
    const MIN_SPLASH_TIME = 5000; // 5 seconds minimum
    const MAX_SPLASH_TIME = 8000; // 8 seconds maximum failsafe

    const minTimer = setTimeout(() => {
      setIsInitialLoading(false);
    }, MIN_SPLASH_TIME);

    const failsafeTimer = setTimeout(() => {
      setIsInitialLoading(false);
    }, MAX_SPLASH_TIME);

    return () => {
      clearTimeout(minTimer);
      clearTimeout(failsafeTimer);
    };
  }, []);
  
  // Celebration State (Purchase & Referral Milestone)
  const [celebrationOrder, setCelebrationOrder] = useState<Order | null>(null);
  const [showCelebrationToast, setShowCelebrationToast] = useState<boolean>(false);
  const [showCelebrationModal, setShowCelebrationModal] = useState<boolean>(false);
  const [milestoneCelebration, setMilestoneCelebration] = useState<{ user: User; code: string } | null>(null);

  // Core Data State
  const [currentUser, setCurrentUser] = useState<User | null>(store.getCurrentUser());
  const [products, setProducts] = useState<Product[]>(store.getProducts());
  const [orders, setOrders] = useState<Order[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [deposits, setDeposits] = useState<Deposit[]>([]);
  const [customOrders, setCustomOrders] = useState<CustomOrder[]>([]);
  const [supportTickets, setSupportTickets] = useState<SupportTicket[]>([]);
  const [settings, setSettings] = useState<SystemSettings>(store.getSettings());
  const [usersList, setUsersList] = useState<User[]>([]);

  // Refresh data whenever current user or route changes
  const refreshData = () => {
    const user = store.getCurrentUser();
    setCurrentUser(user);
    setProducts(store.getProducts());
    setSettings(store.getSettings());

    if (user) {
      if (user.role === 'admin') {
        setOrders(store.getOrders());
        setTransactions(store.getTransactions());
        setDeposits(store.getDeposits());
        setCustomOrders(store.getCustomOrders());
        setSupportTickets(store.getSupportTickets());
        setUsersList(store.getAllUsers());
      } else {
        setOrders(store.getUserOrders(user.id));
        setTransactions(store.getUserTransactions(user.id));
        setDeposits(store.getUserDeposits(user.id));
        setCustomOrders(store.getUserCustomOrders(user.id));
        setSupportTickets(store.getUserSupportTickets(user.id));
        setUsersList([]);
      }
    } else {
      setOrders([]);
      setTransactions([]);
      setDeposits([]);
      setCustomOrders([]);
      setSupportTickets([]);
      setUsersList([]);
    }
  };

  // Subscribe to store updates and listen to Firebase auth changes
  useEffect(() => {
    const unsubscribeStore = store.subscribe(() => {
      refreshData();
    });

    getPHPCurrentUser().then((res) => {
    if (res.success && res.user) {
      const syncedUser = store.syncServerUser(res.user);
      setCurrentUser(syncedUser);
      refreshData();
    }
  }).catch(() => {});

  const unsubscribeFirebase = onFirebaseAuthStateChanged((fbUser) => {
      if (fbUser && fbUser.email) {
        const syncedUser = store.syncFirebaseUser(
          fbUser.uid,
          fbUser.email,
          fbUser.displayName || 'Surest Plug User',
          fbUser.photoURL || undefined
        );
        setCurrentUser(syncedUser);
        store.hydrateAuthenticatedUserFromFirestore(fbUser.uid).then(() => refreshData());
      }
      refreshData();
    });

    refreshData();

    return () => {
      unsubscribeStore();
      unsubscribeFirebase();
    };
  }, []);

  // Sync initial history state and listen for browser/Android back & forward button navigation (popstate)
  useEffect(() => {
    if (typeof window === 'undefined') return;

    // Initialize current history entry if not already set
    if (!window.history.state || !window.history.state.route) {
      window.history.replaceState(
        { route: currentRoute, dashboardTab, adminTab },
        '',
        window.location.pathname + window.location.search
      );
    }

    const handlePopState = (event: PopStateEvent) => {
      if (event.state && event.state.route) {
        const targetRoute = event.state.route;
        const targetDashTab = event.state.dashboardTab || 'dashboard';
        const targetAdminTab = event.state.adminTab || 'overview';

        setCurrentRoute(targetRoute);
        if (targetDashTab) setDashboardTab(targetDashTab);
        if (targetAdminTab) setAdminTab(targetAdminTab);
      } else {
        // Fallback if user navigates back to initial entry point
        setCurrentRoute('home');
      }
    };

    window.addEventListener('popstate', handlePopState);
    return () => {
      window.removeEventListener('popstate', handlePopState);
    };
  }, []);

  useEffect(() => {
    refreshData();
  }, [currentRoute, dashboardTab, adminTab]);

  // Handle route transitions with SP spinning loader & sync browser history for Android Back Button
  const handleNavigate = (route: string, params?: any) => {
    if (route === 'logout') {
      triggerLoading('Signing out of Surest Plug....', async () => {
        await logoutFirebase();
        store.logout();
        setCurrentUser(null);
        setCurrentRoute('home');
        if (typeof window !== 'undefined') {
          window.history.pushState({ route: 'home', dashboardTab: 'dashboard', adminTab: 'overview' }, '', window.location.pathname);
        }
      });
      return;
    }

    if (['dashboard', 'orders', 'custom-orders', 'wallet', 'fund', 'transactions', 'support', 'profile', 'referrals', 'referral', 'reseller-api', 'api'].includes(route)) {
      if (!currentUser) {
        setCurrentRoute('login');
        if (typeof window !== 'undefined') {
          window.history.pushState({ route: 'login' }, '', window.location.pathname);
        }
        return;
      }
      const targetDashTab = route === 'dashboard' 
        ? 'dashboard' 
        : (route === 'referrals' || route === 'referral' 
          ? 'referrals' 
          : (route === 'api' ? 'reseller-api' : route));
      setDashboardTab(targetDashTab);
      setCurrentRoute('dashboard');
      if (typeof window !== 'undefined') {
        window.history.pushState({ route: 'dashboard', dashboardTab: targetDashTab, adminTab }, '', window.location.pathname);
      }
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    if (route === 'admin') {
      if (!currentUser || currentUser.role !== 'admin') {
        alert('Access restricted to administrators.');
        return;
      }
      const targetAdminTab = params?.tab || adminTab;
      if (params?.tab) {
        setAdminTab(params.tab);
      }
      setCurrentRoute('admin');
      if (typeof window !== 'undefined') {
        window.history.pushState({ route: 'admin', dashboardTab, adminTab: targetAdminTab }, '', window.location.pathname);
      }
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    if (params?.search !== undefined) {
      setSearchQuery(params.search);
    }

    setCurrentRoute(route);
    if (typeof window !== 'undefined') {
      window.history.pushState({ route, dashboardTab, adminTab }, '', window.location.pathname);
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const triggerLoading = (message: string, callback: () => void | Promise<void>) => {
    setLoadingMessage(message);
    setIsLoading(true);

    // Watchdog timer: ensure loading state never locks the UI under any condition
    const watchdogTimer = setTimeout(() => {
      setIsLoading(false);
    }, 6000);

    setTimeout(async () => {
      try {
        await callback();
      } catch (err) {
        console.error('Action error:', err);
      } finally {
        clearTimeout(watchdogTimer);
        setIsLoading(false);
      }
    }, 400);
  };

  // Real Firebase Auth Handlers
  // MySQL/PHP email + password authentication
  const handleLogin = async (email: string, pass: string): Promise<boolean | string> => {
    try {
      const res = await loginWithPHP(email, pass);

      if (res.success && res.user) {
        const syncedUser = store.syncServerUser(res.user);
        setCurrentUser(syncedUser);
        refreshData();
        setCurrentRoute(syncedUser.role === 'admin' ? 'admin' : 'dashboard');
        return true;
      }

      return res.error || 'Invalid email or password. Please verify your credentials.';
    } catch (err: any) {
      return err.message || 'Login failed. Please try again.';
    }
  };

  const handleRegister = async (
    name: string,
    email: string,
    pass: string,
    phone?: string,
    referralCode?: string
  ): Promise<boolean | string> => {
    try {
      const res = await registerWithPHP(name, email, pass, phone, referralCode);

      if (res.success && res.user) {
        const syncedUser = store.syncServerUser(res.user);
        setCurrentUser(syncedUser);
        refreshData();
        setCurrentRoute('dashboard');
        return true;
      }

      return res.error || 'Registration failed. Please check your information.';
    } catch (err: any) {
      return err.message || 'Registration failed. Please try again.';
    }
  };

  const handleGoogleAuth = async () => {
    triggerLoading('Connecting to Google....', async () => {
      try {
        const res = await loginWithGoogle();
        if (res.success && res.user && res.user.email) {
          const syncedUser = store.syncFirebaseUser(
            res.user.uid,
            res.user.email,
            res.user.displayName || 'Surest Plug User',
            res.user.photoURL || undefined
          );
          setCurrentUser(syncedUser);
        store.hydrateAuthenticatedUserFromFirestore(res.user.uid).then(() => refreshData());
          refreshData();
          setCurrentRoute(syncedUser.role === 'admin' ? 'admin' : 'dashboard');
        } else if (res.error) {
          alert(res.error);
        }
      } catch (err: any) {
        alert(err.message || 'Google authentication encountered an error.');
      }
    });
  };

  // Marketplace & Quick Purchase Handler
  const handleQuickBuy = (product: Product) => {
    if (!currentUser) {
      setCurrentRoute('login');
      return;
    }

    if (product.availability === 'out_of_stock') {
      alert('This ready-made website is currently out of stock.');
      return;
    }

    if (currentUser.balance < product.price) {
      setDashboardTab('fund');
      setCurrentRoute('dashboard');
      return;
    }

    triggerLoading('Processing order....', () => {
      const res = store.purchaseProduct(currentUser.id, product.id);
      if (res.order) {
        refreshData();
        setCelebrationOrder(res.order);
        setShowCelebrationToast(true);
        if (res.referralUnlockedNow && res.referralCode) {
          const freshUser = store.getCurrentUser();
          if (freshUser) {
            setMilestoneCelebration({ user: freshUser, code: res.referralCode });
          }
        }
        setDashboardTab('orders');
        setCurrentRoute('dashboard');
      } else if (res.error) {
        alert(res.error);
      }
    });
  };

  // Custom Website Request Handler
  const handleCustomOrderSubmit = (formData: any) => {
    if (!currentUser) return;
    triggerLoading('Submitting custom development brief....', () => {
      const req = store.createCustomOrder(currentUser.id, formData);
      refreshData();
      alert(`✅ Custom Website Request Submitted!\nReference: ${req.request_reference}\nOur engineering team will review your specifications.`);
      setDashboardTab('custom-orders');
      setCurrentRoute('dashboard');
    });
  };

  // SMM Boosting Order Handler (FollowSPanel API)
  const handleSmmOrderSubmit = (platform: string, serviceName: string, targetLink: string, quantity: number, price: number, serviceId?: number | string, ratePer1k?: number) => {
    if (!currentUser) return;
    triggerLoading('Dispatching FollowSPanel SMM order....', async () => {
      const res = await store.submitFollowSPanelBoostingOrder(currentUser.id, serviceId || 1, serviceName, platform, targetLink, quantity, price, ratePer1k);
      if (!res.success || res.error) {
        alert(res.error || 'Social media services are temporarily unavailable. Please try again later.');
      } else if (res.order) {
        refreshData();
        setCelebrationOrder(res.order);
        setShowCelebrationToast(true);
        setDashboardTab('orders');
        setCurrentRoute('dashboard');
      }
    });
  };

  // Deposit Submit Handler
  const handleDepositSubmit = (amount: number, method: string, reference?: string, proof?: string) => {
    if (!currentUser) return;
    if (!amount || isNaN(amount) || amount < 1000) {
      alert('Minimum funding amount is ₦1,000.');
      return;
    }
    triggerLoading('Submitting deposit for review....', () => {
      const res = store.createDeposit(currentUser.id, amount, method, reference, proof);
      if (res && res.error) {
        alert(res.error);
        return;
      }
      refreshData();
      setDashboardTab('transactions');
      setCurrentRoute('dashboard');
    });
  };

  // Support Ticket Handlers
  const handleCreateSupportTicket = (
    subject: string, 
    message: string, 
    messageType: 'text' | 'voice' = 'text', 
    audioData?: string, 
    audioDuration?: number
  ) => {
    if (!currentUser) return;
    triggerLoading('Submitting support request....', () => {
      store.createSupportTicket(currentUser.id, subject, message, 'medium', messageType, audioData, audioDuration);
      refreshData();
      alert('Support ticket submitted! An agent will respond promptly.');
    });
  };

  const handleReplySupportTicket = (
    ticketId: number, 
    message: string, 
    messageType: 'text' | 'voice' = 'text', 
    audioData?: string, 
    audioDuration?: number
  ) => {
    if (!currentUser) return;
    triggerLoading('Sending response....', () => {
      store.replySupportTicket(ticketId, currentUser.id, message, messageType, audioData, audioDuration);
      refreshData();
    });
  };

  const handleUpdateProfile = (updates: Partial<User>) => {
    if (!currentUser) return;
    triggerLoading('Updating profile....', () => {
      store.updateProfile(currentUser.id, updates);
      refreshData();
      alert('Profile updated successfully!');
    });
  };

  // Admin Action Handlers
  const handleAddProduct = (prodData: Partial<Product>) => {
    triggerLoading('Saving ready-made website to MySQL catalog....', () => {
      store.addProduct(prodData);
      refreshData();
      alert('✅ Ready-made website product successfully added to MySQL database!');
    });
  };

  const handleUpdateProduct = (productId: number, prodData: Partial<Product>) => {
    triggerLoading('Updating ready-made website in database....', () => {
      const res = store.updateProduct(productId, prodData);
      if (res.success) {
        refreshData();
        alert('✅ Ready-made website product updated successfully!');
      } else {
        alert(res.error || 'Failed to update product.');
      }
    });
  };

  const handleDeleteProduct = (productId: number) => {
    if (confirm('Are you sure you want to remove this product from the marketplace?')) {
      triggerLoading('Removing product....', () => {
        store.deleteProduct(productId);
        refreshData();
      });
    }
  };

  const handleAdjustUserBalance = (userId: number, amount: number, type: 'credit' | 'debit', reason: string) => {
    triggerLoading('Auditing balance adjustment....', () => {
      store.adjustUserBalance(userId, amount, type, reason);
      refreshData();
      alert(`User balance ${type === 'credit' ? 'credited' : 'debited'} successfully with audit log!`);
    });
  };

  const handleApproveDeposit = (depositId: number) => {
    triggerLoading('Approving deposit and crediting user....', () => {
      const res = store.approveDeposit(depositId);
      refreshData();
      if (res.success) {
        alert('Deposit approved and user wallet balance credited!');
      } else {
        alert(res.error || 'Failed to approve deposit.');
      }
    });
  };

  const handleRejectDeposit = (depositId: number) => {
    triggerLoading('Rejecting deposit....', () => {
      store.rejectDeposit(depositId);
      refreshData();
    });
  };

  const handleUpdateOrderStatus = (orderId: number, status: string) => {
    triggerLoading('Updating order status....', () => {
      store.updateOrderStatus(orderId, status);
      refreshData();
    });
  };

  const handleUpdateCustomOrderStatus = (requestId: number, status: string) => {
    triggerLoading('Updating custom request status....', () => {
      store.updateCustomOrderStatus(requestId, status);
      refreshData();
    });
  };

  const handleAdminTicketReply = (
    ticketId: number, 
    message: string, 
    messageType: 'text' | 'voice' = 'text', 
    audioData?: string, 
    audioDuration?: number
  ) => {
    if (!currentUser) return;
    triggerLoading('Submitting resolution....', () => {
      store.replySupportTicket(ticketId, currentUser.id, message, messageType, audioData, audioDuration);
      refreshData();
    });
  };

  const handleUpdateSettings = (newSettings: Partial<SystemSettings>) => {
    triggerLoading('Updating system settings....', () => {
      store.updateSettings(newSettings);
      refreshData();
    });
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans text-slate-900 selection:bg-blue-600 selection:text-white">
      
      {/* Global SP Loading Screen (Initial app state + action transitions) */}
      <SPLoader 
        isLoading={isInitialLoading || isLoading} 
        message={isInitialLoading ? 'Loading digital marketplace & services...' : loadingMessage} 
        isFullScreen={isInitialLoading}
      />

      {/* Global Coming Soon Modal */}
      <ComingSoonModal 
        isOpen={!!comingSoonService} 
        serviceName={comingSoonService || ''} 
        onClose={() => setComingSoonService(null)} 
      />

      {/* Sticky Top Header & Announcement Bar */}
      <div className="sticky top-0 z-40 w-full bg-white shadow-xs">
        <Header
          currentUser={currentUser}
          onNavigate={handleNavigate}
          onOpenComingSoon={(service) => setComingSoonService(service)}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
        />

        {/* Right-to-Left Scrolling Announcement Headline Bar */}
        <AnnouncementTicker onNavigate={handleNavigate} />
      </div>

      {/* Main Content Router */}
      <main className="flex-1">
        <ErrorBoundary fallbackTitle="Page Error" fallbackMessage="An error occurred while loading this page. Click below to return home.">
          {currentRoute === 'home' && (
            <HomePage
              products={products}
              currentUser={currentUser}
              onNavigate={handleNavigate}
              onOpenComingSoon={(service) => setComingSoonService(service)}
              onQuickBuy={handleQuickBuy}
            />
          )}

          {currentRoute === 'marketplace' && (
            <MarketplacePage
              products={products}
              currentUser={currentUser}
              initialSearch={searchQuery}
              onNavigate={handleNavigate}
              onQuickBuy={handleQuickBuy}
            />
          )}

          {currentRoute === 'custom-website' && (
            <CustomWebsitePage
              currentUser={currentUser}
              onSubmitCustomOrder={handleCustomOrderSubmit}
              onNavigate={handleNavigate}
            />
          )}

          {currentRoute === 'boosting' && (
            <BoostingPage
              currentUser={currentUser}
              onSubmitSmmOrder={handleSmmOrderSubmit}
              onNavigate={handleNavigate}
            />
          )}

          {(currentRoute === 'social-logs' || currentRoute === 'logs' || currentRoute === 'accounts') && (
            <SocialMediaLogsPage
              currentUser={currentUser}
              onNavigate={handleNavigate}
              onRequireAuth={() => handleNavigate('login')}
            />
          )}

          {(currentRoute === 'international-numbers' || currentRoute === 'numbers' || currentRoute === 'otp') && (
            <InternationalNumbersPage
              currentUser={currentUser}
              onNavigate={handleNavigate}
              onRequireAuth={() => handleNavigate('login')}
            />
          )}

          {currentRoute === 'dashboard' && (
            currentUser ? (
              <DashboardPage
                currentUser={currentUser}
                orders={orders}
                transactions={transactions}
                deposits={deposits}
                customOrders={customOrders}
                supportTickets={supportTickets}
                activeTab={dashboardTab}
                onTabChange={setDashboardTab}
                onNavigate={handleNavigate}
                onSubmitDeposit={handleDepositSubmit}
                onCreateSupportTicket={handleCreateSupportTicket}
                onReplySupportTicket={handleReplySupportTicket}
                onUpdateProfile={handleUpdateProfile}
              />
            ) : (
              <AuthPage
                mode="login"
                onLogin={handleLogin}
                onRegister={handleRegister}
                onGoogleAuth={handleGoogleAuth}
                onNavigate={handleNavigate}
              />
            )
          )}

          {currentRoute === 'admin' && (
            currentUser?.role === 'admin' ? (
              <AdminDashboardPage
                currentUser={currentUser}
                users={usersList}
                products={products}
                orders={orders}
                transactions={transactions}
                deposits={deposits}
                customOrders={customOrders}
                supportTickets={supportTickets}
                settings={settings}
                activeTab={adminTab}
                onTabChange={setAdminTab}
                onNavigate={handleNavigate}
                onAddProduct={handleAddProduct}
                onUpdateProduct={handleUpdateProduct}
                onDeleteProduct={handleDeleteProduct}
                onAdjustUserBalance={handleAdjustUserBalance}
                onApproveDeposit={handleApproveDeposit}
                onRejectDeposit={handleRejectDeposit}
                onUpdateOrderStatus={handleUpdateOrderStatus}
                onUpdateCustomOrderStatus={handleUpdateCustomOrderStatus}
                onReplyTicket={handleAdminTicketReply}
                onUpdateSettings={handleUpdateSettings}
              />
            ) : (
              <AuthPage
                mode="login"
                onLogin={handleLogin}
                onRegister={handleRegister}
                onGoogleAuth={handleGoogleAuth}
                onNavigate={handleNavigate}
              />
            )
          )}

          {(currentRoute === 'login' || currentRoute === 'register') && (
            <AuthPage
              mode={currentRoute}
              onLogin={handleLogin}
              onRegister={handleRegister}
              onGoogleAuth={handleGoogleAuth}
              onNavigate={handleNavigate}
            />
          )}

          {['about', 'how-it-works', 'contact', 'terms', 'privacy', 'refund'].includes(currentRoute) && (
            <StaticPage
              pageType={currentRoute as any}
              onNavigate={handleNavigate}
              onOpenComingSoon={(service) => setComingSoonService(service)}
              whatsappNumber={settings.whatsapp_number || settings.contact_whatsapp || '+2348141853557'}
              whatsappMessage={settings.whatsapp_message || 'Hello Surest Plug Support, I need assistance with my account / order.'}
            />
          )}

          {currentRoute === 'deploy-zip' && (
            <DeploymentZipPage onNavigate={handleNavigate} />
          )}

          {/* Ultimate Fallback: if route is unknown, render Home */}
          {!['home', 'marketplace', 'custom-website', 'boosting', 'social-logs', 'logs', 'accounts', 'international-numbers', 'numbers', 'otp', 'dashboard', 'admin', 'login', 'register', 'about', 'how-it-works', 'contact', 'terms', 'privacy', 'refund', 'deploy-zip'].includes(currentRoute) && (
            <HomePage
              products={products}
              currentUser={currentUser}
              onNavigate={handleNavigate}
              onOpenComingSoon={(service) => setComingSoonService(service)}
              onQuickBuy={handleQuickBuy}
            />
          )}
        </ErrorBoundary>
      </main>

      {/* Footer with working links to policies & floating WhatsApp support */}
      <Footer
        onNavigate={handleNavigate}
        onOpenComingSoon={(service) => setComingSoonService(service)}
        whatsappNumber={settings.whatsapp_number || '+2348000000000'}
      />

      {/* Animated Purchase Celebration Toast */}
      <PurchaseCelebrationToast
        order={showCelebrationToast ? celebrationOrder : null}
        onClose={() => {
          setShowCelebrationToast(false);
        }}
        onViewOrder={() => {
          setShowCelebrationToast(false);
          setShowCelebrationModal(true);
        }}
      />

      {/* Full Purchase Celebration Modal (Accessible from Toast or Direct trigger) */}
      <PurchaseCelebrationModal
        isOpen={showCelebrationModal}
        order={celebrationOrder}
        onClose={() => setShowCelebrationModal(false)}
        onViewOrder={() => {
          setShowCelebrationModal(false);
          setDashboardTab('orders');
          setCurrentRoute('dashboard');
        }}
      />

      {/* Automatic Milestone 10/10 Purchases Referral Unlock Celebration Modal */}
      {milestoneCelebration && (
        <MilestoneCelebrationModal
          isOpen={!!milestoneCelebration}
          user={milestoneCelebration.user}
          referralCode={milestoneCelebration.code}
          onClose={() => setMilestoneCelebration(null)}
          onGoToReferralDashboard={() => {
            setMilestoneCelebration(null);
            setDashboardTab('referrals');
            setCurrentRoute('dashboard');
          }}
        />
      )}

    </div>
  );
};

export default App;
