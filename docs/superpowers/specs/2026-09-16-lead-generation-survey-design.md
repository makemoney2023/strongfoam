# Lead generation survey — design spec

**Date:** 2026-09-16  
**Product:** Strong Foam Insulation Inc. marketing site (`strongfoam.com`)  
**Status:** Draft for implementation planning (awaiting spec review)

## Problem

The rebuild’s homepage currently asks for an estimate via phone, mailto, and `#contact`. That does not qualify ICI / MUR work, recommend the right service package, collect drawings, or book a call. Estimating needs structured leads; visitors need a guided path that still respects the cinematic scroll-world.

## Goal

Ship a native, branded estimate survey that:

1. Starts from a **solid homepage CTA** (and matching CTAs in header, process, and contact).
2. **Qualifies** Ontario ICI / industrial / multi-unit work and **recommends** listed services.
3. Collects contact details plus optional drawings.
4. **Persists** the lead, **emails** estimating (and the visitor) via Resend.
5. Offers **Calendly booking only to qualified leads**, then records whether they booked.

## Success criteria

- Header, hero, process (“Send the package”), and contact primary buttons all navigate to `/request-estimate`. Phone remains a secondary path, never the only primary CTA.
- Adaptive wizard: residential / other is a short path; ICI / industrial / MUR is the full path.
- `qualifyLead` is deterministic and unit-tested (no weighted score in v1).
- Submitting creates exactly one Neon `leads` row (duplicates within 10 minutes reuse the existing row).
- Estimating receives a Resend email with answers, recommended services, qualification, and signed file links.
- Qualified thanks page embeds Calendly; secondary thanks page does not.
- Calendly `invitee.created` / `invitee.canceled` update `booking_status`.
- `npm test` covers the engine, API handlers (with fakes), and spam guards. Browser verification covers CTA routing, both thanks states, draft restore, and mobile.
- No WordPress, no public Blob URLs, no invented GEO/claims copy.

## Non-goals (v1)

- Admin / CRM UI
- HubSpot / Salesforce sync
- Server-side draft resume links
- Marketing mailing list
- Calendly for secondary (residential / out-of-province) leads
- Weighted lead scoring
- Changing the GSAP / Three.js scroll-world except CTA hrefs and contact-section actions

## Approach

Native Next.js App Router route + Route Handlers + isolated domain modules. Not Typeform. Not a Server-Action-only design (uploads, Calendly webhooks, and retries need HTTP endpoints).

**Stack**

| Need | Choice |
|------|--------|
| UI | Existing shadcn/ui + Tailwind 4, brand tokens (`#009ee2`, `#e8043d`) |
| Validation | Zod |
| Tests | Vitest (existing `npm test`) |
| Database | Neon Postgres (`@neondatabase/serverless` + drizzle-orm, lazy `getDb()`) |
| Files | Private Vercel Blob, client upload (`@vercel/blob/client`) |
| Email | Resend |
| Booking | Calendly embed + webhooks |
| Rate limit | Injectable limiter; Upstash Redis in production |

## Information architecture

| Route | Indexing | Role |
|-------|----------|------|
| `/` | Indexed | Scroll-world. CTAs start the survey. |
| `/request-estimate` | Indexed, unique copy | Adaptive wizard. |
| `/request-estimate/thanks` | `noindex` | Confirmation. Calendly only after HMAC verification of a qualified lead. |

Thanks URL: `/request-estimate/thanks?lid={leadId}&k={hmac}`. The page loads the lead server-side, verifies `k`, and shows Calendly only when `status === "qualified"`. A missing or invalid `k` shows the generic confirmation with no embed.

## Homepage CTAs

Current gaps: header primary is `tel:`; hero CTA is `#contact`; process uses `#contact`; contact primary is `mailto:`.

Replace as follows:

| Surface | Primary | Secondary |
|---------|---------|-----------|
| `SiteHeader` | Button **Request estimate** → `/request-estimate` (accent red) | Phone as text/link, not the filled primary |
| Hero | **Request an estimate** → `/request-estimate` | Keep **Explore capabilities** → `#services`. Do not add a third hero button. |
| Process | **Send the package** → `/request-estimate` | none |
| Contact | **Start the project survey** → `/request-estimate` | Phone outline button. Estimating email as text fallback under the buttons, not the primary button. |

Header **Contact** nav item may keep `#contact` (scroll to the CTA panel). Do not send nav Contact to mailto.

Copy in `src/content/site.ts`: hero `cta.href` becomes `/request-estimate`. FAQ “How do I request an estimate?” must mention the on-site survey first, then phone and `estimating@strongfoam.com` as fallbacks.

## Wizard graph

Drafts live only in `localStorage` key `sf-estimate-draft` with `{ version: 1, startedAt, answers }`. Cleared after successful submit. Refresh restores the current step.

**Everyone**

1. **Fit** — single choice: `commercial_ici` | `multi_unit` | `industrial` | `residential_other`
2. **Location** — city (required text), province: `ON` or `outside_ontario`

**If `projectType === residential_other`:** after location, skip to **Notes** (optional textarea) then **Contact**. No scope, no files step, no Calendly.

**If ICI / industrial / MUR**

3. **Scope** — multi-select of existing `ServiceId`s: `spray-foam`, `fireproofing`, `intumescent`, `avb`, `spf-roofing`. At least one required. UI shows the service title + overlay from `src/content/site.ts`. Selected ids are `recommendedServices`.
4. **Project** — role: `gc` | `owner_rep` | `consultant` | `property_manager` | `other`; optional building type text; timeline: `now_tendering` | `0_3_months` | `3_12_months` | `exploratory` (does **not** affect qualification); drawings ready: `yes` | `no` | `later`
5. **Files** — optional. Skip allowed even if drawings ready = yes (do not block submit).
6. **Contact** — first name, last name, company (required for full path), email, phone, consent checkbox.

Honeypot field `company_website` is rendered off-screen and must be empty.

## Qualification

Pure function `qualifyLead(answers) → { status: "qualified" | "secondary", reasons: string[] }`.

**Qualified** if and only if all are true:

- `projectType` ∈ `{ commercial_ici, multi_unit, industrial }`
- `province === "ON"`
- `services` is a non-empty subset of the five `ServiceId`s

Otherwise **secondary**. Timeline, role, files, and company size never qualify or disqualify in v1.

Booking is shown only when `status === "qualified"`. Secondary leads still get a confirmation email and estimating notification flagged `Lead type: secondary`.

## Data model

Neon table `leads`:

| Column | Type | Notes |
|--------|------|-------|
| `id` | uuid pk | |
| `created_at` | timestamptz | default now |
| `status` | text | `qualified` \| `secondary` |
| `booking_status` | text | `none` \| `offered` \| `booked` \| `canceled` |
| `notify_status` | text | `pending` \| `sent` \| `failed` |
| `email` | text | normalized lowercase |
| `phone` | text | |
| `first_name`, `last_name`, `company` | text | |
| `project_type` | text | |
| `city`, `province` | text | |
| `services` | text[] | |
| `answers` | jsonb | full wizard payload |
| `recommended_services` | text[] | same as selected services in v1 |
| `files` | jsonb | `{ pathname, url, contentType, size }[]` |
| `source_path` | text | |
| `utm` | jsonb | `{ source, medium, campaign }` |
| `referrer` | text | |
| `idempotency_key` | text unique | sha256(email + canonical answers without files) |
| `calendly_invitee_uri` | text null | |
| `consent_at` | timestamptz | |

No public SELECT. App uses the Neon server URL only (never expose `DATABASE_URL` to the client).

## APIs

### `POST /api/leads`

Body: wizard payload + `uploadPaths[]` + honeypot + `startedAt`.

Order of work:

1. Rate limit by IP (5 / 15 min).
2. Reject honeypot or `startedAt` younger than 8 seconds.
3. Zod-parse. Full-path vs short-path schemas.
4. Recompute `qualifyLead` on the server (ignore any client `status`).
5. Insert lead. On unique `idempotency_key` conflict within 10 minutes, return the existing id.
6. Set `booking_status` to `offered` if qualified, else `none`.
7. Send Resend emails. On email failure, keep the row, set `notify_status = failed`, still return 200 with the lead id.
8. Redirect to `/request-estimate/thanks?lid={id}&k={hmac}` where `k` is HMAC-SHA256 of the lead id with `LEAD_THANKS_SECRET`.

### `POST /api/uploads`

`handleUpload` from `@vercel/blob/client`.

- `access: "private"`
- `allowedContentTypes`: `application/pdf`, `image/jpeg`, `image/png`, `image/webp`
- Max 25 MB / file, max 5 files per draft
- Pathname prefix `leads/{draftId}/`
- `onBeforeGenerateToken` requires a UUID `draftId` in client payload; does not require login (this is a public estimate form). Bind token to that draftId.
- Submit only accepts blob pathnames under that draftId.

### `POST /api/webhooks/calendly`

Verify Calendly signing key. Handle `invitee.created` and `invitee.canceled`. Match `leads.email` to the most recent lead in 30 days. Unknown email: insert into `calendly_unmatched_events` (`id`, `received_at`, `payload jsonb`) and return 200. Invalid signature: 401.

### `GET /api/files/[leadId]/[fileIndex]`

Estimating-only downloads: signed URL generated in the Resend email (`expiresIn` 7 days) using Blob private access. No directory listing.

## Email

- `RESEND_API_KEY` (secret)
- `RESEND_FROM` (verified domain, e.g. `Strong Foam <estimates@strongfoam.com>`)
- `LEAD_NOTIFY_TO` default `estimating@strongfoam.com`

**Estimating email:** subject `New estimate · {status} · {company or name} · {city}`; body lists answers, services, qualification reasons, signed file links, and whether Calendly was offered.

**Visitor email:** confirmation only. Qualified copy mentions they can book on the thanks page. Secondary copy says estimating will follow up; do not imply a site visit is booked.

If Resend fails, visitor still sees thanks. Leave `notify_status = failed`. v1 has no retry worker; ops can inspect failed rows in Neon. Do not block thanks on email.

## Calendly

- Env: `NEXT_PUBLIC_CALENDLY_URL` (event scheduling URL), `CALENDLY_WEBHOOK_SIGNING_KEY`
- Embed on thanks only after HMAC check and `status === qualified`
- Prefill name and email
- Do not load the Calendly script on the homepage or on secondary thanks

## Error handling

- Step-level validation; cannot advance with empty required fields.
- File reject stays on the files step.
- Submit network error: keep draft, show retry.
- Duplicate submit: return existing lead, do not send a second estimating email if `notify_status = sent`.
- Spam: honeypot, 8s minimum, IP rate limit.
- Webhooks never 500 on unknown invitee (retry storms).

PIPEDA: consent checkbox required (“I agree Strong Foam Insulation Inc. may use this information to respond to my estimate request.”). No marketing opt-in in v1.

## Components (file boundaries)

Keep units small and testable without the Next runtime where possible.

| Module | Responsibility |
|--------|----------------|
| `src/content/survey.ts` | Questions, copy, service options (no I/O) |
| `src/lib/leads/qualify.ts` | `qualifyLead` |
| `src/lib/leads/schema.ts` | Zod schemas |
| `src/lib/leads/idempotency.ts` | Canonical hash |
| `src/lib/leads/rate-limit.ts` | Limiter port + Upstash/memory adapters |
| `src/lib/leads/hmac.ts` | Thanks-page token |
| `src/db/schema.ts` + `src/db/index.ts` | Drizzle + lazy Neon |
| `src/components/estimate-survey/*` | Wizard UI only |
| `src/app/request-estimate/page.tsx` | Route shell |
| `src/app/api/leads/route.ts` | Persist + notify |
| `src/app/api/uploads/route.ts` | Blob tokens |
| `src/app/api/webhooks/calendly/route.ts` | Booking updates |

Do not put qualification logic in React components. Do not put Resend calls inside Zod files.

## Testing

**Vitest (required before calling the UI done)**

- Graph: `residential_other` skips scope; `commercial_ici` requires services.
- `qualifyLead` matrix: ON + ICI + service → qualified; residential → secondary; `outside_ontario` → secondary; empty services on full path invalid.
- Zod: missing consent, bad email fail.
- Idempotency hash stability.
- Honeypot and too-fast fill rejected.
- Rate limiter denies the 6th call.
- Lead handler: Resend throw → `notify_status failed`, HTTP 200, row exists (fake db).
- Calendly: bad signature 401; created → `booked`; canceled → `canceled`.
- Upload token: `application/zip` denied.

**Browser (after green tests)**

- Header, hero, process, contact primary CTAs open `/request-estimate`.
- Phone still callable from header/contact.
- Qualified path shows Calendly; secondary does not (HMAC tamper hides Calendly).
- Draft survives refresh; success clears it.
- Mobile viewport; homepage `prefers-reduced-motion` still reaches the CTA.

## Provisioning (before app code that imports providers)

1. Neon (Vercel Marketplace) → `DATABASE_URL`
2. Private Blob store → `BLOB_READ_WRITE_TOKEN` / OIDC
3. Resend API key + verified sending domain
4. Calendly event URL + webhook to `/api/webhooks/calendly`
5. Upstash Redis for production rate limit
6. `LEAD_THANKS_SECRET` (32+ byte random)

Do not commit secrets. Document env names in README only.

## Documentation to update at implementation time

- `README.md` — routes, env vars, test commands
- `docs/strongfoam-build-brief.md` — contact/survey in IA and success criteria
- `docs/copy-overlay-readiness.md` — CTA href change
- This spec remains the source of truth until a changelog exists in `docs/`

## Open client ops (not blockers for code)

- Confirm Calendly event type (estimating vs sales).
- Confirm Resend from-address on the Strong Foam domain.
- Confirm Woodbridge/GTA NAP before any survey copy claims a specific GTA office (survey only asks city + Ontario).
