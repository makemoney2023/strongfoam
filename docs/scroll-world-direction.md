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
3. **Capability rail:** reveal the five scopes as one coordinated horizontal
   package. Cropping at the rail edges is intentional.
4. **Field process:** reveal the original `SFI1006.jpeg` upward like an installed
   layer while drawings become field steps.
5. **Sector frame:** use fireproofing footage as depth behind commercial, ICI,
   and multi-unit positioning.
6. **Project evidence:** return to still photography so the viewer can inspect
   real work without motion competing for attention.
7. **Ontario route:** draw the operating footprint from Kitchener through London
   and the GTA.
8. **Close:** make the estimating handoff the visual peak, not an afterthought.

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
- `SFI1006.jpeg`: field-process chapter. The legacy site used this image beside
  its company story.
- `SFI1007.jpg`: multi-unit project evidence.
- `IMG_7880.jpeg`: commercial / ICI project evidence.
- `strongfoam-bar.jpg`: brand-owned installation texture in the estimating
  close, darkened for copy contrast.
- Omni `02` and `07` loops: slow, muted environmental motion in the hero and
  sector frame.

Product marks remain evidence only. They should appear in systems or product
context after current applicator relationships and permissions are confirmed.

## Publication holds

- Replace generic project labels only after project names and client permissions
  are confirmed.
- Confirm active London / Dorchester and Woodbridge branch NAP before the GEO
  content freeze.
- Confirm exact product SKUs and applicator status before publishing product
  relationship claims.
