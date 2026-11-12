# Command Hub

Didi Anolue's hub for seeing and approving her social posts, with the health, revenue and tasks of her sites
alongside. A Next.js app deployed on Vercel.

Cowork researches, drafts, checks and schedules the posts. The hub is where Didi reviews and approves them
(the **Sunday review**, `/review`). Start with:

- [`COWORK.md`](COWORK.md) — what this is and the rules that never change
- [`docs/social-team-design.md`](docs/social-team-design.md) — the agreed design
- [`docs/cowork-operating-guide.md`](docs/cowork-operating-guide.md) — the instructions for each Cowork task
- [`AGENTS.md`](AGENTS.md) — notes for coding agents (this is not the Next.js you know)

## Running it

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). It needs the environment variables for Supabase and
Blotato; see `data/hub/README.md` for the home page and `supabase/migrations/` for the database.

```bash
npm run lint
npm run build
```

Old design documents are in `archive/legacy-docs/` and are kept for the record only.
