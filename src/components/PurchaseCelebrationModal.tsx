import React, { useEffect } from 'react';
import { Order } from '../types';
import { useBodyScrollLock } from '../lib/scrollLock';

interface PurchaseCelebrationModalProps {
  isOpen: boolean;
  order: Order | null;
  onClose: () => void;
  onViewOrder: () => void;
}

export const PurchaseCelebrationModal: React.FC<PurchaseCelebrationModalProps> = ({
  isOpen,
  order,
  onClose,
  onViewOrder
}) => {
  useBodyScrollLock(isOpen && Boolean(order));

  useEffect(() => {
    if (isOpen) {
      // Auto close after 12 seconds if not interacted
      const timer = setTimeout(() => {
        onClose();
      }, 12000);
      return () => clearTimeout(timer);
    }
  }, [isOpen, onClose]);

  if (!isOpen || !order) return null;

  const isWebsite = order.category === 'ready_made_website' || 
    Boolean(order.customer_details?.website_zip_data || order.customer_details?.admin_email);

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-xs animate-in fade-in duration-200"
      onTouchMove={(e) => { if (e.target === e.currentTarget) e.preventDefault(); }}
    >
      {/* Confetti Particle Overlay */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="confetti-piece" style={{ left: '10%', animationDelay: '0s', backgroundColor: '#3B82F6' }}></div>
        <div className="confetti-piece" style={{ left: '20%', animationDelay: '0.4s', backgroundColor: '#10B981' }}></div>
        <div className="confetti-piece" style={{ left: '30%', animationDelay: '0.2s', backgroundColor: '#F59E0B' }}></div>
        <div className="confetti-piece" style={{ left: '40%', animationDelay: '0.6s', backgroundColor: '#8B5CF6' }}></div>
        <div className="confetti-piece" style={{ left: '50%', animationDelay: '0.1s', backgroundColor: '#EC4899' }}></div>
        <div className="confetti-piece" style={{ left: '60%', animationDelay: '0.5s', backgroundColor: '#3B82F6' }}></div>
        <div className="confetti-piece" style={{ left: '70%', animationDelay: '0.3s', backgroundColor: '#10B981' }}></div>
        <div className="confetti-piece" style={{ left: '80%', animationDelay: '0.7s', backgroundColor: '#F59E0B' }}></div>
        <div className="confetti-piece" style={{ left: '90%', animationDelay: '0.2s', backgroundColor: '#6366F1' }}></div>
      </div>

      <style>{`
        @keyframes confettiFall {
          0% {
            transform: translateY(-20px) rotate(0deg);
            opacity: 1;
          }
          100% {
            transform: translateY(100vh) rotate(720deg);
            opacity: 0;
          }
        }
        .confetti-piece {
          position: absolute;
          width: 10px;
          height: 14px;
          top: -20px;
          opacity: 0.9;
          border-radius: 2px;
          animation: confettiFall 3.5s linear infinite;
        }
      `}</style>

      {/* Main Celebration Card */}
      <div className="relative w-full max-w-lg max-h-[calc(100dvh-2rem)] overflow-y-auto overscroll-contain sp-overlay-scroll bg-white rounded-3xl p-5 sm:p-8 shadow-2xl border border-slate-100 text-center transform animate-in zoom-in-95 duration-200">
        
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

        {/* Celebratory Icon Badge */}
        <div className="relative mx-auto w-20 h-20 mb-4">
          <div className="w-20 h-20 rounded-3xl bg-gradient-to-tr from-emerald-500 to-teal-400 text-white flex items-center justify-center text-4xl shadow-xl shadow-emerald-500/25 ring-8 ring-emerald-50">
            {isWebsite ? '🎉' : '🚀'}
          </div>
          <div className="absolute -bottom-1 -right-1 w-7 h-7 rounded-full bg-blue-600 text-white flex items-center justify-center text-xs font-bold ring-2 ring-white">
            ✓
          </div>
        </div>

        {/* Celebration Title */}
        <h3 className="text-2xl font-black text-slate-900 tracking-tight mb-1">
          {isWebsite ? 'Purchase Successful!' : 'Boosting Order Dispatched!'}
        </h3>
        <p className="text-xs sm:text-sm text-slate-500 mb-6">
          {isWebsite 
            ? 'Your ready-made website package is ready for instant download.' 
            : 'Your social media boosting order has been dispatched for automated delivery.'}
        </p>

        {/* Order Details Summary Box */}
        <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-4 sm:p-5 text-left mb-6 space-y-3">
          <div className="flex items-center justify-between border-b border-slate-200 pb-2.5">
            <span className="text-xs text-slate-500 font-medium">Order Reference</span>
            <span className="font-mono text-xs font-bold text-blue-700 bg-blue-50 px-2.5 py-1 rounded-lg border border-blue-100">
              {order.order_reference}
            </span>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-500 font-medium">Product / Service</span>
            <span className="text-xs font-bold text-slate-900 truncate max-w-[200px]">
              {order.product_name}
            </span>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-500 font-medium">Amount Paid</span>
            <span className="text-sm font-black text-emerald-600">
              ₦{order.amount.toLocaleString()}
            </span>
          </div>

          <div className="flex items-center justify-between pt-1 border-t border-slate-200">
            <span className="text-xs text-slate-500 font-medium">Status</span>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold uppercase bg-emerald-100 text-emerald-800">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 animate-pulse"></span>
              {order.status}
            </span>
          </div>

          {isWebsite && (
            <div className="p-2.5 bg-blue-50/80 border border-blue-100 rounded-xl text-[11px] text-blue-800 flex items-center gap-2">
              <span>📦</span>
              <span>Website ZIP files & admin login credentials are available in your orders.</span>
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-3">
          <button
            type="button"
            onClick={() => {
              onClose();
              onViewOrder();
            }}
            className="flex-1 py-3 px-4 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-bold text-xs sm:text-sm rounded-xl shadow-md transition-all cursor-pointer flex items-center justify-center gap-2"
          >
            <span>{isWebsite ? 'View Order & Download Files' : 'View Order Details'}</span>
            <span>→</span>
          </button>

          <button
            type="button"
            onClick={onClose}
            className="py-3 px-5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs sm:text-sm rounded-xl transition-colors cursor-pointer"
          >
            Continue Shopping
          </button>
        </div>

      </div>
    </div>
  );
};

export default PurchaseCelebrationModal;
