"use client";

// ── Old Oak Town admin notifications + promotion ─────────────────────────────
// Surfaces businesses/events awaiting approval on oldoaktown.co.uk's own admin
// dashboard, and lets Didi kick off drafting a spotlight post for any newly
// approved business. Drafts land in the normal Review Queue (/review) — this
// never publishes anything by itself.

import { useCallback, useEffect, useState } from "react";
import type { OldOakTownStatus } from "../api/oldoaktown/route";

interface PromoteResult {
  businessId: string;
  businessName: string;
  platforms: string[];
  error?: string;
}

function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);
  if (diff < 60000) return "just now";
  if (mins < 60) return `${mins}m ago`;
  if (hours < 24) return `${hours}h ago`;
  return `${days}d ago`;
}

export default function OldOakTownAdmin() {
  const [status, setStatus] = useState<OldOakTownStatus | null>(null);
  const [promoting, setPromoting] = useState(false);
  const [promoteResult, setPromoteResult] = useState<PromoteResult[] | null>(null);
  const [promoteError, setPromoteError] = useState<string | null>(null);

  const load = useCallback(() => {
    fetch("/api/oldoaktown")
      .then(r => (r.ok ? r.json() : null))
      .then((d: OldOakTownStatus | null) => setStatus(d))
      .catch(() => setStatus(null));
  }, []);

  useEffect(() => {
    load();
    const id = setInterval(load, 60_000);
    return () => clearInterval(id);
  }, [load]);

  async function handlePromote() {
    setPromoting(true);
    setPromoteError(null);
    setPromoteResult(null);
    try {
      const res = await fetch("/api/oldoaktown/promote", { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Promotion failed");
      setPromoteResult(data.promoted ?? []);
      load(); // refresh readyToPromote count
    } catch (err) {
      setPromoteError(err instanceof Error ? err.message : "Promotion failed");
    } finally {
      setPromoting(false);
    }
  }

  const pendingBusinesses = status?.businesses.pending ?? null;
  const pendingEvents = status?.events.pending ?? null;
  const readyToPromote = status?.readyToPromote ?? 0;
  const businessCount = pendingBusinesses?.length ?? 0;
  const eventCount = pendingEvents?.length ?? 0;
  const totalUrgent = businessCount + eventCount;

  return (
    <section className="rounded-2xl p-5" style={{ background: "var(--hub-surface)", border: "1px solid var(--hub-border)" }}>
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h2 className="text-sm font-semibold" style={{ color: "var(--hub-text-1)" }}>Old Oak Town Admin</h2>
          <p className="text-[13px]" style={{ color: "var(--hub-text-3)" }}>Approvals waiting on oldoaktown.co.uk</p>
        </div>
        <a
          href="https://www.oldoaktown.co.uk/admin/dashboard.html"
          target="_blank"
          rel="noopener noreferrer"
          className="rounded-lg px-3 py-1.5 text-xs font-medium transition-all hover:brightness-125"
          style={{ background: "var(--hub-surface-2)", color: "var(--hub-text-2)", border: "1px solid var(--hub-border)" }}
        >
          Open admin dashboard →
        </a>
      </div>

      {status === null ? (
        <div className="py-6 text-center text-xs" style={{ color: "var(--hub-text-3)" }}>Loading…</div>
      ) : (
        <div className="flex flex-col gap-3">
          {totalUrgent > 0 && (
            <div className="rounded-lg px-3 py-2" style={{ background: "rgba(248,113,113,0.1)", border: "1px solid rgba(248,113,113,0.25)" }}>
              <p className="text-xs font-medium" style={{ color: "#f87171" }}>
                {totalUrgent} item{totalUrgent === 1 ? "" : "s"} waiting on your approval
              </p>
            </div>
          )}

          {/* Pending businesses */}
          <div>
            <div className="mb-1 flex items-center justify-between">
              <span className="text-[12px] font-medium uppercase tracking-widest" style={{ color: "var(--hub-text-3)" }}>
                New businesses
              </span>
              <span
                className="rounded-full px-2 py-0.5 text-[12px] font-semibold"
                style={{
                  background: businessCount > 0 ? "rgba(248,113,113,0.15)" : "var(--hub-surface-2)",
                  color: businessCount > 0 ? "#f87171" : "var(--hub-text-3)",
                }}
              >
                {pendingBusinesses === null ? "—" : businessCount}
              </span>
            </div>
            {pendingBusinesses === null ? (
              <p className="text-xs" style={{ color: "var(--hub-text-3)" }}>Couldn&rsquo;t reach oldoaktown.co.uk — will retry.</p>
            ) : businessCount === 0 ? (
              <p className="text-xs" style={{ color: "var(--hub-text-3)" }}>Nothing awaiting approval.</p>
            ) : (
              <ul className="flex flex-col gap-1">
                {pendingBusinesses.slice(0, 5).map(b => (
                  <li key={b.id} className="flex items-center justify-between text-xs">
                    <span style={{ color: "var(--hub-text-1)" }}>{b.name}</span>
                    <span style={{ color: "var(--hub-text-3)" }}>
                      {b.status === "pending_payment" ? "awaiting payment" : relativeTime(b.createdAt)}
                    </span>
                  </li>
                ))}
                {businessCount > 5 && (
                  <li className="text-[12px]" style={{ color: "var(--hub-text-3)" }}>+{businessCount - 5} more</li>
                )}
              </ul>
            )}
          </div>

          {/* Pending events */}
          <div>
            <div className="mb-1 flex items-center justify-between">
              <span className="text-[12px] font-medium uppercase tracking-widest" style={{ color: "var(--hub-text-3)" }}>
                New events
              </span>
              <span
                className="rounded-full px-2 py-0.5 text-[12px] font-semibold"
                style={{
                  background: eventCount > 0 ? "rgba(248,113,113,0.15)" : "var(--hub-surface-2)",
                  color: eventCount > 0 ? "#f87171" : "var(--hub-text-3)",
                }}
              >
                {pendingEvents === null ? "—" : eventCount}
              </span>
            </div>
            {pendingEvents === null ? (
              <p className="text-xs" style={{ color: "var(--hub-text-3)" }}>
                Set <code>OLDOAKTOWN_ADMIN_PASSWORD</code> in Command Hub&rsquo;s environment to see pending events here.
              </p>
            ) : eventCount === 0 ? (
              <p className="text-xs" style={{ color: "var(--hub-text-3)" }}>Nothing awaiting approval.</p>
            ) : (
              <ul className="flex flex-col gap-1">
                {pendingEvents.slice(0, 5).map(e => (
                  <li key={e.id} className="flex items-center justify-between text-xs">
                    <span style={{ color: "var(--hub-text-1)" }}>{e.title}</span>
                    <span style={{ color: "var(--hub-text-3)" }}>{e.eventDate ?? "date TBC"}</span>
                  </li>
                ))}
                {eventCount > 5 && (
                  <li className="text-[12px]" style={{ color: "var(--hub-text-3)" }}>+{eventCount - 5} more</li>
                )}
              </ul>
            )}
          </div>

          {/* Promote newly approved businesses */}
          <div className="pt-2" style={{ borderTop: "1px solid var(--hub-border)" }}>
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-xs font-medium" style={{ color: "var(--hub-text-1)" }}>
                  {readyToPromote > 0
                    ? `${readyToPromote} approved business${readyToPromote === 1 ? "" : "es"} ready to spotlight`
                    : "No new approvals to promote"}
                </p>
                <p className="text-[12px]" style={{ color: "var(--hub-text-3)" }}>
                  Drafts a social + newsletter spotlight per business into the Review Queue — nothing publishes automatically.
                </p>
              </div>
              <button
                onClick={handlePromote}
                disabled={promoting || readyToPromote === 0}
                className="shrink-0 rounded-lg px-3 py-1.5 text-xs font-medium transition-all hover:brightness-125 disabled:opacity-40"
                style={{ background: "var(--hub-accent)", color: "#fff" }}
              >
                {promoting ? "Drafting…" : "Promote new businesses"}
              </button>
            </div>

            {promoteError && (
              <p className="mt-2 text-xs" style={{ color: "#f87171" }}>{promoteError}</p>
            )}

            {promoteResult && promoteResult.length > 0 && (
              <div className="mt-2 flex flex-col gap-1">
                {promoteResult.map(r => (
                  <p key={r.businessId} className="text-[12px]" style={{ color: r.error ? "#f87171" : "#34d399" }}>
                    {r.error
                      ? `${r.businessName} — failed: ${r.error}`
                      : `${r.businessName} — drafted for ${r.platforms.join(", ")}`}
                  </p>
                ))}
                <a href="/review" className="mt-1 text-[12px] font-medium hover:brightness-125" style={{ color: "var(--hub-accent)" }}>
                  Review these drafts →
                </a>
              </div>
            )}
          </div>
        </div>
      )}
    </section>
  );
}
