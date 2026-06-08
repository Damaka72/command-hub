'use client'

// File location in your repo: app/video-brief/page.tsx
// Replaces the prompt generator with a full short-video-maker integration.

import { useState, useRef } from 'react'
import Link from 'next/link'

// ─── Constants ───────────────────────────────────────────────────────────────

const BRANDS = [
  { name: 'Didi Anolue',               site: 'didianolue.co.uk',            colour: '#185FA5' },
  { name: 'Master Your Career Path',   site: 'masteryourcareerpath.com',    colour: '#1D9E75' },
  { name: 'The Concurrent Contractor', site: 'theconcurrentcontractor.com', colour: '#993C1D' },
  { name: 'OldOakTown',                site: 'oldoaktown.co.uk',            colour: '#534AB7' },
  { name: 'AI Viral Video Prompts',    site: 'aiviralvideoprompts.com',     colour: '#BA7517' },
] as const

const VOICES = [
  { id: 'af_heart',   label: 'Heart',   accent: 'US ♀', desc: 'Warm American female — great for educational content' },
  { id: 'bf_emma',    label: 'Emma',    accent: 'UK ♀', desc: 'Warm British female — professional and clear' },
  { id: 'bm_george',  label: 'George',  accent: 'UK ♂', desc: 'Deep British male — authoritative and trustworthy' },
  { id: 'am_michael', label: 'Michael', accent: 'US ♂', desc: 'Natural American male — conversational and relatable' },
  { id: 'af_nova',    label: 'Nova',    accent: 'US ♀', desc: 'Clear American female — energetic and engaging' },
  { id: 'am_adam',    label: 'Adam',    accent: 'US ♂', desc: 'Confident American male — direct and punchy' },
] as const

const PLATFORMS = [
  { id: 'portrait',  label: 'Shorts / Reels / TikTok', desc: '9:16 vertical — YouTube Shorts, Instagram Reels, TikTok' },
  { id: 'landscape', label: 'YouTube / LinkedIn',       desc: '16:9 horizontal — standard YouTube, LinkedIn feed' },
] as const

const MUSIC_MOODS = [
  { id: 'happy',          label: 'Happy' },
  { id: 'excited',        label: 'Excited' },
  { id: 'hopeful',        label: 'Hopeful' },
  { id: 'chill',          label: 'Chill' },
  { id: 'contemplative',  label: 'Contemplative' },
  { id: 'euphoric/high',  label: 'Euphoric' },
  { id: 'melancholic',    label: 'Melancholic' },
  { id: 'funny/quirky',   label: 'Quirky' },
] as const

const MUSIC_VOLUME = ['low', 'medium', 'high'] as const

const AUDIENCE_TAGS = [
  'UK IT contractors',
  'Senior procurement professionals',
  'Career changers',
  'Old Oak Common residents',
  'AI content creators',
  'Freelancers & solopreneurs',
] as const

const CTA_OPTIONS = [
  'Subscribe to the channel',
  'Join the Skool community at masteryourcareerpath.com',
  'Download the free guide at the link in the description',
  'Book a consultation at didianolue.co.uk',
  'Grab the AI prompt pack at aiviralvideoprompts.com',
  'Visit oldoaktown.co.uk for more local news',
]

// ─── Types ───────────────────────────────────────────────────────────────────

type Brand = typeof BRANDS[number]
type GenerateState = 'idle' | 'submitting' | 'processing' | 'ready' | 'failed'

// ─── Helpers ─────────────────────────────────────────────────────────────────

const STOP_WORDS = new Set([
  'the','a','an','and','or','but','in','on','at','to','for','of','with','by',
  'from','as','is','was','are','were','be','been','have','has','had','do','does',
  'did','will','would','could','should','may','might','your','their','our','its',
  'how','what','when','where','why','who','which','that','this','these','those',
  'i','you','we','they','he','she','it','not','just','more','most','some','than',
  'then','very','get','make','need','want','know','about','into','like','also',
])

function extractKeywords(text: string): string[] {
  return [...new Set(
    text.toLowerCase()
      .replace(/[^a-z\s]/g, '')
      .split(/\s+/)
      .filter(w => w.length > 3 && !STOP_WORDS.has(w))
  )].slice(0, 3)
}

function buildScenes(hook: string, points: string, topic: string, audience: string[]) {
  const scenes: { text: string; searchTerms: string[] }[] = []
  const context = [topic, ...audience].join(' ')

  const hookText = hook.trim()
  if (hookText) {
    const kw = extractKeywords(context)
    scenes.push({ text: hookText, searchTerms: kw.length >= 2 ? kw : ['professional', 'career', 'success'] })
  }

  const lines = points
    .split('\n')
    .map(l => l.replace(/^\s*\d+\.\s*/, '').trim())
    .filter(l => l.length > 10)
    .slice(0, 5)

  for (const line of lines) {
    const kw = extractKeywords(line)
    const fallback = extractKeywords(context)
    scenes.push({
      text: line,
      searchTerms: kw.length >= 2 ? kw : [...kw, ...fallback].slice(0, 3),
    })
  }

  return scenes
}

// ─── Sub-components ──────────────────────────────────────────────────────────

function StepBar({ current }: { current: number }) {
  const steps = ['Brand', 'Content', 'Style', 'Generate']
  return (
    <div className="flex gap-3 mb-8">
      {steps.map((s, i) => (
        <div key={s} className="flex-1">
          <div className={`h-0.5 rounded-full transition-colors duration-300 ${
            i + 1 < current   ? 'bg-emerald-500' :
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

const btnPrimary =
  'flex-1 rounded-xl bg-zinc-900 dark:bg-zinc-100 py-3 text-sm font-medium text-white dark:text-zinc-900 ' +
  'disabled:opacity-40 disabled:cursor-not-allowed hover:bg-zinc-700 dark:hover:bg-zinc-300 transition-colors'

const btnSecondary =
  'flex-1 rounded-xl border border-zinc-200 dark:border-zinc-700 py-3 text-sm font-medium ' +
  'text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors'

// ─── Main page ───────────────────────────────────────────────────────────────

export default function VideoCreatorPage() {
  // Form state
  const [step,         setStep]         = useState(1)
  const [brand,        setBrand]        = useState<Brand | null>(null)
  const [topic,        setTopic]        = useState('')
  const [cta,          setCta]          = useState(CTA_OPTIONS[0])
  const [hook,         setHook]         = useState('')
  const [points,       setPoints]       = useState('')
  const [audience,     setAudience]     = useState<string[]>([])
  const [voice,        setVoice]        = useState<string>(VOICES[0].id)
  const [platform,     setPlatform]     = useState<string>(PLATFORMS[0].id)
  const [mood,         setMood]         = useState<string>(MUSIC_MOODS[0].id)
  const [volume,       setVolume]       = useState<string>('medium')
  const [captionColor, setCaptionColor] = useState('#1D9E75')

  // Generation state
  const [genState, setGenState] = useState<GenerateState>('idle')
  const [videoId,  setVideoId]  = useState<string | null>(null)
  const [errorMsg, setErrorMsg] = useState<string>('')
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const toggleAudience = (a: string) =>
    setAudience(prev => prev.includes(a) ? prev.filter(x => x !== a) : [...prev, a])

  const selectBrand = (b: Brand) => {
    setBrand(b)
    setCaptionColor(b.colour)
  }

  const stopPolling = () => {
    if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null }
  }

  const scenes = buildScenes(hook, points, topic, audience)

  const handleGenerate = async () => {
    if (!brand || scenes.length === 0) return
    setGenState('submitting')
    setErrorMsg('')
    setVideoId(null)

    const body = {
      scenes,
      config: {
        orientation:            platform,
        voice,
        music:                  mood,
        musicVolume:            volume,
        captionBackgroundColor: captionColor,
        captionPosition:        'bottom',
        paddingBack:            1500,
      },
    }

    try {
      const res = await fetch('/api/short-video', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })

      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error((err as { message?: string }).message ?? `Server error ${res.status}`)
      }

      const { videoId: id } = await res.json() as { videoId: string }
      setVideoId(id)
      setGenState('processing')

      pollRef.current = setInterval(async () => {
        try {
          const sr = await fetch(`/api/short-video/${id}/status`)
          const { status } = await sr.json() as { status: string }
          if (status === 'ready') {
            stopPolling(); setGenState('ready')
          } else if (status === 'failed') {
            stopPolling(); setGenState('failed')
            setErrorMsg('Video generation failed. Check the Docker container logs for details.')
          }
        } catch {
          stopPolling(); setGenState('failed')
          setErrorMsg('Lost connection to the video maker. Is the Docker container still running?')
        }
      }, 4000)

    } catch (err) {
      setGenState('failed')
      const msg = err instanceof Error ? err.message : 'Unknown error'
      setErrorMsg(
        msg.includes('fetch') || msg.includes('502')
          ? 'Could not reach the video maker. Make sure the Docker container is running at localhost:3123.'
          : msg
      )
    }
  }

  const reset = () => {
    stopPolling()
    setGenState('idle')
    setVideoId(null)
    setErrorMsg('')
  }

  // ─── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 px-4 py-8">
      <div className="max-w-2xl mx-auto">

        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-xs text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-300 mb-6 transition-colors"
        >
          ← Command Hub
        </Link>

        <div className="mb-8">
          <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
            Video Creator
          </h1>
          <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
            Generate a short video from your brief — powered by the local video maker.
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
                      onClick={() => selectBrand(b)}
                      className={`w-full flex items-center gap-3 p-3.5 rounded-xl border text-left transition-colors ${
                        brand?.site === b.site
                          ? 'border-zinc-900 dark:border-zinc-100 bg-zinc-50 dark:bg-zinc-800'
                          : 'border-zinc-200 dark:border-zinc-700 hover:bg-zinc-50 dark:hover:bg-zinc-800/50'
                      }`}
                    >
                      <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ background: b.colour }} />
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
                <select value={cta} onChange={e => setCta(e.target.value)} className={inputCls}>
                  {CTA_OPTIONS.map(o => <option key={o}>{o}</option>)}
                </select>
              </Field>

              <button
                type="button"
                onClick={() => setStep(2)}
                disabled={!brand || !topic.trim()}
                className={btnPrimary}
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
                  maxLength={200}
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
                    <Pill key={a} label={a} selected={audience.includes(a)} onClick={() => toggleAudience(a)} />
                  ))}
                </div>
              </Field>

              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setStep(1)} className={btnSecondary}>← Back</button>
                <button
                  type="button"
                  onClick={() => setStep(3)}
                  disabled={!hook.trim() && !points.trim()}
                  className={btnPrimary}
                >
                  Next — Style →
                </button>
              </div>
            </>
          )}

          {/* ── Step 3: Style ─────────────────────────────────────────── */}
          {step === 3 && (
            <>
              <Field label="Platform / orientation">
                <div className="space-y-2">
                  {PLATFORMS.map(p => (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => setPlatform(p.id)}
                      className={`w-full flex items-center justify-between p-3.5 rounded-xl border text-left transition-colors ${
                        platform === p.id
                          ? 'border-zinc-900 dark:border-zinc-100 bg-zinc-50 dark:bg-zinc-800'
                          : 'border-zinc-200 dark:border-zinc-700 hover:bg-zinc-50 dark:hover:bg-zinc-800/50'
                      }`}
                    >
                      <div>
                        <p className="text-sm font-medium text-zinc-900 dark:text-zinc-50">{p.label}</p>
                        <p className="text-xs text-zinc-400">{p.desc}</p>
                      </div>
                      {platform === p.id && (
                        <span className="text-xs text-emerald-600 dark:text-emerald-400 font-medium flex-shrink-0">✓</span>
                      )}
                    </button>
                  ))}
                </div>
              </Field>

              <Field label="Voice">
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
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium text-zinc-900 dark:text-zinc-50">{v.label}</span>
                          <span className="text-xs text-zinc-400">{v.accent}</span>
                        </div>
                        <p className="text-xs text-zinc-400">{v.desc}</p>
                      </div>
                    </button>
                  ))}
                </div>
              </Field>

              <Field label="Music mood">
                <div className="flex flex-wrap gap-2">
                  {MUSIC_MOODS.map(m => (
                    <Pill key={m.id} label={m.label} selected={mood === m.id} onClick={() => setMood(m.id)} />
                  ))}
                </div>
              </Field>

              <div className="grid grid-cols-2 gap-4">
                <Field label="Music volume">
                  <div className="flex gap-2">
                    {MUSIC_VOLUME.map(v => (
                      <Pill key={v} label={v} selected={volume === v} onClick={() => setVolume(v)} />
                    ))}
                  </div>
                </Field>

                <Field label="Caption colour">
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={captionColor}
                      onChange={e => setCaptionColor(e.target.value)}
                      className="h-10 w-12 rounded-lg border border-zinc-200 dark:border-zinc-700 cursor-pointer bg-white dark:bg-zinc-900 p-0.5"
                    />
                    <input
                      type="text"
                      value={captionColor}
                      onChange={e => setCaptionColor(e.target.value)}
                      className="flex-1 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-3 py-2 text-sm font-mono text-zinc-900 dark:text-zinc-50 outline-none focus:border-zinc-400"
                    />
                  </div>
                </Field>
              </div>

              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setStep(2)} className={btnSecondary}>← Back</button>
                <button type="button" onClick={() => setStep(4)} className={btnPrimary}>Review & Generate →</button>
              </div>
            </>
          )}

          {/* ── Step 4: Generate ──────────────────────────────────────── */}
          {step === 4 && (
            <>
              {/* Summary cards */}
              <div className="grid grid-cols-2 gap-3">
                {[
                  { label: 'Brand',    value: brand?.name ?? '—' },
                  { label: 'Platform', value: PLATFORMS.find(p => p.id === platform)?.label ?? platform },
                  { label: 'Voice',    value: VOICES.find(v => v.id === voice)?.label ?? voice },
                  { label: 'Music',    value: `${MUSIC_MOODS.find(m => m.id === mood)?.label ?? mood} · ${volume}` },
                ].map(({ label, value }) => (
                  <div key={label} className="bg-zinc-50 dark:bg-zinc-800 rounded-xl p-3 border border-zinc-100 dark:border-zinc-700">
                    <p className="text-xs text-zinc-400 mb-0.5">{label}</p>
                    <p className="text-sm font-medium text-zinc-900 dark:text-zinc-50 leading-snug">{value}</p>
                  </div>
                ))}
              </div>

              {/* Scene preview (idle only) */}
              {genState === 'idle' && (
                <div>
                  <p className="text-xs font-medium uppercase tracking-widest text-zinc-400 dark:text-zinc-600 mb-2">
                    Scenes ({scenes.length})
                  </p>
                  {scenes.length === 0 ? (
                    <div className="p-4 rounded-xl border border-amber-200 dark:border-amber-900 bg-amber-50 dark:bg-amber-950/50">
                      <p className="text-xs text-amber-700 dark:text-amber-400">
                        No scenes found. Go back and add a hook or at least one talking point.
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {scenes.map((s, i) => (
                        <div key={i} className="bg-zinc-50 dark:bg-zinc-800 rounded-xl p-3 border border-zinc-100 dark:border-zinc-700">
                          <p className="text-xs text-zinc-400 mb-1">
                            Scene {i + 1} · keywords: <span className="font-mono">{s.searchTerms.join(', ')}</span>
                          </p>
                          <p className="text-sm text-zinc-700 dark:text-zinc-300 leading-relaxed">{s.text}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Submitting */}
              {genState === 'submitting' && (
                <div className="flex items-center justify-center gap-3 py-8">
                  <div className="w-5 h-5 rounded-full border-2 border-zinc-200 border-t-zinc-800 dark:border-zinc-700 dark:border-t-zinc-100 animate-spin" />
                  <p className="text-sm text-zinc-500">Sending to video maker…</p>
                </div>
              )}

              {/* Processing */}
              {genState === 'processing' && (
                <div className="flex flex-col items-center gap-4 py-8">
                  <div className="w-10 h-10 rounded-full border-2 border-zinc-200 border-t-zinc-800 dark:border-zinc-700 dark:border-t-zinc-100 animate-spin" />
                  <div className="text-center">
                    <p className="text-sm font-medium text-zinc-900 dark:text-zinc-50">Generating video…</p>
                    <p className="text-xs text-zinc-400 mt-1">
                      Fetching footage · synthesising voice · rendering captions
                    </p>
                    <p className="text-xs text-zinc-400 mt-0.5">This typically takes 2–5 minutes.</p>
                  </div>
                </div>
              )}

              {/* Ready */}
              {genState === 'ready' && videoId && (
                <div className="space-y-3">
                  <div className="flex items-center gap-3 p-4 bg-emerald-50 dark:bg-emerald-950/50 rounded-xl border border-emerald-200 dark:border-emerald-900">
                    <span className="text-emerald-500 text-xl leading-none">✓</span>
                    <div>
                      <p className="text-sm font-medium text-emerald-700 dark:text-emerald-400">Video ready!</p>
                      <p className="text-xs text-emerald-600 dark:text-emerald-500 mt-0.5">Click below to download it.</p>
                    </div>
                  </div>
                  <a
                    href={`http://localhost:3123/api/short-video/${videoId}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full flex items-center justify-center gap-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 py-3 text-sm font-medium text-white transition-colors"
                  >
                    ↓ Download video
                  </a>
                  <button type="button" onClick={reset} className={btnSecondary}>
                    Make another video
                  </button>
                </div>
              )}

              {/* Failed */}
              {genState === 'failed' && (
                <div className="space-y-3">
                  <div className="flex gap-2 items-start p-3.5 bg-red-50 dark:bg-red-950/50 rounded-xl border border-red-200 dark:border-red-900">
                    <span className="text-red-500 text-sm flex-shrink-0 mt-px">✕</span>
                    <p className="text-xs text-red-700 dark:text-red-400 leading-relaxed">{errorMsg}</p>
                  </div>
                  <div className="p-3 bg-zinc-50 dark:bg-zinc-800 rounded-xl border border-zinc-200 dark:border-zinc-700">
                    <p className="text-xs text-zinc-500 dark:text-zinc-400 font-medium mb-1">Start the video maker:</p>
                    <p className="text-xs text-zinc-400 font-mono break-all leading-relaxed">
                      docker run -it --rm --name short-video-maker -p 3123:3123 -e PEXELS_API_KEY=YOUR_KEY --entrypoint npm gyoridavid/short-video-maker:latest start
                    </p>
                  </div>
                  <button type="button" onClick={reset} className={btnSecondary}>Try again</button>
                </div>
              )}

              {/* Action buttons (idle only) */}
              {genState === 'idle' && (
                <div className="flex gap-3 pt-2">
                  <button type="button" onClick={() => setStep(3)} className={btnSecondary}>← Edit style</button>
                  <button
                    type="button"
                    onClick={handleGenerate}
                    disabled={scenes.length === 0}
                    className={btnPrimary}
                  >
                    Generate video
                  </button>
                </div>
              )}
            </>
          )}

        </div>
      </div>
    </div>
  )
}
