# Verbatim configuration removed from the hub

These are the exact blocks taken out when The Concurrent Contractor was retired. To restore the site, paste each block back where it came from (the file and line range are given), or restore the whole file from the commit named in README.md.

### Hub site list entry (app/lib/sites.ts)

From `app/lib/sites.ts` (lines 35–62 at the point of retirement):

```ts
  {
    id: "theconcurrentcontractor",
    name: "The Concurrent Contractor",
    url: "theconcurrentcontractor.com",
    description: "IR35, contracting resources and community",
    github: "https://github.com/Damaka72/Theconcurrentcontractor",
    admin: "https://www.theconcurrentcontractor.com/admin",
    socialAgent: "https://www.theconcurrentcontractor.com/social-agent",
    brandColor: "#FFD700",
    initials: "TC",
    marketingPlan: {
      blotato: {
        status: 'active' as const,
        statusLabel: 'Active',
        platform: 'Instagram + YouTube',
        schedule: '1 post/day',
        nextAction: 'Continue weekly scheduling in Blotato',
      },
      beehiiv: {
        status: 'in_progress' as const,
        statusLabel: 'Published within The Pathway',
        cadence: 'The Consultant — published within The Pathway (MYCP Beehiiv)',
        nextAction: 'Contribute The Consultant section to The Pathway (MYCP Beehiiv)',
      },
    },
  },
  {
    id: "masteryourcareerpath",
```

### Site colour (app/lib/siteColors.ts)

From `app/lib/siteColors.ts` (lines 16–16 at the point of retirement):

```ts
  theconcurrentcontractor: { key: 'TCC',   name: 'The Concurrent Contractor', accent: '#f59e0b', tint: '#f59e0b1f' },
```

### Short code (app/lib/siteConstants.ts)

From `app/lib/siteConstants.ts` (lines 3–3 at the point of retirement):

```ts
  theconcurrentcontractor: 'TCC',
```

### Content pipeline site config (agents/site-configs.ts)

From `agents/site-configs.ts` (lines 123–153 at the point of retirement):

```ts
  {
    id: 'theconcurrentcontractor',
    name: 'The Concurrent Contractor',
    url: 'theconcurrentcontractor.com',
    platforms: ['LinkedIn', 'Instagram'],
    primaryPlatform: 'LinkedIn',
    automateBlotato: true,
    blotatoPlatforms: ['LinkedIn', 'Instagram', 'Facebook'],
    audience: 'UK contractors with 5+ years\' experience who are managing multiple contracts or want to optimise their current one',
    tone: 'Straight-talking, knowledgeable, peer-to-peer — never advisory or preachy',
    rubricName: 'Contractor lens rubric',
    passChecks: [
      'Written through the lens of an experienced UK contractor, not a career advisor',
      'Addresses a specific contracting topic: OPERATE framework, rate optimisation, client management, IR35, or contractor mindset',
      'Practical and peer-to-peer in tone — shares insight, does not dispense advice',
    ],
    failCheck: 'Fails if it reads as generic career, recruitment, or motivational content',
    subagentSystemPrompt: `You are writing content for The Concurrent Contractor, a resource for experienced UK contractors.

The audience are contractors with 5+ years of experience who are either already running multiple contracts or actively trying to optimise the one they have. They are not beginners. They know how contracting works. Write as a peer who has been there, not as an advisor handing down guidance.

The platform is built around the OPERATE framework — a structured approach to running multiple contracts without chaos. Reference OPERATE by name where relevant to the content pillar.

Content pillars:
${pillarBlock('theconcurrentcontractor')}

Never write generic career content. Never sound like a recruiter or financial advisor. Never be preachy. UK English throughout. Peer-to-peer tone always.

${DIVERSITY_GUIDELINE}`,
    researchFocus: 'IR35/off-payroll working rule changes, HMRC guidance updates, day-rate and contract-market trends, notable contractor tribunal cases or client-side IR35 policy shifts, and UK contracting-market conditions.',
  },
```

### Blotato accounts (agents/accounts.ts)

From `agents/accounts.ts` (lines 67–72 at the point of retirement):

```ts
  theconcurrentcontractor: {
    'LinkedIn':    { accountId: '21073', platform: 'linkedin',  target: { pageId: '108040401' } },       // TCC company page
    'Instagram':   { accountId: '46494', platform: 'instagram', target: {} },                            // @theconcurrentcontractor (needs media)
    'Facebook':    { accountId: '31336', platform: 'facebook',  target: { pageId: '715241081677485' } }, // TCC Facebook page
    'X (Twitter)': null, // not connected
  },
```

### Blotato account ids (agents/accounts.ts)

From `agents/accounts.ts` (lines 96–96 at the point of retirement):

```ts
  theconcurrentcontractor: ['46494', '36388'],                          // 46494 = Instagram @theconcurrentcontractor · 36388 = YouTube (TCC)
```

### Social accounts (app/lib/socialAccounts.ts)

From `app/lib/socialAccounts.ts` (lines 25–30 at the point of retirement):

```ts
  theconcurrentcontractor: [
    { platform: 'Facebook',  handle: 'The Concurrent Contractor', url: 'https://www.facebook.com/profile.php?id=715241081677485', status: 'linked' },
    { platform: 'Instagram', handle: '@theconcurrentcontractor',  url: 'https://www.instagram.com/theconcurrentcontractor/', status: 'linked' },
    { platform: 'LinkedIn',  handle: 'The Concurrent Contractor', url: 'https://www.linkedin.com/company/108040401/', status: 'linked' },
    { platform: 'YouTube',   handle: 'The Concurrent Contractor', url: null, status: 'needs_link', note: "Blotato account id 36388 has no public channel handle on record — paste the real channel URL here." },
  ],
```

### Grader rubric shown on the site card (app/components/SiteCard.tsx)

From `app/components/SiteCard.tsx` (lines 98–105 at the point of retirement):

```ts
  theconcurrentcontractor: {
    pass: [
      'Written through the lens of a practising UK IT contractor',
      'Addresses IR35, rate strategy, or market intel',
      'Practical and peer-to-peer in tone — not advisory',
    ],
    fail: 'Fails if it reads as generic career or recruitment content',
  },
```

### Revenue flow (app/components/RevenueFlow.tsx)

From `app/components/RevenueFlow.tsx` (lines 35–43 at the point of retirement):

```ts
  theconcurrentcontractor: {
    accent: '#FFD700',
    nodes: [
      ['Article /', 'CHAOS'],
      ['Newsletter'],
      ['Workshop'],
      ['£89'],
    ],
  },
```

### Live status probe config (app/api/status/route.ts)

From `app/api/status/route.ts` (lines 141–151 at the point of retirement):

```ts
  {
    id: 'theconcurrentcontractor',
    url: 'https://www.theconcurrentcontractor.com',
    vercelProjectId: 'prj_6a52DLbKMQSpKfcGFe0KpqfpNKie',
    revenueModel: 'leadgen',
    newsletterProvider: 'Beehiiv',
    newsletterConnected: false,
    revenueProvider: null,
    revenueConnected: false,
    servesMostData: false, // Next.js — data/ not in public/
  },
```

### Blotato site detection maps (app/api/blotato/route.ts)

From `app/api/blotato/route.ts` (lines 37–49 at the point of retirement):

```ts
  'Old Oak Town':              'oldoaktown',
  'The Concurrent Contractor': 'theconcurrentcontractor',
  'AI Viral Video Prompts':    'aiviralvideoprompts',
  'Master Your Career Path':   'masteryourcareerpath',
};

const USERNAME_MAP: Record<string, string> = {
  oldoaktown:              'oldoaktown',
  aiviralvideoprompts:     'aiviralvideoprompts',
  masteryourcareerpath:    'masteryourcareerpath',
  theconcurrentcontractor: 'theconcurrentcontractor',
};

```

### Content pillars (data/content-pillars.json)

From `data/content-pillars.json` (lines 68–99 at the point of retirement):

```json
  "theconcurrentcontractor": [
    {
      "id": "multiple-contracts",
      "name": "Running multiple contracts",
      "description": "The OPERATE framework, scheduling, managing two clients without chaos — the mechanics of concurrent contracting"
    },
    {
      "id": "single-contract-optimisation",
      "name": "Single contract optimisation",
      "description": "The CHAOS assessment, billable hours, reclaiming wasted capacity — getting more from the contract you already have"
    },
    {
      "id": "income-strategy",
      "name": "Contractor income strategy",
      "description": "Rate setting, hidden opportunity cost, true hourly rate — understanding what you actually earn and how to improve it"
    },
    {
      "id": "client-management",
      "name": "Client management & communication",
      "description": "Expectation setting, proactive reporting, protecting your reputation — running client relationships like a business"
    },
    {
      "id": "contractor-mindset",
      "name": "Contractor mindset & resilience",
      "description": "Burnout, boundaries, operating like a business — the mental and operational side of sustainable contracting"
    },
    {
      "id": "ir35-essentials",
      "name": "IR35 & contractor essentials",
      "description": "Compliance, structure, staying protected — the non-negotiable fundamentals every serious contractor needs to understand"
    }
  ],
```

### Weekly plan fallback (data/content-coordinator.json)

From `data/content-coordinator.json` (lines 11–14 at the point of retirement):

```json
    "theconcurrentcontractor": {
      "pillarId": "ir35-essentials",
      "theme": "IR35 & contractor essentials — compliance, structure and staying protected: the non-negotiable fundamentals every serious contractor needs to understand"
    },
```

### Coordinator status (data/coordinator-status.json)

From `data/coordinator-status.json` (lines 20–27 at the point of retirement):

```json
    "tcc": {
      "lastBriefed": "",
      "weekTheme": "",
      "postsApproved": 0,
      "postsPending": 0,
      "newsletterStatus": "not started",
      "nextSend": ""
    },
```

### Coordinator project link (app/components/SundayChecklist.tsx)

From `app/components/SundayChecklist.tsx` (lines 16–16 at the point of retirement):

```ts
  { key: "tcc",   label: "TCC",   url: "https://claude.ai/project/0197e1d1-9a28-729f-8388-17974d7e829c" },
```
