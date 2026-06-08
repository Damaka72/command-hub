// File location in your repo: app/api/short-video/[videoId]/status/route.ts
//
// Proxies video status polling to the local short-video-maker server.
 
import { NextRequest, NextResponse } from 'next/server'
 
const SVM_URL = process.env.SHORT_VIDEO_MAKER_URL ?? 'http://localhost:3123'
 
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ videoId: string }> }
) {
  const { videoId } = await params
  try {
    const res = await fetch(`${SVM_URL}/api/short-video/${videoId}/status`)
    const data = await res.json()
    return NextResponse.json(data, { status: res.status })
  } catch (err) {
    return NextResponse.json(
      {
        error: 'Could not reach short-video-maker',
        message: err instanceof Error ? err.message : 'Unknown error',
      },
      { status: 502 }
    )
  }
}
 
