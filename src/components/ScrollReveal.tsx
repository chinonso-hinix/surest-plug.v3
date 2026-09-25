import React, { useEffect, useRef, useState } from 'react';

interface ScrollRevealProps {
  children: React.ReactNode;
  direction?: 'left' | 'right' | 'up';
  delay?: number;
  className?: string;
  id?: string;
}

export const ScrollReveal: React.FC<ScrollRevealProps> = ({
  children,
  direction = 'up',
  delay = 0,
  className = '',
  id
}) => {
  const [isVisible, setIsVisible] = useState(false);
  const elementRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Check if user has requested reduced motion
    if (typeof window !== 'undefined' && window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setIsVisible(true);
      return;
    }

    const node = elementRef.current;
    if (!node) return;

    if (typeof IntersectionObserver === 'undefined') {
      setIsVisible(true);
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setIsVisible(true);
            // Once revealed, unobserve to avoid continuous re-renders/animating
            observer.unobserve(entry.target);
          }
        });
      },
      {
        rootMargin: '0px 0px -40px 0px',
        threshold: 0.1
      }
    );

    observer.observe(node);

    return () => {
      observer.disconnect();
    };
  }, []);

  const directionClass =
    direction === 'left'
      ? 'sp-reveal-left'
      : direction === 'right'
      ? 'sp-reveal-right'
      : 'sp-reveal-up';

  return (
    <div
      id={id}
      ref={elementRef}
      className={`sp-reveal-base ${directionClass} ${isVisible ? 'sp-reveal-visible' : ''} ${className}`}
      style={delay > 0 && isVisible ? { transitionDelay: `${delay}ms` } : undefined}
    >
      {children}
    </div>
  );
};

export default ScrollReveal;
