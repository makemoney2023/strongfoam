# Strong Foam — project skills

Copied from `~/Desktop/ClaudeSkills/skills` (and PIRX SEO twins) for this rebuild.

| Skill | Role |
|-------|------|
| `scroll-craft` | Premium scroll-world grammar, fingerprint gate, GSAP engine |
| `gemini-omni` + `ai-video-gen` | Animate still backgrounds → 8s loops via Gemini Omni Flash |
| `img2threejs` | Photo → Three.js craft moments |
| `seo-geo-aeo` + `notfair-seo/*` + `schema-markup-generator` | AEO/SEO/GEO + JSON-LD |
| `blog-writing` + `content-planner` | Answer-first MDX / 90-day calendar |
| `brand` / `design` / `design-system` / `ui-styling` / `ui-ux-pro-max` | Visual system |
| `natural-human-voice` | Copy tone |
| `shadcn-ui` | Component adapter |
| `obsidian-secrets` | Resolve API keys from vault / `.env.local` |

## Omni background animation

```bash
# Priority heroes only (~5 clips, ~$4)
node scripts/omni-animate-backgrounds.mjs --priority

# Specific plates
node scripts/omni-animate-backgrounds.mjs 02 04 13

# All 15 shortlist plates
node scripts/omni-animate-backgrounds.mjs --all
```

Requires `GEMINI_API_KEY` in `.env.local` (never commit). Outputs under `assets/animated/`.
