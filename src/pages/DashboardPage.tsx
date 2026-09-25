/**
 * Surest Plug - Customer Dashboard Component
 * Visual layout matches uploaded reference screenshot:
 * Sidebar, Top Header, Balance Card, Orders KPIs, Quick Actions, Recent Orders, Recent Transactions
 */

import React, { useState } from 'react';
import { User, Order, Transaction, Deposit, CustomOrder, SupportTicket } from '../types';
import { Sidebar } from '../components/Sidebar';
import { SPLoader } from '../components/SPLoader';
import { ErrorBoundary } from '../components/ErrorBoundary';
import { VoiceRecorder } from '../components/VoiceRecorder';
import { VoiceNotePlayer } from '../components/VoiceNotePlayer';
import { ResellerApiDashboard } from '../components/ResellerApiDashboard';
import { store } from '../lib/store';
import { openPaystackPayment } from '../lib/paystack';
import { useBodyScrollLock } from '../lib/scrollLock';
import { ScrollReveal } from '../components/ScrollReveal';

interface DashboardPageProps {
  currentUser: User;
  orders: Order[];
  transactions: Transaction[];
  deposits: Deposit[];
  customOrders: CustomOrder[];
  supportTickets: SupportTicket[];
  activeTab: string;
  onTabChange: (tab: string) => void;
  onNavigate: (route: string) => void;
  onSubmitDeposit: (amount: number, method: string, reference?: string, proof?: string) => void;
  onCreateSupportTicket: (subject: string, message: string, messageType?: 'text' | 'voice', audioData?: string, audioDuration?: number) => void;
  onReplySupportTicket: (ticketId: number, message: string, messageType?: 'text' | 'voice', audioData?: string, audioDuration?: number) => void;
  onUpdateProfile: (updates: Partial<User>) => void;
}

export const DashboardPage: React.FC<DashboardPageProps> = ({
  currentUser,
  orders,
  transactions,
  deposits,
  customOrders,
  supportTickets,
  activeTab,
  onTabChange,
  onNavigate,
  onSubmitDeposit,
  onCreateSupportTicket,
  onReplySupportTicket,
  onUpdateProfile
}) => {
  // Dashboard Collapsible Menu state
  const [isDashboardMenuOpen, setIsDashboardMenuOpen] = useState(false);

  // Fund Account state
  const currentSettings = store.getSettings();
  const [fundingTab, setFundingTab] = useState<'paystack' | 'bank'>('paystack');
  const [paystackAmount, setPaystackAmount] = useState<string>('5000');
  const [isPaystackProcessing, setIsPaystackProcessing] = useState(false);
  const [paystackStatusMessage, setPaystackStatusMessage] = useState<string>('');
  const [paystackSuccessNotice, setPaystackSuccessNotice] = useState<{ reference: string; amount: number; message: string } | null>(null);
  const [paystackErrorNotice, setPaystackErrorNotice] = useState<string | null>(null);
  const [depositAmount, setDepositAmount] = useState<string>('5000');
  const [depositMethod, setDepositMethod] = useState<string>(`Bank Transfer (${currentSettings.bank_name || 'OPAY BANK'})`);
  const [depositRef, setDepositRef] = useState<string>('');
  const [depositProof, setDepositProof] = useState<string>('');
  const [proofFileName, setProofFileName] = useState<string>('');
  const [proofFileSize, setProofFileSize] = useState<string>('');
  const [proofUploadError, setProofUploadError] = useState<string>('');
  const [depositErrorNotice, setDepositErrorNotice] = useState<string | null>(null);
  const [isDraggingProof, setIsDraggingProof] = useState(false);
  const [depositSuccessNotice, setDepositSuccessNotice] = useState<{ reference: string; amount: number } | null>(null);

  // Support state
  const [supportChannel, setSupportChannel] = useState<'ticket' | 'whatsapp'>('ticket');
  const [newTicketSubject, setNewTicketSubject] = useState('');
  const [newTicketMessage, setNewTicketMessage] = useState('');
  const [selectedTicket, setSelectedTicket] = useState<SupportTicket | null>(null);
  const [replyText, setReplyText] = useState('');

  // Profile state
  const [fullName, setFullName] = useState(currentUser.full_name);
  const [phone, setPhone] = useState(currentUser.phone || '');

  // SMM Provider Status Check state
  const [checkingSmmId, setCheckingSmmId] = useState<number | string | null>(null);
  const [smmStatusResults, setSmmStatusResults] = useState<Record<string, any>>({});
  const [checkingNumberId, setCheckingNumberId] = useState<number | null>(null);

  const handleCheckVirtualNumberStatus = async (orderId: number, details?: any) => {
    setCheckingNumberId(orderId);
    try {
      let res: any;
      const providerOrderId = details?.provider_order_id || details?.order_id || details?.activation_id;
      if (providerOrderId) {
        res = await store.checkInstantNumsActivationStatus(orderId, String(providerOrderId));
      }
      setCheckingNumberId(null);
      const code = res?.details?.verification_code || res?.order?.customer_details?.verification_code;
      if (res?.success && code) {
        alert(`✅ Verification code received: ${code}`);
      } else if (res?.success) {
        alert(`Status: ${res?.details?.status || 'Waiting for SMS...'}`);
      } else {
        alert(res?.error || 'Failed to check status.');
      }
    } catch (e: any) {
      setCheckingNumberId(null);
      alert(e.message || 'Error checking status');
    }
  };

  // Ready-Made Website Order Download & Credentials state
  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadMessage, setDownloadMessage] = useState('Connecting to Surest Plug....');
  const [copiedEmailOrderId, setCopiedEmailOrderId] = useState<number | null>(null);
  const [copiedPasswordOrderId, setCopiedPasswordOrderId] = useState<number | null>(null);
  const [visiblePasswordOrderIds, setVisiblePasswordOrderIds] = useState<number[]>([]);

  // Referral state
  const [copiedReferralCode, setCopiedReferralCode] = useState(false);
  const [copiedReferralLink, setCopiedReferralLink] = useState(false);
  const [copiedReferral, setCopiedReferral] = useState(false);
  const [showReferralRulesModal, setShowReferralRulesModal] = useState(false);
  const [viewingUserReceipt, setViewingUserReceipt] = useState<Deposit | null>(null);
  const referralStats = store.getReferralStats(currentUser.id);
  const userReferralsList = store.getReferrals(currentUser.id);
  const userRewardsList = store.getReferralRewards(currentUser.id);

  // Computed metrics for dashboard
  const totalOrdersCount = orders.length;
  const pendingOrdersCount = orders.filter(o => o.status === 'pending' || o.status === 'processing').length;
  const completedOrdersCount = orders.filter(o => o.status === 'completed').length;
  const totalSpent = orders.reduce((sum, o) => sum + (o.payment_status === 'paid' ? o.amount : 0), 0);

  const handleCheckSmmStatus = async (smmOrderId: number | string) => {
    setCheckingSmmId(smmOrderId);
    try {
      const res = await store.checkSmmOrderStatus(smmOrderId);
      if (res && res.status) {
        setSmmStatusResults(prev => ({
          ...prev,
          [String(smmOrderId)]: res.status
        }));
      }
    } catch (e) {
      console.error(e);
    } finally {
      setCheckingSmmId(null);
    }
  };

  // First-time welcome modal state
  const [showWelcomeModal, setShowWelcomeModal] = useState(currentUser.welcome_seen === false);

  // Lock body scroll when any dashboard modal is active on mobile/tablet
  useBodyScrollLock(Boolean(showWelcomeModal || showReferralRulesModal || viewingUserReceipt));

  const handleProofFileSelection = (file: File) => {
    setProofUploadError('');
    const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (!validTypes.includes(file.type.toLowerCase()) && !file.name.match(/\.(jpg|jpeg|png|webp)$/i)) {
      setProofUploadError('Only JPG, PNG, and WebP receipt images are supported.');
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      setProofUploadError('Receipt image size exceeds 10MB limit.');
      return;
    }

    const sizeStr = file.size > 1024 * 1024 
      ? `${(file.size / (1024 * 1024)).toFixed(1)} MB` 
      : `${Math.round(file.size / 1024)} KB`;

    setProofFileName(file.name);
    setProofFileSize(sizeStr);

    const reader = new FileReader();
    reader.onload = (e) => {
      if (typeof e.target?.result === 'string') {
        setDepositProof(e.target.result);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveProof = () => {
    setDepositProof('');
    setProofFileName('');
    setProofFileSize('');
    setProofUploadError('');
  };

  const handleDepositSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setDepositErrorNotice(null);
    setDepositSuccessNotice(null);

    const amountNum = parseFloat(depositAmount);
    if (!depositAmount || isNaN(amountNum) || amountNum <= 0) {
      setDepositErrorNotice('Please enter a valid deposit amount.');
      return;
    }

    if (amountNum < 1000) {
      setDepositErrorNotice('Minimum funding amount is ₦1,000.');
      return;
    }

    if (!depositProof) {
      setProofUploadError('Please upload a payment receipt image proof.');
      return;
    }
    
    onSubmitDeposit(amountNum, depositMethod, depositRef, depositProof);
    
    const submittedRef = depositRef || `SP-DEP-${Math.floor(100000 + Math.random() * 900000)}`;
    setDepositSuccessNotice({
      reference: submittedRef,
      amount: amountNum
    });

    setDepositRef('');
    setDepositProof('');
    setProofFileName('');
    setProofFileSize('');
    
    // Smoothly switch tab to transactions so the user immediately sees their ledger entry
    setTimeout(() => {
      onTabChange('transactions');
    }, 1500);
  };

  const handlePaystackPayment = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setPaystackErrorNotice(null);
    setPaystackSuccessNotice(null);

    const amountNum = parseFloat(paystackAmount);
    if (!paystackAmount || isNaN(amountNum) || amountNum <= 0) {
      setPaystackErrorNotice('Please enter a valid deposit amount.');
      return;
    }

    if (amountNum < 1000) {
      setPaystackErrorNotice('Minimum funding amount is ₦1,000.');
      return;
    }

    setIsPaystackProcessing(true);
    setPaystackStatusMessage('Preparing secure Paystack checkout...');

    await openPaystackPayment({
      amount: amountNum,
      email: currentUser.email,
      fullName: currentUser.full_name,
      userId: currentUser.id,
      onInitiating: () => {
        setIsPaystackProcessing(true);
        setPaystackStatusMessage('Connecting to Paystack...');
      },
      onOpened: () => {
        setIsPaystackProcessing(false);
        setPaystackStatusMessage('');
      },
      onVerifying: () => {
        setIsPaystackProcessing(true);
        setPaystackStatusMessage('Verifying payment with Paystack...');
      },
      onSuccess: (result) => {
        setIsPaystackProcessing(false);
        setPaystackStatusMessage('');
        
        // Atomically credit wallet & update local store and Firestore
        const creditResult = store.creditPaystackDeposit(
          currentUser.id,
          result.amount,
          result.reference,
          currentUser.email,
          currentUser.full_name
        );

        if (creditResult.alreadyProcessed) {
          setPaystackSuccessNotice({
            reference: result.reference,
            amount: result.amount,
            message: `This payment (Ref: ${result.reference}) was already credited to your wallet balance.`
          });
        } else {
          setPaystackSuccessNotice({
            reference: result.reference,
            amount: result.amount,
            message: `Payment successful! ₦${result.amount.toLocaleString('en-US', { minimumFractionDigits: 2 })} has been added to your wallet.`
          });
        }
      },
      onCancel: (cancelMsg) => {
        setIsPaystackProcessing(false);
        setPaystackStatusMessage('');
        setPaystackErrorNotice(cancelMsg || 'Payment was cancelled.');
      },
      onError: (errMsg) => {
        setIsPaystackProcessing(false);
        setPaystackStatusMessage('');
        setPaystackErrorNotice(errMsg || 'Payment was not successful. No money was added to your wallet.');
      }
    });
  };

  const [recordedVoiceAudio, setRecordedVoiceAudio] = useState<string | null>(null);
  const [recordedVoiceDuration, setRecordedVoiceDuration] = useState<number>(0);
  const [replyVoiceAudio, setReplyVoiceAudio] = useState<string | null>(null);
  const [replyVoiceDuration, setReplyVoiceDuration] = useState<number>(0);

  const handleTicketCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTicketSubject) return;
    if (recordedVoiceAudio) {
      onCreateSupportTicket(
        newTicketSubject,
        newTicketMessage || 'Voice message attached',
        'voice',
        recordedVoiceAudio,
        recordedVoiceDuration
      );
      setNewTicketSubject('');
      setNewTicketMessage('');
      setRecordedVoiceAudio(null);
      setRecordedVoiceDuration(0);
    } else {
      if (!newTicketMessage) return;
      onCreateSupportTicket(newTicketSubject, newTicketMessage, 'text');
      setNewTicketSubject('');
      setNewTicketMessage('');
    }
  };

  const handleTicketReply = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTicket) return;
    if (replyVoiceAudio) {
      onReplySupportTicket(
        selectedTicket.id,
        replyText || 'Voice message attached',
        'voice',
        replyVoiceAudio,
        replyVoiceDuration
      );
      setReplyText('');
      setReplyVoiceAudio(null);
      setReplyVoiceDuration(0);
    } else {
      if (!replyText) return;
      onReplySupportTicket(selectedTicket.id, replyText, 'text');
      setReplyText('');
    }
  };

  const handleProfileSave = (e: React.FormEvent) => {
    e.preventDefault();
    onUpdateProfile({ full_name: fullName, phone });
  };

  const formatBytes = (bytes?: number): string => {
    if (!bytes || bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const handleCopyEmail = (orderId: number, email?: string) => {
    if (!email) return;
    navigator.clipboard.writeText(email);
    setCopiedEmailOrderId(orderId);
    setTimeout(() => setCopiedEmailOrderId(null), 2000);
  };

  const handleCopyPassword = (orderId: number, pass?: string) => {
    if (!pass) return;
    navigator.clipboard.writeText(pass);
    setCopiedPasswordOrderId(orderId);
    setTimeout(() => setCopiedPasswordOrderId(null), 2000);
  };

  const togglePasswordVisibility = (orderId: number) => {
    setVisiblePasswordOrderIds(prev => 
      prev.includes(orderId) ? prev.filter(id => id !== orderId) : [...prev, orderId]
    );
  };

  const handleDownloadWebsiteZip = async (order: Order) => {
    let zipData = order.customer_details?.website_zip_data;
    if (!zipData) {
      zipData = await store.getWebsiteZipDataAsync(order.id, 'order');
    }
    const zipPath = order.customer_details?.website_zip_path;
    const rawZipName = order.customer_details?.website_zip_name || `${(order.customer_details?.website_name || order.product_name).replace(/[^a-zA-Z0-9_-]/g, '_').toLowerCase()}_source_package.zip`;
    const cleanZipName = rawZipName.endsWith('.zip') ? rawZipName : `${rawZipName}.zip`;

    if (!zipData && !zipPath) {
      alert('Website file is currently unavailable. Please contact support.');
      return;
    }

    setIsDownloading(true);
    setDownloadMessage('Connecting to Surest Plug....');

    setTimeout(() => {
      try {
        if (zipData && zipData.startsWith('data:')) {
          const arr = zipData.split(',');
          const mime = arr[0].match(/:(.*?);/)?.[1] || 'application/zip';
          const bstr = atob(arr[1]);
          let n = bstr.length;
          const u8arr = new Uint8Array(n);
          while (n--) {
            u8arr[n] = bstr.charCodeAt(n);
          }
          const blob = new Blob([u8arr], { type: mime });
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = cleanZipName;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          URL.revokeObjectURL(url);
        } else {
          // Generate digital source package zip blob
          const manifestContent = `Surest Plug Ready-Made Website Source Package\n\n` +
            `Website Name: ${order.customer_details?.website_name || order.product_name}\n` +
            `Order Reference: ${order.order_reference}\n` +
            `Purchase Date: ${new Date(order.created_at).toLocaleString()}\n` +
            `Admin Login Email: ${order.customer_details?.admin_email || 'Not configured'}\n` +
            `Admin Login Password: ${order.customer_details?.admin_password || 'Not configured'}\n` +
            `Preview URL: ${order.customer_details?.preview_url || 'N/A'}\n\n` +
            `Included Features:\n${(order.customer_details?.features || []).map((f: string) => `- ${f}`).join('\n')}\n\n` +
            `Delivered securely via Surest Plug Platform.`;
          
          const blob = new Blob([manifestContent], { type: 'application/zip' });
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = cleanZipName;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          URL.revokeObjectURL(url);
        }
      } catch (e) {
        alert('Website file is currently unavailable. Please contact support.');
      } finally {
        setIsDownloading(false);
      }
    }, 1200);
  };

  return (
    <div className="min-h-[calc(100vh-5rem)] bg-slate-50 w-full max-w-full overflow-x-hidden flex flex-col">
      <SPLoader isLoading={isDownloading} message={downloadMessage} />
      
      {/* Fixed Collapsible Navigation Drawer */}
      <Sidebar 
        isOpen={isDashboardMenuOpen}
        onClose={() => setIsDashboardMenuOpen(false)}
        currentRoute={activeTab} 
        currentUser={currentUser} 
        orders={orders}
        customOrders={customOrders}
        supportTickets={supportTickets}
        onNavigate={(route) => {
          setIsDashboardMenuOpen(false);
          if (['dashboard', 'orders', 'custom-orders', 'wallet', 'fund', 'transactions', 'referrals', 'support', 'profile'].includes(route)) {
            onTabChange(route);
          } else {
            onNavigate(route);
          }
        }} 
      />

      {/* Top Navigation Menu Button for Non-Dashboard Tabs (Accessible, proper layout space, never overlapping) */}
      {activeTab !== 'dashboard' && (
        <div className="relative z-20 max-w-7xl mx-auto w-full px-3.5 sm:px-6 lg:px-8 pt-3 sm:pt-4 pb-2">
          <button
            type="button"
            onClick={() => setIsDashboardMenuOpen(true)}
            className="inline-flex items-center gap-2 px-3.5 py-2 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white text-xs sm:text-sm font-bold rounded-xl shadow-md hover:shadow-blue-600/30 transition-all transform hover:-translate-y-0.5 cursor-pointer whitespace-nowrap"
            aria-label="Open Dashboard Navigation Menu"
          >
            <svg className="w-4 h-4 sm:w-5 sm:h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.2" d="M4 6h16M4 12h16M4 18h16" />
            </svg>
            <span>Menu</span>
          </button>
        </div>
      )}

      {/* Main Full-Width Dashboard Content Area */}
      <div className="flex-1 px-3.5 sm:px-6 lg:px-8 pb-12 pt-3 sm:pt-4 max-w-7xl mx-auto w-full min-w-0">
        
        {/* OVERVIEW TAB */}
        {activeTab === 'dashboard' && (
          <div className="space-y-8 animate-tab-enter">
            
            {/* Welcome Banner - Fully Responsive, Clean Hierarchy, No Overlap */}
            <ScrollReveal direction="up">
              <div className="bg-gradient-to-r from-blue-700 via-blue-600 to-indigo-700 rounded-3xl p-5 sm:p-7 lg:p-8 text-white shadow-xl flex flex-col lg:flex-row lg:items-center justify-between gap-6">
                <div className="space-y-3.5 sm:space-y-4 max-w-2xl min-w-0">
                  {/* Top Row: Customer Portal Badge and Menu Trigger Button */}
                  <div className="flex flex-wrap items-center gap-2.5 sm:gap-3">
                    <button
                      type="button"
                      id="dashboard-open-sidebar-btn"
                      onClick={() => setIsDashboardMenuOpen(true)}
                      className="inline-flex items-center gap-2 px-3 py-1.5 bg-white/20 hover:bg-white/30 active:bg-white/40 text-white text-xs font-bold rounded-xl backdrop-blur-xs transition-colors cursor-pointer border border-white/20 shadow-xs"
                      aria-label="Open Navigation Menu"
                      title="Open Navigation Menu"
                    >
                      <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.2" d="M4 6h16M4 12h16M4 18h16" />
                      </svg>
                      <span>Menu</span>
                    </button>
                    <span className="px-3 py-1 bg-white/20 text-white text-xs font-semibold rounded-full backdrop-blur-xs whitespace-nowrap shrink-0">
                      Customer Portal
                    </span>
                  </div>

                  {/* Welcome Heading with clear gap */}
                  <h1 className="text-xl sm:text-2xl md:text-3xl font-extrabold tracking-tight break-words pt-1">
                    Welcome back, {currentUser.full_name}! 👋
                  </h1>

                  {/* Description Text with proper spacing */}
                  <p className="text-blue-100 text-xs sm:text-sm max-w-xl leading-relaxed">
                    Manage your orders, fund your wallet, track custom software developments, and order boosting services securely.
                  </p>
                </div>

                {/* Fund Wallet Button: properly positioned, wrapping cleanly on mobile */}
                <div className="shrink-0 self-start lg:self-center">
                  <button
                    onClick={() => onTabChange('fund')}
                    className="px-5 sm:px-6 py-2.5 sm:py-3 bg-white hover:bg-slate-100 active:bg-slate-200 text-blue-700 font-bold text-xs sm:text-sm rounded-2xl shadow-lg transition-all transform hover:-translate-y-0.5 cursor-pointer whitespace-nowrap"
                  >
                    + Fund Wallet
                  </button>
                </div>
              </div>
            </ScrollReveal>

            {/* Metric KPI Cards (Calculated directly from MySQL state) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
              
              {/* Card 1: Balance */}
              <ScrollReveal direction="up" delay={0}>
                <div className="h-full bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs flex items-center justify-between">
                  <div>
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Wallet Balance</p>
                    <h3 className="text-2xl font-black text-slate-900 mt-1">
                      ₦{currentUser.balance.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                    </h3>
                    <button 
                      onClick={() => onTabChange('fund')}
                      className="text-xs font-semibold text-blue-600 hover:text-blue-700 mt-2 block cursor-pointer"
                    >
                      + Add Funds
                    </button>
                  </div>
                  <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center">
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                    </svg>
                  </div>
                </div>
              </ScrollReveal>

              {/* Card 2: Total Orders */}
              <ScrollReveal direction="up" delay={80}>
                <div className="h-full bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs flex items-center justify-between">
                  <div>
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Total Orders</p>
                    <h3 className="text-2xl font-black text-slate-900 mt-1">{totalOrdersCount}</h3>
                    <p className="text-xs text-slate-400 mt-2">All time purchases</p>
                  </div>
                  <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                    </svg>
                  </div>
                </div>
              </ScrollReveal>

              {/* Card 3: Pending Orders */}
              <ScrollReveal direction="up" delay={160}>
                <div className="h-full bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs flex items-center justify-between">
                  <div>
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Processing</p>
                    <h3 className="text-2xl font-black text-amber-600 mt-1">{pendingOrdersCount}</h3>
                    <p className="text-xs text-slate-400 mt-2">In progress</p>
                  </div>
                  <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center">
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                </div>
              </ScrollReveal>

              {/* Card 4: Total Spent */}
              <ScrollReveal direction="up" delay={240}>
                <div className="h-full bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs flex items-center justify-between">
                  <div>
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Total Spent</p>
                    <h3 className="text-2xl font-black text-slate-900 mt-1">₦{totalSpent.toLocaleString()}</h3>
                    <p className="text-xs text-emerald-600 font-medium mt-2">{completedOrdersCount} completed</p>
                  </div>
                  <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                </div>
              </ScrollReveal>

            </div>

            {/* Quick Actions Bar */}
            <ScrollReveal direction="up">
              <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-xs">
                <h3 className="text-sm font-bold text-slate-900 mb-4">Quick Marketplace Actions</h3>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <button
                    id="quick-action-buy-number"
                    onClick={() => onNavigate('international-numbers')}
                    className="p-4 rounded-2xl bg-amber-50 hover:bg-amber-100 text-amber-800 font-semibold text-xs transition-colors flex flex-col items-center gap-2 cursor-pointer"
                  >
                    <span className="text-xl">📱</span>
                    <span>Buy Number</span>
                  </button>
                  <button
                    id="quick-action-buy-websites"
                    onClick={() => onNavigate('marketplace')}
                    className="p-4 rounded-2xl bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-semibold text-xs transition-colors flex flex-col items-center gap-2 cursor-pointer"
                  >
                    <span className="text-xl">🌐</span>
                    <span>Buy Websites</span>
                  </button>
                  <button
                    id="quick-action-buy-accounts"
                    onClick={() => onNavigate('social-logs')}
                    className="p-4 rounded-2xl bg-cyan-50 hover:bg-cyan-100 text-cyan-800 font-semibold text-xs transition-colors flex flex-col items-center gap-2 cursor-pointer"
                  >
                    <span className="text-xl">👥</span>
                    <span>Buy Accounts</span>
                  </button>
                  <button
                    id="quick-action-smm-boosting"
                    onClick={() => onNavigate('boosting')}
                    className="p-4 rounded-2xl bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-semibold text-xs transition-colors flex flex-col items-center gap-2 cursor-pointer"
                  >
                    <span className="text-xl">🚀</span>
                    <span>SMM Boosting</span>
                  </button>
                </div>
              </div>
            </ScrollReveal>

            {/* Referral Banner Container - Displays referral banner image alone */}
            <div id="referral-banner-container" className="rounded-3xl overflow-hidden shadow-md border border-slate-200/80 bg-red-600 transition-all hover:shadow-lg">
              <div className="relative w-full aspect-[3/1] sm:aspect-[3.2/1] max-h-[360px] overflow-hidden bg-red-600">
                <img 
                  src="/referral-banner.jpg" 
                  alt="Surest Plug Referral: Get Instant ₦10,000 with Surest Plug Referral! How It Works: 1. Share your unique referral code. 2. When someone signs up and purchases a custom-made or ready-made website, you earn ₦10,000 instantly! Refer More, Earn More!"
                  className="w-full h-full object-cover object-center"
                  referrerPolicy="no-referrer"
                />
              </div>
            </div>

            {/* Recent Orders Section */}
            <ScrollReveal direction="up">
              <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs overflow-hidden">
                <div className="p-6 border-b border-slate-100 flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-bold text-slate-900">Recent Orders</h3>
                    <p className="text-xs text-slate-400 mt-0.5">Your latest purchased digital assets and boosting orders</p>
                  </div>
                  <button 
                    onClick={() => onTabChange('orders')}
                    className="text-xs font-bold text-blue-600 hover:text-blue-700"
                  >
                    View All Orders →
                  </button>
                </div>

              {orders.length === 0 ? (
                <div className="p-12 text-center">
                  <p className="text-slate-500 text-sm">You haven't placed any orders yet.</p>
                  <button 
                    onClick={() => onNavigate('marketplace')}
                    className="mt-3 px-4 py-2 bg-blue-600 text-white text-xs font-semibold rounded-xl hover:bg-blue-700 transition-all cursor-pointer"
                  >
                    Browse Ready-Made Websites
                  </button>
                </div>
              ) : (
                <>
                  {/* Mobile Cards for Recent Orders */}
                  <div className="block md:hidden divide-y divide-slate-100">
                    {orders.slice(0, 5).map((order, idx) => (
                      <div key={`dash-ov-ord-mob-${order.id}-${idx}`} className="p-4 space-y-2">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <span className="text-[10px] font-bold text-blue-600 uppercase tracking-wider block">Service</span>
                            <h4 className="font-bold text-slate-900 text-sm leading-snug">{order.product_name}</h4>
                          </div>
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider shrink-0 ${
                            order.status === 'completed'
                              ? 'bg-emerald-100 text-emerald-800'
                              : order.status === 'processing'
                              ? 'bg-blue-100 text-blue-800'
                              : 'bg-amber-100 text-amber-800'
                          }`}>
                            {order.status}
                          </span>
                        </div>
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-slate-400">Ref:</span>
                          <span className="font-mono font-bold text-slate-700">#{order.order_reference}</span>
                        </div>
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-slate-400">Amount:</span>
                          <span className="font-bold text-slate-900 font-mono">₦{order.amount.toLocaleString()}</span>
                        </div>
                        <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1 border-t border-slate-100">
                          <span>Date:</span>
                          <span>{new Date(order.created_at).toLocaleDateString()}</span>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Tablet/Desktop Table for Recent Orders */}
                  <div className="hidden md:block overflow-x-auto table-responsive">
                    <table className="w-full text-left border-collapse min-w-[600px]">
                      <thead>
                        <tr className="bg-slate-50 text-[11px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-100">
                          <th className="p-4 pl-6 whitespace-nowrap">Reference</th>
                          <th className="p-4 whitespace-nowrap">Item / Service</th>
                          <th className="p-4 whitespace-nowrap">Amount</th>
                          <th className="p-4 whitespace-nowrap">Status</th>
                          <th className="p-4 pr-6 whitespace-nowrap">Date</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 text-xs">
                        {orders.slice(0, 5).map((order, idx) => (
                          <tr key={`dash-ov-ord-${order.id}-${idx}`} className="hover:bg-slate-50/60 transition-colors">
                            <td className="p-4 pl-6 font-mono font-bold text-slate-800 whitespace-nowrap">{order.order_reference}</td>
                            <td className="p-4 font-semibold text-slate-900 whitespace-nowrap">{order.product_name}</td>
                            <td className="p-4 font-bold text-slate-900 whitespace-nowrap">₦{order.amount.toLocaleString()}</td>
                            <td className="p-4 whitespace-nowrap">
                              <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                                order.status === 'completed'
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : order.status === 'processing'
                                  ? 'bg-blue-100 text-blue-800'
                                  : 'bg-amber-100 text-amber-800'
                              }`}>
                                {order.status}
                              </span>
                            </td>
                            <td className="p-4 pr-6 text-slate-500 whitespace-nowrap">
                              {new Date(order.created_at).toLocaleDateString()}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </>
              )}
            </div>
          </ScrollReveal>

          {/* Recent Transactions */}
          <ScrollReveal direction="up">
            <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs overflow-hidden">
              <div className="p-6 border-b border-slate-100 flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-bold text-slate-900">Recent Transactions</h3>
                  <p className="text-xs text-slate-400 mt-0.5">Real-time wallet debits and deposit credits</p>
                </div>
                <button 
                  onClick={() => onTabChange('transactions')}
                  className="text-xs font-bold text-blue-600 hover:text-blue-700"
                >
                  View All →
                </button>
              </div>

              {transactions.length === 0 ? (
                <div className="p-12 text-center text-slate-500 text-sm">
                  No transactions yet.
                </div>
              ) : (
                <>
                  {/* Mobile Cards for Recent Transactions */}
                  <div className="block md:hidden divide-y divide-slate-100">
                    {transactions.slice(0, 5).map((tx, idx) => (
                      <div key={`dash-ov-tx-mob-${tx.id}-${idx}`} className="p-4 space-y-2">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Reference</span>
                            <span className="font-mono text-xs font-bold text-slate-700">#{tx.reference}</span>
                          </div>
                          <span className={`text-sm font-bold font-mono ${['deposit', 'admin_credit', 'refund'].includes(tx.type) ? 'text-emerald-600' : 'text-slate-900'}`}>
                            {['deposit', 'admin_credit', 'refund'].includes(tx.type) ? '+' : '-'}₦{tx.amount.toLocaleString()}
                          </span>
                        </div>
                        <div className="text-xs text-slate-700 font-medium">
                          {tx.description}
                        </div>
                        <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1 border-t border-slate-100">
                          <span>Balance: ₦{tx.balance_after.toLocaleString()}</span>
                          <span>{new Date(tx.created_at).toLocaleDateString()}</span>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Tablet/Desktop Table for Recent Transactions */}
                  <div className="hidden md:block overflow-x-auto table-responsive">
                    <table className="w-full text-left border-collapse min-w-[600px]">
                      <thead>
                        <tr className="bg-slate-50 text-[11px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-100">
                          <th className="p-4 pl-6 whitespace-nowrap">Reference</th>
                          <th className="p-4 whitespace-nowrap">Description</th>
                          <th className="p-4 whitespace-nowrap">Amount</th>
                          <th className="p-4 whitespace-nowrap">Balance After</th>
                          <th className="p-4 pr-6 whitespace-nowrap">Date</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 text-xs">
                        {transactions.slice(0, 5).map((tx, idx) => (
                          <tr key={`dash-ov-tx-${tx.id}-${idx}`} className="hover:bg-slate-50/60 transition-colors">
                            <td className="p-4 pl-6 font-mono text-slate-700 whitespace-nowrap">{tx.reference}</td>
                            <td className="p-4 font-medium text-slate-800 whitespace-nowrap">{tx.description}</td>
                            <td className={`p-4 font-bold whitespace-nowrap ${['deposit', 'admin_credit', 'refund'].includes(tx.type) ? 'text-emerald-600' : 'text-slate-900'}`}>
                              {['deposit', 'admin_credit', 'refund'].includes(tx.type) ? '+' : '-'}₦{tx.amount.toLocaleString()}
                            </td>
                            <td className="p-4 font-semibold text-slate-600 whitespace-nowrap">₦{tx.balance_after.toLocaleString()}</td>
                            <td className="p-4 pr-6 text-slate-400 whitespace-nowrap">{new Date(tx.created_at).toLocaleDateString()}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </>
              )}
            </div>
          </ScrollReveal>

          </div>
        )}

        {/* MY ORDERS TAB */}
        {activeTab === 'orders' && (
          <div className="space-y-6 animate-tab-enter">
            <div>
              <h1 className="text-2xl font-bold text-slate-900">My Orders</h1>
              <p className="text-slate-500 text-sm">All ready-made website downloads and boosting purchases</p>
            </div>

            <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs overflow-hidden">
              {orders.length === 0 ? (
                <div className="p-16 text-center">
                  <p className="text-slate-500 text-sm">You haven't placed any orders yet.</p>
                  <button 
                    onClick={() => onNavigate('marketplace')}
                    className="mt-4 px-5 py-2.5 bg-blue-600 text-white text-xs font-bold rounded-xl hover:bg-blue-700 transition-all cursor-pointer"
                  >
                    Browse Marketplace
                  </button>
                </div>
              ) : (
                <div className="divide-y divide-slate-100">
                  {orders.map((order, oIdx) => {
                    const isWebsiteOrder = order.category === 'ready_made_website' || 
                      !!order.customer_details?.admin_email || 
                      !!order.customer_details?.website_zip_data || 
                      !!order.customer_details?.website_zip_path;

                    return (
                      <div key={`dash-ord-${order.id}-${oIdx}`} className="p-6 space-y-4 hover:bg-slate-50/50 transition-colors">
                        
                        {/* Order Header / Top Bar */}
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
                          <div className="flex items-center gap-3">
                            <span className="font-mono text-xs font-bold text-blue-700 bg-blue-50 px-2.5 py-1 rounded-lg">
                              {order.order_reference}
                            </span>
                            <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                              order.status === 'completed' ? 'bg-emerald-100 text-emerald-800' : 'bg-blue-100 text-blue-800'
                            }`}>
                              {order.status}
                            </span>
                            {isWebsiteOrder && (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-purple-100 text-purple-800">
                                Ready-Made Website
                              </span>
                            )}
                          </div>
                          <span className="text-xs text-slate-400">
                            Purchased on {new Date(order.created_at).toLocaleString()}
                          </span>
                        </div>

                        {/* If this is a Ready-Made Website Order */}
                        {isWebsiteOrder ? (
                          <div className="space-y-4">
                            
                            {/* SECTION 1: YOUR READY-MADE WEBSITE */}
                            <div className="p-4 sm:p-5 rounded-2xl bg-white border border-slate-200/80 shadow-xs flex flex-col md:flex-row gap-5 items-start">
                              {order.customer_details?.preview_image_path ? (
                                <img
                                  src={order.customer_details.preview_image_path}
                                  alt={order.customer_details.website_name || order.product_name}
                                  className="w-full md:w-44 h-32 rounded-xl object-cover border border-slate-200 shrink-0"
                                />
                              ) : (
                                <div className="w-full md:w-44 h-32 rounded-xl bg-slate-100 flex items-center justify-center text-4xl shrink-0">
                                  💻
                                </div>
                              )}

                              <div className="space-y-2 flex-1 min-w-0">
                                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2">
                                  <div>
                                    <h4 className="text-lg font-bold text-slate-900">
                                      {order.customer_details?.website_name || order.product_name}
                                    </h4>
                                    <p className="text-xs text-slate-500 line-clamp-2 mt-1">
                                      {order.customer_details?.description || 'Complete ready-to-run digital website package with source code and MySQL database.'}
                                    </p>
                                  </div>
                                  <div className="text-xl font-black text-blue-600 whitespace-nowrap">
                                    ₦{order.amount.toLocaleString()}
                                  </div>
                                </div>

                                {order.customer_details?.features && order.customer_details.features.length > 0 && (
                                  <div className="flex flex-wrap gap-1.5 pt-1">
                                    {order.customer_details.features.map((feat: string, idx: number) => (
                                      <span key={`feat-${oIdx}-${idx}`} className="px-2 py-0.5 bg-slate-100 text-slate-700 rounded-md text-[10px] font-medium">
                                        ✓ {feat}
                                      </span>
                                    ))}
                                  </div>
                                )}
                              </div>
                            </div>

                            {/* SECTION 2: WEBSITE FILES */}
                            <div className="p-4 sm:p-5 rounded-2xl bg-emerald-50/60 border border-emerald-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                              <div className="space-y-1 min-w-0">
                                <div className="flex items-center gap-2">
                                  <span className="text-lg">📦</span>
                                  <h5 className="text-xs font-bold text-emerald-950 uppercase tracking-wider">
                                    Website Files Package
                                  </h5>
                                </div>
                                <p className="text-xs text-emerald-800 font-mono truncate">
                                  {order.customer_details?.website_zip_name || `${(order.customer_details?.website_name || order.product_name).replace(/[^a-zA-Z0-9_-]/g, '_').toLowerCase()}_source.zip`}
                                  {order.customer_details?.website_zip_size ? ` (${formatBytes(order.customer_details.website_zip_size)})` : ''}
                                </p>
                                <p className="text-[11px] text-emerald-700">
                                  Contains complete source code, HTML/CSS/JS frontend, backend scripts, and database SQL dumps.
                                </p>
                              </div>

                              <button
                                type="button"
                                onClick={() => handleDownloadWebsiteZip(order)}
                                className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white font-bold text-xs rounded-xl shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer shrink-0"
                              >
                                <span>⬇️</span>
                                <span>Download Website ZIP</span>
                              </button>
                            </div>

                            {/* SECTION 3: WEBSITE ADMIN LOGIN CREDENTIALS */}
                            <div className="p-4 sm:p-5 rounded-2xl bg-blue-50/50 border border-blue-200/80 space-y-3">
                              <div className="flex items-center justify-between flex-wrap gap-2">
                                <div className="flex items-center gap-2">
                                  <span className="text-lg">🔑</span>
                                  <h5 className="text-xs font-bold text-blue-950 uppercase tracking-wider">
                                    Website Admin Login
                                  </h5>
                                </div>
                                {order.customer_details?.demo_url && (
                                  <a
                                    href={order.customer_details.demo_url}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="text-xs font-semibold text-blue-600 hover:text-blue-800 underline flex items-center gap-1"
                                  >
                                    <span>Open Preview URL</span>
                                    <span>↗</span>
                                  </a>
                                )}
                              </div>

                              <p className="text-[11px] text-blue-800">
                                🔒 Use these secure credentials to sign into the administration control panel of your purchased website.
                              </p>

                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                                
                                {/* Admin Email */}
                                <div className="p-3 bg-white rounded-xl border border-blue-200/80 flex items-center justify-between gap-2">
                                  <div className="min-w-0">
                                    <span className="block text-[10px] font-bold text-slate-400 uppercase">Admin Login Email</span>
                                    <span className="font-mono text-xs font-bold text-slate-900 truncate block">
                                      {order.customer_details?.admin_email || 'admin@website.com'}
                                    </span>
                                  </div>
                                  <button
                                    type="button"
                                    onClick={() => handleCopyEmail(order.id, order.customer_details?.admin_email || 'admin@website.com')}
                                    className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-[11px] font-semibold transition-colors cursor-pointer shrink-0"
                                  >
                                    {copiedEmailOrderId === order.id ? 'Copied! ✓' : 'Copy Email'}
                                  </button>
                                </div>

                                {/* Admin Password */}
                                <div className="p-3 bg-white rounded-xl border border-blue-200/80 flex items-center justify-between gap-2">
                                  <div className="min-w-0">
                                    <span className="block text-[10px] font-bold text-slate-400 uppercase">Admin Login Password</span>
                                    <span className="font-mono text-xs font-bold text-slate-900 truncate block">
                                      {visiblePasswordOrderIds.includes(order.id) 
                                        ? (order.customer_details?.admin_password || '••••••••')
                                        : '••••••••••••'}
                                    </span>
                                  </div>
                                  <div className="flex items-center gap-1.5 shrink-0">
                                    <button
                                      type="button"
                                      onClick={() => togglePasswordVisibility(order.id)}
                                      className="px-2 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-[11px] font-semibold transition-colors cursor-pointer"
                                    >
                                      {visiblePasswordOrderIds.includes(order.id) ? 'Hide' : 'Show'}
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => handleCopyPassword(order.id, order.customer_details?.admin_password || '')}
                                      className="px-2.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-[11px] font-semibold transition-colors cursor-pointer"
                                    >
                                      {copiedPasswordOrderId === order.id ? 'Copied! ✓' : 'Copy'}
                                    </button>
                                  </div>
                                </div>

                              </div>
                            </div>

                          </div>
                        ) : (
                          /* Non-Website Order Details (Boosting / Other services) */
                          <div className="space-y-2">
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                              <div>
                                <h4 className="text-base font-bold text-slate-900">{order.product_name}</h4>
                                <p className="text-xs text-slate-500 mt-0.5">Category: {order.category}</p>
                              </div>
                              <div className="text-lg font-black text-slate-900">
                                ₦{order.amount.toLocaleString()}
                              </div>
                            </div>

                            {order.customer_details && (
                              <div className="p-3 bg-slate-50 rounded-xl text-xs text-slate-600 font-mono space-y-1.5 border border-slate-100">
                                {order.customer_details.smm_order_id && (
                                  <div className="flex items-center justify-between flex-wrap gap-2 text-blue-900 font-bold bg-blue-50/80 px-2.5 py-1.5 rounded-lg">
                                    <span>Service: {order.product_name}</span>
                                    <button
                                      type="button"
                                      onClick={() => handleCheckSmmStatus(order.customer_details.smm_order_id)}
                                      disabled={checkingSmmId === order.customer_details.smm_order_id}
                                      className="text-[11px] bg-blue-600 hover:bg-blue-700 text-white font-medium px-2.5 py-0.5 rounded cursor-pointer transition-colors"
                                    >
                                      {checkingSmmId === order.customer_details.smm_order_id ? 'Checking...' : 'Check Live Status'}
                                    </button>
                                  </div>
                                )}

                                {order.customer_details.smm_order_id && smmStatusResults[String(order.customer_details.smm_order_id)] && (
                                  <div className="p-2.5 bg-emerald-50 border border-emerald-200 text-emerald-900 rounded-lg space-y-1">
                                    <div className="font-bold text-[11px]">
                                      Live Service Status: {smmStatusResults[String(order.customer_details.smm_order_id)].status || 'In progress'}
                                    </div>
                                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5 text-[10px] text-emerald-800 font-medium">
                                      <div>Charge: ₦{order.amount.toLocaleString()}</div>
                                      <div>Start Count: {smmStatusResults[String(order.customer_details.smm_order_id)].start_count || '0'}</div>
                                      <div>Remains: {smmStatusResults[String(order.customer_details.smm_order_id)].remains || '0'}</div>
                                    </div>
                                  </div>
                                )}

                                 {order.customer_details.target_link && <div>Target: <span className="text-slate-900 break-all">{order.customer_details.target_link}</span></div>}
                                {order.customer_details.quantity && <div>Quantity: {order.customer_details.quantity.toLocaleString()} units</div>}
                                {order.customer_details.demo_url && <div>Demo Preview: <a href={order.customer_details.demo_url} target="_blank" rel="noreferrer" className="text-blue-600 underline">{order.customer_details.demo_url}</a></div>}
                                {order.customer_details.delivery && <div>Delivery: {order.customer_details.delivery}</div>}

                                {/* Cartlogs Social Media Account Credentials Delivery Box */}
                                {order.customer_details?.credentials && (
                                  <div className="mt-3 p-4 bg-slate-900 text-white rounded-2xl space-y-3 font-sans border border-slate-800 shadow-md">
                                    <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                                      <div className="flex items-center gap-2">
                                        <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                                        <span className="text-xs font-bold uppercase tracking-wider text-emerald-400">Account Access Credentials</span>
                                      </div>
                                      <span className="text-[10px] text-slate-400">Encrypted Delivery</span>
                                    </div>

                                    <div className="space-y-2 font-mono text-xs">
                                      {order.customer_details.credentials.username && (
                                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 p-2 bg-slate-950/80 rounded-xl border border-slate-800">
                                          <span className="text-slate-400 font-sans text-[11px]">Username / Handle:</span>
                                          <div className="flex items-center gap-2">
                                            <span className="text-white font-bold select-all">{order.customer_details.credentials.username}</span>
                                            <button
                                              type="button"
                                              onClick={() => {
                                                navigator.clipboard.writeText(order.customer_details?.credentials?.username || '');
                                                alert('Username copied to clipboard!');
                                              }}
                                              className="px-2 py-0.5 bg-slate-800 hover:bg-slate-700 text-[10px] text-slate-200 rounded font-sans cursor-pointer"
                                            >
                                              Copy
                                            </button>
                                          </div>
                                        </div>
                                      )}

                                      {order.customer_details.credentials.password && (
                                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 p-2 bg-slate-950/80 rounded-xl border border-slate-800">
                                          <span className="text-slate-400 font-sans text-[11px]">Password:</span>
                                          <div className="flex items-center gap-2">
                                            <span className="text-amber-300 font-bold select-all">{order.customer_details.credentials.password}</span>
                                            <button
                                              type="button"
                                              onClick={() => {
                                                navigator.clipboard.writeText(order.customer_details?.credentials?.password || '');
                                                alert('Password copied to clipboard!');
                                              }}
                                              className="px-2 py-0.5 bg-blue-600 hover:bg-blue-700 text-[10px] text-white rounded font-sans cursor-pointer"
                                            >
                                              Copy
                                            </button>
                                          </div>
                                        </div>
                                      )}

                                      {order.customer_details.credentials.email && (
                                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 p-2 bg-slate-950/80 rounded-xl border border-slate-800">
                                          <span className="text-slate-400 font-sans text-[11px]">Master Email:</span>
                                          <div className="flex items-center gap-2">
                                            <span className="text-cyan-300 font-bold select-all">{order.customer_details.credentials.email}</span>
                                            <button
                                              type="button"
                                              onClick={() => {
                                                navigator.clipboard.writeText(order.customer_details?.credentials?.email || '');
                                                alert('Email copied to clipboard!');
                                              }}
                                              className="px-2 py-0.5 bg-slate-800 hover:bg-slate-700 text-[10px] text-slate-200 rounded font-sans cursor-pointer"
                                            >
                                              Copy
                                            </button>
                                          </div>
                                        </div>
                                      )}

                                      {order.customer_details.credentials.additional_info && (
                                        <p className="text-[11px] text-slate-300 font-sans pt-1 leading-relaxed">
                                          {order.customer_details.credentials.additional_info}
                                        </p>
                                      )}
                                    </div>
                                  </div>
                                )}

                                {/* International Numbers & OTP Delivery Box */}
                                {(order.category === 'numbers' || order.customer_details?.provider === 'instantnums' || order.customer_details?.phone_number) && (
                                  <div className="mt-3 p-4 bg-slate-900 text-white rounded-2xl space-y-3 font-sans border border-slate-800 shadow-md">
                                    <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                                      <div className="flex items-center gap-2">
                                        <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse"></span>
                                        <span className="text-xs font-bold uppercase tracking-wider text-amber-400">Virtual Verification Number</span>
                                      </div>
                                      <div className="flex items-center gap-2">
                                        {(order.customer_details?.activation_id || order.customer_details?.provider_order_id) && (
                                          <button
                                            type="button"
                                            onClick={() => handleCheckVirtualNumberStatus(order.id, order.customer_details)}
                                            disabled={checkingNumberId === order.id}
                                            className="px-2 py-0.5 bg-blue-600 hover:bg-blue-700 text-[10px] text-white rounded font-sans cursor-pointer transition-colors disabled:opacity-50"
                                          >
                                            {checkingNumberId === order.id ? 'Checking...' : '🔄 Check Live SMS'}
                                          </button>
                                        )}
                                        <button
                                          type="button"
                                          onClick={() => onNavigate('international-numbers')}
                                          className="px-2 py-0.5 bg-slate-800 hover:bg-slate-700 text-[10px] text-slate-300 rounded font-sans cursor-pointer transition-colors"
                                        >
                                          Open Numbers Console →
                                        </button>
                                      </div>
                                    </div>

                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 font-mono text-xs">
                                      {/* Phone Number */}
                                      <div className="p-3 bg-slate-950/80 rounded-xl border border-slate-800 space-y-1">
                                        <span className="text-slate-400 font-sans text-[10px] uppercase font-bold tracking-wider">Number:</span>
                                        <div className="flex items-center justify-between gap-2">
                                          <span className="text-white font-bold text-sm select-all">{order.customer_details?.phone_number || order.product_name}</span>
                                          {order.customer_details?.phone_number && (
                                            <button
                                              type="button"
                                              onClick={() => {
                                                navigator.clipboard.writeText(order.customer_details.phone_number);
                                                alert('Phone number copied to clipboard!');
                                              }}
                                              className="px-2 py-0.5 bg-slate-800 hover:bg-slate-700 text-[10px] text-slate-200 rounded font-sans cursor-pointer"
                                            >
                                              Copy
                                            </button>
                                          )}
                                        </div>
                                      </div>

                                      {/* OTP Code */}
                                      <div className="p-3 bg-gradient-to-br from-blue-950 to-slate-950 rounded-xl border border-blue-900/60 space-y-1">
                                        <span className="text-blue-300 font-sans text-[10px] uppercase font-bold tracking-wider">SMS OTP Code:</span>
                                        <div className="flex items-center justify-between gap-2">
                                          <span className="text-emerald-400 font-bold text-sm tracking-wider select-all">
                                            {order.customer_details?.verification_code || (order.status === 'processing' ? 'Waiting for SMS...' : order.status === 'cancelled' ? 'Expired / Cancelled' : 'None Received')}
                                          </span>
                                          {order.customer_details?.verification_code && (
                                            <button
                                              type="button"
                                              onClick={() => {
                                                navigator.clipboard.writeText(order.customer_details.verification_code);
                                                alert('OTP Code copied to clipboard!');
                                              }}
                                              className="px-2 py-0.5 bg-emerald-600 hover:bg-emerald-700 text-[10px] text-white rounded font-sans cursor-pointer"
                                            >
                                              Copy Code
                                            </button>
                                          )}
                                        </div>
                                      </div>
                                    </div>
                                  </div>
                                )}
                              </div>
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

        {/* CUSTOM PROJECTS TAB */}
        {activeTab === 'custom-orders' && (
          <div className="space-y-6 animate-tab-enter">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold text-slate-900">Custom Web Projects</h1>
                <p className="text-slate-500 text-sm">Status and specifications of your bespoke software requests</p>
              </div>
              <button
                onClick={() => onNavigate('custom-website')}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-xs transition-all cursor-pointer"
              >
                + Request New Website
              </button>
            </div>

            <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs overflow-hidden">
              {customOrders.length === 0 ? (
                <div className="p-16 text-center">
                  <p className="text-slate-500 text-sm">No custom website requests submitted yet.</p>
                  <button 
                    onClick={() => onNavigate('custom-website')}
                    className="mt-4 px-5 py-2.5 bg-blue-600 text-white text-xs font-bold rounded-xl hover:bg-blue-700 transition-all cursor-pointer"
                  >
                    Submit Project Brief
                  </button>
                </div>
              ) : (
                <div className="divide-y divide-slate-100">
                  {customOrders.map((req, rIdx) => {
                    const features = req.features_list && req.features_list.length > 0
                      ? req.features_list
                      : (req.required_features ? req.required_features.split(',').map(f => f.trim()) : []);

                    return (
                      <div key={`dash-cust-${req.id}-${rIdx}`} className="p-6 space-y-4 hover:bg-slate-50/50 transition-colors">
                        <div className="flex items-center justify-between">
                          <span className="font-mono text-xs font-bold text-blue-700 bg-blue-50 px-2.5 py-1 rounded-lg border border-blue-200/60">
                            {req.request_reference}
                          </span>
                          <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                            req.status === 'completed' ? 'bg-emerald-100 text-emerald-800' :
                            req.status === 'in_progress' ? 'bg-blue-100 text-blue-800' :
                            req.status === 'reviewing' ? 'bg-indigo-100 text-indigo-800' :
                            'bg-amber-100 text-amber-800'
                          }`}>
                            {req.status.replace('_', ' ')}
                          </span>
                        </div>

                        <div className="flex flex-col sm:flex-row sm:items-start gap-4">
                          {req.logo_url && (
                            <div className="w-14 h-14 rounded-xl bg-slate-900 border border-slate-800 p-1 flex items-center justify-center shrink-0">
                              <img src={req.logo_url} alt="Logo" className="max-h-full max-w-full object-contain" />
                            </div>
                          )}
                          <div className="space-y-1 min-w-0 flex-1">
                            <h4 className="text-lg font-bold text-slate-900">{req.project_name}</h4>
                            <span className="text-xs text-blue-600 font-semibold">{req.website_type}</span>
                            <p className="text-xs text-slate-600 mt-1 leading-relaxed whitespace-pre-wrap">{req.description}</p>
                          </div>
                        </div>

                        {req.reference_website && (
                          <div className="text-xs text-slate-500 flex items-center gap-1.5 pt-1">
                            <span className="font-semibold text-slate-700">Reference:</span>
                            <a
                              href={req.reference_website}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-blue-600 hover:underline font-mono truncate"
                            >
                              {req.reference_website}
                            </a>
                          </div>
                        )}

                        {features.length > 0 && (
                          <div className="flex flex-wrap gap-1.5 pt-1">
                            {features.map((feat, fIdx) => (
                              <span key={fIdx} className="px-2 py-0.5 bg-slate-100 text-slate-700 rounded-md text-[10px] font-medium">
                                ✓ {feat}
                              </span>
                            ))}
                          </div>
                        )}

                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 border-t border-slate-100 text-xs">
                          <div>
                            <span className="text-slate-400 block text-[10px] uppercase">Budget</span>
                            <span className="font-bold text-slate-800">{req.budget || '₦150,000'}</span>
                          </div>
                          <div>
                            <span className="text-slate-400 block text-[10px] uppercase">Deadline</span>
                            <span className="font-semibold text-slate-800">{req.deadline || '2 Weeks'}</span>
                          </div>
                          <div>
                            <span className="text-slate-400 block text-[10px] uppercase">Pages</span>
                            <span className="font-semibold text-slate-800">{req.pages_count || 'Standard'}</span>
                          </div>
                          <div>
                            <span className="text-slate-400 block text-[10px] uppercase">Submitted</span>
                            <span className="text-slate-500">{new Date(req.created_at).toLocaleDateString()}</span>
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

        {/* WALLET & FUND ACCOUNT TAB */}
        {(activeTab === 'wallet' || activeTab === 'fund') && (
          <div className="space-y-8 max-w-4xl animate-tab-enter">
            <div>
              <h1 className="text-2xl font-bold text-slate-900">Wallet & Funding</h1>
              <p className="text-slate-500 text-sm">Fund your Surest Plug wallet securely to order websites, SMM boosts, and digital services</p>
            </div>

            {/* Current Balance Display */}
            <div className="bg-gradient-to-r from-blue-700 via-indigo-700 to-blue-900 rounded-3xl p-6 sm:p-8 text-white shadow-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6 relative overflow-hidden">
              <div className="relative z-10">
                <div className="flex items-center gap-2 text-blue-200 text-xs font-bold uppercase tracking-wider">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                  <span>Available Wallet Balance</span>
                </div>
                <div className="text-4xl sm:text-5xl font-black mt-2 tracking-tight">
                  ₦{currentUser.balance.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                </div>
                <p className="text-blue-100 text-xs mt-2 max-w-md">
                  Ready to spend immediately across ready-made websites, custom builds, social accounts, and SMM boosting.
                </p>
              </div>

              <div className="flex flex-col sm:items-end gap-2 shrink-0 relative z-10 w-full sm:w-auto">
                <div className="px-3.5 py-1.5 bg-white/10 backdrop-blur-md rounded-full border border-white/20 text-xs text-blue-100 font-medium flex items-center gap-1.5">
                  <svg className="w-4 h-4 text-emerald-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                  </svg>
                  <span>256-Bit SSL Protected</span>
                </div>
                <span className="text-[11px] text-blue-200 sm:text-right">Instant automated crediting</span>
              </div>

              {/* Decorative background glow */}
              <div className="absolute -right-12 -bottom-12 w-64 h-64 bg-white/5 rounded-full blur-2xl pointer-events-none"></div>
            </div>

            {/* Payment Method Selector Tabs */}
            <div className="bg-slate-100 p-1.5 rounded-2xl flex gap-1 border border-slate-200/80">
              <button
                type="button"
                onClick={() => setFundingTab('paystack')}
                className={`flex-1 py-3 px-4 rounded-xl font-bold text-xs sm:text-sm flex items-center justify-center gap-2 transition-all cursor-pointer ${
                  fundingTab === 'paystack'
                    ? 'bg-white text-blue-700 shadow-sm'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
                }`}
              >
                <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                <span>Instant Paystack (Card, Transfer & USSD)</span>
                <span className="hidden sm:inline-block px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full text-[10px] uppercase font-black">
                  Instant
                </span>
              </button>
              <button
                type="button"
                onClick={() => setFundingTab('bank')}
                className={`flex-1 py-3 px-4 rounded-xl font-bold text-xs sm:text-sm flex items-center justify-center gap-2 transition-all cursor-pointer ${
                  fundingTab === 'bank'
                    ? 'bg-white text-blue-700 shadow-sm'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
                }`}
              >
                <span>Manual Bank Transfer</span>
              </button>
            </div>

            {/* ==================================================== */}
            {/* TAB 1: INSTANT PAYSTACK FUNDING INTERFACE */}
            {/* ==================================================== */}
            {fundingTab === 'paystack' && (
              <ErrorBoundary 
                fallbackTitle="Payment Gateway Notice" 
                fallbackMessage="An error occurred displaying the payment options. Please refresh or use manual bank transfer."
                onReset={() => setFundingTab('bank')}
              >
                <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/80 shadow-xl space-y-6 animate-in fade-in">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-4">
                    <div>
                      <h3 className="text-lg font-bold text-slate-900">Fund Wallet via Paystack</h3>
                      <p className="text-xs text-slate-500">Fast, instant credit to your account balance using Debit Card, Bank Transfer, USSD, or Apple Pay.</p>
                    </div>
                    <div className="flex items-center gap-2 bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-200 shrink-0">
                      <span className="text-[11px] font-bold text-slate-600">Secured by</span>
                      <span className="text-xs font-black tracking-tight text-blue-600">paystack</span>
                    </div>
                  </div>

                  {/* Success Notification Alert */}
                  {paystackSuccessNotice && (
                    <div className="p-4 sm:p-5 bg-emerald-50 border border-emerald-200 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 text-emerald-900 animate-in fade-in">
                      <div className="flex items-start gap-3">
                        <span className="text-2xl mt-0.5">🎉</span>
                        <div className="space-y-1">
                          <strong className="block text-sm font-bold text-emerald-950">
                            {paystackSuccessNotice.message}
                          </strong>
                          <div className="text-xs text-emerald-800 flex flex-wrap items-center gap-2">
                            <span>Transaction Ref:</span>
                            <code className="bg-emerald-100 px-2 py-0.5 rounded font-mono font-bold text-emerald-900">
                              {paystackSuccessNotice.reference}
                            </code>
                          </div>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => setPaystackSuccessNotice(null)}
                        className="px-3 py-1.5 text-xs font-bold text-emerald-900 hover:text-emerald-950 bg-white border border-emerald-300 rounded-xl shadow-xs cursor-pointer shrink-0"
                      >
                        Dismiss
                      </button>
                    </div>
                  )}

                  {/* Error / Warning Alert */}
                  {paystackErrorNotice && (
                    <div className="p-4 bg-amber-50 border border-amber-200 rounded-2xl flex items-start justify-between gap-3 text-amber-900 animate-in fade-in">
                      <div className="flex items-start gap-2.5">
                        <span className="text-lg mt-0.5">ℹ️</span>
                        <div className="text-xs space-y-0.5">
                          <strong className="block font-bold text-amber-950">Payment Notice</strong>
                          <p className="text-amber-900">{paystackErrorNotice}</p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => setPaystackErrorNotice(null)}
                        className="text-xs font-bold text-amber-800 hover:text-amber-950 px-2 py-1 bg-white border border-amber-200 rounded-lg cursor-pointer shrink-0"
                      >
                        Close
                      </button>
                    </div>
                  )}

                  {/* Fast Preset Amount Selectors */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2.5">
                      Select Quick Amount (₦)
                    </label>
                    <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                      {['1000', '2000', '5000', '10000', '20000', '50000'].map((preset) => {
                        const isSelected = paystackAmount === preset;
                        return (
                          <button
                            key={`paystack-preset-${preset}`}
                            type="button"
                            onClick={() => {
                              setPaystackAmount(preset);
                              setPaystackErrorNotice(null);
                            }}
                            className={`py-2.5 px-3 rounded-xl font-bold text-xs sm:text-sm transition-all border cursor-pointer text-center ${
                              isSelected
                                ? 'bg-blue-600 text-white border-blue-600 shadow-md ring-2 ring-blue-600/30 scale-[1.02]'
                                : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100 hover:border-slate-300'
                            }`}
                          >
                            ₦{parseInt(preset, 10).toLocaleString()}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Custom Amount Input */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                      Or Enter Custom Amount (₦) *
                    </label>
                    <div className="relative">
                      <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-base">
                        ₦
                      </span>
                      <input
                        type="number"
                        min={1000}
                        step={100}
                        required
                        value={paystackAmount}
                        onChange={(e) => {
                          setPaystackAmount(e.target.value);
                          setPaystackErrorNotice(null);
                        }}
                        placeholder="e.g. 5,000"
                        className="w-full pl-9 pr-4 py-3.5 text-base font-bold text-slate-900 bg-slate-50 border border-slate-200 rounded-2xl focus:bg-white focus:ring-2 focus:ring-blue-600 focus:border-blue-600 focus:outline-none transition-all"
                      />
                    </div>
                    <div className="flex items-center justify-between text-xs text-slate-500 mt-1.5">
                      <span>Minimum funding amount: ₦1,000</span>
                      {parseFloat(paystackAmount) > 0 && (
                        <span className="font-semibold text-blue-700">
                          You will pay: ₦{parseFloat(paystackAmount).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Verified Customer Summary */}
                  <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-2 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="text-slate-500">Funding Account Email:</span>
                      <span className="font-bold text-slate-800">{currentUser.email}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-500">Customer Name:</span>
                      <span className="font-bold text-slate-800">{currentUser.full_name || 'Valued User'}</span>
                    </div>
                    <div className="flex items-center justify-between pt-1 border-t border-slate-200/60">
                      <span className="text-slate-500">Crediting Speed:</span>
                      <span className="font-bold text-emerald-600 flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                        Instant & Automated
                      </span>
                    </div>
                  </div>

                  {/* Paystack Submit Button */}
                  <button
                    type="button"
                    disabled={isPaystackProcessing}
                    onClick={handlePaystackPayment}
                    className={`w-full py-4 px-6 rounded-2xl font-bold text-sm sm:text-base text-white shadow-lg transition-all flex items-center justify-center gap-3 cursor-pointer ${
                      isPaystackProcessing
                        ? 'bg-blue-400 cursor-not-allowed opacity-90'
                        : 'bg-blue-600 hover:bg-blue-700 active:bg-blue-800 hover:shadow-blue-500/25 active:scale-[0.99]'
                    }`}
                  >
                    {isPaystackProcessing ? (
                      <>
                        <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                        <span>{paystackStatusMessage || 'Processing Payment...'}</span>
                      </>
                    ) : (
                      <>
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                        </svg>
                        <span>
                          Pay ₦{parseFloat(paystackAmount || '0') > 0 ? parseFloat(paystackAmount).toLocaleString('en-US') : '0'} with Paystack
                        </span>
                      </>
                    )}
                  </button>

                  <div className="text-center">
                    <p className="text-[11px] text-slate-400 flex items-center justify-center gap-1.5">
                      <svg className="w-3.5 h-3.5 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                      </svg>
                      <span>Instant automatic credit upon successful Paystack completion</span>
                    </p>
                  </div>
                </div>
              </ErrorBoundary>
            )}

            {/* ==================================================== */}
            {/* TAB 2: MANUAL BANK TRANSFER FORM */}
            {/* ==================================================== */}
            {fundingTab === 'bank' && (
              <form onSubmit={handleDepositSubmit} className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/80 shadow-xl space-y-6 animate-in fade-in">
                <h3 className="text-lg font-bold text-slate-900">Deposit Funds (Bank Transfer & Manual Verification)</h3>
                
                {/* Company Bank Account Details */}
                <div className="p-5 bg-blue-50 border border-blue-200/80 rounded-2xl space-y-3 text-slate-800 text-sm">
                  <div className="font-bold text-blue-900 flex items-center gap-2">
                    <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                    </svg>
                    <span>Official Bank Payment Details:</span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                    <div className="p-3 bg-white rounded-xl border border-blue-100">
                      <span className="text-slate-400 block text-[10px] uppercase font-bold">Bank Name</span>
                      <span className="font-extrabold text-slate-900 text-sm">{currentSettings.bank_name || 'OPAY BANK'}</span>
                    </div>
                    <div className="p-3 bg-white rounded-xl border border-blue-100">
                      <span className="text-slate-400 block text-[10px] uppercase font-bold">Account Number</span>
                      <span className="font-extrabold text-blue-700 text-sm tracking-wide">{currentSettings.bank_account_number || '8141853557'}</span>
                    </div>
                    <div className="p-3 bg-white rounded-xl border border-blue-100">
                      <span className="text-slate-400 block text-[10px] uppercase font-bold">Account Name</span>
                      <span className="font-extrabold text-slate-900 text-sm">{currentSettings.bank_account_name || 'CHINONSO MONDAY'}</span>
                    </div>
                  </div>
                  <p className="text-xs text-slate-500">
                    Transfer the exact amount to the account above, then enter the details below. Our admin team will verify and credit your wallet.
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Amount to Deposit (₦) *</label>
                    <input 
                      type="number" 
                      required
                      min={1000}
                      value={depositAmount}
                      onChange={(e) => {
                        setDepositAmount(e.target.value);
                        setDepositErrorNotice(null);
                      }}
                      className="w-full px-4 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-600 focus:outline-none"
                    />
                    <span className="block text-[11px] text-slate-500 mt-1">Minimum funding amount: ₦1,000</span>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Payment Method</label>
                    <select 
                      value={depositMethod}
                      onChange={(e) => setDepositMethod(e.target.value)}
                      className="w-full px-4 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-600 focus:outline-none"
                    >
                      <option value={`Bank Transfer (${currentSettings.bank_name || 'OPAY BANK'})`}>Bank Transfer ({currentSettings.bank_name || 'OPAY BANK'})</option>
                      <option value="USDT TRC20 Crypto">USDT TRC20 Crypto</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Payment / Transaction Reference (Optional)</label>
                    <input 
                      type="text"
                      value={depositRef}
                      onChange={(e) => setDepositRef(e.target.value)}
                      placeholder="e.g. Session ID or Bank Ref"
                      className="w-full px-4 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-600 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Payment Receipt Image Proof *</label>
                    
                    {!depositProof ? (
                      <div
                        onDragOver={(e) => {
                          e.preventDefault();
                          setIsDraggingProof(true);
                        }}
                        onDragLeave={(e) => {
                          e.preventDefault();
                          setIsDraggingProof(false);
                        }}
                        onDrop={(e) => {
                          e.preventDefault();
                          setIsDraggingProof(false);
                          if (e.dataTransfer.files && e.dataTransfer.files[0]) {
                            handleProofFileSelection(e.dataTransfer.files[0]);
                          }
                        }}
                        className={`relative border-2 border-dashed rounded-xl p-4 text-center transition-all cursor-pointer ${
                          isDraggingProof 
                            ? 'border-blue-500 bg-blue-50/50' 
                            : 'border-slate-300 hover:border-blue-400 bg-slate-50/50'
                        }`}
                      >
                        <input
                          type="file"
                          accept="image/jpeg,image/png,image/webp,image/jpg"
                          onChange={(e) => {
                            if (e.target.files && e.target.files[0]) {
                              handleProofFileSelection(e.target.files[0]);
                            }
                          }}
                          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                        />
                        <div className="flex flex-col items-center justify-center gap-1 text-slate-500">
                          <span className="text-xl">📷</span>
                          <div className="text-xs font-semibold text-slate-700">
                            Click to upload or drag receipt image here
                          </div>
                          <p className="text-[10px] text-slate-400">Supports JPG, PNG, WebP (Max 10MB)</p>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center gap-3 p-3 bg-slate-50 border border-slate-200 rounded-xl">
                        <img
                          src={depositProof}
                          alt="Receipt preview"
                          className="w-12 h-12 object-cover rounded-lg border border-slate-200 shrink-0"
                        />
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-bold text-slate-800 truncate">{proofFileName || 'Receipt Proof'}</p>
                          <p className="text-[10px] text-slate-400">{proofFileSize || 'Image attached'}</p>
                        </div>
                        <button
                          type="button"
                          onClick={handleRemoveProof}
                          className="px-2.5 py-1 text-xs text-red-600 hover:text-red-700 bg-white border border-red-200 rounded-lg font-medium cursor-pointer"
                        >
                          Remove
                        </button>
                      </div>
                    )}

                    {proofUploadError && (
                      <p className="text-xs text-red-600 mt-1">{proofUploadError}</p>
                    )}
                  </div>
                </div>

                {depositErrorNotice && (
                  <div className="p-4 bg-red-50 border border-red-200 rounded-2xl flex items-center justify-between gap-3 text-red-900 animate-in fade-in">
                    <div className="flex items-center gap-2">
                      <span className="text-lg">⚠️</span>
                      <span className="text-xs font-semibold">{depositErrorNotice}</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setDepositErrorNotice(null)}
                      className="text-xs font-bold text-red-800 hover:text-red-950 px-2 py-1 bg-white/80 rounded-lg cursor-pointer"
                    >
                      Dismiss
                    </button>
                  </div>
                )}

                {depositSuccessNotice && (
                  <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-center justify-between gap-3 text-emerald-900 animate-in fade-in">
                    <div className="flex items-center gap-2">
                      <span className="text-lg">✅</span>
                      <div className="text-xs">
                        <strong className="block font-bold">Deposit Request Submitted!</strong>
                        <span>Reference: <span className="font-mono font-bold">{depositSuccessNotice.reference}</span> for ₦{depositSuccessNotice.amount.toLocaleString()}. Admin is reviewing.</span>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setDepositSuccessNotice(null)}
                      className="text-xs font-bold text-emerald-800 hover:text-emerald-950 px-2 py-1 bg-white/80 rounded-lg"
                    >
                      Dismiss
                    </button>
                  </div>
                )}

                <button
                  type="submit"
                  className="w-full py-3.5 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-bold text-sm rounded-xl shadow-md transition-all cursor-pointer"
                >
                  Submit Deposit for Admin Review
                </button>
              </form>
            )}

            {/* Deposit History */}
            <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs overflow-hidden">
              <div className="p-6 border-b border-slate-100 flex items-center justify-between">
                <div>
                  <h3 className="text-base font-bold text-slate-900">Your Deposit & Funding History</h3>
                  <p className="text-xs text-slate-500">All online Paystack and bank transfer wallet credits</p>
                </div>
                <button
                  type="button"
                  onClick={() => onTabChange('transactions')}
                  className="text-xs font-bold text-blue-600 hover:text-blue-700 hover:underline cursor-pointer"
                >
                  View Full Statement →
                </button>
              </div>

              {deposits.length === 0 ? (
                <div className="p-8 text-center text-slate-400 text-sm">
                  No deposit records found.
                </div>
              ) : (
                <div className="divide-y divide-slate-100">
                  {deposits.map((dep, dIdx) => (
                    <div key={`dash-dep-${dep.id}-${dIdx}`} className="p-4 sm:p-6 flex items-center justify-between gap-4">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-xs font-bold text-slate-800">{dep.deposit_reference}</span>
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                            dep.status === 'approved' 
                              ? 'bg-emerald-100 text-emerald-800' 
                              : dep.status === 'rejected' 
                              ? 'bg-red-100 text-red-800' 
                              : 'bg-amber-100 text-amber-800'
                          }`}>
                            {dep.status === 'approved' ? 'Completed' : dep.status}
                          </span>
                        </div>
                        <p className="text-xs text-slate-500 mt-1">{dep.payment_method} • {new Date(dep.created_at).toLocaleDateString()}</p>
                      </div>
                      <div className="text-right">
                        <div className="text-base font-black text-slate-900">+₦{dep.amount.toLocaleString()}</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* REFERRAL PROGRAM TAB */}
        {(activeTab === 'referrals' || activeTab === 'referral') && (
          <div className="space-y-8 max-w-4xl animate-tab-enter">
            <div>
              <h1 className="text-2xl font-bold text-slate-900">Referral Partner Program</h1>
              <p className="text-slate-500 text-sm">Earn ₦10,000 commission for every website your referrals purchase</p>
            </div>

            {/* Program Qualification Header Card */}
            {!referralStats.isUnlocked ? (
              /* LOCKED STATE */
              <div className="bg-white rounded-3xl p-6 sm:p-8 border border-amber-200/80 shadow-lg space-y-6">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                  <div className="flex items-center gap-4">
                    <div className="w-14 h-14 rounded-2xl bg-amber-100 text-amber-700 flex items-center justify-center text-2xl shadow-xs">
                      🔒
                    </div>
                    <div>
                      <div className="inline-block px-2.5 py-0.5 bg-amber-100 text-amber-800 rounded-md text-[11px] font-extrabold uppercase tracking-wider mb-1">
                        Locked Status
                      </div>
                      <h3 className="text-lg font-bold text-slate-900">
                        10 Purchases Required to Unlock Partner Code
                      </h3>
                    </div>
                  </div>

                  <div className="text-left sm:text-right">
                    <span className="text-xs text-slate-400 block font-medium">Milestone Progress</span>
                    <span className="text-2xl font-black text-amber-600">
                      {referralStats.qualifyingPurchasesCount} / 10
                    </span>
                  </div>
                </div>

                {/* Progress Bar */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs font-semibold">
                    <span className="text-slate-600">Qualification Progress</span>
                    <span className="text-amber-700 font-bold">{Math.min(100, Math.round((referralStats.qualifyingPurchasesCount / 10) * 100))}% Completed</span>
                  </div>
                  <div className="w-full h-3.5 bg-slate-100 rounded-full overflow-hidden p-0.5 border border-slate-200">
                    <div 
                      className="h-full bg-gradient-to-r from-amber-400 to-yellow-500 rounded-full transition-all duration-500 shadow-xs"
                      style={{ width: `${Math.min(100, (referralStats.qualifyingPurchasesCount / 10) * 100)}%` }}
                    ></div>
                  </div>
                  <p className="text-xs text-slate-500">
                    Complete <strong>{Math.max(0, 10 - referralStats.qualifyingPurchasesCount)} more qualifying purchase{10 - referralStats.qualifyingPurchasesCount === 1 ? '' : 's'}</strong> to instantly unlock your personal referral code and earn ₦10,000 per website sale.
                  </p>
                </div>

                {/* How it works breakdown */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
                  <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200/80 space-y-1.5">
                    <div className="text-xl">🛍️</div>
                    <h4 className="text-xs font-bold text-slate-900 uppercase">1. Buy 10 Products</h4>
                    <p className="text-xs text-slate-500 leading-relaxed">
                      Purchase any 10 digital products, ready-made websites, or services to verify account authenticity.
                    </p>
                  </div>

                  <div className="p-4 bg-purple-50 rounded-2xl border border-purple-200/80 space-y-1.5">
                    <div className="text-xl">🔑</div>
                    <h4 className="text-xs font-bold text-purple-950 uppercase">2. Unlock Code</h4>
                    <p className="text-xs text-purple-800 leading-relaxed">
                      Your unique SP-XXXXXX referral code and personal invite link are generated automatically upon your 10th order.
                    </p>
                  </div>

                  <div className="p-4 bg-emerald-50 rounded-2xl border border-emerald-200/80 space-y-1.5">
                    <div className="text-xl">💰</div>
                    <h4 className="text-xs font-bold text-emerald-950 uppercase">3. Earn ₦10,000</h4>
                    <p className="text-xs text-emerald-800 leading-relaxed">
                      Every time someone registers with your code and buys a ready-made website, you receive ₦10,000 wallet credit!
                    </p>
                  </div>
                </div>

                <div className="pt-2 flex flex-wrap items-center gap-3">
                  <button
                    type="button"
                    onClick={() => onNavigate('marketplace')}
                    className="w-full sm:w-auto px-6 py-3 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-bold text-xs rounded-xl shadow-md transition-all cursor-pointer flex items-center justify-center gap-2"
                  >
                    <span>Browse Ready-Made Websites Catalog</span>
                    <span>→</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowReferralRulesModal(true)}
                    className="w-full sm:w-auto px-5 py-3 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs rounded-xl border border-slate-300/80 transition-colors cursor-pointer flex items-center justify-center gap-1.5"
                  >
                    <span>📜 View Referral Rules</span>
                  </button>
                </div>
              </div>
            ) : (
              /* UNLOCKED STATE */
              <div className="space-y-6">
                
                {/* Hero Unlocked Banner */}
                <div className="bg-gradient-to-r from-purple-700 via-indigo-700 to-blue-700 rounded-3xl p-6 sm:p-8 text-white shadow-xl space-y-6">
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                    <div>
                      <div className="inline-block px-3 py-0.5 bg-purple-500/40 border border-purple-300/30 rounded-full text-xs font-extrabold uppercase tracking-wider mb-2">
                        ⭐ Official Referral Partner
                      </div>
                      <h2 className="text-2xl sm:text-3xl font-black">
                        Earn ₦10,000 on Every Website Sale
                      </h2>
                      <p className="text-purple-100 text-xs sm:text-sm mt-1 max-w-xl">
                        Share your unique referral code. When new users register with your code and buy any ready-made website, ₦10,000 is credited straight to your wallet.
                      </p>
                    </div>

                    <div className="flex flex-col sm:items-end gap-2">
                      <div className="p-4 bg-white/10 backdrop-blur-md rounded-2xl border border-white/20 text-center min-w-[140px]">
                        <span className="text-[11px] text-purple-200 uppercase font-bold block">Reward Rate</span>
                        <span className="text-2xl font-black text-amber-300">₦10,000</span>
                        <span className="text-[10px] text-purple-200 block">per website sale</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => setShowReferralRulesModal(true)}
                        className="px-3 py-1.5 bg-white/20 hover:bg-white/30 text-white text-xs font-bold rounded-xl border border-white/30 transition-colors cursor-pointer flex items-center justify-center gap-1"
                      >
                        <span>📜 Program Rules</span>
                      </button>
                    </div>
                  </div>

                  {/* Unique Code Box */}
                  <div className="p-5 bg-white rounded-2xl text-slate-900 space-y-3">
                    <label className="block text-xs font-black text-purple-950 uppercase tracking-wider">
                      Your Unique Referral Code
                    </label>
                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                      <div className="flex-1 px-4 py-3 bg-purple-50 border border-purple-200 rounded-xl flex items-center justify-between">
                        <span className="font-mono text-xl font-black text-purple-900 tracking-wider">
                          {referralStats.referralCode || currentUser.referral_code || 'SP-PARTNER'}
                        </span>
                        <span className="text-[11px] font-bold text-purple-600 bg-purple-100 px-2 py-0.5 rounded">
                          ACTIVE
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          const code = referralStats.referralCode || currentUser.referral_code || 'SP-PARTNER';
                          navigator.clipboard.writeText(code);
                          setCopiedReferralCode(true);
                          setTimeout(() => setCopiedReferralCode(false), 2500);
                        }}
                        className="px-6 py-3 bg-purple-600 hover:bg-purple-700 active:bg-purple-800 text-white font-bold text-sm rounded-xl shadow-md transition-all cursor-pointer flex items-center justify-center gap-2 shrink-0"
                      >
                        <span>{copiedReferralCode ? '✓ Copied to Clipboard!' : '📋 Copy Code'}</span>
                      </button>
                    </div>
                    <p className="text-xs text-slate-500">
                      Instruct your clients or friends to paste this code in the <strong>"Referral Code"</strong> field when creating their account or ordering.
                    </p>
                  </div>
                </div>

                {/* 4 Stat Cards */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-xs">
                    <span className="text-xs text-slate-400 font-bold uppercase">Referred Users</span>
                    <div className="text-2xl font-black text-slate-900 mt-1">
                      {userReferralsList.length}
                    </div>
                    <p className="text-[11px] text-slate-500 mt-1">Registered accounts</p>
                  </div>

                  <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-xs">
                    <span className="text-xs text-slate-400 font-bold uppercase">Qualified Sales</span>
                    <div className="text-2xl font-black text-blue-600 mt-1">
                      {userRewardsList.length}
                    </div>
                    <p className="text-[11px] text-slate-500 mt-1">Website purchases</p>
                  </div>

                  <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-xs">
                    <span className="text-xs text-slate-400 font-bold uppercase">Total Earnings</span>
                    <div className="text-2xl font-black text-emerald-600 mt-1">
                      ₦{(userRewardsList.length * 10000).toLocaleString()}
                    </div>
                    <p className="text-[11px] text-slate-500 mt-1">Credited to wallet</p>
                  </div>

                  <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-xs">
                    <span className="text-xs text-slate-400 font-bold uppercase">Commission Rate</span>
                    <div className="text-2xl font-black text-purple-600 mt-1">
                      ₦10,000
                    </div>
                    <p className="text-[11px] text-slate-500 mt-1">Instant per website</p>
                  </div>
                </div>

                {/* Referral History / Table */}
                <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs overflow-hidden">
                  <div className="p-6 border-b border-slate-100 flex items-center justify-between">
                    <h3 className="text-base font-bold text-slate-900">Referral Commission History</h3>
                    <span className="text-xs text-slate-500">{userRewardsList.length} commission reward(s)</span>
                  </div>

                  {userRewardsList.length === 0 ? (
                    <div className="p-12 text-center text-slate-500 text-sm space-y-2">
                      <div className="text-3xl">👥</div>
                      <p className="font-bold text-slate-800">No referral purchases yet.</p>
                      <p className="text-xs text-slate-400 max-w-sm mx-auto">
                        Share your unique code with buyers. When someone registers and buys a ready-made website, your ₦10,000 rewards will appear here!
                      </p>
                    </div>
                  ) : (
                    <div className="divide-y divide-slate-100">
                      {userRewardsList.map((reward, rIdx) => (
                        <div key={`ref-rew-${reward.id}-${rIdx}`} className="p-5 flex items-center justify-between gap-4 hover:bg-slate-50/50">
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-bold text-slate-900">{reward.description || 'Website Purchase Referral Bonus'}</span>
                              <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 text-[10px] font-bold rounded-full uppercase">
                                Paid
                              </span>
                            </div>
                            <p className="text-xs text-slate-400 mt-1">
                              Referred Buyer: <strong className="text-slate-700">{reward.buyer_name}</strong> • {new Date(reward.created_at).toLocaleDateString()}
                            </p>
                          </div>
                          <div className="text-right">
                            <span className="text-base font-black text-emerald-600">+₦{reward.amount.toLocaleString()}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

              </div>
            )}

          </div>
        )}

        {/* TRANSACTIONS TAB */}
        {activeTab === 'transactions' && (
          <div className="space-y-8 animate-tab-enter">
            <div>
              <h1 className="text-2xl font-bold text-slate-900">Transactions & Deposits</h1>
              <p className="text-slate-500 text-sm">Real-time status of your deposit submissions and wallet activity</p>
            </div>

            {/* DEPOSITS SECTION */}
            <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs overflow-hidden">
              <div className="p-6 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <h3 className="text-base font-bold text-slate-900">Deposit Requests & Verification Status</h3>
                  <p className="text-xs text-slate-400">Track the administrative review of your manual bank payments</p>
                </div>
                <button
                  type="button"
                  onClick={() => onTabChange('fund')}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-xs transition-colors cursor-pointer self-start sm:self-auto"
                >
                  + Make New Deposit
                </button>
              </div>

              {deposits.length === 0 ? (
                <div className="p-12 text-center text-slate-400 text-sm space-y-2">
                  <div className="text-3xl">💳</div>
                  <p className="font-semibold text-slate-700">No deposit requests recorded yet.</p>
                  <p className="text-xs text-slate-400">When you fund your wallet, you can monitor its real-time approval status here.</p>
                </div>
              ) : (
                <div className="divide-y divide-slate-100">
                  {deposits.map((dep, dIdx) => (
                    <div key={`dash-dep-full-${dep.id}-${dIdx}`} className="p-5 sm:p-6 space-y-3 hover:bg-slate-50/50 transition-colors">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                        <div className="flex items-center gap-3">
                          <span className="font-mono text-xs font-bold text-blue-700 bg-blue-50 px-2.5 py-1 rounded-lg border border-blue-100">
                            {dep.deposit_reference}
                          </span>
                          
                          {/* Status Badge */}
                          {dep.status === 'pending' && (
                            <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-amber-50 border border-amber-200 text-amber-800 text-xs font-bold rounded-full">
                              <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse"></span>
                              <span>PENDING VERIFICATION</span>
                            </span>
                          )}
                          {dep.status === 'approved' && (
                            <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold rounded-full">
                              <span>✓ APPROVED & CREDITED</span>
                            </span>
                          )}
                          {dep.status === 'rejected' && (
                            <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-red-50 border border-red-200 text-red-800 text-xs font-bold rounded-full">
                              <span>✕ REJECTED</span>
                            </span>
                          )}
                        </div>

                        <div className="text-left sm:text-right">
                          <span className="text-lg font-black text-slate-900">₦{dep.amount.toLocaleString()}</span>
                        </div>
                      </div>

                      {/* Details & Status Explanation */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1 text-xs">
                        <div className="space-y-1">
                          <p className="text-slate-500">
                            <strong>Payment Method:</strong> {dep.payment_method}
                          </p>
                          <p className="text-slate-400 text-[11px]">
                            <strong>Submitted:</strong> {new Date(dep.created_at).toLocaleString()}
                          </p>
                          {dep.payment_proof && (
                            <div className="pt-1 flex items-center gap-2">
                              <button
                                type="button"
                                onClick={() => setViewingUserReceipt(dep)}
                                className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-slate-100 hover:bg-slate-200 border border-slate-300 rounded-lg text-slate-700 text-[11px] font-semibold cursor-pointer transition-colors"
                              >
                                <span>📷 View Receipt Proof</span>
                              </button>
                            </div>
                          )}
                        </div>

                        <div className={`p-3 rounded-xl border text-xs ${
                          dep.status === 'pending'
                            ? 'bg-amber-50/70 border-amber-200/80 text-amber-900'
                            : dep.status === 'approved'
                            ? 'bg-emerald-50/70 border-emerald-200/80 text-emerald-900'
                            : 'bg-red-50/70 border-red-200/80 text-red-900'
                        }`}>
                          <strong className="block font-bold mb-0.5">
                            {dep.status === 'pending' && '⏳ Status: In Administrative Queue'}
                            {dep.status === 'approved' && '✅ Status: Payment Confirmed'}
                            {dep.status === 'rejected' && '❌ Status: Payment Declined'}
                          </strong>
                          <p className="text-[11px] leading-relaxed">
                            {dep.status === 'pending' && 'Our accounting department is matching your payment reference with bank records. Your wallet balance will be credited automatically upon confirmation.'}
                            {dep.status === 'approved' && `This deposit has been approved by admin. ₦${dep.amount.toLocaleString()} was credited directly to your Surest Plug balance.`}
                            {dep.status === 'rejected' && 'The payment proof provided could not be matched with bank deposits. If you believe this is an error, please open a support ticket with your bank statement.'}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* WALLET BALANCE LEDGER */}
            <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs overflow-hidden">
              <div className="p-6 border-b border-slate-100">
                <h3 className="text-base font-bold text-slate-900">Wallet Activity & Balance Ledger</h3>
                <p className="text-xs text-slate-400">Complete record of every debited and credited transaction</p>
              </div>

              {transactions.length === 0 ? (
                <div className="p-12 text-center text-slate-500 text-sm">
                  No balance transactions recorded yet.
                </div>
              ) : (
                <>
                  {/* Mobile Cards for Wallet Ledger */}
                  <div className="block md:hidden divide-y divide-slate-100">
                    {transactions.map((tx, txIdx) => (
                      <div key={`dash-tx-mob-${tx.id}-${txIdx}`} className="p-4 space-y-2">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <span className="uppercase text-[10px] font-bold px-2 py-0.5 bg-slate-100 text-slate-700 rounded-md">
                              {tx.type}
                            </span>
                            <span className="font-mono text-xs font-bold text-slate-700">#{tx.reference}</span>
                          </div>
                          <span className={`text-sm font-bold font-mono ${['deposit', 'admin_credit', 'refund'].includes(tx.type) ? 'text-emerald-600' : 'text-slate-900'}`}>
                            {['deposit', 'admin_credit', 'refund'].includes(tx.type) ? '+' : '-'}₦{tx.amount.toLocaleString()}
                          </span>
                        </div>
                        <div className="text-xs text-slate-800 font-medium">
                          {tx.description}
                        </div>
                        <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1 border-t border-slate-100">
                          <span>Balance: ₦{tx.balance_after.toLocaleString()}</span>
                          <span>{new Date(tx.created_at).toLocaleString()}</span>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Tablet/Desktop Table for Wallet Ledger */}
                  <div className="hidden md:block overflow-x-auto table-responsive">
                    <table className="w-full text-left border-collapse min-w-[650px]">
                      <thead>
                        <tr className="bg-slate-50 text-[11px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-100">
                          <th className="p-4 pl-6 whitespace-nowrap">Reference</th>
                          <th className="p-4 whitespace-nowrap">Type</th>
                          <th className="p-4 whitespace-nowrap">Description</th>
                          <th className="p-4 whitespace-nowrap">Amount</th>
                          <th className="p-4 whitespace-nowrap">Balance After</th>
                          <th className="p-4 pr-6 whitespace-nowrap">Date</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 text-xs">
                        {transactions.map((tx, txIdx) => (
                          <tr key={`dash-tx-${tx.id}-${txIdx}`} className="hover:bg-slate-50/60 transition-colors">
                            <td className="p-4 pl-6 font-mono font-semibold text-slate-700 whitespace-nowrap">{tx.reference}</td>
                            <td className="p-4 whitespace-nowrap">
                              <span className="uppercase text-[10px] font-bold px-2 py-0.5 bg-slate-100 text-slate-700 rounded-md">
                                {tx.type}
                              </span>
                            </td>
                            <td className="p-4 font-medium text-slate-800 whitespace-nowrap">{tx.description}</td>
                            <td className={`p-4 font-bold whitespace-nowrap ${['deposit', 'admin_credit', 'refund'].includes(tx.type) ? 'text-emerald-600' : 'text-slate-900'}`}>
                              {['deposit', 'admin_credit', 'refund'].includes(tx.type) ? '+' : '-'}₦{tx.amount.toLocaleString()}
                            </td>
                            <td className="p-4 font-semibold text-slate-600 whitespace-nowrap">₦{tx.balance_after.toLocaleString()}</td>
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
          <div className="space-y-6 max-w-4xl animate-tab-enter">
            <div>
              <h1 className="text-2xl font-bold text-slate-900">Support Center</h1>
              <p className="text-slate-500 text-sm">Choose your preferred support channel for fast assistance</p>
            </div>

            {/* Support Channel Switcher: Admin Support vs WhatsApp Support */}
            <div id="support-channel-selector" className="bg-white rounded-3xl p-4 sm:p-5 border border-slate-200/80 shadow-xs space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                  Select Support Channel
                </span>
                <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-emerald-600 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200/60">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                  Active 24/7
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* 💬 Admin Support Option */}
                <button
                  type="button"
                  onClick={() => setSupportChannel('ticket')}
                  className={`p-3.5 sm:p-4 rounded-2xl border text-left transition-all cursor-pointer flex items-center justify-between gap-3 min-h-[54px] ${
                    supportChannel === 'ticket'
                      ? 'bg-blue-50/90 border-blue-500/80 ring-2 ring-blue-500/20 shadow-xs'
                      : 'bg-slate-50 hover:bg-slate-100/80 border-slate-200/90 text-slate-700'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span className="text-xl">💬</span>
                    <div>
                      <span className="text-sm font-bold text-slate-900 block leading-tight">Admin Support</span>
                      <span className="text-[11px] text-slate-500">In-site tickets & voice notes</span>
                    </div>
                  </div>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${
                    supportChannel === 'ticket' ? 'bg-blue-600 text-white' : 'bg-slate-200 text-slate-600'
                  }`}>
                    {supportChannel === 'ticket' ? 'Active' : 'Select'}
                  </span>
                </button>

                {/* 🟢 WhatsApp Support Option */}
                <a
                  href="https://wa.link/qfxlbm"
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() => setSupportChannel('whatsapp')}
                  className={`p-3.5 sm:p-4 rounded-2xl border text-left transition-all cursor-pointer flex items-center justify-between gap-3 min-h-[54px] ${
                    supportChannel === 'whatsapp'
                      ? 'bg-emerald-50 border-emerald-500 ring-2 ring-emerald-500/20 shadow-xs'
                      : 'bg-emerald-50/50 hover:bg-emerald-100/80 border-emerald-200/80 text-emerald-950'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-7 h-7 rounded-full bg-emerald-500 text-white flex items-center justify-center shrink-0 shadow-xs">
                      <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
                        <path d="M12.031 6.172c-3.181 0-5.767 2.586-5.768 5.766-.001 1.298.38 2.27 1.019 3.287l-.711 2.592 2.654-.696c1.001.597 1.773.854 2.806.854 3.18 0 5.767-2.587 5.768-5.766.001-3.182-2.586-5.767-5.768-5.767zm9.969 5.766c0 5.518-4.482 10-10 10-1.745 0-3.385-.45-4.819-1.238l-5.181 1.358 1.385-5.051c-.867-1.48-1.385-3.21-1.385-5.069 0-5.518 4.482-10 10-10 5.518 0 10 4.482 10 10zm-5.467 3.963c-.22-.11-1.303-.643-1.505-.716-.202-.074-.349-.11-.496.11-.147.22-.57 1.066-.698 1.213-.128.147-.257.165-.477.055-.22-.11-.93-.343-1.771-1.093-.654-.583-1.096-1.303-1.224-1.523-.128-.22-.014-.339.096-.449.099-.099.22-.257.33-.385.11-.128.147-.22.22-.367.073-.147.037-.275-.018-.385-.055-.11-.496-1.194-.679-1.636-.179-.43-.36-.372-.496-.379-.128-.007-.275-.008-.422-.008-.147 0-.385.055-.587.275-.202.22-.771.753-.771 1.836 0 1.083.789 2.129.899 2.276.11.147 1.552 2.37 3.76 3.323.525.227.935.362 1.255.464.527.167 1.007.143 1.386.087.423-.063 1.303-.533 1.486-1.047.183-.514.183-.955.128-1.047-.055-.091-.202-.147-.422-.257z"/>
                      </svg>
                    </div>
                    <div>
                      <span className="text-sm font-bold text-emerald-950 block leading-tight">WhatsApp Support</span>
                      <span className="text-[11px] text-emerald-700">Direct instant chat ↗</span>
                    </div>
                  </div>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-600 text-white uppercase tracking-wider flex items-center gap-1">
                    <span>Open</span>
                    <span>↗</span>
                  </span>
                </a>
              </div>
            </div>

            {/* WhatsApp Support Dedicated Card */}
            {supportChannel === 'whatsapp' && (
              <div className="bg-white rounded-3xl p-6 sm:p-7 border border-emerald-200 shadow-xs space-y-4 animate-in fade-in duration-150">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-2xl bg-emerald-500 text-white flex items-center justify-center shadow-xs">
                    <svg className="w-6 h-6 fill-current" viewBox="0 0 24 24">
                      <path d="M12.031 6.172c-3.181 0-5.767 2.586-5.768 5.766-.001 1.298.38 2.27 1.019 3.287l-.711 2.592 2.654-.696c1.001.597 1.773.854 2.806.854 3.18 0 5.767-2.587 5.768-5.766.001-3.182-2.586-5.767-5.768-5.767zm9.969 5.766c0 5.518-4.482 10-10 10-1.745 0-3.385-.45-4.819-1.238l-5.181 1.358 1.385-5.051c-.867-1.48-1.385-3.21-1.385-5.069 0-5.518 4.482-10 10-10 5.518 0 10 4.482 10 10zm-5.467 3.963c-.22-.11-1.303-.643-1.505-.716-.202-.074-.349-.11-.496.11-.147.22-.57 1.066-.698 1.213-.128.147-.257.165-.477.055-.22-.11-.93-.343-1.771-1.093-.654-.583-1.096-1.303-1.224-1.523-.128-.22-.014-.339.096-.449.099-.099.22-.257.33-.385.11-.128.147-.22.22-.367.073-.147.037-.275-.018-.385-.055-.11-.496-1.194-.679-1.636-.179-.43-.36-.372-.496-.379-.128-.007-.275-.008-.422-.008-.147 0-.385.055-.587.275-.202.22-.771.753-.771 1.836 0 1.083.789 2.129.899 2.276.11.147 1.552 2.37 3.76 3.323.525.227.935.362 1.255.464.527.167 1.007.143 1.386.087.423-.063 1.303-.533 1.486-1.047.183-.514.183-.955.128-1.047-.055-.091-.202-.147-.422-.257z"/>
                    </svg>
                  </div>
                  <div>
                    <h3 className="text-base sm:text-lg font-bold text-slate-900">Surest Plug WhatsApp Support</h3>
                    <p className="text-xs text-slate-500">Fast 1-on-1 human assistance via WhatsApp</p>
                  </div>
                </div>

                <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                  Need quick assistance with your order, wallet deposit, or account verification? Our WhatsApp support channel connects you directly with our customer service team.
                </p>

                <div className="pt-2 flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                  <a
                    href="https://wa.link/qfxlbm"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white font-bold text-xs rounded-xl shadow-xs transition-all cursor-pointer min-h-[44px]"
                  >
                    <span>🟢</span>
                    <span>Open WhatsApp Support Now ↗</span>
                  </a>
                  <button
                    type="button"
                    onClick={() => setSupportChannel('ticket')}
                    className="inline-flex items-center justify-center gap-1.5 px-4 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition-all cursor-pointer min-h-[44px]"
                  >
                    <span>💬</span>
                    <span>Switch to In-Site Admin Support</span>
                  </button>
                </div>
              </div>
            )}

            {/* Create Ticket Form (In-Site Admin Support) */}
            <form onSubmit={handleTicketCreate} className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-xs space-y-4">
              <h3 className="text-base font-bold text-slate-900">Open a New Support Ticket</h3>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Subject *</label>
                <input 
                  type="text" 
                  required
                  value={newTicketSubject}
                  onChange={(e) => setNewTicketSubject(e.target.value)}
                  placeholder="e.g. Issue with delivery or SMM order"
                  className="w-full px-4 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-600 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Message {recordedVoiceAudio ? '(Optional if Voice Note attached)' : '*'}</label>
                <textarea 
                  rows={3}
                  value={newTicketMessage}
                  onChange={(e) => setNewTicketMessage(e.target.value)}
                  placeholder="Provide full details or record a voice note below..."
                  className="w-full px-4 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-600 focus:outline-none"
                />
              </div>

              {/* Voice Note Recorder for Ticket Opening */}
              <div className="pt-1">
                <div className="text-xs font-semibold text-slate-700 mb-1.5 flex items-center gap-1.5">
                  <span>🎙️</span>
                  <span>Voice Note Attachment:</span>
                </div>
                {recordedVoiceAudio ? (
                  <div className="flex items-center gap-3 p-3 bg-blue-50 border border-blue-200 rounded-2xl">
                    <VoiceNotePlayer audioData={recordedVoiceAudio} duration={recordedVoiceDuration} />
                    <button
                      type="button"
                      onClick={() => {
                        setRecordedVoiceAudio(null);
                        setRecordedVoiceDuration(0);
                      }}
                      className="text-xs text-red-600 hover:text-red-700 font-bold px-2 py-1 bg-white rounded-lg border border-red-200 cursor-pointer"
                    >
                      Remove
                    </button>
                  </div>
                ) : (
                  <VoiceRecorder
                    onAudioRecorded={(audioBase64, duration) => {
                      setRecordedVoiceAudio(audioBase64);
                      setRecordedVoiceDuration(duration);
                    }}
                  />
                )}
              </div>

              <button
                type="submit"
                className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-bold text-xs rounded-xl shadow-xs transition-all cursor-pointer"
              >
                Submit Ticket
              </button>
            </form>

            {/* Existing Tickets List */}
            <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs overflow-hidden">
              <div className="p-6 border-b border-slate-100">
                <h3 className="text-base font-bold text-slate-900">Your Support Tickets</h3>
              </div>

              {supportTickets.length === 0 ? (
                <div className="p-8 text-center text-slate-400 text-sm">
                  No support tickets opened yet.
                </div>
              ) : (
                <div className="divide-y divide-slate-100">
                  {supportTickets.map((ticket, tkIdx) => (
                    <div key={`dash-tkt-${ticket.id}-${tkIdx}`} className="p-6 space-y-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-xs font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded">
                            {ticket.ticket_code}
                          </span>
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                            ticket.status === 'answered' ? 'bg-emerald-100 text-emerald-800' : 'bg-blue-100 text-blue-800'
                          }`}>
                            {ticket.status}
                          </span>
                        </div>
                        <span className="text-xs text-slate-400">{new Date(ticket.created_at).toLocaleDateString()}</span>
                      </div>

                      <h4 className="text-base font-bold text-slate-900">{ticket.subject}</h4>

                      {/* Messages Thread */}
                      <div className="space-y-3 pt-2">
                        {ticket.messages.map((msg, mIdx) => (
                          <div 
                            key={`dash-msg-${msg.id || mIdx}-${mIdx}`}
                            className={`p-4 rounded-2xl text-xs space-y-2 ${
                              msg.sender_role === 'admin' 
                                ? 'bg-blue-50/80 border border-blue-100 text-blue-900 ml-4' 
                                : 'bg-slate-50 border border-slate-100 text-slate-800 mr-4'
                            }`}
                          >
                            <div className="flex items-center justify-between font-bold">
                              <span>{msg.sender_role === 'admin' ? '🛡️ Support Agent' : msg.sender_name}</span>
                              <span className="text-[10px] text-slate-400">{new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                            </div>

                            {msg.message && msg.message !== 'Voice Message' && (
                              <p className="leading-relaxed whitespace-pre-wrap">{msg.message}</p>
                            )}

                            {msg.audio_data && (
                              <div className="pt-1">
                                <VoiceNotePlayer
                                  audioData={msg.audio_data}
                                  duration={msg.audio_duration}
                                  isCurrentUser={msg.sender_role === currentUser.role}
                                />
                              </div>
                            )}
                          </div>
                        ))}
                      </div>

                      {/* Reply Box */}
                      <div className="pt-2">
                        <button
                          onClick={() => setSelectedTicket(selectedTicket?.id === ticket.id ? null : ticket)}
                          className="text-xs font-bold text-blue-600 hover:text-blue-700 cursor-pointer"
                        >
                          {selectedTicket?.id === ticket.id ? 'Cancel Reply' : '+ Reply to Ticket'}
                        </button>

                        {selectedTicket?.id === ticket.id && (
                          <form onSubmit={handleTicketReply} className="mt-3 space-y-3 p-4 bg-slate-50 rounded-2xl border border-slate-200">
                            <div className="flex gap-2">
                              <input 
                                type="text" 
                                value={replyText}
                                onChange={(e) => setReplyText(e.target.value)}
                                placeholder="Type your response..."
                                className="flex-1 px-4 py-2 text-xs bg-white border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-600"
                              />
                              <button
                                type="submit"
                                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white text-xs font-bold rounded-xl cursor-pointer"
                              >
                                Send
                              </button>
                            </div>

                            {/* Voice reply */}
                            <div>
                              {replyVoiceAudio ? (
                                <div className="flex items-center gap-3 p-2.5 bg-white border border-slate-200 rounded-xl">
                                  <VoiceNotePlayer audioData={replyVoiceAudio} duration={replyVoiceDuration} />
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setReplyVoiceAudio(null);
                                      setReplyVoiceDuration(0);
                                    }}
                                    className="text-xs text-red-600 hover:text-red-700 font-bold px-2 py-1 bg-red-50 rounded-lg cursor-pointer"
                                  >
                                    Remove
                                  </button>
                                </div>
                              ) : (
                                <VoiceRecorder
                                  onAudioRecorded={(audioBase64, duration) => {
                                    setReplyVoiceAudio(audioBase64);
                                    setReplyVoiceDuration(duration);
                                  }}
                                />
                              )}
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

        {/* PROFILE SETTINGS TAB */}
        {activeTab === 'profile' && (
          <div className="space-y-6 max-w-2xl animate-tab-enter">
            <div>
              <h1 className="text-2xl font-bold text-slate-900">Profile Settings</h1>
              <p className="text-slate-500 text-sm">Update your personal information and contact settings</p>
            </div>

            <form onSubmit={handleProfileSave} className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/80 shadow-xs space-y-6">
              <div className="flex items-center gap-4 pb-6 border-b border-slate-100">
                <div className="w-16 h-16 rounded-2xl bg-blue-600 text-white font-black text-xl flex items-center justify-center shadow-md">
                  {currentUser.full_name.charAt(0).toUpperCase()}
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-base">{currentUser.full_name}</h3>
                  <p className="text-xs text-slate-400">{currentUser.email}</p>
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Full Name</label>
                  <input 
                    type="text"
                    required
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="w-full px-4 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-600 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Email Address</label>
                  <input 
                    type="email"
                    disabled
                    value={currentUser.email}
                    className="w-full px-4 py-2.5 text-sm bg-slate-100 border border-slate-200 rounded-xl text-slate-500 cursor-not-allowed"
                  />
                  <p className="text-[11px] text-slate-400 mt-1">Email address is linked to account authentication.</p>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Phone Number (Optional)</label>
                  <input 
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+234..."
                    className="w-full px-4 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-600 focus:outline-none"
                  />
                </div>
              </div>

              <button
                type="submit"
                className="w-full py-3 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-bold text-sm rounded-xl shadow-md transition-all cursor-pointer"
              >
                Save Profile Changes
              </button>
            </form>
          </div>
        )}

        {/* RESELLER API DASHBOARD TAB */}
        {(activeTab === 'reseller-api' || activeTab === 'api') && (
          <ResellerApiDashboard onNavigateToFundWallet={() => onTabChange('fund')} />
        )}

      </div>

      {/* First-time Welcome Modal (State driven, MySQL/Store backed) */}
      {showWelcomeModal && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/75 backdrop-blur-xs"
          onTouchMove={(e) => { if (e.target === e.currentTarget) e.preventDefault(); }}
        >
          <div className="bg-white rounded-3xl max-w-lg w-full max-h-[calc(100dvh-2rem)] overflow-y-auto overscroll-contain sp-overlay-scroll p-6 sm:p-8 shadow-2xl border border-slate-100 text-center">
            <div className="w-16 h-16 rounded-2xl bg-blue-100 text-blue-600 flex items-center justify-center text-3xl mx-auto mb-4">
              🎉
            </div>
            <h3 className="text-2xl font-black text-slate-900 mb-2">Welcome to Surest Plug!</h3>
            <p className="text-slate-600 text-sm mb-6 leading-relaxed">
              Your account is ready! Browse our ready-made website catalog for instant digital source packages, request custom software development, or boost your social media accounts with automated instant processing.
            </p>

            <button
              onClick={() => {
                setShowWelcomeModal(false);
                store.dismissWelcome(currentUser.id);
                onUpdateProfile({ welcome_seen: true });
              }}
              className="w-full py-3 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-bold text-sm rounded-2xl shadow-lg transition-all cursor-pointer"
            >
              Get Started • Explore Dashboard
            </button>
          </div>
        </div>
      )}

      {/* Referral Partner Program Rules Modal */}
      {showReferralRulesModal && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-xs animate-in fade-in"
          onClick={(e) => { if (e.target === e.currentTarget) setShowReferralRulesModal(false); }}
          onTouchMove={(e) => { if (e.target === e.currentTarget) e.preventDefault(); }}
        >
          <div className="bg-white rounded-3xl max-w-lg w-full max-h-[calc(100dvh-2rem)] overflow-y-auto overscroll-contain sp-overlay-scroll p-6 sm:p-8 shadow-2xl border border-slate-100 space-y-6">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center text-xl">
                  📜
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-900">Referral Program Terms & Rules</h3>
                  <p className="text-xs text-slate-500">Official Surest Plug Guidelines</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowReferralRulesModal(false)}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-900 flex items-center justify-center text-sm cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4 text-xs text-slate-600 max-h-80 overflow-y-auto overscroll-contain sp-overlay-scroll pr-1">
              <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200 space-y-1">
                <strong className="text-slate-900 block font-bold">1. Qualification Requirement (10 Purchases)</strong>
                <p>
                  To protect the integrity of our affiliate network and verify genuine account activity, users must complete a minimum of 10 successful digital purchases (ready-made websites, custom builds, or boosting services) before their unique referral code is generated and activated.
                </p>
              </div>

              <div className="p-3.5 bg-purple-50 rounded-2xl border border-purple-200 space-y-1">
                <strong className="text-purple-950 block font-bold">2. ₦10,000 Flat Commission</strong>
                <p className="text-purple-900">
                  Every time a registered user who used your referral code purchases a Ready-Made Website package from our catalog, a flat commission of ₦10,000 is credited instantly to your Surest Plug wallet.
                </p>
              </div>

              <div className="p-3.5 bg-emerald-50 rounded-2xl border border-emerald-200 space-y-1">
                <strong className="text-emerald-950 block font-bold">3. Transparent Wallet Crediting</strong>
                <p className="text-emerald-900">
                  Referral rewards are liquid credits and can be used immediately across the marketplace or retained in your digital balance.
                </p>
              </div>

              <div className="p-3.5 bg-amber-50 rounded-2xl border border-amber-200 space-y-1">
                <strong className="text-amber-950 block font-bold">4. Anti-Fraud & Self-Referral Policy</strong>
                <p className="text-amber-900">
                  Self-referral (creating alternative accounts to refer yourself) is strictly prohibited. Unqualified, refunded, or fraudulent orders will not trigger commission payouts.
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setShowReferralRulesModal(false)}
              className="w-full py-3 bg-purple-600 hover:bg-purple-700 active:bg-purple-800 text-white font-bold text-xs rounded-xl shadow-sm transition-colors cursor-pointer"
            >
              I Understand & Agree
            </button>
          </div>
        </div>
      )}

      {/* User Deposit Receipt Preview Modal */}
      {viewingUserReceipt && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-xs animate-in fade-in"
          onClick={(e) => { if (e.target === e.currentTarget) setViewingUserReceipt(null); }}
          onTouchMove={(e) => { if (e.target === e.currentTarget) e.preventDefault(); }}
        >
          <div className="bg-white rounded-3xl max-w-xl w-full max-h-[calc(100dvh-2rem)] overflow-y-auto overscroll-contain sp-overlay-scroll p-6 shadow-2xl border border-slate-100 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <span className="font-mono text-xs font-bold text-blue-600">{viewingUserReceipt.deposit_reference}</span>
                <h3 className="text-base font-bold text-slate-900">Uploaded Payment Receipt</h3>
              </div>
              <button
                type="button"
                onClick={() => setViewingUserReceipt(null)}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-900 flex items-center justify-center text-sm cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200 flex items-center justify-between text-xs">
              <span>Amount: <strong className="text-emerald-600">₦{viewingUserReceipt.amount.toLocaleString()}</strong></span>
              <span>Method: <strong>{viewingUserReceipt.payment_method}</strong></span>
              <span className={`font-bold uppercase ${
                viewingUserReceipt.status === 'approved' ? 'text-emerald-600' : viewingUserReceipt.status === 'rejected' ? 'text-red-600' : 'text-amber-600'
              }`}>{viewingUserReceipt.status}</span>
            </div>

            <div className="bg-slate-950 p-2 rounded-2xl flex items-center justify-center max-h-96 overflow-y-auto overscroll-contain sp-overlay-scroll">
              {viewingUserReceipt.payment_proof ? (
                <img
                  src={viewingUserReceipt.payment_proof}
                  alt="Receipt Proof"
                  className="max-h-80 w-auto rounded-xl object-contain"
                />
              ) : (
                <p className="text-xs text-slate-400 py-8">No image attached</p>
              )}
            </div>

            <button
              type="button"
              onClick={() => setViewingUserReceipt(null)}
              className="w-full py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl cursor-pointer"
            >
              Close Receipt
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default DashboardPage;
