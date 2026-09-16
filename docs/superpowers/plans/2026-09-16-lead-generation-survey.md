# Lead Generation Survey Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship a native `/request-estimate` survey that qualifies Ontario ICI/MUR leads, stores them in Neon, emails estimating via Resend, and offers HMAC-gated Calendly booking.

**Architecture:** Pure lead-domain modules (qualify, schema, graph, hmac, rate-limit, store) are tested with fakes. Next.js Route Handlers call those modules. The homepage only changes CTA hrefs. Wizard state stays in `localStorage` until `POST /api/leads`.

**Tech Stack:** Next.js 16 App Router, React 19, Vitest, Zod, drizzle-orm + `@neondatabase/serverless`, shadcn/ui (Base UI), `@vercel/blob`, Resend, Calendly embed + webhooks, Upstash rate limit in production.

## Global Constraints

- Next.js 16 App Router + TypeScript; read `node_modules/next/dist/docs/` before new APIs.
- Use existing shadcn/ui (`npx shadcn@latest add …`); do not invent a parallel component kit.
- Brand colors only: `#009ee2` primary, `#e8043d` accent. No em dash `—` in public copy (existing `site.test.ts` forbids it).
- Claims guards: no “greenest”, no unverified GEO office claims in survey copy (city + Ontario only).
- `qualifyLead` is server-authoritative; ignore any client `status`.
- Never expose `DATABASE_URL`, `RESEND_API_KEY`, `LEAD_THANKS_SECRET`, or Blob tokens to the client except `NEXT_PUBLIC_CALENDLY_URL`.
- Private Blob only; no public file URLs.
- Phone is a secondary CTA; primary homepage actions go to `/request-estimate`.
- Do not modify GSAP/Three.js scroll-world except CTA hrefs and the contact action row.
- TDD: write the failing test, run it, implement, run it, commit. `npm test` is Vitest.
- Provision Neon, Blob, Resend, Calendly, Upstash, and `LEAD_THANKS_SECRET` before wiring real adapters; unit tests must pass with fakes and no live credentials.

## File structure

| Path | Responsibility |
|------|----------------|
| `src/content/survey.ts` | Wizard copy, option lists, draft key (no I/O) |
| `src/lib/leads/types.ts` | Shared unions and `LeadAnswers` |
| `src/lib/leads/qualify.ts` | `qualifyLead` |
| `src/lib/leads/graph.ts` | `nextSurveyStep` |
| `src/lib/leads/schema.ts` | Zod parse for short vs full path |
| `src/lib/leads/idempotency.ts` | Canonical hash |
| `src/lib/leads/hmac.ts` | Thanks-page HMAC |
| `src/lib/leads/rate-limit.ts` | `RateLimiter` port + memory adapter |
| `src/lib/leads/spam.ts` | Honeypot + minimum fill time |
| `src/lib/leads/uploads.ts` | Allowed types, size, pathname prefix |
| `src/lib/leads/email.ts` | Subject/body builders |
| `src/lib/leads/create-lead.ts` | Persist + notify orchestration |
| `src/lib/leads/calendly.ts` | Signature verify + event apply |
| `src/lib/leads/draft.ts` | Serialize/parse localStorage draft |
| `src/db/schema.ts` | Drizzle `leads` + `calendly_unmatched_events` |
| `src/db/index.ts` | Lazy `getDb()` |
| `src/app/api/leads/route.ts` | `POST` |
| `src/app/api/uploads/route.ts` | Blob `handleUpload` |
| `src/app/api/webhooks/calendly/route.ts` | Calendly webhook |
| `src/app/api/files/[leadId]/[fileIndex]/route.ts` | Signed download |
| `src/app/request-estimate/page.tsx` | Indexed wizard shell |
| `src/app/request-estimate/thanks/page.tsx` | `noindex` confirmation |
| `src/components/estimate-survey/estimate-survey.tsx` | Client wizard |
| `src/components/site-header.tsx` | Header CTA |
| `src/components/scroll-world-page.tsx` | Hero/process/contact CTAs |
| `src/content/site.ts` | Hero href + FAQ |

---

### Task 1: qualifyLead

**Files:**
- Create: `src/lib/leads/types.ts`
- Create: `src/lib/leads/qualify.ts`
- Test: `src/lib/leads/qualify.test.ts`

**Interfaces:**
- Consumes: `ServiceId` from `@/content/site`
- Produces: `qualifyLead(input: QualifyInput): QualifyResult` where `QualifyResult = { status: "qualified" | "secondary"; reasons: string[] }` and `QualifyInput = { projectType: ProjectType; province: Province; services: ServiceId[] }`

- [ ] **Step 1: Write the failing test**

```ts
import { describe, expect, it } from "vitest";
import { qualifyLead } from "@/lib/leads/qualify";

describe("qualifyLead", () => {
  it("qualifies Ontario ICI with a listed service", () => {
    const result = qualifyLead({
      projectType: "commercial_ici",
      province: "ON",
      services: ["spray-foam"],
    });
    expect(result.status).toBe("qualified");
    expect(result.reasons).toEqual([]);
  });

  it("qualifies multi_unit and industrial the same way", () => {
    for (const projectType of ["multi_unit", "industrial"] as const) {
      expect(
        qualifyLead({
          projectType,
          province: "ON",
          services: ["fireproofing"],
        }).status,
      ).toBe("qualified");
    }
  });

  it("marks residential as secondary", () => {
    const result = qualifyLead({
      projectType: "residential_other",
      province: "ON",
      services: ["spray-foam"],
    });
    expect(result.status).toBe("secondary");
    expect(result.reasons).toContain("project_type");
  });

  it("marks out-of-province as secondary", () => {
    const result = qualifyLead({
      projectType: "commercial_ici",
      province: "outside_ontario",
      services: ["spray-foam"],
    });
    expect(result.status).toBe("secondary");
    expect(result.reasons).toContain("province");
  });

  it("marks empty services as secondary", () => {
    const result = qualifyLead({
      projectType: "commercial_ici",
      province: "ON",
      services: [],
    });
    expect(result.status).toBe("secondary");
    expect(result.reasons).toContain("services");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/leads/qualify.test.ts`
Expected: FAIL with `Cannot find module '@/lib/leads/qualify'`

- [ ] **Step 3: Write minimal implementation**

```ts
// src/lib/leads/types.ts
import type { ServiceId } from "@/content/site";

export type ProjectType =
  | "commercial_ici"
  | "multi_unit"
  | "industrial"
  | "residential_other";

export type Province = "ON" | "outside_ontario";

export type Role =
  | "gc"
  | "owner_rep"
  | "consultant"
  | "property_manager"
  | "other";

export type Timeline =
  | "now_tendering"
  | "0_3_months"
  | "3_12_months"
  | "exploratory";

export type DrawingsReady = "yes" | "no" | "later";

export type QualifyInput = {
  projectType: ProjectType;
  province: Province;
  services: ServiceId[];
};

export type QualifyResult = {
  status: "qualified" | "secondary";
  reasons: string[];
};

export const QUALIFYING_PROJECT_TYPES: ProjectType[] = [
  "commercial_ici",
  "multi_unit",
  "industrial",
];

export const SERVICE_IDS: ServiceId[] = [
  "spray-foam",
  "fireproofing",
  "intumescent",
  "avb",
  "spf-roofing",
];
```

```ts
// src/lib/leads/qualify.ts
import { QUALIFYING_PROJECT_TYPES, SERVICE_IDS } from "@/lib/leads/types";
import type { QualifyInput, QualifyResult } from "@/lib/leads/types";

export function qualifyLead(input: QualifyInput): QualifyResult {
  const reasons: string[] = [];
  if (!QUALIFYING_PROJECT_TYPES.includes(input.projectType)) {
    reasons.push("project_type");
  }
  if (input.province !== "ON") {
    reasons.push("province");
  }
  const listed = input.services.filter((id) => SERVICE_IDS.includes(id));
  if (listed.length === 0) {
    reasons.push("services");
  }
  return {
    status: reasons.length === 0 ? "qualified" : "secondary",
    reasons,
  };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/lib/leads/qualify.test.ts`
Expected: PASS (5 tests)

- [ ] **Step 5: Commit**

```bash
git add src/lib/leads/types.ts src/lib/leads/qualify.ts src/lib/leads/qualify.test.ts
git commit -m "$(cat <<'EOF'
Add deterministic estimate-lead qualification.

Ontario ICI, industrial, and multi-unit work with a listed service qualifies; everything else is secondary.
EOF
)"
```

---

### Task 2: Adaptive wizard graph

**Files:**
- Create: `src/lib/leads/graph.ts`
- Create: `src/content/survey.ts`
- Test: `src/lib/leads/graph.test.ts`

**Interfaces:**
- Consumes: `ProjectType` from `src/lib/leads/types.ts`
- Produces: `SurveyStep = "fit" | "location" | "notes" | "scope" | "project" | "files" | "contact"`; `nextSurveyStep(current: SurveyStep, projectType?: ProjectType): SurveyStep | "submit"`; `DRAFT_STORAGE_KEY = "sf-estimate-draft"`

- [ ] **Step 1: Write the failing test**

```ts
import { describe, expect, it } from "vitest";
import { nextSurveyStep } from "@/lib/leads/graph";

describe("nextSurveyStep", () => {
  it("sends everyone through fit then location", () => {
    expect(nextSurveyStep("fit")).toBe("location");
  });

  it("routes residential to notes then contact then submit", () => {
    expect(nextSurveyStep("location", "residential_other")).toBe("notes");
    expect(nextSurveyStep("notes", "residential_other")).toBe("contact");
    expect(nextSurveyStep("contact", "residential_other")).toBe("submit");
  });

  it("routes commercial_ici through scope, project, files, contact", () => {
    expect(nextSurveyStep("location", "commercial_ici")).toBe("scope");
    expect(nextSurveyStep("scope", "commercial_ici")).toBe("project");
    expect(nextSurveyStep("project", "commercial_ici")).toBe("files");
    expect(nextSurveyStep("files", "commercial_ici")).toBe("contact");
    expect(nextSurveyStep("contact", "commercial_ici")).toBe("submit");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/leads/graph.test.ts`
Expected: FAIL with `Cannot find module '@/lib/leads/graph'`

- [ ] **Step 3: Write minimal implementation**

```ts
// src/lib/leads/graph.ts
import type { ProjectType } from "@/lib/leads/types";

export type SurveyStep =
  | "fit"
  | "location"
  | "notes"
  | "scope"
  | "project"
  | "files"
  | "contact";

export function nextSurveyStep(
  current: SurveyStep,
  projectType?: ProjectType,
): SurveyStep | "submit" {
  if (current === "fit") return "location";
  if (current === "location") {
    return projectType === "residential_other" ? "notes" : "scope";
  }
  if (current === "notes") return "contact";
  if (current === "scope") return "project";
  if (current === "project") return "files";
  if (current === "files") return "contact";
  return "submit";
}
```

```ts
// src/content/survey.ts
import { services } from "@/content/site";

export const DRAFT_STORAGE_KEY = "sf-estimate-draft";
export const DRAFT_VERSION = 1 as const;

export const FIT_OPTIONS = [
  { value: "commercial_ici", label: "Commercial / ICI" },
  { value: "multi_unit", label: "Multi-unit residential" },
  { value: "industrial", label: "Industrial" },
  { value: "residential_other", label: "Residential / other" },
] as const;

export const PROVINCE_OPTIONS = [
  { value: "ON", label: "Ontario" },
  { value: "outside_ontario", label: "Outside Ontario" },
] as const;

export const ROLE_OPTIONS = [
  { value: "gc", label: "General contractor / construction manager" },
  { value: "owner_rep", label: "Developer / owner's representative" },
  { value: "consultant", label: "Architect / consultant" },
  { value: "property_manager", label: "Property / asset manager" },
  { value: "other", label: "Other" },
] as const;

export const TIMELINE_OPTIONS = [
  { value: "now_tendering", label: "Tendering now" },
  { value: "0_3_months", label: "Start within 3 months" },
  { value: "3_12_months", label: "Start within 12 months" },
  { value: "exploratory", label: "Exploratory" },
] as const;

export const DRAWINGS_OPTIONS = [
  { value: "yes", label: "Drawings ready" },
  { value: "no", label: "Not yet" },
  { value: "later", label: "Will send later" },
] as const;

export const CONSENT_LABEL =
  "I agree Strong Foam Insulation Inc. may use this information to respond to my estimate request.";

export const SCOPE_OPTIONS = services.map((service) => ({
  value: service.id,
  title: service.title,
  overlay: service.overlay,
}));
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/lib/leads/graph.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/lib/leads/graph.ts src/lib/leads/graph.test.ts src/content/survey.ts
git commit -m "$(cat <<'EOF'
Define the adaptive estimate-survey step graph.

Residential skips to notes and contact; ICI paths collect scope, project details, and files.
EOF
)"
```

---

### Task 3: Zod payload schemas

**Files:**
- Create: `src/lib/leads/schema.ts`
- Test: `src/lib/leads/schema.test.ts`

**Interfaces:**
- Consumes: unions from `src/lib/leads/types.ts`, `SERVICE_IDS`
- Produces: `parseLeadPayload(input: unknown): { ok: true; data: LeadPayload } | { ok: false; error: ZodError }`; `LeadPayload` with `companyWebsite` honeypot stripped after parse

- [ ] **Step 1: Install Zod and write the failing test**

```bash
npm install zod
```

```ts
import { describe, expect, it } from "vitest";
import { parseLeadPayload } from "@/lib/leads/schema";

const contact = {
  firstName: "Alex",
  lastName: "Lee",
  email: "alex@gc.example",
  phone: "519-555-0100",
  consent: true,
};

describe("parseLeadPayload", () => {
  it("accepts a short residential path without services", () => {
    const parsed = parseLeadPayload({
      projectType: "residential_other",
      city: "Kitchener",
      province: "ON",
      notes: "Attic foam",
      company: "",
      companyWebsite: "",
      startedAt: 1,
      draftId: "11111111-1111-4111-8111-111111111111",
      uploadPaths: [],
      ...contact,
    });
    expect(parsed.ok).toBe(true);
    if (parsed.ok) {
      expect(parsed.data.services).toEqual([]);
    }
  });

  it("rejects commercial_ici with no services", () => {
    const parsed = parseLeadPayload({
      projectType: "commercial_ici",
      city: "London",
      province: "ON",
      services: [],
      role: "gc",
      timeline: "0_3_months",
      drawingsReady: "later",
      company: "Acme GC",
      companyWebsite: "",
      startedAt: 1,
      draftId: "11111111-1111-4111-8111-111111111111",
      uploadPaths: [],
      ...contact,
    });
    expect(parsed.ok).toBe(false);
  });

  it("rejects missing consent and bad email", () => {
    const missingConsent = parseLeadPayload({
      projectType: "residential_other",
      city: "Kitchener",
      province: "ON",
      companyWebsite: "",
      startedAt: 1,
      draftId: "11111111-1111-4111-8111-111111111111",
      uploadPaths: [],
      ...contact,
      consent: false,
    });
    expect(missingConsent.ok).toBe(false);

    const badEmail = parseLeadPayload({
      projectType: "residential_other",
      city: "Kitchener",
      province: "ON",
      companyWebsite: "",
      startedAt: 1,
      draftId: "11111111-1111-4111-8111-111111111111",
      uploadPaths: [],
      ...contact,
      email: "not-an-email",
    });
    expect(badEmail.ok).toBe(false);
  });

  it("accepts full ICI path with a service", () => {
    const parsed = parseLeadPayload({
      projectType: "commercial_ici",
      city: "Kitchener",
      province: "ON",
      services: ["spray-foam", "avb"],
      role: "gc",
      buildingType: "MUR tower",
      timeline: "now_tendering",
      drawingsReady: "yes",
      company: "Acme GC",
      companyWebsite: "",
      startedAt: 1,
      draftId: "11111111-1111-4111-8111-111111111111",
      uploadPaths: ["leads/11111111-1111-4111-8111-111111111111/spec.pdf"],
      ...contact,
    });
    expect(parsed.ok).toBe(true);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/leads/schema.test.ts`
Expected: FAIL with `Cannot find module '@/lib/leads/schema'`

- [ ] **Step 3: Write minimal implementation**

```ts
import { z } from "zod";
import { SERVICE_IDS } from "@/lib/leads/types";

const uuid = z.string().uuid();

const contactFields = {
  firstName: z.string().trim().min(1).max(80),
  lastName: z.string().trim().min(1).max(80),
  email: z.string().trim().email().transform((value) => value.toLowerCase()),
  phone: z.string().trim().min(7).max(40),
  consent: z.literal(true),
  companyWebsite: z.string().max(200),
  startedAt: z.number().int().positive(),
  draftId: uuid,
  uploadPaths: z.array(z.string().max(500)).max(5),
};

const shortSchema = z.object({
  projectType: z.literal("residential_other"),
  city: z.string().trim().min(1).max(80),
  province: z.enum(["ON", "outside_ontario"]),
  notes: z.string().max(2000).optional().default(""),
  company: z.string().trim().max(120).optional().default(""),
  services: z.array(z.never()).optional().default([]),
  ...contactFields,
});

const fullSchema = z.object({
  projectType: z.enum(["commercial_ici", "multi_unit", "industrial"]),
  city: z.string().trim().min(1).max(80),
  province: z.enum(["ON", "outside_ontario"]),
  services: z.array(z.enum(SERVICE_IDS)).min(1),
  role: z.enum(["gc", "owner_rep", "consultant", "property_manager", "other"]),
  buildingType: z.string().trim().max(120).optional().default(""),
  timeline: z.enum([
    "now_tendering",
    "0_3_months",
    "3_12_months",
    "exploratory",
  ]),
  drawingsReady: z.enum(["yes", "no", "later"]),
  notes: z.string().max(2000).optional().default(""),
  company: z.string().trim().min(1).max(120),
  ...contactFields,
});

export const leadPayloadSchema = z.union([shortSchema, fullSchema]);
export type LeadPayload = z.infer<typeof leadPayloadSchema>;

export function parseLeadPayload(input: unknown) {
  const result = leadPayloadSchema.safeParse(input);
  if (!result.success) {
    return { ok: false as const, error: result.error };
  }
  return { ok: true as const, data: result.data };
}
```

If `z.enum(SERVICE_IDS)` fails because `SERVICE_IDS` is a mutable array, change `SERVICE_IDS` in `types.ts` to `as const` tuple:

```ts
export const SERVICE_IDS = [
  "spray-foam",
  "fireproofing",
  "intumescent",
  "avb",
  "spf-roofing",
] as const;
export type ListedServiceId = (typeof SERVICE_IDS)[number];
```

Keep `QualifyInput.services` typed as `ListedServiceId[]`. Re-run Task 1 tests after that change.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/lib/leads/schema.test.ts src/lib/leads/qualify.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add package.json package-lock.json src/lib/leads/schema.ts src/lib/leads/schema.test.ts src/lib/leads/types.ts
git commit -m "$(cat <<'EOF'
Validate estimate payloads with short and full Zod schemas.

Residential leads skip services; ICI leads require a listed scope and company name.
EOF
)"
```

---

### Task 4: Idempotency hash

**Files:**
- Create: `src/lib/leads/idempotency.ts`
- Test: `src/lib/leads/idempotency.test.ts`

**Interfaces:**
- Consumes: `LeadPayload`
- Produces: `idempotencyKey(payload: LeadPayload): string` (sha256 hex). Hash email + canonical answers. Exclude `uploadPaths`, `startedAt`, `draftId`, `companyWebsite`.

- [ ] **Step 1: Write the failing test**

```ts
import { describe, expect, it } from "vitest";
import { parseLeadPayload } from "@/lib/leads/schema";
import { idempotencyKey } from "@/lib/leads/idempotency";

function payload(overrides: Record<string, unknown> = {}) {
  const parsed = parseLeadPayload({
    projectType: "commercial_ici",
    city: "Kitchener",
    province: "ON",
    services: ["spray-foam"],
    role: "gc",
    timeline: "0_3_months",
    drawingsReady: "no",
    company: "Acme",
    companyWebsite: "",
    startedAt: 99,
    draftId: "11111111-1111-4111-8111-111111111111",
    uploadPaths: ["leads/11111111-1111-4111-8111-111111111111/a.pdf"],
    firstName: "Alex",
    lastName: "Lee",
    email: "Alex@GC.example",
    phone: "519-555-0100",
    consent: true,
    ...overrides,
  });
  if (!parsed.ok) throw new Error("fixture invalid");
  return parsed.data;
}

describe("idempotencyKey", () => {
  it("is stable across file paths and startedAt", () => {
    const a = idempotencyKey(payload());
    const b = idempotencyKey(
      payload({
        startedAt: 1,
        uploadPaths: [],
        draftId: "22222222-2222-4222-8222-222222222222",
      }),
    );
    expect(a).toBe(b);
    expect(a).toMatch(/^[a-f0-9]{64}$/);
  });

  it("changes when email or city changes", () => {
    const a = idempotencyKey(payload());
    const b = idempotencyKey(payload({ email: "other@gc.example" }));
    const c = idempotencyKey(payload({ city: "London" }));
    expect(a).not.toBe(b);
    expect(a).not.toBe(c);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/leads/idempotency.test.ts`
Expected: FAIL with missing module

- [ ] **Step 3: Write minimal implementation**

```ts
import { createHash } from "node:crypto";
import type { LeadPayload } from "@/lib/leads/schema";

export function idempotencyKey(payload: LeadPayload): string {
  const canonical = {
    email: payload.email,
    firstName: payload.firstName,
    lastName: payload.lastName,
    phone: payload.phone,
    company: payload.company,
    projectType: payload.projectType,
    city: payload.city,
    province: payload.province,
    services: "services" in payload ? payload.services : [],
    role: "role" in payload ? payload.role : null,
    buildingType: "buildingType" in payload ? payload.buildingType : "",
    timeline: "timeline" in payload ? payload.timeline : null,
    drawingsReady: "drawingsReady" in payload ? payload.drawingsReady : null,
    notes: payload.notes ?? "",
  };
  return createHash("sha256")
    .update(JSON.stringify(canonical))
    .digest("hex");
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/lib/leads/idempotency.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/lib/leads/idempotency.ts src/lib/leads/idempotency.test.ts
git commit -m "$(cat <<'EOF'
Hash estimate submissions without file paths.

Duplicate contact and project answers reuse one lead row instead of creating a second email.
EOF
)"
```

---

### Task 5: Thanks-page HMAC

**Files:**
- Create: `src/lib/leads/hmac.ts`
- Test: `src/lib/leads/hmac.test.ts`

**Interfaces:**
- Consumes: `leadId: string`, `secret: string`
- Produces: `signLeadId(leadId: string, secret: string): string`; `verifyLeadId(leadId: string, token: string, secret: string): boolean`

- [ ] **Step 1: Write the failing test**

```ts
import { describe, expect, it } from "vitest";
import { signLeadId, verifyLeadId } from "@/lib/leads/hmac";

describe("lead thanks HMAC", () => {
  it("round-trips a lead id", () => {
    const token = signLeadId("lead-1", "test-secret-test-secret-test-secret");
    expect(verifyLeadId("lead-1", token, "test-secret-test-secret-test-secret")).toBe(
      true,
    );
  });

  it("rejects a tampered token", () => {
    const token = signLeadId("lead-1", "test-secret-test-secret-test-secret");
    expect(verifyLeadId("lead-1", token + "x", "test-secret-test-secret-test-secret")).toBe(
      false,
    );
    expect(verifyLeadId("lead-2", token, "test-secret-test-secret-test-secret")).toBe(
      false,
    );
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/leads/hmac.test.ts`
Expected: FAIL with missing module

- [ ] **Step 3: Write minimal implementation**

```ts
import { createHmac, timingSafeEqual } from "node:crypto";

export function signLeadId(leadId: string, secret: string): string {
  return createHmac("sha256", secret).update(leadId).digest("hex");
}

export function verifyLeadId(
  leadId: string,
  token: string,
  secret: string,
): boolean {
  const expected = signLeadId(leadId, secret);
  const a = Buffer.from(expected);
  const b = Buffer.from(token);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/lib/leads/hmac.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/lib/leads/hmac.ts src/lib/leads/hmac.test.ts
git commit -m "$(cat <<'EOF'
Sign thanks-page lead ids so Calendly cannot be unlocked by query tampering.
EOF
)"
```

---

### Task 6: Rate limiter and spam gates

**Files:**
- Create: `src/lib/leads/rate-limit.ts`
- Create: `src/lib/leads/spam.ts`
- Test: `src/lib/leads/rate-limit.test.ts`
- Test: `src/lib/leads/spam.test.ts`

**Interfaces:**
- Consumes: IP string + timestamps
- Produces: `MemoryRateLimiter` with `limit(key: string): Promise<{ success: boolean }>` (5 / 900_000 ms); `assertNotSpam({ companyWebsite, startedAt, now }): "ok" | "honeypot" | "too_fast"`. Constants: `LEAD_RATE_LIMIT = 5`, `LEAD_RATE_WINDOW_MS = 15 * 60 * 1000`, `MIN_FILL_MS = 8000`

- [ ] **Step 1: Write the failing tests**

```ts
import { describe, expect, it } from "vitest";
import { MemoryRateLimiter } from "@/lib/leads/rate-limit";

describe("MemoryRateLimiter", () => {
  it("allows five calls and denies the sixth in the window", async () => {
    const limiter = new MemoryRateLimiter();
    for (let i = 0; i < 5; i += 1) {
      expect((await limiter.limit("1.1.1.1")).success).toBe(true);
    }
    expect((await limiter.limit("1.1.1.1")).success).toBe(false);
    expect((await limiter.limit("2.2.2.2")).success).toBe(true);
  });
});
```

```ts
import { describe, expect, it } from "vitest";
import { assertNotSpam } from "@/lib/leads/spam";

describe("assertNotSpam", () => {
  it("rejects a filled honeypot", () => {
    expect(
      assertNotSpam({
        companyWebsite: "https://spam.test",
        startedAt: 1,
        now: 20_000,
      }),
    ).toBe("honeypot");
  });

  it("rejects fills faster than 8 seconds", () => {
    expect(
      assertNotSpam({ companyWebsite: "", startedAt: 10_000, now: 14_000 }),
    ).toBe("too_fast");
  });

  it("allows a slow empty-honeypot submit", () => {
    expect(
      assertNotSpam({ companyWebsite: "", startedAt: 1_000, now: 10_000 }),
    ).toBe("ok");
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/lib/leads/rate-limit.test.ts src/lib/leads/spam.test.ts`
Expected: FAIL with missing modules

- [ ] **Step 3: Write minimal implementation**

```ts
// src/lib/leads/rate-limit.ts
export const LEAD_RATE_LIMIT = 5;
export const LEAD_RATE_WINDOW_MS = 15 * 60 * 1000;

export type RateLimiter = {
  limit(key: string): Promise<{ success: boolean }>;
};

export class MemoryRateLimiter implements RateLimiter {
  private hits = new Map<string, number[]>();

  async limit(key: string): Promise<{ success: boolean }> {
    const now = Date.now();
    const recent = (this.hits.get(key) ?? []).filter(
      (time) => now - time < LEAD_RATE_WINDOW_MS,
    );
    if (recent.length >= LEAD_RATE_LIMIT) {
      this.hits.set(key, recent);
      return { success: false };
    }
    recent.push(now);
    this.hits.set(key, recent);
    return { success: true };
  }
}
```

```ts
// src/lib/leads/spam.ts
export const MIN_FILL_MS = 8000;

export function assertNotSpam(input: {
  companyWebsite: string;
  startedAt: number;
  now: number;
}): "ok" | "honeypot" | "too_fast" {
  if (input.companyWebsite.trim() !== "") return "honeypot";
  if (input.now - input.startedAt < MIN_FILL_MS) return "too_fast";
  return "ok";
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/lib/leads/rate-limit.test.ts src/lib/leads/spam.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/lib/leads/rate-limit.ts src/lib/leads/rate-limit.test.ts src/lib/leads/spam.ts src/lib/leads/spam.test.ts
git commit -m "$(cat <<'EOF'
Gate public estimate posts with honeypot, fill time, and IP rate limits.
EOF
)"
```

---

### Task 7: Upload path policy

**Files:**
- Create: `src/lib/leads/uploads.ts`
- Test: `src/lib/leads/uploads.test.ts`

**Interfaces:**
- Produces: `ALLOWED_UPLOAD_TYPES`, `MAX_UPLOAD_BYTES = 25 * 1024 * 1024`, `MAX_UPLOAD_FILES = 5`, `isAllowedUploadContentType(type: string): boolean`, `isOwnedUploadPath(draftId: string, pathname: string): boolean`

- [ ] **Step 1: Write the failing test**

```ts
import { describe, expect, it } from "vitest";
import {
  isAllowedUploadContentType,
  isOwnedUploadPath,
} from "@/lib/leads/uploads";

describe("upload policy", () => {
  it("allows pdf and images and denies zip", () => {
    expect(isAllowedUploadContentType("application/pdf")).toBe(true);
    expect(isAllowedUploadContentType("image/jpeg")).toBe(true);
    expect(isAllowedUploadContentType("image/png")).toBe(true);
    expect(isAllowedUploadContentType("image/webp")).toBe(true);
    expect(isAllowedUploadContentType("application/zip")).toBe(false);
  });

  it("requires pathnames under leads/{draftId}/", () => {
    const id = "11111111-1111-4111-8111-111111111111";
    expect(isOwnedUploadPath(id, `leads/${id}/spec.pdf`)).toBe(true);
    expect(isOwnedUploadPath(id, `leads/other/spec.pdf`)).toBe(false);
    expect(isOwnedUploadPath(id, `leads/${id}/../secret.pdf`)).toBe(false);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/leads/uploads.test.ts`
Expected: FAIL with missing module

- [ ] **Step 3: Write minimal implementation**

```ts
export const ALLOWED_UPLOAD_TYPES = [
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/webp",
] as const;

export const MAX_UPLOAD_BYTES = 25 * 1024 * 1024;
export const MAX_UPLOAD_FILES = 5;

export function isAllowedUploadContentType(type: string): boolean {
  return (ALLOWED_UPLOAD_TYPES as readonly string[]).includes(type);
}

export function isOwnedUploadPath(draftId: string, pathname: string): boolean {
  if (pathname.includes("..") || pathname.startsWith("/")) return false;
  return pathname.startsWith(`leads/${draftId}/`);
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/lib/leads/uploads.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/lib/leads/uploads.ts src/lib/leads/uploads.test.ts
git commit -m "$(cat <<'EOF'
Restrict estimate uploads to private lead-prefixed PDFs and images.
EOF
)"
```

---

### Task 8: Email copy builders

**Files:**
- Create: `src/lib/leads/email.ts`
- Test: `src/lib/leads/email.test.ts`

**Interfaces:**
- Consumes: a `LeadEmailInput` (status, names, city, services, reasons, fileLinks, calendlyOffered)
- Produces: `buildEstimatingEmail(input): { subject: string; text: string }`; `buildVisitorEmail(input): { subject: string; text: string }`

- [ ] **Step 1: Write the failing test**

```ts
import { describe, expect, it } from "vitest";
import { buildEstimatingEmail, buildVisitorEmail } from "@/lib/leads/email";

const base = {
  status: "qualified" as const,
  firstName: "Alex",
  lastName: "Lee",
  company: "Acme GC",
  city: "Kitchener",
  services: ["spray-foam"],
  reasons: [] as string[],
  fileLinks: ["https://example.test/file"],
  calendlyOffered: true,
};

describe("lead emails", () => {
  it("puts status, company, and city in the estimating subject", () => {
    const email = buildEstimatingEmail(base);
    expect(email.subject).toBe(
      "New estimate · qualified · Acme GC · Kitchener",
    );
    expect(email.text).toContain("spray-foam");
    expect(email.text).toContain("https://example.test/file");
    expect(email.text).toContain("Calendly offered: yes");
  });

  it("tells secondary visitors estimating will follow up", () => {
    const email = buildVisitorEmail({
      ...base,
      status: "secondary",
      calendlyOffered: false,
    });
    expect(email.text.toLowerCase()).toContain("follow up");
    expect(email.text.toLowerCase()).not.toContain("booked");
  });

  it("mentions booking on the thanks page for qualified visitors", () => {
    const email = buildVisitorEmail(base);
    expect(email.text.toLowerCase()).toContain("thanks page");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/leads/email.test.ts`
Expected: FAIL with missing module

- [ ] **Step 3: Write minimal implementation**

```ts
export type LeadEmailInput = {
  status: "qualified" | "secondary";
  firstName: string;
  lastName: string;
  company: string;
  city: string;
  services: string[];
  reasons: string[];
  fileLinks: string[];
  calendlyOffered: boolean;
};

export function buildEstimatingEmail(input: LeadEmailInput) {
  const who = input.company || `${input.firstName} ${input.lastName}`;
  return {
    subject: `New estimate · ${input.status} · ${who} · ${input.city}`,
    text: [
      `Lead type: ${input.status}`,
      `Name: ${input.firstName} ${input.lastName}`,
      `Company: ${input.company || "(none)"}`,
      `City: ${input.city}`,
      `Services: ${input.services.join(", ") || "(none)"}`,
      `Qualification reasons: ${input.reasons.join(", ") || "(qualified)"}`,
      `Calendly offered: ${input.calendlyOffered ? "yes" : "no"}`,
      `Files:`,
      ...input.fileLinks,
    ].join("\n"),
  };
}

export function buildVisitorEmail(input: LeadEmailInput) {
  const qualified =
    "We received your estimate request. You can book a call on the thanks page.";
  const secondary =
    "We received your request. Estimating will follow up. This form does not book a site visit.";
  return {
    subject: "Strong Foam received your estimate request",
    text: input.status === "qualified" ? qualified : secondary,
  };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/lib/leads/email.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/lib/leads/email.ts src/lib/leads/email.test.ts
git commit -m "$(cat <<'EOF'
Build estimating and visitor email copy from lead qualification.
EOF
)"
```

---

### Task 9: createLead orchestration with a fake store

**Files:**
- Create: `src/lib/leads/store.ts`
- Create: `src/lib/leads/create-lead.ts`
- Test: `src/lib/leads/create-lead.test.ts` (do not create `src/lib/leads/store.ts`; types live in `create-lead.ts`)

**Interfaces:**
- Consumes: `parseLeadPayload`, `qualifyLead`, `idempotencyKey`, `assertNotSpam`, `isOwnedUploadPath`, `signLeadId`, `RateLimiter`, email builders
- Produces:

```ts
export type StoredLead = {
  id: string;
  createdAt: number;
  status: "qualified" | "secondary";
  bookingStatus: "none" | "offered" | "booked" | "canceled";
  notifyStatus: "pending" | "sent" | "failed";
  email: string;
  idempotencyKey: string;
};

export type LeadStore = {
  findByIdempotencyKey(key: string): Promise<StoredLead | null>;
  insert(lead: Omit<StoredLead, "id" | "createdAt"> & { payload: unknown }): Promise<StoredLead>;
  updateNotifyStatus(id: string, status: StoredLead["notifyStatus"]): Promise<void>;
};

export type Mailer = {
  sendEstimating(input: LeadEmailInput): Promise<void>;
  sendVisitor(input: LeadEmailInput): Promise<void>;
};

export async function createLead(args: {
  body: unknown;
  ip: string;
  now?: number;
  limiter: RateLimiter;
  store: LeadStore;
  mailer: Mailer;
  thanksSecret: string;
}): Promise<
  | { ok: true; leadId: string; thanksPath: string; duplicate: boolean }
  | { ok: false; error: "rate_limited" | "spam" | "invalid" }
>
```

Idempotency window: if an existing row’s `createdAt` is within `10 * 60 * 1000` ms, return that id and **do not** send email when `notifyStatus === "sent"`.

- [ ] **Step 1: Write the failing test**

```ts
import { describe, expect, it, vi } from "vitest";
import { MemoryRateLimiter } from "@/lib/leads/rate-limit";
import { createLead, type LeadStore, type Mailer, type StoredLead } from "@/lib/leads/create-lead";

class MemoryStore implements LeadStore {
  rows: StoredLead[] = [];
  async findByIdempotencyKey(key: string) {
    return this.rows.find((row) => row.idempotencyKey === key) ?? null;
  }
  async insert(lead: Omit<StoredLead, "id" | "createdAt">) {
    const row: StoredLead = {
      ...lead,
      id: `lead-${this.rows.length + 1}`,
      createdAt: Date.now(),
    };
    this.rows.push(row);
    return row;
  }
  async updateNotifyStatus(id: string, status: StoredLead["notifyStatus"]) {
    const row = this.rows.find((item) => item.id === id);
    if (row) row.notifyStatus = status;
  }
}

function body() {
  return {
    projectType: "commercial_ici",
    city: "Kitchener",
    province: "ON",
    services: ["spray-foam"],
    role: "gc",
    timeline: "0_3_months",
    drawingsReady: "no",
    company: "Acme",
    companyWebsite: "",
    startedAt: Date.now() - 9000,
    draftId: "11111111-1111-4111-8111-111111111111",
    uploadPaths: [],
    firstName: "Alex",
    lastName: "Lee",
    email: "alex@gc.example",
    phone: "519-555-0100",
    consent: true,
  };
}

describe("createLead", () => {
  it("inserts a qualified lead, mails, and returns a thanks path", async () => {
    const mailer: Mailer = {
      sendEstimating: vi.fn().mockResolvedValue(undefined),
      sendVisitor: vi.fn().mockResolvedValue(undefined),
    };
    const store = new MemoryStore();
    const result = await createLead({
      body: body(),
      ip: "1.1.1.1",
      limiter: new MemoryRateLimiter(),
      store,
      mailer,
      thanksSecret: "test-secret-test-secret-test-secret",
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.duplicate).toBe(false);
    expect(store.rows[0]?.status).toBe("qualified");
    expect(store.rows[0]?.bookingStatus).toBe("offered");
    expect(store.rows[0]?.notifyStatus).toBe("sent");
    expect(result.thanksPath).toContain("/request-estimate/thanks?lid=lead-1&k=");
    expect(mailer.sendEstimating).toHaveBeenCalledOnce();
  });

  it("keeps the row and returns 200-equivalent ok when mail fails", async () => {
    const mailer: Mailer = {
      sendEstimating: vi.fn().mockRejectedValue(new Error("resend down")),
      sendVisitor: vi.fn().mockResolvedValue(undefined),
    };
    const store = new MemoryStore();
    const result = await createLead({
      body: body(),
      ip: "1.1.1.1",
      limiter: new MemoryRateLimiter(),
      store,
      mailer,
      thanksSecret: "test-secret-test-secret-test-secret",
    });
    expect(result.ok).toBe(true);
    expect(store.rows[0]?.notifyStatus).toBe("failed");
  });

  it("reuses a duplicate within 10 minutes without a second estimating email", async () => {
    const mailer: Mailer = {
      sendEstimating: vi.fn().mockResolvedValue(undefined),
      sendVisitor: vi.fn().mockResolvedValue(undefined),
    };
    const store = new MemoryStore();
    const args = {
      body: body(),
      ip: "1.1.1.1",
      limiter: new MemoryRateLimiter(),
      store,
      mailer,
      thanksSecret: "test-secret-test-secret-test-secret",
    };
    const first = await createLead(args);
    const second = await createLead(args);
    expect(first.ok && second.ok).toBe(true);
    if (first.ok && second.ok) {
      expect(second.duplicate).toBe(true);
      expect(second.leadId).toBe(first.leadId);
    }
    expect(mailer.sendEstimating).toHaveBeenCalledOnce();
    expect(store.rows).toHaveLength(1);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/leads/create-lead.test.ts`
Expected: FAIL with missing module

- [ ] **Step 3: Write minimal implementation**

```ts
// src/lib/leads/create-lead.ts
import { qualifyLead } from "@/lib/leads/qualify";
import { parseLeadPayload, type LeadPayload } from "@/lib/leads/schema";
import { idempotencyKey } from "@/lib/leads/idempotency";
import { signLeadId } from "@/lib/leads/hmac";
import { assertNotSpam } from "@/lib/leads/spam";
import { isOwnedUploadPath } from "@/lib/leads/uploads";
import {
  buildEstimatingEmail,
  buildVisitorEmail,
  type LeadEmailInput,
} from "@/lib/leads/email";
import type { RateLimiter } from "@/lib/leads/rate-limit";

export const IDEMPOTENCY_WINDOW_MS = 10 * 60 * 1000;

export type StoredLead = {
  id: string;
  createdAt: number;
  status: "qualified" | "secondary";
  bookingStatus: "none" | "offered" | "booked" | "canceled";
  notifyStatus: "pending" | "sent" | "failed";
  email: string;
  idempotencyKey: string;
};

export type LeadStore = {
  findByIdempotencyKey(key: string): Promise<StoredLead | null>;
  insert(
    lead: Omit<StoredLead, "id" | "createdAt"> & { payload: LeadPayload },
  ): Promise<StoredLead>;
  updateNotifyStatus(
    id: string,
    status: StoredLead["notifyStatus"],
  ): Promise<void>;
};

export type Mailer = {
  sendEstimating(input: LeadEmailInput): Promise<void>;
  sendVisitor(input: LeadEmailInput): Promise<void>;
};

function servicesOf(payload: LeadPayload): string[] {
  return "services" in payload ? [...payload.services] : [];
}

function emailInput(
  payload: LeadPayload,
  status: "qualified" | "secondary",
  reasons: string[],
): LeadEmailInput {
  return {
    status,
    firstName: payload.firstName,
    lastName: payload.lastName,
    company: payload.company,
    city: payload.city,
    services: servicesOf(payload),
    reasons,
    fileLinks: payload.uploadPaths,
    calendlyOffered: status === "qualified",
  };
}

export async function createLead(args: {
  body: unknown;
  ip: string;
  now?: number;
  limiter: RateLimiter;
  store: LeadStore;
  mailer: Mailer;
  thanksSecret: string;
}): Promise<
  | { ok: true; leadId: string; thanksPath: string; duplicate: boolean }
  | { ok: false; error: "rate_limited" | "spam" | "invalid" }
> {
  const now = args.now ?? Date.now();
  const limited = await args.limiter.limit(args.ip);
  if (!limited.success) return { ok: false, error: "rate_limited" };

  const parsed = parseLeadPayload(args.body);
  if (!parsed.ok) return { ok: false, error: "invalid" };
  const payload = parsed.data;

  const spam = assertNotSpam({
    companyWebsite: payload.companyWebsite,
    startedAt: payload.startedAt,
    now,
  });
  if (spam !== "ok") return { ok: false, error: "spam" };

  if (
    payload.uploadPaths.some(
      (path) => !isOwnedUploadPath(payload.draftId, path),
    )
  ) {
    return { ok: false, error: "invalid" };
  }

  const qualification = qualifyLead({
    projectType: payload.projectType,
    province: payload.province,
    services: servicesOf(payload) as never,
  });
  const key = idempotencyKey(payload);
  const existing = await args.store.findByIdempotencyKey(key);
  if (existing && now - existing.createdAt < IDEMPOTENCY_WINDOW_MS) {
    return {
      ok: true,
      leadId: existing.id,
      thanksPath: `/request-estimate/thanks?lid=${existing.id}&k=${signLeadId(existing.id, args.thanksSecret)}`,
      duplicate: true,
    };
  }

  const inserted = await args.store.insert({
    status: qualification.status,
    bookingStatus: qualification.status === "qualified" ? "offered" : "none",
    notifyStatus: "pending",
    email: payload.email,
    idempotencyKey: key,
    payload,
  });

  const mail = emailInput(
    payload,
    qualification.status,
    qualification.reasons,
  );
  void buildEstimatingEmail(mail);
  void buildVisitorEmail(mail);
  try {
    await args.mailer.sendEstimating(mail);
    await args.mailer.sendVisitor(mail);
    await args.store.updateNotifyStatus(inserted.id, "sent");
  } catch {
    await args.store.updateNotifyStatus(inserted.id, "failed");
  }

  return {
    ok: true,
    leadId: inserted.id,
    thanksPath: `/request-estimate/thanks?lid=${inserted.id}&k=${signLeadId(inserted.id, args.thanksSecret)}`,
    duplicate: false,
  };
}
```

Keep `MemoryStore` in the test file only. Do not create `src/lib/leads/store.ts` unless you move the `LeadStore` type there and update imports.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/lib/leads/create-lead.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/lib/leads/create-lead.ts src/lib/leads/create-lead.test.ts
git commit -m "$(cat <<'EOF'
Orchestrate lead insert, spam checks, and notify-failure handling behind fakes.

A valid lead is stored even when Resend throws; duplicates reuse the existing row.
EOF
)"
```

---

### Task 10: Calendly signature and booking updates

**Files:**
- Create: `src/lib/leads/calendly.ts`
- Test: `src/lib/leads/calendly.test.ts`

**Interfaces:**
- Produces: `verifyCalendlySignature({ payload, header, signingKey }): boolean` where header is `t=<ms>,v1=<hex>` and `v1` is HMAC-SHA256 of `${t}.${payload}`; `applyCalendlyEvent({ event, email, inviteeUri, store, now })` updates the newest lead with that email in 30 days to `booked` / `canceled`, or records unmatched.

```ts
export type CalendlyLeadStore = {
  findLatestByEmailSince(email: string, sinceMs: number): Promise<StoredLead | null>;
  updateBooking(id: string, status: "booked" | "canceled", inviteeUri: string): Promise<void>;
  insertUnmatched(payload: unknown): Promise<void>;
};
```

- [ ] **Step 1: Write the failing test**

```ts
import { createHmac } from "node:crypto";
import { describe, expect, it } from "vitest";
import {
  applyCalendlyEvent,
  verifyCalendlySignature,
  type CalendlyLeadStore,
} from "@/lib/leads/calendly";
import type { StoredLead } from "@/lib/leads/create-lead";

function header(payload: string, key: string, t = "1700000000") {
  const v1 = createHmac("sha256", key).update(`${t}.${payload}`).digest("hex");
  return `t=${t},v1=${v1}`;
}

describe("verifyCalendlySignature", () => {
  it("accepts a valid v1 signature and rejects a bad one", () => {
    const payload = "{\"ok\":true}";
    const key = "cal-secret";
    expect(
      verifyCalendlySignature({
        payload,
        header: header(payload, key),
        signingKey: key,
      }),
    ).toBe(true);
    expect(
      verifyCalendlySignature({
        payload,
        header: "t=1700000000,v1=deadbeef",
        signingKey: key,
      }),
    ).toBe(false);
  });
});

describe("applyCalendlyEvent", () => {
  it("books the matching lead and stores unknown emails", async () => {
    const lead: StoredLead = {
      id: "lead-1",
      createdAt: Date.now(),
      status: "qualified",
      bookingStatus: "offered",
      notifyStatus: "sent",
      email: "alex@gc.example",
      idempotencyKey: "abc",
    };
    const unmatched: unknown[] = [];
    const store: CalendlyLeadStore = {
      async findLatestByEmailSince(email) {
        return email === lead.email ? lead : null;
      },
      async updateBooking(id, status, inviteeUri) {
        lead.bookingStatus = status;
        lead.id = id;
        void inviteeUri;
      },
      async insertUnmatched(payload) {
        unmatched.push(payload);
      },
    };

    await applyCalendlyEvent({
      event: "invitee.created",
      email: "alex@gc.example",
      inviteeUri: "https://calendly.com/invitees/1",
      store,
      now: Date.now(),
    });
    expect(lead.bookingStatus).toBe("booked");

    await applyCalendlyEvent({
      event: "invitee.canceled",
      email: "alex@gc.example",
      inviteeUri: "https://calendly.com/invitees/1",
      store,
      now: Date.now(),
    });
    expect(lead.bookingStatus).toBe("canceled");

    await applyCalendlyEvent({
      event: "invitee.created",
      email: "unknown@example.com",
      inviteeUri: "https://calendly.com/invitees/2",
      store,
      now: Date.now(),
    });
    expect(unmatched).toHaveLength(1);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/leads/calendly.test.ts`
Expected: FAIL with missing module

- [ ] **Step 3: Write minimal implementation**

Use `timingSafeEqual` on the hex digest. `applyCalendlyEvent` maps `invitee.created` → `booked`, `invitee.canceled` → `canceled`. If `findLatestByEmailSince` returns null, `insertUnmatched`. Ignore other event names.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/lib/leads/calendly.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/lib/leads/calendly.ts src/lib/leads/calendly.test.ts
git commit -m "$(cat <<'EOF'
Verify Calendly signatures and map invitee events onto lead booking status.
EOF
)"
```

---

### Task 11: Drizzle schema and lazy Neon client

**Files:**
- Create: `src/db/schema.ts`
- Create: `src/db/index.ts`
- Create: `drizzle.config.ts`
- Modify: `package.json` (add drizzle-orm, @neondatabase/serverless, drizzle-kit, dotenv-cli)
- Test: `src/db/schema.test.ts` (assert exported table names only; no live DB)

**Interfaces:**
- Produces: `leads` and `calendlyUnmatchedEvents` drizzle tables matching the spec columns; `getDb()` lazy init that throws only when called without `DATABASE_URL` (not at import time)

- [ ] **Step 1: Write the failing test**

```ts
import { describe, expect, it } from "vitest";
import { calendlyUnmatchedEvents, leads } from "@/db/schema";

describe("db schema exports", () => {
  it("defines leads and unmatched calendly events", () => {
    expect(leads).toBeDefined();
    expect(calendlyUnmatchedEvents).toBeDefined();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/db/schema.test.ts`
Expected: FAIL with missing module

- [ ] **Step 3: Install and implement**

```bash
npm install drizzle-orm @neondatabase/serverless
npm install -D drizzle-kit dotenv-cli
```

```ts
// src/db/schema.ts
import {
  jsonb,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";

export const leads = pgTable("leads", {
  id: uuid("id").defaultRandom().primaryKey(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  status: text("status").notNull(),
  bookingStatus: text("booking_status").notNull(),
  notifyStatus: text("notify_status").notNull(),
  email: text("email").notNull(),
  phone: text("phone").notNull(),
  firstName: text("first_name").notNull(),
  lastName: text("last_name").notNull(),
  company: text("company").notNull(),
  projectType: text("project_type").notNull(),
  city: text("city").notNull(),
  province: text("province").notNull(),
  services: text("services").array().notNull(),
  answers: jsonb("answers").notNull(),
  recommendedServices: text("recommended_services").array().notNull(),
  files: jsonb("files").notNull(),
  sourcePath: text("source_path"),
  utm: jsonb("utm"),
  referrer: text("referrer"),
  idempotencyKey: text("idempotency_key").notNull().unique(),
  calendlyInviteeUri: text("calendly_invitee_uri"),
  consentAt: timestamp("consent_at", { withTimezone: true }).notNull(),
});

export const calendlyUnmatchedEvents = pgTable("calendly_unmatched_events", {
  id: uuid("id").defaultRandom().primaryKey(),
  receivedAt: timestamp("received_at", { withTimezone: true }).defaultNow().notNull(),
  payload: jsonb("payload").notNull(),
});
```

```ts
// src/db/index.ts
import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import * as schema from "@/db/schema";

function createDb() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL is not set");
  return drizzle(neon(url), { schema });
}

let db: ReturnType<typeof createDb> | null = null;

export function getDb() {
  if (!db) db = createDb();
  return db;
}
```

```ts
// drizzle.config.ts
import { defineConfig } from "drizzle-kit";

export default defineConfig({
  schema: "./src/db/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: { url: process.env.DATABASE_URL ?? "" },
});
```

Add scripts to `package.json`: `"db:push": "dotenv -e .env.local -- drizzle-kit push"`

Do not call `getDb()` from `schema.test.ts`. After credentials exist, the implementer runs `npm run db:push`. Tests must pass without that.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/db/schema.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/db/schema.ts src/db/index.ts src/db/schema.test.ts drizzle.config.ts package.json package-lock.json
git commit -m "$(cat <<'EOF'
Add Drizzle lead tables with a build-safe lazy Neon client.
EOF
)"
```

---

### Task 12: Next.js Route Handlers

**Files:**
- Create: `src/app/api/leads/route.ts`
- Create: `src/app/api/uploads/route.ts`
- Create: `src/app/api/webhooks/calendly/route.ts`
- Create: `src/app/api/files/[leadId]/[fileIndex]/route.ts`
- Create: `src/lib/leads/adapters.ts` (Neon store, Resend mailer, Upstash-or-memory limiter)
- Test: `src/app/api/leads/route.test.ts` (call `POST` handler with mocked `createLead` deps injected via adapters test doubles **or** test the handler by exporting `handleLeadPost(request, deps)` to avoid Next runtime)

**Interfaces:**
- `POST /api/leads` → JSON `{ thanksPath }` or 429 / 400
- `POST /api/uploads` uses `handleUpload` with `access: "private"`, `allowedContentTypes` from `ALLOWED_UPLOAD_TYPES`, `maximumSizeInBytes: MAX_UPLOAD_BYTES`, pathname `leads/${draftId}/${filename}`
- `POST /api/webhooks/calendly` 401 on bad signature, 200 otherwise
- `GET /api/files/...` 401 without `token` query matching HMAC of `${leadId}:${fileIndex}` with `LEAD_THANKS_SECRET`; else redirect to a Blob signed URL. In tests, inject `signFile`/`getSignedUrl`.

- [ ] **Step 1: Extract a testable handler and write the failing test**

```ts
import { describe, expect, it, vi } from "vitest";
import { handleLeadPost } from "@/app/api/leads/route";

describe("POST /api/leads", () => {
  it("returns 429 when rate limited", async () => {
    const response = await handleLeadPost(
      new Request("http://localhost/api/leads", {
        method: "POST",
        body: JSON.stringify({}),
      }),
      {
        createLead: async () => ({ ok: false, error: "rate_limited" }),
      },
    );
    expect(response.status).toBe(429);
  });

  it("returns thanksPath on success", async () => {
    const response = await handleLeadPost(
      new Request("http://localhost/api/leads", {
        method: "POST",
        body: JSON.stringify({}),
      }),
      {
        createLead: async () => ({
          ok: true,
          leadId: "lead-1",
          thanksPath: "/request-estimate/thanks?lid=lead-1&k=abc",
          duplicate: false,
        }),
      },
    );
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      thanksPath: "/request-estimate/thanks?lid=lead-1&k=abc",
    });
  });
});
```

Also add `src/lib/leads/calendly-route.test.ts` that posts with a bad signature and expects 401 by calling `handleCalendlyPost`.

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/app/api/leads/route.test.ts`
Expected: FAIL with missing module

- [ ] **Step 3: Implement handlers**

`handleLeadPost` reads JSON, `x-forwarded-for` or `"127.0.0.1"`, calls injected `createLead` (default production adapters). Map errors: `rate_limited` 429, `spam`/`invalid` 400, success 200.

Uploads: `npm install @vercel/blob`. In `onBeforeGenerateToken`, parse `clientPayload` JSON `{ draftId }`, require uuid, return `addRandomSuffix: true`, `allowedContentTypes`, `maximumSizeInBytes`, `tokenPayload: JSON.stringify({ draftId })`.

Calendly: read raw text body for signature, 401 if false, else parse JSON `payload.email` / `event` / `uri` (use the Calendly payload shape `event` + `payload.email` + `payload.uri`). Always 200 after `applyCalendlyEvent`.

Files GET: look up lead (adapter), verify token, index into `files` jsonb, return 302 to signed URL. If Blob is unconfigured in tests, inject `resolveFileUrl`.

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/app/api/leads/route.test.ts src/lib/leads/calendly.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/app/api src/lib/leads/adapters.ts package.json package-lock.json
git commit -m "$(cat <<'EOF'
Expose lead, upload, file, and Calendly webhook Route Handlers.
EOF
)"
```

---

### Task 13: Draft helpers and survey UI

**Files:**
- Create: `src/lib/leads/draft.ts`
- Test: `src/lib/leads/draft.test.ts`
- Create: `src/components/estimate-survey/estimate-survey.tsx`
- Create: `src/app/request-estimate/page.tsx`
- Modify: add shadcn `input`, `textarea`, `checkbox`, `label`, `card`, `progress` via `npx shadcn@latest add input textarea checkbox label card progress -y`

**Interfaces:**
- `SurveyDraft = { version: 1; startedAt: number; draftId: string; step: SurveyStep; answers: Record<string, unknown> }`
- `parseSurveyDraft(raw: string | null): SurveyDraft | null` (reject other versions)
- `serializeSurveyDraft(draft: SurveyDraft): string`
- Client wizard uses `DRAFT_STORAGE_KEY`, `nextSurveyStep`, honeypot `companyWebsite` visually hidden (`className="sr-only"` plus `tabIndex={-1}` and `autoComplete="off"`)

- [ ] **Step 1: Write the failing draft test**

```ts
import { describe, expect, it } from "vitest";
import { parseSurveyDraft, serializeSurveyDraft } from "@/lib/leads/draft";

describe("survey draft", () => {
  it("round-trips version 1 and rejects other versions", () => {
    const draft = {
      version: 1 as const,
      startedAt: 1000,
      draftId: "11111111-1111-4111-8111-111111111111",
      step: "fit" as const,
      answers: { projectType: "commercial_ici" },
    };
    const raw = serializeSurveyDraft(draft);
    expect(parseSurveyDraft(raw)).toEqual(draft);
    expect(parseSurveyDraft('{"version":2}')).toBeNull();
    expect(parseSurveyDraft(null)).toBeNull();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/leads/draft.test.ts`
Expected: FAIL

- [ ] **Step 3: Implement draft + page**

`parseSurveyDraft` JSON.parse in try/catch; require `version === 1`.

`EstimateSurvey` client component:

- On mount, read localStorage; if missing, create `draftId` with `crypto.randomUUID()`, `startedAt: Date.now()`, `step: "fit"`.
- Persist after every successful step change.
- Fit / location / notes / scope / project / files / contact screens. Scope uses `SCOPE_OPTIONS` multi-select buttons. Files: optional `<input type="file" multiple accept=".pdf,image/jpeg,image/png,image/webp">`; on change, `upload(name, file, { access: "private", handleUploadUrl: "/api/uploads", clientPayload: JSON.stringify({ draftId }) })` from `@vercel/blob/client`; store returned `pathname`s in answers.
- Contact includes consent checkbox with `CONSENT_LABEL`.
- Submit `POST /api/leads` with answers + `uploadPaths` + `startedAt` + `draftId` + empty `companyWebsite`. On success, `localStorage.removeItem(DRAFT_STORAGE_KEY)` then `window.location.assign(thanksPath)`. On failure, keep draft and show “Could not send. Retry.”
- Cannot advance with empty required fields (disable Continue).

`src/app/request-estimate/page.tsx`: unique title/description, canonical `/request-estimate`, render `<EstimateSurvey />`. No Calendly script here.

- [ ] **Step 4: Run tests**

Run: `npx vitest run src/lib/leads/draft.test.ts && npm test`
Expected: PASS (full suite still green)

- [ ] **Step 5: Commit**

```bash
git add src/lib/leads/draft.ts src/lib/leads/draft.test.ts src/components/estimate-survey src/app/request-estimate src/components/ui package.json package-lock.json
git commit -m "$(cat <<'EOF'
Add the request-estimate wizard with a local-only draft.
EOF
)"
```

---

### Task 14: Thanks page with HMAC-gated Calendly

**Files:**
- Create: `src/app/request-estimate/thanks/page.tsx`
- Create: `src/components/estimate-survey/calendly-embed.tsx`
- Test: `src/app/request-estimate/thanks/thanks.test.ts` testing a pure `resolveThanksView({ lid, k, secret, loadLead })`

**Interfaces:**
- Produces: `ThanksView = { showCalendly: boolean; name?: string; email?: string }`
- `resolveThanksView`: invalid/missing HMAC → `{ showCalendly: false }`; valid + `status === "qualified"` → `{ showCalendly: true, name, email }`; valid + secondary → `{ showCalendly: false }`
- Page sets `robots: { index: false, follow: false }`
- `CalendlyEmbed` loads `https://assets.calendly.com/assets/external/widget.js` only when rendered; prefills name/email. Parent must not import this on `/` or secondary thanks.

- [ ] **Step 1: Write the failing test**

```ts
import { describe, expect, it } from "vitest";
import { signLeadId } from "@/lib/leads/hmac";
import { resolveThanksView } from "@/app/request-estimate/thanks/resolve-thanks-view";

const secret = "test-secret-test-secret-test-secret";

describe("resolveThanksView", () => {
  it("hides Calendly when HMAC is wrong", async () => {
    const view = await resolveThanksView({
      lid: "lead-1",
      k: "nope",
      secret,
      loadLead: async () => ({
        status: "qualified",
        firstName: "Alex",
        lastName: "Lee",
        email: "alex@gc.example",
      }),
    });
    expect(view.showCalendly).toBe(false);
  });

  it("shows Calendly only for verified qualified leads", async () => {
    const view = await resolveThanksView({
      lid: "lead-1",
      k: signLeadId("lead-1", secret),
      secret,
      loadLead: async () => ({
        status: "qualified",
        firstName: "Alex",
        lastName: "Lee",
        email: "alex@gc.example",
      }),
    });
    expect(view.showCalendly).toBe(true);
    expect(view.email).toBe("alex@gc.example");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/app/request-estimate/thanks/thanks.test.ts`
Expected: FAIL (put the test in `thanks.test.ts` and export from `resolve-thanks-view.ts`)

- [ ] **Step 3: Implement**

Qualified copy: “Book a call with estimating.” Secondary copy: “Estimating will follow up. This form does not book a visit.” Always thank them. Phone and `estimating@strongfoam.com` remain visible.

- [ ] **Step 4: Run tests**

Run: `npx vitest run src/app/request-estimate/thanks/thanks.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/app/request-estimate/thanks src/components/estimate-survey/calendly-embed.tsx
git commit -m "$(cat <<'EOF'
Show Calendly on thanks only after HMAC verification of a qualified lead.
EOF
)"
```

---

### Task 15: Homepage CTAs and FAQ

**Files:**
- Modify: `src/content/site.ts` (hero `cta.href`, FAQ estimate answer)
- Modify: `src/content/site.test.ts`
- Modify: `src/components/site-header.tsx`
- Modify: `src/components/scroll-world-page.tsx` (process link ~line 462, contact actions ~649-667)
- Modify: `docs/copy-overlay-readiness.md`

**Interfaces:**
- Hero CTA href `/request-estimate`, label remains `Request an estimate`
- Header primary button label `Request estimate`, `href="/request-estimate"`, class uses accent red (`brand-button--red` or `#e8043d`). Phone is a text link, not the filled button.
- Process `Send the package →` href `/request-estimate`
- Contact primary `Start the project survey` → `/request-estimate`; outline phone; email as `<a href="mailto:…">` text under buttons
- Header nav Contact stays `#contact`

- [ ] **Step 1: Write the failing content test**

Add to `src/content/site.test.ts`:

```ts
  it("sends hero estimate CTA to the survey route", () => {
    const hero = scrollSections.find((section) => section.id === "hero");
    expect(hero?.cta).toEqual({
      label: "Request an estimate",
      href: "/request-estimate",
    });
  });

  it("points estimate FAQ at the on-site survey first", () => {
    const item = faqItems.find((entry) =>
      entry.question.toLowerCase().includes("estimate"),
    );
    expect(item?.answer).toContain("/request-estimate");
    expect(item?.answer).toContain("estimating@strongfoam.com");
    expect(item?.answer).toContain("519-900-6000");
  });
```

FAQ answer (no em dash):

`Start the project survey at /request-estimate. You can also email drawings and the package scope to estimating@strongfoam.com or call 519-900-6000.`

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/content/site.test.ts`
Expected: FAIL on href still `#contact`

- [ ] **Step 3: Update copy and components**

Header actions:

```tsx
<div className="flex items-center gap-3">
  <a
    href={`tel:${site.phoneE164}`}
    className="hidden text-sm text-white/70 hover:text-[color:var(--sf-cyan)] sm:inline"
  >
    {site.phoneDisplay}
  </a>
  <a
    href="/request-estimate"
    className={cn(
      buttonVariants({ size: "default" }),
      "bg-[color:var(--sf-red,#e8043d)] text-white hover:bg-[color:var(--sf-red,#e8043d)]/90",
    )}
  >
    Request estimate
  </a>
</div>
```

Contact block: primary survey button, outline `tel:`, then `<p><a href={mailto}>{site.emailEstimating}</a></p>`.

Update `docs/copy-overlay-readiness.md` Contact row: “Hero/header/process/contact primary CTAs open `/request-estimate`; phone and estimating email are fallbacks.”

- [ ] **Step 4: Run tests**

Run: `npx vitest run src/content/site.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/content/site.ts src/content/site.test.ts src/components/site-header.tsx src/components/scroll-world-page.tsx docs/copy-overlay-readiness.md
git commit -m "$(cat <<'EOF'
Point homepage estimate CTAs at the survey instead of mailto and tel.
EOF
)"
```

---

### Task 16: Documentation, env names, and browser verification

**Files:**
- Modify: `README.md`
- Modify: `docs/strongfoam-build-brief.md`
- Create: `.env.example` (names only, empty values)

**Interfaces:**
- README documents routes, env vars, `npm test`, `npm run db:push`
- Brief IA includes `/request-estimate`; success criteria include survey submit + CTA audit

- [ ] **Step 1: Add `.env.example`**

```
DATABASE_URL=
BLOB_READ_WRITE_TOKEN=
RESEND_API_KEY=
RESEND_FROM=
LEAD_NOTIFY_TO=estimating@strongfoam.com
LEAD_THANKS_SECRET=
NEXT_PUBLIC_CALENDLY_URL=
CALENDLY_WEBHOOK_SIGNING_KEY=
UPSTASH_REDIS_REST_URL=
UPSTASH_REDIS_REST_TOKEN=
```

README env section lists the same names and says secrets are never committed.

Brief add under IA:

`/request-estimate` adaptive estimate survey; `/request-estimate/thanks` noindex confirmation.

Success criterion 7: Homepage primary CTAs open `/request-estimate`; qualified thanks can embed Calendly.

- [ ] **Step 2: Run the full unit suite**

Run: `npm test`
Expected: PASS

- [ ] **Step 3: Browser verification (required before calling the task done)**

`npm run dev`. Exercise as a user:

1. Desktop: header, hero, process, and contact primary buttons all land on `/request-estimate`. Phone still calls `519-900-6000`.
2. Complete ICI Ontario + spray-foam path; thanks shows Calendly only with a real `lid`/`k`.
3. Tamper `k`; Calendly hidden.
4. Residential path; no Calendly; confirmation mentions follow-up.
5. Refresh mid-wizard; answers restore. After success, refresh does not restore.
6. Mobile viewport (~390px) and `prefers-reduced-motion` homepage still reach the CTA.

If any step fails, fix and re-run `npm test` plus the failed browser path.

- [ ] **Step 4: Commit**

```bash
git add README.md docs/strongfoam-build-brief.md .env.example
git commit -m "$(cat <<'EOF'
Document estimate-survey routes, env names, and success criteria.
EOF
)"
```

---

## Provisioning (operator, not a code-only task)

Run when wiring real adapters (Task 12), not before domain tests:

1. `vercel integration add neon` then `vercel env pull .env.local --yes`
2. Create a **private** Blob store on the Vercel project
3. Resend API key + verified domain for `RESEND_FROM`
4. Calendly event URL in `NEXT_PUBLIC_CALENDLY_URL`; webhook `https://strongfoam.com/api/webhooks/calendly` for `invitee.created` and `invitee.canceled`
5. `vercel integration add upstash` for production rate limit; `MemoryRateLimiter` remains the test/dev fallback
6. Generate `LEAD_THANKS_SECRET` (32+ random bytes)
7. `npm run db:push`

Do not commit `.env.local`.

---

## Self-review

**Spec coverage**

| Spec item | Task |
|-----------|------|
| Homepage CTAs | 15 |
| Adaptive graph | 2, 13 |
| qualifyLead | 1, 9 |
| Zod / consent / bad email | 3 |
| localStorage draft | 13 |
| Neon leads + unmatched events | 11 |
| POST /api/leads order, duplicate, notify failure | 9, 12 |
| Uploads private + types | 7, 12, 13 |
| Resend copy | 8, 9 |
| HMAC thanks + Calendly | 5, 14 |
| Calendly webhook | 10, 12 |
| Signed files | 12 |
| Spam / rate limit | 6, 9 |
| Docs / env | 16 |
| Browser CTA + motion | 16 |

**Placeholder scan:** none remaining in tasks. Provisioning is an operator checklist with exact commands.

**Type consistency:** `qualifyLead`, `LeadPayload`, `StoredLead.notifyStatus`, `bookingStatus` `none | offered | booked | canceled`, `thanksPath`, `DRAFT_STORAGE_KEY`, `createLead` error union used by the Route Handler.
