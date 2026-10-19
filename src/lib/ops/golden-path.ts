import { createHash } from "node:crypto";
import {
  firstReplyDraft,
  inboundDedupeKey,
  inboundLeadKey,
  triageInbound,
  type InboundProposal,
} from "@/lib/leads/inbound-mail";
import { buildJobEvidencePack } from "@/lib/ops/ai-evidence";
import { validateBidEstimateProposal, type AiProposalRecord } from "@/lib/ops/commercial-ai";
import type { CommercialEvidencePack } from "@/lib/ops/commercial-ai-evidence";
import {
  DEMO_ADMIN_EMAIL,
  DEMO_ADMIN_USER_ID,
  DEMO_FIELD_EMAIL,
  DEMO_FIELD_USER_ID,
  DEMO_JOB_ID,
  DEMO_ORGANIZATION_ID,
  DEMO_SCHEDULE_NOW,
  demoPriceBookVersions,
  type CompanyRow,
  type ContactRow,
  type EstimateRequestRow,
  type JobAssignmentRow,
  type JobDocumentRow,
  type JobEventRow,
  type JobRow,
  type JobTaskRow,
  type JobVoiceNoteRow,
  type OpportunityRow,
  type ProjectRow,
  type SiteRow,
  type WorkAreaRow,
} from "@/lib/ops/demo-data";
import {
  bidDraftFixture,
  GOLDEN_GAUGE,
  GOLDEN_LOT,
  GOLDEN_PHOTO_CAPTION,
  GOLDEN_VOICE_TRANSCRIPT,
  inboundTriageModel,
  keepGroundedLines,
  keepGroundedSentences,
  demoAiFixturesEnabled,
} from "@/lib/ops/demo-ai-fixtures";
import {
  listDemoReviewDrafts,
  removeDemoInboxIds,
  saveDemoInboundProposal,
  saveDemoReviewDraft,
  findDemoInboundProposal,
} from "@/lib/ops/demo-inbox";
import { readWorkerDatabase } from "@/lib/ops/demo-mode";
import { goldenDemoEnabled } from "@/lib/ops/demo-seed-guard";
import type { DemoOpsState } from "@/lib/ops/demo-store";
import { dispatchMemory } from "@/lib/ops/dispatch-access";
import { closeoutMemory } from "@/lib/ops/closeout-access";
import { inspectionMemory } from "@/lib/ops/inspection-access";
import { qualityMemory } from "@/lib/ops/quality-access";
import { saveSiteGeofence } from "@/lib/ops/geofence-store";
import { confirmedDailyReport } from "@/lib/ops/field-daily-report";
import { removeFieldDraftsForJob, saveFieldDraft } from "@/lib/ops/field-draft-store";
import { createWarehousePhotoPng, createWarehouseVoiceWav } from "@/lib/ops/golden-media";
import { setJobDocumentBytes } from "@/lib/ops/job-document-bytes";
import { buildMorningDigest, digestText } from "@/lib/ops/morning-digest";
import { estimateRecords, prepareEstimateVersion } from "@/lib/ops/estimates";
import { followupDraft } from "@/lib/ops/proposal-followups";
import { buildProposalSnapshot, PROPOSAL_ACCEPTANCE_TERMS, type ProposalEvent } from "@/lib/ops/proposals";
import { setVoiceNoteBytes } from "@/lib/ops/voice-bytes";
import type { ReviewDraft } from "@/lib/ops/review-drafts";

export const GOLDEN_COMPANY_ID = "24000000-2400-4400-8400-240000000001";
export const GOLDEN_CONTACT_ID = "24000000-2400-4400-8400-240000000002";
export const GOLDEN_SITE_ID = "24000000-2400-4400-8400-240000000003";
export const GOLDEN_LEAD_ID = "24000000-2400-4400-8400-240000000004";
export const GOLDEN_OPPORTUNITY_ID = "24000000-2400-4400-8400-240000000005";
export const GOLDEN_PROJECT_ID = "24000000-2400-4400-8400-240000000006";
export const GOLDEN_JOB_ID = "24000000-2400-4400-8400-240000000007";
export const GOLDEN_AREA_ID = "24000000-2400-4400-8400-240000000008";
export const GOLDEN_TASK_ID = "24000000-2400-4400-8400-240000000009";
export const GOLDEN_ESTIMATE_ID = "24000000-2400-4400-8400-24000000000a";
export const GOLDEN_VERSION_1_ID = "24000000-2400-4400-8400-24000000000b";
export const GOLDEN_VERSION_2_ID = "24000000-2400-4400-8400-24000000000c";
export const GOLDEN_DOCUMENT_ID = "24000000-2400-4400-8400-24000000000d";
export const GOLDEN_DOCUMENT_VERSION_ID = "24000000-2400-4400-8400-24000000000e";
export const GOLDEN_CHUNK_ID = "24000000-2400-4400-8400-24000000000f";
export const GOLDEN_PROPOSAL_ID = "24000000-2400-4400-8400-240000000010";
export const GOLDEN_PHOTO_ID = "24000000-2400-4400-8400-240000000011";
export const GOLDEN_VOICE_ID = "24000000-2400-4400-8400-240000000012";
export const GOLDEN_DISPATCH_ID = "24000000-2400-4400-8400-240000000013";
export const GOLDEN_CLOSEOUT_ID = "24000000-2400-4400-8400-240000000014";
export const GOLDEN_QUALITY_ID = "24000000-2400-4400-8400-240000000015";
export const GOLDEN_INSPECTION_ID = "24000000-2400-4400-8400-240000000016";
export const GOLDEN_ASSIGNMENT_ID = "24000000-2400-4400-8400-240000000017";
export const GOLDEN_AI_PROPOSAL_ID = "24000000-2400-4400-8400-240000000018";
export const GOLDEN_PAGE_ID = "24000000-2400-4400-8400-240000000019";
export const GOLDEN_EXTRACTION_ID = "24000000-2400-4400-8400-24000000001a";
export const GOLDEN_FOLLOWUP_ID = "24000000-2400-4400-8400-240000000041";
export const GOLDEN_DIGEST_ID = "24000000-2400-4400-8400-240000000042";
export const GOLDEN_REPORT_ID = "24000000-2400-4400-8400-240000000043";

export const GOLDEN_JOB_NAME = "Riverside warehouse retrofit";
export const GOLDEN_ESTIMATE_NUMBER = "EST-2400";
export const GOLDEN_EMAIL_SUBJECT = "Estimate for Cambridge warehouse spray foam";
export const GOLDEN_EMAIL_TEXT = [
  "Riverside Logistics needs a bid for the Cambridge warehouse retrofit.",
  "Please estimate closed-cell spray foam for the roof deck, 2400 sq ft, and the east wall.",
  "Phone 519-555-2400.",
  "The building is in Cambridge, Ontario.",
].join("\n");
export const GOLDEN_SCOPE_TEXT =
  "Cambridge warehouse retrofit. Roof deck 2400 sq ft closed-cell spray foam at 2 inches. East wall 600 sq ft. West bay liner 1800 sq ft.";

const MESSAGE_ID = "golden-riverside-cambridge-2400";
const FROM_EMAIL = "priya.shah@riverside-logistics.example";
const FROM_NAME = "Priya Shah";
const NOW = new Date(DEMO_SCHEDULE_NOW);
const DAY = 24 * 60 * 60 * 1000;
const PODIUM_NOTE = "Podium deck closed-cell after the safety talk.";
const CLOSED_CELL_ITEM = "11111111-1111-4111-8111-111111111101";
const AREA_ITEM = "11111111-1111-4111-8111-111111111105";

const moved = globalThis as { __strongfoamGoldenPodiumMoved?: boolean };

function drop<T>(rows: T[], match: (row: T) => boolean) {
  for (let index = rows.length - 1; index >= 0; index -= 1) {
    if (match(rows[index]!)) rows.splice(index, 1);
  }
}

function hasId(rows: Array<{ id: string }>, id: string): boolean {
  return rows.some((row) => row.id === id);
}

function pushOnce<T extends { id: string }>(rows: T[], row: T) {
  if (!hasId(rows, row.id)) rows.push(row);
}

export function goldenMail() {
  return {
    messageId: MESSAGE_ID,
    fromEmail: FROM_EMAIL,
    fromName: FROM_NAME,
    to: "estimates@strongfoam.com",
    subject: GOLDEN_EMAIL_SUBJECT,
    text: GOLDEN_EMAIL_TEXT,
    receivedAt: new Date(NOW.getTime() - 8 * DAY).toISOString(),
  };
}

export function goldenInboundProposal(): InboundProposal {
  const mail = goldenMail();
  const model = inboundTriageModel();
  const triage = triageInbound(mail, model, "golden-path-fixture");
  const grounded = firstReplyDraft({
    fromName: mail.fromName,
    fromEmail: mail.fromEmail,
    subject: mail.subject,
    attachmentCount: 0,
  });
  return {
    organizationId: DEMO_ORGANIZATION_ID,
    dedupeKey: inboundDedupeKey(mail),
    messageId: mail.messageId,
    fromEmail: mail.fromEmail,
    fromName: mail.fromName,
    to: mail.to,
    subject: mail.subject,
    text: mail.text,
    receivedAt: mail.receivedAt,
    attachments: [],
    triage,
    replyDraft: keepGroundedSentences(`${grounded} We approved the price.`, grounded),
    status: "proposed",
    leadId: null,
    sendsToCustomer: false,
    setsPrice: false,
    approves: false,
    requiresConfirmation: true,
  };
}

function scopeHash(): string {
  return createHash("sha256").update(GOLDEN_SCOPE_TEXT).digest("hex");
}

function priceRevision(itemId: string) {
  const version = demoPriceBookVersions().find((item) => item.itemId === itemId);
  if (!version) throw new Error("Golden price revision is missing.");
  return {
    id: version.id,
    itemId: version.itemId,
    organizationId: version.organizationId,
    status: version.status,
    active: true,
    trade: version.trade,
    description: version.description,
    unit: version.unit,
    unitPriceCents: version.unitPriceCents,
  };
}

function line(input: {
  id: string;
  sortOrder: number;
  description: string;
  quantity: string;
  revision: ReturnType<typeof priceRevision>;
  sourceId: string;
}) {
  return {
    id: input.id,
    sortOrder: input.sortOrder,
    category: "material" as const,
    description: input.description,
    trade: input.revision.trade,
    location: "Roof deck",
    method: "unit" as const,
    quantity: input.quantity,
    unit: input.revision.unit,
    unitPriceCents: null,
    basisPoints: null,
    basisCategories: [],
    taxable: true,
    alternateKey: null,
    priceBookItemId: input.revision.itemId,
    priceBookVersionId: input.revision.id,
    sources: [
      {
        id: input.sourceId,
        documentVersionId: GOLDEN_DOCUMENT_VERSION_ID,
        pageNumber: 1,
        sheetLabel: "A-101",
        chunkId: GOLDEN_CHUNK_ID,
        contentHash: scopeHash(),
        startOffset: 0,
        endOffset: GOLDEN_SCOPE_TEXT.length,
      },
    ],
  };
}

function prepareVersion(
  versionId: string,
  quantities: { area: string; bags: string },
  existing: number[],
  ids: { area: string; bags: string; areaSource: string; bagsSource: string; clause: string },
) {
  const area = priceRevision(AREA_ITEM);
  const bags = priceRevision(CLOSED_CELL_ITEM);
  const prepared = prepareEstimateVersion(
    {
      organizationId: DEMO_ORGANIZATION_ID,
      estimateId: GOLDEN_ESTIMATE_ID,
      opportunityId: GOLDEN_OPPORTUNITY_ID,
      createdBy: DEMO_ADMIN_EMAIL,
      versionId,
      overheadBasisPoints: 0,
      markupBasisPoints: 1000,
      taxBasisPoints: 1300,
      clauses: [
        {
          id: ids.clause,
          kind: "inclusion",
          text: "Closed-cell spray foam at the Cambridge warehouse roof deck.",
          sortOrder: 0,
        },
      ],
      alternates: [],
      lines: [
        line({
          id: ids.area,
          sortOrder: 0,
          description: "Roof deck closed-cell area",
          quantity: quantities.area,
          revision: area,
          sourceId: ids.areaSource,
        }),
        line({
          id: ids.bags,
          sortOrder: 1,
          description: "Closed-cell spray foam",
          quantity: quantities.bags,
          revision: bags,
          sourceId: ids.bagsSource,
        }),
      ],
      jobPackages: [],
    },
    {
      revisions: [area, bags],
      citations: [
        {
          id: GOLDEN_CHUNK_ID,
          organizationId: DEMO_ORGANIZATION_ID,
          documentVersionId: GOLDEN_DOCUMENT_VERSION_ID,
          pageNumber: 1,
          contentHash: scopeHash(),
          startOffset: 0,
          endOffset: GOLDEN_SCOPE_TEXT.length,
        },
      ],
      existingVersionNumbers: existing,
    },
  );
  if (!prepared.ok) throw new Error(prepared.error);
  return prepared.version;
}

function evidencePack(): CommercialEvidencePack {
  return {
    organizationId: DEMO_ORGANIZATION_ID,
    opportunityId: GOLDEN_OPPORTUNITY_ID,
    opportunityName: GOLDEN_JOB_NAME,
    services: ["spray-foam"],
    company: { id: GOLDEN_COMPANY_ID, name: "Riverside Logistics" },
    contact: { id: GOLDEN_CONTACT_ID, name: FROM_NAME },
    site: { id: GOLDEN_SITE_ID, name: "Cambridge warehouse" },
    documents: [
      {
        documentVersionId: GOLDEN_DOCUMENT_VERSION_ID,
        sha256: scopeHash(),
        kind: "plan",
        filename: "warehouse-scope.pdf",
        pages: [
          {
            id: GOLDEN_PAGE_ID,
            pageNumber: 1,
            sheetLabel: "A-101",
            chunks: [
              {
                id: GOLDEN_CHUNK_ID,
                contentHash: scopeHash(),
                startOffset: 0,
                endOffset: GOLDEN_SCOPE_TEXT.length,
                text: GOLDEN_SCOPE_TEXT,
              },
            ],
          },
        ],
      },
    ],
    priceRevisions: [],
    estimateVersion: null,
  };
}

function reviewDrafts(): ReviewDraft[] {
  const follow = followupDraft({
    organizationId: DEMO_ORGANIZATION_ID,
    proposalId: GOLDEN_PROPOSAL_ID,
    estimateId: GOLDEN_ESTIMATE_ID,
    estimateNumber: GOLDEN_ESTIMATE_NUMBER,
    recipientName: FROM_NAME,
    recipientEmail: FROM_EMAIL,
    day: 3,
    workingDay: "2026-09-16",
  });
  const digest = digestText(
    buildMorningDigest({
      now: NOW,
      leads: [
        {
          id: GOLDEN_LEAD_ID,
          label: "Riverside Logistics",
          workflowStatus: "reviewing",
          nextActionDueAt: new Date(NOW.getTime() - DAY),
          updatedAt: new Date(NOW.getTime() - 18 * DAY),
          href: `/app/requests/${GOLDEN_LEAD_ID}`,
        },
      ],
      quotes: [],
      jobs: [
        {
          id: GOLDEN_JOB_ID,
          name: GOLDEN_JOB_NAME,
          status: "in_progress",
          missingDailyLog: false,
          href: `/app/jobs/${GOLDEN_JOB_ID}`,
        },
      ],
      drafts: [{ id: GOLDEN_REPORT_ID, title: "Warehouse daily report", kind: "daily_report" }],
    }),
  );
  const report =
    confirmedDailyReport({
      jobName: GOLDEN_JOB_NAME,
      workingDay: "2026-09-19",
      doneTasks: ["Spray the roof deck"],
      drafts: [{ status: "confirmed", kind: "caption", body: GOLDEN_PHOTO_CAPTION }],
    }) ?? `${GOLDEN_JOB_NAME} daily report.`;
  return [
    {
      ...follow,
      id: GOLDEN_FOLLOWUP_ID,
      body: keepGroundedSentences(`${follow.body} The price is approved.`, follow.body),
    },
    {
      id: GOLDEN_DIGEST_ID,
      kind: "morning_brief",
      status: "proposed",
      requiresConfirmation: true,
      sendsToCustomer: false,
      setsPrice: false,
      approves: false,
      organizationId: DEMO_ORGANIZATION_ID,
      recordId: DEMO_ORGANIZATION_ID,
      title: "Morning digest",
      body: keepGroundedLines(`${digest}\nThe price is approved.`, digest),
      href: "/app",
      workingDay: "2026-09-19",
    },
    {
      id: GOLDEN_REPORT_ID,
      kind: "daily_report",
      status: "proposed",
      requiresConfirmation: true,
      sendsToCustomer: false,
      setsPrice: false,
      approves: false,
      organizationId: DEMO_ORGANIZATION_ID,
      recordId: GOLDEN_JOB_ID,
      title: "Warehouse daily report",
      body: report,
      href: `/app/jobs/${GOLDEN_JOB_ID}`,
      workingDay: "2026-09-19",
    },
  ];
}

function seedFieldDrafts() {
  const voice = GOLDEN_VOICE_TRANSCRIPT;
  const cards = [
    {
      kind: "quantity" as const,
      quote: "Sprayed 2400 square feet on the warehouse roof deck.",
      quantity: 2400,
      unit: "sq_ft" as const,
    },
    {
      kind: "blocker" as const,
      quote: "The east wall is blocked until the electrician moves the conduit.",
      quantity: null,
      unit: null,
    },
    {
      kind: "material_request" as const,
      quote: "Need 12 bags of closed-cell for the west bay.",
      quantity: null,
      unit: null,
    },
    { kind: "daily_report" as const, quote: voice, quantity: null, unit: null },
  ];
  for (const card of cards) {
    void saveFieldDraft({
      organizationId: DEMO_ORGANIZATION_ID,
      jobId: GOLDEN_JOB_ID,
      userId: DEMO_FIELD_USER_ID,
      kind: card.kind,
      body: card.quote,
      quote: card.quote,
      quantity: card.quantity,
      unit: card.unit,
      workAreaId: GOLDEN_AREA_ID,
      taskId: GOLDEN_TASK_ID,
      documentId: null,
      voiceNoteId: GOLDEN_VOICE_ID,
      effect: null,
      source: "voice",
    });
  }
  void saveFieldDraft({
    organizationId: DEMO_ORGANIZATION_ID,
    jobId: GOLDEN_JOB_ID,
    userId: DEMO_FIELD_USER_ID,
    kind: "caption",
    body: GOLDEN_PHOTO_CAPTION,
    quote: GOLDEN_PHOTO_CAPTION,
    quantity: null,
    unit: null,
    workAreaId: GOLDEN_AREA_ID,
    taskId: GOLDEN_TASK_ID,
    documentId: GOLDEN_PHOTO_ID,
    voiceNoteId: null,
    effect: null,
    source: "photo",
    status: "confirmed",
  });
  for (const card of [
    { kind: "lot_reading" as const, body: GOLDEN_LOT },
    { kind: "gauge_reading" as const, body: GOLDEN_GAUGE },
    { kind: "area_tag" as const, body: "Roof deck" },
    { kind: "coverage_flag" as const, body: "The roof deck bay looks covered on this pass." },
    { kind: "safety_flag" as const, body: "Crew is tied off at the roof edge." },
  ]) {
    void saveFieldDraft({
      organizationId: DEMO_ORGANIZATION_ID,
      jobId: GOLDEN_JOB_ID,
      userId: DEMO_FIELD_USER_ID,
      kind: card.kind,
      body: card.body,
      quote: card.body,
      quantity: null,
      unit: null,
      workAreaId: card.kind === "area_tag" ? GOLDEN_AREA_ID : null,
      taskId: null,
      documentId: GOLDEN_PHOTO_ID,
      voiceNoteId: null,
      effect: null,
      source: "photo",
    });
  }
  void saveFieldDraft({
    organizationId: DEMO_ORGANIZATION_ID,
    jobId: GOLDEN_JOB_ID,
    userId: DEMO_FIELD_USER_ID,
    kind: "labor",
    body: "Arrived at Cambridge warehouse.",
    quote: "Arrived at Cambridge warehouse.",
    quantity: null,
    unit: null,
    workAreaId: null,
    taskId: null,
    documentId: null,
    voiceNoteId: null,
    effect: null,
    source: "arrival",
  });
  void saveFieldDraft({
    organizationId: DEMO_ORGANIZATION_ID,
    jobId: GOLDEN_JOB_ID,
    userId: DEMO_FIELD_USER_ID,
    kind: "deficiency",
    body: "East wall conduit is in the spray path.",
    quote: "East wall conduit is in the spray path.",
    quantity: null,
    unit: null,
    workAreaId: GOLDEN_AREA_ID,
    taskId: null,
    documentId: null,
    voiceNoteId: null,
    effect: null,
    source: "manual",
  });
  const report = confirmedDailyReport({
    jobName: GOLDEN_JOB_NAME,
    workingDay: "2026-09-19",
    doneTasks: [],
    drafts: [{ status: "confirmed", kind: "caption", body: GOLDEN_PHOTO_CAPTION }],
  });
  if (report) {
    void saveFieldDraft({
      organizationId: DEMO_ORGANIZATION_ID,
      jobId: GOLDEN_JOB_ID,
      userId: "schedule",
      kind: "daily_report",
      body: report,
      quote: report,
      quantity: null,
      unit: null,
      workAreaId: null,
      taskId: null,
      documentId: null,
      voiceNoteId: null,
      effect: null,
      source: "schedule",
    });
  }
}

function applyRecords(state: DemoOpsState) {
  const createdAt = new Date(NOW.getTime() - 8 * DAY);
  const updatedAt = new Date(NOW.getTime() - DAY);
  const company: CompanyRow = {
    id: GOLDEN_COMPANY_ID,
    organizationId: DEMO_ORGANIZATION_ID,
    createdAt,
    updatedAt,
    name: "Riverside Logistics",
    email: FROM_EMAIL,
    phone: "519-555-2400",
    city: "Cambridge",
    province: "ON",
  };
  const contact: ContactRow = {
    id: GOLDEN_CONTACT_ID,
    organizationId: DEMO_ORGANIZATION_ID,
    createdAt,
    updatedAt,
    companyId: GOLDEN_COMPANY_ID,
    firstName: "Priya",
    lastName: "Shah",
    email: FROM_EMAIL,
    phone: "519-555-2400",
    role: "Facilities manager",
  };
  const site: SiteRow = {
    id: GOLDEN_SITE_ID,
    organizationId: DEMO_ORGANIZATION_ID,
    createdAt,
    updatedAt,
    companyId: GOLDEN_COMPANY_ID,
    name: "Cambridge warehouse",
    city: "Cambridge",
    province: "ON",
    addressLine: "1200 Industrial Road",
    postalCode: "N3H 4R7",
  };
  const lead: EstimateRequestRow = {
    id: GOLDEN_LEAD_ID,
    organizationId: DEMO_ORGANIZATION_ID,
    createdAt,
    updatedAt: new Date(NOW.getTime() - 18 * DAY),
    status: "qualified",
    bookingStatus: "none",
    notifyStatus: "held",
    workflowStatus: "reviewing",
    assignedTo: "Demo Administrator",
    nextAction: "Call Priya about the roof deck",
    nextActionDueAt: new Date(NOW.getTime() - DAY),
    lostReason: null,
    email: FROM_EMAIL,
    phone: "519-555-2400",
    firstName: "Priya",
    lastName: "Shah",
    company: "Riverside Logistics",
    projectType: "commercial_ici",
    city: "Cambridge",
    province: "ON",
    services: ["spray-foam"],
    answers: { intakeType: "estimate", notes: GOLDEN_EMAIL_TEXT },
    recommendedServices: ["spray-foam"],
    files: [],
    sourcePath: `email:${inboundDedupeKey(goldenMail())}`,
    utm: null,
    referrer: null,
    idempotencyKey: inboundLeadKey(inboundDedupeKey(goldenMail())),
    calendlyInviteeUri: null,
    consentAt: createdAt,
    companyId: GOLDEN_COMPANY_ID,
    contactId: GOLDEN_CONTACT_ID,
    siteId: GOLDEN_SITE_ID,
    opportunityId: GOLDEN_OPPORTUNITY_ID,
  };
  const opportunity: OpportunityRow = {
    id: GOLDEN_OPPORTUNITY_ID,
    organizationId: DEMO_ORGANIZATION_ID,
    createdAt,
    updatedAt,
    companyId: GOLDEN_COMPANY_ID,
    contactId: GOLDEN_CONTACT_ID,
    siteId: GOLDEN_SITE_ID,
    sourceLeadId: GOLDEN_LEAD_ID,
    name: GOLDEN_JOB_NAME,
    stage: "won",
    owner: "Demo Administrator",
    source: "email",
    services: ["spray-foam"],
    projectType: "commercial_ici",
    projectId: GOLDEN_PROJECT_ID,
  };
  const project: ProjectRow = {
    id: GOLDEN_PROJECT_ID,
    organizationId: DEMO_ORGANIZATION_ID,
    createdAt,
    updatedAt,
    companyId: GOLDEN_COMPANY_ID,
    siteId: GOLDEN_SITE_ID,
    opportunityId: GOLDEN_OPPORTUNITY_ID,
    sourceLeadId: GOLDEN_LEAD_ID,
    name: GOLDEN_JOB_NAME,
    status: "active",
    projectManager: "Alex Rivera",
    scheduleCalendarId: null,
  };
  const job: JobRow = {
    id: GOLDEN_JOB_ID,
    organizationId: DEMO_ORGANIZATION_ID,
    createdAt,
    updatedAt: NOW,
    projectId: GOLDEN_PROJECT_ID,
    companyId: GOLDEN_COMPANY_ID,
    siteId: GOLDEN_SITE_ID,
    opportunityId: GOLDEN_OPPORTUNITY_ID,
    name: GOLDEN_JOB_NAME,
    status: "in_progress",
    scope: "Closed-cell spray foam, 2400 sq ft roof deck, Cambridge warehouse.",
    services: ["spray-foam"],
    projectManager: "Alex Rivera",
    foreman: "Jordan Field",
    plannedStartAt: NOW,
    plannedEndAt: new Date(NOW.getTime() + 4 * DAY),
    blockerNote: null,
  };
  const area: WorkAreaRow = {
    id: GOLDEN_AREA_ID,
    createdAt,
    updatedAt,
    jobId: GOLDEN_JOB_ID,
    name: "Roof deck",
    kind: "area",
    notes: "2400 sq ft commercial warehouse roof.",
    sortOrder: 0,
  };
  const task: JobTaskRow = {
    id: GOLDEN_TASK_ID,
    createdAt,
    updatedAt,
    jobId: GOLDEN_JOB_ID,
    workAreaId: GOLDEN_AREA_ID,
    title: "Spray the roof deck",
    assignee: "Jordan Field",
    assigneeUserId: DEMO_FIELD_USER_ID,
    dueAt: new Date(NOW.getTime() + DAY),
    plannedStartAt: NOW,
    plannedEndAt: new Date(NOW.getTime() + DAY),
    completedAt: null,
    status: "open",
    statedQuantity: 2400,
    statedUnit: "sq_ft",
    createdBy: DEMO_ADMIN_EMAIL,
  };
  const assignment: JobAssignmentRow = {
    id: GOLDEN_ASSIGNMENT_ID,
    createdAt,
    jobId: GOLDEN_JOB_ID,
    userId: DEMO_FIELD_USER_ID,
    role: "foreman",
    createdBy: DEMO_ADMIN_EMAIL,
  };
  const event: JobEventRow = {
    id: "24000000-2400-4400-8400-24000000001b",
    jobId: GOLDEN_JOB_ID,
    createdAt,
    actor: DEMO_ADMIN_EMAIL,
    kind: "job_created",
    summary: "job created from won work: Riverside warehouse retrofit",
    payload: { projectId: GOLDEN_PROJECT_ID, opportunityId: GOLDEN_OPPORTUNITY_ID },
  };
  const photoBytes = createWarehousePhotoPng();
  const photo: JobDocumentRow = {
    id: GOLDEN_PHOTO_ID,
    organizationId: DEMO_ORGANIZATION_ID,
    createdAt: NOW,
    jobId: GOLDEN_JOB_ID,
    workAreaId: GOLDEN_AREA_ID,
    filename: "warehouse-roof.png",
    contentType: "image/png",
    sizeBytes: photoBytes.byteLength,
    pathname: `jobs/${GOLDEN_JOB_ID}/${GOLDEN_PHOTO_ID}/warehouse-roof.png`,
    storage: "memory",
    kind: "photo",
    caption: GOLDEN_PHOTO_CAPTION,
    uploadedBy: DEMO_FIELD_EMAIL,
    sheetKey: "",
    versionNumber: 1,
    replacesDocumentId: null,
    supersededAt: null,
  };
  const voiceBytes = createWarehouseVoiceWav();
  const voice: JobVoiceNoteRow = {
    id: GOLDEN_VOICE_ID,
    createdAt: NOW,
    updatedAt: NOW,
    jobId: GOLDEN_JOB_ID,
    workAreaId: GOLDEN_AREA_ID,
    taskId: GOLDEN_TASK_ID,
    annotationId: null,
    documentId: GOLDEN_PHOTO_ID,
    source: "task",
    filename: "warehouse-note.wav",
    contentType: "audio/wav",
    sizeBytes: voiceBytes.byteLength,
    pathname: `jobs/${GOLDEN_JOB_ID}/voice/${GOLDEN_VOICE_ID}/warehouse-note.wav`,
    storage: "memory",
    durationSeconds: 1,
    language: "en",
    provider: "demo-fixture",
    model: "golden-path-fixture",
    status: "completed",
    machineTranscript: GOLDEN_VOICE_TRANSCRIPT,
    transcript: GOLDEN_VOICE_TRANSCRIPT,
    confidence: 1,
    queuedAt: NOW,
    processingStartedAt: NOW,
    completedAt: NOW,
    failedAt: null,
    error: null,
    consentAt: NOW,
    createdBy: DEMO_FIELD_EMAIL,
  };
  pushOnce(state.companies, company);
  pushOnce(state.contacts, contact);
  pushOnce(state.sites, site);
  pushOnce(state.requests, lead);
  pushOnce(state.opportunities, opportunity);
  pushOnce(state.projects, project);
  pushOnce(state.jobsList, job);
  pushOnce(state.workAreas, area);
  pushOnce(state.jobTasks, task);
  pushOnce(state.jobAssignments, assignment);
  pushOnce(state.jobEvents, event);
  pushOnce(state.jobDocuments, photo);
  pushOnce(state.jobVoiceNotes, voice);
  setJobDocumentBytes(GOLDEN_PHOTO_ID, photoBytes);
  setVoiceNoteBytes(GOLDEN_VOICE_ID, voiceBytes);

  const hash = scopeHash();
  pushOnce(state.bidDocuments, {
    id: GOLDEN_DOCUMENT_ID,
    organizationId: DEMO_ORGANIZATION_ID,
    createdAt,
    title: "Cambridge warehouse scope",
    createdBy: DEMO_ADMIN_EMAIL,
  });
  pushOnce(state.bidDocumentVersions, {
    id: GOLDEN_DOCUMENT_VERSION_ID,
    organizationId: DEMO_ORGANIZATION_ID,
    documentId: GOLDEN_DOCUMENT_ID,
    versionNumber: 1,
    createdAt,
    filename: "warehouse-scope.pdf",
    contentType: "application/pdf",
    sizeBytes: GOLDEN_SCOPE_TEXT.length,
    pathname: `opportunities/${DEMO_ORGANIZATION_ID}/${GOLDEN_OPPORTUNITY_ID}/warehouse-scope.pdf`,
    sha256: hash,
    status: "clean",
    kind: "plan",
    revisionLabel: "Rev A",
    uploadedBy: DEMO_ADMIN_EMAIL,
  });
  pushOnce(state.bidDocumentExtractions, {
    id: GOLDEN_EXTRACTION_ID,
    organizationId: DEMO_ORGANIZATION_ID,
    documentVersionId: GOLDEN_DOCUMENT_VERSION_ID,
    status: "ready",
    provider: null,
    model: null,
    pageProgress: 1,
    pageCount: 1,
    error: null,
    createdAt,
    updatedAt: createdAt,
  });
  pushOnce(state.bidDocumentPages, {
    id: GOLDEN_PAGE_ID,
    organizationId: DEMO_ORGANIZATION_ID,
    documentVersionId: GOLDEN_DOCUMENT_VERSION_ID,
    extractionId: GOLDEN_EXTRACTION_ID,
    pageNumber: 1,
    sheetLabel: "A-101",
    machineText: GOLDEN_SCOPE_TEXT,
    correctedText: null,
  });
  pushOnce(state.bidDocumentChunks, {
    id: GOLDEN_CHUNK_ID,
    organizationId: DEMO_ORGANIZATION_ID,
    documentVersionId: GOLDEN_DOCUMENT_VERSION_ID,
    pageId: GOLDEN_PAGE_ID,
    startOffset: 0,
    endOffset: GOLDEN_SCOPE_TEXT.length,
    contentHash: hash,
    text: GOLDEN_SCOPE_TEXT,
    bbox: null,
  });
  pushOnce(state.bidDocumentLinks, {
    id: "24000000-2400-4400-8400-24000000001c",
    organizationId: DEMO_ORGANIZATION_ID,
    documentVersionId: GOLDEN_DOCUMENT_VERSION_ID,
    entityType: "estimate",
    entityId: GOLDEN_ESTIMATE_ID,
    purpose: "estimate-source",
    createdAt,
  });

  if (!hasId(state.estimates, GOLDEN_ESTIMATE_ID)) {
    const first = prepareVersion(GOLDEN_VERSION_1_ID, { area: "2400.0000", bags: "48.0000" }, [], {
      area: "24000000-2400-4400-8400-240000000051",
      bags: "24000000-2400-4400-8400-240000000052",
      areaSource: "24000000-2400-4400-8400-240000000053",
      bagsSource: "24000000-2400-4400-8400-240000000054",
      clause: "24000000-2400-4400-8400-240000000055",
    });
    const second = prepareVersion(GOLDEN_VERSION_2_ID, { area: "2600.0000", bags: "52.0000" }, [1], {
      area: "24000000-2400-4400-8400-240000000061",
      bags: "24000000-2400-4400-8400-240000000062",
      areaSource: "24000000-2400-4400-8400-240000000063",
      bagsSource: "24000000-2400-4400-8400-240000000064",
      clause: "24000000-2400-4400-8400-240000000065",
    });
    const firstRecords = estimateRecords(first, new Date(NOW.getTime() - 2 * DAY));
    const secondRecords = estimateRecords(second, new Date(NOW.getTime() - DAY));
    state.estimates.push({
      id: GOLDEN_ESTIMATE_ID,
      organizationId: DEMO_ORGANIZATION_ID,
      opportunityId: GOLDEN_OPPORTUNITY_ID,
      createdAt,
      updatedAt: NOW,
      number: GOLDEN_ESTIMATE_NUMBER,
      title: GOLDEN_JOB_NAME,
      createdBy: DEMO_ADMIN_EMAIL,
      currentVersionId: second.versionId,
    });
    for (const records of [firstRecords, secondRecords]) {
      state.estimateVersions.push(records.version);
      state.estimateLines.push(...records.lines);
      state.estimateClauses.push(...records.clauses);
      state.estimateLineSources.push(...records.sources);
    }
    state.estimateGraphs.push(first, second);
    const snapshot = buildProposalSnapshot({
      organizationName: "Strong Foam Insulation Inc.",
      companyName: "Riverside Logistics",
      siteName: "Cambridge warehouse",
      estimateNumber: GOLDEN_ESTIMATE_NUMBER,
      estimateTitle: GOLDEN_JOB_NAME,
      version: second,
    });
    const pdf = Buffer.from("%PDF-1.4\n1 0 obj<</Type/Catalog>>endobj\ntrailer<</Root 1 0 R>>\n%%EOF\n");
    state.proposals.push({
      id: GOLDEN_PROPOSAL_ID,
      organizationId: DEMO_ORGANIZATION_ID,
      estimateId: GOLDEN_ESTIMATE_ID,
      estimateVersionId: second.versionId,
      versionNumber: second.versionNumber,
      contentHash: second.contentHash,
      pdfSha256: createHash("sha256").update(pdf).digest("hex"),
      pdfBase64: pdf.toString("base64"),
      tokenHash: createHash("sha256").update("golden-riverside-token").digest("hex"),
      expiresAt: new Date(NOW.getTime() + 30 * DAY),
      createdBy: DEMO_ADMIN_EMAIL,
      createdAt: new Date(NOW.getTime() - DAY),
      snapshot,
    });
    const events: ProposalEvent[] = [
      {
        id: "24000000-2400-4400-8400-240000000031",
        organizationId: DEMO_ORGANIZATION_ID,
        proposalId: GOLDEN_PROPOSAL_ID,
        kind: "generated",
        actorEmail: DEMO_ADMIN_EMAIL,
        recipientName: null,
        recipientEmail: null,
        channel: null,
        externalMessageId: null,
        attestation: null,
        ipAddress: null,
        userAgent: null,
        createdAt: new Date(NOW.getTime() - DAY),
      },
      {
        id: "24000000-2400-4400-8400-240000000032",
        organizationId: DEMO_ORGANIZATION_ID,
        proposalId: GOLDEN_PROPOSAL_ID,
        kind: "delivered",
        actorEmail: DEMO_ADMIN_EMAIL,
        recipientName: FROM_NAME,
        recipientEmail: FROM_EMAIL,
        channel: "recorded",
        externalMessageId: null,
        attestation: null,
        ipAddress: null,
        userAgent: null,
        createdAt: new Date(NOW.getTime() - DAY + 60_000),
      },
      {
        id: "24000000-2400-4400-8400-240000000033",
        organizationId: DEMO_ORGANIZATION_ID,
        proposalId: GOLDEN_PROPOSAL_ID,
        kind: "accepted",
        actorEmail: FROM_EMAIL,
        recipientName: FROM_NAME,
        recipientEmail: FROM_EMAIL,
        channel: "public",
        externalMessageId: null,
        attestation: PROPOSAL_ACCEPTANCE_TERMS,
        ipAddress: null,
        userAgent: null,
        createdAt: NOW,
      },
    ];
    state.proposalEvents.push(...events);
    state.estimateAcceptances.push({
      id: "24000000-2400-4400-8400-240000000034",
      organizationId: DEMO_ORGANIZATION_ID,
      proposalId: GOLDEN_PROPOSAL_ID,
      estimateId: GOLDEN_ESTIMATE_ID,
      estimateVersionId: second.versionId,
      contentHash: second.contentHash,
      recipientName: FROM_NAME,
      recipientEmail: FROM_EMAIL,
      attestation: PROPOSAL_ACCEPTANCE_TERMS,
      ipAddress: null,
      userAgent: null,
      createdAt: NOW,
    });
  }

  if (!hasId(state.aiProposals, GOLDEN_AI_PROPOSAL_ID) && demoAiFixturesEnabled()) {
    const pack = evidencePack();
    const validated = validateBidEstimateProposal(bidDraftFixture(pack), pack);
    if (!validated.ok) throw new Error(validated.error);
    const proposal: AiProposalRecord = {
      id: GOLDEN_AI_PROPOSAL_ID,
      organizationId: DEMO_ORGANIZATION_ID,
      runId: "24000000-2400-4400-8400-240000000035",
      opportunityId: GOLDEN_OPPORTUNITY_ID,
      contentHash: createHash("sha256").update(JSON.stringify(validated.proposal)).digest("hex"),
      output: validated.proposal,
      status: "proposed",
      createdAt: new Date(NOW.getTime() - 2 * DAY),
    };
    state.aiProposals.push(proposal);
  }

  const proposal = goldenInboundProposal();
  if (!findDemoInboundProposal(proposal.organizationId, proposal.dedupeKey)) {
    saveDemoInboundProposal(proposal);
  }
  for (const draft of reviewDrafts()) {
    if (!listDemoReviewDrafts(DEMO_ORGANIZATION_ID).some((item) => item.id === draft.id)) {
      saveDemoReviewDraft(draft);
    }
  }
  seedFieldDrafts();
  void saveSiteGeofence({
    siteId: GOLDEN_SITE_ID,
    organizationId: DEMO_ORGANIZATION_ID,
    latitude: 43.3616,
    longitude: -80.3144,
    radiusMeters: 150,
  });
  const dispatches = dispatchMemory().rows;
  const podium = dispatches.find(
    (row) => row.jobId === DEMO_JOB_ID && row.userId === DEMO_FIELD_USER_ID && row.note === PODIUM_NOTE,
  );
  if (podium) {
    podium.userId = DEMO_ADMIN_USER_ID;
    moved.__strongfoamGoldenPodiumMoved = true;
  }
  if (!dispatches.some((row) => row.id === GOLDEN_DISPATCH_ID)) {
    dispatches.push({
      id: GOLDEN_DISPATCH_ID,
      organizationId: DEMO_ORGANIZATION_ID,
      jobId: GOLDEN_JOB_ID,
      userId: DEMO_FIELD_USER_ID,
      workDate: "2026-09-19",
      status: "scheduled",
      note: "Warehouse roof deck, Cambridge.",
      createdBy: DEMO_ADMIN_EMAIL,
      createdAt: NOW,
      updatedAt: NOW,
    });
  }
  if (!closeoutMemory().rows.some((row) => row.id === GOLDEN_CLOSEOUT_ID)) {
    closeoutMemory().rows.push({
      id: GOLDEN_CLOSEOUT_ID,
      organizationId: DEMO_ORGANIZATION_ID,
      jobId: GOLDEN_JOB_ID,
      status: "preparing",
      note: "Photo log is drafted. This packet is not sent to the customer.",
      packetText: "",
      createdBy: DEMO_ADMIN_EMAIL,
      createdAt: NOW,
      updatedAt: NOW,
    });
  }
  if (!qualityMemory().rows.some((row) => row.id === GOLDEN_QUALITY_ID)) {
    qualityMemory().rows.push({
      id: GOLDEN_QUALITY_ID,
      organizationId: DEMO_ORGANIZATION_ID,
      jobId: GOLDEN_JOB_ID,
      kind: "deficiency",
      name: "East wall conduit",
      nameKey: "east wall conduit",
      status: "open",
      note: "Conduit is in the spray path on the east wall.",
      createdBy: DEMO_ADMIN_EMAIL,
      createdAt: NOW,
      updatedAt: NOW,
    });
  }
  if (!inspectionMemory().rows.some((row) => row.id === GOLDEN_INSPECTION_ID)) {
    inspectionMemory().rows.push({
      id: GOLDEN_INSPECTION_ID,
      organizationId: DEMO_ORGANIZATION_ID,
      jobId: GOLDEN_JOB_ID,
      name: "East wall conduit",
      nameKey: "east wall conduit",
      result: "open",
      note: "Conduit is in the spray path. This note does not sign the inspection.",
      createdBy: DEMO_ADMIN_EMAIL,
      createdAt: NOW,
      updatedAt: NOW,
    });
  }
}

function clearGolden(state: DemoOpsState) {
  const ids = [
    GOLDEN_COMPANY_ID,
    GOLDEN_CONTACT_ID,
    GOLDEN_SITE_ID,
    GOLDEN_LEAD_ID,
    GOLDEN_OPPORTUNITY_ID,
    GOLDEN_PROJECT_ID,
    GOLDEN_JOB_ID,
    GOLDEN_AREA_ID,
    GOLDEN_TASK_ID,
    GOLDEN_ASSIGNMENT_ID,
    "24000000-2400-4400-8400-24000000001b",
    GOLDEN_PHOTO_ID,
    GOLDEN_VOICE_ID,
    GOLDEN_DOCUMENT_ID,
    GOLDEN_DOCUMENT_VERSION_ID,
    GOLDEN_EXTRACTION_ID,
    GOLDEN_PAGE_ID,
    GOLDEN_CHUNK_ID,
    "24000000-2400-4400-8400-24000000001c",
    GOLDEN_ESTIMATE_ID,
    GOLDEN_PROPOSAL_ID,
    "24000000-2400-4400-8400-240000000031",
    "24000000-2400-4400-8400-240000000032",
    "24000000-2400-4400-8400-240000000033",
    "24000000-2400-4400-8400-240000000034",
    GOLDEN_AI_PROPOSAL_ID,
  ];
  const tables: Array<{ id: string }[]> = [
    state.companies,
    state.contacts,
    state.sites,
    state.requests,
    state.opportunities,
    state.projects,
    state.jobsList,
    state.workAreas,
    state.jobTasks,
    state.jobAssignments,
    state.jobEvents,
    state.jobDocuments,
    state.jobVoiceNotes,
    state.bidDocuments,
    state.bidDocumentVersions,
    state.bidDocumentExtractions,
    state.bidDocumentPages,
    state.bidDocumentChunks,
    state.bidDocumentLinks,
    state.estimates,
    state.proposals,
    state.proposalEvents,
    state.estimateAcceptances,
    state.aiProposals,
  ];
  for (const rows of tables) {
    drop(rows, (row) => ids.includes(row.id));
  }
  drop(state.estimateVersions, (row) => row.estimateId === GOLDEN_ESTIMATE_ID);
  drop(state.estimateLines, (row) => row.estimateVersionId === GOLDEN_VERSION_1_ID || row.estimateVersionId === GOLDEN_VERSION_2_ID);
  drop(state.estimateClauses, (row) => row.estimateVersionId === GOLDEN_VERSION_1_ID || row.estimateVersionId === GOLDEN_VERSION_2_ID);
  drop(state.estimateLineSources, (row) => row.chunkId === GOLDEN_CHUNK_ID);
  drop(state.estimateGraphs, (row) => row.estimateId === GOLDEN_ESTIMATE_ID);
  removeDemoInboxIds([inboundDedupeKey(goldenMail()), GOLDEN_FOLLOWUP_ID, GOLDEN_DIGEST_ID, GOLDEN_REPORT_ID]);
  removeFieldDraftsForJob(GOLDEN_JOB_ID);
  void saveSiteGeofence({ siteId: GOLDEN_SITE_ID, clear: true });
  drop(dispatchMemory().rows, (row) => row.id === GOLDEN_DISPATCH_ID);
  drop(closeoutMemory().rows, (row) => row.id === GOLDEN_CLOSEOUT_ID);
  drop(qualityMemory().rows, (row) => row.id === GOLDEN_QUALITY_ID);
  drop(inspectionMemory().rows, (row) => row.id === GOLDEN_INSPECTION_ID);
  if (moved.__strongfoamGoldenPodiumMoved) {
    const podium = dispatchMemory().rows.find((row) => row.jobId === DEMO_JOB_ID && row.note === PODIUM_NOTE);
    if (podium) podium.userId = DEMO_FIELD_USER_ID;
    moved.__strongfoamGoldenPodiumMoved = false;
  }
}

export function syncGoldenDemo(state: DemoOpsState): void {
  let database: unknown = null;
  try {
    database = readWorkerDatabase();
  } catch {
    database = { remote: true };
  }
  if (!goldenDemoEnabled(process.env, process.argv, database)) {
    if (state.jobsList.some((job) => job.id === GOLDEN_JOB_ID) || moved.__strongfoamGoldenPodiumMoved) {
      clearGolden(state);
    }
    return;
  }
  applyRecords(state);
}

export function goldenEvidenceForJob() {
  return buildJobEvidencePack({
    job: { id: GOLDEN_JOB_ID, name: GOLDEN_JOB_NAME, status: "in_progress" },
    tasks: [
      {
        id: GOLDEN_TASK_ID,
        title: "Spray the roof deck",
        status: "open",
        dueAt: null,
        plannedEndAt: null,
        createdAt: NOW,
      },
    ],
    fieldNotes: [],
    voiceNotes: [],
    planMarks: [],
    events: [],
    now: NOW,
  });
}

export const GOLDEN_PATH_URLS = {
  inbound: "/app/requests/inbound",
  lead: `/app/requests/${GOLDEN_LEAD_ID}`,
  opportunity: `/app/opportunities/${GOLDEN_OPPORTUNITY_ID}`,
  estimate: `/app/opportunities/${GOLDEN_OPPORTUNITY_ID}/estimates/${GOLDEN_ESTIMATE_ID}`,
  diff: `/app/opportunities/${GOLDEN_OPPORTUNITY_ID}/estimates/${GOLDEN_ESTIMATE_ID}?version=2&compare=1`,
  project: `/app/projects/${GOLDEN_PROJECT_ID}`,
  schedule: "/app/projects/schedule",
  job: `/app/jobs/${GOLDEN_JOB_ID}`,
  field: "/field",
  fieldJob: `/field/jobs/${GOLDEN_JOB_ID}`,
  photoReport: `/field/jobs/${GOLDEN_JOB_ID}/photos/report`,
  automation: "/app/automation",
  home: "/app",
} as const;
