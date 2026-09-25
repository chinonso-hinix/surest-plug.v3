/**
 * Surest Plug - Homepage Component
 * Visual design matches brand guidelines:
 * Blue & White color scheme, Hero section, 5 Category Cards, Featured Products from DB, Clean Spacing
 * Features IntersectionObserver scroll entrance animations with alternating left/right/up trajectories
 */

import React, { useState } from 'react';
import { Product, User } from '../types';
import { ScrollReveal } from '../components/ScrollReveal';

interface HomePageProps {
  products: Product[];
  currentUser: User | null;
  onNavigate: (route: string, params?: any) => void;
  onOpenComingSoon: (serviceName: string) => void;
  onQuickBuy: (product: Product) => void;
}

export const HomePage: React.FC<HomePageProps> = ({
  products,
  currentUser,
  onNavigate,
  onOpenComingSoon,
  onQuickBuy
}) => {
  return (
    <div className="w-full min-h-screen bg-slate-50">
      {/* Main Content Layer */}
      <div className="bg-slate-50 pt-8 sm:pt-12 pb-20 space-y-16 sm:space-y-24">
        
        {/* Five Marketplace Categories Section */}
        <section className="max-w-7xl mx-auto px-3.5 sm:px-6 lg:px-8">
          <ScrollReveal direction="up">
            <div className="text-center max-w-2xl mx-auto mb-8 sm:mb-14">
              <h2 className="text-xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
                Explore Marketplace Services
              </h2>
              <p className="text-slate-500 text-xs sm:text-base mt-1.5 sm:mt-2">
                Select a service category below to browse catalog or make real-time service requests.
              </p>
            </div>
          </ScrollReveal>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5 sm:gap-5">
            
            {/* 1. Ready-Made Websites */}
            <ScrollReveal direction="up" delay={0}>
              <div 
                onClick={() => onNavigate('marketplace')}
                className="h-full group relative bg-white p-4.5 sm:p-6 rounded-2xl sm:rounded-3xl border border-slate-200/80 shadow-xs hover:shadow-xl hover:border-blue-300 transition-all duration-300 transform hover:-translate-y-1 cursor-pointer flex flex-col justify-between text-left"
              >
                <div>
                  <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center mb-4 sm:mb-5 group-hover:scale-110 group-hover:bg-blue-600 group-hover:text-white transition-all shadow-xs">
                    <svg className="w-6 h-6 sm:w-7 sm:h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                  </div>
                  <span className="inline-flex items-center whitespace-nowrap text-[10px] font-bold uppercase tracking-wider text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full mb-1.5 sm:mb-2">
                    Available Now
                  </span>
                  <h3 className="text-base sm:text-lg font-bold text-slate-900 group-hover:text-blue-600 transition-colors">
                    Ready-Made Websites
                  </h3>
                  <p className="text-slate-500 text-xs mt-1.5 leading-relaxed">
                    Browse tested, production-grade websites ready for instant purchase and live hosting.
                  </p>
                </div>
                <div className="pt-4 sm:pt-5 flex items-center text-xs font-semibold text-blue-600 group-hover:translate-x-1 transition-transform">
                  <span className="whitespace-nowrap">Browse Catalog</span>
                  <svg className="w-4 h-4 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
                  </svg>
                </div>
              </div>
            </ScrollReveal>

            {/* 2. Custom Websites */}
            <ScrollReveal direction="up" delay={80}>
              <div 
                onClick={() => onNavigate('custom-website')}
                className="h-full group relative bg-white p-4.5 sm:p-6 rounded-2xl sm:rounded-3xl border border-slate-200/80 shadow-xs hover:shadow-xl hover:border-indigo-300 transition-all duration-300 transform hover:-translate-y-1 cursor-pointer flex flex-col justify-between text-left"
              >
                <div>
                  <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center mb-4 sm:mb-5 group-hover:scale-110 group-hover:bg-indigo-600 group-hover:text-white transition-all shadow-xs">
                    <svg className="w-6 h-6 sm:w-7 sm:h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
                    </svg>
                  </div>
                  <span className="inline-flex items-center whitespace-nowrap text-[10px] font-bold uppercase tracking-wider text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-full mb-1.5 sm:mb-2">
                    Custom Orders
                  </span>
                  <h3 className="text-base sm:text-lg font-bold text-slate-900 group-hover:text-indigo-600 transition-colors">
                    Custom Websites
                  </h3>
                  <p className="text-slate-500 text-xs mt-1.5 leading-relaxed">
                    Submit specific technical requirements and receive a tailor-made web platform.
                  </p>
                </div>
                <div className="pt-4 sm:pt-5 flex items-center text-xs font-semibold text-indigo-600 group-hover:translate-x-1 transition-transform">
                  <span className="whitespace-nowrap">Request Quote</span>
                  <svg className="w-4 h-4 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
                  </svg>
                </div>
              </div>
            </ScrollReveal>

            {/* 3. Boost Account */}
            <ScrollReveal direction="up" delay={160}>
              <div 
                onClick={() => onNavigate('boosting')}
                className="h-full group relative bg-white p-4.5 sm:p-6 rounded-2xl sm:rounded-3xl border border-slate-200/80 shadow-xs hover:shadow-xl hover:border-emerald-300 transition-all duration-300 transform hover:-translate-y-1 cursor-pointer flex flex-col justify-between text-left"
              >
                <div>
                  <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center mb-4 sm:mb-5 group-hover:scale-110 group-hover:bg-emerald-600 group-hover:text-white transition-all shadow-xs">
                    <svg className="w-6 h-6 sm:w-7 sm:h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                    </svg>
                  </div>
                  <span className="inline-flex items-center whitespace-nowrap text-[10px] font-bold uppercase tracking-wider text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full mb-1.5 sm:mb-2">
                    Instant Fulfillment
                  </span>
                  <h3 className="text-base sm:text-lg font-bold text-slate-900 group-hover:text-emerald-600 transition-colors">
                    Boost Account
                  </h3>
                  <p className="text-slate-500 text-xs mt-1.5 leading-relaxed">
                    Real social media growth across Instagram, TikTok, YouTube, X, and Telegram.
                  </p>
                </div>
                <div className="pt-4 sm:pt-5 flex items-center text-xs font-semibold text-emerald-600 group-hover:translate-x-1 transition-transform">
                  <span className="whitespace-nowrap">Start Boosting</span>
                  <svg className="w-4 h-4 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
                  </svg>
                </div>
              </div>
            </ScrollReveal>

            {/* 4. International Numbers */}
            <ScrollReveal direction="up" delay={240}>
              <div 
                onClick={() => onNavigate('international-numbers')}
                className="h-full group relative bg-white p-4.5 sm:p-6 rounded-2xl sm:rounded-3xl border border-slate-200/80 shadow-xs hover:shadow-xl hover:border-amber-300 transition-all duration-300 transform hover:-translate-y-1 cursor-pointer flex flex-col justify-between text-left"
              >
                <div>
                  <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center mb-4 sm:mb-5 group-hover:scale-110 group-hover:bg-amber-600 group-hover:text-white transition-all shadow-xs">
                    <svg className="w-6 h-6 sm:w-7 sm:h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                    </svg>
                  </div>
                  <span className="inline-flex items-center whitespace-nowrap text-[10px] font-bold uppercase tracking-wider text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full mb-1.5 sm:mb-2">
                    Instant OTP Delivery
                  </span>
                  <h3 className="text-base sm:text-lg font-bold text-slate-900 group-hover:text-amber-600 transition-colors">
                    International Numbers
                  </h3>
                  <p className="text-slate-500 text-xs mt-1.5 leading-relaxed">
                    Virtual numbers for instant SMS & OTP verification across WhatsApp, Telegram, Google, and more.
                  </p>
                </div>
                <div className="pt-4 sm:pt-5 flex items-center text-xs font-semibold text-amber-600 group-hover:translate-x-1 transition-transform">
                  <span className="whitespace-nowrap">Get Virtual Number</span>
                  <svg className="w-4 h-4 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
                  </svg>
                </div>
              </div>
            </ScrollReveal>

            {/* 5. Social Media Accounts & Logins (Active - Powered by Cartlogs) */}
            <ScrollReveal direction="up" delay={320}>
              <div 
                onClick={() => onNavigate('social-logs')}
                className="h-full group relative bg-white p-4.5 sm:p-6 rounded-2xl sm:rounded-3xl border border-slate-200/80 shadow-xs hover:shadow-xl hover:border-cyan-300 transition-all duration-300 transform hover:-translate-y-1 cursor-pointer flex flex-col justify-between text-left"
              >
                <div>
                  <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-cyan-50 text-cyan-600 flex items-center justify-center mb-4 sm:mb-5 group-hover:scale-110 group-hover:bg-cyan-600 group-hover:text-white transition-all shadow-xs">
                    <svg className="w-6 h-6 sm:w-7 sm:h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                    </svg>
                  </div>
                  <span className="inline-flex items-center whitespace-nowrap text-[10px] font-bold uppercase tracking-wider text-cyan-600 bg-cyan-50 px-2 py-0.5 rounded-full mb-1.5 sm:mb-2">
                    Instant Delivery
                  </span>
                  <h3 className="text-base sm:text-lg font-bold text-slate-900 group-hover:text-cyan-600 transition-colors">
                    Social Accounts & Logs
                  </h3>
                  <p className="text-slate-500 text-xs mt-1.5 leading-relaxed">
                    Aged, verified, and high-trust social media accounts with instant encrypted credential delivery.
                  </p>
                </div>
                <div className="pt-4 sm:pt-5 flex items-center text-xs font-semibold text-cyan-600 group-hover:translate-x-1 transition-transform">
                  <span className="whitespace-nowrap">Browse Accounts</span>
                  <svg className="w-4 h-4 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
                  </svg>
                </div>
              </div>
            </ScrollReveal>

          </div>
        </section>

        {/* Trust Banner / Security Guarantee */}
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <ScrollReveal direction="up">
            <div className="bg-gradient-to-r from-blue-950 via-slate-900 to-indigo-950 rounded-3xl p-8 sm:p-12 text-white shadow-xl relative overflow-hidden flex flex-col md:flex-row items-center justify-between gap-8 border border-slate-800/80">
              <div className="space-y-3 text-center md:text-left z-10 max-w-xl">
                <span className="px-3 py-1 bg-blue-500/20 text-blue-300 text-xs font-bold rounded-full border border-blue-400/30">
                  Enterprise Digital Infrastructure
                </span>
                <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
                  Verified Digital Assets & Instant Automated Delivery
                </h2>
                <p className="text-slate-300 text-sm leading-relaxed">
                  Every ready-made source code package is pre-audited, security-scanned, and prepared for instant deployment. Growth solutions and custom development requests are dispatched through dedicated high-speed infrastructure.
                </p>
              </div>
              
              <div className="flex flex-col sm:flex-row items-center gap-3 z-10 w-full sm:w-auto">
                <button
                  type="button"
                  onClick={() => onNavigate('marketplace')}
                  className="w-full sm:w-auto px-6 py-3.5 bg-blue-600 hover:bg-blue-500 active:bg-blue-700 text-white font-bold text-sm rounded-2xl shadow-lg transition-all cursor-pointer text-center whitespace-nowrap"
                >
                  Explore Solutions
                </button>
              </div>
            </div>
          </ScrollReveal>
        </section>

      </div>
    </div>
  );
};

export default HomePage;
