# Scroll / Video Background Shortlist

Top candidates for Next.js full-bleed scroll / video-loop backgrounds.
Preference: ≥1600px wide, construction / spray foam / fireproofing subject, no casino spam.

**Count:** 15  
**Copies:** hardlinked under `backgrounds/NN-filename`

| # | File | Dims | Bytes | Why | Suggested use |
|---|------|------|-------|-----|---------------|
| 1 | `backgrounds/01-servive.jpg` ← `textures/servive.jpg` | 1600×2133 | 280,809 | ≥1600px wide; texture/foam candidate | texture loop |
| 2 | `backgrounds/02-SFI1004_00.jpg` ← `projects/SFI1004_00.jpg` | 2200×1554 | 968,609 | ≥1600px wide; SFI series | hero bg |
| 3 | `backgrounds/03-SFI1001.jpg` ← `projects/SFI1001.jpg` | 1425×1900 | 619,906 | large; SFI series | hero bg / section bg |
| 4 | `backgrounds/04-SFI1003.jpeg` ← `projects/SFI1003.jpeg` | 1900×1425 | 505,618 | ≥1600px wide; SFI series | hero bg |
| 5 | `backgrounds/05-SFI1006.jpeg` ← `projects/SFI1006.jpeg` | 1900×1425 | 532,711 | ≥1600px wide; SFI series | hero bg |
| 6 | `backgrounds/06-SFI1009.jpg` ← `projects/SFI1009.jpg` | 1425×1900 | 745,112 | large; SFI series | hero bg / section bg |
| 7 | `backgrounds/07-SFI1007.jpg` ← `projects/SFI1007.jpg` | 1900×1258 | 415,908 | ≥1600px wide; SFI series | hero bg |
| 8 | `backgrounds/08-DSC_2335.jpg` ← `projects/DSC_2335.jpg` | 1200×1812 | 452,439 | large; jobsite photo | hero bg / section bg |
| 9 | `backgrounds/09-DSC_2348.jpg` ← `projects/DSC_2348.jpg` | 1200×1812 | 379,969 | large; jobsite photo | hero bg / section bg |
| 10 | `backgrounds/10-DSC_2355.jpg` ← `projects/DSC_2355.jpg` | 1200×1812 | 427,056 | large; jobsite photo | hero bg / section bg |
| 11 | `backgrounds/11-DSC_2391.jpg` ← `projects/DSC_2391.jpg` | 1200×1812 | 395,040 | large; jobsite photo | hero bg / section bg |
| 12 | `backgrounds/12-5.jpg` ← `projects/5.jpg` | 1920×1236 | 60,311 | ≥1600px wide | hero bg |
| 13 | `backgrounds/13-home.jpg` ← `projects/home.jpg` | 1920×1200 | 302,024 | ≥1600px wide; building exterior | hero bg |
| 14 | `backgrounds/14-IMG_8029.jpeg` ← `projects/IMG_8029.jpeg` | 1200×1600 | 253,402 | large; jobsite photo | hero bg / section bg |
| 15 | `backgrounds/15-IMG_8208.jpeg` ← `projects/IMG_8208.jpeg` | 1200×1600 | 627,845 | large; jobsite photo | hero bg / section bg |

## Animated (Gemini Omni Flash)

Priority 16:9 heroes generated 2026-09-16 via `scripts/omni-animate-backgrounds.mjs` (~$4 total):

| # | Still | Loop |
|---|-------|------|
| 02 | `backgrounds/02-SFI1004_00.jpg` | `animated/16x9/sf-bg-02-sfi-hero-spray_omni.mp4` |
| 04 | `backgrounds/04-SFI1003.jpeg` | `animated/16x9/sf-bg-04-sfi-wide-structure_omni.mp4` |
| 05 | `backgrounds/05-SFI1006.jpeg` | `animated/16x9/sf-bg-05-sfi-roof-deck_omni.mp4` |
| 07 | `backgrounds/07-SFI1007.jpg` | `animated/16x9/sf-bg-07-sfi-fireproofing_omni.mp4` |
| 13 | `backgrounds/13-home.jpg` | `animated/16x9/sf-bg-13-home-exterior_omni.mp4` |

Run `node scripts/omni-animate-backgrounds.mjs --all` for the remaining 9:16 / texture plates. Manifest + `interaction_id`s (for conversational Omni edits) live in `animated/manifest.json`.

## Implementation tips

- Prefer Ken Burns / slow zoom on stills rather than stretching small thumbs.
- Prefer Omni loops for pinned / scrubbed hero acts; keep still fallbacks for `prefers-reduced-motion`.
- Best texture-loop candidates also in `textures/` (`servive.jpg`, `image.png`, foam stock).
- Overlay brand `#009ee2` / `#e8043d` gradients at ~40–60% for typography contrast.
- Avoid manufacturer product-pack shots (Genyk/Henry/etc.) as full-bleed heroes — use as product strip.

