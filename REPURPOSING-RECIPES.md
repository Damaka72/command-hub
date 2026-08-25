# Repurposing recipes

Phase 4 of the unified content-creation scope. A "recipe" is a small, narrow
spec for turning one existing `content_library` asset into a new derived one.
Recipes are what the Phase 3 automation Routine (see below) and any manual
repurposing session follow — they are the actual work behind "the repurposing
agent team," not a separate codebase.

## How a recipe gets triggered

1. A row lands on the worklist one of two ways:
   - **Manual** — `/library` → Repurpose → pick an asset type → "Flag for
     creation". Inserts a new row: `status = approved_needs_media`,
     `creation_requested_at` set, `repurposed_from_id` pointing at the source.
   - **Automatic (routine sweep only)** — the Phase 3 Routine's own worklist
     query is deliberately narrower than "anything flagged": it only picks up
     rows where `repurposed_from_id IS NOT NULL` — i.e. rows that are
     *themselves* the result of an already-approved repurpose action, not
     first-time content. See the Routine's own prompt for the exact query.
2. Whoever picks up the row — you in a Cowork session, or the Routine's fired
   session — reads the source row (`repurposed_from_id`) and the new row's
   `content` field, which holds the **creation brief**, not finished copy.
3. Produce the asset, then call `POST /api/library/asset` (see
   `app/api/library/asset/route.ts`) to attach it — this is what flips the row
   from `approved_needs_media` to `approved` and makes it pushable.

## Where assets actually live in Drive

There's a real, pre-existing library structure — `Command Hub Content
Library` (root, created July 2026) — not the ad-hoc `Command Hub Videos`
folder earlier video work used before this file existed. Use the real one.
Per-site folders, already there:

| site_id                    | Drive folder     |
| --------------------------- | ---------------- |
| `aiviralvideoprompts`       | `01 AIVVP`       |
| `masteryourcareerpath`      | `02 MYCP`        |
| `oldoaktown`                 | `03 OOT`         |
| `theconcurrentcontractor`   | `04 TCC`         |
| `didianolue`                 | `05 Didi Anolue` |

Cross-site (not per-site) folders in the same root:

| Folder              | For |
| -------------------- | --- |
| `90 Social Prompts`  | Prompts used to generate social media content — shared across all five sites, not filed under any one site folder. |
| `99 Brand Assets`    | Shared brand assets. |

Each site folder already has content-type subfolders (`newsletters`,
`evergreen`, monthly folders). Save a new asset into a `videos/` subfolder
inside the matching site folder — create that subfolder the first time a
site needs it, sibling to `newsletters`, rather than inventing a
`{site}/{asset_type}/{date}/` tree from scratch.

## Recipe: video → TikTok vertical cut

**When it applies:** a `content_library` row has `asset_type = 'video'`,
`aspect_ratio` other than `9:16` (i.e. a landscape/YouTube-style master, the
shape the `video-batch-producer` skill produces by default for a narrated
explainer), and the **same site** has a TikTok slot for that week/day with no
asset of its own yet.

**Brief shape** (what `content` on the new row should say): name the source
row, and say only what's non-default — the aspect ratio and any platform-
specific trim. Do not restate the whole script; the source is one hop away via
`repurposed_from_id`.

> Example: *"Repurpose the [day] [site] video for TikTok — 9:16 vertical cut
> of the same script/pacing. No new narration."*

**How to actually produce it**, in order — same tool-selection discipline as
`video-producer`/`video-batch-producer` (cost and speed first):

1. **Source is a Higgsfield master** → `reframe` to 9:16. Cheapest, fastest,
   no re-render.
2. **Source is a Media Gen master** (Fal.ai, `~/.claude/skills/media-gen`) →
   re-run `generate.py video` from a same-scene still at 9:16, since Media Gen
   has no reframe step of its own — don't assume Higgsfield's `reframe` will
   accept a non-Higgsfield file.
3. **Source is a HyperFrames master** → re-render the same composition at
   `data-width="1080" data-height="1920"` (it's HTML, not a video file to
   reframe — see `hyperframes-core`). This is the `mycp-skool-explainer` case:
   the Aug 2026 build rendered landscape for YouTube and still owes this cut.
4. **Source is a Blotato Visuals master** → regenerate with a 9:16-sized
   template rather than reframing (Blotato Visuals doesn't expose a reframe
   step); pick the closest matching template to the original.

**Attach the result:**

```
POST /api/library/asset
{
  "id": "<new row id>",
  "driveFileId": "<Drive file id of the finished 9:16 cut>",
  "assetType": "video",
  "creationTool": "hyperframes" | "higgsfield" | "media_gen" | "blotato_visuals",
  "assetDurationS": 27,
  "aspectRatio": "9:16"
}
```

## Adding a new recipe

Append a section here: **when it applies** (the row shape that triggers it),
**brief shape**, and **how to produce it** in the same cost-first tool order
the video skills already use. Keep each recipe narrow — one direction, one
clear trigger condition — rather than a general "make more content" mandate.
Old Oak Town's no-AI-media rule and MYCP's no-unconfirmed-promotion rule apply
to every recipe exactly as they apply to first-time content.
