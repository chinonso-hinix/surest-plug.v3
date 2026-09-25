import { useEffect, useRef, useCallback } from 'react';

/**
 * Options for the useScrollLock hook.
 */
export interface UseScrollLockOptions {
  /**
   * Whether scroll is actively locked.
   * Default: true
   */
  isLocked?: boolean;

  /**
   * Optional reference to the modal/popup wrapper element.
   * If provided, enforces 100dvh styling and dynamic viewport height calculations.
   */
  wrapperRef?: React.RefObject<HTMLElement | null>;

  /**
   * Whether to compensate for scrollbar width to prevent horizontal layout shift.
   * Default: true
   */
  reserveScrollBarGap?: boolean;
}

/**
 * Return type for useScrollLock providing utility properties and helper styles.
 */
export interface UseScrollLockReturn {
  /**
   * CSS styles tailored for popup/modal wrappers to ensure full dynamic viewport height (100dvh)
   * and isolated scroll containment.
   */
  popupWrapperStyle: React.CSSProperties;

  /**
   * Tailwind-compatible class string for 100dvh popup wrappers.
   */
  popupWrapperClassName: string;

  /**
   * Manual lock trigger.
   */
  lock: () => void;

  /**
   * Manual unlock trigger.
   */
  unlock: () => void;
}

// Global state for scroll lock tracking across components to handle nested overlays safely
let activeLockCount = 0;
let recordedScrollY = 0;
let prevBodyPosition = '';
let prevBodyTop = '';
let prevBodyLeft = '';
let prevBodyRight = '';
let prevBodyWidth = '';
let prevBodyOverflow = '';
let prevBodyPaddingRight = '';
let prevHtmlOverflow = '';

/**
 * Globally locks background page scrolling:
 * - Records window.scrollY
 * - Applies position: fixed to document.body with top offset
 * - Enforces dynamic viewport height (100dvh) support
 * - Prevents background touch gestures & scrollbar layout shifts
 */
export function lockScroll(reserveScrollBarGap: boolean = true): void {
  if (typeof document === 'undefined' || typeof window === 'undefined') return;

  if (activeLockCount === 0) {
    // Record current scroll position before locking
    recordedScrollY = window.scrollY || window.pageYOffset || document.documentElement.scrollTop || document.body.scrollTop || 0;

    // Save previous inline styles
    prevBodyPosition = document.body.style.position;
    prevBodyTop = document.body.style.top;
    prevBodyLeft = document.body.style.left;
    prevBodyRight = document.body.style.right;
    prevBodyWidth = document.body.style.width;
    prevBodyOverflow = document.body.style.overflow;
    prevBodyPaddingRight = document.body.style.paddingRight;
    prevHtmlOverflow = document.documentElement.style.overflow;

    // Calculate scrollbar width to prevent layout shift when scrollbar vanishes
    const scrollBarWidth = reserveScrollBarGap ? (window.innerWidth - document.documentElement.clientWidth) : 0;

    // Apply fixed positioning to body to physically prevent background swipe movement on mobile
    document.body.style.position = 'fixed';
    document.body.style.top = `-${recordedScrollY}px`;
    document.body.style.left = '0';
    document.body.style.right = '0';
    document.body.style.width = '100%';
    document.body.style.overflow = 'hidden';
    if (scrollBarWidth > 0) {
      document.body.style.paddingRight = `${scrollBarWidth}px`;
    }
    document.documentElement.style.overflow = 'hidden';
    document.body.classList.add('sp-scroll-locked');

    // Update dynamic viewport height CSS custom variable to match current real viewport
    const vh = window.innerHeight * 0.01;
    document.documentElement.style.setProperty('--app-dvh', `${window.innerHeight}px`);
    document.documentElement.style.setProperty('--vh', `${vh}px`);
  }

  activeLockCount++;
}

/**
 * Globally restores background page scrolling and returns viewport to recorded position.
 */
export function unlockScroll(): void {
  if (typeof document === 'undefined' || typeof window === 'undefined') return;

  activeLockCount = Math.max(0, activeLockCount - 1);

  if (activeLockCount === 0) {
    document.body.style.position = prevBodyPosition;
    document.body.style.top = prevBodyTop;
    document.body.style.left = prevBodyLeft;
    document.body.style.right = prevBodyRight;
    document.body.style.width = prevBodyWidth;
    document.body.style.overflow = prevBodyOverflow;
    document.body.style.paddingRight = prevBodyPaddingRight;
    document.documentElement.style.overflow = prevHtmlOverflow;
    document.body.classList.remove('sp-scroll-locked');

    // Restore exact scroll position seamlessly without jumping or jarring bounce
    window.scrollTo(0, recordedScrollY);
  }
}

/**
 * React hook for mobile and desktop scroll locking.
 * 
 * Features:
 * - Records `window.scrollY` on open
 * - Applies `fixed` position to `body` with negative top offset to strictly prevent background movement
 * - Restores scroll position on cleanup or close
 * - Supports `100dvh` for popup wrappers to eliminate address bar layout shifts
 * - Handles nested modal/overlay reference counting
 * 
 * @param config boolean indicating if locked, or UseScrollLockOptions configuration object
 */
export function useScrollLock(
  config: boolean | UseScrollLockOptions = true
): UseScrollLockReturn {
  const isLocked = typeof config === 'boolean' ? config : Boolean(config.isLocked ?? true);
  const reserveScrollBarGap = typeof config === 'object' ? (config.reserveScrollBarGap ?? true) : true;
  const wrapperRef = typeof config === 'object' ? config.wrapperRef : undefined;

  const isCurrentlyLocked = useRef(false);

  const lock = useCallback(() => {
    if (!isCurrentlyLocked.current) {
      lockScroll(reserveScrollBarGap);
      isCurrentlyLocked.current = true;
    }
  }, [reserveScrollBarGap]);

  const unlock = useCallback(() => {
    if (isCurrentlyLocked.current) {
      unlockScroll();
      isCurrentlyLocked.current = false;
    }
  }, []);

  // Synchronize lock state with prop/config
  useEffect(() => {
    if (isLocked) {
      lock();
    } else {
      unlock();
    }

    return () => {
      unlock();
    };
  }, [isLocked, lock, unlock]);

  // Handle 100dvh layout updates for wrapperRef if provided
  useEffect(() => {
    if (!wrapperRef || !wrapperRef.current || !isLocked) return;

    const el = wrapperRef.current;
    
    // Set 100dvh fallback styling using window.innerHeight for older browsers
    const updateHeight = () => {
      if (el) {
        el.style.height = '100dvh';
        el.style.maxHeight = '100dvh';
        el.style.setProperty('--real-dvh', `${window.innerHeight}px`);
      }
    };

    updateHeight();
    window.addEventListener('resize', updateHeight);
    window.addEventListener('orientationchange', updateHeight);

    return () => {
      window.removeEventListener('resize', updateHeight);
      window.removeEventListener('orientationchange', updateHeight);
    };
  }, [wrapperRef, isLocked]);

  return {
    popupWrapperStyle: {
      height: '100dvh',
      maxHeight: '100dvh',
      overscrollBehavior: 'contain',
      WebkitOverflowScrolling: 'touch',
    },
    popupWrapperClassName: 'h-[100dvh] max-h-[100dvh] overscroll-contain',
    lock,
    unlock,
  };
}

// Named alias for backwards compatibility
export const useBodyScrollLock = useScrollLock;

export default useScrollLock;
