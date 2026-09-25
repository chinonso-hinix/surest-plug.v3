/**
 * Surest Plug - Top Service Navigation Component
 * Compact, responsive top navigation bar for the 5 core services:
 * 1. Ready Made Website
 * 2. Custom Website
 * 3. Boost Account
 * 4. Social Media Accounts/Logs
 * 5. International Numbers
 *
 * White and Blue styling, 1-click direct navigation, fully mobile-responsive without horizontal overflow.
 */

import React from 'react';

interface TopServiceNavProps {
  currentRoute: string;
  onNavigate: (route: string, params?: any) => void;
  onOpenComingSoon: (serviceName: string) => void;
}

export const TopServiceNav: React.FC<TopServiceNavProps> = ({
  currentRoute,
  onNavigate,
  onOpenComingSoon,
}) => {
  const isReadyMade = currentRoute === 'marketplace';
  const isCustom = currentRoute === 'custom-website';
  const isBoosting = currentRoute === 'boosting';
  const isSocialLogs = currentRoute === 'social-logs' || currentRoute === 'logs' || currentRoute === 'accounts';
  const isInternationalNumbers = currentRoute === 'international-numbers' || currentRoute === 'numbers' || currentRoute === 'otp';

  return (
    <div className="w-full bg-white border-b border-slate-200/80 relative z-10">
      <div className="max-w-7xl mx-auto px-2.5 sm:px-6 lg:px-8 py-2 sm:py-2.5">
        {/* Mobile: 2-column responsive grid with 5th item spanning full width; Desktop: Clean 5-item horizontal flex row */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:flex lg:items-center lg:justify-center gap-1.5 sm:gap-2 lg:gap-2.5">
          
          {/* 1. Ready Made Website */}
          <button
            type="button"
            onClick={() => onNavigate('marketplace')}
            className={`flex items-center justify-center gap-1.5 px-2.5 sm:px-3.5 py-1.5 sm:py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all duration-200 cursor-pointer text-center whitespace-nowrap min-w-0 ${
              isReadyMade
                ? 'bg-blue-600 text-white shadow-xs font-bold'
                : 'bg-slate-50 hover:bg-blue-50 text-slate-700 hover:text-blue-700 border border-slate-200/70 hover:border-blue-200'
            }`}
            title="Ready Made Websites Catalog"
          >
            <span className="w-2 h-2 rounded-full bg-blue-400 shrink-0 hidden xs:inline-block"></span>
            <span className="truncate">Ready Made Website</span>
          </button>

          {/* 2. Custom Website */}
          <button
            type="button"
            onClick={() => onNavigate('custom-website')}
            className={`flex items-center justify-center gap-1.5 px-2.5 sm:px-3.5 py-1.5 sm:py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all duration-200 cursor-pointer text-center whitespace-nowrap min-w-0 ${
              isCustom
                ? 'bg-blue-600 text-white shadow-xs font-bold'
                : 'bg-slate-50 hover:bg-blue-50 text-slate-700 hover:text-blue-700 border border-slate-200/70 hover:border-blue-200'
            }`}
            title="Custom Website Requests"
          >
            <span className="w-2 h-2 rounded-full bg-indigo-400 shrink-0 hidden xs:inline-block"></span>
            <span className="truncate">Custom Website</span>
          </button>

          {/* 3. Boost Account */}
          <button
            type="button"
            onClick={() => onNavigate('boosting')}
            className={`flex items-center justify-center gap-1.5 px-2.5 sm:px-3.5 py-1.5 sm:py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all duration-200 cursor-pointer text-center whitespace-nowrap min-w-0 ${
              isBoosting
                ? 'bg-blue-600 text-white shadow-xs font-bold'
                : 'bg-slate-50 hover:bg-blue-50 text-slate-700 hover:text-blue-700 border border-slate-200/70 hover:border-blue-200'
            }`}
            title="Social Media Account Boosting"
          >
            <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0 hidden xs:inline-block"></span>
            <span className="truncate">Boost Account</span>
          </button>

          {/* 4. Social Media Accounts/Logs */}
          <button
            type="button"
            onClick={() => onNavigate('social-logs')}
            className={`flex items-center justify-center gap-1.5 px-2.5 sm:px-3.5 py-1.5 sm:py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all duration-200 cursor-pointer text-center whitespace-nowrap min-w-0 ${
              isSocialLogs
                ? 'bg-blue-600 text-white shadow-xs font-bold'
                : 'bg-slate-50 hover:bg-blue-50 text-slate-700 hover:text-blue-700 border border-slate-200/70 hover:border-blue-200'
            }`}
            title="Social Media Accounts & Logs"
          >
            <span className="w-2 h-2 rounded-full bg-cyan-400 shrink-0 hidden xs:inline-block"></span>
            <span className="truncate">Social Media Accounts/Logs</span>
          </button>

          {/* 5. International Numbers */}
          <button
            type="button"
            onClick={() => onNavigate('international-numbers')}
            className={`col-span-2 sm:col-span-1 lg:col-auto flex items-center justify-center gap-1.5 px-2.5 sm:px-3.5 py-1.5 sm:py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all duration-200 cursor-pointer text-center whitespace-nowrap min-w-0 ${
              isInternationalNumbers
                ? 'bg-blue-600 text-white shadow-xs font-bold'
                : 'bg-slate-50 hover:bg-blue-50 text-slate-700 hover:text-blue-700 border border-slate-200/70 hover:border-blue-200'
            }`}
            title="International Virtual & OTP Numbers"
          >
            <span className="w-2 h-2 rounded-full bg-amber-400 shrink-0 hidden xs:inline-block"></span>
            <span className="truncate">International Numbers</span>
            <span className={`text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-full shrink-0 ml-0.5 ${
              isInternationalNumbers ? 'bg-blue-800 text-white' : 'bg-emerald-100 text-emerald-800'
            }`}>Live</span>
          </button>

        </div>
      </div>
    </div>
  );
};

export default TopServiceNav;
