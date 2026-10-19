import { afterEach, describe, expect, it } from "vitest";
import { parseJobDraft, requestJobAi } from "@/lib/ops/ai-gateway";
import { buildJobEvidencePack } from "@/lib/ops/ai-evidence";
import { requestCommercialProposal } from "@/lib/ops/commercial-ai";
import type { CommercialEvidencePack } from "@/lib/ops/commercial-ai-evidence";
import {
  GOLDEN_VOICE_TRANSCRIPT,
  jobAiFixture,
  keepGroundedLines,
  keepGroundedSentences,
  photoCaptionFixture,
  demoAiFixturesEnabled,
  voiceExtractionFixture,
} from "@/lib/ops/demo-ai-fixtures";
import { DEMO_FIELD_USER_ID, DEMO_JOB_ID, DEMO_ORGANIZATION_ID } from "@/lib/ops/demo-data";
import { listDemoJobs } from "@/lib/ops/demo-store";
import { buildMorningDigest, digestText, leadDigestRow } from "@/lib/ops/morning-digest";
import { photoDraftsFromModel } from "@/lib/ops/photo-caption";
import { followupDraft } from "@/lib/ops/proposal-followups";
import { triageInbound } from "@/lib/leads/inbound-mail";
import { voiceDraftsFromModel } from "@/lib/ops/voice-drafts";
import {
  GOLDEN_JOB_ID,
  GOLDEN_JOB_NAME,
  goldenEvidenceForJob,
  goldenInboundProposal,
} from "@/lib/ops/golden-path";
import { listInboundProposals } from "@/lib/leads/inbound-store";
import { listAutomationProposals } from "@/lib/ops/automation-store";
import { listDispatches } from "@/lib/ops/dispatch-store";
import { listFieldDrafts } from "@/lib/ops/field-draft-store";
import { listQuotesAwaitingDecision, listReviewDrafts } from "@/lib/ops/proposal-followup-store";
import { listEstimateRequests, listJobs } from "@/lib/ops/store";

const pack = buildJobEvidencePack({
  job: { id: "job-1", name: "Podium", status: "in_progress" },
  tasks: [
    {
      id: "task-1",
      title: "Prepare podium deck",
      status: "open",
      dueAt: null,
      plannedEndAt: null,
      createdAt: new Date("2026-09-19T12:00:00.000Z"),
    },
  ],
  fieldNotes: [],
  voiceNotes: [],
  planMarks: [],
  events: [],
  now: new Date("2026-09-19T16:00:00.000Z"),
});

const commercial: CommercialEvidencePack = {
  organizationId: "00000000-0000-4000-8000-000000000001",
  opportunityId: "24000000-2400-4400-8400-240000000005",
  opportunityName: "Riverside warehouse retrofit",
  services: ["spray-foam"],
  company: null,
  contact: null,
  site: null,
  documents: [
    {
      documentVersionId: "24000000-2400-4400-8400-24000000000e",
      sha256: "hash",
      kind: "plan",
      filename: "warehouse-scope.pdf",
      pages: [
        {
          id: "page",
          pageNumber: 1,
          sheetLabel: "A-101",
          chunks: [
            {
              id: "24000000-2400-4400-8400-24000000000f",
              contentHash: "hash-scope",
              startOffset: 0,
              endOffset: 88,
              text: "Roof deck 2400 sq ft closed-cell spray foam at 2 inches.",
            },
          ],
        },
      ],
    },
  ],
  priceRevisions: [],
  estimateVersion: null,
};

describe("golden path fixtures", () => {
  const previous = {
    demo: process.env.OPS_DEMO,
    golden: process.env.DEMO_GOLDEN,
    fixtures: process.env.DEMO_AI_FIXTURES,
    live: process.env.DEMO_AI_LIVE,
    gateway: process.env.AI_GATEWAY_API_KEY,
    deepgram: process.env.DEEPGRAM_API_KEY,
  };

  afterEach(() => {
    for (const [key, value] of Object.entries({
      OPS_DEMO: previous.demo,
      DEMO_GOLDEN: previous.golden,
      DEMO_AI_FIXTURES: previous.fixtures,
      DEMO_AI_LIVE: previous.live,
      AI_GATEWAY_API_KEY: previous.gateway,
      DEEPGRAM_API_KEY: previous.deepgram,
    })) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
    delete process.env.DEMO_GOLDEN;
    delete process.env.DEMO_AI_FIXTURES;
    listDemoJobs();
  });

  it("keeps a cited fixture bullet and drops an unknown id", () => {
    process.env.DEMO_AI_FIXTURES = "1";
    const grounded = parseJobDraft(
      JSON.stringify({
        paragraph: "Podium is in progress.",
        bullets: [
          { text: "Open task: Prepare podium deck.", citations: [{ kind: "task", id: "task-1" }] },
          { text: "Invented row.", citations: [{ kind: "task", id: "missing-task" }] },
        ],
      }),
      pack,
      "daily_report",
      "demo-fixture",
      "golden-path-fixture",
    );
    expect(grounded.status).toBe("ready");
    if (grounded.status !== "ready") return;
    expect(grounded.bullets.map((item) => item.text)).toEqual(["Open task: Prepare podium deck."]);
  });

  it("uses the fixture through requestJobAi only when fixtures are on and no key is set", async () => {
    process.env.DEMO_AI_FIXTURES = "1";
    process.env.OPS_DEMO = "1";
    const result = await requestJobAi({
      pack,
      organizationId: "00000000-0000-4000-8000-000000000001",
      purpose: "daily_report",
      env: process.env,
      fetchImpl: async () => {
        throw new Error("network");
      },
    });
    expect(result.status).toBe("ready");
    if (result.status !== "ready") return;
    expect(result.model).toBe("golden-path-fixture");
    expect(result.bullets[0]?.citations).toEqual([{ kind: "task", id: "task-1" }]);
    expect(JSON.stringify(jobAiFixture(pack))).toContain("task-1");

    process.env.AI_GATEWAY_API_KEY = "live-key";
    expect(demoAiFixturesEnabled(process.env)).toBe(false);
  });

  it("validates the bid fixture and drops a citation the pack does not contain", async () => {
    process.env.DEMO_AI_FIXTURES = "1";
    const drafted = await requestCommercialProposal({ pack: commercial });
    expect(drafted.ok).toBe(true);
    if (!drafted.ok) return;
    expect(drafted.provider).toBe("demo-fixture");
    expect(drafted.proposal.lines.some((line) => line.quantity?.value === "2400")).toBe(true);
    const bad = parseJobDraft(
      JSON.stringify({
        paragraph: "No.",
        bullets: [{ text: "Bad.", citations: [{ kind: "task", id: "nope" }] }],
      }),
      goldenEvidenceForJob(),
      "summary",
      "demo-fixture",
      "golden-path-fixture",
    );
    expect(bad.status).toBe("ready");
    if (bad.status === "ready") expect(bad.bullets).toEqual([]);
  });

  it("keeps voice and photo facts that are grounded and drops the rest", () => {
    const cards = voiceDraftsFromModel(GOLDEN_VOICE_TRANSCRIPT, voiceExtractionFixture(GOLDEN_VOICE_TRANSCRIPT));
    expect(cards.map((card) => card.kind)).toEqual([
      "quantity",
      "blocker",
      "material_request",
      "daily_report",
    ]);
    expect(cards.find((card) => card.kind === "quantity")?.quantity).toBe(2400);
    const dropped = voiceDraftsFromModel(GOLDEN_VOICE_TRANSCRIPT, {
      cards: [{ kind: "quantity", quote: "Sprayed 90 bags.", quantity: 90, unit: "bags" }],
    });
    expect(dropped).toEqual([]);

    const context = {
      jobName: GOLDEN_JOB_NAME,
      scope: "Roof deck",
      areaNames: ["Roof deck"],
      areaIds: ["24000000-2400-4400-8400-240000000008"],
      taskTitle: "Spray the roof deck",
    };
    const drafts = photoDraftsFromModel(photoCaptionFixture(context), context);
    expect(drafts.map((draft) => draft.kind)).toContain("caption");
    expect(drafts.map((draft) => draft.kind)).toContain("lot_reading");
    expect(drafts.map((draft) => draft.kind)).toContain("gauge_reading");
    const certified = photoDraftsFromModel(
      { ...photoCaptionFixture(context), caption: "Thickness is certified.", areaId: "missing-area" },
      context,
    );
    expect(certified.some((draft) => draft.kind === "caption")).toBe(false);
    expect(certified.some((draft) => draft.kind === "area_tag")).toBe(false);
  });

  it("drops a triage city, a follow-up sentence, and a digest line that are not in the source", () => {
    const mail = {
      text: "Hello from the office.",
      fromName: "Priya Shah",
      fromEmail: "priya.shah@riverside-logistics.example",
    };
    const triage = triageInbound(mail, {
      intent: "estimate",
      company: "Riverside Logistics",
      phone: "519-555-2400",
      city: "Toronto",
    });
    expect(triage.city).toBe("");
    expect(triage.company).toBe("");
    const seeded = goldenInboundProposal();
    expect(seeded.triage.city).toBe("Cambridge");
    expect(seeded.triage.company).toBe("Riverside Logistics");
    expect(seeded.triage.phone).toBe("519-555-2400");
    expect(seeded.replyDraft).not.toMatch(/approved the price/i);

    const follow = followupDraft({
      organizationId: "00000000-0000-4000-8000-000000000001",
      proposalId: "24000000-2400-4400-8400-240000000010",
      estimateId: "24000000-2400-4400-8400-24000000000a",
      estimateNumber: "EST-2400",
      recipientName: "Priya Shah",
      recipientEmail: "priya.shah@riverside-logistics.example",
      day: 3,
      workingDay: "day-3",
    });
    expect(keepGroundedSentences(`${follow.body} The price is approved.`, follow.body)).not.toMatch(/price is approved/);

    const digest = digestText(
      buildMorningDigest({ now: new Date(), leads: [], quotes: [], jobs: [], drafts: [] }),
    );
    expect(keepGroundedLines(`${digest}\nThe price is approved.`, digest)).not.toMatch(/price is approved/);
  });

  it("adds the warehouse only while the golden demo is allowed and leaves the podium job in place", () => {
    expect(listDemoJobs().some((job) => job.id === GOLDEN_JOB_ID)).toBe(false);
    process.env.OPS_DEMO = "1";
    process.env.DEMO_GOLDEN = "1";
    const jobs = listDemoJobs();
    expect(jobs.some((job) => job.id === GOLDEN_JOB_ID)).toBe(true);
    expect(jobs.some((job) => job.id === DEMO_JOB_ID)).toBe(true);
    expect(GOLDEN_JOB_ID).not.toBe(DEMO_JOB_ID);
    delete process.env.DEMO_GOLDEN;
    expect(listDemoJobs().some((job) => job.id === GOLDEN_JOB_ID)).toBe(false);
    expect(listDemoJobs().some((job) => job.id === DEMO_JOB_ID)).toBe(true);
  });

  it("fills the screens the recording walks", async () => {
    process.env.OPS_DEMO = "1";
    process.env.DEMO_GOLDEN = "1";
    const jobs = await listJobs();
    expect(jobs.some((job) => job.id === GOLDEN_JOB_ID && job.name === GOLDEN_JOB_NAME)).toBe(true);
    const inbound = await listInboundProposals();
    const mail = inbound.find((item) => item.triage.company === "Riverside Logistics");
    expect(mail?.triage.city).toBe("Cambridge");
    expect(mail?.triage.phone).toBe("519-555-2400");
    expect(mail?.text).toMatch(/2400/);
    expect(mail?.replyDraft).not.toMatch(/approved the price/i);
    const leads = await listEstimateRequests();
    expect(leads.some((lead) => lead.company === "Riverside Logistics")).toBe(true);
    const quotes = await listQuotesAwaitingDecision(DEMO_ORGANIZATION_ID);
    expect(quotes.some((quote) => quote.estimateNumber === "EST-2400")).toBe(false);
    const reviews = await listReviewDrafts(DEMO_ORGANIZATION_ID);
    expect(reviews.map((draft) => draft.title).join(" ")).toMatch(/digest|report|follow/i);
    const pending = await listAutomationProposals(DEMO_ORGANIZATION_ID);
    expect(pending.length).toBeGreaterThan(0);
    const digest = digestText(
      buildMorningDigest({
        now: new Date("2026-09-19T12:00:00.000Z"),
        leads: leads.map(leadDigestRow),
        quotes,
        jobs: jobs.map((job) => ({
          id: job.id,
          name: job.name,
          status: job.status,
          missingDailyLog: false,
          href: `/app/jobs/${job.id}`,
        })),
        drafts: pending.map((draft) => ({ id: draft.recordId, title: draft.title, kind: draft.kind })),
      }),
    );
    expect(digest).toMatch(/Riverside Logistics/);
    expect(digest).not.toMatch(/EST-2400/);
    const today = await listDispatches(DEMO_ORGANIZATION_ID, "2026-09-19", DEMO_FIELD_USER_ID);
    expect(today.map((row) => row.jobId)).toEqual([GOLDEN_JOB_ID]);
    const drafts = await listFieldDrafts(DEMO_ORGANIZATION_ID, GOLDEN_JOB_ID);
    const kinds = drafts.map((draft) => draft.kind);
    expect(kinds).toEqual(expect.arrayContaining(["quantity", "caption", "lot_reading", "gauge_reading", "labor", "deficiency"]));
  });
});
