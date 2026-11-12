'use client';

import { useEffect, useState } from 'react';

// A "Back to top" button that appears once you have scrolled a screen or so down
// any Hub page. One tap (or Enter) glides back to the top; devices set to reduce
// motion jump straight there (see scroll-behavior in globals.css).
export default function ScrollToTop() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    const onScroll = () => setShow(window.scrollY > 600);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  if (!show) return null;
  return (
    <button
      type="button"
      onClick={() => window.scrollTo({ top: 0 })}
      aria-label="Back to top"
      className="fixed bottom-5 right-5 z-40 inline-flex h-12 items-center gap-2 rounded-full px-4 text-sm font-bold shadow-lg hover:brightness-110 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
      style={{ background: 'var(--accent)', color: 'var(--on-solid)', outlineColor: 'var(--fg)' }}
    >
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M8 13V3M3.5 7.5 8 3l4.5 4.5" />
      </svg>
      Top
    </button>
  );
}
