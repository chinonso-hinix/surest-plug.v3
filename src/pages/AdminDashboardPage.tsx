/**
 * Surest Plug - Admin Control Panel Component
 * Visual layout matches uploaded reference screenshot:
 * Dark sidebar, Admin stats cards, Product catalog CRUD, User balance management, Deposit approvals, SMM API config
 */

import React, { useState, useEffect } from 'react';
import { 
  Globe, 
  ExternalLink, 
  Download, 
  Image as ImageIcon, 
  Eye, 
  CheckCircle2, 
  Phone, 
  Mail, 
  User as UserIcon, 
  Calendar, 
  DollarSign, 
  Layers, 
  FileText, 
  Check,
  Tag,
  Clock,
  X,
  Menu
} from 'lucide-react';
import { User, Product, Order, Transaction, Deposit, CustomOrder, SupportTicket, SystemSettings, SiteUpdate } from '../types';
import { AdminSidebar } from '../components/AdminSidebar';
import { VoiceRecorder } from '../components/VoiceRecorder';
import { VoiceNotePlayer } from '../components/VoiceNotePlayer';
import { FollowSPanelDashboard } from '../components/FollowSPanelDashboard';
import { CartlogsDashboard } from '../components/CartlogsDashboard';
import { InternationalNumbersDashboard } from '../components/InternationalNumbersDashboard';
import { AdminResellerManagement } from '../components/AdminResellerManagement';
import { store } from '../lib/store';
import { useBodyScrollLock } from '../lib/scrollLock';
import { isTodayInLagos, formatNaira } from '../lib/dateUtils';

interface AdminDashboardPageProps {
  currentUser: User;
  users: User[];
  products: Product[];
  orders: Order[];
  transactions: Transaction[];
  deposits: Deposit[];
  customOrders: CustomOrder[];
  supportTickets: SupportTicket[];
  settings: SystemSettings;
  activeTab: string;
  onTabChange: (tab: string) => void;
  onNavigate: (route: string) => void;
  onAddProduct: (productData: Partial<Product>) => void;
  onUpdateProduct?: (productId: number, productData: Partial<Product>) => void;
  onDeleteProduct: (productId: number) => void;
  onAdjustUserBalance: (userId: number, amount: number, type: 'credit' | 'debit', reason: string) => void;
  onApproveDeposit: (depositId: number) => void;
  onRejectDeposit: (depositId: number) => void;
  onUpdateOrderStatus: (orderId: number, status: string) => void;
  onUpdateCustomOrderStatus: (requestId: number, status: string) => void;
  onReplyTicket: (ticketId: number, message: string, messageType?: 'text' | 'voice', audioData?: string, audioDuration?: number) => void;
  onUpdateSettings: (newSettings: Partial<SystemSettings>) => void;
}

export const AdminDashboardPage: React.FC<AdminDashboardPageProps> = ({
  currentUser,
  users,
  products,
  orders,
  transactions,
  deposits,
  customOrders,
  supportTickets,
  settings,
  activeTab,
  onTabChange,
  onNavigate,
  onAddProduct,
  onUpdateProduct,
  onDeleteProduct,
  onAdjustUserBalance,
  onApproveDeposit,
  onRejectDeposit,
  onUpdateOrderStatus,
  onUpdateCustomOrderStatus,
  onReplyTicket,
  onUpdateSettings
}) => {
  // Ready-made website product form & modal state
  const [showAddProductModal, setShowAddProductModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [previewLogo, setPreviewLogo] = useState<{ url: string; name: string } | null>(null);
  
  // Section 1: Website Information
  const [prodName, setProdName] = useState('');
  const [prodDesc, setProdDesc] = useState('');
  const [prodPrice, setProdPrice] = useState('');
  const [prodFeatures, setProdFeatures] = useState('');
  
  // Section 2: Website Preview
  const [prodImage, setProdImage] = useState('');
  const [prodImagePreview, setProdImagePreview] = useState('');
  const [prodDemoUrl, setProdDemoUrl] = useState('');
  
  // Section 3: Website Access (Admin Login Credentials for the website)
  const [prodAdminEmail, setProdAdminEmail] = useState('');
  const [prodAdminPassword, setProdAdminPassword] = useState('');
  const [showAdminPassword, setShowAdminPassword] = useState(false);
  
  // Section 4: Website Files
  const [prodZipName, setProdZipName] = useState('');
  const [prodZipSize, setProdZipSize] = useState<number>(0);
  const [prodZipData, setProdZipData] = useState('');
  const [prodZipPath, setProdZipPath] = useState('');
  const [uploadingZip, setUploadingZip] = useState(false);
  
  // Section 5: Publishing
  const [prodAvailability, setProdAvailability] = useState<'available' | 'out_of_stock' | 'sold'>('available');
  const [prodFeatured, setProdFeatured] = useState(false);

  // First-time Admin Welcome Modal state
  const [showAdminWelcomeModal, setShowAdminWelcomeModal] = useState(currentUser.role === 'admin' && currentUser.admin_welcome_seen === false);
  const [formError, setFormError] = useState('');

  // Mobile & Tablet Menu state
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const ADMIN_TAB_TITLES: Record<string, string> = {
    'overview': 'Admin Overview',
    'users': 'Users & Balances',
    'products': 'Products Catalog',
    'orders': 'Orders Management',
    'followspanel': 'FollowSPanel SMM',
    'cartlogs': 'Cartlogs Logs',
    'numbers': 'International Numbers',
    'reseller': 'Reseller API & Margins',
    'deposits': 'Deposit Approvals',
    'custom-orders': 'Custom Web Requests',
    'transactions': 'All Transactions',
    'support': 'Support Tickets',
    'updates': 'Site Updates & News',
    'settings': 'System & API Settings'
  };

  const openAddModal = () => {
    setEditingProduct(null);
    setProdName('');
    setProdDesc('');
    setProdPrice('');
    setProdFeatures('');
    setProdImage('');
    setProdImagePreview('');
    setProdDemoUrl('');
    setProdAdminEmail('');
    setProdAdminPassword('');
    setShowAdminPassword(false);
    setProdZipName('');
    setProdZipSize(0);
    setProdZipData('');
    setProdZipPath('');
    setProdAvailability('available');
    setProdFeatured(false);
    setFormError('');
    setShowAddProductModal(true);
  };

  const openEditModal = (product: Product) => {
    setEditingProduct(product);
    setProdName(product.name || '');
    setProdDesc(product.description || '');
    setProdPrice(String(product.price || ''));
    setProdFeatures(Array.isArray(product.features) ? product.features.join(', ') : '');
    setProdImage(product.image || product.preview_image_path || '');
    setProdImagePreview(product.image || product.preview_image_path || '');
    setProdDemoUrl(product.demo_url || '');
    setProdAdminEmail(product.admin_email || '');
    setProdAdminPassword(product.admin_password || '');
    setShowAdminPassword(false);
    setProdZipName(product.website_zip_name || '');
    setProdZipSize(product.website_zip_size || 0);
    setProdZipData(product.website_zip_data || '');
    setProdZipPath(product.website_zip_path || '');
    setProdAvailability(product.availability || 'available');
    setProdFeatured(!!product.featured);
    setFormError('');
    setShowAddProductModal(true);
  };

  const handleImageFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
      const extMatch = file.name.match(/\.(jpg|jpeg|png|webp)$/i);
      if (!validTypes.includes(file.type) && !extMatch) {
        setFormError('Please select a valid image file (.jpg, .jpeg, .png, .webp).');
        return;
      }
      setFormError('');
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result as string;
        setProdImage(result);
        setProdImagePreview(result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleZipFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!file.name.toLowerCase().endsWith('.zip')) {
        setFormError('Invalid file format. Please upload a valid .zip archive.');
        return;
      }
      setFormError('');
      setUploadingZip(true);
      const reader = new FileReader();
      reader.onload = () => {
        const base64Data = reader.result as string;
        setProdZipName(file.name);
        setProdZipSize(file.size);
        setProdZipData(base64Data);
        setProdZipPath(`uploads/websites/sp_web_${Date.now()}_${Math.random().toString(36).substring(2, 8)}.zip`);
        setUploadingZip(false);
      };
      reader.onerror = () => {
        setFormError('Failed to read ZIP archive. Please try again.');
        setUploadingZip(false);
      };
      reader.readAsDataURL(file);
    }
  };

  const formatBytes = (bytes: number): string => {
    if (!bytes || bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const handleProductFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');

    // Strict validation
    if (!prodName.trim()) {
      setFormError('Website Name is required.');
      return;
    }
    if (!prodDesc.trim()) {
      setFormError('Website Description is required.');
      return;
    }
    const priceNum = parseFloat(prodPrice);
    if (isNaN(priceNum) || priceNum <= 0) {
      setFormError('Please enter a valid price in ₦ (NGN).');
      return;
    }
    if (!prodImage && !prodImagePreview) {
      setFormError('Website Preview Image is required. Please upload a preview image.');
      return;
    }
    if (!prodAdminEmail.trim() || !prodAdminEmail.includes('@')) {
      setFormError('A valid Website Admin Login Email is required.');
      return;
    }
    if (!prodAdminPassword.trim()) {
      setFormError('Website Admin Login Password is required.');
      return;
    }

    // ZIP file validation
    if (!editingProduct && !prodZipData && !prodZipName) {
      setFormError('Upload Website ZIP File is required for new ready-made website products.');
      return;
    }

    const featureList = prodFeatures
      .split(/[\n,]/)
      .map(f => f.trim())
      .filter(f => f.length > 0);

    const productPayload: Partial<Product> = {
      name: prodName.trim(),
      description: prodDesc.trim(),
      price: priceNum,
      image: prodImage || prodImagePreview,
      preview_image_path: prodImage || prodImagePreview,
      demo_url: prodDemoUrl.trim() || undefined,
      admin_email: prodAdminEmail.trim(),
      admin_password: prodAdminPassword,
      website_zip_path: prodZipPath || editingProduct?.website_zip_path,
      website_zip_name: prodZipName || editingProduct?.website_zip_name,
      website_zip_size: prodZipSize || editingProduct?.website_zip_size,
      website_zip_data: prodZipData || editingProduct?.website_zip_data,
      features: featureList,
      availability: prodAvailability,
      featured: prodFeatured,
      category: 'ready_made_website',
      delivery_time: 'Instant ZIP Delivery'
    };

    if (editingProduct) {
      if (onUpdateProduct) {
        onUpdateProduct(editingProduct.id, productPayload);
      } else {
        store.updateProduct(editingProduct.id, productPayload);
      }
    } else {
      onAddProduct(productPayload);
    }

    setShowAddProductModal(false);
    setEditingProduct(null);
  };

  // User balance modal
  const [selectedUserForBalance, setSelectedUserForBalance] = useState<User | null>(null);
  const [balanceAmount, setBalanceAmount] = useState('5000');
  const [balanceAction, setBalanceAction] = useState<'credit' | 'debit'>('credit');
  const [balanceReason, setBalanceReason] = useState('Admin manual adjustment');

  // Deposit receipt preview modal
  const [viewingDepositReceipt, setViewingDepositReceipt] = useState<Deposit | null>(null);

  // Support reply state
  const [activeTicket, setActiveTicket] = useState<SupportTicket | null>(null);
  const [adminReplyText, setAdminReplyText] = useState('');
  const [adminReplyVoiceAudio, setAdminReplyVoiceAudio] = useState<string | null>(null);
  const [adminReplyVoiceDuration, setAdminReplyVoiceDuration] = useState<number>(0);

  // Site updates & announcements state
  const [updatesList, setUpdatesList] = useState<SiteUpdate[]>(store.getUpdates());
  const [showAddUpdateModal, setShowAddUpdateModal] = useState(false);
  const [editingUpdate, setEditingUpdate] = useState<SiteUpdate | null>(null);
  const [updateTitle, setUpdateTitle] = useState('');
  const [updateMessage, setUpdateMessage] = useState('');
  const [updateLink, setUpdateLink] = useState('');
  const [updateStatus, setUpdateStatus] = useState<'published' | 'draft'>('published');
  const [broadcastNotification, setBroadcastNotification] = useState(true);

  const isAnyAdminModalOpen = Boolean(
    previewLogo ||
    showAddProductModal ||
    selectedUserForBalance ||
    showAddUpdateModal ||
    showAdminWelcomeModal ||
    viewingDepositReceipt
  );
  useBodyScrollLock(isAnyAdminModalOpen);

  useEffect(() => {
    const unsub = store.subscribe(() => {
      setUpdatesList(store.getUpdates());
    });
    // STEP 9: When admin dashboard opens, fetch live balance from backend immediately
    handleFetchIntlBalance();
    return () => unsub();
  }, []);

  const openAddUpdateModal = () => {
    setEditingUpdate(null);
    setUpdateTitle('');
    setUpdateMessage('');
    setUpdateLink('');
    setUpdateStatus('published');
    setBroadcastNotification(true);
    setShowAddUpdateModal(true);
  };

  const openEditUpdateModal = (upd: SiteUpdate) => {
    setEditingUpdate(upd);
    setUpdateTitle(upd.title || '');
    setUpdateMessage(upd.message || '');
    setUpdateLink(upd.link || '');
    setUpdateStatus(upd.status || 'published');
    setBroadcastNotification(false);
    setShowAddUpdateModal(true);
  };

  const handleSaveUpdate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!updateTitle.trim() || !updateMessage.trim()) return;

    if (editingUpdate) {
      store.updateSiteAnnouncement(editingUpdate.id, {
        title: updateTitle.trim(),
        message: updateMessage.trim(),
        link: updateLink.trim() || undefined,
        status: updateStatus
      });
    } else {
      store.createSiteAnnouncement(
        updateTitle.trim(),
        updateMessage.trim(),
        updateStatus,
        undefined,
        updateLink.trim() || undefined
      );

      // Broadcast notification to all active users if selected and published
      if (broadcastNotification && updateStatus === 'published') {
        const allUsers = store.getAllUsers();
        allUsers.forEach(u => {
          store.createNotification(
            u.id,
            `📢 ${updateTitle.trim()}`,
            updateMessage.trim(),
            'update',
            undefined,
            'marketplace'
          );
        });
      }
    }

    setUpdatesList(store.getUpdates());
    setShowAddUpdateModal(false);
    setEditingUpdate(null);
  };

  const handleDeleteUpdate = (id: number) => {
    if (confirm('Delete this site announcement?')) {
      store.deleteSiteAnnouncement(id);
      setUpdatesList(store.getUpdates());
    }
  };

  const handleToggleUpdateStatus = (upd: SiteUpdate) => {
    const nextStatus = upd.status === 'published' ? 'draft' : 'published';
    store.updateSiteAnnouncement(upd.id, { status: nextStatus });
    setUpdatesList(store.getUpdates());
  };

  // Settings form
  const [bankName, setBankName] = useState(settings.bank_name || 'OPAY BANK');
  const [bankAccNum, setBankAccNum] = useState(settings.bank_account_number || '8141853557');
  const [bankAccName, setBankAccName] = useState(settings.bank_account_name || 'CHINONSO MONDAY');
  const [whatsapp, setWhatsapp] = useState(settings.contact_whatsapp || '+2348141853557');
  const [announcementHeadline, setAnnouncementHeadline] = useState(
    settings.announcement_headline || settings.announcementHeadline || 'Welcome to Surest Plug — Buy USA verification numbers from ₦1,000 | Instant Delivery & 24/7 Support'
  );
  const [announcementEnabled, setAnnouncementEnabled] = useState(
    settings.announcement_enabled ?? settings.announcementEnabled ?? true
  );
  const [smmBalanceInfo, setSmmBalanceInfo] = useState<{ balance: string; currency: string } | null>(null);
  const [smmConnectionState, setSmmConnectionState] = useState<'idle' | 'connected' | 'disconnected'>('idle');
  const [loadingSmmBalance, setLoadingSmmBalance] = useState(false);
  const [intlBalanceInfo, setIntlBalanceInfo] = useState<{
    balance_usd: number;
    balance_ngn: number;
    balanceUsd?: number;
    balanceNgn?: number;
    exchangeRate?: number;
    rate?: number;
    currency?: string;
    wallets?: { usd: number; ngn: number };
    lastUpdated?: string;
  } | null>(null);
  const [intlBalanceError, setIntlBalanceError] = useState<string | null>(null);
  const [intlBalanceLastUpdated, setIntlBalanceLastUpdated] = useState<Date | null>(null);
  const [loadingIntlBalance, setLoadingIntlBalance] = useState(false);

  const handleFetchIntlBalance = async () => {
    setLoadingIntlBalance(true);
    setIntlBalanceError(null);
    try {
      const res = await fetch('/api/international-numbers/balance');
      const data = await res.json();
      if (data.success && typeof data.balance_usd === 'number') {
        setIntlBalanceInfo({
          balance_usd: data.balance_usd,
          balance_ngn: data.balance_ngn,
          balanceUsd: data.balanceUsd ?? data.balance_usd,
          balanceNgn: data.balanceNgn ?? data.balance_ngn,
          exchangeRate: data.exchangeRate ?? data.rate ?? 1600,
          rate: data.rate ?? data.exchangeRate ?? 1600,
          currency: data.currency || 'USD',
          wallets: data.wallets,
          lastUpdated: data.lastUpdated
        });
        setIntlBalanceError(null);
        setIntlBalanceLastUpdated(new Date());
      } else {
        setIntlBalanceInfo(null);
        setIntlBalanceError(data.error || 'Unable to retrieve live InstantNums balance');
      }
    } catch (e: any) {
      setIntlBalanceInfo(null);
      setIntlBalanceError(e?.message || 'Unable to retrieve live InstantNums balance');
    } finally {
      setLoadingIntlBalance(false);
    }
  };

  const handleFetchSmmBalance = async () => {
    setLoadingSmmBalance(true);
    try {
      const res = await store.getSmmBalance();
      if (res.success && res.balance !== undefined && res.balance !== null) {
        setSmmBalanceInfo({ balance: res.balance, currency: res.currency || 'NGN' });
        setSmmConnectionState('connected');
      } else {
        setSmmBalanceInfo(null);
        setSmmConnectionState('disconnected');
        alert(res.error || 'Failed to connect to FollowSPanel provider.');
      }
    } catch (e: any) {
      setSmmBalanceInfo(null);
      setSmmConnectionState('disconnected');
      alert(e?.message || 'Failed to connect to FollowSPanel provider.');
    } finally {
      setLoadingSmmBalance(false);
    }
  };

  // Metrics
  // Today's Total Sales: calculates all completed/paid sales made during CURRENT CALENDAR DAY in Africa/Lagos
  const isSaleTransaction = (t: Transaction) => {
    // Exclude non-sales (deposits, admin balance credits/debits, refunds)
    const saleTypes = ['purchase', 'product_purchase', 'boosting_purchase', 'account_logs_purchase', 'international_number_purchase', 'custom_request_payment'];
    const isSaleType = saleTypes.includes(t.type);
    const isSuccessful = t.status === 'successful' || t.status === 'approved';
    return isSaleType && isSuccessful;
  };

  const isSaleOrder = (o: Order) => {
    // Only successful/paid/completed sales (exclude pending, cancelled, refunded, unpaid)
    const isCompleted = o.status === 'completed' || o.delivery_status === 'delivered';
    const isPaid = o.payment_status === 'paid';
    return isCompleted && isPaid && o.status !== 'cancelled' && o.status !== 'refunded';
  };

  // Primary calculation from transactions ledger (deduplicated by order_id or reference), or fallback to orders
  const todayTotalSales = React.useMemo(() => {
    // 1. Calculate from transactions
    const todaySalesTx = transactions.filter(t => isSaleTransaction(t) && isTodayInLagos(t.created_at));
    const txTotal = todaySalesTx.reduce((acc, t) => acc + (Number(t.amount) || 0), 0);

    // 2. Also check orders created today
    const todaySalesOrders = orders.filter(o => isSaleOrder(o) && isTodayInLagos(o.created_at));
    const ordersTotal = todaySalesOrders.reduce((acc, o) => acc + (Number(o.amount) || 0), 0);

    // Return the maximum of txTotal or ordersTotal to ensure all completed orders today are accounted for
    return Math.max(txTotal, ordersTotal);
  }, [transactions, orders]);

  const totalRevenue = React.useMemo(() => {
    const allSalesTx = transactions.filter(isSaleTransaction);
    const txTotal = allSalesTx.reduce((acc, t) => acc + (Number(t.amount) || 0), 0);

    const allSalesOrders = orders.filter(isSaleOrder);
    const ordersTotal = allSalesOrders.reduce((acc, o) => acc + (Number(o.amount) || 0), 0);

    return Math.max(txTotal, ordersTotal);
  }, [transactions, orders]);

  const totalUserBalances = users.reduce((acc, u) => acc + u.balance, 0);
  const pendingDepositsCount = deposits.filter(d => d.status === 'pending').length;
  const openTicketsCount = supportTickets.filter(t => t.status === 'open' || t.status === 'in_progress').length;

  const handleBalanceSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUserForBalance) return;
    onAdjustUserBalance(
      selectedUserForBalance.id,
      parseFloat(balanceAmount) || 0,
      balanceAction,
      balanceReason
    );
    setSelectedUserForBalance(null);
  };

  const handleAdminTicketReply = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeTicket) return;

    if (adminReplyVoiceAudio) {
      onReplyTicket(
        activeTicket.id,
        adminReplyText || 'Admin voice note resolution',
        'voice',
        adminReplyVoiceAudio,
        adminReplyVoiceDuration
      );
      setAdminReplyText('');
      setAdminReplyVoiceAudio(null);
      setAdminReplyVoiceDuration(0);
    } else {
      if (!adminReplyText.trim()) return;
      onReplyTicket(activeTicket.id, adminReplyText.trim(), 'text');
      setAdminReplyText('');
    }
  };

  const handleSettingsSave = (e: React.FormEvent) => {
    e.preventDefault();
    onUpdateSettings({
      bank_name: bankName,
      bank_account_number: bankAccNum,
      bank_account_name: bankAccName,
      contact_whatsapp: whatsapp,
      announcement_headline: announcementHeadline,
      announcementHeadline: announcementHeadline,
      announcement_enabled: announcementEnabled,
      announcementEnabled: announcementEnabled,
    });
    alert('System & routing settings updated successfully!');
  };

  return (
    <div className="min-h-[calc(100vh-5rem)] bg-slate-950 text-slate-100 flex flex-col lg:flex-row lg:items-start w-full max-w-full overflow-x-clip relative">
      
      {/* Mobile & Tablet Admin Top Navigation Bar (< lg only) */}
      <div className="lg:hidden w-full bg-slate-900/95 backdrop-blur-md border-b border-slate-800 px-4 py-3 sticky top-0 z-30 flex items-center justify-between shadow-md">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-label={mobileMenuOpen ? "Close Admin Menu" : "Open Admin Menu"}
            className="px-3 py-2 bg-slate-800 hover:bg-slate-700 active:bg-slate-600 text-white rounded-xl border border-slate-700 transition-all flex items-center gap-2 cursor-pointer shadow-xs min-h-[44px]"
          >
            {mobileMenuOpen ? (
              <X className="w-5 h-5 text-blue-400" />
            ) : (
              <Menu className="w-5 h-5 text-blue-400" />
            )}
            <span className="text-xs font-bold text-slate-100">
              {mobileMenuOpen ? 'Close' : 'Menu'}
            </span>
          </button>

          <div className="flex flex-col min-w-0">
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shrink-0"></span>
              <span className="text-xs font-extrabold text-white tracking-tight truncate">Admin Panel</span>
            </div>
            <span className="text-[11px] text-blue-400 font-semibold truncate capitalize">
              {ADMIN_TAB_TITLES[activeTab] || activeTab}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => onNavigate('dashboard')}
            className="px-3 py-1.5 bg-slate-800/80 hover:bg-slate-700 active:bg-slate-600 text-slate-300 hover:text-white rounded-xl border border-slate-700 text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer min-h-[38px]"
            title="Switch to User View"
          >
            <UserIcon className="w-3.5 h-3.5 text-slate-400" />
            <span className="text-[11px]">User View</span>
          </button>
        </div>
      </div>

      {/* Admin Sidebar (Desktop static sidebar, Mobile/Tablet off-canvas drawer) */}
      <AdminSidebar
        currentTab={activeTab}
        currentUser={currentUser}
        deposits={deposits}
        customOrders={customOrders}
        supportTickets={supportTickets}
        orders={orders}
        mobileOpen={mobileMenuOpen}
        onCloseMobile={() => setMobileMenuOpen(false)}
        onTabChange={(tab) => {
          onTabChange(tab);
          setMobileMenuOpen(false);
        }}
        onNavigate={(route) => {
          onNavigate(route);
          setMobileMenuOpen(false);
        }}
      />

      {/* Main Admin Content */}
      <div className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full min-w-0 overflow-hidden">
        
        {/* OVERVIEW TAB */}
        {activeTab === 'overview' && (
          <div className="space-y-8">
            
            {/* Header */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-6 border-b border-slate-800">
              <div>
                <span className="text-xs font-bold text-blue-400 uppercase tracking-wider bg-blue-950/60 border border-blue-800/60 px-3 py-1 rounded-full">
                  System Administrator
                </span>
                <h1 className="text-2xl sm:text-3xl font-extrabold text-white mt-2">
                  Admin Control & Operations
                </h1>
                <p className="text-slate-400 text-sm">
                  Full control over products, user balances, deposit approvals, and SMM integrations.
                </p>
              </div>

              <div className="flex items-center gap-3">
                <button
                  onClick={openAddModal}
                  className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-bold text-xs rounded-xl shadow-lg transition-all cursor-pointer flex items-center gap-1.5"
                >
                  <span>+</span> Add Ready-Made Website
                </button>
              </div>
            </div>

            {/* Dedicated Admin-Only Metric: TODAY'S TOTAL SALES */}
            <div className="bg-gradient-to-br from-slate-900 via-slate-900 to-blue-950/40 p-6 sm:p-7 rounded-3xl border border-blue-500/30 shadow-2xl relative overflow-hidden">
              <div className="absolute top-0 right-0 w-48 h-48 bg-blue-500/10 rounded-full blur-3xl pointer-events-none -mr-16 -mt-16"></div>
              <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2 mb-1.5">
                    <span className="inline-block w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                    <p className="text-xs font-black tracking-widest text-blue-400 uppercase">
                      TODAY'S TOTAL SALES
                    </p>
                    <span className="text-[10px] font-bold uppercase tracking-wider bg-blue-500/20 text-blue-300 border border-blue-500/30 px-2 py-0.5 rounded-full">
                      Africa/Lagos
                    </span>
                  </div>
                  <h2 className="text-3xl sm:text-4xl font-black text-white tracking-tight font-mono">
                    {formatNaira(todayTotalSales)}
                  </h2>
                  <p className="text-xs text-slate-400 mt-1">
                    Calculated for current calendar day in Nigeria (WAT, UTC+1) • Resets daily at 00:00 Lagos
                  </p>
                </div>

                <div className="flex items-center gap-2 self-start sm:self-auto">
                  <button
                    onClick={() => onTabChange('transactions')}
                    className="px-4 py-2 bg-slate-800/80 hover:bg-slate-750 text-slate-200 text-xs font-bold rounded-xl border border-slate-700 transition-colors cursor-pointer flex items-center gap-2 shadow-xs"
                  >
                    <span>View Sales Ledger</span>
                    <span>→</span>
                  </button>
                </div>
              </div>
            </div>

            {/* KPI Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
              
              <div className="bg-slate-900/90 p-6 rounded-3xl border border-slate-800 shadow-xl">
                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Total Gross Sales</p>
                <h3 className="text-2xl font-black text-emerald-400 mt-2">₦{totalRevenue.toLocaleString()}</h3>
                <p className="text-xs text-slate-400 mt-1">{orders.length} total orders processed</p>
              </div>

              <div className="bg-slate-900/90 p-6 rounded-3xl border border-slate-800 shadow-xl">
                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Registered Users</p>
                <h3 className="text-2xl font-black text-blue-400 mt-2">{users.length} Users</h3>
                <p className="text-xs text-slate-400 mt-1">Total balances: ₦{totalUserBalances.toLocaleString()}</p>
              </div>

              <div className="bg-slate-900/90 p-6 rounded-3xl border border-slate-800 shadow-xl">
                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Pending Deposits</p>
                <h3 className="text-2xl font-black text-amber-400 mt-2">{pendingDepositsCount}</h3>
                <button 
                  onClick={() => onTabChange('deposits')}
                  className="text-xs text-amber-300 font-semibold hover:underline mt-1 block"
                >
                  Review Deposits →
                </button>
              </div>

              <div className="bg-slate-900/90 p-6 rounded-3xl border border-slate-800 shadow-xl">
                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Open Tickets</p>
                <h3 className="text-2xl font-black text-purple-400 mt-2">{openTicketsCount}</h3>
                <button 
                  onClick={() => onTabChange('support')}
                  className="text-xs text-purple-300 font-semibold hover:underline mt-1 block"
                >
                  Support Desk →
                </button>
              </div>

            </div>

            {/* Quick Actions Grid */}
            <div className="bg-slate-900/80 p-6 rounded-3xl border border-slate-800 shadow-xl space-y-4">
              <h3 className="text-sm font-bold text-white uppercase tracking-wider">Quick Management Modules</h3>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <button
                  onClick={() => onTabChange('products')}
                  className="p-4 rounded-2xl bg-slate-800 hover:bg-slate-750 text-left border border-slate-700/60 transition-all cursor-pointer"
                >
                  <span className="text-2xl block mb-2">📦</span>
                  <div className="font-bold text-sm text-white">Catalog</div>
                  <div className="text-xs text-slate-400">{products.length} Products Live</div>
                </button>

                <button
                  onClick={() => onTabChange('users')}
                  className="p-4 rounded-2xl bg-slate-800 hover:bg-slate-750 text-left border border-slate-700/60 transition-all cursor-pointer"
                >
                  <span className="text-2xl block mb-2">👥</span>
                  <div className="font-bold text-sm text-white">User Wallets</div>
                  <div className="text-xs text-slate-400">Credit / Debit Accounts</div>
                </button>

                <button
                  onClick={() => onTabChange('deposits')}
                  className="p-4 rounded-2xl bg-slate-800 hover:bg-slate-750 text-left border border-slate-700/60 transition-all cursor-pointer"
                >
                  <span className="text-2xl block mb-2">💳</span>
                  <div className="font-bold text-sm text-white">Bank Approvals</div>
                  <div className="text-xs text-amber-400">{pendingDepositsCount} Awaiting Review</div>
                </button>

                <button
                  onClick={() => onTabChange('followspanel')}
                  className="p-4 rounded-2xl bg-slate-800 hover:bg-slate-750 text-left border border-slate-700/60 transition-all cursor-pointer"
                >
                  <span className="text-2xl block mb-2">⚡</span>
                  <div className="font-bold text-sm text-white">FollowSPanel API</div>
                  <div className="text-xs text-emerald-400">Live Provider Dashboard</div>
                </button>

                <button
                  onClick={() => onTabChange('cartlogs')}
                  className="p-4 rounded-2xl bg-slate-800 hover:bg-slate-750 text-left border border-slate-700/60 transition-all cursor-pointer"
                >
                  <span className="text-2xl block mb-2">🔐</span>
                  <div className="font-bold text-sm text-white">Cartlogs Logs</div>
                  <div className="text-xs text-cyan-400">Accounts & Inventory</div>
                </button>

                <button
                  onClick={() => onTabChange('numbers')}
                  className="p-4 rounded-2xl bg-slate-800 hover:bg-slate-750 text-left border border-slate-700/60 transition-all cursor-pointer"
                >
                  <span className="text-2xl block mb-2">📱</span>
                  <div className="font-bold text-sm text-white">International Numbers</div>
                  <div className="text-xs text-blue-400">Virtual SMS & OTP</div>
                </button>

                <button
                  onClick={() => onTabChange('settings')}
                  className="p-4 rounded-2xl bg-slate-800 hover:bg-slate-750 text-left border border-slate-700/60 transition-all cursor-pointer"
                >
                  <span className="text-2xl block mb-2">⚙️</span>
                  <div className="font-bold text-sm text-white">System Config</div>
                  <div className="text-xs text-slate-400">Keys & Settings</div>
                </button>
              </div>
            </div>

            {/* Recent Orders List */}
            <div className="bg-slate-900/80 rounded-3xl border border-slate-800 shadow-xl overflow-hidden">
              <div className="p-6 border-b border-slate-800 flex items-center justify-between">
                <h3 className="text-base font-bold text-white">Latest Orders</h3>
                <button onClick={() => onTabChange('orders')} className="text-xs text-blue-400 font-semibold hover:underline">
                  View All Orders →
                </button>
              </div>

              <div className="divide-y divide-slate-800 text-xs">
                {orders.slice(0, 5).map((o, idx) => (
                  <div key={`admin-ov-order-${o.id}-${idx}`} className="p-4 sm:p-6 flex items-center justify-between gap-4">
                    <div>
                      <span className="font-mono font-bold text-blue-400">{o.order_reference}</span>
                      <h4 className="font-bold text-white text-sm mt-0.5">{o.product_name}</h4>
                      <p className="text-slate-400 text-[11px]">User ID: {o.user_id} • {new Date(o.created_at).toLocaleDateString()}</p>
                    </div>
                    <div className="text-right">
                      <div className="font-black text-white text-base">₦{o.amount.toLocaleString()}</div>
                      <span className="inline-block mt-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase bg-emerald-950 text-emerald-300 border border-emerald-800/40">
                        {o.status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

          </div>
        )}

        {/* PRODUCTS TAB */}
        {activeTab === 'products' && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h1 className="text-2xl font-bold text-white">Ready-Made Websites Catalog</h1>
                <p className="text-slate-400 text-sm">Add, modify, and delete real ready-made website products in the database</p>
              </div>
              <button
                onClick={openAddModal}
                className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-bold text-xs rounded-xl shadow-lg cursor-pointer flex items-center gap-1.5 shrink-0"
              >
                <span>+</span> Add Ready-Made Website
              </button>
            </div>

            {/* Products Catalog Content */}
            {products.length === 0 ? (
              <div className="bg-slate-900 rounded-3xl border border-slate-800 p-12 text-center">
                <div className="w-16 h-16 rounded-2xl bg-slate-800 flex items-center justify-center mx-auto mb-4 text-3xl">
                  💻
                </div>
                <h3 className="text-lg font-bold text-white mb-2">No ready-made websites available yet.</h3>
                <p className="text-slate-400 text-xs max-w-md mx-auto mb-6">
                  Add your first ready-made website product with source ZIP files, demo previews, and admin login credentials for customers to purchase.
                </p>
                <button
                  onClick={openAddModal}
                  className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-lg cursor-pointer"
                >
                  + Add Ready-Made Website
                </button>
              </div>
            ) : (
              <div className="bg-slate-900 rounded-3xl border border-slate-800 shadow-xl overflow-hidden">
                {/* Mobile Cards View */}
                <div className="block md:hidden divide-y divide-slate-800">
                  {products.map((prod, pIdx) => (
                    <div key={`admin-prod-mob-${prod.id}-${pIdx}`} className="p-4 space-y-3">
                      <div className="flex items-start gap-3">
                        <img 
                          src={prod.image || prod.preview_image_path || 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=200&auto=format&fit=crop&q=80'} 
                          alt={prod.name} 
                          className="w-14 h-14 rounded-xl object-cover border border-slate-700/60 shrink-0" 
                        />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-1">
                            <h4 className="font-bold text-white text-sm leading-snug">{prod.name}</h4>
                            <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider shrink-0 ${
                              prod.availability === 'available' 
                                ? 'bg-emerald-950 text-emerald-300 border border-emerald-800/60' 
                                : 'bg-red-950 text-red-300 border border-red-800/60'
                            }`}>
                              {prod.availability === 'available' ? 'Available' : 'Out'}
                            </span>
                          </div>
                          <div className="font-black text-blue-400 text-sm mt-0.5">
                            ₦{prod.price.toLocaleString()}
                          </div>
                        </div>
                      </div>

                      <div className="space-y-1.5 text-xs">
                        {prod.demo_url && (
                          <div className="flex items-center justify-between">
                            <span className="text-slate-400">Demo Preview:</span>
                            <a 
                              href={prod.demo_url} 
                              target="_blank" 
                              rel="noreferrer" 
                              className="text-blue-400 hover:text-blue-300 underline font-medium"
                            >
                              Open Demo ↗
                            </a>
                          </div>
                        )}
                        <div className="flex items-center justify-between">
                          <span className="text-slate-400">ZIP File:</span>
                          <span className="font-mono text-[11px] text-slate-300">
                            {prod.website_zip_name ? `📦 ${prod.website_zip_name}` : prod.website_zip_path ? '📦 Source ZIP' : '⚠️ No ZIP'}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800/60">
                        <button
                          onClick={() => openEditModal(prod)}
                          className="px-4 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-xl text-xs font-semibold cursor-pointer"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => onDeleteProduct(prod.id)}
                          className="px-4 py-1.5 bg-red-950/60 hover:bg-red-900 text-red-300 border border-red-800/60 rounded-xl text-xs font-semibold cursor-pointer"
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Tablet / Desktop Table View */}
                <div className="hidden md:block overflow-x-auto table-responsive">
                  <table className="w-full text-left border-collapse min-w-[700px]">
                    <thead>
                      <tr className="bg-slate-800/60 text-[11px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-800">
                        <th className="p-4 pl-6 whitespace-nowrap">Website Product</th>
                        <th className="p-4 whitespace-nowrap">Price (₦)</th>
                        <th className="p-4 whitespace-nowrap">Demo Preview</th>
                        <th className="p-4 whitespace-nowrap">Admin Access</th>
                        <th className="p-4 whitespace-nowrap">ZIP Archive</th>
                        <th className="p-4 whitespace-nowrap">Availability</th>
                        <th className="p-4 pr-6 text-right whitespace-nowrap">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800 text-xs">
                      {products.map((prod, pIdx) => (
                        <tr key={`admin-prod-${prod.id}-${pIdx}`} className="hover:bg-slate-850 transition-colors">
                          <td className="p-4 pl-6 min-w-[220px]">
                            <div className="flex items-center gap-3">
                              <img 
                                src={prod.image || prod.preview_image_path || 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=200&auto=format&fit=crop&q=80'} 
                                alt={prod.name} 
                                className="w-12 h-12 rounded-xl object-cover border border-slate-700/60 shrink-0" 
                              />
                              <div className="min-w-0 max-w-xs">
                                <div className="font-bold text-white text-sm break-words">{prod.name}</div>
                                <div className="text-slate-400 text-[11px] line-clamp-2 break-words">{prod.description}</div>
                                {prod.features && prod.features.length > 0 && (
                                  <div className="flex flex-wrap gap-1 mt-1">
                                    {prod.features.slice(0, 2).map((feat, idx) => (
                                      <span key={`feat-${pIdx}-${idx}`} className="px-1.5 py-0.5 bg-slate-800 text-slate-300 rounded text-[10px]">
                                        {feat}
                                      </span>
                                    ))}
                                    {prod.features.length > 2 && (
                                      <span className="px-1.5 py-0.5 bg-slate-800 text-slate-400 rounded text-[10px]">
                                        +{prod.features.length - 2} more
                                      </span>
                                    )}
                                  </div>
                                )}
                              </div>
                            </div>
                          </td>
                          <td className="p-4 font-black text-blue-400 whitespace-nowrap">
                            ₦{prod.price.toLocaleString()}
                          </td>
                          <td className="p-4 whitespace-nowrap">
                            {prod.demo_url ? (
                              <a 
                                href={prod.demo_url} 
                                target="_blank" 
                                rel="noreferrer" 
                                className="inline-flex items-center gap-1 text-blue-400 hover:text-blue-300 underline font-medium"
                              >
                                <span>Preview ↗</span>
                              </a>
                            ) : (
                              <span className="text-slate-500 text-[11px]">None</span>
                            )}
                          </td>
                          <td className="p-4 whitespace-nowrap">
                            {prod.admin_email ? (
                              <div className="space-y-0.5">
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-slate-800 text-slate-300 rounded text-[10px] font-mono">
                                  🔒 {prod.admin_email}
                                </span>
                                <div className="text-[10px] text-slate-500 font-mono pl-1">
                                  ••••••••
                                </div>
                              </div>
                            ) : (
                              <span className="text-slate-500 text-[11px]">Not configured</span>
                            )}
                          </td>
                          <td className="p-4 whitespace-nowrap">
                            {prod.website_zip_name ? (
                              <span className="inline-flex items-center gap-1 px-2 py-1 bg-emerald-950/60 border border-emerald-800/60 text-emerald-300 rounded-lg text-[11px] font-mono">
                                📦 {prod.website_zip_name}
                                {prod.website_zip_size ? ` (${formatBytes(prod.website_zip_size)})` : ''}
                              </span>
                            ) : prod.website_zip_path ? (
                              <span className="inline-flex items-center gap-1 px-2 py-1 bg-emerald-950/60 border border-emerald-800/60 text-emerald-300 rounded-lg text-[11px] font-mono">
                                📦 Source ZIP Ready
                              </span>
                            ) : (
                              <span className="text-amber-400 text-[11px]">⚠️ No ZIP attached</span>
                            )}
                          </td>
                          <td className="p-4 whitespace-nowrap">
                            <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                              prod.availability === 'available' 
                                ? 'bg-emerald-950 text-emerald-300 border border-emerald-800/60' 
                                : 'bg-red-950 text-red-300 border border-red-800/60'
                            }`}>
                              {prod.availability === 'available' ? 'Available for sale' : 'Out of stock'}
                            </span>
                            {prod.featured && (
                              <span className="ml-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-blue-950 text-blue-300 border border-blue-800/60">
                                Featured
                              </span>
                            )}
                          </td>
                          <td className="p-4 pr-6 text-right whitespace-nowrap">
                            <div className="flex items-center justify-end gap-2">
                              <button
                                onClick={() => openEditModal(prod)}
                                className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-lg text-xs font-semibold cursor-pointer transition-colors"
                              >
                                Edit
                              </button>
                              <button
                                onClick={() => onDeleteProduct(prod.id)}
                                className="px-3 py-1.5 bg-red-950/60 hover:bg-red-900 text-red-300 border border-red-800/60 rounded-lg text-xs font-semibold cursor-pointer transition-colors"
                              >
                                Delete
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}

        {/* USERS TAB */}
        {activeTab === 'users' && (
          <div className="space-y-6">
            <div>
              <h1 className="text-2xl font-bold text-white">Users & Wallet Balances</h1>
              <p className="text-slate-400 text-sm">Credit or debit user accounts with instant transaction auditing</p>
            </div>

            <div className="bg-slate-900 rounded-3xl border border-slate-800 shadow-xl overflow-hidden">
              {/* Mobile Cards for Users */}
              <div className="block md:hidden divide-y divide-slate-800">
                {users.map((u, uIdx) => (
                  <div key={`admin-user-mob-${u.id}-${uIdx}`} className="p-4 space-y-2.5">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <h4 className="font-bold text-white text-sm">{u.full_name}</h4>
                        <div className="text-xs text-slate-400 font-mono break-all">{u.email}</div>
                      </div>
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase shrink-0 ${
                        u.role === 'admin' ? 'bg-purple-950 text-purple-300 border border-purple-800' : 'bg-slate-800 text-slate-300'
                      }`}>
                        {u.role}
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-xs pt-1">
                      <span className="text-slate-400">Wallet Balance:</span>
                      <span className="font-black text-emerald-400 text-sm font-mono">
                        ₦{u.balance.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                      </span>
                    </div>

                    <button
                      onClick={() => setSelectedUserForBalance(u)}
                      className="w-full py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-xs cursor-pointer text-center mt-1"
                    >
                      Manage Balance
                    </button>
                  </div>
                ))}
              </div>

              {/* Tablet/Desktop Table for Users */}
              <div className="hidden md:block overflow-x-auto table-responsive">
                <table className="w-full text-left border-collapse min-w-[650px]">
                  <thead>
                    <tr className="bg-slate-800/60 text-[11px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-800">
                      <th className="p-4 pl-6 whitespace-nowrap">User</th>
                      <th className="p-4 whitespace-nowrap">Email</th>
                      <th className="p-4 whitespace-nowrap">Role</th>
                      <th className="p-4 whitespace-nowrap">Wallet Balance</th>
                      <th className="p-4 pr-6 text-right whitespace-nowrap">Adjust Balance</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800 text-xs">
                    {users.map((u, uIdx) => (
                      <tr key={`admin-user-${u.id}-${uIdx}`} className="hover:bg-slate-850">
                        <td className="p-4 pl-6 font-bold text-white whitespace-nowrap">{u.full_name}</td>
                        <td className="p-4 text-slate-400 whitespace-nowrap font-mono">{u.email}</td>
                        <td className="p-4 whitespace-nowrap">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                            u.role === 'admin' ? 'bg-purple-950 text-purple-300 border border-purple-800' : 'bg-slate-800 text-slate-300'
                          }`}>
                            {u.role}
                          </span>
                        </td>
                        <td className="p-4 font-black text-emerald-400 text-sm whitespace-nowrap">
                          ₦{u.balance.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                        </td>
                        <td className="p-4 pr-6 text-right whitespace-nowrap">
                          <button
                            onClick={() => setSelectedUserForBalance(u)}
                            className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-xs cursor-pointer"
                          >
                            Manage Balance
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* DEPOSIT APPROVALS TAB */}
        {activeTab === 'deposits' && (
          <div className="space-y-6">
            <div>
              <h1 className="text-2xl font-bold text-white">Deposit Approvals</h1>
              <p className="text-slate-400 text-sm">Review bank transfers and instantly credit user accounts</p>
            </div>

            <div className="bg-slate-900 rounded-3xl border border-slate-800 shadow-xl overflow-hidden">
              {deposits.length === 0 ? (
                <div className="p-12 text-center text-slate-400">No deposits recorded.</div>
              ) : (
                <div className="divide-y divide-slate-800">
                  {deposits.map((dep, dIdx) => {
                    const proofUrl = dep.payment_proof || dep.proof_image;
                    return (
                      <div key={`admin-dep-${dep.id}-${dIdx}`} className="p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-mono font-bold text-blue-400 text-xs">{dep.deposit_reference}</span>
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                              dep.status === 'approved' ? 'bg-emerald-950 text-emerald-300 border border-emerald-800' : dep.status === 'rejected' ? 'bg-red-950 text-red-300' : 'bg-amber-950 text-amber-300 border border-amber-800'
                            }`}>
                              {dep.status}
                            </span>
                          </div>
                          <div className="text-lg font-black text-white mt-1">₦{dep.amount.toLocaleString()}</div>
                          <p className="text-xs text-slate-400 mt-1">
                            Customer: <span className="text-slate-200 font-medium">{dep.user_name || `User #${dep.user_id}`}</span> ({dep.user_email || `ID: ${dep.user_id}`}) • Method: <span className="text-slate-300 font-semibold">{dep.payment_method}</span> • Date: {new Date(dep.created_at).toLocaleString()}
                          </p>
                          {proofUrl && (
                            <div className="mt-3 flex items-center gap-3">
                              {proofUrl.startsWith('data:image/') || proofUrl.match(/\.(jpg|jpeg|png|webp)/i) ? (
                                <button
                                  type="button"
                                  onClick={() => setViewingDepositReceipt({ ...dep, payment_proof: proofUrl })}
                                  className="inline-flex items-center gap-2 px-3 py-1.5 bg-blue-950/80 hover:bg-blue-900 border border-blue-700/80 rounded-xl text-blue-200 text-xs font-semibold cursor-pointer transition-colors"
                                >
                                  <img
                                    src={proofUrl}
                                    alt="Thumbnail"
                                    className="w-6 h-6 rounded-md object-cover border border-blue-400/40"
                                  />
                                  <span>👁️ View Receipt Image Proof</span>
                                </button>
                              ) : (
                                <div className="text-xs text-blue-300">
                                  Proof / Ref: <span className="font-mono">{proofUrl}</span>
                                </div>
                              )}
                            </div>
                          )}
                        </div>

                        {dep.status === 'pending' && (
                          <div className="flex items-center gap-2">
                            {dep.amount < 1000 ? (
                              <div className="flex items-center gap-2">
                                <span className="px-2 py-1 bg-red-950/80 border border-red-700 text-red-300 rounded-lg text-[11px] font-bold">
                                  ⚠️ Below ₦1,000 Min
                                </span>
                                <button
                                  onClick={() => onRejectDeposit(dep.id)}
                                  className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white font-bold text-xs rounded-xl shadow-xs cursor-pointer"
                                >
                                  ✕ Reject
                                </button>
                              </div>
                            ) : (
                              <>
                                <button
                                  onClick={() => onApproveDeposit(dep.id)}
                                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-xs cursor-pointer"
                                >
                                  ✓ Approve & Credit
                                </button>
                                <button
                                  onClick={() => onRejectDeposit(dep.id)}
                                  className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white font-bold text-xs rounded-xl shadow-xs cursor-pointer"
                                >
                                  ✕ Reject
                                </button>
                              </>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ORDERS TAB */}
        {activeTab === 'orders' && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h1 className="text-2xl font-bold text-white">Orders Management</h1>
                <p className="text-slate-400 text-sm">Manage website delivery files and SMM boosting orders</p>
              </div>
              <button
                onClick={() => onTabChange('followspanel')}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-emerald-400 text-xs font-semibold rounded-xl border border-slate-700 transition-colors flex items-center gap-2 cursor-pointer shrink-0"
              >
                <span>⚡</span>
                <span>Open FollowSPanel Dashboard →</span>
              </button>
            </div>

            <div className="bg-slate-900 rounded-3xl border border-slate-800 shadow-xl overflow-hidden">
              <div className="divide-y divide-slate-800 text-xs">
                {orders.length === 0 ? (
                  <div className="p-12 text-center text-slate-400">No customer orders recorded yet.</div>
                ) : (
                  orders.map((o, oIdx) => {
                    const isSmm = o.category === 'boosting' || Boolean(o.customer_details?.smm_order_id);
                    const smmId = o.customer_details?.smm_order_id;
                    const providerCost = typeof o.customer_details?.provider_cost === 'number' ? o.customer_details.provider_cost : (isSmm ? o.amount * 0.7 : 0);
                    const profit = isSmm ? Math.max(0, o.amount - providerCost) : o.amount;

                    return (
                      <div key={`admin-ord-${o.id}-${oIdx}`} className="p-6 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                        <div className="space-y-1.5 flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-mono font-bold text-blue-400 text-sm">{o.order_reference}</span>
                            {isSmm && (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-blue-950 text-blue-300 border border-blue-800/80">
                                SMM Boosting
                              </span>
                            )}
                            {smmId && (
                              <span className="font-mono text-[11px] font-bold text-emerald-400 bg-slate-950 px-2 py-0.5 rounded border border-slate-800">
                                FollowSPanel ID: #{smmId}
                              </span>
                            )}
                          </div>
                          
                          <h4 className="text-base font-bold text-white">{o.product_name}</h4>
                          
                          <p className="text-slate-400 text-xs">
                            Customer: <span className="text-slate-200 font-medium">{o.user_name}</span> ({o.user_email || `User #${o.user_id}`}) • Date: {new Date(o.created_at).toLocaleString()}
                          </p>

                          {isSmm && (
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1">
                              <div className="p-2 bg-slate-950/80 rounded-xl border border-slate-800">
                                <div className="text-[10px] text-slate-500 uppercase font-semibold">Customer Price</div>
                                <div className="font-bold text-emerald-400 text-xs">₦{o.amount.toLocaleString()}</div>
                              </div>
                              <div className="p-2 bg-slate-950/80 rounded-xl border border-slate-800">
                                <div className="text-[10px] text-slate-500 uppercase font-semibold">Provider Cost</div>
                                <div className="font-bold text-slate-300 text-xs font-mono">₦{providerCost.toLocaleString('en-US', { minimumFractionDigits: 2 })}</div>
                              </div>
                              <div className="p-2 bg-slate-950/80 rounded-xl border border-slate-800">
                                <div className="text-[10px] text-slate-500 uppercase font-semibold">Profit Margin</div>
                                <div className="font-bold text-emerald-300 text-xs font-mono">+₦{profit.toLocaleString('en-US', { minimumFractionDigits: 2 })}</div>
                              </div>
                              <div className="p-2 bg-slate-950/80 rounded-xl border border-slate-800">
                                <div className="text-[10px] text-slate-500 uppercase font-semibold">Provider Status</div>
                                <div className="font-bold text-amber-400 text-xs">{o.customer_details?.provider_status || 'Processing'}</div>
                              </div>
                            </div>
                          )}

                          {o.customer_details?.target_link && (
                            <div className="text-[11px] text-slate-400">
                              Target Link: <span className="font-mono text-blue-300 select-all">{o.customer_details.target_link}</span>
                            </div>
                          )}
                        </div>

                        <div className="flex items-center gap-3 shrink-0">
                          {smmId && (
                            <button
                              onClick={async () => {
                                const res = await store.syncFollowSPanelOrderStatus(o.id, smmId);
                                if (res.success) {
                                  alert(`✅ FollowSPanel Status Synced!\nProvider Status: ${res.order?.customer_details?.provider_status || 'Updated'}`);
                                } else {
                                  alert(res.error || 'Failed to sync with FollowSPanel.');
                                }
                              }}
                              className="px-3 py-1.5 bg-blue-600/80 hover:bg-blue-600 text-white font-semibold rounded-xl text-xs cursor-pointer transition-colors"
                            >
                              Sync Status
                            </button>
                          )}

                          <select
                            value={o.status}
                            onChange={(e) => onUpdateOrderStatus(o.id, e.target.value)}
                            className="px-3 py-1.5 bg-slate-800 border border-slate-700 text-white rounded-xl text-xs focus:outline-none"
                          >
                            <option value="pending">Pending</option>
                            <option value="processing">Processing</option>
                            <option value="completed">Completed</option>
                            <option value="cancelled">Cancelled</option>
                          </select>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>
        )}

        {/* FOLLOWSPANEL PROVIDER DASHBOARD TAB */}
        {activeTab === 'followspanel' && (
          <FollowSPanelDashboard
            orders={orders}
            settings={settings}
            onUpdateSettings={onUpdateSettings}
            onUpdateOrderStatus={onUpdateOrderStatus}
          />
        )}

        {/* CARTLOGS PROVIDER DASHBOARD TAB */}
        {activeTab === 'cartlogs' && (
          <CartlogsDashboard
            orders={orders}
            onNavigate={onNavigate}
          />
        )}

        {/* INTERNATIONAL NUMBERS DASHBOARD TAB */}
        {activeTab === 'numbers' && (
          <InternationalNumbersDashboard
            orders={orders}
            onNavigate={onNavigate}
          />
        )}

        {/* RESELLER API MANAGEMENT TAB */}
        {activeTab === 'reseller' && (
          <AdminResellerManagement />
        )}

        {/* CUSTOM ORDERS TAB */}
        {activeTab === 'custom-orders' && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h1 className="text-2xl font-bold text-white">Custom Web Requests</h1>
                <p className="text-slate-400 text-sm">Review full project briefs, logos, features, and client contact information</p>
              </div>
              <div className="px-4 py-2 bg-slate-900 border border-slate-800 rounded-2xl text-xs font-bold text-slate-300">
                Total Requests: <span className="text-blue-400">{customOrders.length}</span>
              </div>
            </div>

            {/* Logo Viewer Modal */}
            {previewLogo && (
              <div 
                className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4"
                onClick={() => setPreviewLogo(null)}
                onTouchMove={(e) => { if (e.target === e.currentTarget) e.preventDefault(); }}
              >
                <div 
                  className="bg-slate-900 border border-slate-700 rounded-3xl p-6 max-w-2xl w-full max-h-[calc(100dvh-2rem)] overflow-y-auto overscroll-contain sp-overlay-scroll space-y-4 shadow-2xl relative"
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                    <div className="flex items-center gap-2 text-white font-bold text-sm truncate">
                      <ImageIcon className="w-4 h-4 text-blue-400" />
                      <span className="truncate">{previewLogo.name || 'Uploaded Logo'}</span>
                    </div>
                    <button
                      onClick={() => setPreviewLogo(null)}
                      className="p-1.5 hover:bg-slate-800 rounded-xl text-slate-400 hover:text-white cursor-pointer"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>

                  <div className="bg-slate-950 p-6 rounded-2xl border border-slate-800 flex items-center justify-center min-h-[280px] max-h-[420px] overflow-hidden">
                    <img
                      src={previewLogo.url}
                      alt={previewLogo.name}
                      className="max-w-full max-h-full object-contain"
                    />
                  </div>

                  <div className="flex items-center justify-end gap-3 pt-2">
                    <a
                      href={previewLogo.url}
                      download={previewLogo.name || 'custom-website-logo.png'}
                      className="px-4 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold transition-all flex items-center gap-2"
                    >
                      <Download className="w-4 h-4" />
                      <span>Download Logo</span>
                    </a>
                    <button
                      onClick={() => setPreviewLogo(null)}
                      className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-bold cursor-pointer"
                    >
                      Close
                    </button>
                  </div>
                </div>
              </div>
            )}

            <div className="bg-slate-900 rounded-3xl border border-slate-800 shadow-xl overflow-hidden">
              {customOrders.length === 0 ? (
                <div className="p-12 text-center text-slate-400">No custom web requests received yet.</div>
              ) : (
                <div className="divide-y divide-slate-800/80">
                  {customOrders.map((req, rIdx) => {
                    const statusColors: Record<string, string> = {
                      pending: 'bg-amber-500/10 text-amber-400 border-amber-500/30',
                      reviewing: 'bg-blue-500/10 text-blue-400 border-blue-500/30',
                      in_progress: 'bg-indigo-500/10 text-indigo-400 border-indigo-500/30',
                      completed: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30',
                      cancelled: 'bg-red-500/10 text-red-400 border-red-500/30'
                    };

                    const features = req.features_list && req.features_list.length > 0
                      ? req.features_list
                      : (req.required_features ? req.required_features.split(',').map(f => f.trim()) : []);

                    return (
                      <div key={`admin-custom-${req.id}-${rIdx}`} className="p-6 sm:p-8 space-y-6">
                        {/* Header Bar */}
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
                          <div className="flex flex-wrap items-center gap-3">
                            <span className="font-mono font-black text-sm text-blue-400 bg-blue-500/10 px-3 py-1 rounded-xl border border-blue-500/20">
                              {req.request_reference}
                            </span>
                            <span className={`text-[11px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-lg border ${statusColors[req.status] || 'bg-slate-800 text-slate-300'}`}>
                              {req.status.replace('_', ' ')}
                            </span>
                            <span className="text-slate-400 text-xs flex items-center gap-1">
                              <Calendar className="w-3.5 h-3.5 text-slate-500" />
                              {new Date(req.created_at).toLocaleString()}
                            </span>
                          </div>

                          <div className="flex items-center gap-3">
                            <label className="text-xs text-slate-400 font-semibold">Status:</label>
                            <select
                              value={req.status}
                              onChange={(e) => onUpdateCustomOrderStatus(req.id, e.target.value)}
                              className="px-3.5 py-2 bg-slate-950 border border-slate-700 text-white rounded-xl text-xs font-bold focus:border-blue-500 focus:outline-none cursor-pointer"
                            >
                              <option value="pending">Pending</option>
                              <option value="reviewing">Reviewing</option>
                              <option value="in_progress">In Progress</option>
                              <option value="completed">Completed</option>
                              <option value="cancelled">Cancelled</option>
                            </select>
                          </div>
                        </div>

                        {/* Main Project & Client Info Grid */}
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                          
                          {/* Project Details (Col 1 & 2) */}
                          <div className="lg:col-span-2 space-y-4">
                            <div>
                              <span className="text-[10px] uppercase tracking-wider font-extrabold text-blue-400 bg-blue-500/10 px-2.5 py-0.5 rounded-md">
                                {req.website_type}
                              </span>
                              <h3 className="text-xl font-extrabold text-white mt-1.5">{req.project_name}</h3>
                              <p className="text-sm text-slate-300 mt-2 leading-relaxed bg-slate-950/60 p-4 rounded-2xl border border-slate-800/80 whitespace-pre-wrap">
                                {req.description}
                              </p>
                            </div>

                            {/* Reference Website */}
                            {req.reference_website && (
                              <div className="p-3.5 bg-slate-950 rounded-2xl border border-slate-800 flex items-center justify-between gap-3 text-xs">
                                <div className="flex items-center gap-2 min-w-0">
                                  <Globe className="w-4 h-4 text-blue-400 shrink-0" />
                                  <span className="text-slate-400">Reference URL:</span>
                                  <a
                                    href={req.reference_website}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="font-mono text-blue-400 hover:text-blue-300 hover:underline truncate"
                                  >
                                    {req.reference_website}
                                  </a>
                                </div>
                                <a
                                  href={req.reference_website}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg shrink-0"
                                  title="Open Reference Website"
                                >
                                  <ExternalLink className="w-3.5 h-3.5" />
                                </a>
                              </div>
                            )}

                            {/* Selected Features */}
                            <div className="space-y-2">
                              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">
                                Selected Features & Requirements:
                              </span>
                              <div className="flex flex-wrap gap-2">
                                {features.map((feat, fIdx) => (
                                  <span
                                    key={fIdx}
                                    className="px-3 py-1 bg-slate-950 border border-slate-800 text-slate-200 rounded-xl text-xs font-medium flex items-center gap-1.5"
                                  >
                                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                                    {feat}
                                  </span>
                                ))}
                              </div>
                            </div>

                            {/* Additional Instructions */}
                            {req.additional_instructions && (
                              <div className="p-3.5 bg-slate-950 rounded-2xl border border-slate-800 text-xs space-y-1">
                                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                                  Additional Instructions:
                                </span>
                                <p className="text-slate-300 italic whitespace-pre-wrap">
                                  "{req.additional_instructions}"
                                </p>
                              </div>
                            )}
                          </div>

                          {/* Client & Specs Sidebar (Col 3) */}
                          <div className="space-y-4">
                            
                            {/* Client Contact Card */}
                            <div className="p-4 bg-slate-950 rounded-2xl border border-slate-800 space-y-3 text-xs">
                              <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 block border-b border-slate-800/80 pb-2">
                                Client Contact Information
                              </span>
                              <div className="space-y-2">
                                <div className="flex items-center gap-2 text-white font-bold">
                                  <UserIcon className="w-3.5 h-3.5 text-slate-400" />
                                  <span>{req.user_name || 'Customer'}</span>
                                  <span className="text-[10px] font-mono text-slate-500 font-normal">
                                    (User ID: #{req.user_id})
                                  </span>
                                </div>
                                <div className="flex items-center gap-2 text-slate-300">
                                  <Mail className="w-3.5 h-3.5 text-slate-400" />
                                  <a href={`mailto:${req.user_email}`} className="hover:text-blue-400 underline">
                                    {req.user_email || 'No email provided'}
                                  </a>
                                </div>
                                <div className="flex items-center gap-2 text-slate-300">
                                  <Phone className="w-3.5 h-3.5 text-slate-400" />
                                  <span>{req.phone || 'No phone provided'}</span>
                                </div>
                              </div>
                            </div>

                            {/* Logo Asset Card */}
                            <div className="p-4 bg-slate-950 rounded-2xl border border-slate-800 space-y-3 text-xs">
                              <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 block border-b border-slate-800/80 pb-2">
                                Uploaded Website Logo
                              </span>
                              {req.logo_url ? (
                                <div className="space-y-3">
                                  <div className="h-28 bg-slate-900 rounded-xl border border-slate-800 p-2 flex items-center justify-center overflow-hidden">
                                    <img
                                      src={req.logo_url}
                                      alt={req.logo_name || 'Brand Logo'}
                                      className="max-h-full max-w-full object-contain"
                                    />
                                  </div>
                                  <div className="text-[11px] text-slate-400 truncate">
                                    {req.logo_name || 'brand-logo.png'}
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <button
                                      onClick={() => setPreviewLogo({ url: req.logo_url!, name: req.logo_name || req.project_name })}
                                      className="flex-1 py-1.5 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer"
                                    >
                                      <Eye className="w-3.5 h-3.5" />
                                      <span>View</span>
                                    </button>
                                    <a
                                      href={req.logo_url}
                                      download={req.logo_name || `${req.project_name}-logo.png`}
                                      className="flex-1 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5"
                                    >
                                      <Download className="w-3.5 h-3.5" />
                                      <span>Download</span>
                                    </a>
                                  </div>
                                </div>
                              ) : (
                                <div className="text-slate-500 italic py-2 text-center">
                                  No logo uploaded by client.
                                </div>
                              )}
                            </div>

                            {/* Budget / Price Card */}
                            <div className="p-4 bg-slate-950 rounded-2xl border border-slate-800 flex items-center justify-between text-xs">
                              <div>
                                <span className="text-[10px] uppercase font-bold text-slate-400 block">
                                  Order Quote / Budget
                                </span>
                                <span className="text-lg font-black text-emerald-400">
                                  {req.budget || (req.price ? `₦${req.price.toLocaleString()}` : '₦150,000')}
                                </span>
                              </div>
                              <span className="text-[10px] text-slate-500 font-mono">
                                Scope: {req.pages_count || 'Standard'}
                              </span>
                            </div>

                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}

        {/* TRANSACTIONS TAB */}
        {activeTab === 'transactions' && (
          <div className="space-y-6">
            <div>
              <h1 className="text-2xl font-bold text-white">Full System Transactions</h1>
              <p className="text-slate-400 text-sm">Authoritative ledger and audit records across the system</p>
            </div>

            <div className="bg-slate-900 rounded-3xl border border-slate-800 shadow-xl overflow-hidden">
              {transactions.length === 0 ? (
                <div className="p-12 text-center text-slate-400">No transactions recorded yet.</div>
              ) : (
                <>
                  {/* Mobile Cards for Transactions */}
                  <div className="block md:hidden divide-y divide-slate-800">
                    {transactions.map((tx, txIdx) => (
                      <div key={`admin-tx-mob-${tx.id}-${txIdx}`} className="p-4 space-y-2">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <span className="font-mono text-xs font-bold text-blue-400">#{tx.reference}</span>
                            <div className="font-semibold text-slate-200 text-xs mt-0.5">
                              {tx.user_name || `User #${tx.user_id}`}
                            </div>
                            <div className="text-[10px] text-slate-500 font-mono">{tx.user_email}</div>
                          </div>
                          <div className="text-right shrink-0">
                            <div className={`font-black text-sm font-mono ${['deposit', 'admin_credit', 'referral_reward'].includes(tx.type) ? 'text-emerald-400' : 'text-white'}`}>
                              {['deposit', 'admin_credit', 'referral_reward'].includes(tx.type) ? '+' : '-'}₦{tx.amount.toLocaleString()}
                            </div>
                            <span className={`inline-block mt-1 px-2 py-0.5 rounded-full text-[9px] font-bold uppercase ${
                              (tx.status === 'successful' || tx.status === 'approved') ? 'bg-emerald-950 text-emerald-300 border border-emerald-800' :
                              tx.status === 'rejected' ? 'bg-red-950 text-red-300 border border-red-800' :
                              'bg-amber-950 text-amber-300 border border-amber-800'
                            }`}>
                              {tx.status || 'successful'}
                            </span>
                          </div>
                        </div>

                        <div className="text-xs text-slate-300 bg-slate-950/60 p-2.5 rounded-xl border border-slate-850">
                          <span className="uppercase text-[9px] font-bold text-slate-400 block mb-0.5">
                            {tx.type.replace('_', ' ')}
                          </span>
                          {tx.description}
                        </div>

                        <div className="text-[10px] text-slate-500 text-right">
                          {new Date(tx.created_at).toLocaleString()}
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Tablet/Desktop Table for Transactions */}
                  <div className="hidden md:block overflow-x-auto table-responsive">
                    <table className="w-full text-left border-collapse text-xs min-w-[750px]">
                      <thead>
                        <tr className="bg-slate-800/60 text-[11px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-800">
                          <th className="p-4 pl-6 whitespace-nowrap">Reference</th>
                          <th className="p-4 whitespace-nowrap">Customer</th>
                          <th className="p-4 whitespace-nowrap">Type</th>
                          <th className="p-4 whitespace-nowrap">Description</th>
                          <th className="p-4 whitespace-nowrap">Amount</th>
                          <th className="p-4 whitespace-nowrap">Status</th>
                          <th className="p-4 pr-6 whitespace-nowrap">Date</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800">
                        {transactions.map((tx, txIdx) => (
                          <tr key={`admin-tx-${tx.id}-${txIdx}`} className="hover:bg-slate-850">
                            <td className="p-4 pl-6 font-mono font-bold text-blue-400 whitespace-nowrap">{tx.reference}</td>
                            <td className="p-4 whitespace-nowrap">
                              <div className="font-semibold text-slate-200">{tx.user_name || `User #${tx.user_id}`}</div>
                              <div className="text-[11px] text-slate-400 font-mono">{tx.user_email || `ID: ${tx.user_id}`}</div>
                            </td>
                            <td className="p-4 uppercase font-semibold text-slate-300 whitespace-nowrap">{tx.type.replace('_', ' ')}</td>
                            <td className="p-4 text-slate-300 max-w-xs break-words">{tx.description}</td>
                            <td className={`p-4 font-bold whitespace-nowrap ${['deposit', 'admin_credit', 'referral_reward'].includes(tx.type) ? 'text-emerald-400' : 'text-white'}`}>
                              {['deposit', 'admin_credit', 'referral_reward'].includes(tx.type) ? '+' : '-'}₦{tx.amount.toLocaleString()}
                            </td>
                            <td className="p-4 whitespace-nowrap">
                              <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                                (tx.status === 'successful' || tx.status === 'approved') ? 'bg-emerald-950 text-emerald-300 border border-emerald-800' :
                                tx.status === 'rejected' ? 'bg-red-950 text-red-300 border border-red-800' :
                                'bg-amber-950 text-amber-300 border border-amber-800'
                              }`}>
                                {tx.status || 'successful'}
                              </span>
                            </td>
                            <td className="p-4 pr-6 text-slate-400 whitespace-nowrap">{new Date(tx.created_at).toLocaleString()}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </>
              )}
            </div>
          </div>
        )}

        {/* SUPPORT TICKETS TAB */}
        {activeTab === 'support' && (
          <div className="space-y-6">
            <div>
              <h1 className="text-2xl font-bold text-white">Support Desk</h1>
              <p className="text-slate-400 text-sm">Real-time customer communications, audio voice notes and ticket resolutions</p>
            </div>

            <div className="bg-slate-900 rounded-3xl border border-slate-800 shadow-xl overflow-hidden">
              {supportTickets.length === 0 ? (
                <div className="p-12 text-center text-slate-400">No support tickets found.</div>
              ) : (
                <div className="divide-y divide-slate-800">
                  {supportTickets.map((t, tIdx) => (
                    <div key={`admin-ticket-${t.id}-${tIdx}`} className="p-6 space-y-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-xs font-bold text-blue-400">{t.ticket_code}</span>
                          <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                            t.status === 'open' ? 'bg-amber-950 text-amber-300 border border-amber-800' :
                            t.status === 'in_progress' ? 'bg-blue-950 text-blue-300 border border-blue-800' :
                            t.status === 'answered' ? 'bg-purple-950 text-purple-300 border border-purple-800' :
                            'bg-slate-800 text-slate-400 border border-slate-700'
                          }`}>
                            {t.status}
                          </span>
                        </div>

                        {/* Quick status change */}
                        <select
                          value={t.status}
                          onChange={(e) => {
                            store.updateSupportTicketStatus(t.id, e.target.value as any);
                          }}
                          className="px-2.5 py-1 bg-slate-800 border border-slate-700 text-white rounded-lg text-xs"
                        >
                          <option value="open">Open</option>
                          <option value="in_progress">In Progress</option>
                          <option value="answered">Answered</option>
                          <option value="closed">Closed</option>
                        </select>
                      </div>

                      <h4 className="text-base font-bold text-white">{t.subject}</h4>
                      <p className="text-xs text-slate-400">
                        From User: <span className="text-slate-200 font-semibold">{t.user_name || `User #${t.user_id}`}</span> (ID: {t.user_id}) • Created: {new Date(t.created_at).toLocaleString()}
                      </p>

                      <div className="space-y-3 pt-2">
                        {t.messages.map((m, mIdx) => (
                          <div 
                            key={`admin-msg-${m.id || mIdx}-${mIdx}`}
                            className={`p-4 rounded-2xl text-xs space-y-2 ${
                              m.sender_role === 'admin' 
                                ? 'bg-blue-950/70 border border-blue-800/80 text-blue-200 ml-6' 
                                : 'bg-slate-950/90 border border-slate-800 text-slate-200 mr-6'
                            }`}
                          >
                            <div className="flex items-center justify-between font-bold text-[11px]">
                              <span>{m.sender_role === 'admin' ? '🛡️ Admin Support Team' : (m.sender_name || 'Customer')}</span>
                              <span className="text-[10px] text-slate-400 font-normal">{new Date(m.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                            </div>

                            {/* Text message content */}
                            {m.message && (
                              <p className="leading-relaxed whitespace-pre-wrap">{m.message}</p>
                            )}

                            {/* Voice note player if audio is attached */}
                            {(m.audio_data || m.message_type === 'voice') && m.audio_data && (
                              <div className="pt-1">
                                <VoiceNotePlayer 
                                  audioData={m.audio_data} 
                                  duration={m.audio_duration} 
                                  isCurrentUser={m.sender_role === 'admin'}
                                />
                              </div>
                            )}
                          </div>
                        ))}
                      </div>

                      {/* Reply Box */}
                      <div className="pt-3 border-t border-slate-800">
                        <button
                          type="button"
                          onClick={() => {
                            if (activeTicket?.id === t.id) {
                              setActiveTicket(null);
                              setAdminReplyText('');
                              setAdminReplyVoiceAudio(null);
                            } else {
                              setActiveTicket(t);
                              setAdminReplyText('');
                              setAdminReplyVoiceAudio(null);
                            }
                          }}
                          className="text-xs font-bold text-blue-400 hover:text-blue-300 cursor-pointer flex items-center gap-1.5"
                        >
                          <span>{activeTicket?.id === t.id ? '✕ Cancel Reply' : '💬 Reply to Customer'}</span>
                        </button>

                        {activeTicket?.id === t.id && (
                          <form onSubmit={handleAdminTicketReply} className="mt-3 p-4 bg-slate-950/80 rounded-2xl border border-slate-800 space-y-3">
                            <div className="flex flex-col sm:flex-row gap-3 items-start">
                              <input 
                                type="text" 
                                value={adminReplyText}
                                onChange={(e) => setAdminReplyText(e.target.value)}
                                placeholder="Type administrator resolution text..."
                                className="flex-1 w-full px-4 py-2.5 text-xs bg-slate-900 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
                              />

                              {/* Admin Voice Note Recorder */}
                              <div className="shrink-0">
                                <VoiceRecorder
                                  onAudioRecorded={(base64, duration) => {
                                    setAdminReplyVoiceAudio(base64);
                                    setAdminReplyVoiceDuration(duration);
                                  }}
                                  onCancel={() => {
                                    setAdminReplyVoiceAudio(null);
                                    setAdminReplyVoiceDuration(0);
                                  }}
                                />
                              </div>
                            </div>

                            {/* Recorded preview badge */}
                            {adminReplyVoiceAudio && (
                              <div className="p-2.5 bg-blue-950/60 border border-blue-800 rounded-xl flex items-center justify-between text-xs text-blue-200">
                                <div className="flex items-center gap-2">
                                  <span>🎙️ Voice Note Attached ({adminReplyVoiceDuration}s)</span>
                                </div>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setAdminReplyVoiceAudio(null);
                                    setAdminReplyVoiceDuration(0);
                                  }}
                                  className="text-red-400 hover:text-red-300 text-xs font-bold"
                                >
                                  Remove
                                </button>
                              </div>
                            )}

                            <div className="flex justify-end gap-2">
                              <button
                                type="submit"
                                disabled={!adminReplyText.trim() && !adminReplyVoiceAudio}
                                className="px-5 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-xs font-bold rounded-xl cursor-pointer shadow-xs"
                              >
                                Send Admin Reply
                              </button>
                            </div>
                          </form>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* SITE UPDATES & NEWS TAB */}
        {activeTab === 'updates' && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <h1 className="text-2xl font-bold text-white">Site Updates & Announcements</h1>
                <p className="text-slate-400 text-sm">Post announcements, changelogs, and broadcast system notifications</p>
              </div>

              <button
                onClick={openAddUpdateModal}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-lg transition-all cursor-pointer flex items-center gap-1.5"
              >
                <span>+</span> Post New Update
              </button>
            </div>

            <div className="bg-slate-900 rounded-3xl border border-slate-800 shadow-xl overflow-hidden">
              {updatesList.length === 0 ? (
                <div className="p-12 text-center text-slate-400">
                  No site updates posted yet. Click &quot;Post New Update&quot; above to create your first announcement!
                </div>
              ) : (
                <div className="divide-y divide-slate-800">
                  {updatesList.map((upd, idx) => (
                    <div key={`admin-upd-${upd.id}-${idx}`} className="p-6 space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2.5">
                          <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                            upd.status === 'published' ? 'bg-emerald-950 text-emerald-300 border border-emerald-800' : 'bg-slate-800 text-slate-400 border border-slate-700'
                          }`}>
                            {upd.status}
                          </span>
                          <span className="text-xs text-slate-400 font-mono">
                            {new Date(upd.created_at).toLocaleDateString()} {new Date(upd.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>

                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleToggleUpdateStatus(upd)}
                            className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold rounded-lg cursor-pointer"
                          >
                            {upd.status === 'published' ? 'Set as Draft' : 'Publish'}
                          </button>
                          <button
                            onClick={() => openEditUpdateModal(upd)}
                            className="px-2.5 py-1 bg-blue-900/60 hover:bg-blue-800 text-blue-300 text-xs font-semibold rounded-lg cursor-pointer"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => handleDeleteUpdate(upd.id)}
                            className="px-2.5 py-1 bg-red-950/60 hover:bg-red-900 text-red-300 text-xs font-semibold rounded-lg cursor-pointer"
                          >
                            Delete
                          </button>
                        </div>
                      </div>

                      <h3 className="text-lg font-bold text-white">{upd.title}</h3>
                      <p className="text-xs text-slate-300 leading-relaxed whitespace-pre-wrap">{upd.message}</p>

                      {upd.link && (
                        <div className="text-xs text-blue-400">
                          <strong>Link:</strong> <span className="font-mono">{upd.link}</span>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* SYSTEM SETTINGS & API TAB */}
        {activeTab === 'settings' && (
          <div className="space-y-6 max-w-3xl">
            <div>
              <h1 className="text-2xl font-bold text-white">System & API Configuration</h1>
              <p className="text-slate-400 text-sm">Server-side keys, bank routing, and live integrations</p>
            </div>

            <form onSubmit={handleSettingsSave} className="bg-slate-900 rounded-3xl p-6 sm:p-8 border border-slate-800 shadow-xl space-y-6">
              
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold text-blue-400 uppercase tracking-wider">
                    FollowSPanel SMM API Connector
                  </h3>
                  {smmConnectionState === 'connected' ? (
                    <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-semibold">
                      <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                      Live Connected
                    </span>
                  ) : smmConnectionState === 'disconnected' ? (
                    <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-red-500/10 border border-red-500/20 text-red-400 text-xs font-semibold">
                      <span className="w-2 h-2 rounded-full bg-red-400"></span>
                      Disconnected
                    </span>
                  ) : (
                    <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-800 border border-slate-700 text-slate-400 text-xs font-semibold">
                      <span className="w-2 h-2 rounded-full bg-slate-500"></span>
                      Ready to Verify
                    </span>
                  )}
                </div>

                <div className="p-4 bg-slate-950/80 rounded-2xl border border-slate-800 space-y-3">
                  <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2 sm:gap-4">
                    <div className="min-w-0">
                      <div className="text-xs font-semibold text-slate-300">API Endpoint & Provider</div>
                      <div className="text-xs font-mono text-slate-400 mt-0.5 break-all">https://followspanel.com/api/v2</div>
                    </div>
                    <div className="sm:text-right min-w-0">
                      <div className="text-xs font-semibold text-slate-300">Security Storage</div>
                      <div className="text-xs text-emerald-400 font-medium break-all">FOLLOWSPANEL_API_KEY (Server Secret)</div>
                    </div>
                  </div>

                  <div className="pt-3 border-t border-slate-800 flex items-center justify-between flex-wrap gap-2">
                    <div className="text-xs text-slate-400">
                      {smmBalanceInfo ? (
                        <span className="text-emerald-400 font-bold">
                          Provider Balance: {smmBalanceInfo.currency} {parseFloat(smmBalanceInfo.balance).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                        </span>
                      ) : (
                        <span>Check real-time provider wallet funds</span>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={handleFetchSmmBalance}
                      disabled={loadingSmmBalance}
                      className="px-3 py-1.5 bg-blue-600/80 hover:bg-blue-600 text-white text-xs font-bold rounded-xl transition-all cursor-pointer flex items-center gap-1.5"
                    >
                      {loadingSmmBalance ? (
                        <>
                          <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                          <span>Querying...</span>
                        </>
                      ) : (
                        'Query Provider Balance'
                      )}
                    </button>
                  </div>
                </div>
              </div>

              {/* International Numbers Provider API Connector */}
              <div className="space-y-4 pt-4 border-t border-slate-800">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold text-blue-400 uppercase tracking-wider">
                    International Numbers Provider API Connector
                  </h3>
                  <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-semibold">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                    Live Connected
                  </span>
                </div>

                <div className="p-4 bg-slate-950/80 rounded-2xl border border-slate-800 space-y-3">
                  <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2 sm:gap-4">
                    <div className="min-w-0">
                      <div className="text-xs font-semibold text-slate-300">API Endpoint & Provider</div>
                      <div className="text-xs font-mono text-slate-400 mt-0.5 break-all">https://instantnums.com/v1 (InstantNums SMS Verification)</div>
                    </div>
                    <div className="sm:text-right min-w-0">
                      <div className="text-xs font-semibold text-slate-300">Security Storage</div>
                      <div className="text-xs text-emerald-400 font-medium break-all">INSTANTNUMS_API_KEY (Server Secret)</div>
                    </div>
                  </div>

                  <div className="text-xs text-slate-400 leading-relaxed bg-slate-900/60 p-3 rounded-xl border border-slate-800">
                    💡 <strong>Smart Currency & Markup Engine:</strong> Wholesale USD prices are converted to Naira (NGN) with dynamic profit margin protection. Wholesale costs are strictly hidden from customers.
                  </div>

                  {intlBalanceError && (
                    <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-xl text-xs text-red-400 flex items-start gap-2">
                      <span className="text-red-400 font-bold">⚠️</span>
                      <div className="min-w-0 flex-1">
                        <div className="font-semibold text-red-300">Unable to retrieve live InstantNums balance</div>
                        <div className="text-slate-400 text-[11px] mt-0.5">{intlBalanceError}</div>
                      </div>
                    </div>
                  )}

                  <div className="pt-3 border-t border-slate-800 flex items-center justify-between flex-wrap gap-2">
                    <div className="text-xs text-slate-400">
                      {intlBalanceInfo ? (
                        <div className="space-y-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-emerald-400 font-bold text-sm">
                              USD Balance: ${(intlBalanceInfo.balanceUsd ?? intlBalanceInfo.balance_usd).toFixed(2)}
                            </span>
                            <span className="text-slate-400 font-medium text-xs">
                              • NGN Equivalent: <span className="text-white font-bold">₦{(intlBalanceInfo.balanceNgn ?? intlBalanceInfo.balance_ngn).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                            </span>
                            <span className="text-slate-400 text-[11px]">
                              (@ ₦{(intlBalanceInfo.exchangeRate ?? intlBalanceInfo.rate ?? 1600).toLocaleString()}/USD)
                            </span>
                          </div>
                          {intlBalanceLastUpdated && (
                            <div className="text-[11px] text-slate-400">
                              Live sync: {intlBalanceLastUpdated.toLocaleTimeString()}
                            </div>
                          )}
                        </div>
                      ) : loadingIntlBalance ? (
                        <span className="text-blue-400 animate-pulse font-medium">Fetching live InstantNums balance...</span>
                      ) : (
                        <span>Check real-time International Numbers provider balance (Admin Only)</span>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={handleFetchIntlBalance}
                      disabled={loadingIntlBalance}
                      className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-xl transition-all cursor-pointer flex items-center gap-1.5"
                    >
                      {loadingIntlBalance ? (
                        <>
                          <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                          <span>Querying...</span>
                        </>
                      ) : (
                        'Refresh Balance'
                      )}
                    </button>
                  </div>
                </div>
              </div>

              <div className="space-y-4 pt-4 border-t border-slate-800">
                <h3 className="text-sm font-bold text-blue-400 uppercase tracking-wider">Deposit Bank Routing</h3>
                
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">Bank Name</label>
                    <input 
                      type="text" 
                      value={bankName}
                      onChange={(e) => setBankName(e.target.value)}
                      className="w-full px-4 py-2 text-xs bg-slate-950 border border-slate-700 text-white rounded-xl focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">Account Number</label>
                    <input 
                      type="text" 
                      value={bankAccNum}
                      onChange={(e) => setBankAccNum(e.target.value)}
                      className="w-full px-4 py-2 text-xs bg-slate-950 border border-slate-700 text-white rounded-xl focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">Account Name</label>
                    <input 
                      type="text" 
                      value={bankAccName}
                      onChange={(e) => setBankAccName(e.target.value)}
                      className="w-full px-4 py-2 text-xs bg-slate-950 border border-slate-700 text-white rounded-xl focus:outline-none"
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-4 pt-4 border-t border-slate-800">
                <h3 className="text-sm font-bold text-blue-400 uppercase tracking-wider">Contact & Support Details</h3>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Support WhatsApp Number (International format)</label>
                  <input 
                    type="text" 
                    value={whatsapp}
                    onChange={(e) => setWhatsapp(e.target.value)}
                    placeholder="+2348000000000"
                    className="w-full px-4 py-2 text-xs bg-slate-950 border border-slate-700 text-white rounded-xl focus:outline-none"
                  />
                </div>
              </div>

              {/* Live Announcement Marquee Ticker Controls */}
              <div className="space-y-4 pt-4 border-t border-slate-800">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-bold text-blue-400 uppercase tracking-wider">Top Announcement Ticker</h3>
                    <p className="text-xs text-slate-400 mt-0.5">Control the top headline ticker shown across the entire website</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={announcementEnabled}
                      onChange={(e) => setAnnouncementEnabled(e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                  </label>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Ticker Headline Message</label>
                  <textarea
                    rows={2}
                    value={announcementHeadline}
                    onChange={(e) => setAnnouncementHeadline(e.target.value)}
                    placeholder="Welcome to Surest Plug — Buy USA verification numbers from ₦1,000 | Instant Delivery & 24/7 Support"
                    className="w-full px-4 py-2 text-xs bg-slate-950 border border-slate-700 text-white rounded-xl focus:outline-none focus:border-blue-500 resize-none"
                  />
                  <span className="text-[11px] text-slate-500">
                    This live headline repeats across the top banner with smooth marquee motion.
                  </span>
                </div>
              </div>

              <button
                type="submit"
                className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-lg cursor-pointer"
              >
                Save Settings to Database
              </button>
            </form>
          </div>
        )}

      </div>

      {/* Add / Edit Ready-Made Website Product Modal */}
      {showAddProductModal && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
          onClick={() => {
            setShowAddProductModal(false);
            setEditingProduct(null);
          }}
          onTouchMove={(e) => { if (e.target === e.currentTarget) e.preventDefault(); }}
        >
          <div 
            className="bg-slate-900 border border-slate-800 text-white rounded-3xl p-6 sm:p-8 max-w-2xl w-full max-h-[calc(100dvh-2rem)] overflow-y-auto overscroll-contain sp-overlay-scroll space-y-6 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <div>
                <h3 className="text-xl font-bold text-white flex items-center gap-2">
                  <span>💻</span>
                  {editingProduct ? 'Edit Ready-Made Website' : 'Add Ready-Made Website'}
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  {editingProduct 
                    ? 'Update ready-made website details, credentials, or source ZIP package.' 
                    : 'Publish a real ready-made website product for customers to purchase and download.'}
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setShowAddProductModal(false);
                  setEditingProduct(null);
                }}
                className="w-8 h-8 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-300 flex items-center justify-center cursor-pointer transition-colors text-sm font-bold"
              >
                ✕
              </button>
            </div>

            {/* Error Message */}
            {formError && (
              <div className="p-3.5 bg-red-950/80 border border-red-800 text-red-300 text-xs rounded-xl flex items-center gap-2">
                <span>⚠️</span>
                <span>{formError}</span>
              </div>
            )}

            <form onSubmit={handleProductFormSubmit} className="space-y-6">
              
              {/* SECTION 1: WEBSITE INFORMATION */}
              <div className="space-y-4 bg-slate-950/60 p-4 sm:p-5 rounded-2xl border border-slate-800/80">
                <div className="flex items-center gap-2 text-xs font-bold text-blue-400 uppercase tracking-wider">
                  <span className="w-5 h-5 rounded-full bg-blue-900/60 text-blue-300 flex items-center justify-center text-[10px]">1</span>
                  Website Information
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    Website Name <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={prodName}
                    onChange={(e) => setProdName(e.target.value)}
                    placeholder="Enter website name"
                    className="w-full px-4 py-2.5 text-xs bg-slate-900 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 transition-colors"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    Website Description <span className="text-red-400">*</span>
                  </label>
                  <textarea
                    required
                    rows={4}
                    value={prodDesc}
                    onChange={(e) => setProdDesc(e.target.value)}
                    placeholder="Provide a comprehensive description of the ready-made website, tech stack, included pages, setup process, and architecture..."
                    className="w-full px-4 py-2.5 text-xs bg-slate-900 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 transition-colors"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                      Price in NGN (₦) <span className="text-red-400">*</span>
                    </label>
                    <div className="relative">
                      <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-xs">₦</span>
                      <input
                        type="number"
                        step="any"
                        min="0"
                        required
                        value={prodPrice}
                        onChange={(e) => setProdPrice(e.target.value)}
                        placeholder="e.g. 50000"
                        className="w-full pl-8 pr-4 py-2.5 text-xs bg-slate-900 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 transition-colors font-mono"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                      Included Key Features
                    </label>
                    <input
                      type="text"
                      value={prodFeatures}
                      onChange={(e) => setProdFeatures(e.target.value)}
                      placeholder="e.g. Admin CMS, MySQL, Responsive UI, Auth"
                      className="w-full px-4 py-2.5 text-xs bg-slate-900 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 transition-colors"
                    />
                    <p className="text-[10px] text-slate-500 mt-1">Separate multiple features with commas.</p>
                  </div>
                </div>
              </div>

              {/* SECTION 2: WEBSITE PREVIEW */}
              <div className="space-y-4 bg-slate-950/60 p-4 sm:p-5 rounded-2xl border border-slate-800/80">
                <div className="flex items-center gap-2 text-xs font-bold text-blue-400 uppercase tracking-wider">
                  <span className="w-5 h-5 rounded-full bg-blue-900/60 text-blue-300 flex items-center justify-center text-[10px]">2</span>
                  Website Preview & Screenshot
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    Website Preview Image <span className="text-red-400">*</span>
                    <span className="text-slate-400 font-normal ml-1">(JPG, JPEG, PNG, WEBP)</span>
                  </label>
                  
                  <div className="flex flex-col sm:flex-row gap-4 items-start">
                    <label className="flex-1 w-full flex flex-col items-center justify-center p-4 border-2 border-dashed border-slate-700 hover:border-blue-500 rounded-2xl bg-slate-900/80 cursor-pointer transition-colors text-center">
                      <span className="text-2xl mb-1">🖼️</span>
                      <span className="text-xs font-semibold text-blue-400">Choose Preview Image</span>
                      <span className="text-[10px] text-slate-500 mt-0.5">Upload screenshot of the website</span>
                      <input
                        type="file"
                        accept="image/jpeg,image/jpg,image/png,image/webp"
                        onChange={handleImageFileChange}
                        className="hidden"
                      />
                    </label>

                    {(prodImagePreview || prodImage) && (
                      <div className="relative shrink-0 w-full sm:w-36 h-24 rounded-xl overflow-hidden border border-slate-700 bg-slate-800 group">
                        <img
                          src={prodImagePreview || prodImage}
                          alt="Preview"
                          className="w-full h-full object-cover"
                        />
                        <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                          <button
                            type="button"
                            onClick={() => {
                              setProdImage('');
                              setProdImagePreview('');
                            }}
                            className="px-2 py-1 bg-red-600 text-white rounded text-[10px] font-semibold"
                          >
                            Remove
                          </button>
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="mt-2.5">
                    <label className="block text-[11px] text-slate-400 mb-1">Or direct Image URL fallback:</label>
                    <input
                      type="url"
                      value={prodImage.startsWith('data:') ? '' : prodImage}
                      onChange={(e) => {
                        setProdImage(e.target.value);
                        setProdImagePreview(e.target.value);
                      }}
                      placeholder="https://..."
                      className="w-full px-3 py-1.5 text-xs bg-slate-900 border border-slate-700 rounded-xl text-white placeholder-slate-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    Website Preview URL <span className="text-slate-500 font-normal">(Optional)</span>
                  </label>
                  <input
                    type="url"
                    value={prodDemoUrl}
                    onChange={(e) => setProdDemoUrl(e.target.value)}
                    placeholder="https://example.com"
                    className="w-full px-4 py-2.5 text-xs bg-slate-900 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 transition-colors"
                  />
                  <p className="text-[10px] text-slate-400 mt-1">
                    Enter the URL where the customer can preview the live website. Leave blank if the website does not have an online preview.
                  </p>
                </div>
              </div>

              {/* SECTION 3: WEBSITE ACCESS (ADMIN LOGIN CREDENTIALS) */}
              <div className="space-y-4 bg-slate-950/60 p-4 sm:p-5 rounded-2xl border border-slate-800/80">
                <div className="flex items-center gap-2 text-xs font-bold text-blue-400 uppercase tracking-wider">
                  <span className="w-5 h-5 rounded-full bg-blue-900/60 text-blue-300 flex items-center justify-center text-[10px]">3</span>
                  Website Admin Login Credentials
                </div>

                <div className="p-3 bg-blue-950/40 border border-blue-900/60 rounded-xl text-xs text-blue-200">
                  🔒 <strong>Protected Access:</strong> These credentials belong to the sold website&apos;s administration panel. They are never exposed publicly and are securely delivered only to the customer after purchase.
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                      Website Admin Login Email <span className="text-red-400">*</span>
                    </label>
                    <input
                      type="email"
                      required
                      value={prodAdminEmail}
                      onChange={(e) => setProdAdminEmail(e.target.value)}
                      placeholder="admin@website.com"
                      className="w-full px-4 py-2.5 text-xs bg-slate-900 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 transition-colors font-mono"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                      Website Admin Login Password <span className="text-red-400">*</span>
                    </label>
                    <div className="relative">
                      <input
                        type={showAdminPassword ? 'text' : 'password'}
                        required
                        value={prodAdminPassword}
                        onChange={(e) => setProdAdminPassword(e.target.value)}
                        placeholder="Enter admin password"
                        className="w-full px-4 py-2.5 pr-20 text-xs bg-slate-900 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 transition-colors font-mono"
                      />
                      <button
                        type="button"
                        onClick={() => setShowAdminPassword(!showAdminPassword)}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 px-2 py-1 text-[10px] font-semibold text-slate-400 hover:text-white bg-slate-800 rounded cursor-pointer"
                      >
                        {showAdminPassword ? 'Hide' : 'Show'}
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* SECTION 4: WEBSITE FILES (ZIP ARCHIVE) */}
              <div className="space-y-4 bg-slate-950/60 p-4 sm:p-5 rounded-2xl border border-slate-800/80">
                <div className="flex items-center gap-2 text-xs font-bold text-blue-400 uppercase tracking-wider">
                  <span className="w-5 h-5 rounded-full bg-blue-900/60 text-blue-300 flex items-center justify-center text-[10px]">4</span>
                  Website Source Package (ZIP File)
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    Upload Complete Website ZIP <span className="text-red-400">*</span>
                  </label>

                  <label className="w-full flex flex-col items-center justify-center p-6 border-2 border-dashed border-slate-700 hover:border-emerald-500 rounded-2xl bg-slate-900/80 cursor-pointer transition-colors text-center">
                    <span className="text-3xl mb-1">📦</span>
                    <span className="text-xs font-bold text-emerald-400">
                      {uploadingZip ? 'Reading ZIP Archive....' : 'Choose Website ZIP File'}
                    </span>
                    <span className="text-[10px] text-slate-500 mt-1">
                      Accepts .zip files containing full source code and SQL databases
                    </span>
                    <input
                      type="file"
                      accept=".zip,application/zip,application/x-zip-compressed"
                      onChange={handleZipFileChange}
                      className="hidden"
                    />
                  </label>

                  {/* Attached ZIP info badge */}
                  {(prodZipName || editingProduct?.website_zip_name) && (
                    <div className="mt-3 p-3 bg-emerald-950/40 border border-emerald-800/60 rounded-xl flex items-center justify-between text-xs text-emerald-300">
                      <div className="flex items-center gap-2 truncate">
                        <span>✅</span>
                        <span className="font-mono truncate">
                          {prodZipName || editingProduct?.website_zip_name}
                        </span>
                        {(prodZipSize > 0 || (editingProduct?.website_zip_size ?? 0) > 0) && (
                          <span className="text-emerald-400/80 shrink-0">
                            ({formatBytes(prodZipSize || editingProduct?.website_zip_size || 0)})
                          </span>
                        )}
                      </div>
                      <span className="text-[10px] font-bold uppercase tracking-wider bg-emerald-900/60 px-2 py-0.5 rounded text-emerald-200 shrink-0">
                        {prodZipData ? 'Validated' : 'Retained'}
                      </span>
                    </div>
                  )}
                  
                  {editingProduct && (
                    <p className="text-[10px] text-slate-400 mt-2">
                      💡 When editing, the existing ZIP package is preserved unless you upload a new .zip file.
                    </p>
                  )}
                </div>
              </div>

              {/* SECTION 5: PUBLISHING */}
              <div className="space-y-4 bg-slate-950/60 p-4 sm:p-5 rounded-2xl border border-slate-800/80">
                <div className="flex items-center gap-2 text-xs font-bold text-blue-400 uppercase tracking-wider">
                  <span className="w-5 h-5 rounded-full bg-blue-900/60 text-blue-300 flex items-center justify-center text-[10px]">5</span>
                  Publishing & Stock Status
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1.5">Availability Status</label>
                    <select
                      value={prodAvailability}
                      onChange={(e) => setProdAvailability(e.target.value as 'available' | 'out_of_stock')}
                      className="w-full px-4 py-2.5 text-xs bg-slate-900 border border-slate-700 rounded-xl text-white focus:outline-none focus:border-blue-500"
                    >
                      <option value="available">Available for sale</option>
                      <option value="out_of_stock">Out of stock</option>
                    </select>
                  </div>

                  <div className="flex items-center pt-6">
                    <label className="flex items-center gap-2.5 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={prodFeatured}
                        onChange={(e) => setProdFeatured(e.target.checked)}
                        className="w-4 h-4 rounded text-blue-600 bg-slate-900 border-slate-700"
                      />
                      <span className="text-xs text-slate-300 font-medium">Feature on Marketplace Homepage</span>
                    </label>
                  </div>
                </div>
              </div>

              {/* Form Action Buttons */}
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => {
                    setShowAddProductModal(false);
                    setEditingProduct(null);
                  }}
                  className="px-5 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold rounded-xl cursor-pointer transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={uploadingZip}
                  className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 disabled:opacity-50 text-white text-xs font-bold rounded-xl shadow-lg cursor-pointer transition-colors"
                >
                  {editingProduct ? 'Update Ready-Made Website' : 'Add Ready-Made Website'}
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

      {/* Adjust User Balance Modal */}
      {selectedUserForBalance && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs"
          onClick={() => setSelectedUserForBalance(null)}
          onTouchMove={(e) => { if (e.target === e.currentTarget) e.preventDefault(); }}
        >
          <div 
            className="bg-slate-900 border border-slate-800 text-white rounded-3xl p-6 sm:p-8 max-w-md w-full max-h-[calc(100dvh-2rem)] overflow-y-auto overscroll-contain sp-overlay-scroll space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-xl font-bold">Adjust User Balance</h3>
            <p className="text-xs text-slate-400">
              User: <strong className="text-white">{selectedUserForBalance.full_name}</strong> ({selectedUserForBalance.email})
            </p>
            <p className="text-sm font-bold text-emerald-400">
              Current Balance: ₦{selectedUserForBalance.balance.toLocaleString()}
            </p>

            <form onSubmit={handleBalanceSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">Action</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setBalanceAction('credit')}
                    className={`py-2 text-xs font-bold rounded-xl ${balanceAction === 'credit' ? 'bg-emerald-600 text-white' : 'bg-slate-800 text-slate-400'}`}
                  >
                    + Credit Balance
                  </button>
                  <button
                    type="button"
                    onClick={() => setBalanceAction('debit')}
                    className={`py-2 text-xs font-bold rounded-xl ${balanceAction === 'debit' ? 'bg-red-600 text-white' : 'bg-slate-800 text-slate-400'}`}
                  >
                    - Debit Balance
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">Amount (₦)</label>
                <input 
                  type="number" 
                  required
                  min={1}
                  value={balanceAmount}
                  onChange={(e) => setBalanceAmount(e.target.value)}
                  className="w-full px-4 py-2 text-xs bg-slate-950 border border-slate-700 rounded-xl"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">Audit Reason</label>
                <input 
                  type="text" 
                  required
                  value={balanceReason}
                  onChange={(e) => setBalanceReason(e.target.value)}
                  className="w-full px-4 py-2 text-xs bg-slate-950 border border-slate-700 rounded-xl"
                />
              </div>

              <div className="flex justify-end gap-2 pt-4">
                <button
                  type="button"
                  onClick={() => setSelectedUserForBalance(null)}
                  className="px-4 py-2 bg-slate-800 text-slate-300 text-xs font-semibold rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-blue-600 text-white text-xs font-bold rounded-xl"
                >
                  Apply Balance Change
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add / Edit Site Update Modal */}
      {showAddUpdateModal && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
          onClick={() => {
            setShowAddUpdateModal(false);
            setEditingUpdate(null);
          }}
          onTouchMove={(e) => { if (e.target === e.currentTarget) e.preventDefault(); }}
        >
          <div 
            className="bg-slate-900 border border-slate-800 text-white rounded-3xl p-6 sm:p-8 max-w-lg w-full max-h-[calc(100dvh-2rem)] overflow-y-auto overscroll-contain sp-overlay-scroll space-y-5 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-xl font-bold text-white flex items-center gap-2">
                <span>📢</span>
                <span>{editingUpdate ? 'Edit Site Announcement' : 'Post New Announcement'}</span>
              </h3>
              <button
                type="button"
                onClick={() => {
                  setShowAddUpdateModal(false);
                  setEditingUpdate(null);
                }}
                className="w-8 h-8 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-300 flex items-center justify-center text-sm font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveUpdate} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">Announcement Title *</label>
                <input
                  type="text"
                  required
                  value={updateTitle}
                  onChange={(e) => setUpdateTitle(e.target.value)}
                  placeholder="e.g. New Ready-Made Real Estate Platform Added!"
                  className="w-full px-4 py-2.5 text-xs bg-slate-950 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">Announcement Message *</label>
                <textarea
                  required
                  rows={4}
                  value={updateMessage}
                  onChange={(e) => setUpdateMessage(e.target.value)}
                  placeholder="Details of the announcement, changelog, or promotion..."
                  className="w-full px-4 py-2.5 text-xs bg-slate-950 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">Action Link (Optional)</label>
                <input
                  type="text"
                  value={updateLink}
                  onChange={(e) => setUpdateLink(e.target.value)}
                  placeholder="e.g. /marketplace or https://..."
                  className="w-full px-4 py-2.5 text-xs bg-slate-950 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">Publication Status</label>
                  <select
                    value={updateStatus}
                    onChange={(e) => setUpdateStatus(e.target.value as 'published' | 'draft')}
                    className="w-full px-3 py-2 text-xs bg-slate-950 border border-slate-700 rounded-xl text-white focus:outline-none"
                  >
                    <option value="published">Published (Live)</option>
                    <option value="draft">Draft (Hidden)</option>
                  </select>
                </div>

                {!editingUpdate && (
                  <div className="flex items-center pt-5">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={broadcastNotification}
                        onChange={(e) => setBroadcastNotification(e.target.checked)}
                        className="w-4 h-4 rounded text-blue-600 bg-slate-950 border-slate-700"
                      />
                      <span className="text-xs text-slate-300 font-medium">Broadcast to user inboxes</span>
                    </label>
                  </div>
                )}
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => {
                    setShowAddUpdateModal(false);
                    setEditingUpdate(null);
                  }}
                  className="px-4 py-2 bg-slate-800 text-slate-300 text-xs font-semibold rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-lg cursor-pointer"
                >
                  {editingUpdate ? 'Update Announcement' : 'Publish Announcement'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Admin First-time Welcome Modal (State driven, MySQL/Store backed) */}
      {showAdminWelcomeModal && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-xs"
          onClick={() => {
            setShowAdminWelcomeModal(false);
            store.dismissAdminWelcome(currentUser.id);
          }}
          onTouchMove={(e) => { if (e.target === e.currentTarget) e.preventDefault(); }}
        >
          <div 
            className="bg-slate-900 rounded-3xl max-w-lg w-full max-h-[calc(100dvh-2rem)] overflow-y-auto overscroll-contain sp-overlay-scroll p-6 sm:p-8 shadow-2xl border border-slate-800 text-center"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-16 h-16 rounded-2xl bg-blue-600/20 border border-blue-500/30 text-blue-400 flex items-center justify-center text-3xl mx-auto mb-4">
              🛡️
            </div>
            <h3 className="text-2xl font-black text-white mb-2">Welcome to Surest Plug Admin Panel</h3>
            <p className="text-slate-300 text-sm mb-6 leading-relaxed">
              You have full administrative privileges to manage ready-made website catalog items, audit user wallet balances, approve/reject bank proof deposits, review custom web requests, and route SMM orders.
            </p>

            <div className="bg-slate-800/80 border border-slate-700/60 rounded-2xl p-4 text-left mb-6 space-y-2 text-xs">
              <p className="font-bold text-white flex items-center gap-1.5">
                <span>⚡</span> Quick Management Guidelines:
              </p>
              <ul className="text-slate-300 space-y-1 pl-4 list-disc">
                <li>Attach live demo preview URLs, admin login credentials, and ZIP files to website products.</li>
                <li>Deposits upload verified proofs to database storage for quick 1-click approvals.</li>
                <li>Manage customer orders, custom development projects, and support requests.</li>
              </ul>
            </div>

            <button
              onClick={() => {
                setShowAdminWelcomeModal(false);
                store.dismissAdminWelcome(currentUser.id);
              }}
              className="w-full py-3 bg-blue-600 hover:bg-blue-500 active:bg-blue-700 text-white font-bold text-sm rounded-2xl shadow-lg transition-all cursor-pointer"
            >
              Enter Admin Control Panel
            </button>
          </div>
        </div>
      )}

      {/* Deposit Receipt Preview Modal */}
      {viewingDepositReceipt && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-xs animate-in fade-in"
          onClick={() => setViewingDepositReceipt(null)}
          onTouchMove={(e) => { if (e.target === e.currentTarget) e.preventDefault(); }}
        >
          <div 
            className="bg-slate-900 rounded-3xl max-w-2xl w-full max-h-[calc(100dvh-2rem)] overflow-y-auto overscroll-contain sp-overlay-scroll p-6 sm:p-8 shadow-2xl border border-slate-800 space-y-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <div>
                <span className="text-xs font-mono font-bold text-blue-400">
                  {viewingDepositReceipt.deposit_reference}
                </span>
                <h3 className="text-lg font-bold text-white mt-0.5">
                  Payment Receipt Verification
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setViewingDepositReceipt(null)}
                className="w-8 h-8 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center text-sm cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Receipt Details Card */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
              <div className="p-3 bg-slate-950 rounded-xl border border-slate-800">
                <span className="text-slate-500 uppercase block text-[10px]">Amount</span>
                <span className="text-emerald-400 font-extrabold text-sm">₦{viewingDepositReceipt.amount.toLocaleString()}</span>
              </div>
              <div className="p-3 bg-slate-950 rounded-xl border border-slate-800">
                <span className="text-slate-500 uppercase block text-[10px]">User ID</span>
                <span className="text-white font-bold text-sm">{viewingDepositReceipt.user_id}</span>
              </div>
              <div className="p-3 bg-slate-950 rounded-xl border border-slate-800">
                <span className="text-slate-500 uppercase block text-[10px]">Method</span>
                <span className="text-slate-300 font-bold truncate block">{viewingDepositReceipt.payment_method}</span>
              </div>
              <div className="p-3 bg-slate-950 rounded-xl border border-slate-800">
                <span className="text-slate-500 uppercase block text-[10px]">Status</span>
                <span className={`font-bold uppercase ${
                  viewingDepositReceipt.status === 'approved' ? 'text-emerald-400' : viewingDepositReceipt.status === 'rejected' ? 'text-red-400' : 'text-amber-400'
                }`}>{viewingDepositReceipt.status}</span>
              </div>
            </div>

            {/* Receipt Image */}
            <div className="bg-slate-950 p-3 rounded-2xl border border-slate-800 max-h-96 overflow-auto flex items-center justify-center">
              {viewingDepositReceipt.payment_proof ? (
                <img
                  src={viewingDepositReceipt.payment_proof}
                  alt="Customer Payment Receipt"
                  className="max-h-80 w-auto rounded-xl object-contain shadow-lg"
                />
              ) : (
                <p className="text-xs text-slate-500 py-8">No image file attached</p>
              )}
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setViewingDepositReceipt(null)}
                className="w-full sm:w-auto px-5 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold text-xs rounded-xl cursor-pointer"
              >
                Close
              </button>

              {viewingDepositReceipt.status === 'pending' && (
                <>
                  <button
                    type="button"
                    onClick={() => {
                      onRejectDeposit(viewingDepositReceipt.id);
                      setViewingDepositReceipt(null);
                    }}
                    className="w-full sm:w-auto px-5 py-2.5 bg-red-600 hover:bg-red-700 text-white font-bold text-xs rounded-xl shadow-xs cursor-pointer"
                  >
                    ✕ Reject Deposit
                  </button>
                  {viewingDepositReceipt.amount < 1000 ? (
                    <span className="w-full sm:w-auto px-4 py-2.5 bg-red-950/80 border border-red-700 text-red-300 rounded-xl text-xs font-bold text-center">
                      ⚠️ Below ₦1,000 Minimum
                    </span>
                  ) : (
                    <button
                      type="button"
                      onClick={() => {
                        onApproveDeposit(viewingDepositReceipt.id);
                        setViewingDepositReceipt(null);
                      }}
                      className="w-full sm:w-auto px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-md cursor-pointer"
                    >
                      ✓ Approve & Credit ₦{viewingDepositReceipt.amount.toLocaleString()}
                    </button>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default AdminDashboardPage;
