# SFI source media audit

## Structural inventory

The generated structural inventory is
`assets/source-media-inventory.json`. It was produced from the external,
read-only `SFI WEBSITE` source directory. Inventory records contain only
source-relative media paths; the absolute source location is not persisted.

The 2026-10-13 inventory matches the approved baseline:

- 576 files: 544 images and 32 videos
- 484 exact-unique images
- 47 exact duplicate groups and 60 redundant image files
- 34 images below the fixed 720-pixel short-edge threshold
- 0 corrupt images and 0 unreadable videos

The inventory records SHA-256 hashes, dimensions, orientation, exact-duplicate
membership and keeper selection, ffmpeg/ffprobe versions, video metadata, and
five configured representative sample times per video.

## Commands

```bash
node scripts/audit-sfi-media.mjs inventory \
  --source "/absolute/path/to/SFI WEBSITE" \
  --inventory assets/source-media-inventory.json

node scripts/audit-sfi-media.mjs check \
  --source "/absolute/path/to/SFI WEBSITE" \
  --inventory assets/source-media-inventory.json

REVIEW_DIR="$(mktemp -d "${TMPDIR%/}/strongfoam-sfi-media-audit.XXXXXX")"
node scripts/audit-sfi-media.mjs review \
  --source "/absolute/path/to/SFI WEBSITE" \
  --inventory assets/source-media-inventory.json \
  --review-dir "$REVIEW_DIR"
```

`inventory` replaces only the inventory artifact. It never creates or changes
human decisions. `check` recomputes expected data in memory and writes nothing.
`review` writes contact sheets and video frames only to the requested review
directory, which must be outside the source directory.

## Completed visual review

All 484 exact-unique images and representative frames from all 32 videos were
reviewed on 2026-10-13. The review covered subject and trade, resolution, crop,
exposure, blur, orientation, placement suitability, PPE, faces, licence plates,
signage, addresses, ownership, current relationships, and publication
permission. The user's direction to incorporate all useful supplied material
records approval for the selected first-party media; uncertain project rights
and every third-party logo remain held.

The final 576-file decision set is stored separately from the structural
inventory in `assets/source-media-decisions.json`. The deterministic compiled
view is `assets/source-media-manifest.json`.

- 19 publish: 14 informative images and 5 videos
- 480 hold: potentially useful source material awaiting a documented project,
  client, privacy, relationship, or publication-rights clearance
- 60 duplicate: every redundant exact copy points to its inventory keeper
- 17 reject: low-resolution, redundant near-duplicate, equipment-only,
  poorly framed, or otherwise weaker material

### Approved image shortlist

- Building-envelope work: `IMG_7852.jpeg`, `IMG_7879.jpeg`, `IMG_7880.jpeg`,
  `IMG_7881.jpeg`, `IMG_7960.jpeg`, `IMG_7996 2.jpeg`, and `IMG_9642.jpeg`
- Project context: `IMG_7930.jpeg`
- Spray foam work: `IMG_8063.jpeg`, `IMG_8208.jpeg`, `IMG_8252.jpeg`,
  `IMG_9571.jpeg`, `IMG_9636.jpeg`, and `IMG_9678.jpeg`

The worker images above show task-appropriate protective equipment, and faces
are absent, distant, or obscured. No readable private address or licence plate
was found in the selected frames.

### Approved video shortlist

- `2688129a-064d-4092-93a9-224d9407d1b3.mp4`
- `71ccc8f7-bbe3-44ca-8417-55d8492f470b.mp4`
- `IMG_3398.m4v`
- `IMG_9574.mov`
- `IMG_9677.mov`

These are representative application clips. Similar edits, very short clips,
truck-only footage, and lower-quality duplicates remain held or rejected.

### Logo and relationship gate

No supplied raster logo was approved for publication. Strong Foam raster
derivatives are held in favour of the supplied vector/PDF brand master.
Blockwall, Dakon Construction, GCP, Genyk, Henry, MCC, SEM Construction,
Soprema, and all unidentified logo files remain held until identity, current
relationship, official artwork, and publication permission are documented.
They must not be copied to a public partner folder.

The compiled artifacts can be reproduced and checked with:

```bash
node scripts/audit-sfi-media.mjs compile \
  --inventory assets/source-media-inventory.json \
  --decisions assets/source-media-decisions.json \
  --manifest assets/source-media-manifest.json

node scripts/audit-sfi-media.mjs check \
  --source "/absolute/path/to/SFI WEBSITE" \
  --inventory assets/source-media-inventory.json \
  --decisions assets/source-media-decisions.json \
  --manifest assets/source-media-manifest.json
```

The check command recomputes the inventory and manifest in memory and writes
nothing. Curated derivatives are imported only from records whose final status
is `publish`; the raw `SFI WEBSITE` directory remains external and unchanged.

## Approved derivative publication

On 2026-10-13, the 19 approved source files were copied to hash-bound master
paths beneath `assets/projects/masters/` and `assets/animated/masters/`. The
generator produced 60 delivery files:

- 45 WebP/JPEG image derivatives covering responsive gallery, hero, section,
  and social-share profiles
- 5 H.264 MP4 videos, 5 VP9 WebM videos, and 5 WebP posters
- no outputs for any `hold`, `duplicate`, or `reject` record

All five approved videos are silent application footage. Their
`audioRequired: false` decisions cause the delivery encodes to strip source
audio. The publication check verifies dimensions, codec, audio state, and
source-matched duration (within a 0.25-second transcode tolerance). The
application does not currently render those videos, so no autoplay or caption
surface is published. Any future video component must use the approved poster
for reduced-motion/autoplay-blocked states and render the manifest's equivalent
descriptive text beside the clip.

No logo from the 19-file approved set was published. Third-party marks remain
held, and no Strong Fire lockup is added because an approved official master is
not present. The two existing Strong Foam site lockups remain the only static
brand files synchronized outside the compiled derivative list. A visual
comparison against `SFI WEBSITE/Logo - Strong Foam Insulation.pdf` confirmed
that both retain the official `STRONGFOAM INSULATION` wordmark geometry and
blue/red color split; the transparent version changes the light letters only
for contrast on dark backgrounds.

OpenNext for Cloudflare supports Next.js image optimization only when an
`IMAGES` binding or custom loader is configured. This Worker declares neither,
so these reviewed, pre-sized derivatives are served as static assets through
the OpenNext `ASSETS` binding rather than relying on Vercel or Cloudflare
runtime transformation. No `public/_headers` cache override is configured;
Cloudflare's default static-asset response therefore revalidates instead of
being documented as immutable. Reference:
`https://opennext.js.org/cloudflare/howtos/image` (reviewed 2026-10-13).
The deployed Worker confirmed `HTTP 200`, the expected image content type,
`Cache-Control: public, max-age=0, must-revalidate`, and an `ETag` for a
synchronized Strong Foam lockup.

Generation and publication verification:

```bash
node scripts/audit-sfi-media.mjs generate \
  --source "SFI WEBSITE" \
  --manifest assets/source-media-manifest.json \
  --assets-root assets
npm run media:sync
node scripts/audit-sfi-media.mjs check \
  --source "SFI WEBSITE" \
  --inventory assets/source-media-inventory.json \
  --decisions assets/source-media-decisions.json \
  --manifest assets/source-media-manifest.json \
  --public-root public/media
```

The verified result was 19 masters, 60 derivatives, 62 synchronized public
files (60 derivatives plus 2 static Strong Foam lockups), zero missing outputs,
zero public masters, and zero outputs associated with unpublished records.
