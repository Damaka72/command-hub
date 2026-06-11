// ── Weekly Plan API ───────────────────────────────────────────────────────────
// GET  /api/plan — returns current coordinator data + available pillars
// POST /api/plan — saves updated coordinator data to content-coordinator.json
//
// This route writes to the filesystem so it only works when running locally
// with `npm run dev`. The Vercel deployment is read-only.

import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

const DATA_ROOT         = path.join(process.cwd(), 'data');
const COORDINATOR_PATH  = path.join(DATA_ROOT, 'content-coordinator.json');
const PILLARS_PATH      = path.join(DATA_ROOT, 'content-pillars.json');

export async function GET() {
  try {
    const coordinator = JSON.parse(fs.readFileSync(COORDINATOR_PATH, 'utf-8'));
    const pillars     = JSON.parse(fs.readFileSync(PILLARS_PATH, 'utf-8'));
    return NextResponse.json({ coordinator, pillars });
  } catch (err) {
    return NextResponse.json(
      { error: 'Could not read plan data', detail: String(err) },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();

    // Validate required shape
    if (!body.weekCommencing || !body.sites || typeof body.sites !== 'object') {
      return NextResponse.json(
        { error: 'Invalid plan data — weekCommencing and sites are required' },
        { status: 400 },
      );
    }

    const coordinator = {
      weekCommencing:    body.weekCommencing,
      campaignObjective: body.campaignObjective ?? null,
      setAt:             new Date().toISOString(),
      sites:             body.sites,
    };

    fs.writeFileSync(COORDINATOR_PATH, JSON.stringify(coordinator, null, 2), 'utf-8');

    return NextResponse.json({ success: true, coordinator });
  } catch (err) {
    return NextResponse.json(
      { error: 'Could not save plan', detail: String(err) },
      { status: 500 },
    );
  }
}
