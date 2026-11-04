# Workshop Migration — TCC → MYCP platform

## What We're Doing

Moving both TCC workshops to the Master Your Career Path MYCP platform
as online classrooms/courses. TCC will link out to the MYCP platform for both.

## The Two Workshops

| Workshop | Current URL | For |
|----------|-------------|-----|
| CHAOS Workshop | theconcurrentcontractor.com/workshops/chaos | Single contract holders |
| The Concurrent Contractor™ | theconcurrentcontractor.com/workshops/concurrent-contractor | Multiple contract holders |

## Steps

### Phase 1 — Set up on the MYCP platform
- [ ] Add CHAOS Workshop as a classroom in the MYCP platform
- [ ] Add Concurrent Contractor Workshop as a classroom in MYCP platform
- [ ] Decide pricing: free for members / paid standalone / upsell to membership
- [ ] Note the direct URLs for each classroom once created

### Phase 2 — Update TCC site
- [ ] Update `/workshops/chaos/page.tsx` — replace booking form with link to the platform URL
- [ ] Update `/workshops/concurrent-contractor/page.tsx` — same
- [ ] Update `/workshops/page.tsx` — update CTAs to point to the MYCP platform
- [ ] Update Navigation if workshops link goes anywhere specific
- [ ] Remove Command Center page and all references (separate cleanup)

### Phase 3 — Cleanup
- [ ] Update `lib/emailSequence.ts` — replace Command Center CTAs with workshop/MYCP platform CTAs
- [ ] Update `app/terms/page.tsx` — remove Command Center references
- [ ] Update COWORK.md to mark done

## Notes

- MYCP platform is the platform — masteryourcareerpath.com
- TCC drives the traffic and leads; MYCP platform is where the product lives
- Both workshops serve contractors, so the audience crossover is natural
- The CHAOS Assessment on TCC should eventually funnel into MYCP platform sign-up
