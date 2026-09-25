import React, { useState } from 'react';
import { User } from '../types';
import { useBodyScrollLock } from '../lib/scrollLock';

interface MilestoneCelebrationModalProps {
  isOpen: boolean;
  user: User;
  referralCode: string;
  onClose: () => void;
  onGoToReferralDashboard: () => void;
}

export const MilestoneCelebrationModal: React.FC<MilestoneCelebrationModalProps> = ({
  isOpen,
  user,
  referralCode,
  onClose,
  onGoToReferralDashboard
}) => {
  const [copied, setCopied] = useState(false);
  useBodyScrollLock(isOpen);

  if (!isOpen) return null;

  const handleCopyCode = () => {
    if (typeof navigator !== 'undefined' && navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(referralCode).catch(() => {});
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-xs animate-in fade-in duration-200"
      onTouchMove={(e) => { if (e.target === e.currentTarget) e.preventDefault(); }}
    >
      
      {/* Floating Sparkles Confetti */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="milestone-piece" style={{ left: '15%', animationDelay: '0s', backgroundColor: '#F59E0B' }}></div>
        <div className="milestone-piece" style={{ left: '35%', animationDelay: '0.3s', backgroundColor: '#8B5CF6' }}></div>
        <div className="milestone-piece" style={{ left: '55%', animationDelay: '0.6s', backgroundColor: '#10B981' }}></div>
        <div className="milestone-piece" style={{ left: '75%', animationDelay: '0.1s', backgroundColor: '#3B82F6' }}></div>
        <div className="milestone-piece" style={{ left: '90%', animationDelay: '0.4s', backgroundColor: '#EC4899' }}></div>
      </div>

      <style>{`
        @keyframes milestoneFloat {
          0% {
            transform: translateY(-20px) rotate(0deg) scale(0.8);
            opacity: 1;
          }
          100% {
            transform: translateY(100vh) rotate(720deg) scale(1.1);
            opacity: 0;
          }
        }
        .milestone-piece {
          position: absolute;
          width: 12px;
          height: 16px;
          top: -20px;
          opacity: 0.9;
          border-radius: 3px;
          animation: milestoneFloat 4s linear infinite;
        }
      `}</style>

      <div className="relative w-full max-w-lg max-h-[calc(100dvh-2rem)] overflow-y-auto overscroll-contain sp-overlay-scroll bg-white rounded-3xl p-5 sm:p-8 shadow-2xl border border-slate-100 text-center animate-in zoom-in-95 duration-200">
        
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-100 transition-colors cursor-pointer"
          aria-label="Close"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        {/* Milestone Trophy Icon */}
        <div className="relative mx-auto w-24 h-24 mb-4">
          <div className="w-24 h-24 rounded-3xl bg-gradient-to-tr from-amber-500 to-yellow-400 text-white flex items-center justify-center text-5xl shadow-xl shadow-amber-500/30 ring-8 ring-amber-50">
            🏆
          </div>
          <div className="absolute -bottom-2 -right-2 px-2.5 py-0.5 rounded-full bg-purple-600 text-white text-[11px] font-extrabold ring-2 ring-white shadow-xs uppercase tracking-wider">
            Unlocked
          </div>
        </div>

        {/* Title */}
        <div className="inline-block px-3 py-1 bg-amber-100 text-amber-900 rounded-full text-xs font-bold uppercase tracking-wider mb-2">
          Milestone Achieved (10/10 Purchases)
        </div>
        <h3 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight mb-2">
          Referral Program Unlocked!
        </h3>
        <p className="text-xs sm:text-sm text-slate-600 mb-6 leading-relaxed">
          Congratulations <strong className="text-slate-900">{user.full_name}</strong>! You have completed 10 qualifying purchases on Surest Plug. You are now officially enrolled in our Exclusive Referral Partner Program.
        </p>

        {/* Reward Highlight Box */}
        <div className="p-4 sm:p-5 bg-gradient-to-br from-purple-50 via-indigo-50 to-blue-50 border border-purple-200/80 rounded-2xl text-left mb-6 space-y-3">
          <div className="flex items-center gap-2">
            <span className="text-xl">🎁</span>
            <h4 className="text-xs font-black text-purple-950 uppercase tracking-wider">Your Exclusive Partner Perk</h4>
          </div>
          <div className="text-2xl sm:text-3xl font-black text-purple-700">
            ₦10,000 Cash Reward
          </div>
          <p className="text-xs text-purple-900 leading-relaxed">
            Earn <strong>₦10,000 instant wallet credit</strong> every time someone signs up with your referral code and purchases a ready-made website!
          </p>

          {/* Referral Code Display */}
          <div className="pt-2">
            <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">
              Your Unique Referral Code:
            </label>
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
              <div className="flex-1 px-4 py-3 bg-white rounded-xl border border-purple-300 font-mono text-base font-black text-purple-900 text-center tracking-widest shadow-xs break-all">
                {referralCode}
              </div>
              <button
                type="button"
                onClick={handleCopyCode}
                className="px-5 py-3 bg-purple-600 hover:bg-purple-700 active:bg-purple-800 text-white font-bold text-xs rounded-xl shadow-md transition-all cursor-pointer whitespace-nowrap"
              >
                {copied ? 'Copied! ✓' : 'Copy Code'}
              </button>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-3">
          <button
            type="button"
            onClick={() => {
              onClose();
              onGoToReferralDashboard();
            }}
            className="flex-1 py-3.5 px-4 bg-purple-600 hover:bg-purple-700 active:bg-purple-800 text-white font-bold text-xs sm:text-sm rounded-xl shadow-md transition-all cursor-pointer flex items-center justify-center gap-2"
          >
            <span>Open Referral Dashboard</span>
            <span>→</span>
          </button>

          <button
            type="button"
            onClick={onClose}
            className="py-3.5 px-5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs sm:text-sm rounded-xl transition-colors cursor-pointer"
          >
            Awesome, Got It!
          </button>
        </div>

      </div>
    </div>
  );
};

export default MilestoneCelebrationModal;
