import {
  foreignKey,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  unique,
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
    dueAt: timestamp("due_at", { withTimezone: true }),
    status: text("status").notNull().default("open"),
    createdBy: text("created_by").notNull(),
  },
  (table) => [
    foreignKey({
      columns: [table.workAreaId, table.jobId],
      foreignColumns: [workAreas.id, workAreas.jobId],
      name: "job_tasks_work_area_job_fk",
    }),
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
  },
  (table) => [
    foreignKey({
      columns: [table.workAreaId, table.jobId],
      foreignColumns: [workAreas.id, workAreas.jobId],
      name: "job_documents_work_area_job_fk",
    }),
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
