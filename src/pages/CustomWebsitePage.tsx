/**
 * Surest Plug - Redesigned Custom Website Request Page
 * Multi-section form with full validation, logo upload with preview & storage,
 * reference website link, multi-select features checklist, contact info auto-fill,
 * real-time order summary, and instant confirmation.
 */

import React, { useState, useRef, useEffect } from 'react';
import { 
  Globe, 
  UploadCloud, 
  CheckCircle2, 
  Trash2, 
  Link2, 
  ShieldCheck, 
  Layers, 
  User as UserIcon, 
  Mail, 
  Phone, 
  FileText, 
  Sparkles, 
  Copy, 
  Check, 
  ArrowRight,
  ExternalLink,
  Info,
  CreditCard,
  LayoutDashboard,
  MessageSquare,
  MessageCircle,
  ShoppingBag,
  ShoppingCart,
  Search,
  BookOpen,
  Send,
  Share2,
  PlusCircle,
  RefreshCw
} from 'lucide-react';
import { User, CustomOrder } from '../types';
import { store } from '../lib/store';

interface CustomWebsitePageProps {
  currentUser: User | null;
  onSubmitCustomOrder?: (formData: any) => void;
  onNavigate: (route: string) => void;
}

interface UploadedLogo {
  dataUrl: string;
  name: string;
  size: number;
  formattedSize: string;
}

const WEBSITE_TYPES = [
  'Business',
  'E-commerce',
  'Portfolio',
  'Blog',
  'Landing Page',
  'News',
  'Agency',
  'School',
  'Other'
];

const AVAILABLE_FEATURES = [
  { id: 'auth', label: 'User Login/Register', icon: UserIcon, desc: 'Secure member registration and accounts' },
  { id: 'payment', label: 'Payment Integration', icon: CreditCard, desc: 'Paystack, Flutterwave, or Crypto checkout' },
  { id: 'admin', label: 'Admin Dashboard', icon: LayoutDashboard, desc: 'Full backend control panel and analytics' },
  { id: 'contact', label: 'Contact Form', icon: Mail, desc: 'Inquiry forms with email notifications' },
  { id: 'whatsapp', label: 'WhatsApp Button', icon: MessageCircle, desc: 'Direct 1-click customer chat widget' },
  { id: 'chat', label: 'Live Chat', icon: MessageSquare, desc: 'Real-time interactive support system' },
  { id: 'listings', label: 'Product/Service Listings', icon: ShoppingBag, desc: 'Categorized catalog with filter controls' },
  { id: 'cart', label: 'Shopping Cart', icon: ShoppingCart, desc: 'Dynamic cart, checkout, and inventory' },
  { id: 'search', label: 'Search', icon: Search, desc: 'Instant search bar and filter engine' },
  { id: 'blog', label: 'Blog', icon: BookOpen, desc: 'Content publishing, articles, and SEO' },
  { id: 'newsletter', label: 'Newsletter', icon: Send, desc: 'Subscriber collection and lead capture' },
  { id: 'social', label: 'Social Media Integration', icon: Share2, desc: 'Direct social feeds and share buttons' },
  { id: 'other', label: 'Other', icon: PlusCircle, desc: 'Custom unique features or integrations' }
];

const BASE_PRICE = 150000;

export const CustomWebsitePage: React.FC<CustomWebsitePageProps> = ({
  currentUser,
  onSubmitCustomOrder,
  onNavigate
}) => {
  // Form State
  const [websiteName, setWebsiteName] = useState('');
  const [websiteType, setWebsiteType] = useState('Business');
  const [websiteTypeOther, setWebsiteTypeOther] = useState('');
  const [description, setDescription] = useState('');
  
  // Logo Upload State
  const [logo, setLogo] = useState<UploadedLogo | null>(null);
  const [isDraggingLogo, setIsDraggingLogo] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Reference Website
  const [referenceWebsite, setReferenceWebsite] = useState('');

  // Features Checklist State
  const [selectedFeatures, setSelectedFeatures] = useState<string[]>([
    'User Login/Register',
    'Payment Integration',
    'Admin Dashboard',
    'Contact Form'
  ]);
  const [otherFeatureText, setOtherFeatureText] = useState('');

  // Contact Info State (Pre-filled from auth)
  const [fullName, setFullName] = useState(currentUser?.full_name || '');
  const [email, setEmail] = useState(currentUser?.email || '');
  const [phone, setPhone] = useState(currentUser?.phone || '');

  // Additional Instructions
  const [additionalInstructions, setAdditionalInstructions] = useState('');

  // Validation & Submission State
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submittedOrder, setSubmittedOrder] = useState<CustomOrder | null>(null);
  const [copiedRef, setCopiedRef] = useState(false);

  // Keep contact info in sync if currentUser changes
  useEffect(() => {
    if (currentUser) {
      if (!fullName) setFullName(currentUser.full_name || '');
      if (!email) setEmail(currentUser.email || '');
      if (!phone && currentUser.phone) setPhone(currentUser.phone);
    }
  }, [currentUser]);

  // Format file size
  const formatBytes = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
  };

  // Handle Logo File Upload
  const handleLogoFile = (file: File) => {
    setErrors(prev => ({ ...prev, logo: '' }));
    
    // Allowed MIME types
    const allowedTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp'];
    if (!allowedTypes.includes(file.type.toLowerCase())) {
      setErrors(prev => ({
        ...prev,
        logo: 'Invalid file format. Supported formats: PNG, JPG, JPEG, WEBP.'
      }));
      return;
    }

    // Max 5MB
    const maxSizeBytes = 5 * 1024 * 1024;
    if (file.size > maxSizeBytes) {
      setErrors(prev => ({
        ...prev,
        logo: `File is too large (${formatBytes(file.size)}). Maximum allowed size is 5MB.`
      }));
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        setLogo({
          dataUrl: reader.result,
          name: file.name,
          size: file.size,
          formattedSize: formatBytes(file.size)
        });
      }
    };
    reader.onerror = () => {
      setErrors(prev => ({
        ...prev,
        logo: 'Failed to read image file. Please try again.'
      }));
    };
    reader.readAsDataURL(file);
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleLogoFile(file);
    }
  };

  const handleDropLogo = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDraggingLogo(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      handleLogoFile(file);
    }
  };

  const removeLogo = () => {
    setLogo(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Toggle Feature in Checklist
  const toggleFeature = (label: string) => {
    setSelectedFeatures(prev => {
      if (prev.includes(label)) {
        return prev.filter(f => f !== label);
      } else {
        return [...prev, label];
      }
    });
  };

  // Validate URL Helper
  const isValidUrl = (urlString: string): boolean => {
    if (!urlString.trim()) return true;
    try {
      let testUrl = urlString.trim();
      if (!testUrl.startsWith('http://') && !testUrl.startsWith('https://')) {
        testUrl = `https://${testUrl}`;
      }
      const url = new URL(testUrl);
      return Boolean(url.hostname && url.hostname.includes('.'));
    } catch {
      return false;
    }
  };

  // Comprehensive Form Validation
  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!websiteName.trim()) {
      newErrors.websiteName = 'Website name is required.';
    }

    if (!websiteType.trim()) {
      newErrors.websiteType = 'Website type is required.';
    }

    if (websiteType === 'Other' && !websiteTypeOther.trim()) {
      newErrors.websiteTypeOther = 'Please specify your custom website type.';
    }

    if (!description.trim()) {
      newErrors.description = 'Website description is required.';
    } else if (description.trim().length < 15) {
      newErrors.description = 'Please provide a more detailed description (minimum 15 characters).';
    }

    if (referenceWebsite.trim() && !isValidUrl(referenceWebsite)) {
      newErrors.referenceWebsite = 'Please enter a valid website URL (e.g. https://example.com).';
    }

    if (!fullName.trim()) {
      newErrors.fullName = 'Your full name is required.';
    }

    if (!email.trim()) {
      newErrors.email = 'Email address is required.';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      newErrors.email = 'Please enter a valid email address.';
    }

    if (!phone.trim()) {
      newErrors.phone = 'Phone number is required for project communication.';
    }

    if (selectedFeatures.includes('Other') && !otherFeatureText.trim()) {
      newErrors.otherFeatureText = 'Please specify the custom features you need.';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Form Submit Handler
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!currentUser) {
      onNavigate('login');
      return;
    }

    if (!validateForm()) {
      // Scroll to the first error
      const firstErrorKey = Object.keys(errors)[0];
      const el = document.getElementById(`field-${firstErrorKey}`);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
      return;
    }

    setIsSubmitting(true);

    try {
      const finalWebsiteType = websiteType === 'Other' ? `Other (${websiteTypeOther.trim()})` : websiteType;
      
      let cleanRefUrl = referenceWebsite.trim();
      if (cleanRefUrl && !cleanRefUrl.startsWith('http://') && !cleanRefUrl.startsWith('https://')) {
        cleanRefUrl = `https://${cleanRefUrl}`;
      }

      // Compile final features list
      const finalFeaturesList = [...selectedFeatures];
      if (selectedFeatures.includes('Other') && otherFeatureText.trim()) {
        const otherIndex = finalFeaturesList.indexOf('Other');
        if (otherIndex !== -1) {
          finalFeaturesList[otherIndex] = `Other: ${otherFeatureText.trim()}`;
        }
      }

      const orderPayload = {
        projectName: websiteName.trim(),
        project_name: websiteName.trim(),
        websiteType: finalWebsiteType,
        website_type: finalWebsiteType,
        description: description.trim(),
        featuresList: finalFeaturesList,
        features_list: finalFeaturesList,
        requiredFeatures: finalFeaturesList.join(', '),
        required_features: finalFeaturesList.join(', '),
        logoUrl: logo?.dataUrl || '',
        logo_url: logo?.dataUrl || '',
        logoName: logo?.name || '',
        logo_name: logo?.name || '',
        logoSize: logo?.size || 0,
        logo_size: logo?.size || 0,
        referenceWebsite: cleanRefUrl,
        reference_website: cleanRefUrl,
        additionalInstructions: additionalInstructions.trim(),
        additional_instructions: additionalInstructions.trim(),
        fullName: fullName.trim(),
        full_name: fullName.trim(),
        email: email.trim(),
        phone: phone.trim(),
        price: BASE_PRICE,
        budget: `₦${BASE_PRICE.toLocaleString()}`,
        deadline: '2 Weeks',
        pagesCount: '5 - 10 Pages',
        contactInformation: JSON.stringify({
          full_name: fullName.trim(),
          email: email.trim(),
          phone: phone.trim(),
          reference_website: cleanRefUrl,
          logo_name: logo?.name || null,
          features: finalFeaturesList,
          additional_instructions: additionalInstructions.trim()
        })
      };

      // Submit to real store & sync to Firestore
      const res = store.submitCustomOrder(currentUser.id, orderPayload);

      if (res.success && res.customOrder) {
        setSubmittedOrder(res.customOrder);
        if (onSubmitCustomOrder) {
          // If parent needs a hook, pass sanitized order
          try {
            // parent might also do state updates
          } catch {}
        }
        window.scrollTo({ top: 0, behavior: 'smooth' });
      } else {
        setErrors({ general: res.error || 'Failed to submit request. Please try again.' });
      }
    } catch (err: any) {
      setErrors({ general: err.message || 'An unexpected error occurred during submission.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCopyReference = (ref: string) => {
    navigator.clipboard.writeText(ref);
    setCopiedRef(true);
    setTimeout(() => setCopiedRef(false), 2500);
  };

  const handleResetForm = () => {
    setWebsiteName('');
    setWebsiteType('Business');
    setWebsiteTypeOther('');
    setDescription('');
    setLogo(null);
    setReferenceWebsite('');
    setSelectedFeatures([
      'User Login/Register',
      'Payment Integration',
      'Admin Dashboard',
      'Contact Form'
    ]);
    setOtherFeatureText('');
    setAdditionalInstructions('');
    setSubmittedOrder(null);
    setErrors({});
  };

  // SUCCESS CONFIRMATION VIEW
  if (submittedOrder) {
    return (
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-12 pb-24 space-y-8 animate-fadeIn">
        <div className="bg-white rounded-3xl p-6 sm:p-10 border border-slate-200/80 shadow-xl text-center space-y-6 relative overflow-hidden">
          {/* Subtle Top Accent */}
          <div className="absolute top-0 left-0 right-0 h-2 bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-500"></div>

          <div className="w-16 h-16 sm:w-20 sm:h-20 bg-emerald-50 text-emerald-600 rounded-3xl mx-auto flex items-center justify-center border border-emerald-100 shadow-sm">
            <CheckCircle2 className="w-10 h-10 sm:w-12 sm:h-12" />
          </div>

          <div className="space-y-2">
            <span className="text-xs font-extrabold uppercase tracking-widest text-emerald-600 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-200/60">
              Request Received
            </span>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
              Custom Website Request Submitted!
            </h1>
            <p className="text-slate-600 text-xs sm:text-sm max-w-lg mx-auto leading-relaxed">
              Your custom website request has been received successfully. Our team will review your requirements and begin processing your order.
            </p>
          </div>

          {/* Reference Card */}
          <div className="p-4 sm:p-5 bg-slate-50 rounded-2xl border border-slate-200/80 flex flex-col sm:flex-row items-center justify-between gap-3 text-left">
            <div>
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                Order Reference Number
              </span>
              <div className="text-lg sm:text-xl font-mono font-black text-blue-600">
                {submittedOrder.request_reference}
              </div>
            </div>

            <button
              onClick={() => handleCopyReference(submittedOrder.request_reference)}
              className="inline-flex items-center gap-2 px-4 py-2 bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer active:scale-95"
            >
              {copiedRef ? (
                <>
                  <Check className="w-4 h-4 text-emerald-600" />
                  <span className="text-emerald-600">Copied!</span>
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4 text-slate-500" />
                  <span>Copy Reference</span>
                </>
              )}
            </button>
          </div>

          {/* Submitted Order Specs Summary */}
          <div className="p-5 bg-slate-50/50 rounded-2xl border border-slate-100 text-left space-y-3 text-xs">
            <div className="font-bold text-slate-900 uppercase tracking-wider text-[11px] border-b border-slate-200/60 pb-2">
              Submitted Specifications
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-slate-600">
              <div>
                <span className="text-slate-400 block text-[10px] uppercase">Website Name</span>
                <span className="font-bold text-slate-900">{submittedOrder.project_name}</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px] uppercase">Website Type</span>
                <span className="font-bold text-blue-600">{submittedOrder.website_type}</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px] uppercase">Contact Person</span>
                <span className="font-semibold text-slate-900">{submittedOrder.user_name}</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px] uppercase">Contact Email & Phone</span>
                <span className="font-semibold text-slate-900">{submittedOrder.user_email} • {submittedOrder.phone || 'N/A'}</span>
              </div>
            </div>

            {submittedOrder.logo_url && (
              <div className="pt-2 border-t border-slate-200/60 flex items-center gap-3">
                <img 
                  src={submittedOrder.logo_url} 
                  alt="Uploaded Logo" 
                  className="w-10 h-10 object-contain rounded-lg border border-slate-200 bg-white p-1"
                />
                <div>
                  <div className="font-semibold text-slate-900 text-xs">Logo Attached</div>
                  <div className="text-[10px] text-slate-400">{submittedOrder.logo_name || 'Brand Logo'}</div>
                </div>
              </div>
            )}

            {submittedOrder.reference_website && (
              <div className="pt-2 border-t border-slate-200/60">
                <span className="text-slate-400 block text-[10px] uppercase">Reference Website</span>
                <a 
                  href={submittedOrder.reference_website} 
                  target="_blank" 
                  rel="noopener noreferrer" 
                  className="text-blue-600 hover:underline font-mono inline-flex items-center gap-1 mt-0.5"
                >
                  {submittedOrder.reference_website}
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>
            )}

            {submittedOrder.features_list && submittedOrder.features_list.length > 0 && (
              <div className="pt-2 border-t border-slate-200/60">
                <span className="text-slate-400 block text-[10px] uppercase mb-1.5">Selected Features</span>
                <div className="flex flex-wrap gap-1.5">
                  {submittedOrder.features_list.map((feat, fIdx) => (
                    <span key={fIdx} className="px-2.5 py-1 bg-white border border-slate-200 text-slate-700 rounded-lg text-[11px] font-medium">
                      ✓ {feat}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-3 pt-2">
            <button
              onClick={() => onNavigate('dashboard')}
              className="flex-1 py-3 px-5 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-bold text-xs sm:text-sm rounded-xl shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <span>Track in Customer Dashboard</span>
              <ArrowRight className="w-4 h-4" />
            </button>

            <button
              onClick={handleResetForm}
              className="py-3 px-5 bg-slate-100 hover:bg-slate-200 active:bg-slate-300 text-slate-700 font-bold text-xs sm:text-sm rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <RefreshCw className="w-4 h-4 text-slate-500" />
              <span>Submit Another Request</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  // MAIN REDESIGNED FORM VIEW
  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 pb-24 space-y-8">
      
      {/* Page Header */}
      <div className="text-center space-y-2.5 max-w-2xl mx-auto">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 border border-blue-200/60 text-blue-700 text-xs font-bold">
          <Sparkles className="w-3.5 h-3.5" />
          <span>Tailor-Made Software & Web Engineering</span>
        </div>
        <h1 className="text-2xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
          Request a Custom Website
        </h1>
        <p className="text-slate-600 text-xs sm:text-sm leading-relaxed">
          Tell us about your project. Our engineering team will review your specifications, prepare a custom architecture, and build your live platform.
        </p>
      </div>

      {/* Global Form Error Banner */}
      {errors.general && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-2xl text-red-700 text-xs font-semibold flex items-center gap-3">
          <Info className="w-5 h-5 shrink-0 text-red-500" />
          <span>{errors.general}</span>
        </div>
      )}

      {/* Main Request Form */}
      <form onSubmit={handleSubmit} noValidate className="space-y-6">
        
        {/* ========================================================================= */}
        {/* SECTION 1 — WEBSITE INFORMATION */}
        {/* ========================================================================= */}
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/80 shadow-xs space-y-6">
          <div className="flex items-center gap-3 pb-3 border-b border-slate-100">
            <span className="w-7 h-7 rounded-xl bg-blue-600 text-white font-black text-xs flex items-center justify-center shadow-xs">
              1
            </span>
            <div>
              <h2 className="text-base font-bold text-slate-900">Website Information</h2>
              <p className="text-xs text-slate-500">Provide the core details and overview of your website</p>
            </div>
          </div>

          <div className="space-y-5">
            {/* Website Name */}
            <div id="field-websiteName">
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Website Name <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <Globe className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={websiteName}
                  onChange={(e) => {
                    setWebsiteName(e.target.value);
                    if (errors.websiteName) setErrors(prev => ({ ...prev, websiteName: '' }));
                  }}
                  placeholder="Enter the name of your website"
                  className={`w-full pl-10 pr-4 py-3 text-sm bg-slate-50 border ${errors.websiteName ? 'border-red-400 ring-1 ring-red-300 bg-red-50/20' : 'border-slate-200'} rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-600 focus:outline-none transition-all`}
                />
              </div>
              {errors.websiteName && (
                <p className="text-[11px] text-red-500 font-semibold mt-1.5 flex items-center gap-1">
                  <span>•</span> {errors.websiteName}
                </p>
              )}
            </div>

            {/* Website Type */}
            <div id="field-websiteType">
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Website Type <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <Layers className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <select
                  value={websiteType}
                  onChange={(e) => {
                    setWebsiteType(e.target.value);
                    if (errors.websiteType) setErrors(prev => ({ ...prev, websiteType: '' }));
                  }}
                  className={`w-full pl-10 pr-4 py-3 text-sm bg-slate-50 border ${errors.websiteType ? 'border-red-400 ring-1 ring-red-300' : 'border-slate-200'} rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-600 focus:outline-none transition-all cursor-pointer`}
                >
                  {WEBSITE_TYPES.map((type) => (
                    <option key={type} value={type}>
                      {type}
                    </option>
                  ))}
                </select>
              </div>
              {errors.websiteType && (
                <p className="text-[11px] text-red-500 font-semibold mt-1.5 flex items-center gap-1">
                  <span>•</span> {errors.websiteType}
                </p>
              )}

              {/* If "Other" selected, show custom text input */}
              {websiteType === 'Other' && (
                <div className="mt-3">
                  <input
                    type="text"
                    value={websiteTypeOther}
                    onChange={(e) => {
                      setWebsiteTypeOther(e.target.value);
                      if (errors.websiteTypeOther) setErrors(prev => ({ ...prev, websiteTypeOther: '' }));
                    }}
                    placeholder="Specify your custom website category (e.g., Real Estate, Crypto, Logistics)..."
                    className="w-full px-4 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-600 focus:outline-none"
                  />
                  {errors.websiteTypeOther && (
                    <p className="text-[11px] text-red-500 font-semibold mt-1">
                      {errors.websiteTypeOther}
                    </p>
                  )}
                </div>
              )}
            </div>

            {/* Describe Your Website */}
            <div id="field-description">
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Describe Your Website <span className="text-red-500">*</span>
              </label>
              <textarea
                rows={4}
                value={description}
                onChange={(e) => {
                  setDescription(e.target.value);
                  if (errors.description) setErrors(prev => ({ ...prev, description: '' }));
                }}
                placeholder="Tell us what you want your website to look like and what features you need..."
                className={`w-full p-4 text-sm bg-slate-50 border ${errors.description ? 'border-red-400 ring-1 ring-red-300 bg-red-50/20' : 'border-slate-200'} rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-600 focus:outline-none transition-all leading-relaxed`}
              />
              <div className="flex items-center justify-between mt-1 text-[11px] text-slate-400">
                <span>Explain your audience, workflow, preferred colors, or sections.</span>
                <span>{description.length} characters</span>
              </div>
              {errors.description && (
                <p className="text-[11px] text-red-500 font-semibold mt-1.5 flex items-center gap-1">
                  <span>•</span> {errors.description}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* SECTION 2 — WEBSITE LOGO */}
        {/* ========================================================================= */}
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/80 shadow-xs space-y-6">
          <div className="flex items-center gap-3 pb-3 border-b border-slate-100">
            <span className="w-7 h-7 rounded-xl bg-blue-600 text-white font-black text-xs flex items-center justify-center shadow-xs">
              2
            </span>
            <div>
              <h2 className="text-base font-bold text-slate-900">Upload Your Website Logo</h2>
              <p className="text-xs text-slate-500">
                Upload the logo you want us to use on your website.
              </p>
            </div>
          </div>

          <div id="field-logo">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/png, image/jpeg, image/jpg, image/webp"
              onChange={handleFileInputChange}
              className="hidden"
            />

            {!logo ? (
              /* Drag & Drop Upload Zone */
              <div
                onDragOver={(e) => {
                  e.preventDefault();
                  setIsDraggingLogo(true);
                }}
                onDragLeave={() => setIsDraggingLogo(false)}
                onDrop={handleDropLogo}
                onClick={() => fileInputRef.current?.click()}
                className={`border-2 border-dashed ${isDraggingLogo ? 'border-blue-500 bg-blue-50/50' : 'border-slate-200 hover:border-blue-400 bg-slate-50/60 hover:bg-blue-50/20'} rounded-2xl p-6 sm:p-8 text-center transition-all cursor-pointer flex flex-col items-center justify-center gap-3`}
              >
                <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center shadow-xs">
                  <UploadCloud className="w-6 h-6" />
                </div>
                <div className="space-y-1">
                  <div className="text-sm font-bold text-slate-800">
                    Upload Logo
                  </div>
                  <div className="text-xs text-slate-500">
                    Drag & drop your image here, or <span className="text-blue-600 font-semibold underline">browse files</span>
                  </div>
                </div>
                <div className="text-[11px] text-slate-400 bg-white px-3 py-1 rounded-full border border-slate-200/80">
                  Supported formats: <strong>PNG, JPG, JPEG, WEBP</strong> (Max 5MB)
                </div>
              </div>
            ) : (
              /* Uploaded Logo Preview Card */
              <div className="p-4 sm:p-5 bg-slate-50 rounded-2xl border border-slate-200/80 flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="flex items-center gap-4 w-full sm:w-auto">
                  <div className="w-16 h-16 rounded-xl bg-slate-900 border border-slate-800 p-1 flex items-center justify-center shrink-0 overflow-hidden shadow-xs">
                    <img
                      src={logo.dataUrl}
                      alt={logo.name}
                      className="w-full h-full object-contain"
                    />
                  </div>
                  <div className="space-y-1 min-w-0 flex-1">
                    <div className="text-xs font-bold text-slate-900 truncate max-w-xs sm:max-w-sm">
                      {logo.name}
                    </div>
                    <div className="text-[11px] text-slate-500 flex items-center gap-2">
                      <span className="font-mono">{logo.formattedSize}</span>
                      <span>•</span>
                      <span className="text-emerald-600 font-semibold flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3" /> Attached
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="px-3 py-2 bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-xl text-xs font-bold transition-all cursor-pointer"
                  >
                    Change
                  </button>
                  <button
                    type="button"
                    onClick={removeLogo}
                    className="p-2 bg-red-50 hover:bg-red-100 text-red-600 border border-red-200/60 rounded-xl text-xs font-bold transition-all cursor-pointer"
                    title="Remove logo"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}

            {errors.logo && (
              <p className="text-[11px] text-red-500 font-semibold mt-2 flex items-center gap-1">
                <span>•</span> {errors.logo}
              </p>
            )}
          </div>
        </div>

        {/* ========================================================================= */}
        {/* SECTION 3 — REFERENCE WEBSITE */}
        {/* ========================================================================= */}
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/80 shadow-xs space-y-6">
          <div className="flex items-center gap-3 pb-3 border-b border-slate-100">
            <span className="w-7 h-7 rounded-xl bg-blue-600 text-white font-black text-xs flex items-center justify-center shadow-xs">
              3
            </span>
            <div>
              <h2 className="text-base font-bold text-slate-900">Reference Website</h2>
              <p className="text-xs text-slate-500">
                Have a website you like? Paste its link below so we can use it as a design reference.
              </p>
            </div>
          </div>

          <div id="field-referenceWebsite" className="space-y-2">
            <div className="relative">
              <Link2 className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="url"
                value={referenceWebsite}
                onChange={(e) => {
                  setReferenceWebsite(e.target.value);
                  if (errors.referenceWebsite) setErrors(prev => ({ ...prev, referenceWebsite: '' }));
                }}
                placeholder="https://example.com"
                className={`w-full pl-10 pr-4 py-3 text-sm bg-slate-50 border ${errors.referenceWebsite ? 'border-red-400 ring-1 ring-red-300' : 'border-slate-200'} rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-600 focus:outline-none transition-all font-mono`}
              />
            </div>
            <div className="text-[11px] text-slate-400 flex items-center gap-1">
              <Info className="w-3.5 h-3.5 text-slate-400" />
              <span>Optional — Leave blank if you don't have a reference website.</span>
            </div>
            {errors.referenceWebsite && (
              <p className="text-[11px] text-red-500 font-semibold mt-1 flex items-center gap-1">
                <span>•</span> {errors.referenceWebsite}
              </p>
            )}
          </div>
        </div>

        {/* ========================================================================= */}
        {/* SECTION 4 — WEBSITE FEATURES */}
        {/* ========================================================================= */}
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/80 shadow-xs space-y-6">
          <div className="flex items-center gap-3 pb-3 border-b border-slate-100">
            <span className="w-7 h-7 rounded-xl bg-blue-600 text-white font-black text-xs flex items-center justify-center shadow-xs">
              4
            </span>
            <div>
              <h2 className="text-base font-bold text-slate-900">What features do you need?</h2>
              <p className="text-xs text-slate-500">
                Select all the features and capabilities you want included in your website build.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {AVAILABLE_FEATURES.map((feat) => {
              const isSelected = selectedFeatures.includes(feat.label);
              const Icon = feat.icon;
              return (
                <button
                  key={feat.id}
                  type="button"
                  onClick={() => toggleFeature(feat.label)}
                  className={`p-3.5 rounded-2xl border text-left transition-all flex items-start gap-3 cursor-pointer ${
                    isSelected
                      ? 'bg-blue-50/80 border-blue-500 ring-1 ring-blue-500/30'
                      : 'bg-slate-50/60 border-slate-200/80 hover:border-slate-300 hover:bg-slate-50'
                  }`}
                >
                  <div className={`w-5 h-5 rounded-md flex items-center justify-center shrink-0 mt-0.5 border transition-all ${
                    isSelected
                      ? 'bg-blue-600 border-blue-600 text-white'
                      : 'border-slate-300 bg-white'
                  }`}>
                    {isSelected && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                  </div>

                  <div className="space-y-0.5 min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <Icon className={`w-3.5 h-3.5 ${isSelected ? 'text-blue-600' : 'text-slate-400'}`} />
                      <span className={`text-xs font-bold ${isSelected ? 'text-blue-900' : 'text-slate-800'}`}>
                        {feat.label}
                      </span>
                    </div>
                    <p className="text-[10px] text-slate-500 leading-tight line-clamp-1">
                      {feat.desc}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>

          {/* If "Other" feature is checked, show custom feature input */}
          {selectedFeatures.includes('Other') && (
            <div className="pt-2 border-t border-slate-100" id="field-otherFeatureText">
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Specify Other Features <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={otherFeatureText}
                onChange={(e) => {
                  setOtherFeatureText(e.target.value);
                  if (errors.otherFeatureText) setErrors(prev => ({ ...prev, otherFeatureText: '' }));
                }}
                placeholder="e.g. Multi-currency converter, Booking calendar, AI Chatbot integration..."
                className={`w-full px-4 py-2.5 text-sm bg-slate-50 border ${errors.otherFeatureText ? 'border-red-400 ring-1 ring-red-300' : 'border-slate-200'} rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-600 focus:outline-none`}
              />
              {errors.otherFeatureText && (
                <p className="text-[11px] text-red-500 font-semibold mt-1">
                  {errors.otherFeatureText}
                </p>
              )}
            </div>
          )}
        </div>

        {/* ========================================================================= */}
        {/* SECTION 5 — CONTACT INFORMATION */}
        {/* ========================================================================= */}
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/80 shadow-xs space-y-6">
          <div className="flex items-center gap-3 pb-3 border-b border-slate-100">
            <span className="w-7 h-7 rounded-xl bg-blue-600 text-white font-black text-xs flex items-center justify-center shadow-xs">
              5
            </span>
            <div>
              <h2 className="text-base font-bold text-slate-900">Contact Information</h2>
              <p className="text-xs text-slate-500">
                We will use this information to send you development updates, blueprints, and milestone notices.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {/* Your Name */}
            <div id="field-fullName">
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Your Name <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <UserIcon className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={fullName}
                  onChange={(e) => {
                    setFullName(e.target.value);
                    if (errors.fullName) setErrors(prev => ({ ...prev, fullName: '' }));
                  }}
                  placeholder="e.g. Chukwuemeka Obi"
                  className={`w-full pl-10 pr-4 py-2.5 text-sm bg-slate-50 border ${errors.fullName ? 'border-red-400 ring-1 ring-red-300' : 'border-slate-200'} rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-600 focus:outline-none`}
                />
              </div>
              {errors.fullName && (
                <p className="text-[11px] text-red-500 font-semibold mt-1">
                  {errors.fullName}
                </p>
              )}
            </div>

            {/* Email Address */}
            <div id="field-email">
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Email Address <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    if (errors.email) setErrors(prev => ({ ...prev, email: '' }));
                  }}
                  placeholder="e.g. client@domain.com"
                  className={`w-full pl-10 pr-4 py-2.5 text-sm bg-slate-50 border ${errors.email ? 'border-red-400 ring-1 ring-red-300' : 'border-slate-200'} rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-600 focus:outline-none`}
                />
              </div>
              {errors.email && (
                <p className="text-[11px] text-red-500 font-semibold mt-1">
                  {errors.email}
                </p>
              )}
            </div>

            {/* Phone Number */}
            <div id="field-phone">
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Phone Number <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <Phone className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => {
                    setPhone(e.target.value);
                    if (errors.phone) setErrors(prev => ({ ...prev, phone: '' }));
                  }}
                  placeholder="e.g. +234 801 234 5678"
                  className={`w-full pl-10 pr-4 py-2.5 text-sm bg-slate-50 border ${errors.phone ? 'border-red-400 ring-1 ring-red-300' : 'border-slate-200'} rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-600 focus:outline-none`}
                />
              </div>
              {errors.phone && (
                <p className="text-[11px] text-red-500 font-semibold mt-1">
                  {errors.phone}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* SECTION 6 — ADDITIONAL REQUIREMENTS */}
        {/* ========================================================================= */}
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/80 shadow-xs space-y-6">
          <div className="flex items-center gap-3 pb-3 border-b border-slate-100">
            <span className="w-7 h-7 rounded-xl bg-blue-600 text-white font-black text-xs flex items-center justify-center shadow-xs">
              6
            </span>
            <div>
              <h2 className="text-base font-bold text-slate-900">Additional Instructions</h2>
              <p className="text-xs text-slate-500">
                Any other preferences, deadlines, target hosting, or specific technical notes.
              </p>
            </div>
          </div>

          <div>
            <textarea
              rows={3}
              value={additionalInstructions}
              onChange={(e) => setAdditionalInstructions(e.target.value)}
              placeholder="Tell us anything else you want us to know about your website..."
              className="w-full p-4 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-600 focus:outline-none transition-all leading-relaxed"
            />
          </div>
        </div>

        {/* ========================================================================= */}
        {/* ORDER SUMMARY & SUBMIT */}
        {/* ========================================================================= */}
        <div className="bg-gradient-to-br from-slate-900 via-slate-900 to-blue-950 rounded-3xl p-6 sm:p-8 text-white shadow-xl space-y-6 border border-slate-800">
          <div className="flex items-center justify-between pb-4 border-b border-slate-800">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-blue-600/30 border border-blue-500/40 flex items-center justify-center text-blue-400">
                <FileText className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">Order Summary</h3>
                <span className="text-xs text-slate-400">Custom Website Development</span>
              </div>
            </div>

            <div className="text-right">
              <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">Base Estimate</span>
              <span className="text-xl sm:text-2xl font-black text-emerald-400">
                ₦{BASE_PRICE.toLocaleString()}
              </span>
            </div>
          </div>

          {/* Live Summary Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div className="p-3.5 bg-slate-800/60 rounded-xl border border-slate-700/60 space-y-1">
              <span className="text-slate-400 block text-[10px] uppercase tracking-wider">Website Name</span>
              <span className="font-bold text-white truncate block">
                {websiteName.trim() || <em className="text-slate-500 font-normal">Not entered yet</em>}
              </span>
            </div>

            <div className="p-3.5 bg-slate-800/60 rounded-xl border border-slate-700/60 space-y-1">
              <span className="text-slate-400 block text-[10px] uppercase tracking-wider">Website Type</span>
              <span className="font-bold text-blue-300">
                {websiteType === 'Other' ? (websiteTypeOther || 'Other') : websiteType}
              </span>
            </div>

            <div className="p-3.5 bg-slate-800/60 rounded-xl border border-slate-700/60 space-y-1">
              <span className="text-slate-400 block text-[10px] uppercase tracking-wider">Website Logo</span>
              {logo ? (
                <div className="flex items-center gap-2 pt-0.5">
                  <img src={logo.dataUrl} alt="Logo" className="w-6 h-6 object-contain rounded bg-black/40 border border-slate-700 p-0.5" />
                  <span className="font-medium text-slate-200 truncate">{logo.name}</span>
                </div>
              ) : (
                <span className="text-slate-500">None attached</span>
              )}
            </div>

            <div className="p-3.5 bg-slate-800/60 rounded-xl border border-slate-700/60 space-y-1">
              <span className="text-slate-400 block text-[10px] uppercase tracking-wider">Reference Website</span>
              <span className="font-mono text-slate-200 truncate block">
                {referenceWebsite.trim() || <span className="text-slate-500 font-sans">None provided</span>}
              </span>
            </div>
          </div>

          {/* Selected Features Chips */}
          <div className="p-3.5 bg-slate-800/40 rounded-xl border border-slate-700/40 space-y-2">
            <div className="flex items-center justify-between text-[11px]">
              <span className="text-slate-400 font-bold uppercase tracking-wider">Selected Features ({selectedFeatures.length})</span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {selectedFeatures.length === 0 ? (
                <span className="text-xs text-slate-500">No features selected</span>
              ) : (
                selectedFeatures.map((f, idx) => (
                  <span key={idx} className="px-2.5 py-1 bg-slate-800 border border-slate-700 text-blue-200 rounded-lg text-[11px] font-medium">
                    ✓ {f === 'Other' && otherFeatureText ? `Other: ${otherFeatureText}` : f}
                  </span>
                ))
              )}
            </div>
          </div>

          {/* Additional Requirements Preview */}
          {additionalInstructions.trim() && (
            <div className="p-3.5 bg-slate-800/40 rounded-xl border border-slate-700/40 text-xs">
              <span className="text-slate-400 font-bold uppercase tracking-wider block mb-1 text-[10px]">Additional Requirements</span>
              <p className="text-slate-300 italic line-clamp-2 leading-relaxed">
                "{additionalInstructions.trim()}"
              </p>
            </div>
          )}

          {/* Submit Action */}
          <div className="pt-2 space-y-3">
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-4 bg-blue-600 hover:bg-blue-500 active:bg-blue-700 disabled:opacity-50 text-white font-extrabold text-sm sm:text-base rounded-2xl shadow-lg hover:shadow-xl transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              {isSubmitting ? (
                <>
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  <span>Submitting Custom Website Request...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-5 h-5" />
                  <span>Submit Custom Website Request</span>
                </>
              )}
            </button>

            <div className="flex items-center justify-center gap-4 text-[11px] text-slate-400 text-center">
              <span className="flex items-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                Verified Request Handling
              </span>
              <span>•</span>
              <span>Fast Engineering Turnaround</span>
              <span>•</span>
              <span>Direct Dashboard Tracking</span>
            </div>
          </div>
        </div>

      </form>
    </div>
  );
};

export default CustomWebsitePage;
