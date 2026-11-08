import { SITES } from '../lib/sites';
import { SITE_SOCIAL_ACCOUNTS, UNMAPPED_ACCOUNTS, type SocialAccountEntry } from '../lib/socialAccounts';
import SocialFeed from '../components/SocialFeed';
import Link from 'next/link';

// ── Social Accounts — one place to see every live account across all five sites ──
// Direct links to the actual public profile/page for every account connected in
// Blotato, grouped by site, instead of hunting through devices and apps to check
// what's posted where. Links go to the real platform, not into Blotato.
//
// Each site's section also embeds SocialFeed (the same live-posts component used
// in the site card's Technical → Posts tab) so scheduled/published posts from the
// last 7 days are visible here too, not just profile links.
//
// Data lives in app/lib/socialAccounts.ts — hand-edit that file as accounts change.

function AccountChip({ account }: { account: SocialAccountEntry }) {
  if (account.status === 'linked' && account.url) {
    return (
      <a
        href={account.url}
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-center gap-2 rounded-lg border border-line-2 bg-panel-2 px-3 py-2 text-sm text-fg transition-colors hover:border-line-2 hover:brightness-125"
      >
        <span className="font-medium">{account.platform}</span>
        <span className="text-fg-2">{account.handle}</span>
        <span className="ml-auto text-fg-3">↗</span>
      </a>
    );
  }

  if (account.status === 'needs_link') {
    return (
      <div
        title={account.note}
        className="flex items-center gap-2 rounded-lg border border-dashed border-warn/60 bg-warn/10 px-3 py-2 text-sm text-warn"
      >
        <span className="font-medium">{account.platform}</span>
        <span className="text-warn">{account.handle}</span>
        <span className="ml-auto rounded-full bg-warn/15 px-2 py-0.5 text-[11px] font-medium">Add link</span>
      </div>
    );
  }

  return (
    <div
      title={account.note}
      className="flex items-center gap-2 rounded-lg border border-line bg-panel/40 px-3 py-2 text-sm text-fg-3"
    >
      <span className="font-medium">{account.platform}</span>
      <span className="ml-auto rounded-full bg-panel-2 px-2 py-0.5 text-[11px] font-medium">Not connected</span>
    </div>
  );
}

export default function SocialAccountsPage() {
  return (
    <div className="min-h-screen bg-bg text-fg">
      {/* Header */}
      <div className="flex items-center gap-4 border-b border-line px-6 py-4">
        <Link href="/" className="text-sm text-fg-2 hover:text-fg">← Dashboard</Link>
        <h1 className="text-lg font-semibold text-fg">Social Accounts</h1>
      </div>

      <div className="mx-auto max-w-4xl space-y-6 px-6 py-8">
        <p className="text-sm text-fg-3">
          Every live social account across all five sites, in one place. Links go to the actual
          public profile or page — not into Blotato.
        </p>

        {SITES.map(site => {
          const accounts = SITE_SOCIAL_ACCOUNTS[site.id] ?? [];
          const needsAttention = accounts.filter(a => a.status !== 'linked').length;
          return (
            <section
              key={site.id}
              id={site.id}
              className="scroll-mt-20 rounded-xl border border-line-2 bg-panel p-5"
            >
              <div className="mb-4 flex items-center justify-between gap-3">
                <div>
                  <h2 className="text-sm font-semibold text-fg">{site.name}</h2>
                  <p className="text-xs text-fg-3">{site.url}</p>
                </div>
                {needsAttention > 0 && (
                  <span className="rounded-full bg-warn/15 px-2 py-0.5 text-[11px] font-medium text-warn">
                    {needsAttention} need{needsAttention === 1 ? 's' : ''} attention
                  </span>
                )}
              </div>

              {accounts.length === 0 ? (
                <p className="text-xs text-fg-3">No accounts on record for this site.</p>
              ) : (
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                  {accounts.map(account => (
                    <AccountChip key={`${account.platform}-${account.handle}`} account={account} />
                  ))}
                </div>
              )}

              <div className="mt-4 border-t border-line pt-4">
                <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-fg-3">Recent posts</p>
                <SocialFeed siteId={site.id} />
              </div>
            </section>
          );
        })}

        {/* ── Connected accounts that don't map to any of the five sites ── */}
        {UNMAPPED_ACCOUNTS.length > 0 && (
          <section className="rounded-xl border border-line bg-panel/60 p-5">
            <h2 className="mb-1 text-sm font-semibold text-fg">Not part of any site</h2>
            <p className="mb-4 text-xs text-fg-3">
              Connected in Blotato, but not one of the five sites — surfaced here rather than dropped silently.
            </p>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              {UNMAPPED_ACCOUNTS.map(account => (
                <a
                  key={`${account.platform}-${account.handle}`}
                  href={account.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 rounded-lg border border-line-2 bg-panel-2 px-3 py-2 text-sm text-fg transition-colors hover:border-line-2 hover:brightness-125"
                >
                  <span className="font-medium">{account.platform}</span>
                  <span className="text-fg-2">{account.handle}</span>
                  <span className="ml-auto text-fg-3">↗</span>
                </a>
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
