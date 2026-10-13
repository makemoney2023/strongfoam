# Site media map (2026-10-13)

The owner approved every file in the supplied `SFI WEBSITE` Google Drive folder
on 2026-10-13 (`assets/page-media.json` → `approval`; `contentApprovals.sourceMedia`;
`source-media-decisions.json` rights basis). Derivatives are built by
`node scripts/build-page-media.mjs --source "/path/to/SFI WEBSITE"` and synced
to `/media`. `src/content/page-media.test.ts` blocks a source file from
appearing in more than one prominent placement.

| Page / section | Media | Source |
|---|---|---|
| Home hero | video loop | `IMG_9677.mov` |
| Home capability rail: spray foam | photo | `IMG_8207.jpeg` (vaulted roof foam) |
| Home rail: fire protection | photo | `IMG_3400.m4v` still @17.5s, cropped (applicator spraying fire protection overhead from scaffold) |
| Home rail: air-vapour barriers | photo | `IMG_7257.jpeg` (green-wrapped mid-rise) |
| Home rail: SPF roofing | photo | `roofing1.jpg` (foam being sprayed across a flat roof deck) |
| Home rail close | Strong Fire lockup (on dark) | `Strong Fire 2.pdf` |
| Home process | photo | `IMG_9741.jpeg` (spraying wall cavity) |
| Home sectors | video loop | `IMG_3398.m4v` |
| Home projects (3) | photos | `DSC_5917 (1).jpeg`, `DSC_2370.jpg`, `DSC_5925.jpeg` |
| Home + /partners | 29 partner logos | `SFI Client Logo's/`, `SFI Supplier Logo.docx` |
| /projects gallery (14) | photos | `IMG_7879`, `IMG_7880`, `IMG_7930`, the 3 home projects, `DSC_2332`, `DSC_2365`, `DSC_2366`, `DSC_5928`, `IMG_8102`, `IMG_2670`, `IMG_1070`, `IMG_3116` |
| /services/spray-foam-insulation | 3 photos + 3 videos | `IMG_9636`, `IMG_9678`, `B36EA202-….jpeg`; `IMG_9576.mov`, `2688129a-….mp4`, `71ccc8f7-….mp4` |
| /services/air-vapour-barriers | 5 photos + 1 video | `IMG_7996 2`, `IMG_7881`, `IMG_9642`, `IMG_7998`, `DSC_5946`; `IMG_9647.mov` |
| /services/fire-protection | lockup + 1 photo + 1 video | `Strong Fire 2.pdf`; `IMG_0574.jpeg`; `IMG_3400.m4v` |
| /services/spf-roofing | 2 photos | `63af8c77-….jpeg`, `IMG_00000011.jpg` |
| /about | 4 photos | `IMG_8998`, `BDF25049-… 2.jpeg`, `SFI1004.jpeg`, `IMG_9697.jpeg` |
| Header / footer / close | Strong Foam vector logo | `Logo - Strong Foam Insulation.pdf` |

Excluded on review: photos showing children or close-up faces, equipment
close-ups, renderings, very low-resolution fireproofing stills (≤ 392 px), the
promotional `joined_video_…mp4`, and clips shorter than 6 s.

Partner logos: trimmed, white plate knocked out to transparency, equal visual
area on a 320×120 canvas (WebP + PNG). They render grayscale and switch to full
colour on hover/focus (`.partner-logos--colour` forces colour). Demilec is held
because no logo file was supplied.

## Interior page heroes (`assets/heroes/`, synced to `/media/heroes`)

| Page | Type | Source |
|---|---|---|
| /services | video loop (12 s) | `IMG_9575.mov` 0:08 (spraying exposed roof framing) |
| /services/spray-foam-insulation | video loop (12 s) | `IMG_9574.mov` 0:04 (spraying a wood-framed room) |
| /services/fire-protection | photo | `IMG_0572.jpeg` (exposed steel joists/deck) |
| /services/air-vapour-barriers | photo | `IMG_8002.jpeg` (lift crew at green/blue barrier) |
| /services/spf-roofing | photo | `IMG_00000012.jpg` (flat commercial roof deck) |
| /projects | photo | `DSC_5919 (1).jpeg` (completed mid-rise + wrapped building) |
| /partners | photo | `IMG_9428 2.jpeg` (Strong Foam site banner) |
| /about | photo | `IMG_9001.jpeg` (Strong Foam truck at commercial site) |
| /locations | photo | `IMG_00000013.jpg` (aerial over the region) |
| /contact | photo | `IMG_9558.jpeg` (truck on residential jobsite) |
| /request-estimate | photo | `IMG_7853.jpeg` (applicator on lift, blue barrier) |
