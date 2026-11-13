import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { AUTO_CHECKS, type AutoFacts } from '@/app/lib/checklistLogic';
import { loadChecklist } from '@/app/lib/checklistStore';
import { loadNfgMetrics } from '@/app/lib/nfgMetrics';
import ChecklistView from './ChecklistView';

export const metadata: Metadata = { title: 'Setup checklist · Command Hub' };
export const dynamic = 'force-dynamic';

// The launch setup checklist for one site. Behind the Hub's password (proxy.ts) like every page.
export default async function ChecklistPage({ params }: { params: Promise<{ siteId: string }> }) {
  const { siteId } = await params;
  const loaded = await loadChecklist(siteId);
  if (!loaded) notFound();

  // Automatic checks are a bonus: they need the directory's metrics feed and never block manual ticking.
  const wantsAuto = loaded.file.items.some(i => i.auto_check);
  let autoPassed: string[] = [];
  if (wantsAuto && siteId === 'the-naija-food-guide') {
    const m = await loadNfgMetrics();
    if (m.state === 'ok') {
      const facts: AutoFacts = { stripe_events_received: m.metrics.stripe_events_received, visits_by_source_30d: m.metrics.visits_by_source_30d };
      autoPassed = Object.entries(AUTO_CHECKS).filter(([, c]) => c.passes(facts)).map(([k]) => k);
    }
  }
  return <ChecklistView initial={loaded.file} persistence={loaded.persistence} autoPassed={autoPassed} />;
}
