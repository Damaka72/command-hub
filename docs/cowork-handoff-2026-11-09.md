# Handoff for Cowork: w/c 9 Nov 2026 triage and TCC clean-up

From: a read-only review in Claude Code on Monday 9 Nov 2026, about 01:00 London. Nothing was edited, approved, scheduled or deleted. Cowork acts on this, with Didi's answers.
Scope: the 66 drafts for w/c 9 Nov (AIVVP 24, MYCP 24, OOT 18), all status `draft`. Facts were checked against this week's `research_briefs` only; the original articles were not opened and video audio was not heard.

## 1. Time-critical

The hub push route posts LinkedIn at 08:00, Instagram and TikTok at 09:00, Facebook at 10:00 (London). If a slot has passed, it moves the post to next Monday. OOT Monday posts say "14 days to go" to the West London Jobs Guarantee (23 Nov); if they miss today, drop or reword them rather than let them roll a week.

## 2. TCC clean-up (Didi: TCC no longer exists, delete the posts)

The database asked for confirmation on a destructive statement, and the request timed out three times, so nothing was deleted. Current TCC rows: 72 draft, 15 approved (July, never pushed), 30 pushed. Delete the 87 unpublished rows and keep the 30 pushed as history:

```sql
delete from content_library
where site_id = 'theconcurrentcontractor'
  and status in ('draft', 'approved', 'approved_needs_media', 'rejected');
```

Project: "The Old Oak Town" (`mvttihozhozigtrwqsyy`). Still to decide with Didi: the Instagram account @theconcurrentcontractor (8 published posts, still connected in Blotato), the TCC section of The Pathway newsletter, and TCC research briefs. The Saturday run prompt still drafts TCC; remove it.

## 3. Triage result

| Brand | Ready | Flagged | Blocked | Need filming | Total |
|---|---|---|---|---|---|
| MYCP | 15 | 1 | 3 | 5 | 24 |
| AIVVP | 12 | 3 | 5 | 4 | 24 |
| OOT | 12 | 6 | 0 | 0 | 18 |
| All | 39 | 10 | 8 | 9 | 66 |

## 4. Blocked (hard-rule conflict; fix before approval)

| Post | Problem | Proposed fix |
|---|---|---|
| MYCP Thu Facebook, LinkedIn, TikTok | Say "OPERATE is coming soon". Didi confirms OPERATE is live; site checks on 17 Oct and 7 Nov agree | "PRIME and OPERATE are both live at masteryourcareerpath.com", no prices. The Thursday TikTok has an AI Story Video; check whether its voiceover says "coming soon", and regenerate (about 6 credits) if so |
| AIVVP Fri Facebook, Instagram, LinkedIn, TikTok | Use "46,714 prompts". Reject list: use "46,000+ prompts across 13 collections" only | Replace the number. Friday TikTok also needs filming |
| AIVVP Wed TikTok | Says the prompt is "from our collection"; the brief says this is unconfirmed. Adds three examples (coffee mug, lamp, mirror) that are not in the brief | Say "from the site" and remove the three examples unless Didi confirms them |

## 5. Flagged (needs Didi's decision)

| Post | Problem | Proposed fix |
|---|---|---|
| OOT Thu Facebook, Instagram, LinkedIn | 5,998 homes and about 7,800 with planning permission came from OOT's own homepage. The brief says verify against the OPDC report before approving | Hold until Didi or a source confirms the figures |
| OOT Fri Facebook, Instagram, LinkedIn | 4 December is derived from "first Friday monthly", not announced. Instagram states it as fact | "If the pattern holds, the next is Friday 4 December; check PRBG" |
| MYCP Sat LinkedIn | Adds "had not been paid for 19 days of work in May" and "the agency argued the workers had opted out", neither in the brief | Remove both; keep "the Fair Work Agency found the opt-outs from the Conduct Regulations invalid" |
| AIVVP Wed Facebook, Instagram, LinkedIn | Example prompt "Create a whimsical family story where everyday household objects possess hidden magical powers" comes from the site's "Mega Prompt Studio" examples. Rule: only actual prompts from the product files | Hold until Didi confirms the prompt is in the bundle |
| MYCP Thu Facebook, TikTok | First-person claim: built the platform "in about two days, using a subscription I already had". Rule: no invented facts about Didi | Hold until Didi confirms the wording |
| MYCP Thu LinkedIn | Describes OPERATE as "for mastering a role once you have landed it". The agent config says it helps professionals build sustainable income as contractors or freelancers | Use Didi's one-line description of OPERATE |

## 6. Need filming (content fine, no media; the push route will skip them)

- MYCP TikTok: Mon, Tue, Wed, Fri, Sat.
- AIVVP TikTok: Mon, Tue, Thu, Sat.
- Recommendation: publish only the two TikToks that already have a video (MYCP Thu, once fixed; AIVVP Wed, once fixed) and park the rest as ideas for Didi.

## 7. Ready (39)

- MYCP (15): Mon, Tue, Wed, Fri Facebook, Instagram, LinkedIn; Thu Instagram; Sat Facebook, Instagram.
- AIVVP (12): Mon, Tue, Thu, Sat Facebook, Instagram, LinkedIn. Prices used: $1 a collection, $9 Mega Bundle, $13 individually, free 100-prompt starter (site fetched 7 Nov); Didi to confirm still current.
- OOT (12): Mon, Tue, Wed, Sat Facebook, Instagram, LinkedIn.
- Instagram posts all have a card attached; Facebook and LinkedIn are text.

## 8. Questions awaiting Didi

1. Confirm OPERATE is live at £27/month, or £47/month with PRIME, and give a one-line description of OPERATE.
2. Is "about two days, using a subscription I already had" accurate?
3. Is the "whimsical family story" prompt in the AIVVP product files, and are the coffee mug, lamp and mirror lines real?
4. Are the OOT homes figures verified against the OPDC report?
5. Are the AIVVP prices still current?
6. TikTok: publish only the two with videos this week?
7. What to do with the @theconcurrentcontractor Instagram account, the Pathway TCC section and the TCC briefs.

## 9. Rules to apply

OPERATE is live. Never "Skool". MYCP prices in pounds; AIVVP in dollars as on Gumroad. AIVVP: "46,000+ prompts across 13 collections", no sales statistics unless Didi confirms the source. OOT: zero invented local detail, no AI imagery. Nothing published or scheduled without Didi's sign-off.
