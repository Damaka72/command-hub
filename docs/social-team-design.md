# Social team design: one engine, three brands now, World of Contracts next

Status: AGREED MODEL, build not started. Nothing here has been scheduled or published.
Updated 9 Nov 2026 after Didi's answers. Brands in scope: Old Oak Town (OOT), AI Viral Video Prompts (AIVVP), Master Your Career Path (MYCP). World of Contracts (WoC) joins later as a new brand file. The Concurrent Contractor (TCC) no longer exists and is out of scope.

## 1. The decisions

1. **Engine**: the weekly Cowork run (Saturday 06:55, London) stays as the engine for research and drafting. The repo's own drafting pipeline (`agents/coordinator.ts`, `subagents.ts`, `pipeline.ts`) is retired. Kept from it: the fact-checking grader, the content pillars, and the Supabase `content_library` with its rule that approved rows are never overwritten.
2. **One engine for every brand**: whatever one brand's agents do, all do. Brands differ only in their brand file (voice, pillars, platforms, facts, rules).
3. **Three layers**: base (monthly), focus (weekly) and flex (Wednesday pulse). See section 4.
4. **Cadence**: daily, Monday to Saturday, as 6 ideas per brand per week. Sunday is review day.
5. **Review**: one 15-minute Sunday batch. Didi decides on flagged items; everything else gets one "approve all and schedule" action. Nothing publishes without Didi's sign-off.
6. **OPERATE is live.** The site said "Now open: £27/month, or £47/month with PRIME" on 17 Oct. Didi to confirm this is still the offer. All agent rules that say "waitlist-only" or "coming soon" are out of date.

## 2. What the review found

| Finding | Evidence |
|---|---|
| Posting is irregular | Blotato shows nothing published 14 Sep to 11 Oct, and nothing scheduled on 9 Nov. Last post per brand: AIVVP 6 Sep, MYCP 18 Oct, OOT 28 Oct. |
| Drafts are produced but not actioned | 787 rows in `content_library`. None marked pushed since 31 Aug. Weekly drafts for w/c 2 Nov and w/c 9 Nov are all still `draft`. 41 approved MYCP drafts from w/c 26 Oct were never pushed. |
| Published posts carried retired facts | 42 MYCP posts say "Join the Skool community ($27/month)" (last 10 Sep). 5 AIVVP posts quote "$492.73" or "620 sales", which have no source. 38 AIVVP posts say "45,000 prompts" instead of "46,000+ prompts across 13 collections". |
| Old facts remain in drafts | 31 current AIVVP drafts carry old prompt counts. MYCP drafts for w/c 26 Oct and w/c 9 Nov describe OPERATE as not live. |
| A fact changed and the agents did not know | OPERATE went from waitlist to live. The repo config and Saturday prompt still say waitlist-only. |
| Two layers, not connected | The weekly run says it "cannot see the monthly evergreen pack". The monthly pack does not appear in `content_library`, so the hub cannot track it. |
| No feedback loop | Best post found: 201 views, 0 comments across the sample. Blotato analytics cover only X, Instagram, Facebook, Threads and Bluesky. |
| Visuals are intermittent | Free cards were made on 10 Oct and 7 Nov, but Blotato visual tools were logged as unavailable on 17 Oct. About a quarter of drafts have media; Instagram and TikTok cannot publish without it. |
| Stale automation | "Command hub pipeline reminder" (disabled) still tells Didi to run the old repo pipeline. "Routine repurpose sweep" is disabled. |

## 3. What already works and stays

- **Saturday weekend run** (trigger "Weekend content brief and drafts"): research briefs, drafts, free Blotato cards, newsletter drafts, one log entry per site. It never publishes. Shoestring rules stay: about $30 a month ceiling, 100 Blotato credits per run, no Higgsfield, no HyperFrames.
- **OOT events discovery** (Mondays 07:00): verified events into `public.events` as `pending`.
- **Morning brief** (weekdays 06:17).
- **Hub**: review queue, the one push route (`/api/review/push`, the only publisher), Friday report, weekly rhythm.
- **Skills**: `brand-reject-lists`, `post-writer`, `post-grader`, `post-scheduler`, `video-producer`, `video-batch-producer`.

## 4. The posting model (the same for every brand)

Think of a magazine: standing columns, a cover story, and a news flash.

| Layer | What it is | Per week per brand | Made | Didi's involvement |
|---|---|---|---|---|
| Base | Evergreen posts that rotate through the brand's six pillars | 3 ideas | Once a month, in a monthly run | One approval a month |
| Focus | The posts Didi cares about: timely, with a card or video | 2 ideas | Saturday run | Sunday 15 minutes |
| Flex | A reactive post, only if something real breaks | 1 idea | Wednesday pulse | A quick same-day yes |

**Rules for the base layer**
- Evergreen only. No prices, offers or product-status claims, because base posts are written weeks before they go out. OPERATE changing from waitlist to live is exactly how a monthly pack goes stale.
- Every post is re-checked by the Brand gate against live facts in the week it goes out, whatever layer it came from.
- Base posts live in the same table as everything else, tagged `layer = base`, so the weekly run can see the calendar and avoid overlaps.

**Fan-out: one idea, adapted per platform**
- LinkedIn and Facebook: every idea (6 a week).
- Instagram: ideas that have a free card or carousel (about 4 a week).
- TikTok (MYCP and AIVVP): the one or two focus videos only.
- Result: roughly 16 to 18 posts per brand per week, all adapted from 6 ideas, so Didi reviews ideas, not posts.
- After four weeks, use Blotato and Beehiiv results to prune platforms that earn nothing.

**Platforms per brand today**: OOT: Facebook, Instagram, LinkedIn. AIVVP: TikTok, Instagram, Facebook, LinkedIn (Pinterest paused: the pin failed with "this site doesn't allow you to save Pins"). MYCP: LinkedIn, Instagram, TikTok, Facebook.

## 5. The team (same roles for every brand)

| Role | Job | Runs | Output |
|---|---|---|---|
| 1. Scout | Real, dated research. Lists "not verified, do not publish". | Saturday deep run; Wednesday pulse | `research_briefs` |
| 2. Planner | Picks pillar and angle, assigns the 6 idea slots, sets the production plan | Monthly (base) and Saturday (focus) | Calendar with layer tags |
| 3. Writer | Writes each idea once, then adapts it per platform | Monthly and Saturday | `content_library` rows, status `draft` |
| 4. Brand gate | Checks every draft against the reject list, verified facts and live prices. Verdict: `ready`, `flagged` or `blocked` | Straight after writing, and again the week a post goes out | Verdict on each row |
| 5. Visual desk | Cheapest tool that works: free Blotato cards, then AI Story Video under the credit cap, then a video brief for Didi to film. OOT never uses AI imagery. | Saturday; retry Sunday morning if tools failed | `media_urls` on the row |
| 6. Scheduler | After Didi's sign-off, pushes approved rows through the hub route at the right London times | Sunday | Rows `pushed` with Blotato ids |
| 7. Analyst | Reads Blotato and Beehiiv results, writes three lines on what worked | Friday | Note per brand in `actions_log` |

## 6. The week

1. **Last Saturday of the month**: monthly run drafts the next month's base posts. Brand gate checks them. Didi approves them in one sitting.
2. **Saturday 06:55**: weekly run: research, focus drafts, Brand gate, visuals.
3. **Saturday**: Didi gets a digest, flagged items first, each with its reason.
4. **Sunday, about 15 minutes**: Didi decides on flagged items. Everything `ready`, including this week's base posts, gets one "approve all and schedule" action. Base posts that the gate re-flags (a stale fact, say) come to the top.
5. **Sunday**: Scheduler pushes. Rows still missing required media are listed, never silently dropped.
6. **Monday to Saturday**: posts publish. OOT events discovery runs Monday.
7. **Wednesday 07:00, 15-minute pulse**: Scout checks for real news per brand. If there is something, Writer drafts the flex post and Didi gets a notification for a same-day yes. If not, it reports "nothing worth posting" rather than padding.
8. **Friday**: Analyst note and the hub Friday report, feeding next Saturday.

## 7. The shared brand configuration

One file per brand (`brands/<id>`), read by the Writer, the Brand gate and the Scheduler. A new brand is a new file.

Each file holds: audience; voice; pillars; platforms and account ids (from `agents/accounts.ts`); posting times; palette and fonts; confirmed products and prices (checked against the live site each run); verified facts; the reject list; hard rules. Examples: OOT: no AI imagery, zero invented local detail. MYCP: pounds only, no Skool mention, OPERATE live (offer wording from the live site). AIVVP: "46,000+ prompts across 13 collections", no sales statistic unless Didi confirms it and its source.

`brand-reject-lists` remains Didi's canonical wording. Where a brand file restates it, any difference is flagged to Didi, never resolved silently. The diversity instruction in `AGENTS.md` applies to every brief that involves people.

## 8. Brand gate outcomes

| Verdict | Meaning | What Didi sees |
|---|---|---|
| `ready` | No reject-list hit, every fact traceable to the brief or verified facts, prices and product status match the live site | Approved with one action |
| `flagged` | A possible problem, or a fact the gate cannot verify | Listed first, with the reason and a suggested fix |
| `blocked` | Hard-rule breach (a Skool mention, a fabricated statistic, a claim contradicting the live site) | Not offered for approval until fixed |

The gate reports why. It does not quietly rewrite a draft into vaguer wording.

## 9. World of Contracts later

Add `brands/worldofcontracts`, connect its accounts in Blotato, add them to `agents/accounts.ts`, and add one section to the weekly and monthly runs. Its tracker already exists in the hub. No new roles are needed.

## 10. Build order (each step needs Didi's go-ahead)

0. **This week**: triage this week's drafts (AIVVP 24, MYCP 24, OOT 18) against the brand rules and the OPERATE change, so something publishes now.
1. Remove TCC: delete the unpublished TCC rows; remove TCC from the Saturday run prompt and the repo; decide on the Instagram account and the newsletter section (section 11).
2. Brand files and the Brand gate, including a sweep of existing drafts for the retired facts and the old OPERATE wording.
3. Update the Saturday run prompt: OPERATE live, no TCC, gate step, layer tags, Sunday visual retry, Wednesday pulse, Analyst note. Create the monthly run.
4. Hub Sunday view: flagged first, one-action approve for `ready` rows, media-needed list.
5. Retire the repo drafting pipeline; keep the grader logic and pillars.
6. Onboard World of Contracts.

## 11. Open points

- **OPERATE offer**: confirm "£27/month, or £47/month with PRIME" is still current.
- **Monthly pack**: where it is reviewed and scheduled today. It does not appear in `content_library`.
- **TCC leftovers**: the Instagram account @theconcurrentcontractor is still connected in Blotato with 8 published posts; The Pathway newsletter has a TCC section; research briefs for TCC exist.

## 12. What I have not seen

- The monthly evergreen pack and its review documents.
- Blotato posts before 22 Jul, and Beehiiv performance.
- Anything the Saturday run does beyond its written prompt and its log entries.
