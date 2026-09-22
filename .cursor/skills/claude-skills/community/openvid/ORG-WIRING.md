# Org wiring (ClaudeSkills)

This folder is the vendored [openvid](https://github.com/CristianOlivera1/openvid) app: browser video editor for product demos, device mockups, zooms, and 3D camera moves.

Upstream is an app, not a Claude skill. Seats use it when the source is a **screen recording or existing footage** that needs polish. Generated hero film still goes through OpenMontage.

| Seat | Use |
|------|-----|
| `video-producer` | Run the editor for Phase 15 / 19 product demos: record or upload, mockup, zoom, export |
| `brand-designer` | Still mockups only: device frames, 3D transforms, image masks. No timeline ownership |
| `creative-director` | Review-only: does the demo match brand and the brief. Does not run the editor |
| `paid-media-manager` | Request only. `ask_manager` → video-producer. Do not run OpenVid |

**Do not use OpenVid when:** the brief is generated video from prompts (Veo / OpenMontage Rule Zero). Those stay under `15-media/openmontage/` or `19-paid/openmontage/`.

**SSOT output**

| Kind | Path |
|------|------|
| Demo / mockup video | `docs/projects/<active>/business-idea/15-media/openvid/<slug>-final.{mp4,webm,gif}` |
| Paid demo cutdowns | `docs/projects/<active>/business-idea/19-paid/openvid/<slug>-ad-final.{mp4,webm}` |
| Still mockups | leased brand / page / paid still paths (not a new tree) |

**How to run (operator or video-producer on this Mac)**

```bash
cd .cursor/skills/claude-skills/community/openvid
pnpm install
cp .env.example .env
# Walkthrough exports do not need Supabase. In .env set:
#   NEXT_PUBLIC_OPENVID_ALLOW_LOCAL_EXPORT=true
pnpm dev
```

Open http://localhost:3010/en/editor. Port 3010 keeps this off the Strongfoam app on port 3000. `pnpm dev` also disables source maps so the editor can compile alongside the rest of this repo. Export from the app into the leased path above. Do not commit `node_modules/`, `.next/`, or `.env`.

**Nested skills worth reading**

| Pack | Who |
|------|-----|
| `.agents/skills/3d-web-experience/` | `web-designer`, `tech-lead` — 3D web craft (not the editor) |
| `.agents/skills/gsap/` | HyperFrames / GSAP reference. Prefer OpenMontage copies if both apply |
| `.agents/skills/react-three-fiber/` | json-render R3F. Prefer existing Three.js / img2threejs packs for product heroes |
| `.agents/skills/nextjs-developer/` | Skip. Seats already have Vercel Next.js packs |

Keep this file as the org entry. Re-vendor from upstream when updating.
