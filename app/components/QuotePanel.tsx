'use client';

import { useEffect, useState } from 'react';
import { QUOTES } from '@/app/lib/quotes';

// Left-bordered quote panel (UX spec §3.3) — operating principles rather than
// generic inspiration. Random pick happens post-mount to avoid an SSR/CSR
// hydration mismatch from Math.random().

export default function QuotePanel() {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    // Random pick must happen post-mount (client only) — doing it in the
    // initial state would diverge between server and client render and fail
    // hydration, so this is the one legitimate case for setState-in-effect.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setIndex(Math.floor(Math.random() * QUOTES.length));
  }, []);

  const quote = QUOTES[index];

  function rotate() {
    setIndex(prev => (prev + 1) % QUOTES.length);
  }

  return (
    <div
      className="flex flex-col gap-2 rounded-xl p-4"
      style={{
        borderLeft: '3px solid #3b82f6',
        background: 'linear-gradient(90deg, rgba(59,130,246,0.06), transparent 60%)',
      }}
    >
      <p className="text-sm italic" style={{ color: 'var(--fg-2)', fontFamily: 'Georgia, "Times New Roman", serif' }}>
        &ldquo;{quote.text}&rdquo;
      </p>
      <div className="flex items-center justify-between">
        <span className="text-[10px] font-semibold uppercase tracking-widest" style={{ color: 'var(--fg-3)' }}>
          {quote.attribution}
        </span>
        <button
          onClick={rotate}
          aria-label="Show another quote"
          className="rounded-md px-2 py-1 text-xs transition-all hover:brightness-125"
          style={{ color: 'var(--fg-3)', border: '1px solid var(--line)' }}
        >
          ↻
        </button>
      </div>
    </div>
  );
}
