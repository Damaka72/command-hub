---
name: media-desk
description: Make the media (text cards, carousels, reels, story videos) that Command Hub posts are missing, using the cheapest tool that does the job. Use when Didi says "run the media desk", "make the media for this week", "create the media for the posts that need it", or when a scheduled Media desk task runs. Replaces video-batch-producer. For a single one-off video requested in conversation, use video-producer instead.
---

# Media desk

You make the images and videos that this week's Command Hub posts are missing. You work from the database,
not from files, and you spend as little as possible.

## 1. Find the work

Read `content_library` in the Supabase project `mvttihozhozigtrwqsyy` ("The Old Oak Town"). The worklist is
rows where ALL of these are true:

- `week_commencing` is this week's Monday or later
- `status` is `draft` or `approved_needs_media`
- `platform` is Instagram, TikTok, Pinterest or YouTube
- `media_urls` is empty
- `gate_verdict` is not `blocked`
- `creation_tool` does not contain "video-brief" (those are scripts for Didi to film: leave them alone)

Do rows with `creation_requested_at` set first, oldest first (Didi asked for them in the hub's Sunday review),
then the rest in day order. If the worklist is empty, say so in one line and stop.

## 2. Pick the tool: stop at the first rung that does the job

1. **Blotato free card or carousel** (0 credits). Template `Single Centered Text Quote`
   (`9f4e66cd-b784-4c02-b2ce-e6d0765fd4c0`) for a text card; `Quote Card Carousel with Monocolor Paper Background`
   (`/base/v2/quote-card/77f65d2b-48cc-4adb-bfbb-5bc86f8c01bd/v1`, 4:5) for a carousel. It cannot match brand
   colours exactly, so use it when a simple card is enough.
2. **HyperFrames** (free), when `npx hyperframes doctor` passes. Use it for exact brand colours and fonts, cards and
   carousel slides (as stills), 9:16 reels and explainers. Steps in section 4.
3. **Blotato AI Story Video** (about 1 credit a scene) for narrated multi-scene video. Template
   `/base/v2/ai-story-video/5903fe43-514d-40ee-a060-0d6628c5f8fd/v1`, `aiImageModel` replicate/black-forest-labs/flux-schnell,
   `animateAiImages` false, AI voiceover on.
4. Otherwise leave the row and report why.

**Never Higgsfield** (there are no credits). **Cost ceiling: 100 Blotato credits per run.** Call `blotato_get_credits`
before and after and report the real spend.

## 3. Brand rules

| Brand (site id) | Rule |
|---|---|
| Old Oak Town (`oldoaktown`) | Typographic cards only, or Didi's own real photos. **Never AI imagery, never stock footage.** If a real photo would help, mark the row "needs real photo". |
| Master Your Career Path (`masteryourcareerpath`) | Navy #1B3A8C, gold #F5A623, Playfair Display headings, Plus Jakarta Sans body. Never show a price, offer or cohort date unless Didi confirmed it is live that week. |
| AI Viral Video Prompts (`aiviralvideoprompts`) | Background #0C0C0C to #1A1A2E, teal #4ECDC4, coral #FF6B6B, Inter. Only show prompts that are in the product files. |

Old Oak Town palette if a card is needed: green #2D5016, brown #8B4513, cream #F5F5DC, dark grey #333333.
Anything with people shows diverse nationalities and ethnicities, for a global audience (UK-first today). UK English
on every card. One brand per asset: never mix brands.

## 4. HyperFrames steps

1. `npx hyperframes doctor`. If it does not pass, use the next rung.
2. `npx hyperframes init <name> --example blank --resolution portrait --non-interactive --skip-skills`
   (`portrait` is 1080 by 1920 for reels and TikTok; `square` is 1080 by 1080).
3. **Bundle libraries locally.** The template loads GSAP from a public CDN, which restricted environments block
   (`ERR_TUNNEL_CONNECTION_FAILED`). Run `npm install gsap@3.15.0`, copy `node_modules/gsap/dist/gsap.min.js` into the
   project, and point the script tag at `./gsap.min.js`.
4. Design the composition in `index.html` in the brand palette and fonts, then `npm run check`.
5. Render: `npx hyperframes render -q standard -o out.mp4`. For a carousel, render stills (one per slide).
6. Check the file with `ffprobe` (size and duration) before uploading.

HyperFrames animates designs; it does not make photoreal footage. Narration and music need a separate audio file,
because local voice and music are not installed. Use rung 3 when a post needs narration.

## 5. Attach the result

Upload each file with `blotato_create_presigned_upload_url` to get a public URL, then update the row:

- append the URL to `media_urls`
- set `asset_type` (`image`, `carousel` or `video`), `creation_tool`, `aspect_ratio`, and `asset_duration_s` for video
- if `status` was `approved_needs_media`, set it to `approved` (this mirrors the hub). Leave a `draft` row as `draft`.
- never change the gate columns, and never change any other status

Use `reframe` only for Higgsfield-made video (not relevant here). Platform ratios: TikTok, Reels and Shorts 9:16;
LinkedIn and X 16:9 or 1:1; Instagram feed 4:5 or 1:1; Facebook 16:9 or 1:1.

## 6. Report

Finish with a short report in chat: each row (brand, day, platform), the tool and why, credits spent (and the total),
and anything not made and why (needs filming, needs real photo, tool unavailable). Write one `actions_log` row per
brand (source `cowork_session`, action starting `[media-desk]`).
