import React, { useEffect, useState } from 'react';
import { Order } from '../types';

interface PurchaseCelebrationToastProps {
  order: Order | null;
  onClose: () => void;
  onViewOrder: () => void;
}

export const PurchaseCelebrationToast: React.FC<PurchaseCelebrationToastProps> = ({
  order,
  onClose,
  onViewOrder
}) => {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (order) {
      setIsVisible(true);
      const timer = setTimeout(() => {
        setIsVisible(false);
        setTimeout(onClose, 300); // Allow exit transition
      }, 6500);
      return () => clearTimeout(timer);
    }
  }, [order, onClose]);

  if (!order) return null;

  return (
    <div
      className={`fixed bottom-4 inset-x-4 sm:inset-x-auto sm:right-6 sm:bottom-6 sm:max-w-md sm:w-auto z-50 bg-slate-900/95 backdrop-blur-md text-white p-4 sm:p-5 rounded-2xl shadow-2xl border border-slate-700/80 transition-all duration-300 transform ${
        isVisible ? 'translate-y-0 opacity-100 scale-100' : 'translate-y-4 opacity-0 scale-95 pointer-events-none'
      }`}
      role="alert"
      aria-live="assertive"
    >
      {/* Subtle Confetti Particles */}
      <div className="absolute inset-0 overflow-hidden rounded-2xl pointer-events-none">
        <span className="toast-sparkle" style={{ left: '15%', animationDelay: '0.1s' }}>✨</span>
        <span className="toast-sparkle" style={{ left: '50%', animationDelay: '0.3s' }}>🎉</span>
        <span className="toast-sparkle" style={{ left: '85%', animationDelay: '0.2s' }}>🎊</span>
      </div>

      <style>{`
        @keyframes floatSparkle {
          0% { transform: translateY(10px) scale(0.6); opacity: 0; }
          50% { opacity: 1; }
          100% { transform: translateY(-30px) scale(1.1); opacity: 0; }
        }
        .toast-sparkle {
          position: absolute;
          top: 10px;
          font-size: 14px;
          animation: floatSparkle 2s ease-out infinite;
        }
      `}</style>

      <div className="relative flex items-start gap-4">
        {/* Animated Badge Icon */}
        <div className="w-11 h-11 rounded-xl bg-gradient-to-tr from-emerald-500 to-teal-400 flex items-center justify-center text-xl text-white shadow-lg shadow-emerald-500/30 shrink-0">
          ✓
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0 pr-2">
          <div className="flex items-center gap-2">
            <h4 className="text-sm font-black text-white tracking-tight">
              🎉 Purchase Successful!
            </h4>
            <span className="px-1.5 py-0.5 bg-emerald-500/20 text-emerald-300 text-[10px] font-bold rounded uppercase">
              Confirmed
            </span>
          </div>
          <p className="text-xs text-slate-300 mt-0.5 truncate">
            {order.product_name}
          </p>
          <div className="flex items-center gap-3 mt-2 text-[11px]">
            <span className="font-mono text-blue-400 font-bold">{order.order_reference}</span>
            <span className="text-slate-400">•</span>
            <span className="font-black text-emerald-400">₦{order.amount.toLocaleString()}</span>
          </div>
        </div>

        {/* Close Button */}
        <button
          onClick={() => {
            setIsVisible(false);
            setTimeout(onClose, 300);
          }}
          className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors cursor-pointer shrink-0"
          aria-label="Dismiss toast"
        >
          ✕
        </button>
      </div>

      {/* Action Footer */}
      <div className="mt-3.5 pt-3 border-t border-slate-800 flex items-center justify-end gap-2">
        <button
          onClick={() => {
            setIsVisible(false);
            onClose();
            onViewOrder();
          }}
          className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-lg shadow-xs transition-colors cursor-pointer flex items-center gap-1.5"
        >
          <span>View Order Details</span>
          <span>→</span>
        </button>
      </div>
    </div>
  );
};

export default PurchaseCelebrationToast;
