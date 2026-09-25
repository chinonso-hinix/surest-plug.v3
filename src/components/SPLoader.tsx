/**
 * Surest Plug - Global SP Loading Screen
 * Displays the official SP brand logo with smooth, centered spin animation, "Surest Plug" title,
 * and "Loading digital marketplace & services..." or custom status message.
 */

import React, { useState } from 'react';

export const SITE_LOGO_URL = 'https://www.image2url.com/r2/default/images/1787828243533-7b9f3864-3fef-41b2-84e9-a00088ba5494.jpg';

interface SPLoaderProps {
  isLoading: boolean;
  message?: string;
  isFullScreen?: boolean;
}

export const SPLoader: React.FC<SPLoaderProps> = ({ 
  isLoading, 
  message = 'Loading digital marketplace & services...',
  isFullScreen = true
}) => {
  const [imgFailed, setImgFailed] = useState(false);

  if (!isLoading) return null;

  return (
    <div 
      className={`fixed inset-0 w-full h-full z-[99999] flex flex-col items-center justify-center select-none overflow-hidden p-4 ${
        isFullScreen ? 'bg-slate-50' : 'bg-slate-900/40 backdrop-blur-xs'
      }`}
      role="status"
      aria-live="polite"
    >
      <div className="flex flex-col items-center justify-center p-8 text-center max-w-sm mx-auto">
        {/* Centered Site Logo with Spin Animation */}
        <div className="relative w-20 h-20 mb-6 flex items-center justify-center">
          {/* Orbital Glow Ring */}
          <div className="absolute inset-0 rounded-full border-2 border-blue-500/20 border-t-blue-600 animate-spin" style={{ animationDuration: '1.5s' }} />
          
          {!imgFailed ? (
            <div className="w-16 h-16 rounded-full overflow-hidden shadow-xl shadow-blue-500/20 ring-2 ring-blue-500/30 flex items-center justify-center bg-white animate-spin" style={{ animationDuration: '3s' }}>
              <img 
                src={SITE_LOGO_URL} 
                alt="Surest Plug" 
                className="w-full h-full object-cover"
                onError={() => setImgFailed(true)}
              />
            </div>
          ) : (
            <div className="w-16 h-16 rounded-full bg-blue-600 flex items-center justify-center shadow-lg shadow-blue-500/25 ring-2 ring-blue-400 animate-spin">
              <span className="text-white font-black text-2xl tracking-wider">SP</span>
            </div>
          )}
        </div>
        
        {/* Brand Name */}
        <h2 className="text-2xl font-extrabold text-slate-900 tracking-tight mb-2">
          Surest Plug
        </h2>

        {/* Status / Loading Message */}
        <p className="text-slate-500 font-medium text-sm max-w-xs leading-relaxed">
          {message}
        </p>
      </div>
    </div>
  );
};

export default SPLoader;


