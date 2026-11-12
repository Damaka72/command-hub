"use client";

import { useState } from "react";
import { BRAND_SHEETS, SOCIAL_SIZES, brandBrief, type BrandSheet, type CardStyle } from "../lib/brandSheets";

// ── Brand sheets ──────────────────────────────────────────────────────────────
// One card per brand: colours, fonts, a sample social card in the brand's own
// colours, the rules, and a button that copies the whole sheet as a brief to
// paste into Claude or Cowork. The values live in data/brands/.

/** Black or white, whichever reads better on a colour swatch. */
function inkOn(hex: string): string {
  const n = parseInt(hex.slice(1), 16);
  const [r, g, b] = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map(v => {
    const c = v / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b > 0.3 ? "#111111" : "#ffffff";
}

function SampleCard({ b, style, label }: { b: BrandSheet; style: CardStyle; label: string }) {
  return (
    <figure className="m-0 flex flex-col gap-1.5">
      <div
        className="flex aspect-square w-full flex-col justify-between rounded-lg p-4"
        style={{ background: style.background, border: "1px solid color-mix(in srgb, var(--fg) 18%, transparent)" }}
        role="img"
        aria-label={`Sample ${label.toLowerCase()} social card in ${b.name} colours`}
      >
        <span className="text-[10px] font-bold uppercase tracking-[0.16em]" style={{ color: style.accent }}>{b.name}</span>
        <span className="text-lg font-extrabold leading-tight" style={{ color: style.headline }}>
          Headline in{" "}
          <span style={style.gradient ? { background: style.gradient, WebkitBackgroundClip: "text", backgroundClip: "text", color: "transparent" } : { color: style.accent }}>
            {b.fonts.display.family}
          </span>
        </span>
        <span className="text-[11px] leading-snug" style={{ color: style.body }}>Body copy in {b.fonts.body.family}.</span>
      </div>
      <figcaption className="text-[11px] text-fg-3">{label} card. Shown in the Hub&rsquo;s own font; the real one uses the brand fonts.</figcaption>
    </figure>
  );
}

function Sheet({ b }: { b: BrandSheet }) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(brandBrief(b));
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      setCopied(false);
    }
  };
  const fonts = [b.fonts.display, b.fonts.body, ...(b.fonts.mono ? [b.fonts.mono] : [])];

  return (
    <details className="group rounded-xl border border-line bg-panel">
      <summary className="flex cursor-pointer list-none flex-wrap items-center justify-between gap-3 px-5 py-3">
        <span className="flex min-w-0 flex-col">
          <span className="text-sm font-semibold text-fg">{b.name}</span>
          <span className="text-xs text-fg-3">{b.fonts.display.family}{b.fonts.body.family !== b.fonts.display.family ? ` + ${b.fonts.body.family}` : ""}{b.toConfirm.length ? ` · ${b.toConfirm.length} to confirm` : ""}</span>
        </span>
        <span className="flex shrink-0 overflow-hidden rounded-md border border-line" aria-hidden="true">
          {b.colours.slice(0, 6).map(c => <span key={c.hex + c.name} className="h-6 w-6" style={{ background: c.hex }} />)}
        </span>
      </summary>

      <div className="flex flex-col gap-5 px-5 pb-5 pt-1">
        <p className="text-xs text-fg-3">{b.tagline} · {b.source}.</p>

        <div>
          <h4 className="mb-2 text-xs font-bold uppercase tracking-wider text-fg-2">Colours</h4>
          <ul className="m-0 grid list-none gap-2 p-0 sm:grid-cols-2">
            {b.colours.map(c => (
              <li key={c.hex + c.name} className="flex items-stretch overflow-hidden rounded-lg border border-line">
                <span className="flex w-24 shrink-0 flex-col justify-center px-2.5 py-2 font-mono text-[11px] font-semibold" style={{ background: c.hex, color: inkOn(c.hex) }}>
                  {c.hex.toUpperCase()}
                </span>
                <span className="flex min-w-0 flex-col justify-center px-3 py-2 text-xs leading-snug text-fg-2">
                  <b className="text-fg">{c.name}</b>
                  {c.role}
                </span>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <h4 className="mb-2 text-xs font-bold uppercase tracking-wider text-fg-2">Fonts</h4>
          <ul className="m-0 flex list-none flex-col gap-1.5 p-0 text-xs leading-relaxed text-fg-2">
            {fonts.map(f => (
              <li key={f.family + f.use}>
                <a href={f.source} target="_blank" rel="noopener noreferrer" className="font-semibold text-accent-text underline">{f.family}</a>
                {" "}· {f.use} · weights {f.weights}
              </li>
            ))}
          </ul>
        </div>

        <div>
          <h4 className="mb-2 text-xs font-bold uppercase tracking-wider text-fg-2">Default social card</h4>
          <div className="grid max-w-md grid-cols-2 gap-4">
            <SampleCard b={b} style={b.card} label="Main" />
            {b.card.alt && <SampleCard b={b} style={b.card.alt} label="Alternative" />}
          </div>
        </div>

        <dl className="flex flex-col gap-3 text-xs leading-relaxed text-fg-2">
          <div><dt className="font-semibold text-fg">Voice</dt><dd className="m-0">{b.voice}</dd></div>
          <div><dt className="font-semibold text-fg">Imagery</dt><dd className="m-0"><ul className="m-0 list-disc pl-4">{b.imagery.map(x => <li key={x}>{x}</li>)}</ul></dd></div>
          <div><dt className="font-semibold text-fg">Logo</dt><dd className="m-0">{b.logo}</dd></div>
          <div><dt className="font-semibold text-fg">Never</dt><dd className="m-0"><ul className="m-0 list-disc pl-4">{b.doNot.map(x => <li key={x}>{x}</li>)}</ul></dd></div>
          {b.toConfirm.length > 0 && (
            <div className="rounded-lg border border-warn/50 px-3 py-2">
              <dt className="font-semibold text-warn">For you to confirm</dt>
              <dd className="m-0"><ul className="m-0 list-disc pl-4">{b.toConfirm.map(x => <li key={x}>{x}</li>)}</ul></dd>
            </div>
          )}
        </dl>

        <div className="flex flex-wrap items-center gap-3">
          <button type="button" onClick={copy} className="inline-flex min-h-11 items-center rounded-lg border border-line-2 px-4 text-sm font-medium text-fg hover:brightness-125">
            Copy this sheet as a brief
          </button>
          <span role="status" className="text-xs text-ok">{copied ? "Copied. Paste it into Claude or Cowork with your request." : ""}</span>
        </div>
      </div>
    </details>
  );
}

export default function BrandSheets() {
  return (
    <div className="flex flex-col gap-3">
      {BRAND_SHEETS.map(b => <Sheet key={b.siteId} b={b} />)}
      <details className="rounded-xl border border-line bg-panel">
        <summary className="cursor-pointer list-none px-5 py-3 text-sm font-semibold text-fg">Sizes every brand shares</summary>
        <ul className="m-0 flex list-none flex-col gap-1.5 px-5 pb-5 pt-1 text-xs text-fg-2">
          {SOCIAL_SIZES.map(s => (
            <li key={s.name}><b className="text-fg">{s.name}</b> · <span className="font-mono">{s.size}</span> · {s.use}</li>
          ))}
        </ul>
      </details>
    </div>
  );
}
