# Social team design: one template, three brands now, World of Contracts next

Status: DRAFT for Didi's sign-off. Nothing here has been built or scheduled.
Written 9 Nov 2026. Brands in scope: Old Oak Town (OOT), AI Viral Video Prompts (AIVVP), Master Your Career Path (MYCP). World of Contracts (WoC) joins later as a new config file.

## 1. The decision in one paragraph

The weekly Cowork run (Saturday 06:55, London) stays as the engine for research and drafting. The repo's own drafting pipeline (`agents/coordinator.ts`, `subagents.ts`, `pipeline.ts`) is retired. We keep what it does well: the fact-checking grader, the content pillars, and the Supabase `content_library`, whose rule that approved rows are never overwritten is worth keeping. We add one shared brand gate that every draft passes before Didi sees it, and a single 15-minute Sunday batch where Didi only decides on flagged items and approves the rest with one action. Nothing publishes without Didi's sign-off; that rule does not change.

## 2. What the review found (the evidence behind the design)

| Finding | Evidence |
|---|---|
| Posting is irregular | Blotato shows nothing published 14 Sep to 11 Oct, and nothing scheduled today. Last post per brand: AIVVP 6 Sep, MYCP 18 Oct, OOT 28 Oct. |
| Drafts are produced but not actioned | 787 rows in `content_library`. None marked pushed since 31 Aug. 84 drafts for this week (w/c 9 Nov) and 84 for last week are all still `draft`. 41 approved MYCP drafts from w/c 26 Oct were never pushed. |
| Published posts carried retired facts | 42 MYCP posts say "Join the Skool community ($27/month)" (last 10 Sep). 5 AIVVP posts quote "$492.73" or "620 sales", which have no source. 38 AIVVP posts use "45,000 prompts" instead of "46,000+ prompts across 13 collections". |
| Old facts are still in drafts | 31 current AIVVP drafts still carry old prompt counts. 26 MYCP drafts mention OPERATE; the rule is now "waitlist-only". |
| Facts conflict across sources | OPERATE: repo config and Didi say waitlist-only; the live site was reported on 17 Oct as "open at £27/month". |
| No feedback loop | Best post found: 201 views, 0 comments across the sample. Blotato analytics cover only X, Instagram, Facebook, Threads and Bluesky. The Saturday run does read analytics (its Step 1), but there is no record of what it learned. |
| Visuals are intermittent | The Saturday run made free cards on 10 Oct and 7 Nov, but logged Blotato visual tools as unavailable on 17 Oct. Only about a quarter of drafts have media attached, and Instagram and TikTok cannot publish without it. |
| Stale automation | "Command hub pipeline reminder" (disabled) still tells Didi to run the old repo pipeline. "Routine repurpose sweep" is disabled. |

## 3. What already works and stays

- **Saturday weekend run** (trigger `Weekend content brief and drafts`): research briefs, drafts, free Blotato cards, newsletter drafts, and a log entry per site. It never publishes. Its shoestring rules stay: about $30 a month ceiling, 100 Blotato credits per run, no Higgsfield, no HyperFrames.
- **OOT events discovery** (Mondays 07:00): finds verified events into `public.events` as `pending`.
- **Morning brief** (weekdays 06:17).
- **Hub**: review queue, the one push route (`/api/review/push`, the only publisher), Friday report, weekly rhythm.
- **Skills**: `brand-reject-lists`, `post-writer`, `post-grader`, `post-scheduler`, `video-producer`, `video-batch-producer`.

## 4. The team (same seven roles for every brand)

| Role | Job | Runs | Output |
|---|---|---|---|
| 1. Scout | Real, dated research for the brand's audience. Lists "not verified, do not publish". | Saturday deep run; Wednesday 15-minute pulse (proposed) | `research_briefs` |
| 2. Planner | Picks pillar and angle, sets the day-by-platform production plan, avoids repeating the monthly pack | Saturday | Brief with production plan |
| 3. Writer | Drafts each post in the brand's voice for each platform | Saturday | `content_library` rows, status `draft` |
| 4. Brand gate | Checks every draft against the brand's reject list, verified facts and live prices. Marks it `ready`, `flagged` (with reason) or `blocked` | Saturday, straight after writing | Verdict on each row |
| 5. Visual desk | Cheapest tool that works: free Blotato cards first, then AI Story Video under the credit cap, then a video brief for Didi to film. OOT never uses AI imagery. | Saturday; retry on Sunday morning if tools failed | `media_urls` on the row |
| 6. Scheduler | After Didi's sign-off, pushes approved rows through the hub route at the right London times | Sunday, after review | Rows `pushed` with Blotato ids |
| 7. Analyst | Reads Blotato and Beehiiv results, writes three lines on what worked, feeds next Saturday | Friday | Short note per brand in `actions_log` |

The monthly evergreen pack (3 posts per week per platform per site) is a separate layer I have not seen. This design treats it as the steady base and the weekly run as the timely layer on top, as the Saturday prompt already says.

## 5. The weekly loop

1. **Saturday 06:55**: Scout, Planner, Writer, Brand gate, Visual desk run per brand.
2. **Saturday**: Didi gets a digest: counts per brand, flagged items first, each with the reason.
3. **Sunday, about 15 minutes**: Didi decides on flagged items (fix, edit or drop). Everything marked `ready` gets one "approve all and schedule" action. This is explicit sign-off, not silent auto-publishing.
4. **Sunday**: Scheduler pushes approved rows. Rows without required media wait and are listed, never silently dropped.
5. **Monday to Saturday**: posts publish. OOT events discovery runs Monday.
6. **Wednesday**: 15-minute research pulse (proposed). If something notable breaks for a brand, it drafts at most one reactive post and flags it for Didi.
7. **Friday**: Analyst note and the hub Friday report. Results feed the next Saturday run.

Cadence is daily. Current drafts cover Monday to Saturday; see open question 3.

## 6. The shared brand configuration

One file per brand (`brands/<id>`), read by the Writer, the Brand gate and the Scheduler. A new brand is a new file.

Each file holds: audience; voice; pillars; platforms and account ids (from `agents/accounts.ts`); posting times; palette and fonts; confirmed products and prices (checked against the live site each run); verified facts; the reject list; hard rules (for example OOT: no AI imagery, zero invented local detail; MYCP: pounds only, no Skool, OPERATE waitlist-only; AIVVP: "46,000+ prompts across 13 collections", no sales statistic unless Didi confirms it).

`brand-reject-lists` remains Didi's canonical wording. Where the brand files restate it, a change to the skill triggers a change to the file, and any difference is flagged to Didi rather than resolved silently.

The diversity standing instruction in `AGENTS.md` applies to every brief that involves people.

## 7. Brand gate outcomes

| Verdict | Meaning | What Didi sees |
|---|---|---|
| `ready` | No reject-list hit, every fact traceable to the brief or verified facts, prices match live site | Approved with one action |
| `flagged` | A possible problem, or a fact the gate cannot verify | Listed first, with the reason and a suggested fix |
| `blocked` | Hard-rule breach (for example a Skool mention, a fabricated statistic, an unconfirmed OPERATE claim) | Not offered for approval until fixed |

The gate reports why. It does not quietly rewrite a draft into vaguer wording.

## 8. World of Contracts later

Add `brands/worldofcontracts`, connect its accounts in Blotato, add its accounts to `agents/accounts.ts`, and add one section to the Saturday run. Its tracker already exists in the hub (`data/trackers/world-of-contracts.json`). No new roles are needed.

## 9. Build order (each step needs your go-ahead)

0. **This week**: triage the 84 drafts for w/c 9 Nov with the Brand gate rules and the OPERATE ruling, so something publishes now.
1. Brand files and the Brand gate, including a check of existing drafts for the retired facts above.
2. Hub Sunday view: flagged first, one-action approve for `ready` rows, media-needed list.
3. Update the Saturday run prompt: gate step, Sunday retry for visuals, Wednesday pulse, Analyst note.
4. Retire the repo drafting pipeline and remove the stale reminder; keep the grader logic and content pillars.
5. Onboard World of Contracts.

## 10. Open questions for Didi

1. **OPERATE copy**: waitlist-only is now the rule for all agents. The live site was reported as saying it is open at £27/month; the site needs correcting or the rule needs revisiting.
2. **The Concurrent Contractor**: the Saturday run still drafts TCC posts (72 drafts waiting) and The Pathway carries a TCC section, though TCC was retired from the hub. Is TCC now a strand inside MYCP, or should it stop?
3. **Cadence**: Monday to Saturday as now, or seven days?
4. **Monthly evergreen pack**: where is it reviewed and scheduled today? I could not find it, and the design assumes it carries steady base content.
5. **Wednesday pulse**: do you want it, given the credit and cost ceiling?

## 11. What I have not seen

- The monthly evergreen pack and its review documents.
- Blotato posts before 22 Jul, and Beehiiv performance.
- Anything the Saturday run does beyond its written prompt and its log entries.
