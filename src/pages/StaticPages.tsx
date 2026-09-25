/**
 * Surest Plug - Static & Legal Pages
 * - About Us
 * - How It Works
 * - Contact Us
 * - Terms & Conditions
 * - Privacy Policy
 * - Refund Policy
 */

import React, { useState } from 'react';

interface StaticPagesProps {
  pageType: 'about' | 'how-it-works' | 'contact' | 'terms' | 'privacy' | 'refund';
  onNavigate: (route: string) => void;
  onOpenComingSoon: (service: string) => void;
  whatsappNumber?: string;
  whatsappMessage?: string;
}

export const StaticPage: React.FC<StaticPagesProps> = ({
  pageType,
  onNavigate,
  onOpenComingSoon,
  whatsappNumber = '+2348141853557',
  whatsappMessage = 'Hello Surest Plug Support, I need assistance with my account / order.'
}) => {
  const [contactSubmitted, setContactSubmitted] = useState(false);
  const [cName, setCName] = useState('');
  const [cEmail, setCEmail] = useState('');
  const [cMsg, setCMsg] = useState('');

  const cleanWhatsappNumber = (whatsappNumber || '+2348141853557').replace(/[^0-9]/g, '');
  const whatsappUrl = `https://wa.me/${cleanWhatsappNumber}?text=${encodeURIComponent(whatsappMessage)}`;

  const handleContactSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setContactSubmitted(true);
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12 pb-24">
      
      {/* ABOUT US */}
      {pageType === 'about' && (
        <div className="space-y-8">
          <div className="text-center space-y-3">
            <span className="text-xs font-bold text-blue-600 uppercase tracking-wider bg-blue-50 px-3 py-1 rounded-full">
              Our Vision & Identity
            </span>
            <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
              About Surest Plug
            </h1>
            <p className="text-slate-600 text-sm sm:text-base max-w-2xl mx-auto">
              Your comprehensive digital marketplace for production-grade websites, custom development, and reliable social media growth.
            </p>
          </div>

          <div className="bg-white rounded-3xl p-8 sm:p-10 border border-slate-200/80 shadow-xl space-y-6 text-slate-700 text-sm sm:text-base leading-relaxed">
            <p>
              <strong>Surest Plug</strong> was founded with a single mission: to eliminate the friction in acquiring high-quality digital assets and growth services. Whether you are an entrepreneur launching a new brand, a developer looking for battle-tested codebase architectures, or a content creator seeking organic-style social media reach, Surest Plug is your ultimate hub.
            </p>

            <h3 className="text-lg font-bold text-slate-900 pt-2">What Sets Us Apart?</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                <div className="font-bold text-blue-600 mb-1">Instant Source Code Access</div>
                <p className="text-xs text-slate-600">Every ready-made website in our catalog comes with clean, well-commented code that is instantly available upon purchase.</p>
              </div>

              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                <div className="font-bold text-indigo-600 mb-1">Bespoke Engineering</div>
                <p className="text-xs text-slate-600">Our custom development portal allows you to submit exact requirements and receive tailored, scalable platforms.</p>
              </div>

              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                <div className="font-bold text-emerald-600 mb-1">Secure Automated SMM</div>
                <p className="text-xs text-slate-600">Integrated directly with high-speed automated network delivery. We never ask for your account password.</p>
              </div>

              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                <div className="font-bold text-purple-600 mb-1">Server-Side Security</div>
                <p className="text-xs text-slate-600">Built on robust PHP & MySQL database architecture with CSRF tokens and audited balance ledgers.</p>
              </div>
            </div>

            <div className="pt-6 border-t border-slate-100 flex items-center justify-between">
              <button 
                onClick={() => onNavigate('marketplace')}
                className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm rounded-xl shadow-md cursor-pointer"
              >
                Browse Marketplace →
              </button>
              <button 
                onClick={() => onNavigate('contact')}
                className="text-sm font-semibold text-slate-600 hover:text-blue-600 cursor-pointer"
              >
                Contact Support
              </button>
            </div>
          </div>
        </div>
      )}

      {/* HOW IT WORKS */}
      {pageType === 'how-it-works' && (
        <div className="space-y-8">
          <div className="text-center space-y-3">
            <span className="text-xs font-bold text-blue-600 uppercase tracking-wider bg-blue-50 px-3 py-1 rounded-full">
              Step-by-Step Guide
            </span>
            <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
              How Surest Plug Works
            </h1>
            <p className="text-slate-600 text-sm sm:text-base max-w-2xl mx-auto">
              Getting started on Surest Plug takes less than two minutes. Follow these simple steps.
            </p>
          </div>

          <div className="bg-white rounded-3xl p-8 sm:p-10 border border-slate-200/80 shadow-xl space-y-8">
            
            {/* Step 1 */}
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-2xl bg-blue-600 text-white font-black flex items-center justify-center shrink-0 text-sm">
                1
              </div>
              <div className="space-y-1">
                <h3 className="text-lg font-bold text-slate-900">Create an Account & Fund Your Wallet</h3>
                <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                  Sign up for free in seconds. Navigate to your wallet and submit a bank transfer deposit. Once approved by our team, your wallet balance will be ready to spend immediately.
                </p>
              </div>
            </div>

            {/* Step 2 */}
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-2xl bg-indigo-600 text-white font-black flex items-center justify-center shrink-0 text-sm">
                2
              </div>
              <div className="space-y-1">
                <h3 className="text-lg font-bold text-slate-900">Select Your Digital Service</h3>
                <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                  Choose between <strong>Ready-Made Websites</strong> with instant delivery, submit a <strong>Custom Website Request</strong> with exact technical specs, or order <strong>SMM Account Boosting</strong>.
                </p>
              </div>
            </div>

            {/* Step 3 */}
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-2xl bg-emerald-600 text-white font-black flex items-center justify-center shrink-0 text-sm">
                3
              </div>
              <div className="space-y-1">
                <h3 className="text-lg font-bold text-slate-900">Instant Order Processing & Tracking</h3>
                <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                  Your purchase is logged with an immutable reference code in your dashboard. You can download project files, track custom order status, and view real-time delivery updates.
                </p>
              </div>
            </div>

            <div className="pt-6 border-t border-slate-100 flex justify-center">
              <button 
                onClick={() => onNavigate('register')}
                className="px-8 py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm rounded-xl shadow-md cursor-pointer"
              >
                Get Started Now
              </button>
            </div>

          </div>
        </div>
      )}

      {/* CONTACT US */}
      {pageType === 'contact' && (
        <div className="space-y-8">
          <div className="text-center space-y-3">
            <span className="text-xs font-bold text-blue-600 uppercase tracking-wider bg-blue-50 px-3 py-1 rounded-full">
              24/7 Customer Care
            </span>
            <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
              Contact Surest Plug
            </h1>
            <p className="text-slate-600 text-sm sm:text-base max-w-2xl mx-auto">
              Need assistance with an order, custom development, or wallet deposit? Send us a message or chat with us directly on WhatsApp.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            
            {/* Quick Contact Cards */}
            <div className="space-y-4">
              <div 
                onClick={() => window.open('https://wa.link/qfxlbm', '_blank', 'noopener,noreferrer')}
                className="p-6 bg-white rounded-3xl border border-slate-200/80 shadow-xs hover:shadow-md hover:border-emerald-300 transition-all cursor-pointer group"
              >
                <div className="flex items-center justify-between">
                  <div className="text-2xl">💬</div>
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-emerald-50 text-emerald-700 border border-emerald-200/60">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                    Direct DM
                  </span>
                </div>
                <h4 className="font-bold text-slate-900 text-sm mt-3 group-hover:text-emerald-700 transition-colors">WhatsApp Support</h4>
                <p className="text-xs text-slate-500 mt-1">Instant support on WhatsApp</p>
                <a 
                  href="https://wa.link/qfxlbm" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  onClick={(e) => e.stopPropagation()}
                  className="mt-3 inline-flex items-center gap-1 text-xs font-bold text-emerald-600 hover:text-emerald-700 hover:underline"
                >
                  <span>Open WhatsApp Support ↗</span>
                </a>
              </div>

              <div className="p-6 bg-white rounded-3xl border border-slate-200/80 shadow-xs">
                <div className="text-2xl mb-2">📧</div>
                <h4 className="font-bold text-slate-900 text-sm">Email Inquiries</h4>
                <p className="text-xs text-slate-500 mt-1">support@surestplug.com</p>
                <span className="text-[11px] text-slate-400 mt-1 block">Response within 2 hours</span>
              </div>
            </div>

            {/* Form */}
            <div className="md:col-span-2 bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/80 shadow-xl">
              {contactSubmitted ? (
                <div className="p-8 text-center space-y-3">
                  <div className="w-12 h-12 rounded-full bg-emerald-50 text-emerald-600 mx-auto flex items-center justify-center font-bold text-xl">
                    ✓
                  </div>
                  <h3 className="text-lg font-bold text-slate-900">Message Received!</h3>
                  <p className="text-xs text-slate-600">Thank you for reaching out. Our support team will reply via email shortly.</p>
                  <button 
                    onClick={() => setContactSubmitted(false)}
                    className="px-4 py-2 bg-slate-100 text-slate-700 text-xs font-semibold rounded-xl"
                  >
                    Send Another Message
                  </button>
                </div>
              ) : (
                <form onSubmit={handleContactSubmit} className="space-y-4">
                  <h3 className="text-base font-bold text-slate-900">Send an Inquiry</h3>
                  
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Your Name *</label>
                    <input 
                      type="text" 
                      required
                      value={cName}
                      onChange={(e) => setCName(e.target.value)}
                      placeholder="John Doe"
                      className="w-full px-4 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-600"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Email Address *</label>
                    <input 
                      type="email" 
                      required
                      value={cEmail}
                      onChange={(e) => setCEmail(e.target.value)}
                      placeholder="john@example.com"
                      className="w-full px-4 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-600"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Message *</label>
                    <textarea 
                      required
                      rows={4}
                      value={cMsg}
                      onChange={(e) => setCMsg(e.target.value)}
                      placeholder="How can we assist you today?"
                      className="w-full px-4 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-600"
                    />
                  </div>

                  <button
                    type="submit"
                    className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-md cursor-pointer"
                  >
                    Submit Inquiry
                  </button>
                </form>
              )}
            </div>

          </div>
        </div>
      )}

      {/* TERMS & CONDITIONS */}
      {pageType === 'terms' && (
        <div className="space-y-8 bg-white p-8 sm:p-12 rounded-3xl border border-slate-200 shadow-xl text-slate-700 text-sm leading-relaxed">
          <h1 className="text-3xl font-extrabold text-slate-900">Terms & Conditions</h1>
          <p className="text-xs text-slate-400">Last Updated: {new Date().toLocaleDateString()}</p>
          
          <div className="space-y-4">
            <h3 className="text-base font-bold text-slate-900">1. Acceptance of Terms</h3>
            <p>By accessing Surest Plug, creating an account, or purchasing digital assets and services, you agree to be bound by these Terms and Conditions.</p>

            <h3 className="text-base font-bold text-slate-900">2. Digital Products License</h3>
            <p>Purchases of ready-made websites grant the buyer a non-exclusive license to use, modify, and host the software for personal or commercial projects. Redistribution or reselling of the raw codebase is strictly prohibited.</p>

            <h3 className="text-base font-bold text-slate-900">3. Social Media Services (SMM)</h3>
            <p>Surest Plug acts as an automated gateway for social media boosting. We never request passwords. Users must ensure target account profiles are set to public during delivery.</p>

            <h3 className="text-base font-bold text-slate-900">4. Wallet & Payments</h3>
            <p>Wallet funds are denominated in Nigerian Naira (₦). Deposits must be verified with genuine transaction references before funds are unlocked.</p>
          </div>
        </div>
      )}

      {/* PRIVACY POLICY */}
      {pageType === 'privacy' && (
        <div className="space-y-8 bg-white p-8 sm:p-12 rounded-3xl border border-slate-200 shadow-xl text-slate-700 text-sm leading-relaxed">
          <h1 className="text-3xl font-extrabold text-slate-900">Privacy Policy</h1>
          <p className="text-xs text-slate-400">Last Updated: {new Date().toLocaleDateString()}</p>
          
          <div className="space-y-4">
            <h3 className="text-base font-bold text-slate-900">1. Information We Collect</h3>
            <p>We collect your full name, email address, optional telephone number, and order transactions necessary to provide and secure your account.</p>

            <h3 className="text-base font-bold text-slate-900">2. Data Security & Storage</h3>
            <p>All passwords are encrypted with bcrypt hashing algorithms. Sensitive API keys and authentication tokens are kept strictly server-side.</p>

            <h3 className="text-base font-bold text-slate-900">3. Third-Party Sharing</h3>
            <p>We do not sell, rent, or trade your personal information with any marketing companies.</p>
          </div>
        </div>
      )}

      {/* REFUND POLICY */}
      {pageType === 'refund' && (
        <div className="space-y-8 bg-white p-8 sm:p-12 rounded-3xl border border-slate-200 shadow-xl text-slate-700 text-sm leading-relaxed">
          <h1 className="text-3xl font-extrabold text-slate-900">Refund Policy</h1>
          <p className="text-xs text-slate-400">Last Updated: {new Date().toLocaleDateString()}</p>
          
          <div className="space-y-4">
            <h3 className="text-base font-bold text-slate-900">1. Digital Products Policy</h3>
            <p>Due to the nature of downloadable source code, refunds for ready-made websites are issued only if the file is proven defective or completely non-functional after support review.</p>

            <h3 className="text-base font-bold text-slate-900">2. SMM Boosting Orders</h3>
            <p>If an SMM boosting order fails to start or encounters an automated drop beyond warranty, funds will be refunded back to your Surest Plug wallet balance.</p>

            <h3 className="text-base font-bold text-slate-900">3. Wallet Balances</h3>
            <p>Unspent wallet balances may be refunded back to the originating bank account upon manual identity verification with support.</p>
          </div>
        </div>
      )}

    </div>
  );
};

export default StaticPage;
