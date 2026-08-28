import { SITES } from '../lib/sites';
import { SITE_SOCIAL_ACCOUNTS, UNMAPPED_ACCOUNTS, type SocialAccountEntry } from '../lib/socialAccounts';

// ── Social Accounts — one place to see every live account across all five sites ──
// Direct links to the actual public profile/page for every account connected in
// Blotato, grouped by site, instead of hunting through devices and apps to check
// what's posted where. Links go to the real platform, not into Blotato.
//
// Data lives in app/lib/socialAccounts.ts — hand-edit that file as accounts change.

function AccountChip({ account }: { account: SocialAccountEntry }) {
  if (account.status === 'linked' && account.url) {
    return (
      <a
        href={account.url}
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-center gap-2 rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-gray-200 transition-colors hover:border-gray-500 hover:bg-gray-750"
      >
        <span className="font-medium">{account.platform}</span>
        <span className="text-gray-400">{account.handle}</span>
        <span className="ml-auto text-gray-500">↗</span>
      </a>
    );
  }

  if (account.status === 'needs_link') {
    return (
      <div
        title={account.note}
        className="flex items-center gap-2 rounded-lg border border-dashed border-amber-700/60 bg-amber-900/10 px-3 py-2 text-sm text-amber-300"
      >
        <span className="font-medium">{account.platform}</span>
        <span className="text-amber-400/80">{account.handle}</span>
        <span className="ml-auto rounded-full bg-amber-900/40 px-2 py-0.5 text-[11px] font-medium">Add link</span>
      </div>
    );
  }

  return (
    <div
      title={account.note}
      className="flex items-center gap-2 rounded-lg border border-gray-800 bg-gray-900/40 px-3 py-2 text-sm text-gray-500"
    >
      <span className="font-medium">{account.platform}</span>
      <span className="ml-auto rounded-full bg-gray-800 px-2 py-0.5 text-[11px] font-medium">Not connected</span>
    </div>
  );
}

export default function SocialAccountsPage() {
  return (
    <div className="min-h-screen bg-gray-950 text-white">
      {/* Header */}
      <div className="flex items-center gap-4 border-b border-gray-800 px-6 py-4">
        <a href="/" className="text-sm text-gray-400 hover:text-white">← Dashboard</a>
        <h1 className="text-lg font-semibold text-white">Social Accounts</h1>
      </div>

      <div className="mx-auto max-w-4xl space-y-6 px-6 py-8">
        <p className="text-sm text-gray-500">
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
              className="scroll-mt-20 rounded-xl border border-gray-700 bg-gray-900 p-5"
            >
              <div className="mb-4 flex items-center justify-between gap-3">
                <div>
                  <h2 className="text-sm font-semibold text-white">{site.name}</h2>
                  <p className="text-xs text-gray-500">{site.url}</p>
                </div>
                {needsAttention > 0 && (
                  <span className="rounded-full bg-amber-900/30 px-2 py-0.5 text-[11px] font-medium text-amber-300">
                    {needsAttention} need{needsAttention === 1 ? 's' : ''} attention
                  </span>
                )}
              </div>

              {accounts.length === 0 ? (
                <p className="text-xs text-gray-500">No accounts on record for this site.</p>
              ) : (
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                  {accounts.map(account => (
                    <AccountChip key={`${account.platform}-${account.handle}`} account={account} />
                  ))}
                </div>
              )}
            </section>
          );
        })}

        {/* ── Connected accounts that don't map to any of the five sites ── */}
        {UNMAPPED_ACCOUNTS.length > 0 && (
          <section className="rounded-xl border border-gray-800 bg-gray-900/60 p-5">
            <h2 className="mb-1 text-sm font-semibold text-gray-300">Not part of any site</h2>
            <p className="mb-4 text-xs text-gray-500">
              Connected in Blotato, but not one of the five sites — surfaced here rather than dropped silently.
            </p>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              {UNMAPPED_ACCOUNTS.map(account => (
                <a
                  key={`${account.platform}-${account.handle}`}
                  href={account.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-gray-200 transition-colors hover:border-gray-500 hover:bg-gray-750"
                >
                  <span className="font-medium">{account.platform}</span>
                  <span className="text-gray-400">{account.handle}</span>
                  <span className="ml-auto text-gray-500">↗</span>
                </a>
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
