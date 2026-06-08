// File location in your repo: app/api/short-video/route.ts
//
// Proxies video creation requests to the local short-video-maker server.
// Set SHORT_VIDEO_MAKER_URL env var to override (e.g. for ngrok on Vercel deployment).

import { NextRequest, NextResponse } from 'next/server'

const SVM_URL = process.env.SHORT_VIDEO_MAKER_URL ?? 'http://localhost:3123'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const res = await fetch(`${SVM_URL}/api/short-video`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    const data = await res.json()
    return NextResponse.json(data, { status: res.status })
  } catch (err) {
    return NextResponse.json(
      {
        error: 'Could not connect to short-video-maker',
        message: err instanceof Error ? err.message : 'Unknown error',
      },
      { status: 502 }
    )
  }
}
