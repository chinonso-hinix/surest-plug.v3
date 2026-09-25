/**
 * Surest Plug - Footer Component
 * Contains working links to About Us, How It Works, Contact, Terms, Privacy, Refund, and floating WhatsApp support.
 */

import React from 'react';

interface FooterProps {
  onNavigate: (route: string) => void;
  onOpenComingSoon: (serviceName: string) => void;
  whatsappNumber?: string;
  whatsappMessage?: string;
}

export const Footer: React.FC<FooterProps> = ({
  onNavigate,
  onOpenComingSoon,
  whatsappNumber = '+2348000000000',
  whatsappMessage = 'Hello Surest Plug, I need assistance with my account / order.'
}) => {
  return (
    <footer className="bg-slate-900 text-slate-300 pt-16 pb-10 border-t border-slate-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-10 pb-12 border-b border-slate-800">
          
          {/* Brand Column */}
          <div className="lg:col-span-2 space-y-4">
            <div className="flex items-center gap-3">
              <img 
                src="https://www.image2url.com/r2/default/images/1787828243533-7b9f3864-3fef-41b2-84e9-a00088ba5494.jpg" 
                alt="Surest Plug" 
                className="h-10 w-10 rounded-full object-cover shadow-xs ring-1 ring-blue-400/30"
                onError={(e) => {
                  (e.target as HTMLImageElement).src = '/sp-logo.png';
                }}
              />
              <span className="text-2xl font-extrabold tracking-tight text-white">
                Surest<span className="text-blue-500">Plug</span>
              </span>
            </div>
            <p className="text-slate-400 text-sm leading-relaxed max-w-sm">
              Your Plug for Websites, Social Media & Digital Services. Premium ready-made websites, custom digital development, and social media growth tools designed for modern creators and enterprises.
            </p>
            <div className="flex items-center gap-4 text-xs text-slate-400 pt-2">
              <span className="inline-flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
                100% Secure System
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-blue-400"></span>
                Fast Delivery
              </span>
            </div>
          </div>

          {/* Marketplace Column */}
          <div className="space-y-3">
            <h4 className="text-white font-semibold text-sm tracking-wider uppercase">Marketplace</h4>
            <ul className="space-y-2.5 text-sm">
              <li>
                <button 
                  onClick={() => onNavigate('marketplace')}
                  className="text-slate-400 hover:text-white transition-colors cursor-pointer text-left"
                >
                  Ready-Made Websites
                </button>
              </li>
              <li>
                <button 
                  onClick={() => onNavigate('custom-website')}
                  className="text-slate-400 hover:text-white transition-colors cursor-pointer text-left"
                >
                  Custom Websites
                </button>
              </li>
              <li>
                <button 
                  onClick={() => onNavigate('boosting')}
                  className="text-slate-400 hover:text-white transition-colors cursor-pointer text-left"
                >
                  Boost Account
                </button>
              </li>
              <li>
                <button 
                  onClick={() => onNavigate('international-numbers')}
                  className="text-slate-400 hover:text-white transition-colors cursor-pointer text-left"
                >
                  <span>International Numbers</span>
                </button>
              </li>
              <li>
                <button 
                  onClick={() => onNavigate('social-logs')}
                  className="text-slate-400 hover:text-white transition-colors cursor-pointer text-left"
                >
                  Social Media Accounts/Logs
                </button>
              </li>
            </ul>
          </div>

          {/* Company Column */}
          <div className="space-y-3">
            <h4 className="text-white font-semibold text-sm tracking-wider uppercase">Company</h4>
            <ul className="space-y-2.5 text-sm">
              <li>
                <button 
                  onClick={() => onNavigate('about')}
                  className="text-slate-400 hover:text-white transition-colors cursor-pointer text-left"
                >
                  About Us
                </button>
              </li>
              <li>
                <button 
                  onClick={() => onNavigate('how-it-works')}
                  className="text-slate-400 hover:text-white transition-colors cursor-pointer text-left"
                >
                  How It Works
                </button>
              </li>
              <li>
                <button 
                  onClick={() => onNavigate('contact')}
                  className="text-slate-400 hover:text-white transition-colors cursor-pointer text-left"
                >
                  Contact Us
                </button>
              </li>
            </ul>
          </div>

            {/* Support & Legal Column */}
            <div className="space-y-3">
              <h4 className="text-white font-semibold text-sm tracking-wider uppercase">Support & Legal</h4>
              <ul className="space-y-2.5 text-sm">
                <li>
                  <button 
                    onClick={() => onNavigate('contact')}
                    className="text-slate-400 hover:text-white transition-colors cursor-pointer text-left"
                  >
                    Support Center
                  </button>
                </li>
                <li>
                  <button 
                    onClick={() => onNavigate('terms')}
                    className="text-slate-400 hover:text-white transition-colors cursor-pointer text-left"
                  >
                    Terms & Conditions
                  </button>
                </li>
                <li>
                  <button 
                    onClick={() => onNavigate('privacy')}
                    className="text-slate-400 hover:text-white transition-colors cursor-pointer text-left"
                  >
                    Privacy Policy
                  </button>
                </li>
                <li>
                  <button 
                    onClick={() => onNavigate('refund')}
                    className="text-slate-400 hover:text-white transition-colors cursor-pointer text-left"
                  >
                    Refund Policy
                  </button>
                </li>
              </ul>
            </div>

          </div>

          {/* Social Links Section: "Follow us on" */}
          <div id="footer-social-links" className="py-8 border-b border-slate-800/80 flex flex-col items-center justify-center text-center space-y-3.5">
            <h5 className="text-xs sm:text-sm font-bold text-slate-300 uppercase tracking-widest">
              Follow us on
            </h5>

            <div className="flex items-center justify-center gap-2.5 sm:gap-4 flex-wrap max-w-full">
              {/* YouTube */}
              <a
                href="https://www.youtube.com/channel/UCmTUSMcMhsIhjWdB8Rf2jQA"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 px-3.5 sm:px-4 py-2 sm:py-2.5 rounded-2xl bg-slate-800/90 hover:bg-red-600/20 text-slate-200 hover:text-white border border-slate-700/80 hover:border-red-500/60 transition-all duration-200 group shadow-xs cursor-pointer min-h-[44px]"
                title="Follow Surest Plug on YouTube"
                aria-label="Follow Surest Plug on YouTube"
              >
                <div className="w-6 h-6 rounded-lg bg-red-600/20 text-red-500 flex items-center justify-center group-hover:scale-110 transition-transform">
                  <svg className="w-4 h-4 fill-current text-red-500" viewBox="0 0 24 24">
                    <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
                  </svg>
                </div>
                <span className="text-xs sm:text-sm font-semibold tracking-wide">YouTube</span>
              </a>

              {/* TikTok */}
              <a
                href="https://www.tiktok.com/@surestplug_?is_from_webapp=1&sender_device=pc"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 px-3.5 sm:px-4 py-2 sm:py-2.5 rounded-2xl bg-slate-800/90 hover:bg-slate-700/80 text-slate-200 hover:text-white border border-slate-700/80 hover:border-cyan-400/60 transition-all duration-200 group shadow-xs cursor-pointer min-h-[44px]"
                title="Follow Surest Plug on TikTok"
                aria-label="Follow Surest Plug on TikTok"
              >
                <div className="w-6 h-6 rounded-lg bg-cyan-400/20 text-cyan-400 flex items-center justify-center group-hover:scale-110 transition-transform">
                  <svg className="w-4 h-4 fill-current text-white" viewBox="0 0 24 24">
                    <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64c.298-.002.595.042.88.13V9.4a6.33 6.33 0 0 0-1-.08A6.34 6.34 0 0 0 3 15.66a6.34 6.34 0 0 0 10.82 4.49 6.27 6.27 0 0 0 1.96-4.49V8.82a8.28 8.28 0 0 0 4.81 1.54V6.91a4.85 4.85 0 0 1-1-.22z"/>
                  </svg>
                </div>
                <span className="text-xs sm:text-sm font-semibold tracking-wide">TikTok</span>
              </a>

              {/* WhatsApp */}
              <a
                href="https://whatsapp.com/channel/0029Vb9MaALKrWQxtqam790j"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 px-3.5 sm:px-4 py-2 sm:py-2.5 rounded-2xl bg-slate-800/90 hover:bg-emerald-600/20 text-slate-200 hover:text-white border border-slate-700/80 hover:border-emerald-500/60 transition-all duration-200 group shadow-xs cursor-pointer min-h-[44px]"
                title="Join Surest Plug WhatsApp Channel"
                aria-label="Join Surest Plug WhatsApp Channel"
              >
                <div className="w-6 h-6 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center group-hover:scale-110 transition-transform">
                  <svg className="w-4 h-4 fill-current text-emerald-400" viewBox="0 0 24 24">
                    <path d="M12.031 6.172c-3.181 0-5.767 2.586-5.768 5.766-.001 1.298.38 2.27 1.019 3.287l-.711 2.592 2.654-.696c1.001.597 1.773.854 2.806.854 3.18 0 5.767-2.587 5.768-5.766.001-3.182-2.586-5.767-5.768-5.767zm9.969 5.766c0 5.518-4.482 10-10 10-1.745 0-3.385-.45-4.819-1.238l-5.181 1.358 1.385-5.051c-.867-1.48-1.385-3.21-1.385-5.069 0-5.518 4.482-10 10-10 5.518 0 10 4.482 10 10zm-5.467 3.963c-.22-.11-1.303-.643-1.505-.716-.202-.074-.349-.11-.496.11-.147.22-.57 1.066-.698 1.213-.128.147-.257.165-.477.055-.22-.11-.93-.343-1.771-1.093-.654-.583-1.096-1.303-1.224-1.523-.128-.22-.014-.339.096-.449.099-.099.22-.257.33-.385.11-.128.147-.22.22-.367.073-.147.037-.275-.018-.385-.055-.11-.496-1.194-.679-1.636-.179-.43-.36-.372-.496-.379-.128-.007-.275-.008-.422-.008-.147 0-.385.055-.587.275-.202.22-.771.753-.771 1.836 0 1.083.789 2.129.899 2.276.11.147 1.552 2.37 3.76 3.323.525.227.935.362 1.255.464.527.167 1.007.143 1.386.087.423-.063 1.303-.533 1.486-1.047.183-.514.183-.955.128-1.047-.055-.091-.202-.147-.422-.257z"/>
                  </svg>
                </div>
                <span className="text-xs sm:text-sm font-semibold tracking-wide">WhatsApp</span>
              </a>
            </div>
          </div>

          {/* Bottom Bar */}
          <div className="pt-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500">
            <p>© {new Date().getFullYear()} Surest Plug. All rights reserved.</p>
            <p className="flex items-center gap-2">
              <span>Production Ready</span>
            </p>
          </div>
        </div>
      </footer>
    );
  };

export default Footer;
