import { sql } from "drizzle-orm";
import {
  check,
  boolean,
  date,
  foreignKey,
  index,
  doublePrecision,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  unique,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

export const leads = pgTable("leads", {
  id: uuid("id").defaultRandom().primaryKey(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
  status: text("status").notNull(),
  bookingStatus: text("booking_status").notNull(),
  notifyStatus: text("notify_status").notNull(),
  workflowStatus: text("workflow_status").notNull().default("new"),
  assignedTo: text("assigned_to"),
  nextAction: text("next_action"),
  nextActionDueAt: timestamp("next_action_due_at", { withTimezone: true }),
  lostReason: text("lost_reason"),
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
  companyId: uuid("company_id"),
  contactId: uuid("contact_id"),
  siteId: uuid("site_id"),
  opportunityId: uuid("opportunity_id"),
});

export const companies = pgTable("companies", {
  id: uuid("id").defaultRandom().primaryKey(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
  name: text("name").notNull(),
  email: text("email"),
  phone: text("phone"),
  city: text("city"),
  province: text("province"),
});

export const contacts = pgTable("contacts", {
  id: uuid("id").defaultRandom().primaryKey(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
  companyId: uuid("company_id").references(() => companies.id),
  firstName: text("first_name").notNull(),
  lastName: text("last_name").notNull(),
  email: text("email").notNull(),
  phone: text("phone").notNull(),
  role: text("role"),
});

export const sites = pgTable("sites", {
  id: uuid("id").defaultRandom().primaryKey(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
  companyId: uuid("company_id").references(() => companies.id),
  name: text("name").notNull(),
  city: text("city").notNull(),
  province: text("province").notNull(),
});

export const opportunities = pgTable("opportunities", {
  id: uuid("id").defaultRandom().primaryKey(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
  companyId: uuid("company_id").references(() => companies.id),
  contactId: uuid("contact_id").references(() => contacts.id),
  siteId: uuid("site_id").references(() => sites.id),
  sourceLeadId: uuid("source_lead_id").references(() => leads.id),
  name: text("name").notNull(),
  stage: text("stage").notNull().default("qualification"),
  owner: text("owner"),
  source: text("source"),
  services: text("services").array().notNull(),
  projectType: text("project_type"),
  projectId: uuid("project_id"),
});

export const organizations = pgTable("organizations", {
  id: uuid("id").defaultRandom().primaryKey(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
  name: text("name").notNull(),
  slug: text("slug").notNull().unique(),
});

export const users = pgTable("users", {
  id: uuid("id").defaultRandom().primaryKey(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
  email: text("email").notNull().unique(),
  displayName: text("display_name").notNull(),
  passwordHash: text("password_hash").notNull(),
  active: boolean("active").notNull().default(true),
  sessionVersion: integer("session_version").notNull().default(1),
  createdBy: text("created_by").notNull(),
});

export const memberships = pgTable(
  "memberships",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    role: text("role").notNull(),
    active: boolean("active").notNull().default(true),
  },
  (table) => [
    unique("memberships_organization_user_unique").on(
      table.organizationId,
      table.userId,
    ),
    check(
      "memberships_role_valid",
      sql`${table.role} IN ('administrator', 'office', 'field_lead', 'field_worker')`,
    ),
    index("memberships_user_idx").on(table.userId),
  ],
);

export const userEvents = pgTable(
  "user_events",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id),
    actor: text("actor").notNull(),
    kind: text("kind").notNull(),
    summary: text("summary").notNull(),
    payload: jsonb("payload").notNull().default(sql`'{}'::jsonb`),
  },
  (table) => [
    index("user_events_user_created_idx").on(table.userId, table.createdAt),
  ],
);

export const scheduleCalendars = pgTable(
  "schedule_calendars",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedBy: text("updated_by").notNull(),
    name: text("name").notNull(),
    timeZone: text("time_zone").notNull(),
    weekendDays: integer("weekend_days")
      .array()
      .notNull()
      .default(sql`'{0,6}'::integer[]`),
    isDefault: boolean("is_default").notNull().default(false),
  },
  (table) => [
    uniqueIndex("schedule_calendars_single_default_idx")
      .on(table.isDefault)
      .where(sql`${table.isDefault}`),
  ],
);

export const scheduleCalendarExceptions = pgTable(
  "schedule_calendar_exceptions",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedBy: text("updated_by").notNull(),
    calendarId: uuid("calendar_id")
      .notNull()
      .references(() => scheduleCalendars.id, { onDelete: "cascade" }),
    date: date("date", { mode: "string" }).notNull(),
    name: text("name").notNull(),
    isWorkingDay: boolean("is_working_day").notNull().default(false),
  },
  (table) => [
    unique("schedule_calendar_exceptions_calendar_date_unique").on(
      table.calendarId,
      table.date,
    ),
    index("schedule_calendar_exceptions_calendar_idx").on(table.calendarId),
  ],
);

export const projects = pgTable("projects", {
  id: uuid("id").defaultRandom().primaryKey(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
  companyId: uuid("company_id").references(() => companies.id),
  siteId: uuid("site_id").references(() => sites.id),
  opportunityId: uuid("opportunity_id").references(() => opportunities.id),
  sourceLeadId: uuid("source_lead_id").references(() => leads.id),
  name: text("name").notNull(),
  status: text("status").notNull().default("active"),
  projectManager: text("project_manager"),
  scheduleCalendarId: uuid("schedule_calendar_id").references(
    () => scheduleCalendars.id,
  ),
});

export const jobs = pgTable("jobs", {
  id: uuid("id").defaultRandom().primaryKey(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
  projectId: uuid("project_id").references(() => projects.id),
  companyId: uuid("company_id").references(() => companies.id),
  siteId: uuid("site_id").references(() => sites.id),
  opportunityId: uuid("opportunity_id").references(() => opportunities.id),
  name: text("name").notNull(),
  status: text("status").notNull().default("draft"),
  scope: text("scope"),
  services: text("services").array().notNull(),
  projectManager: text("project_manager"),
  foreman: text("foreman"),
  plannedStartAt: timestamp("planned_start_at", { withTimezone: true }),
  plannedEndAt: timestamp("planned_end_at", { withTimezone: true }),
  blockerNote: text("blocker_note"),
});

export const jobEvents = pgTable("job_events", {
  id: uuid("id").defaultRandom().primaryKey(),
  jobId: uuid("job_id")
    .notNull()
    .references(() => jobs.id),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
  actor: text("actor").notNull(),
  kind: text("kind").notNull(),
  summary: text("summary").notNull(),
  payload: jsonb("payload").notNull(),
});

export const jobAssignments = pgTable(
  "job_assignments",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    jobId: uuid("job_id")
      .notNull()
      .references(() => jobs.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id),
    role: text("role").notNull(),
    createdBy: text("created_by").notNull(),
  },
  (table) => [
    unique("job_assignments_job_user_unique").on(table.jobId, table.userId),
    check(
      "job_assignments_role_valid",
      sql`${table.role} IN ('foreman', 'technician')`,
    ),
    index("job_assignments_user_idx").on(table.userId),
    index("job_assignments_job_idx").on(table.jobId),
  ],
);

export const workAreas = pgTable(
  "work_areas",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    jobId: uuid("job_id")
      .notNull()
      .references(() => jobs.id),
    name: text("name").notNull(),
    kind: text("kind").notNull().default("area"),
    notes: text("notes"),
    sortOrder: integer("sort_order").notNull().default(0),
  },
  (table) => [
    unique("work_areas_id_job_id_unique").on(table.id, table.jobId),
  ],
);

export const jobTasks = pgTable(
  "job_tasks",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    jobId: uuid("job_id")
      .notNull()
      .references(() => jobs.id),
    workAreaId: uuid("work_area_id"),
    title: text("title").notNull(),
    assignee: text("assignee"),
    assigneeUserId: uuid("assignee_user_id").references(() => users.id),
    dueAt: timestamp("due_at", { withTimezone: true }),
    plannedStartAt: timestamp("planned_start_at", { withTimezone: true }),
    plannedEndAt: timestamp("planned_end_at", { withTimezone: true }),
    completedAt: timestamp("completed_at", { withTimezone: true }),
    status: text("status").notNull().default("open"),
    createdBy: text("created_by").notNull(),
  },
  (table) => [
    foreignKey({
      columns: [table.workAreaId, table.jobId],
      foreignColumns: [workAreas.id, workAreas.jobId],
      name: "job_tasks_work_area_job_fk",
    }),
    check(
      "job_tasks_planned_date_order",
      sql`${table.plannedStartAt} IS NULL
        OR ${table.plannedEndAt} IS NULL
        OR ${table.plannedEndAt} >= ${table.plannedStartAt}`,
    ),
    index("job_tasks_job_schedule_idx").on(
      table.jobId,
      table.plannedStartAt,
      table.plannedEndAt,
    ),
  ],
);

export const jobTaskDependencies = pgTable(
  "job_task_dependencies",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    projectId: uuid("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    predecessorTaskId: uuid("predecessor_task_id")
      .notNull()
      .references(() => jobTasks.id, { onDelete: "cascade" }),
    successorTaskId: uuid("successor_task_id")
      .notNull()
      .references(() => jobTasks.id, { onDelete: "cascade" }),
    lagDays: integer("lag_days").notNull().default(0),
    createdBy: text("created_by").notNull(),
  },
  (table) => [
    unique("job_task_dependencies_unique").on(
      table.predecessorTaskId,
      table.successorTaskId,
    ),
    check(
      "job_task_dependencies_no_self",
      sql`${table.predecessorTaskId} <> ${table.successorTaskId}`,
    ),
    check(
      "job_task_dependencies_lag_nonnegative",
      sql`${table.lagDays} >= 0`,
    ),
    index("job_task_dependencies_project_idx").on(table.projectId),
    index("job_task_dependencies_successor_idx").on(table.successorTaskId),
  ],
);

export const projectScheduleBaselines = pgTable(
  "project_schedule_baselines",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    projectId: uuid("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    capturedAt: timestamp("captured_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    capturedBy: text("captured_by").notNull(),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
    deletedBy: text("deleted_by"),
  },
  (table) => [
    index("project_schedule_baselines_project_idx").on(table.projectId),
  ],
);

export const projectScheduleBaselineItems = pgTable(
  "project_schedule_baseline_items",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    baselineId: uuid("baseline_id")
      .notNull()
      .references(() => projectScheduleBaselines.id, { onDelete: "cascade" }),
    entityType: text("entity_type").notNull(),
    entityId: uuid("entity_id").notNull(),
    plannedStartAt: timestamp("planned_start_at", { withTimezone: true }),
    plannedEndAt: timestamp("planned_end_at", { withTimezone: true }),
    dueAt: timestamp("due_at", { withTimezone: true }),
  },
  (table) => [
    check(
      "project_schedule_baseline_items_entity_type",
      sql`${table.entityType} IN ('job', 'task')`,
    ),
    unique("project_schedule_baseline_items_entity_unique").on(
      table.baselineId,
      table.entityType,
      table.entityId,
    ),
    index("project_schedule_baseline_items_baseline_idx").on(table.baselineId),
  ],
);

export const jobDocuments = pgTable(
  "job_documents",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    jobId: uuid("job_id")
      .notNull()
      .references(() => jobs.id),
    workAreaId: uuid("work_area_id"),
    filename: text("filename").notNull(),
    contentType: text("content_type").notNull(),
    sizeBytes: integer("size_bytes").notNull(),
    pathname: text("pathname").notNull().unique(),
    storage: text("storage").notNull().default("blob"),
    kind: text("kind").notNull().default("plan"),
    uploadedBy: text("uploaded_by").notNull(),
    sheetKey: text("sheet_key").notNull().default(""),
    versionNumber: integer("version_number").notNull().default(1),
    replacesDocumentId: uuid("replaces_document_id"),
    supersededAt: timestamp("superseded_at", { withTimezone: true }),
  },
  (table) => [
    foreignKey({
      columns: [table.workAreaId, table.jobId],
      foreignColumns: [workAreas.id, workAreas.jobId],
      name: "job_documents_work_area_job_fk",
    }),
    foreignKey({
      columns: [table.replacesDocumentId],
      foreignColumns: [table.id],
      name: "job_documents_replaces_document_fk",
    }).onDelete("set null"),
    index("job_documents_job_current_plan_idx").on(
      table.jobId,
      table.kind,
      table.supersededAt,
    ),
    uniqueIndex("job_documents_sheet_current_unique")
      .on(table.sheetKey)
      .where(
        sql`${table.kind} = 'plan' AND ${table.supersededAt} IS NULL AND ${table.sheetKey} <> ''`,
      ),
  ],
);

export const jobPlanAnnotations = pgTable(
  "job_plan_annotations",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    jobId: uuid("job_id")
      .notNull()
      .references(() => jobs.id),
    documentId: uuid("document_id")
      .notNull()
      .references(() => jobDocuments.id),
    pageNumber: integer("page_number").notNull().default(1),
    x: doublePrecision("x").notNull(),
    y: doublePrecision("y").notNull(),
    kind: text("kind").notNull().default("pin"),
    geometry: jsonb("geometry")
      .$type<Record<string, unknown>>()
      .notNull()
      .default(sql`'{"type":"pin"}'::jsonb`),
    status: text("status").notNull().default("planned"),
    trade: text("trade"),
    title: text("title").notNull(),
    body: text("body"),
    workAreaId: uuid("work_area_id"),
    taskId: uuid("task_id").references(() => jobTasks.id),
    createdBy: text("created_by").notNull(),
    completedAt: timestamp("completed_at", { withTimezone: true }),
    completedBy: text("completed_by"),
    voidedAt: timestamp("voided_at", { withTimezone: true }),
    voidedBy: text("voided_by"),
  },
  (table) => [
    foreignKey({
      columns: [table.workAreaId, table.jobId],
      foreignColumns: [workAreas.id, workAreas.jobId],
      name: "job_plan_annotations_work_area_job_fk",
    }),
    check("job_plan_annotations_page_positive", sql`${table.pageNumber} >= 1`),
    check(
      "job_plan_annotations_x_normalized",
      sql`${table.x} >= 0 AND ${table.x} <= 1`,
    ),
    check(
      "job_plan_annotations_y_normalized",
      sql`${table.y} >= 0 AND ${table.y} <= 1`,
    ),
    check(
      "job_plan_annotations_kind_valid",
      sql`${table.kind} IN ('pin', 'circle', 'ellipse', 'polygon', 'arrow', 'text')`,
    ),
    check(
      "job_plan_annotations_trade_valid",
      sql`${table.trade} IS NULL OR ${table.trade} IN ('spray_foam', 'fireproofing', 'intumescent', 'avb', 'drywall', 'flooring', 'general')`,
    ),
    check(
      "job_plan_annotations_status_valid",
      sql`${table.status} IN ('planned', 'in_progress', 'completed', 'blocked', 'deficiency')`,
    ),
    index("job_plan_annotations_job_document_idx").on(
      table.jobId,
      table.documentId,
    ),
  ],
);

export const jobFieldNotes = pgTable(
  "job_field_notes",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    jobId: uuid("job_id")
      .notNull()
      .references(() => jobs.id),
    workAreaId: uuid("work_area_id"),
    taskId: uuid("task_id").references(() => jobTasks.id),
    annotationId: uuid("annotation_id").references(
      () => jobPlanAnnotations.id,
      { onDelete: "set null" },
    ),
    kind: text("kind").notNull().default("note"),
    body: text("body").notNull(),
    quantity: integer("quantity"),
    unit: text("unit"),
    createdBy: text("created_by").notNull(),
  },
  (table) => [
    foreignKey({
      columns: [table.workAreaId, table.jobId],
      foreignColumns: [workAreas.id, workAreas.jobId],
      name: "job_field_notes_work_area_job_fk",
    }),
  ],
);

export const jobVoiceNotes = pgTable(
  "job_voice_notes",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    jobId: uuid("job_id")
      .notNull()
      .references(() => jobs.id),
    workAreaId: uuid("work_area_id"),
    taskId: uuid("task_id").references(() => jobTasks.id),
    annotationId: uuid("annotation_id").references(() => jobPlanAnnotations.id, {
      onDelete: "set null",
    }),
    documentId: uuid("document_id").references(() => jobDocuments.id, {
      onDelete: "set null",
    }),
    source: text("source").notNull().default("job"),
    filename: text("filename").notNull(),
    contentType: text("content_type").notNull(),
    sizeBytes: integer("size_bytes").notNull(),
    pathname: text("pathname").notNull().unique(),
    storage: text("storage").notNull().default("blob"),
    durationSeconds: integer("duration_seconds"),
    language: text("language").notNull().default("en"),
    provider: text("provider"),
    model: text("model"),
    status: text("status").notNull().default("queued"),
    machineTranscript: text("machine_transcript"),
    transcript: text("transcript"),
    confidence: doublePrecision("confidence"),
    queuedAt: timestamp("queued_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    processingStartedAt: timestamp("processing_started_at", {
      withTimezone: true,
    }),
    completedAt: timestamp("completed_at", { withTimezone: true }),
    failedAt: timestamp("failed_at", { withTimezone: true }),
    error: text("error"),
    consentAt: timestamp("consent_at", { withTimezone: true }).notNull(),
    createdBy: text("created_by").notNull(),
  },
  (table) => [
    foreignKey({
      columns: [table.workAreaId, table.jobId],
      foreignColumns: [workAreas.id, workAreas.jobId],
      name: "job_voice_notes_work_area_job_fk",
    }),
    check(
      "job_voice_notes_source_valid",
      sql`${table.source} IN ('job', 'task', 'annotation', 'document', 'daily_report')`,
    ),
    check(
      "job_voice_notes_status_valid",
      sql`${table.status} IN ('uploading', 'queued', 'processing', 'completed', 'failed')`,
    ),
    check("job_voice_notes_size_positive", sql`${table.sizeBytes} > 0`),
    index("job_voice_notes_job_created_idx").on(table.jobId, table.createdAt),
  ],
);

export const estimateRequestTasks = pgTable("estimate_request_tasks", {
  id: uuid("id").defaultRandom().primaryKey(),
  leadId: uuid("lead_id")
    .notNull()
    .references(() => leads.id),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
  title: text("title").notNull(),
  assignee: text("assignee"),
  dueAt: timestamp("due_at", { withTimezone: true }),
  status: text("status").notNull().default("open"),
  createdBy: text("created_by").notNull(),
});

export const estimateRequestComments = pgTable("estimate_request_comments", {
  id: uuid("id").defaultRandom().primaryKey(),
  leadId: uuid("lead_id")
    .notNull()
    .references(() => leads.id),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
  actor: text("actor").notNull(),
  body: text("body").notNull(),
});

export const estimateRequestEvents = pgTable("estimate_request_events", {
  id: uuid("id").defaultRandom().primaryKey(),
  leadId: uuid("lead_id")
    .notNull()
    .references(() => leads.id),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
  actor: text("actor").notNull(),
  kind: text("kind").notNull(),
  summary: text("summary").notNull(),
  payload: jsonb("payload").notNull(),
});

export const calendlyUnmatchedEvents = pgTable(
  "calendly_unmatched_events",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    receivedAt: timestamp("received_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    payload: jsonb("payload").notNull(),
  },
);
