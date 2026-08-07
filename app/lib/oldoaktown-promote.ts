// ── Promote newly-approved Old Oak Town businesses ───────────────────────────
// Shared by two callers:
//   • POST /api/oldoaktown/promote — the manual "Promote new businesses"
//     button, gated behind the Hub's normal hub_auth cookie.
//   • POST /api/oldoaktown/webhook — fired by oldoaktown's own api/approve.js
//     the moment a business is approved there, gated behind a shared secret
//     instead of the cookie (it's a server-to-server call, not a browser).
//
// Finds businesses approved on oldoaktown.co.uk that haven't been promoted yet
// (tracked in oldoaktown_business_promotions), drafts a "Business Spotlight"
// post per platform for each, and writes them into content_library exactly
// like the weekly content pipeline does. That single insert is deliberate —
// it makes each spotlight:
//   • appear in the existing Review Queue (/review), and
//   • feed into The Oak's newsletter draft automatically, since
//     /api/newsletters/draft already pulls grader_verdict='pass' content_library
//     rows for site_id='oldoaktown'.
//
// Auto-publish: if OLDOAKTOWN_AUTO_PUBLISH_SPOTLIGHTS=true, the Facebook and
// LinkedIn captions are pushed to Blotato immediately (both publish fine
// without media). Instagram always stays a draft in the Review Queue — it
// requires an attached image (MEDIA_REQUIRED_PLATFORMS), which nothing here
// can generate, so it always needs a human regardless of this flag. This flag
// defaults OFF: without it, every platform lands in the Review Queue exactly
// like today, and a human approves + pushes as normal.

import Anthropic from '@anthropic-ai/sdk';
import { getSupabase } from '@/app/lib/supabase';
import { fetchApprovedBusinesses, type OldOakBusiness } from '@/app/lib/oldoaktown';
import { getSiteConfig } from '@/agents/site-configs';
import { mondayOf, weekdayShort } from '@/app/lib/weekDates';
import { ACCOUNT_MAP, MEDIA_REQUIRED_PLATFORMS } from '@/agents/accounts';
import { callBlotato } from '@/app/lib/blotato';

const MODEL = 'claude-sonnet-4-6';
const MAX_PER_RUN = 8; // cap Claude calls per invocation

const WEEKDAY_FULL: Record<string, string> = {
  Sun: 'Sunday', Mon: 'Monday', Tue: 'Tuesday', Wed: 'Wednesday',
  Thu: 'Thursday', Fri: 'Friday', Sat: 'Saturday',
};

const SPOTLIGHT_PLATFORMS = ['Instagram', 'Facebook', 'LinkedIn'] as const;

interface SpotlightPost {
  platform: string;
  caption: string;
}

export interface PromoteResult {
  businessId: string;
  businessName: string;
  platforms: string[];  // platforms a draft was created for
  published: string[];  // subset of `platforms` auto-published to Blotato
  error?: string;
}

function businessFacts(b: OldOakBusiness): string {
  const lines = [
    `Business name: ${b.business_name}`,
    `Category: ${b.category ?? 'not specified'}`,
    `Description (as submitted): ${b.description ?? 'not provided'}`,
    `Location: ${[b.address, b.postcode].filter(Boolean).join(', ') || 'not provided'}`,
  ];
  if (b.website)   lines.push(`Website: ${b.website}`);
  if (b.instagram) lines.push(`Instagram: ${b.instagram}`);
  if (b.twitter)   lines.push(`Twitter/X: ${b.twitter}`);
  if (b.linkedin)  lines.push(`LinkedIn: ${b.linkedin}`);
  return lines.join('\n');
}

async function draftSpotlight(claude: Anthropic, business: OldOakBusiness): Promise<SpotlightPost[]> {
  const site = getSiteConfig('oldoaktown');

  const system = `${site.subagentSystemPrompt}

TASK: Write a "Business Spotlight" — a post welcoming a newly-approved local business to the Old Oak Town directory. This is one of the standing content formats for this site: name the business, what they do, where they are, and why they matter to the Old Oak / Park Royal community.

CRITICAL: Only use the facts about this business given to you below. Do not invent opening dates, offers, reviews, or details not present in the submission. If a field is "not provided", write around it honestly rather than guessing.

Write one caption per platform:
- Instagram: 80-150 words, punchy opening line, warm and welcoming, end with 5-8 hashtags including #OldOak #WestLondon #OldOakCommon plus 2-3 specific to the business/category.
- Facebook: 150-280 words, conversational and story-led, invite the community to visit or follow.
- LinkedIn: 100-200 words, frame it through the regeneration/investment lens — a new business choosing to invest in Old Oak Common as the area grows.

Return ONLY valid JSON, no markdown fences, in this exact shape:
{ "posts": [ { "platform": "Instagram", "caption": "..." }, { "platform": "Facebook", "caption": "..." }, { "platform": "LinkedIn", "caption": "..." } ] }`;

  const user = `New approved business to spotlight:\n\n${businessFacts(business)}`;

  const response = await claude.messages.create({
    model: MODEL,
    max_tokens: 2048,
    system,
    messages: [{ role: 'user', content: user }],
  });

  const textBlock = response.content.find(b => b.type === 'text');
  if (!textBlock || textBlock.type !== 'text') throw new Error('Unexpected response from the model');

  const cleaned = textBlock.text.replace(/^```(?:json)?\s*/i, '').replace(/\s*```\s*$/, '').trim();
  const parsed = JSON.parse(cleaned) as { posts?: SpotlightPost[] };
  const posts = Array.isArray(parsed.posts) ? parsed.posts : [];

  return SPOTLIGHT_PLATFORMS
    .map(platform => posts.find(p => p.platform === platform))
    .filter((p): p is SpotlightPost => !!p && typeof p.caption === 'string' && p.caption.trim().length > 0);
}

export async function promoteOldOakTownBusinesses(
  requestedIds?: string[],
): Promise<PromoteResult[] | { configError: string }> {
  if (!process.env.ANTHROPIC_API_KEY) {
    return { configError: 'ANTHROPIC_API_KEY is not configured' };
  }

  const approved = await fetchApprovedBusinesses();
  if (approved === null) {
    return { configError: 'Could not reach Old Oak Town — try again shortly' };
  }

  const supabase = getSupabase();
  const { data: promotedRows, error: promotedErr } = await supabase
    .from('oldoaktown_business_promotions')
    .select('business_id')
    .in('business_id', approved.map(b => b.id));
  if (promotedErr) throw promotedErr;

  const promotedIds = new Set((promotedRows ?? []).map(r => r.business_id as string));
  let candidates = approved.filter(b => !promotedIds.has(b.id));
  if (requestedIds?.length) {
    const wanted = new Set(requestedIds);
    candidates = candidates.filter(b => wanted.has(b.id));
  }
  candidates = candidates.slice(0, MAX_PER_RUN);

  if (candidates.length === 0) return [];

  const claude = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  const weekCommencing = mondayOf();
  const autoPublish = process.env.OLDOAKTOWN_AUTO_PUBLISH_SPOTLIGHTS === 'true';
  const blotatoKey = process.env.BLOTATO_API_KEY;

  const results: PromoteResult[] = [];

  for (const business of candidates) {
    try {
      const posts = await draftSpotlight(claude, business);
      if (posts.length === 0) throw new Error('Model returned no usable captions');

      const dayName = `${WEEKDAY_FULL[weekdayShort(new Date().toISOString().slice(0, 10))]} · Spotlight: ${business.business_name}`.slice(0, 200);

      const rows = posts.map(p => ({
        site_id:         'oldoaktown',
        week_commencing:  weekCommencing,
        day_name:         dayName,
        platform:         p.platform,
        grader_verdict:  'pass',
        retry_count:      0,
        content:          p.caption.trim(),
        generated_at:     new Date().toISOString(),
        status:          'draft',
        push_error:       null,
      }));

      const { data: inserted, error: insertErr } = await supabase
        .from('content_library')
        .insert(rows)
        .select('id, platform');
      if (insertErr) throw insertErr;

      // Auto-publish (opt-in): only platforms that don't need media. Instagram
      // always stays a draft — nothing here can attach an image for it.
      const published: string[] = [];
      if (autoPublish && blotatoKey) {
        for (const row of (inserted ?? []) as { id: string; platform: string }[]) {
          const acct = ACCOUNT_MAP.oldoaktown?.[row.platform];
          if (!acct || MEDIA_REQUIRED_PLATFORMS.has(acct.platform)) continue;

          const post = posts.find(p => p.platform === row.platform);
          if (!post) continue;

          const scheduledIso = new Date(Date.now() + 5 * 60_000).toISOString();
          const { postSubmissionId, error: pushErr } = await callBlotato(
            blotatoKey, acct.accountId, acct.platform, post.caption.trim(),
            { targetType: acct.platform, ...acct.target }, [], scheduledIso,
          );

          if (pushErr) {
            await supabase.from('content_library').update({ push_error: pushErr }).eq('id', row.id);
          } else {
            await supabase.from('content_library').update({
              status:                'pushed',
              approved_at:           new Date().toISOString(),
              blotato_submission_id: postSubmissionId ?? null,
              scheduled_for:         scheduledIso,
            }).eq('id', row.id);
            published.push(row.platform);
          }
        }
      }

      // If this insert fails, don't report the business as promoted — a
      // silent failure here means dedup never sticks and the next run
      // re-drafts the same business (this exact bug happened once already:
      // the column type was wrong, see migration 20260807170000).
      const { error: promoErr } = await supabase.from('oldoaktown_business_promotions').insert({
        business_id:         business.id,
        business_name:       business.business_name,
        content_library_id: inserted?.[0]?.id ?? null,
      });
      if (promoErr) throw promoErr;

      results.push({
        businessId: business.id,
        businessName: business.business_name,
        platforms: posts.map(p => p.platform),
        published,
      });
    } catch (err) {
      results.push({
        businessId: business.id, businessName: business.business_name,
        platforms: [], published: [], error: String(err),
      });
    }
  }

  return results;
}
