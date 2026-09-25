/**
 * Surest Plug - Coming Soon Modal
 * Triggered on International Numbers & Social Media Accounts & Logins
 */

import React from 'react';
import { useBodyScrollLock } from '../lib/scrollLock';

interface ComingSoonModalProps {
  isOpen: boolean;
  serviceName: string;
  onClose: () => void;
}

export const ComingSoonModal: React.FC<ComingSoonModalProps> = ({
  isOpen,
  serviceName,
  onClose
}) => {
  useBodyScrollLock(isOpen);

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs transition-opacity duration-200"
      onClick={onClose}
      onTouchMove={(e) => { if (e.target === e.currentTarget) e.preventDefault(); }}
    >
      <div 
        className="relative w-full max-w-md max-h-[calc(100dvh-2rem)] overflow-y-auto overscroll-contain sp-overlay-scroll bg-white rounded-3xl shadow-2xl p-6 sm:p-8 text-center border border-slate-100 transform transition-all animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button */}
        <button 
          type="button" 
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 p-2 rounded-full hover:bg-slate-100 transition-colors"
          aria-label="Close modal"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        {/* Icon */}
        <div className="w-16 h-16 bg-blue-50 text-blue-600 rounded-2xl mx-auto flex items-center justify-center mb-5 shadow-xs">
          <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>

        {/* Title */}
        <h3 className="text-2xl font-black text-slate-900 tracking-tight mb-2 uppercase">
          COMING SOON
        </h3>

        {/* Message */}
        <p className="text-slate-600 text-sm sm:text-base leading-relaxed mb-6">
          <strong className="text-slate-900 font-semibold">{serviceName}</strong> will be available on Surest Plug soon. Please check back later.
        </p>

        {/* Close Button */}
        <div className="flex justify-center">
          <button 
            type="button" 
            onClick={onClose}
            className="w-full sm:w-auto px-8 py-2.5 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-semibold rounded-xl shadow-md hover:shadow-lg transition-all text-sm cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default ComingSoonModal;
