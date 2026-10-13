# Scroll-world direction

## Experience thesis

The page should feel like moving through a commercial project package, not
watching a generic construction reel. Each scroll behavior has a job:

1. **Hero:** establish scale and specialty-trade positioning over the generated
   site footage. Hero copy and CTAs share the header `page-rail` inset so they
   line up with the Strong Foam logo.
2. **Trust hold:** reduce the offer to three large, sequential proof statements.
   A low-contrast structural grid and cyan/red datum line give the light field
   depth without competing with the typography.
3. **Capability rail:** reveal the four public service routes as one
   coordinated horizontal package, followed by the endorsed Strong Fire
   feature. Cropping at the rail edges is intentional.
4. **Field process:** reveal the approved `IMG_7879` gallery derivative upward
   like an installed layer while drawings become field steps.
5. **Sector frame:** reuse that approved construction still as depth behind
   commercial, ICI, and multi-unit positioning.
6. **Project evidence:** return to still photography so the viewer can inspect
   real work without motion competing for attention.
7. **Approved relationships:** retain the chapter even when no third-party mark
   has completed every publication gate; held marks never render.
8. **Ontario route:** draw only the approved Kitchener operations record.
9. **Close:** make the estimating handoff the visual peak, not an afterthought.

This is a chaptered film grammar with one deliberate horizontal chapter. It
avoids repeating one reveal recipe across every section.

## Motion rules

- GSAP ScrollTrigger owns scroll-linked transforms and opacity.
- The hero has one word-built entrance and a slow media push.
- The trust chapter is the longest hold.
- Services is pinned on every viewport with pin spacing, then becomes a native
  snap rail only when the visitor prefers reduced motion. Vertical scroll moves
  the five scopes. The next chapter cannot slide under the rail.
- The process image is the only full-frame clip-path wipe.
- Project cards reveal once and stay visible.
- Reduced-motion users get settled copy, static poster frames, and a native
  service rail.
- Motion is cleaned up through `gsap.context()` when the route unmounts.
- `marketing-page-model.ts` is the pure selection contract for section order,
  four service links, approved project/partner/location records, and fallback
  flags. GSAP consumes that model without becoming the content source.

The shared marketing layout keeps `SiteHeader` as the small interactive client
boundary and renders a server-compatible footer from public contact channels.
Interior routes reuse the components under `src/components/marketing/`; they do
not replace or flatten this homepage.

`public/media` is a generated allowlisted copy of manifest derivatives plus the
two approved static Strong Foam lockups (not a symlink). Masters, held assets,
and review artifacts are never synchronized.

Vercel Hobby blocks commits whose GitHub author is not `makemoney2023`. Every
commit in this repo must use author and committer
`makemoney2023 <124006256+makemoney2023@users.noreply.github.com>` via
`GIT_AUTHOR_*` / `GIT_COMMITTER_*` for that command only — never `git config`.

## Asset placement

- `SFI-Logo-Jpeg-EDIT_00-removebg-preview.png`: real Strong Foam mark used
  in the header and estimating close on dark surfaces.
- `media-93e698a55726cd71-img-7880-hero-1920x1080.webp`: approved
  commercial-envelope hero derivative.
- `media-da889acd7dfb11ec-img-7879-gallery-1600w-1600x778.webp`: approved
  field-process, sector, and project-evidence derivative.
- The five approved videos have silent MP4/WebM encodes and poster derivatives,
  but no video surface is currently rendered. Cinematic chapters continue to
  use GSAP movement on approved stills; reduced-motion mode uses the same
  reviewed images as static backgrounds. Legacy Omni loops and held/duplicate
  source images are not rendered.

Product marks remain evidence only. They should appear in systems or product
context after current applicator relationships and permissions are confirmed.

## Publication holds

- Replace generic project labels only after project names and client permissions
  are confirmed.
- London / Dorchester and Woodbridge remain omitted until each address, active
  status, public label, and service-area wording is approved.
- Confirm exact product SKUs and applicator status before publishing product
  relationship claims.
