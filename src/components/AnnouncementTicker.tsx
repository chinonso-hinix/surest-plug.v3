import React, { useState, useEffect } from 'react';
import { store } from '../lib/store';
import { Megaphone } from 'lucide-react';

interface AnnouncementTickerProps {
  onNavigate?: (route: string, params?: any) => void;
}

export const AnnouncementTicker: React.FC<AnnouncementTickerProps> = () => {
  const [headline, setHeadline] = useState<string>('');
  const [enabled, setEnabled] = useState<boolean>(true);

  useEffect(() => {
    const loadSettings = () => {
      const s = store.getSettings();
      const text = s.announcement_headline ?? s.announcementHeadline ?? 'Welcome to Surest Plug — Buy USA verification numbers from ₦1,000 | Instant Delivery & 24/7 Support';
      const isEnabled = s.announcement_enabled ?? s.announcementEnabled ?? true;
      setHeadline(text);
      setEnabled(isEnabled);
    };

    loadSettings();
    const unsubscribe = store.subscribe(loadSettings);
    return () => unsubscribe();
  }, []);

  if (!enabled || !headline.trim()) {
    return null;
  }

  // Create duplicate items for seamless loop
  const tickerItems = [headline, headline, headline, headline];

  return (
    <div
      id="announcement-headline-bar"
      className="w-full max-w-full min-w-0 bg-gradient-to-r from-blue-900 via-blue-800 to-indigo-950 text-white border-b border-blue-700/60 overflow-hidden relative z-30 shadow-xs select-none"
    >
      <div className="max-w-7xl mx-auto px-2 sm:px-4 flex items-center h-8 sm:h-9 min-w-0">
        {/* Left Ticker Label Pill */}
        <div className="flex items-center gap-1.5 px-2.5 py-0.5 sm:py-1 bg-blue-600/90 text-white font-black text-[10px] sm:text-xs rounded-full uppercase tracking-wider shrink-0 z-10 shadow-xs border border-blue-400/30">
          <Megaphone className="w-3 h-3 text-amber-300 animate-pulse shrink-0" />
          <span className="hidden xs:inline">Updates</span>
        </div>

        {/* Ticker Window (overflow: hidden strictly on container) */}
        <div className="flex-1 overflow-hidden relative ml-2 sm:ml-3 h-full flex items-center min-w-0">
          <div className="animate-ticker-marquee flex items-center gap-10 sm:gap-16">
            {tickerItems.map((item, idx) => (
              <div
                key={`ticker-item-${idx}`}
                className="flex items-center gap-3 sm:gap-4 shrink-0 text-xs sm:text-sm font-medium tracking-wide text-blue-50"
              >
                <span>{item}</span>
                <span className="text-amber-400/80 text-[10px] sm:text-xs">✦</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AnnouncementTicker;
