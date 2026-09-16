# Strong Foam Insulation — website rebuild

Next.js App Router rebuild: 3D scroll-world marketing site (AEO / SEO / GEO).

**Remote:** https://github.com/makemoney2023/strongfoam.git

## Run

```bash
npm install
npm run dev          # http://localhost:3000
npm test
npm run build
```

## Layout

| Path | Role |
|------|------|
| `src/app/` | App Router (home scroll-world) |
| `src/content/site.ts` | NAP, services, FAQ, scroll overlays |
| `src/lib/site-schema.ts` | Organization / WebSite / FAQ `@graph` |
| `src/components/` | Header, scroll page, shadcn/ui |
| `assets/` | Brand / projects / Omni loops |
| `public/media/*` | Copied from `assets/` on `predev` / `prebuild` |
| `docs/` | Brief, dossier, recovered copy, SEO pack |
| `.cursor/skills/` | scroll-craft, gemini-omni, SEO, design |

Scroll behavior and asset-placement decisions are documented in
[`docs/scroll-world-direction.md`](docs/scroll-world-direction.md).

## Copy for overlays

See [`docs/copy-overlay-readiness.md`](docs/copy-overlay-readiness.md).  
**Short answer:** yes for services / FAQ / contact / trust; stubs remain for process steps and project captions; hero H1 is a draft from ICP pillars.

## Omni backgrounds

```bash
npm run omni:bg -- --priority   # or --all
```

Requires `GEMINI_API_KEY` in `.env.local` (gitignored).

## Stack

Next.js 16 · React 19 · Tailwind 4 · shadcn/ui · GSAP · Three / R3F · Vitest
