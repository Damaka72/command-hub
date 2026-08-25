'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { SITE_SHORT } from '@/app/lib/siteConstants';
import { formatWeekChip } from '@/app/lib/weekDates';

interface BriefRow {
  id:              number;
  site_id:         string;
  week_commencing: string;
  brief:           string;
  source:          string;
  created_at:      string;
}

interface LibraryRow {
  id:             string;
  site_id:        string;
  day_name:       string;
  platform:       string;
  grader_verdict: string | null;
  content:        string;
  edited_content: string | null;
}

interface NewsletterRow {
  id:              number;
  publication:     string;
  week_commencing: string;
  status:          string;
  subject_options: unknown;
  research_brief:  string | null;
  draft_content:   string | null;
  edited_content:  string | null;
  repurposed_from: string[] | null;
  sent_at:         string | null;
}

interface PublicationBlock {
  slug:       string;
  title:      string;
  siteIds:    string[];
  newsletter: NewsletterRow | null;
  briefs:     BriefRow[];
  library:    LibraryRow[];
}

interface QueueWeek {
  week:           string;
  status:         string | null;
  driveLink:      string | null;
  subjectOptions: string[] | null;
  sentAt:         string | null;
}

const STATUS_PILL: Record<string, string> = {
  draft:     'bg-gray-700 text-gray-200',
  finalised: 'bg-amber-800 text-amber-100',
  sent:      'bg-green-800 text-green-100',
};
const STATUS_LABEL: Record<string, string> = {
  draft: 'Draft', finalised: 'Finalised', sent: 'Sent',
};
const DAY_ORDER: Record<string, number> = { Monday: 1, Tuesday: 2, Wednesday: 3, Thursday: 4, Friday: 5 };

function nextMonday(): string {
  const d = new Date();
  const day = d.getDay();
  const daysUntilMonday = day === 0 ? 1 : 8 - day;
  d.setDate(d.getDate() + daysUntilMonday);
  return d.toISOString().slice(0, 10);
}

export default function NewslettersPage() {
  const [week, setWeek]         = useState<string>(nextMonday());
  const [blocks, setBlocks]     = useState<PublicationBlock[]>([]);
  const [active, setActive]     = useState<string>('the-prompt-ly');
  const [edits, setEdits]       = useState<Record<string, string>>({});     // slug -> draft text
  const [research, setResearch] = useState<Record<string, string>>({});     // slug -> research brief text
  const [selected, setSelected] = useState<Record<string, string[]>>({});   // slug -> repurposed content_library ids
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState('');
  const [busy, setBusy]         = useState<string | null>(null);
  const [copied, setCopied]     = useState<string | null>(null);

  // Draft queue — several weeks ahead, each with a Google Drive link, so
  // newsletters can be drafted in Docs and queued up before the pipeline
  // would otherwise generate that week's content.
  const [queue, setQueue]             = useState<QueueWeek[]>([]);
  const [queueLoading, setQueueLoading] = useState(false);
  const [queueDrafts, setQueueDrafts] = useState<Record<string, string>>({}); // week -> in-progress link text
  const [queueBusy, setQueueBusy]     = useState<string | null>(null);
  const [queueOpen, setQueueOpen]     = useState(true);

  // Deep link: /newsletters?pub=the-pathway preselects a tab (used by /review's Sunday checklist).
  useEffect(() => {
    const pub = new URLSearchParams(window.location.search).get('pub');
    if (pub === 'the-prompt-ly' || pub === 'the-pathway' || pub === 'the-oak') setActive(pub);
  }, []);

  const load = useCallback((w: string) => {
    setLoading(true);
    setError('');
    fetch(`/api/newsletters?week=${w}`)
      .then(r => r.json())
      .then(data => {
        if (data.error) throw new Error(data.error);
        const pubs: PublicationBlock[] = data.publications ?? [];
        setBlocks(pubs);
        // Seed the editor and selections from what's saved.
        const nextEdits: Record<string, string> = {};
        const nextResearch: Record<string, string> = {};
        const nextSel: Record<string, string[]> = {};
        for (const p of pubs) {
          nextEdits[p.slug]    = p.newsletter?.edited_content ?? p.newsletter?.draft_content ?? '';
          nextResearch[p.slug] = p.newsletter?.research_brief ?? '';
          nextSel[p.slug]      = p.newsletter?.repurposed_from ?? [];
        }
        setEdits(nextEdits);
        setResearch(nextResearch);
        setSelected(nextSel);
      })
      .catch(err => setError(err instanceof Error ? err.message : String(err)))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(week); }, [week, load]);

  const loadQueue = useCallback((pub: string) => {
    setQueueLoading(true);
    fetch(`/api/newsletters/queue?publication=${pub}`)
      .then(r => r.json())
      .then(data => {
        if (data.error) throw new Error(data.error);
        const weeks: QueueWeek[] = data.weeks ?? [];
        setQueue(weeks);
        setQueueDrafts(Object.fromEntries(weeks.map(w => [w.week, w.driveLink ?? ''])));
      })
      .catch(() => setQueue([]))
      .finally(() => setQueueLoading(false));
  }, []);

  useEffect(() => { loadQueue(active); }, [active, loadQueue]);

  async function saveQueueLink(pub: string, w: string) {
    setQueueBusy(w);
    try {
      const res = await fetch('/api/newsletters', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ publication: pub, week: w, driveLink: queueDrafts[w] ?? '' }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Save failed');
      loadQueue(pub);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setQueueBusy(null);
    }
  }

  const block = useMemo(() => blocks.find(b => b.slug === active), [blocks, active]);

  function toggleSource(slug: string, id: string) {
    setSelected(prev => {
      const cur = prev[slug] ?? [];
      const next = cur.includes(id) ? cur.filter(x => x !== id) : [...cur, id];
      return { ...prev, [slug]: next };
    });
  }

  function insertIntoDraft(slug: string, row: LibraryRow) {
    const text = row.edited_content ?? row.content;
    setEdits(prev => {
      const cur = prev[slug] ?? '';
      return { ...prev, [slug]: cur ? `${cur}\n\n${text}` : text };
    });
    // Inserting a source implies repurposing it.
    setSelected(prev => {
      const cur = prev[slug] ?? [];
      return cur.includes(row.id) ? prev : { ...prev, [slug]: [...cur, row.id] };
    });
  }

  async function save(slug: string) {
    setBusy(`save-${slug}`);
    setError('');
    try {
      const res = await fetch('/api/newsletters', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          publication: slug,
          week,
          editedContent: edits[slug] ?? '',
          repurposedFrom: selected[slug] ?? [],
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Save failed');
      load(week);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally { setBusy(null); }
  }

  async function setStatus(slug: string, status: 'draft' | 'finalised' | 'sent') {
    setBusy(`status-${slug}-${status}`);
    setError('');
    try {
      const res = await fetch('/api/newsletters', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ publication: slug, week, status }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Status change failed');
      load(week);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally { setBusy(null); }
  }

  async function generateResearch(slug: string) {
    if ((research[slug] ?? '').trim() && !window.confirm('Replace the current research brief with a freshly generated one?')) {
      return;
    }
    setBusy(`research-${slug}`);
    setError('');
    try {
      const res = await fetch('/api/newsletters/research', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ publication: slug, week }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Research generation failed');
      setResearch(prev => ({ ...prev, [slug]: data.researchBrief ?? '' }));
      load(week);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally { setBusy(null); }
  }

  async function saveResearch(slug: string) {
    setBusy(`save-research-${slug}`);
    setError('');
    try {
      const res = await fetch('/api/newsletters', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ publication: slug, week, researchBrief: research[slug] ?? '' }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Save failed');
      load(week);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally { setBusy(null); }
  }

  async function generateDraft(slug: string) {
    // Regenerating replaces the editor text. Guard unsaved work.
    if ((edits[slug] ?? '').trim() && !window.confirm('Replace the current draft with a freshly generated one?')) {
      return;
    }
    setBusy(`generate-${slug}`);
    setError('');
    try {
      const res = await fetch('/api/newsletters/draft', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ publication: slug, week }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Draft generation failed');
      // Show the new draft immediately, then reload so the saved row/subjects refresh.
      setEdits(prev => ({ ...prev, [slug]: data.draft ?? '' }));
      load(week);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally { setBusy(null); }
  }

  async function copyForBeehiiv(slug: string) {
    // Copies edited_content ?? draft_content — the live editor text, falling back
    // to any generated draft — ready to paste into Beehiiv's editor.
    const text = (edits[slug] ?? '') || block?.newsletter?.draft_content || '';
    try {
      await navigator.clipboard.writeText(text);
      setCopied(slug);
      setTimeout(() => setCopied(c => (c === slug ? null : c)), 2000);
    } catch {
      setError('Could not copy to clipboard');
    }
  }

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      <div className="border-b border-gray-800 px-6 py-4 flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-4">
          <a href="/" className="text-gray-400 hover:text-white text-sm">← Dashboard</a>
          <h1 className="text-lg font-semibold text-white">Newsletters</h1>
        </div>
        <div className="flex items-center gap-3">
          <label className="text-xs text-gray-400 uppercase tracking-wide">Week</label>
          <input
            type="date"
            value={week}
            onChange={e => setWeek(e.target.value)}
            className="bg-gray-800 border border-gray-600 rounded-lg px-3 py-1.5 text-white text-sm focus:outline-none focus:border-blue-500"
          />
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-800 px-6 flex items-center gap-2">
        {blocks.map(b => (
          <button
            key={b.slug}
            onClick={() => setActive(b.slug)}
            className={`px-4 py-3 text-sm font-medium border-b-2 -mb-px transition-colors ${
              active === b.slug
                ? 'border-blue-500 text-white'
                : 'border-transparent text-gray-400 hover:text-gray-200'
            }`}
          >
            {b.title}
            {b.newsletter && (
              <span className={`ml-2 rounded-full px-2 py-0.5 text-[12px] font-medium ${STATUS_PILL[b.newsletter.status] ?? 'bg-gray-700 text-gray-200'}`}>
                {STATUS_LABEL[b.newsletter.status] ?? b.newsletter.status}
              </span>
            )}
          </button>
        ))}
      </div>

      <div className="max-w-4xl mx-auto px-6 py-8 space-y-6">
        {error && (
          <div className="bg-red-900/30 border border-red-700 rounded-lg p-4 text-red-300 text-sm">{error}</div>
        )}

        {/* Draft queue — Google Drive links for several weeks ahead, so drafts
            written in Docs (based on themes, things happening) can be queued
            up before the pipeline would otherwise generate that week. */}
        <section className="rounded-xl border border-gray-700 bg-gray-900">
          <button
            onClick={() => setQueueOpen(o => !o)}
            className="flex w-full items-center justify-between px-4 py-3 text-left"
          >
            <span className="text-xs font-semibold uppercase tracking-wide text-gray-400">
              Draft queue — next {queue.length || 12} weeks
            </span>
            <span className="text-xs text-gray-500">{queueOpen ? '▲' : '▼'}</span>
          </button>
          {queueOpen && (
            <div className="border-t border-gray-800 divide-y divide-gray-800">
              {queueLoading && <p className="px-4 py-3 text-gray-500 text-sm">Loading…</p>}
              {!queueLoading && queue.map(w => (
                <div key={w.week} className="flex items-center gap-3 px-4 py-2.5 flex-wrap">
                  <button
                    onClick={() => setWeek(w.week)}
                    className={`shrink-0 w-36 text-left text-xs font-medium hover:underline ${w.week === week ? 'text-blue-400' : 'text-gray-300'}`}
                    title="Open this week in the editor below"
                  >
                    {formatWeekChip(w.week)}
                  </button>
                  {w.status && (
                    <span className={`shrink-0 rounded-full px-2 py-0.5 text-[12px] font-medium ${STATUS_PILL[w.status] ?? 'bg-gray-700 text-gray-200'}`}>
                      {STATUS_LABEL[w.status] ?? w.status}
                    </span>
                  )}
                  <input
                    type="text"
                    value={queueDrafts[w.week] ?? ''}
                    onChange={e => setQueueDrafts(prev => ({ ...prev, [w.week]: e.target.value }))}
                    placeholder="Paste the Google Drive link for this week's draft…"
                    className="flex-1 min-w-[220px] bg-gray-800 border border-gray-600 rounded-lg px-2.5 py-1 text-gray-100 text-xs focus:outline-none focus:border-blue-500"
                  />
                  {w.driveLink && (
                    <a
                      href={w.driveLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="shrink-0 text-xs text-blue-400 hover:underline"
                    >
                      Open ↗
                    </a>
                  )}
                  <button
                    onClick={() => saveQueueLink(active, w.week)}
                    disabled={queueBusy !== null || (queueDrafts[w.week] ?? '') === (w.driveLink ?? '')}
                    className="shrink-0 rounded-lg bg-gray-700 hover:bg-gray-600 text-white px-2.5 py-1 text-[12px] font-medium disabled:opacity-40"
                  >
                    {queueBusy === w.week ? 'Saving…' : 'Save'}
                  </button>
                </div>
              ))}
            </div>
          )}
        </section>

        {loading && <p className="text-gray-400 text-sm">Loading…</p>}

        {!loading && block && (
          <>
            {/* Status control */}
            <div className="flex items-center justify-between flex-wrap gap-3">
              <div className="flex items-center gap-3">
                <h2 className="text-base font-semibold text-white">{block.title}</h2>
                <span className={`rounded-full px-2.5 py-0.5 text-[13px] font-medium ${STATUS_PILL[block.newsletter?.status ?? 'draft'] ?? 'bg-gray-700 text-gray-200'}`}>
                  {STATUS_LABEL[block.newsletter?.status ?? 'draft'] ?? block.newsletter?.status}
                </span>
                {block.newsletter?.sent_at && (
                  <span className="text-xs text-green-300">
                    Sent {new Date(block.newsletter.sent_at).toLocaleString('en-GB')}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2">
                {(block.newsletter?.status ?? 'draft') === 'draft' && (
                  <button
                    onClick={() => setStatus(block.slug, 'finalised')}
                    disabled={busy !== null}
                    className="rounded-lg bg-amber-700 hover:bg-amber-600 text-white px-3 py-1.5 text-xs font-medium disabled:opacity-50"
                  >
                    {busy === `status-${block.slug}-finalised` ? 'Finalising…' : 'Finalise'}
                  </button>
                )}
                {block.newsletter?.status === 'finalised' && (
                  <>
                    <button
                      onClick={() => setStatus(block.slug, 'sent')}
                      disabled={busy !== null}
                      className="rounded-lg bg-green-700 hover:bg-green-600 text-white px-3 py-1.5 text-xs font-medium disabled:opacity-50"
                    >
                      {busy === `status-${block.slug}-sent` ? 'Marking…' : 'Mark as sent'}
                    </button>
                    <button
                      onClick={() => setStatus(block.slug, 'draft')}
                      disabled={busy !== null}
                      className="rounded-lg bg-gray-700 hover:bg-gray-600 text-white px-3 py-1.5 text-xs font-medium disabled:opacity-50"
                    >
                      Back to draft
                    </button>
                  </>
                )}
                {block.newsletter?.status === 'sent' && (
                  <button
                    onClick={() => setStatus(block.slug, 'draft')}
                    disabled={busy !== null}
                    className="rounded-lg bg-gray-700 hover:bg-gray-600 text-white px-3 py-1.5 text-xs font-medium disabled:opacity-50"
                  >
                    Reopen as draft
                  </button>
                )}
              </div>
            </div>

            {/* Research brief — the newsletter's own, generatable + editable */}
            <section className="space-y-2">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-semibold uppercase tracking-wide text-gray-400">Research brief</h3>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => generateResearch(block.slug)}
                    disabled={busy !== null}
                    className="rounded-lg bg-purple-700 hover:bg-purple-600 text-white px-3 py-1.5 text-xs font-medium disabled:opacity-50"
                    title="Research this issue from the weekly-plan theme and social highlights"
                  >
                    {busy === `research-${block.slug}` ? 'Researching…' : '🔎 Generate research brief'}
                  </button>
                  <button
                    onClick={() => saveResearch(block.slug)}
                    disabled={busy !== null}
                    className="rounded-lg bg-gray-700 hover:bg-gray-600 text-white px-3 py-1.5 text-xs font-medium disabled:opacity-50"
                  >
                    {busy === `save-research-${block.slug}` ? 'Saving…' : 'Save brief'}
                  </button>
                </div>
              </div>
              <textarea
                value={research[block.slug] ?? ''}
                onChange={e => setResearch(prev => ({ ...prev, [block.slug]: e.target.value }))}
                rows={8}
                placeholder="Hit 🔎 Generate research brief to distil this issue's angle from the weekly-plan theme and social highlights — or write the brief yourself. It feeds the draft below."
                className="w-full bg-gray-800 border border-gray-600 rounded-lg px-3 py-2 text-gray-100 text-sm focus:outline-none focus:border-blue-500 font-sans leading-relaxed"
              />

              {/* Upstream per-site research from the weekly plan (reference only) */}
              {block.briefs.length > 0 && (
                <details className="text-sm">
                  <summary className="cursor-pointer text-xs text-gray-500 hover:text-gray-300">
                    Site research from the weekly plan ({block.briefs.length})
                  </summary>
                  <div className="mt-2 space-y-2">
                    {block.briefs
                      .slice()
                      .sort((a, b) => (block.siteIds.indexOf(a.site_id)) - (block.siteIds.indexOf(b.site_id)))
                      .map(brief => (
                        <div key={brief.id} className="bg-gray-900 border border-gray-700 rounded-xl p-4">
                          <div className="flex items-center gap-2 mb-2">
                            <span className="text-xs font-semibold text-gray-300">{SITE_SHORT[brief.site_id] ?? brief.site_id}</span>
                            <span className="text-[12px] text-gray-500 uppercase tracking-wide">{brief.source}</span>
                          </div>
                          <p className="whitespace-pre-wrap text-sm text-gray-200 leading-relaxed">{brief.brief}</p>
                        </div>
                      ))}
                  </div>
                </details>
              )}
            </section>

            {/* Pull from content library */}
            <section className="space-y-2">
              <h3 className="text-xs font-semibold uppercase tracking-wide text-gray-400">
                Pull from content library <span className="text-gray-600">(grader-passed)</span>
              </h3>
              {block.library.length === 0 ? (
                <p className="text-gray-500 text-sm">No grader-passed content for this week yet.</p>
              ) : (
                <div className="space-y-2">
                  {block.library
                    .slice()
                    .sort((a, b) => (DAY_ORDER[a.day_name] ?? 9) - (DAY_ORDER[b.day_name] ?? 9))
                    .map(row => {
                      const isSel = (selected[block.slug] ?? []).includes(row.id);
                      return (
                        <div key={row.id} className={`rounded-xl border p-3 ${isSel ? 'border-blue-600 bg-blue-950/20' : 'border-gray-700 bg-gray-900'}`}>
                          <div className="flex items-start justify-between gap-3">
                            <label className="flex items-start gap-2 cursor-pointer flex-1">
                              <input
                                type="checkbox"
                                checked={isSel}
                                onChange={() => toggleSource(block.slug, row.id)}
                                className="mt-1 h-4 w-4 flex-shrink-0 accent-blue-500"
                              />
                              <span className="flex-1">
                                <span className="block text-xs text-gray-400 mb-1">
                                  {SITE_SHORT[row.site_id] ?? row.site_id} · {row.day_name} · {row.platform}
                                </span>
                                <span className="block text-sm text-gray-200 line-clamp-3 whitespace-pre-wrap">
                                  {row.edited_content ?? row.content}
                                </span>
                              </span>
                            </label>
                            <button
                              onClick={() => insertIntoDraft(block.slug, row)}
                              disabled={busy !== null}
                              className="rounded-lg bg-gray-700 hover:bg-gray-600 text-white px-2.5 py-1 text-xs font-medium disabled:opacity-50 flex-shrink-0"
                            >
                              Insert ↓
                            </button>
                          </div>
                        </div>
                      );
                    })}
                </div>
              )}
            </section>

            {/* Editable draft */}
            <section className="space-y-2">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-semibold uppercase tracking-wide text-gray-400">Draft</h3>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => generateDraft(block.slug)}
                    disabled={busy !== null}
                    className="rounded-lg bg-purple-700 hover:bg-purple-600 text-white px-3 py-1.5 text-xs font-medium disabled:opacity-50"
                    title="Synthesise a newsletter draft from the research brief and social highlights"
                  >
                    {busy === `generate-${block.slug}` ? 'Generating…' : '✨ Generate draft'}
                  </button>
                  <button
                    onClick={() => copyForBeehiiv(block.slug)}
                    disabled={busy !== null}
                    className="rounded-lg bg-gray-700 hover:bg-gray-600 text-white px-3 py-1.5 text-xs font-medium disabled:opacity-50"
                  >
                    {copied === block.slug ? 'Copied!' : 'Copy formatted for Beehiiv'}
                  </button>
                  <button
                    onClick={() => save(block.slug)}
                    disabled={busy !== null}
                    className="rounded-lg bg-blue-600 hover:bg-blue-500 text-white px-3 py-1.5 text-xs font-medium disabled:opacity-50"
                  >
                    {busy === `save-${block.slug}` ? 'Saving…' : 'Save draft'}
                  </button>
                </div>
              </div>
              {(() => {
                const opts = block.newsletter?.subject_options;
                const subjects = Array.isArray(opts) ? (opts as unknown[]).filter((s): s is string => typeof s === 'string') : [];
                if (subjects.length === 0) return null;
                return (
                  <div className="rounded-xl border border-gray-700 bg-gray-900 p-3 space-y-1.5">
                    <p className="text-[12px] font-semibold uppercase tracking-wide text-gray-500">Subject line options</p>
                    {subjects.map((s, i) => (
                      <button
                        key={i}
                        onClick={() => { navigator.clipboard.writeText(s).catch(() => {}); }}
                        className="block w-full text-left text-sm text-gray-200 hover:text-white"
                        title="Click to copy"
                      >
                        · {s}
                      </button>
                    ))}
                  </div>
                );
              })()}
              <textarea
                value={edits[block.slug] ?? ''}
                onChange={e => setEdits(prev => ({ ...prev, [block.slug]: e.target.value }))}
                rows={16}
                placeholder="Hit ✨ Generate draft to synthesise a newsletter from the research brief and social highlights — then edit here. You can also write from scratch or pull individual content-library items in above."
                className="w-full bg-gray-800 border border-gray-600 rounded-lg px-3 py-2 text-gray-100 text-sm focus:outline-none focus:border-blue-500 font-sans leading-relaxed"
              />
            </section>
          </>
        )}
      </div>
    </div>
  );
}
