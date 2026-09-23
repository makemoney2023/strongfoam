import { sql } from "drizzle-orm";
import {
  check,
  boolean,
  customType,
  date,
  foreignKey,
  index,
  doublePrecision,
  integer,
  jsonb,
  numeric,
  pgSchema,
  pgTable,
  text,
  timestamp,
  unique,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

export const leads = pgTable(
  "leads",
  {
  id: uuid("id").defaultRandom().primaryKey(),
  organizationId: uuid("organization_id")
    .notNull()
    .references(() => organizations.id),
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
  },
  (table) => [index("leads_organization_idx").on(table.organizationId)],
);

export const companies = pgTable(
  "companies",
  {
  id: uuid("id").defaultRandom().primaryKey(),
  organizationId: uuid("organization_id")
    .notNull()
    .references(() => organizations.id),
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
  },
  (table) => [index("companies_organization_idx").on(table.organizationId)],
);

export const contacts = pgTable(
  "contacts",
  {
  id: uuid("id").defaultRandom().primaryKey(),
  organizationId: uuid("organization_id")
    .notNull()
    .references(() => organizations.id),
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
  },
  (table) => [index("contacts_organization_idx").on(table.organizationId)],
);

export const sites = pgTable(
  "sites",
  {
  id: uuid("id").defaultRandom().primaryKey(),
  organizationId: uuid("organization_id")
    .notNull()
    .references(() => organizations.id),
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
  addressLine: text("address_line"),
  postalCode: text("postal_code"),
  },
  (table) => [index("sites_organization_idx").on(table.organizationId)],
);

export const opportunities = pgTable(
  "opportunities",
  {
  id: uuid("id").defaultRandom().primaryKey(),
  organizationId: uuid("organization_id")
    .notNull()
    .references(() => organizations.id),
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
  },
  (table) => [
    index("opportunities_organization_idx").on(table.organizationId),
  ],
);

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

export const projects = pgTable(
  "projects",
  {
  id: uuid("id").defaultRandom().primaryKey(),
  organizationId: uuid("organization_id")
    .notNull()
    .references(() => organizations.id),
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
  },
  (table) => [index("projects_organization_idx").on(table.organizationId)],
);

export const jobs = pgTable(
  "jobs",
  {
  id: uuid("id").defaultRandom().primaryKey(),
  organizationId: uuid("organization_id")
    .notNull()
    .references(() => organizations.id),
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
  },
  (table) => [index("jobs_organization_idx").on(table.organizationId)],
);

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

export const dispatches = pgTable(
  "dispatches",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id),
    jobId: uuid("job_id")
      .notNull()
      .references(() => jobs.id),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id),
    workDate: date("work_date", { mode: "string" }).notNull(),
    status: text("status").notNull(),
    note: text("note").notNull().default(""),
    createdBy: text("created_by").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    unique("dispatches_slot_unique").on(
      table.organizationId,
      table.jobId,
      table.userId,
      table.workDate,
    ),
    check(
      "dispatches_status_valid",
      sql`${table.status} IN ('scheduled', 'cancelled')`,
    ),
    index("dispatches_day_idx").on(table.organizationId, table.workDate),
  ],
);

export const laborEntries = pgTable(
  "labor_entries",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id),
    jobId: uuid("job_id")
      .notNull()
      .references(() => jobs.id),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id),
    workDate: date("work_date", { mode: "string" }).notNull(),
    kind: text("kind").notNull(),
    minutes: integer("minutes"),
    quantity: integer("quantity"),
    unit: text("unit").notNull().default(""),
    note: text("note").notNull().default(""),
    createdBy: text("created_by").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    unique("labor_entries_slot_unique").on(
      table.organizationId,
      table.jobId,
      table.userId,
      table.workDate,
      table.kind,
      table.unit,
    ),
    check(
      "labor_entries_kind_valid",
      sql`${table.kind} IN ('hourly', 'piece')`,
    ),
    check(
      "labor_entries_measure_valid",
      sql`(
        ${table.kind} = 'hourly'
        AND ${table.minutes} > 0
        AND ${table.minutes} <= 1440
        AND ${table.quantity} IS NULL
        AND ${table.unit} = ''
      ) OR (
        ${table.kind} = 'piece'
        AND ${table.quantity} > 0
        AND ${table.minutes} IS NULL
        AND ${table.unit} IN ('bags', 'sq_ft')
      )`,
    ),
    index("labor_entries_day_idx").on(table.organizationId, table.workDate),
  ],
);

export const productionEntries = pgTable(
  "production_entries",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id),
    jobId: uuid("job_id")
      .notNull()
      .references(() => jobs.id),
    workDate: date("work_date", { mode: "string" }).notNull(),
    taskId: uuid("task_id").references(() => jobTasks.id),
    workAreaId: uuid("work_area_id").references(() => workAreas.id),
    trade: text("trade").notNull(),
    workType: text("work_type").notNull(),
    unit: text("unit").notNull(),
    quantity: integer("quantity").notNull(),
    attributionMode: text("attribution_mode").notNull(),
    status: text("status").notNull(),
    recordedBy: text("recorded_by").notNull(),
    verifiedBy: text("verified_by"),
    verifiedAt: timestamp("verified_at", { withTimezone: true }),
    sourceType: text("source_type"),
    sourceId: uuid("source_id"),
    version: integer("version").notNull().default(1),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    check(
      "production_entries_unit_valid",
      sql`${table.unit} IN ('bags', 'sq_ft')`,
    ),
    check(
      "production_entries_quantity_valid",
      sql`${table.quantity} > 0 AND ${table.quantity} <= 1000000`,
    ),
    check(
      "production_entries_mode_valid",
      sql`${table.attributionMode} IN ('crew', 'individual')`,
    ),
    check(
      "production_entries_status_valid",
      sql`${table.status} IN ('draft', 'verified', 'void')`,
    ),
    index("production_entries_day_idx").on(table.organizationId, table.workDate),
  ],
);

export const productionParticipants = pgTable(
  "production_participants",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    productionEntryId: uuid("production_entry_id")
      .notNull()
      .references(() => productionEntries.id),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id),
    laborEntryId: uuid("labor_entry_id").references(() => laborEntries.id),
  },
  (table) => [
    unique("production_participants_entry_user_unique").on(
      table.productionEntryId,
      table.userId,
    ),
    uniqueIndex("production_participants_labor_unique")
      .on(table.laborEntryId)
      .where(sql`${table.laborEntryId} IS NOT NULL`),
  ],
);

export const productionAllocations = pgTable(
  "production_allocations",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    productionEntryId: uuid("production_entry_id")
      .notNull()
      .references(() => productionEntries.id),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id),
    quantity: integer("quantity").notNull(),
  },
  (table) => [
    unique("production_allocations_entry_user_unique").on(
      table.productionEntryId,
      table.userId,
    ),
    check(
      "production_allocations_quantity_valid",
      sql`${table.quantity} > 0 AND ${table.quantity} <= 1000000`,
    ),
  ],
);

export const productionTargets = pgTable(
  "production_targets",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id),
    trade: text("trade").notNull(),
    workType: text("work_type").notNull(),
    unit: text("unit").notNull(),
    basis: text("basis").notNull(),
    rateMilli: integer("rate_milli").notNull(),
    effectiveFrom: date("effective_from", { mode: "string" }).notNull(),
    effectiveTo: date("effective_to", { mode: "string" }),
    approvedBy: text("approved_by").notNull(),
    approvedAt: timestamp("approved_at", { withTimezone: true }).notNull(),
  },
  (table) => [
    check(
      "production_targets_unit_valid",
      sql`${table.unit} IN ('bags', 'sq_ft')`,
    ),
    check(
      "production_targets_basis_valid",
      sql`${table.basis} IN ('crew_hour', 'person_hour')`,
    ),
    check("production_targets_rate_positive", sql`${table.rateMilli} > 0`),
    index("production_targets_class_idx").on(
      table.organizationId,
      table.trade,
      table.workType,
      table.unit,
      table.basis,
    ),
    uniqueIndex("production_targets_one_open")
      .on(table.organizationId, table.trade, table.workType, table.unit, table.basis)
      .where(sql`${table.effectiveTo} IS NULL`),
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
    statedQuantity: integer("stated_quantity"),
    statedUnit: text("stated_unit"),
    createdBy: text("created_by").notNull(),
  },
  (table) => [
    foreignKey({
      columns: [table.workAreaId, table.jobId],
      foreignColumns: [workAreas.id, workAreas.jobId],
      name: "job_tasks_work_area_job_fk",
    }),
    check(
      "job_tasks_stated_quantity_valid",
      sql`(
        ${table.statedQuantity} IS NULL
        AND ${table.statedUnit} IS NULL
      ) OR (
        ${table.statedQuantity} > 0
        AND ${table.statedQuantity} <= 1000000
        AND ${table.statedUnit} IN ('bags', 'sq_ft')
      )`,
    ),
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
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id),
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
    index("job_documents_organization_idx").on(table.organizationId),
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

export const purchaseOrders = pgTable(
  "purchase_orders",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id),
    jobId: uuid("job_id")
      .notNull()
      .references(() => jobs.id),
    supplier: text("supplier").notNull(),
    note: text("note").notNull().default(""),
    status: text("status").notNull(),
    createdBy: text("created_by").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    check(
      "purchase_orders_status_valid",
      sql`${table.status} IN ('draft', 'ordered', 'cancelled')`,
    ),
    index("purchase_orders_job_idx").on(table.organizationId, table.jobId),
    index("purchase_orders_draft_idx")
      .on(table.organizationId, table.jobId)
      .where(sql`${table.status} = 'draft'`),
  ],
);

export const purchaseOrderLines = pgTable(
  "purchase_order_lines",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id),
    purchaseOrderId: uuid("purchase_order_id")
      .notNull()
      .references(() => purchaseOrders.id),
    materialRequestId: uuid("material_request_id")
      .notNull()
      .references(() => jobFieldNotes.id),
    activeMaterialRequestId: uuid("active_material_request_id"),
    description: text("description").notNull(),
    quantity: integer("quantity"),
    unit: text("unit").notNull().default(""),
    position: integer("position").notNull(),
  },
  (table) => [
    unique("purchase_order_lines_order_request_unique").on(
      table.purchaseOrderId,
      table.materialRequestId,
    ),
    uniqueIndex("purchase_order_lines_active_request_idx")
      .on(table.organizationId, table.activeMaterialRequestId)
      .where(sql`${table.activeMaterialRequestId} IS NOT NULL`),
    check(
      "purchase_order_lines_claim_valid",
      sql`${table.activeMaterialRequestId} IS NULL OR ${table.activeMaterialRequestId} = ${table.materialRequestId}`,
    ),
    check(
      "purchase_order_lines_unit_valid",
      sql`${table.unit} IN ('', 'board_feet', 'sq_ft', 'linear_ft', 'bags', 'hours')`,
    ),
    check(
      "purchase_order_lines_measure_valid",
      sql`(
        ${table.quantity} IS NULL AND ${table.unit} = ''
      ) OR (
        ${table.quantity} > 0
        AND ${table.quantity} <= 1000000
        AND ${table.unit} IN ('board_feet', 'sq_ft', 'linear_ft', 'bags', 'hours')
      )`,
    ),
    index("purchase_order_lines_order_idx").on(table.purchaseOrderId),
    index("purchase_order_lines_request_idx").on(table.materialRequestId),
  ],
);

export const equipmentAssignments = pgTable(
  "equipment_assignments",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id),
    jobId: uuid("job_id")
      .notNull()
      .references(() => jobs.id),
    name: text("name").notNull(),
    nameKey: text("name_key").notNull(),
    note: text("note").notNull().default(""),
    status: text("status").notNull(),
    createdBy: text("created_by").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    unique("equipment_assignments_slot_unique").on(
      table.organizationId,
      table.jobId,
      table.nameKey,
    ),
    check(
      "equipment_assignments_status_valid",
      sql`${table.status} IN ('assigned', 'released')`,
    ),
    check(
      "equipment_assignments_name_valid",
      sql`char_length(${table.name}) BETWEEN 1 AND 80 AND ${table.nameKey} = lower(${table.name}) AND char_length(${table.note}) <= 500`,
    ),
    index("equipment_assignments_job_idx").on(table.organizationId, table.jobId),
    index("equipment_assignments_active_idx")
      .on(table.organizationId, table.nameKey)
      .where(sql`${table.status} = 'assigned'`),
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

export const priceBookItems = pgTable(
  "price_book_items",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    trade: text("trade").notNull(),
    name: text("name").notNull(),
    unit: text("unit").notNull(),
    unitPriceCents: integer("unit_price_cents").notNull(),
    itemCode: text("item_code"),
    itemKind: text("item_kind"),
    supplier: text("supplier"),
    unitCostCents: integer("unit_cost_cents"),
    active: boolean("active").notNull().default(true),
    createdBy: text("created_by").notNull(),
    currentApprovedVersionId: uuid("current_approved_version_id"),
  },
  (table) => [
    check(
      "price_book_items_trade_valid",
      sql`${table.trade} IN ('spray-foam', 'fireproofing', 'intumescent', 'avb', 'spf-roofing')`,
    ),
    check(
      "price_book_items_unit_valid",
      sql`${table.unit} IN ('bags', 'sq_ft', 'hour', 'each')`,
    ),
    check(
      "price_book_items_price_valid",
      sql`${table.unitPriceCents} >= 0 AND ${table.unitPriceCents} <= 100000000`,
    ),
    check(
      "price_book_items_kind_valid",
      sql`${table.itemKind} IS NULL OR ${table.itemKind} IN ('material', 'labour', 'equipment')`,
    ),
    check(
      "price_book_items_cost_valid",
      sql`${table.unitCostCents} IS NULL OR (${table.unitCostCents} >= 0 AND ${table.unitCostCents} <= 100000000)`,
    ),
    uniqueIndex("price_book_items_org_item_code_unique")
      .on(table.organizationId, table.itemCode)
      .where(sql`${table.itemCode} IS NOT NULL`),
    index("price_book_items_organization_idx").on(table.organizationId),
    index("price_book_items_trade_name_idx").on(table.trade, table.name),
  ],
);

export const priceBookItemVersions = pgTable(
  "price_book_item_versions",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id),
    itemId: uuid("item_id")
      .notNull()
      .references(() => priceBookItems.id),
    versionNumber: integer("version_number").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    trade: text("trade").notNull(),
    description: text("description").notNull(),
    unit: text("unit").notNull(),
    unitPriceCents: integer("unit_price_cents").notNull(),
    unitCostCents: integer("unit_cost_cents"),
    status: text("status").notNull().default("draft"),
    effectiveAt: timestamp("effective_at", { withTimezone: true }),
    createdBy: text("created_by").notNull(),
    approvedBy: text("approved_by"),
    approvedAt: timestamp("approved_at", { withTimezone: true }),
    contentHash: text("content_hash").notNull(),
  },
  (table) => [
    unique("price_book_item_versions_item_version_unique").on(
      table.itemId,
      table.versionNumber,
    ),
    check(
      "price_book_item_versions_status_valid",
      sql`${table.status} IN ('draft', 'approved')`,
    ),
    check(
      "price_book_item_versions_trade_valid",
      sql`${table.trade} IN ('spray-foam', 'fireproofing', 'intumescent', 'avb', 'spf-roofing')`,
    ),
    check(
      "price_book_item_versions_unit_valid",
      sql`${table.unit} IN ('bags', 'sq_ft', 'hour', 'each')`,
    ),
    check(
      "price_book_item_versions_price_valid",
      sql`${table.unitPriceCents} >= 0 AND ${table.unitPriceCents} <= 100000000`,
    ),
    check(
      "price_book_item_versions_cost_valid",
      sql`${table.unitCostCents} IS NULL OR (${table.unitCostCents} >= 0 AND ${table.unitCostCents} <= 100000000)`,
    ),
    index("price_book_item_versions_item_idx").on(
      table.organizationId,
      table.itemId,
    ),
  ],
);

export type PriceBookItemVersionRow = typeof priceBookItemVersions.$inferSelect;

export const estimates = pgTable(
  "estimates",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id),
    opportunityId: uuid("opportunity_id")
      .notNull()
      .references(() => opportunities.id),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    number: text("number").notNull(),
    title: text("title").notNull(),
    createdBy: text("created_by").notNull(),
    currentVersionId: uuid("current_version_id"),
  },
  (table) => [
    unique("estimates_organization_number_unique").on(table.organizationId, table.number),
    index("estimates_opportunity_idx").on(table.organizationId, table.opportunityId),
  ],
);

export const estimateVersions = pgTable(
  "estimate_versions",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id),
    estimateId: uuid("estimate_id")
      .notNull()
      .references(() => estimates.id),
    versionNumber: integer("version_number").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    createdBy: text("created_by").notNull(),
    overheadBasisPoints: integer("overhead_basis_points").notNull(),
    markupBasisPoints: integer("markup_basis_points").notNull(),
    taxBasisPoints: integer("tax_basis_points").notNull(),
    calculationOrder: text("calculation_order").notNull(),
    baseSubtotalCents: integer("base_subtotal_cents").notNull(),
    alternateTotalCents: integer("alternate_total_cents").notNull(),
    overheadCents: integer("overhead_cents").notNull(),
    markupCents: integer("markup_cents").notNull(),
    taxCents: integer("tax_cents").notNull(),
    totalCents: integer("total_cents").notNull(),
    contentHash: text("content_hash").notNull(),
  },
  (table) => [
    unique("estimate_versions_number_unique").on(table.estimateId, table.versionNumber),
    index("estimate_versions_estimate_idx").on(table.organizationId, table.estimateId),
  ],
);

export const estimateAlternates = pgTable(
  "estimate_alternates",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id),
    estimateVersionId: uuid("estimate_version_id")
      .notNull()
      .references(() => estimateVersions.id),
    name: text("name").notNull(),
    description: text("description").notNull(),
    included: boolean("included").notNull(),
    sortOrder: integer("sort_order").notNull(),
  },
  (table) => [
    index("estimate_alternates_version_idx").on(table.organizationId, table.estimateVersionId),
  ],
);

export const estimateLines = pgTable(
  "estimate_lines",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id),
    estimateVersionId: uuid("estimate_version_id")
      .notNull()
      .references(() => estimateVersions.id),
    sortOrder: integer("sort_order").notNull(),
    category: text("category").notNull(),
    description: text("description").notNull(),
    trade: text("trade").notNull(),
    location: text("location"),
    method: text("method").notNull(),
    quantity: numeric("quantity", { precision: 14, scale: 4 }),
    unit: text("unit"),
    unitPriceCents: integer("unit_price_cents"),
    basisPoints: integer("basis_points"),
    basisCategories: jsonb("basis_categories").$type<string[]>().notNull(),
    taxable: boolean("taxable").notNull(),
    alternateId: uuid("alternate_id").references(() => estimateAlternates.id),
    priceBookItemId: uuid("price_book_item_id").references(() => priceBookItems.id),
    priceBookVersionId: uuid("price_book_version_id").references(() => priceBookItemVersions.id),
    lineTotalCents: integer("line_total_cents").notNull(),
  },
  (table) => [
    check(
      "estimate_lines_category_valid",
      sql`${table.category} IN ('labor', 'material', 'equipment', 'subcontractor', 'allowance')`,
    ),
    check(
      "estimate_lines_method_valid",
      sql`${table.method} IN ('unit', 'fixed', 'percent')`,
    ),
    index("estimate_lines_version_idx").on(table.organizationId, table.estimateVersionId),
  ],
);

export const estimateClauses = pgTable(
  "estimate_clauses",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id),
    estimateVersionId: uuid("estimate_version_id")
      .notNull()
      .references(() => estimateVersions.id),
    kind: text("kind").notNull(),
    text: text("text").notNull(),
    sortOrder: integer("sort_order").notNull(),
  },
  (table) => [
    check(
      "estimate_clauses_kind_valid",
      sql`${table.kind} IN ('inclusion', 'exclusion', 'assumption')`,
    ),
    index("estimate_clauses_version_idx").on(table.organizationId, table.estimateVersionId),
  ],
);

export const estimateJobPackages = pgTable(
  "estimate_job_packages",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id),
    estimateVersionId: uuid("estimate_version_id")
      .notNull()
      .references(() => estimateVersions.id),
    name: text("name").notNull(),
    trade: text("trade").notNull(),
    scope: text("scope").notNull(),
    sortOrder: integer("sort_order").notNull(),
  },
  (table) => [
    index("estimate_job_packages_version_idx").on(table.organizationId, table.estimateVersionId),
  ],
);

export const estimateJobWorkAreas = pgTable(
  "estimate_job_work_areas",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id),
    packageId: uuid("package_id")
      .notNull()
      .references(() => estimateJobPackages.id),
    name: text("name").notNull(),
    kind: text("kind").notNull(),
    sortOrder: integer("sort_order").notNull(),
  },
  (table) => [
    index("estimate_job_work_areas_package_idx").on(table.organizationId, table.packageId),
  ],
);

export const estimateJobTasks = pgTable(
  "estimate_job_tasks",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id),
    packageId: uuid("package_id")
      .notNull()
      .references(() => estimateJobPackages.id),
    workAreaId: uuid("work_area_id").references(() => estimateJobWorkAreas.id),
    title: text("title").notNull(),
    sortOrder: integer("sort_order").notNull(),
  },
  (table) => [
    index("estimate_job_tasks_package_idx").on(table.organizationId, table.packageId),
  ],
);

export const estimateLineSources = pgTable(
  "estimate_line_sources",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id),
    lineId: uuid("line_id")
      .notNull()
      .references(() => estimateLines.id),
    documentVersionId: uuid("document_version_id")
      .notNull()
      .references(() => documentVersions.id),
    pageNumber: integer("page_number").notNull(),
    sheetLabel: text("sheet_label"),
    chunkId: uuid("chunk_id")
      .notNull()
      .references(() => documentChunks.id),
    contentHash: text("content_hash").notNull(),
    startOffset: integer("start_offset").notNull(),
    endOffset: integer("end_offset").notNull(),
  },
  (table) => [
    index("estimate_line_sources_line_idx").on(table.organizationId, table.lineId),
  ],
);

export type EstimateRow = typeof estimates.$inferSelect;
export type EstimateVersionRow = typeof estimateVersions.$inferSelect;
export type EstimateLineRow = typeof estimateLines.$inferSelect;
export type EstimateClauseRow = typeof estimateClauses.$inferSelect;
export type EstimateAlternateRow = typeof estimateAlternates.$inferSelect;
export type EstimateJobPackageRow = typeof estimateJobPackages.$inferSelect;
export type EstimateJobWorkAreaRow = typeof estimateJobWorkAreas.$inferSelect;
export type EstimateJobTaskRow = typeof estimateJobTasks.$inferSelect;
export type EstimateLineSourceRow = typeof estimateLineSources.$inferSelect;

export const auditEvents = pgTable(
  "audit_events",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    actor: text("actor").notNull(),
    action: text("action").notNull(),
    entityType: text("entity_type").notNull(),
    entityId: uuid("entity_id").notNull(),
    result: text("result").notNull(),
    correlationId: uuid("correlation_id").notNull(),
    payload: jsonb("payload").$type<Record<string, unknown>>().notNull(),
  },
  (table) => [
    check(
      "audit_events_result_valid",
      sql`${table.result} IN ('success', 'denied', 'failure')`,
    ),
    index("audit_events_organization_created_idx").on(
      table.organizationId,
      table.createdAt,
    ),
    index("audit_events_entity_idx").on(
      table.organizationId,
      table.entityType,
      table.entityId,
    ),
  ],
);

export type AuditEventRow = typeof auditEvents.$inferSelect;

export const outboxEvents = pgTable(
  "outbox_events",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    kind: text("kind").notNull(),
    aggregateType: text("aggregate_type").notNull(),
    aggregateId: uuid("aggregate_id").notNull(),
    idempotencyKey: text("idempotency_key").notNull(),
    payload: jsonb("payload").$type<Record<string, unknown>>().notNull(),
    publishedAt: timestamp("published_at", { withTimezone: true }),
  },
  (table) => [
    unique("outbox_events_organization_idempotency_unique").on(
      table.organizationId,
      table.idempotencyKey,
    ),
    index("outbox_events_unpublished_idx").on(
      table.organizationId,
      table.publishedAt,
    ),
  ],
);

export const backgroundJobs = pgTable(
  "background_jobs",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    kind: text("kind").notNull(),
    aggregateType: text("aggregate_type").notNull(),
    aggregateId: uuid("aggregate_id").notNull(),
    idempotencyKey: text("idempotency_key").notNull(),
    status: text("status").notNull().default("queued"),
    attempts: integer("attempts").notNull().default(0),
    maxAttempts: integer("max_attempts").notNull().default(5),
    checkpoint: jsonb("checkpoint").$type<Record<string, unknown> | null>(),
    lockedBy: text("locked_by"),
    nextRunAt: timestamp("next_run_at", { withTimezone: true }),
    payload: jsonb("payload").$type<Record<string, unknown>>().notNull(),
    lastError: text("last_error"),
  },
  (table) => [
    unique("background_jobs_organization_idempotency_unique").on(
      table.organizationId,
      table.idempotencyKey,
    ),
    check(
      "background_jobs_status_valid",
      sql`${table.status} IN ('queued', 'running', 'retry_wait', 'completed', 'dead_letter', 'cancelled')`,
    ),
    index("background_jobs_status_idx").on(
      table.organizationId,
      table.status,
      table.nextRunAt,
    ),
  ],
);

export const deadLetterJobs = pgTable(
  "dead_letter_jobs",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id),
    backgroundJobId: uuid("background_job_id")
      .notNull()
      .references(() => backgroundJobs.id),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    kind: text("kind").notNull(),
    idempotencyKey: text("idempotency_key").notNull(),
    attempts: integer("attempts").notNull(),
    checkpoint: jsonb("checkpoint").$type<Record<string, unknown> | null>(),
    lastError: text("last_error"),
    payload: jsonb("payload").$type<Record<string, unknown>>().notNull(),
  },
  (table) => [
    index("dead_letter_jobs_organization_idx").on(table.organizationId),
  ],
);

export const documents = pgTable(
  "documents",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    title: text("title").notNull(),
    createdBy: text("created_by").notNull(),
  },
  (table) => [index("documents_organization_idx").on(table.organizationId)],
);

export const documentVersions = pgTable(
  "document_versions",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id),
    documentId: uuid("document_id")
      .notNull()
      .references(() => documents.id),
    versionNumber: integer("version_number").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    filename: text("filename").notNull(),
    contentType: text("content_type").notNull(),
    sizeBytes: integer("size_bytes").notNull(),
    pathname: text("pathname").notNull().unique(),
    sha256: text("sha256"),
    status: text("status").notNull().default("quarantined"),
    kind: text("kind").notNull(),
    revisionLabel: text("revision_label"),
    uploadedBy: text("uploaded_by").notNull(),
  },
  (table) => [
    unique("document_versions_document_version_unique").on(
      table.documentId,
      table.versionNumber,
    ),
    uniqueIndex("document_versions_organization_sha256_unique")
      .on(table.organizationId, table.sha256)
      .where(sql`${table.sha256} IS NOT NULL`),
    check(
      "document_versions_status_valid",
      sql`${table.status} IN ('quarantined', 'clean', 'rejected')`,
    ),
    check(
      "document_versions_kind_valid",
      sql`${table.kind} IN ('plan', 'specification', 'addendum', 'schedule', 'photo', 'other')`,
    ),
    index("document_versions_organization_idx").on(table.organizationId),
  ],
);

export const documentLinks = pgTable(
  "document_links",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id),
    documentVersionId: uuid("document_version_id")
      .notNull()
      .references(() => documentVersions.id),
    entityType: text("entity_type").notNull(),
    entityId: uuid("entity_id").notNull(),
    purpose: text("purpose").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    unique("document_links_target_unique").on(
      table.documentVersionId,
      table.entityType,
      table.entityId,
      table.purpose,
    ),
    check(
      "document_links_entity_type_valid",
      sql`${table.entityType} IN ('request', 'opportunity', 'estimate', 'project', 'job')`,
    ),
    index("document_links_entity_idx").on(
      table.organizationId,
      table.entityType,
      table.entityId,
    ),
  ],
);

export const documentExtractions = pgTable(
  "document_extractions",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id),
    documentVersionId: uuid("document_version_id")
      .notNull()
      .references(() => documentVersions.id),
    status: text("status").notNull().default("queued"),
    provider: text("provider"),
    model: text("model"),
    pageProgress: integer("page_progress").notNull().default(0),
    pageCount: integer("page_count"),
    error: text("error"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    check(
      "document_extractions_status_valid",
      sql`${table.status} IN ('queued', 'running', 'ready', 'failed')`,
    ),
    index("document_extractions_version_idx").on(
      table.organizationId,
      table.documentVersionId,
    ),
  ],
);

export const documentPages = pgTable(
  "document_pages",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id),
    documentVersionId: uuid("document_version_id")
      .notNull()
      .references(() => documentVersions.id),
    extractionId: uuid("extraction_id")
      .notNull()
      .references(() => documentExtractions.id),
    pageNumber: integer("page_number").notNull(),
    sheetLabel: text("sheet_label"),
    machineText: text("machine_text").notNull(),
    correctedText: text("corrected_text"),
  },
  (table) => [
    unique("document_pages_extraction_page_unique").on(
      table.extractionId,
      table.pageNumber,
    ),
  ],
);

export const documentChunks = pgTable(
  "document_chunks",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id),
    documentVersionId: uuid("document_version_id")
      .notNull()
      .references(() => documentVersions.id),
    pageId: uuid("page_id")
      .notNull()
      .references(() => documentPages.id),
    startOffset: integer("start_offset").notNull(),
    endOffset: integer("end_offset").notNull(),
    contentHash: text("content_hash").notNull(),
    text: text("text").notNull(),
    bbox: jsonb("bbox").$type<{
      x: number;
      y: number;
      width: number;
      height: number;
    } | null>(),
  },
  (table) => [
    index("document_chunks_version_idx").on(
      table.organizationId,
      table.documentVersionId,
    ),
  ],
);

export type DocumentRow = typeof documents.$inferSelect;
export type DocumentVersionRow = typeof documentVersions.$inferSelect;
export type DocumentLinkRow = typeof documentLinks.$inferSelect;
export type DocumentExtractionRow = typeof documentExtractions.$inferSelect;
export type DocumentPageRow = typeof documentPages.$inferSelect;
export type DocumentChunkRow = typeof documentChunks.$inferSelect;

export const commercialApprovalRules = pgTable("commercial_approval_rules", {
  id: uuid("id").defaultRandom().primaryKey(),
  organizationId: uuid("organization_id")
    .notNull()
    .references(() => organizations.id),
  name: text("name").notNull(),
  active: boolean("active").notNull(),
  secondApproverTotalCents: integer("second_approver_total_cents"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const estimateApprovals = pgTable(
  "estimate_approvals",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id),
    estimateId: uuid("estimate_id")
      .notNull()
      .references(() => estimates.id),
    estimateVersionId: uuid("estimate_version_id")
      .notNull()
      .references(() => estimateVersions.id),
    versionNumber: integer("version_number").notNull(),
    contentHash: text("content_hash").notNull(),
    ruleId: uuid("rule_id")
      .notNull()
      .references(() => commercialApprovalRules.id),
    actorEmail: text("actor_email").notNull(),
    decision: text("decision").notNull(),
    comment: text("comment").notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    unique("estimate_approvals_actor_version_unique").on(
      table.estimateVersionId,
      table.actorEmail,
    ),
    index("estimate_approvals_estimate_idx").on(table.organizationId, table.estimateId),
  ],
);

export type CommercialApprovalRuleRow = typeof commercialApprovalRules.$inferSelect;
export type EstimateApprovalRow = typeof estimateApprovals.$inferSelect;

export const proposals = pgTable(
  "proposals",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id),
    estimateId: uuid("estimate_id")
      .notNull()
      .references(() => estimates.id),
    estimateVersionId: uuid("estimate_version_id")
      .notNull()
      .references(() => estimateVersions.id),
    versionNumber: integer("version_number").notNull(),
    contentHash: text("content_hash").notNull(),
    pdfSha256: text("pdf_sha256").notNull(),
    pdfBase64: text("pdf_base64").notNull(),
    tokenHash: text("token_hash").notNull(),
    publicSnapshot: jsonb("public_snapshot").notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    createdBy: text("created_by").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    unique("proposals_token_hash_unique").on(table.tokenHash),
    index("proposals_estimate_idx").on(table.organizationId, table.estimateId),
  ],
);

export const proposalEvents = pgTable(
  "proposal_events",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id),
    proposalId: uuid("proposal_id")
      .notNull()
      .references(() => proposals.id),
    kind: text("kind").notNull(),
    actorEmail: text("actor_email"),
    recipientName: text("recipient_name"),
    recipientEmail: text("recipient_email"),
    channel: text("channel"),
    externalMessageId: text("external_message_id"),
    attestation: text("attestation"),
    ipAddress: text("ip_address"),
    userAgent: text("user_agent"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    check(
      "proposal_events_kind_valid",
      sql`${table.kind} IN ('generated', 'delivered', 'viewed', 'accepted', 'rejected', 'expired', 'revoked')`,
    ),
    index("proposal_events_proposal_idx").on(table.organizationId, table.proposalId),
  ],
);

export const estimateAcceptances = pgTable(
  "estimate_acceptances",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id),
    proposalId: uuid("proposal_id")
      .notNull()
      .references(() => proposals.id),
    estimateId: uuid("estimate_id")
      .notNull()
      .references(() => estimates.id),
    estimateVersionId: uuid("estimate_version_id")
      .notNull()
      .references(() => estimateVersions.id),
    contentHash: text("content_hash").notNull(),
    recipientName: text("recipient_name").notNull(),
    recipientEmail: text("recipient_email").notNull(),
    attestation: text("attestation").notNull(),
    ipAddress: text("ip_address"),
    userAgent: text("user_agent"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    unique("estimate_acceptances_proposal_unique").on(table.proposalId),
    index("estimate_acceptances_estimate_idx").on(table.organizationId, table.estimateId),
  ],
);

export type ProposalRow = typeof proposals.$inferSelect;
export type ProposalEventRow = typeof proposalEvents.$inferSelect;
export type EstimateAcceptanceRow = typeof estimateAcceptances.$inferSelect;

export const estimateConversions = pgTable(
  "estimate_conversions",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id),
    acceptanceId: uuid("acceptance_id")
      .notNull()
      .references(() => estimateAcceptances.id),
    estimateId: uuid("estimate_id")
      .notNull()
      .references(() => estimates.id),
    estimateVersionId: uuid("estimate_version_id")
      .notNull()
      .references(() => estimateVersions.id),
    contentHash: text("content_hash").notNull(),
    idempotencyKey: text("idempotency_key").notNull(),
    payloadHash: text("payload_hash").notNull(),
    projectId: uuid("project_id")
      .notNull()
      .references(() => projects.id),
    jobIds: jsonb("job_ids").$type<string[]>().notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    unique("estimate_conversions_acceptance_unique").on(table.acceptanceId),
    unique("estimate_conversions_idempotency_unique").on(
      table.organizationId,
      table.idempotencyKey,
    ),
    index("estimate_conversions_estimate_idx").on(table.organizationId, table.estimateId),
  ],
);

export const projectBudgets = pgTable(
  "project_budgets",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id),
    projectId: uuid("project_id")
      .notNull()
      .references(() => projects.id),
    estimateVersionId: uuid("estimate_version_id")
      .notNull()
      .references(() => estimateVersions.id),
    contentHash: text("content_hash").notNull(),
    totalCents: integer("total_cents").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    unique("project_budgets_project_unique").on(table.projectId),
    index("project_budgets_organization_idx").on(table.organizationId, table.projectId),
  ],
);

export const projectBudgetLines = pgTable(
  "project_budget_lines",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id),
    budgetId: uuid("budget_id")
      .notNull()
      .references(() => projectBudgets.id),
    estimateLineId: uuid("estimate_line_id")
      .notNull()
      .references(() => estimateLines.id),
    estimateVersionId: uuid("estimate_version_id")
      .notNull()
      .references(() => estimateVersions.id),
    priceBookVersionId: uuid("price_book_version_id").references(() => priceBookItemVersions.id),
    description: text("description").notNull(),
    amountCents: integer("amount_cents").notNull(),
    sortOrder: integer("sort_order").notNull(),
  },
  (table) => [
    index("project_budget_lines_budget_idx").on(table.organizationId, table.budgetId),
  ],
);

export const changeOrders = pgTable(
  "change_orders",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id),
    projectId: uuid("project_id")
      .notNull()
      .references(() => projects.id),
    number: text("number").notNull(),
    scope: text("scope").notNull(),
    priceCents: integer("price_cents").notNull(),
    scheduleImpactDays: integer("schedule_impact_days").notNull(),
    status: text("status").notNull(),
    contentHash: text("content_hash").notNull(),
    createdBy: text("created_by").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    unique("change_orders_project_number_unique").on(table.projectId, table.number),
    check(
      "change_orders_status_valid",
      sql`${table.status} IN ('draft', 'pending', 'approved', 'rejected', 'void')`,
    ),
    index("change_orders_project_idx").on(table.organizationId, table.projectId),
  ],
);

export const changeOrderApprovals = pgTable(
  "change_order_approvals",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id),
    changeOrderId: uuid("change_order_id")
      .notNull()
      .references(() => changeOrders.id),
    contentHash: text("content_hash").notNull(),
    ruleId: uuid("rule_id")
      .notNull()
      .references(() => commercialApprovalRules.id),
    actorEmail: text("actor_email").notNull(),
    decision: text("decision").notNull(),
    comment: text("comment").notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    unique("change_order_approvals_actor_unique").on(table.changeOrderId, table.actorEmail),
    check(
      "change_order_approvals_decision_valid",
      sql`${table.decision} IN ('approved', 'rejected')`,
    ),
    index("change_order_approvals_order_idx").on(table.organizationId, table.changeOrderId),
  ],
);

export const changeOrderBudgetEffects = pgTable(
  "change_order_budget_effects",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id),
    projectId: uuid("project_id")
      .notNull()
      .references(() => projects.id),
    changeOrderId: uuid("change_order_id")
      .notNull()
      .references(() => changeOrders.id),
    approvalId: uuid("approval_id")
      .notNull()
      .references(() => changeOrderApprovals.id),
    contentHash: text("content_hash").notNull(),
    priceCents: integer("price_cents").notNull(),
    scheduleImpactDays: integer("schedule_impact_days").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    unique("change_order_budget_effects_order_unique").on(table.changeOrderId),
    index("change_order_budget_effects_project_idx").on(table.organizationId, table.projectId),
  ],
);

export const aiRuns = pgTable(
  "ai_runs",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id),
    capabilityId: text("capability_id").notNull(),
    provider: text("provider"),
    model: text("model"),
    promptTemplateVersion: text("prompt_template_version").notNull(),
    responseSchemaVersion: text("response_schema_version").notNull(),
    actorEmail: text("actor_email"),
    service: text("service"),
    contentHash: text("content_hash").notNull(),
    selectedSourceIds: jsonb("selected_source_ids").$type<string[]>().notNull(),
    status: text("status").notNull(),
    idempotencyKey: text("idempotency_key").notNull(),
    error: text("error"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    unique("ai_runs_idempotency_unique").on(table.organizationId, table.idempotencyKey),
    check("ai_runs_capability_valid", sql`${table.capabilityId} IN ('AI-016', 'AI-018')`),
    check("ai_runs_status_valid", sql`${table.status} IN ('completed', 'failed')`),
    index("ai_runs_organization_idx").on(table.organizationId, table.createdAt),
  ],
);

export const aiProposals = pgTable(
  "ai_proposals",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id),
    runId: uuid("run_id")
      .notNull()
      .references(() => aiRuns.id),
    opportunityId: uuid("opportunity_id")
      .notNull()
      .references(() => opportunities.id),
    contentHash: text("content_hash").notNull(),
    output: jsonb("output").notNull(),
    status: text("status").notNull().default("proposed"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    unique("ai_proposals_run_unique").on(table.runId),
    check("ai_proposals_status_valid", sql`${table.status} IN ('proposed', 'dismissed', 'applied')`),
    index("ai_proposals_opportunity_idx").on(table.organizationId, table.opportunityId),
  ],
);

export const aiCitations = pgTable(
  "ai_citations",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id),
    proposalId: uuid("proposal_id")
      .notNull()
      .references(() => aiProposals.id),
    itemPath: text("item_path").notNull(),
    documentVersionId: uuid("document_version_id")
      .notNull()
      .references(() => documentVersions.id),
    chunkId: uuid("chunk_id")
      .notNull()
      .references(() => documentChunks.id),
    contentHash: text("content_hash").notNull(),
    pageNumber: integer("page_number").notNull(),
    startOffset: integer("start_offset").notNull(),
    endOffset: integer("end_offset").notNull(),
  },
  (table) => [index("ai_citations_proposal_idx").on(table.organizationId, table.proposalId)],
);

export const aiToolExecutions = pgTable(
  "ai_tool_executions",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id),
    runId: uuid("run_id")
      .notNull()
      .references(() => aiRuns.id),
    toolName: text("tool_name").notNull(),
    status: text("status").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [index("ai_tool_executions_run_idx").on(table.organizationId, table.runId)],
);

export type EstimateConversionRow = typeof estimateConversions.$inferSelect;
export type ProjectBudgetRow = typeof projectBudgets.$inferSelect;
export type ProjectBudgetLineRow = typeof projectBudgetLines.$inferSelect;
export type ChangeOrderRow = typeof changeOrders.$inferSelect;
export type ChangeOrderApprovalRow = typeof changeOrderApprovals.$inferSelect;
export type ChangeOrderBudgetEffectRow = typeof changeOrderBudgetEffects.$inferSelect;
export type DispatchRow = typeof dispatches.$inferSelect;
export type LaborEntryRow = typeof laborEntries.$inferSelect;
export type PurchaseOrderRow = typeof purchaseOrders.$inferSelect;
export type PurchaseOrderLineRow = typeof purchaseOrderLines.$inferSelect;
export type EquipmentAssignmentRow = typeof equipmentAssignments.$inferSelect;

const bytea = customType<{ data: Buffer; driverData: Buffer }>({
  dataType() {
    return "bytea";
  },
});

export const privateSchema = pgSchema("private");

export const dataImportBatches = privateSchema.table(
  "data_import_batches",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
    createdBy: text("created_by").notNull(),
    filename: text("filename").notNull(),
    contentType: text("content_type").notNull(),
    byteSize: integer("byte_size").notNull(),
    sha256: text("sha256").notNull(),
    idempotencyKey: text("idempotency_key").notNull(),
    status: text("status").notNull(),
    revision: integer("revision").notNull().default(1),
    previewHash: text("preview_hash"),
    durable: boolean("durable").notNull().default(false),
    summary: jsonb("summary").notNull(),
    fileBytes: bytea("file_bytes"),
  },
  (table) => [
    unique("data_import_batches_org_idempotency_unique").on(
      table.organizationId,
      table.idempotencyKey,
    ),
    check(
      "data_import_batches_status_valid",
      sql`${table.status} IN ('uploaded', 'analyzing', 'needs_mapping', 'invalid', 'ready', 'commit_queued', 'importing', 'completed', 'failed', 'cancelled')`,
    ),
    index("data_import_batches_org_idx").on(table.organizationId, table.createdAt),
  ],
);

export const dataImportSheets = privateSchema.table(
  "data_import_sheets",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    batchId: uuid("batch_id")
      .notNull()
      .references(() => dataImportBatches.id, { onDelete: "cascade" }),
    organizationId: uuid("organization_id").notNull(),
    sheetName: text("sheet_name").notNull(),
    entityType: text("entity_type"),
    rowCount: integer("row_count").notNull(),
    headers: jsonb("headers").notNull(),
  },
  (table) => [
    unique("data_import_sheets_batch_name_unique").on(table.batchId, table.sheetName),
    index("data_import_sheets_org_idx").on(table.organizationId),
  ],
);

export const dataImportRows = privateSchema.table(
  "data_import_rows",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    batchId: uuid("batch_id")
      .notNull()
      .references(() => dataImportBatches.id, { onDelete: "cascade" }),
    organizationId: uuid("organization_id").notNull(),
    sheetName: text("sheet_name").notNull(),
    rowNumber: integer("row_number").notNull(),
    entityType: text("entity_type").notNull(),
    sourceKey: text("source_key").notNull(),
    status: text("status").notNull(),
    operation: text("operation").notNull().default("create"),
    values: jsonb("values").notNull(),
    messages: jsonb("messages").notNull(),
    targetId: uuid("target_id"),
  },
  (table) => [
    unique("data_import_rows_batch_row_unique").on(
      table.batchId,
      table.sheetName,
      table.rowNumber,
    ),
    index("data_import_rows_org_idx").on(table.organizationId, table.batchId),
  ],
);

export const dataImportMappingProfiles = privateSchema.table(
  "data_import_mapping_profiles",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    organizationId: uuid("organization_id").notNull(),
    name: text("name").notNull(),
    entityType: text("entity_type").notNull(),
    headerSignature: text("header_signature").notNull(),
    mapping: jsonb("mapping").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    unique("data_import_profiles_signature_unique").on(
      table.organizationId,
      table.entityType,
      table.headerSignature,
    ),
  ],
);

export const externalRecordKeys = privateSchema.table(
  "external_record_keys",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    organizationId: uuid("organization_id").notNull(),
    sourceSystem: text("source_system").notNull(),
    entityType: text("entity_type").notNull(),
    sourceKey: text("source_key").notNull(),
    targetId: uuid("target_id").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    unique("external_record_keys_unique").on(
      table.organizationId,
      table.sourceSystem,
      table.entityType,
      table.sourceKey,
    ),
    index("external_record_keys_org_idx").on(table.organizationId),
  ],
);

export const dataImportEvents = privateSchema.table(
  "data_import_events",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    batchId: uuid("batch_id")
      .notNull()
      .references(() => dataImportBatches.id, { onDelete: "cascade" }),
    organizationId: uuid("organization_id").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    actor: text("actor").notNull(),
    kind: text("kind").notNull(),
    summary: text("summary").notNull(),
    payload: jsonb("payload").notNull(),
  },
  (table) => [index("data_import_events_org_idx").on(table.organizationId, table.batchId)],
);

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
