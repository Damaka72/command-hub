'use client'

import { useState } from 'react'
import Link from 'next/link'

// ─── Brand config — mirrors lib/siteConstants.ts pattern ───────────────────
const BRANDS = [
  { name: 'Didi Anolue',              site: 'didianolue.co.uk',           colour: '#185FA5', short: 'DA'  },
  { name: 'Master Your Career Path',  site: 'masteryourcareerpath.com',   colour: '#1D9E75', short: 'MYC' },
  { name: 'The Concurrent Contractor',site: 'theconcurrentcontractor.com',colour: '#993C1D', short: 'TCC' },
  { name: 'OldOakTown',               site: 'oldoaktown.co.uk',           colour: '#534AB7', short: 'OOT' },
  { name: 'AI Viral Video Prompts',   site: 'aiviralvideoprompts.com',    colour: '#BA7517', short: 'AIVP'},
] as const

const VOICES = [
  { id: 'Xb7hH8MSUJpSbSDYk0k2', label: 'Aria',   desc: 'Warm, professional — best for educational content' },
  { id: 'JBFqnCBsd6RMkjVDRZzb', label: 'George', desc: 'Deep, authoritative — best for serious expert topics' },
  { id: 'pFZP5JQG7iQjIQuC4Bku', label: 'Lily',   desc: 'Clear, energetic — best for listicles & fast-cut' },
  { id: 'nPczCjzI2devNBz1zQrb', label: 'Brian',  desc: 'Conversational, natural — best for casual explainers' },
] as const

const VISUAL_STYLES = [
  'Documentary / talking head',
  'Cinematic B-roll heavy',
  'Motion graphics led',
  'Screen recording / tutorial',
  'Listicle / fast-cut',
] as const

const TONES = [
  'Confident & direct',
  'Warm & encouraging',
  'Journalistic / neutral',
  'Conversational & playful',
  'Authoritative / expert',
] as const

const AUDIENCE_TAGS = [
  'UK IT contractors',
  'Senior procurement professionals',
  'Career changers',
  'Old Oak Common residents',
  'AI content creators',
  'Freelancers & solopreneurs',
] as const

const WORD_MAP: Record<string, number> = { '4': 600, '6': 900, '8': 1200, '10': 1500 }

const CTA_OPTIONS = [
  'Subscribe to the channel',
  'Join the Skool community at masteryourcareerpath.com',
  'Download the free guide at the link in the description',
  'Book a consultation at didianolue.co.uk',
  'Grab the AI prompt pack at aiviralvideoprompts.com',
  'Visit oldoaktown.co.uk for more local news',
]

// ─── Types ──────────────────────────────────────────────────────────────────
type Brand = typeof BRANDS[number]

// ─── Step indicator ─────────────────────────────────────────────────────────
function StepBar({ current }: { current: number }) {
  const steps = ['Brand', 'Content', 'Style', 'Prompt']
  return (
    <div className="flex gap-3 mb-8">
      {steps.map((s, i) => (
        <div key={s} className="flex-1">
          <div className={`h-0.5 rounded-full transition-colors duration-300 ${
            i + 1 < current  ? 'bg-emerald-500' :
            i + 1 === current ? 'bg-zinc-900 dark:bg-zinc-100' :
                               'bg-zinc-200 dark:bg-zinc-700'
          }`} />
          <p className={`mt-1.5 text-xs transition-colors ${
            i + 1 === current ? 'text-zinc-700 dark:text-zinc-300' : 'text-zinc-400 dark:text-zinc-600'
          }`}>{s}</p>
        </div>
      ))}
    </div>
  )
}

// ─── Pill toggle ─────────────────────────────────────────────────────────────
function Pill({ label, selected, onClick }: { label: string; selected: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`px-3 py-1.5 rounded-full text-xs border transition-colors ${
        selected
          ? 'bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 border-zinc-900 dark:border-zinc-100'
          : 'border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-400 hover:border-zinc-400 dark:hover:border-zinc-500'
      }`}
    >
      {label}
    </button>
  )
}

// ─── Field wrapper ───────────────────────────────────────────────────────────
function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="text-xs font-medium uppercase tracking-widest text-zinc-400 dark:text-zinc-600 mb-2">
        {label}
      </p>
      {children}
    </div>
  )
}

const inputCls =
  'w-full rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 ' +
  'px-4 py-3 text-sm text-zinc-900 dark:text-zinc-50 placeholder-zinc-400 dark:placeholder-zinc-600 ' +
  'outline-none focus:border-zinc-400 dark:focus:border-zinc-500 transition-colors'

// ─── Prompt builder ──────────────────────────────────────────────────────────
function buildPrompt({
  brand, topic, cta, hook, points, audience, style, tone, voice, length, shots, thumbs,
}: {
  brand: Brand; topic: string; cta: string; hook: string; points: string
  audience: string[]; style: string; tone: string; voice: string
  length: string; shots: string; thumbs: string
}) {
  const words  = WORD_MAP[length] ?? 600
  const audienceStr = audience.length ? audience.join(', ') : '[YOUR TARGET AUDIENCE]'
  const voiceLabel  = VOICES.find(v => v.id === voice)?.label ?? 'Aria'

  return `# Video Production Prompt — ${brand.name}
# Generated by Command Hub · ${new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}

export ELEVENLABS_API_KEY=sk_YOUR_KEY_HERE

You are going to produce a complete, ready-to-upload YouTube video end-to-end.
Work in the current directory. Create a folder structure:
/script, /audio, /visuals, /final.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
VIDEO BRIEF
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Brand:            ${brand.name} (${brand.site})
Topic:            ${topic || '[YOUR TOPIC]'}
Target audience:  ${audienceStr}
Target length:    ${length} minutes (~${words} words of script)
Visual style:     ${style}
Tone:             ${tone} — no fluff, contractions OK
Aspect ratio:     16:9, 1080p
CTA:              ${cta}

HOOK (use verbatim as the opening line):
"${hook || '[YOUR HOOK]'}"

5 MAIN TALKING POINTS:
${points || '[YOUR 5 TALKING POINTS — ONE PER LINE]'}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
STEP 1 — SCRIPT
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Write the full script as plain text in /script/script.txt.
Use this structure:
  - Hook (15 seconds — use the hook above verbatim)
  - Context preview (3 things they will learn)
  - Body: 5 main points based on the talking points above,
    each with: [REHOOK] → story/example → payout
  - Outro with CTA: "${cta}" and a relink suggestion

Also output /script/shot_list.txt: ${shots} numbered b-roll shots.
Each shot: number | timestamp range | script line it covers | visual description (8–12s clips).
Visual style guide: ${style}. No third-party brands, logos, or copyrighted characters.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
STEP 2 — VOICEOVER (ElevenLabs API)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Read /script/script.txt. Strip all structural markers ([REHOOK], [STORY],
section headers etc). Split spoken text into chunks of ~250 words.
For each chunk, call the ElevenLabs REST API:

  POST https://api.elevenlabs.io/v1/text-to-speech/${voice}
  Header: xi-api-key: {ELEVENLABS_API_KEY env var}
  Body:   { "text": "...", "model_id": "eleven_turbo_v2_5", "voice_settings": { "stability": 0.5, "similarity_boost": 0.75 } }

Voice: ${voiceLabel} (${voice})
Save chunks as /audio/vo_001.mp3, /audio/vo_002.mp3 etc.
Concatenate → /audio/voiceover_full.mp3 using FFmpeg.
Report total duration in seconds.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
STEP 3 — VISUALS (Higgsfield MCP)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Read /script/shot_list.txt. For each shot:
  - Static concept (charts, text overlays, title cards) →
    Higgsfield image generation with nano_banana_pro or gpt_image_2,
    1920×1080, save to /visuals/shot_XX.png
  - Motion footage (people, action, environments) — especially the intro —
    seedance_2_0 via Higgsfield, 1920×1080, 8s default,
    save to /visuals/shot_XX.mp4

Run in parallel where possible. Poll every 15s, up to 10 attempts.
Maintain /visuals/manifest.json: { shotNumber, filePath, duration }.
Visual tone: ${style}. No third-party brands, logos, or copyrighted characters.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
STEP 4 — THUMBNAIL
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Higgsfield gpt_image_2. 1280×720. High contrast.
3–5 word headline pulled from the hook.
${thumbs} variants → /final/thumbnail_01.png, thumbnail_02.png etc.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
STEP 5 — STITCH & RENDER (FFmpeg)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
1. Normalise all shots to 1920×1080 MP4 (pad stills with subtle Ken Burns zoom)
2. xfade filter: 0.5s crossfades between all clips
3. Overlay /audio/voiceover_full.mp3 as audio track
4. Trim visual track to audio duration if longer; extend last shot if shorter
5. Render /final/video.mp4:
     -c:v libx264 -preset slow -crf 18 -pix_fmt yuv420p
     -c:a aac -b:a 192k -movflags +faststart
6. Verify output — report duration + file size.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
STEP 6 — METADATA
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
/final/title_options.txt  — 5 curiosity-driven titles, under 60 chars each.
/final/description.txt    — ~200 words, chapter timestamps, CTA: "${cta}",
                            keywords, placeholder for affiliate links.
/final/tags.txt           — 20 YouTube tags for ${brand.name} / ${brand.site}.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
CRITICAL RULES
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
- No third-party brands, logos, or copyrighted characters in any visual
- Polling: wait 15s between checks, up to 10 attempts per Higgsfield job
- On any step failure: report the error clearly and continue — never silently skip
- Final report: word count | voiceover duration | shots generated | video duration | /final/video.mp4

Begin.`
}

// ─── Main page ───────────────────────────────────────────────────────────────
export default function VideoBriefPage() {
  const [step,    setStep]    = useState(1)
  const [brand,   setBrand]   = useState<Brand | null>(null)
  const [topic,   setTopic]   = useState('')
  const [cta,     setCta]     = useState(CTA_OPTIONS[0])
  const [hook,    setHook]    = useState('')
  const [points,  setPoints]  = useState('')
  const [audience,setAudience]= useState<string[]>([])
  const [style,   setStyle]   = useState<string>(VISUAL_STYLES[0])
  const [tone,    setTone]    = useState<string>(TONES[0])
  const [voice,   setVoice]   = useState<string>(VOICES[0].id)
  const [length,  setLength]  = useState('4')
  const [shots,   setShots]   = useState('30')
  const [thumbs,  setThumbs]  = useState('3')
  const [copied,  setCopied]  = useState(false)

  const toggleAudience = (a: string) =>
    setAudience(prev => prev.includes(a) ? prev.filter(x => x !== a) : [...prev, a])

  const prompt = brand
    ? buildPrompt({ brand, topic, cta, hook, points, audience, style, tone, voice, length, shots, thumbs })
    : ''

  const handleCopy = async () => {
    await navigator.clipboard.writeText(prompt)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 px-4 py-8">
      <div className="max-w-2xl mx-auto">

        {/* Back link */}
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-xs text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-300 mb-6 transition-colors"
        >
          ← Command Hub
        </Link>

        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
            Video Brief Generator
          </h1>
          <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
            Build your Claude Code video production prompt — ready to paste and run.
          </p>
        </div>

        <StepBar current={step} />

        <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 p-6 space-y-6">

          {/* ── Step 1: Brand ─────────────────────────────────────────── */}
          {step === 1 && (
            <>
              <Field label="Choose brand">
                <div className="space-y-2">
                  {BRANDS.map(b => (
                    <button
                      key={b.site}
                      type="button"
                      onClick={() => setBrand(b)}
                      className={`w-full flex items-center gap-3 p-3.5 rounded-xl border text-left transition-colors ${
                        brand?.site === b.site
                          ? 'border-zinc-900 dark:border-zinc-100 bg-zinc-50 dark:bg-zinc-800'
                          : 'border-zinc-200 dark:border-zinc-700 hover:bg-zinc-50 dark:hover:bg-zinc-800/50'
                      }`}
                    >
                      <div
                        className="w-3 h-3 rounded-full flex-shrink-0"
                        style={{ background: b.colour }}
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-zinc-900 dark:text-zinc-50 truncate">{b.name}</p>
                        <p className="text-xs text-zinc-400 truncate">{b.site}</p>
                      </div>
                      {brand?.site === b.site && (
                        <span className="text-xs text-emerald-600 dark:text-emerald-400 font-medium flex-shrink-0">✓</span>
                      )}
                    </button>
                  ))}
                </div>
              </Field>

              <Field label="Topic / working title">
                <input
                  type="text"
                  value={topic}
                  onChange={e => setTopic(e.target.value)}
                  placeholder="e.g. How to negotiate a higher day rate as an IT contractor"
                  className={inputCls}
                />
              </Field>

              <Field label="Primary CTA">
                <select
                  value={cta}
                  onChange={e => setCta(e.target.value)}
                  className={inputCls}
                >
                  {CTA_OPTIONS.map(o => <option key={o}>{o}</option>)}
                </select>
              </Field>

              <button
                type="button"
                onClick={() => setStep(2)}
                disabled={!brand || !topic.trim()}
                className="w-full rounded-xl bg-zinc-900 dark:bg-zinc-100 py-3 text-sm font-medium text-white dark:text-zinc-900 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-zinc-700 dark:hover:bg-zinc-300 transition-colors"
              >
                Next — Content →
              </button>
            </>
          )}

          {/* ── Step 2: Content ───────────────────────────────────────── */}
          {step === 2 && (
            <>
              <Field label="Hook (15 seconds)">
                <textarea
                  value={hook}
                  onChange={e => setHook(e.target.value)}
                  rows={3}
                  placeholder="Bold statement or pattern interrupt — the very first thing viewers hear"
                  className={`${inputCls} resize-none`}
                />
                <p className="mt-1 text-xs text-zinc-400">{hook.length} / 200 chars</p>
              </Field>

              <Field label="5 main talking points (one per line)">
                <textarea
                  value={points}
                  onChange={e => setPoints(e.target.value)}
                  rows={8}
                  placeholder={"1. \n2. \n3. \n4. \n5. "}
                  className={`${inputCls} resize-none font-mono`}
                />
              </Field>

              <Field label="Target audience">
                <div className="flex flex-wrap gap-2">
                  {AUDIENCE_TAGS.map(a => (
                    <Pill
                      key={a}
                      label={a}
                      selected={audience.includes(a)}
                      onClick={() => toggleAudience(a)}
                    />
                  ))}
                </div>
              </Field>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="flex-1 rounded-xl border border-zinc-200 dark:border-zinc-700 py-3 text-sm font-medium text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors"
                >
                  ← Back
                </button>
                <button
                  type="button"
                  onClick={() => setStep(3)}
                  className="flex-1 rounded-xl bg-zinc-900 dark:bg-zinc-100 py-3 text-sm font-medium text-white dark:text-zinc-900 hover:bg-zinc-700 transition-colors"
                >
                  Next — Style →
                </button>
              </div>
            </>
          )}

          {/* ── Step 3: Style ─────────────────────────────────────────── */}
          {step === 3 && (
            <>
              <Field label="Visual style">
                <div className="flex flex-wrap gap-2">
                  {VISUAL_STYLES.map(s => (
                    <Pill key={s} label={s} selected={style === s} onClick={() => setStyle(s)} />
                  ))}
                </div>
              </Field>

              <Field label="Tone">
                <div className="flex flex-wrap gap-2">
                  {TONES.map(t => (
                    <Pill key={t} label={t} selected={tone === t} onClick={() => setTone(t)} />
                  ))}
                </div>
              </Field>

              <Field label="Voiceover (ElevenLabs)">
                <div className="space-y-2">
                  {VOICES.map(v => (
                    <button
                      key={v.id}
                      type="button"
                      onClick={() => setVoice(v.id)}
                      className={`w-full flex items-center gap-3 p-3 rounded-xl border text-left transition-colors ${
                        voice === v.id
                          ? 'border-zinc-900 dark:border-zinc-100 bg-zinc-50 dark:bg-zinc-800'
                          : 'border-zinc-200 dark:border-zinc-700 hover:bg-zinc-50 dark:hover:bg-zinc-800/50'
                      }`}
                    >
                      <div className={`w-2 h-2 rounded-full flex-shrink-0 ${voice === v.id ? 'bg-emerald-500' : 'bg-zinc-300 dark:bg-zinc-600'}`} />
                      <div>
                        <p className="text-sm font-medium text-zinc-900 dark:text-zinc-50">{v.label}</p>
                        <p className="text-xs text-zinc-400">{v.desc}</p>
                      </div>
                    </button>
                  ))}
                </div>
              </Field>

              <div className="grid grid-cols-3 gap-3">
                {([
                  { label: 'Length',     value: length, set: setLength, opts: [['4','4 min'],['6','6 min'],['8','8 min'],['10','10 min']] },
                  { label: 'Shots',      value: shots,  set: setShots,  opts: [['25','25'],['30','30'],['35','35'],['40','40']] },
                  { label: 'Thumbnails', value: thumbs, set: setThumbs, opts: [['3','3 variants'],['5','5 variants']] },
                ] as const).map(({ label, value, set, opts }) => (
                  <div key={label}>
                    <p className="text-xs font-medium uppercase tracking-widest text-zinc-400 dark:text-zinc-600 mb-2">{label}</p>
                    <select
                      value={value}
                      onChange={e => (set as (v: string) => void)(e.target.value)}
                      className="w-full rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-3 py-2.5 text-sm text-zinc-900 dark:text-zinc-50 outline-none focus:border-zinc-400"
                    >
                      {opts.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                    </select>
                  </div>
                ))}
              </div>

              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setStep(2)}
                  className="flex-1 rounded-xl border border-zinc-200 dark:border-zinc-700 py-3 text-sm font-medium text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors">
                  ← Back
                </button>
                <button type="button" onClick={() => setStep(4)}
                  className="flex-1 rounded-xl bg-zinc-900 dark:bg-zinc-100 py-3 text-sm font-medium text-white dark:text-zinc-900 hover:bg-zinc-700 transition-colors">
                  Generate prompt →
                </button>
              </div>
            </>
          )}

          {/* ── Step 4: Output ────────────────────────────────────────── */}
          {step === 4 && (
            <>
              {/* Summary cards */}
              <div className="grid grid-cols-3 gap-3">
                {[
                  { label: 'Brand',    value: brand?.name ?? '—' },
                  { label: 'Length',   value: `${length} min · ~${WORD_MAP[length]} words` },
                  { label: 'Output',   value: `${shots} shots · ${thumbs} thumbs` },
                ].map(({ label, value }) => (
                  <div key={label} className="bg-zinc-50 dark:bg-zinc-800 rounded-xl p-3 border border-zinc-100 dark:border-zinc-700">
                    <p className="text-xs text-zinc-400 mb-0.5">{label}</p>
                    <p className="text-sm font-medium text-zinc-900 dark:text-zinc-50 leading-snug">{value}</p>
                  </div>
                ))}
              </div>

              {/* Copy bar */}
              <div className="flex items-center justify-between">
                <p className="text-xs text-zinc-400">Ready to paste into Claude Code</p>
                <button
                  type="button"
                  onClick={handleCopy}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg border text-xs font-medium transition-colors ${
                    copied
                      ? 'border-emerald-500 text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950'
                      : 'border-zinc-200 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800'
                  }`}
                >
                  {copied ? '✓ Copied to clipboard' : 'Copy prompt'}
                </button>
              </div>

              {/* Prompt output */}
              <pre className="bg-zinc-50 dark:bg-zinc-800/60 rounded-xl border border-zinc-200 dark:border-zinc-700 p-4 text-xs text-zinc-500 dark:text-zinc-400 font-mono whitespace-pre-wrap break-words overflow-y-auto max-h-[420px] leading-relaxed">
                {prompt}
              </pre>

              {/* API key reminder */}
              <div className="flex gap-2 items-start p-3.5 bg-amber-50 dark:bg-amber-950/50 rounded-xl border border-amber-200 dark:border-amber-900">
                <span className="text-amber-500 text-sm flex-shrink-0 mt-px">⚠</span>
                <p className="text-xs text-amber-700 dark:text-amber-400 leading-relaxed">
                  Before running: set your key —{' '}
                  <code className="font-mono bg-amber-100 dark:bg-amber-900 px-1 py-0.5 rounded text-amber-800 dark:text-amber-300">
                    ELEVENLABS_API_KEY=sk_... claude ...
                  </code>
                </p>
              </div>

              <button
                type="button"
                onClick={() => setStep(3)}
                className="w-full rounded-xl border border-zinc-200 dark:border-zinc-700 py-3 text-sm font-medium text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors"
              >
                ← Edit settings
              </button>
            </>
          )}

        </div>
      </div>
    </div>
  )
}
