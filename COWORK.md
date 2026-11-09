# Command Hub: brief for Cowork and Claude

Read this first, then `docs/social-team-design.md` (the agreed design) and `docs/cowork-operating-guide.md`
(the instructions for each Cowork task).

## What this is

The Command Hub (a Next.js app on Vercel, repo `Damaka72/command-hub`) is where Didi Anolue **sees and
approves** her social posts. **Cowork does the work behind it**: research, drafting, the Brand gate, visuals,
scheduling. **Claude Code builds and fixes the hub** and does not create, change or publish posts.

Nothing is published or scheduled without Didi's explicit approval.

## Brands

| Brand | Site | Posts on |
|---|---|---|
| Master Your Career Path (MYCP) | masteryourcareerpath.com | LinkedIn, Instagram, TikTok, Facebook |
| Old Oak Town (OOT) | oldoaktown.co.uk | Facebook, Instagram, LinkedIn |
| AI Viral Video Prompts (AIVVP) | aiviralvideoprompts.com | TikTok, Instagram, Facebook, LinkedIn |

World of Contracts joins later as a new brand on the same process. The Concurrent Contractor no longer exists.
didianolue.co.uk is Didi's own voice; AI edits only and never drafts it.

## The week

Cowork drafts on Saturday 06:55 and checks everything with the Brand gate. Didi spends about 15 minutes on
Sunday in the hub's Sunday review (`/review`): she decides on flagged posts and approves the rest in one
action. Cowork then schedules what she approved. A news check runs on Wednesday at 07:00. Cadence is
daily, Monday to Saturday, as six ideas a week per brand, each adapted per platform.

## Where things live

- **Supabase project "The Old Oak Town"** (`mvttihozhozigtrwqsyy`): `content_library` (every post and its
  status), `weekly_plan` (Didi's weekly focus), `research_briefs`, `newsletters`, `actions_log`, `events`.
- **Blotato**: scheduling, accounts and analytics. Account ids and Facebook and LinkedIn page ids are in
  `agents/accounts.ts`.
- **Beehiiv**: the newsletters (The Pathway, The Prompt-ly, The Oak).
- **Drive**: "Command Hub Content Library", one folder per brand, plus `99 Brand Assets`.

`content_library.status` is one of `draft`, `approved`, `approved_needs_media`, `rejected`, `pushed`, `failed`.
The Brand gate writes `gate_verdict` (`ready`, `flagged`, `blocked`), `gate_reason` and `gate_checked_at`.
The posting layer is `layer` (`base`, `focus`, `flex`).

## Rules that never change

- UK English. Standing diversity instruction in `AGENTS.md` for anything involving people.
- Brand rules live in Cowork's `brand-reject-lists` skill; where anything else disagrees, that skill wins and
  the difference is flagged to Didi.
- OPERATE is live. Check prices and product status against the live site every time; never guess them.
- Old Oak Town: no AI imagery, and no local detail that a real source does not confirm.
- Never fabricate a statistic, quote, testimonial or fact about Didi.

## Starting a session

1. Read this file and `docs/social-team-design.md`.
2. `git log --oneline -10` to see what changed last.
3. Confirm the task with Didi before changing anything. Posts are changed in Cowork, not in Claude Code.
