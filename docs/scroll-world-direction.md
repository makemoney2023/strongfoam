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
4. **Field process:** reveal the original `SFI1006.jpeg` upward like an installed
   layer while drawings become field steps.
5. **Sector frame:** use fireproofing footage as depth behind commercial, ICI,
   and multi-unit positioning.
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

`public/media` is a generated copy of `assets/` (not a symlink). Relative
symlinks caused Vercel’s `next build` public-file copy to fail with “Cannot
copy … to a subdirectory of itself.”

Vercel Hobby blocks commits whose GitHub author is not `makemoney2023`. Every
commit in this repo must use author and committer
`makemoney2023 <124006256+makemoney2023@users.noreply.github.com>` via
`GIT_AUTHOR_*` / `GIT_COMMITTER_*` for that command only — never `git config`.

## Asset placement

- `SFI-Logo-Jpeg-EDIT_00-removebg-preview.png`: real Strong Foam mark used
  in the header and estimating close on dark surfaces.
- `IMG_7880.jpeg`: approved commercial-envelope hero and project evidence.
- `IMG_7879.jpg`: approved project evidence and reduced-motion sector still.
- `services/IMG_9636-1600.webp`: approved spray-foam field-process image.
- `brand/strongfoam-logo.svg`: vector Strong Foam lockup from the supplied PDF master.
- Hero video: `animated/16x9/sf-hero-envelope-spray.mp4` (+ `-poster.jpg`),
  a 12 s muted loop cut from approved shortlist `IMG_9677.mov` (0:01–0:13):
  spray foam applied to a high-rise exterior wall.
- Sector video: `animated/16x9/sf-sector-deck-fireproofing.mp4` (+ `-poster.jpg`),
  a 12 s muted loop cut from approved shortlist `IMG_3398.m4v` (0:15–0:27):
  spray application to a commercial concrete deck from scaffolding.
- Derivatives: H.264 High, 1920×1080, 30 fps, CRF 27, `+faststart`, audio
  stripped; posters are 1920 px JPEG frames from the same segment. The
  GSAP `data-hero-media` / `data-sector-media` parallax drives the `<video>`
  elements; reduced-motion users get the poster as a static background.
  Legacy Omni loops and held/duplicate source images are not rendered.

Product marks remain evidence only. They should appear in systems or product
context after current applicator relationships and permissions are confirmed.

## Publication holds

- Replace generic project labels only after project names and client permissions
  are confirmed.
- London / Dorchester and Woodbridge remain omitted until each address, active
  status, public label, and service-area wording is approved.
- Confirm exact product SKUs and applicator status before publishing product
  relationship claims.
