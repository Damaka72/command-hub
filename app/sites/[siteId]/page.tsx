import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { loadNfgMetrics, type NfgMetrics } from '@/app/lib/nfgMetrics';
import { loadChecklist } from '@/app/lib/checklistStore';
import { summarise } from '@/app/lib/checklistLogic';
import { NFG_GROWTH_PLAN, NFG_QUICK_LINKS } from '@/app/lib/nfgConfig';

export const metadata: Metadata = { title: 'The Naija Food Guide · Command Hub' };
export const dynamic = 'force-dynamic';

const pounds = (pence: number) => `£${(pence / 100).toFixed(pence % 100 ? 2 : 0)}`;
const nice = (s: string) => s.replace(/_/g, ' ');
const box = { background: 'var(--panel)', border: '1px solid var(--line-2)', borderRadius: 'var(--radius-card)' } as const;

function Stat({ label, value, note }: { label: string; value: string | number; note?: string }) {
  return (
    <div className="p-4" style={box}>
      <p className="text-xs font-semibold" style={{ color: 'var(--fg-2)' }}>{label}</p>
      <p className="mono-num mt-1 text-2xl font-semibold" style={{ color: 'var(--fg)' }}>{value}</p>
      {note && <p className="mt-1 text-xs" style={{ color: 'var(--fg-2)' }}>{note}</p>}
    </div>
  );
}

function Counts({ title, data }: { title: string; data: Record<string, number> }) {
  const entries = Object.entries(data);
  return (
    <div className="p-4" style={box}>
      <h3 className="text-sm font-semibold" style={{ color: 'var(--fg)' }}>{title}</h3>
      {entries.length === 0 ? <p className="mt-1 text-sm" style={{ color: 'var(--fg-2)' }}>Nothing yet.</p> : (
        <ul className="mt-2 flex flex-col gap-1 text-sm" style={{ color: 'var(--fg-2)' }}>
          {entries.map(([k, n]) => <li key={k} className="flex justify-between"><span className="capitalize">{nice(k)}</span><span className="mono-num" style={{ color: 'var(--fg)' }}>{n}</span></li>)}
        </ul>
      )}
    </div>
  );
}

function Metrics({ m }: { m: NfgMetrics }) {
  return (
    <div className="flex flex-col gap-3">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Monthly recurring revenue" value={pounds(m.mrr_pence)} note="Annual plans spread over 12 months" />
        <Stat label="Line entries / Silver / Gold" value={`${m.listings_by_tier.line} / ${m.listings_by_tier.silver} / ${m.listings_by_tier.gold}`} />
        <Stat label="Free Silver ending in 14 days" value={m.silver_expiring_14d} />
        <Stat label="Free introductory Silver" value={m.subscriptions.free_introductory_silver} />
        <Stat label="Silver subscribers" value={m.subscriptions.silver_active} />
        <Stat label="Gold subscribers" value={m.subscriptions.gold_active} />
        <Stat label="Payments past due" value={m.subscriptions.past_due} />
        <Stat label="Cancelled this month" value={m.subscriptions.cancelled_this_month} />
        <Stat label="Claims waiting" value={m.claims_pending} />
        <Stat label="Enquiries, last 30 days" value={m.enquiries_30d} />
        <Stat label="Photo submissions waiting" value={m.photo_submissions_pending} />
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <Counts title="Outreach pipeline" data={m.outreach} />
        <Counts title="Visits by source (last 30 days)" data={m.visits_by_source_30d} />
      </div>
      <p className="text-xs" style={{ color: 'var(--fg-3)' }}>Counts and money only. No names, emails or enquiry text ever reach the Hub. Updated {new Date(m.generated_at).toLocaleString('en-GB')}.</p>
    </div>
  );
}

export default async function SitePage({ params }: { params: Promise<{ siteId: string }> }) {
  const { siteId } = await params;
  if (siteId !== 'the-naija-food-guide') notFound();
  const [metrics, checklist] = await Promise.all([loadNfgMetrics(), loadChecklist(siteId)]);
  const summary = checklist ? summarise(checklist.file) : null;

  return (
    <div className="mx-auto flex max-w-4xl flex-col px-5 py-6" style={{ gap: 'var(--space-section)' }}>
      <div>
        <Link href="/" className="inline-flex min-h-11 items-center text-sm font-medium underline-offset-4 hover:underline" style={{ color: 'var(--accent-text)' }}>← Command Hub</Link>
        <h1 className="mt-1 text-2xl font-bold tracking-tight" style={{ color: 'var(--fg)' }}>The Naija Food Guide</h1>
        <p className="mt-1 text-sm" style={{ color: 'var(--fg-2)' }}>Revenue, listings and growth for the directory.</p>
      </div>

      <section aria-labelledby="links-h">
        <h2 id="links-h" className="text-lg font-bold" style={{ color: 'var(--fg)' }}>Quick links</h2>
        <ul className="mt-2 flex flex-wrap gap-2">
          {NFG_QUICK_LINKS.map(l => (
            <li key={l.href}><a href={l.href} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-11 items-center px-4 text-sm font-semibold" style={{ ...box, color: 'var(--accent-text)', borderRadius: 'var(--radius-control)' }}>{l.label} ↗</a></li>
          ))}
          <li><Link href="/social#the-naija-food-guide" className="inline-flex min-h-11 items-center px-4 text-sm font-semibold" style={{ ...box, color: 'var(--accent-text)', borderRadius: 'var(--radius-control)' }}>Social accounts →</Link></li>
        </ul>
      </section>

      {summary && (
        <section aria-labelledby="cl-h" className="p-5" style={box}>
          <h2 id="cl-h" className="text-lg font-bold" style={{ color: 'var(--fg)' }}>Launch setup checklist</h2>
          <p className="mono-num mt-1 text-sm" style={{ color: 'var(--fg-2)' }}>{summary.complete} of {summary.total} done{summary.blocked ? ` · ${summary.blocked} blocked` : ''}</p>
          {summary.next && <p className="mt-1 text-sm" style={{ color: 'var(--fg)' }}>Next action: {summary.next.title}</p>}
          <Link href={`/checklists/${siteId}`} className="inline-flex min-h-11 items-center text-sm font-semibold underline-offset-4 hover:underline" style={{ color: 'var(--accent-text)' }}>Open the checklist →</Link>
        </section>
      )}

      <section aria-labelledby="metrics-h">
        <h2 id="metrics-h" className="mb-2 text-lg font-bold" style={{ color: 'var(--fg)' }}>Metrics</h2>
        {metrics.state === 'ok' && <Metrics m={metrics.metrics} />}
        {metrics.state === 'not_connected' && <p className="p-4 text-sm" style={{ ...box, color: 'var(--fg-2)' }}>Not connected yet. Finish checklist item C8 (add the metrics address and secret to this Hub&rsquo;s Vercel settings) and the numbers appear here.</p>}
        {metrics.state === 'error' && <p role="status" className="p-4 text-sm" style={{ ...box, color: 'var(--warn)' }}>The directory&rsquo;s metrics could not be loaded. Refresh to try again.</p>}
      </section>

      <section aria-labelledby="growth-h" className="p-5" style={box}>
        <h2 id="growth-h" className="text-lg font-bold" style={{ color: 'var(--fg)' }}>Growth plan: no ad spend</h2>
        <p className="mt-1 text-sm" style={{ color: 'var(--fg-2)' }}>{NFG_GROWTH_PLAN.summary}</p>
        <p className="mt-3 text-sm" style={{ color: 'var(--fg)' }}><b>Active platforms:</b> {NFG_GROWTH_PLAN.platforms.join(', ')}.</p>
        <p className="mt-1 text-sm" style={{ color: 'var(--fg)' }}><b>Weekly posting target:</b> {NFG_GROWTH_PLAN.weeklyPostsPerPlatform} posts per platform (a default to confirm with Didi; change it in <code>app/lib/nfgConfig.ts</code>).</p>
        <h3 className="mt-4 text-sm font-semibold" style={{ color: 'var(--fg)' }}>Influencer outreach checklist</h3>
        <ul className="mt-1 flex list-disc flex-col gap-1 pl-5 text-sm" style={{ color: 'var(--fg-2)' }}>
          {NFG_GROWTH_PLAN.influencerChecklist.map(t => <li key={t}>{t}</li>)}
        </ul>
      </section>
    </div>
  );
}
