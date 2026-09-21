import {
  and,
  asc,
  desc,
  eq,
  gt,
  gte,
  ilike,
  inArray,
  lte,
  ne,
  or,
  sql,
} from "drizzle-orm";
import { getDb } from "@/db";
import {
  companies,
  contacts,
  estimateRequestComments,
  estimateRequestEvents,
  estimateRequestTasks,
  jobAssignments,
  jobDocuments,
  jobEvents,
  jobFieldNotes,
  jobPlanAnnotations,
  jobVoiceNotes,
  jobTaskDependencies,
  jobTasks,
  jobs,
  leads,
  memberships,
  opportunities,
  organizations,
  projectScheduleBaselineItems,
  projectScheduleBaselines,
  projects,
  scheduleCalendarExceptions,
  scheduleCalendars,
  sites,
  userEvents,
  users,
  workAreas,
} from "@/db/schema";
import { signLeadId } from "@/lib/leads/hmac";
import type { CrmConversionInput } from "@/lib/ops/crm";
import {
  addDemoCompany,
  addDemoContact,
  addDemoEstimateRequestComment,
  addDemoEstimateRequestTask,
  addDemoJobAssignment,
  addDemoJobDocument,
  addDemoJobFieldNote,
  addDemoJobPlanAnnotation,
  addDemoJobTaskDependency,
  captureDemoProjectScheduleBaseline,
  addDemoJobTask,
  addDemoJobToProject,
  addDemoSite,
  addDemoUser,
  addDemoJobVoiceNote,
  addDemoWorkArea,
  convertDemoOpportunityToProject,
  convertDemoRequestToCrm,
  deleteDemoCompany,
  deleteDemoContact,
  deleteDemoEstimateRequestComment,
  deleteDemoEstimateRequestTask,
  deleteDemoJob,
  deleteDemoJobDocument,
  deleteDemoJobFieldNote,
  deleteDemoJobVoiceNote,
  deleteDemoJobTaskDependency,
  extractDemoVoiceNote,
  getDemoProjectScheduleBaseline,
  deleteDemoJobTask,
  deleteDemoOpportunity,
  deleteDemoProject,
  deleteDemoSite,
  deleteDemoWorkArea,
  getDemoFieldIdentityByEmail,
  getDemoFieldIdentityById,
  getDemoCompany,
  getDemoContact,
  getDemoEstimateRequest,
  getDemoJob,
  getDemoJobDocumentDownload,
  getDemoJobPlanAnnotation,
  getDemoJobVoiceNote,
  getDemoJobVoiceNoteDownload,
  getDemoOpportunity,
  getDemoProject,
  getDemoSite,
  listDemoCompanies,
  listDemoContacts,
  listDemoEstimateRequestComments,
  listDemoEstimateRequestEvents,
  listDemoEstimateRequestTasks,
  listDemoEstimateRequests,
  listDemoJobAssignments,
  listDemoJobDocuments,
  listDemoJobPlanAnnotations,
  listDemoJobVoiceNotes,
  processDemoVoiceTranscription,
  updateDemoVoiceTranscript,
  attachDemoVoiceNoteToPlanMark,
  listDemoJobEvents,
  listDemoJobEventsSince,
  listDemoHomeExceptionSource,
  recordDemoAiJobEvent,
  recordDemoScheduleDiffAccepted,
  recordDemoTaskCommandEvent,
  listDemoJobFieldNotes,
  listDemoJobTasks,
  listDemoProjectJobTasks,
  listDemoPortfolioSchedule,
  listDemoProjectTaskDependencies,
  listDemoJobs,
  listDemoOpportunities,
  listDemoProjects,
  listDemoProjectScheduleBaselines,
  removeDemoProjectScheduleBaseline,
  removeDemoScheduleCalendarException,
  listDemoSites,
  listDemoUserEvents,
  listDemoUsers,
  listDemoWorkAreas,
  getDemoUserAssignmentSummary,
  countActiveDemoAdministrators,
  canDemoFieldUserAccessJob,
  canDemoFieldUserAccessTask,
  removeDemoJobAssignment,
  rescheduleDemoJob,
  rescheduleDemoJobTask,
  resolveDemoProjectScheduleCalendar,
  saveDemoProjectScheduleCalendar,
  setDemoEstimateRequestTaskStatus,
  setDemoJobStatus,
  setDemoJobPlanAnnotationStatus,
  setDemoJobTaskStatus,
  voidDemoJobPlanAnnotation,
  setDemoUserActive,
  resetDemoUserPassword,
  revokeDemoUserSessions,
  updateDemoCompany,
  updateDemoContact,
  updateDemoEstimateRequest,
  updateDemoEstimateRequestTask,
  updateDemoJobDetails,
  updateDemoJobDocument,
  updateDemoJobFieldNote,
  updateDemoJobTask,
  updateDemoOpportunity,
  updateDemoProject,
  updateDemoSite,
  updateDemoUser,
  updateDemoWorkArea,
  upsertDemoScheduleCalendarException,
  isDemoOpsStore,
} from "@/lib/ops/demo-store";
import { endOfDay, parseDateRange, startOfDay } from "@/lib/ops/filters";
import {
  clearJobDocumentBytes,
  getStoredJobDocumentBytes,
} from "@/lib/ops/job-document-bytes";
import {
  sortJobTaskRows,
  type JobDocumentInput,
  type JobDocumentKind,
  type JobTaskInput,
  type WorkAreaInput,
} from "@/lib/ops/job-workspace";
import type { FieldNoteInput } from "@/lib/ops/field-workspace";
import {
  clearVoiceNoteBytes,
  getStoredVoiceNoteBytes,
} from "@/lib/ops/voice-bytes";
import type { VoiceExtractKind, VoiceNoteInput } from "@/lib/ops/voice-notes";
import { transcribeVoiceAudio } from "@/lib/ops/voice-transcribe";
import {
  isCurrentPlanDocument,
  planSheetKey,
  type PlanAnnotationInput,
  type PlanAnnotationStatus,
} from "@/lib/ops/plan-markup";
import {
  STRONG_FOAM_ORGANIZATION_ID,
  isFieldMembershipRole,
  type JobAssignmentRole,
  type JobAssignmentView,
  type MembershipRole,
  type UserIdentity,
  type UserListItem,
  type UserUpdateInput,
} from "@/lib/ops/identity";
import {
  validateDependencyAddition,
  validateDependencyDates,
} from "@/lib/ops/project-schedule-graph";
import type { ResolvedWorkingCalendar } from "@/lib/ops/project-schedule-planning";
import {
  canConvertWonWork,
  type JobConversionInput,
  type JobDetailsInput,
  type JobStatus,
} from "@/lib/ops/jobs";
import type {
  CompanyInput,
  ContactInput,
  OpportunityUpdateInput,
  ProjectUpdateInput,
  SiteInput,
} from "@/lib/ops/records";
import type { TaskStatus } from "@/lib/ops/collaboration";
import {
  isWorkflowStatus,
  requireLostReason,
  type WorkflowStatus,
} from "@/lib/ops/workflow";

export type EstimateRequestRow = typeof leads.$inferSelect;
export type EstimateRequestEvent = typeof estimateRequestEvents.$inferSelect;
export type EstimateRequestTask = typeof estimateRequestTasks.$inferSelect;
export type EstimateRequestComment = typeof estimateRequestComments.$inferSelect;
export type CompanyRow = typeof companies.$inferSelect;
export type OrganizationRow = typeof organizations.$inferSelect;
export type UserRow = typeof users.$inferSelect;
export type UserEventRow = typeof userEvents.$inferSelect;
export type MembershipRow = typeof memberships.$inferSelect;
export type ContactRow = typeof contacts.$inferSelect;
export type SiteRow = typeof sites.$inferSelect;
export type OpportunityRow = typeof opportunities.$inferSelect;
export type ProjectRow = typeof projects.$inferSelect;
export type JobRow = typeof jobs.$inferSelect;
export type JobEventRow = typeof jobEvents.$inferSelect;
export type JobAssignmentRow = typeof jobAssignments.$inferSelect;
export type WorkAreaRow = typeof workAreas.$inferSelect;
export type JobTaskRow = typeof jobTasks.$inferSelect;
export type JobTaskDependencyRow = typeof jobTaskDependencies.$inferSelect;
export type ScheduleCalendarRow = typeof scheduleCalendars.$inferSelect;
export type ScheduleCalendarExceptionRow =
  typeof scheduleCalendarExceptions.$inferSelect;
export type ProjectScheduleBaselineRow =
  typeof projectScheduleBaselines.$inferSelect;
export type ProjectScheduleBaselineItemRow =
  typeof projectScheduleBaselineItems.$inferSelect;
export type JobDocumentRow = typeof jobDocuments.$inferSelect;
export type JobPlanAnnotationRow = typeof jobPlanAnnotations.$inferSelect;
export type JobFieldNoteRow = typeof jobFieldNotes.$inferSelect;
export type JobVoiceNoteRow = typeof jobVoiceNotes.$inferSelect;

export type PortfolioScheduleStoreFilters = {
  q?: string;
  projectStatus?: string;
  projectManager?: string;
};

export type PortfolioScheduleTruncation = {
  projects: boolean;
  jobs: boolean;
  tasks: boolean;
  dependencies: boolean;
  calendarExceptions: boolean;
  baselineItems: boolean;
};

export type PortfolioScheduleStoreResult = {
  projects: ProjectRow[];
  jobs: JobRow[];
  tasks: JobTaskRow[];
  dependencies: JobTaskDependencyRow[];
  calendars: ScheduleCalendarRow[];
  calendarExceptions: ScheduleCalendarExceptionRow[];
  baselines: ProjectScheduleBaselineRow[];
  baselineItems: ProjectScheduleBaselineItemRow[];
  truncation: PortfolioScheduleTruncation;
};

export type ProjectDependencyResult = {
  edges: JobTaskDependencyRow[];
  truncated: boolean;
};

export type JobDocumentDownload = {
  filename: string;
  contentType: string;
} & (
  | { kind: "bytes"; bytes: Uint8Array }
  | { kind: "redirect"; url: string }
);

export type CrmConversionResult =
  | {
      ok: true;
      companyId: string;
      contactId: string;
      siteId: string;
      opportunityId: string;
      created: { company: boolean; contact: boolean; site: boolean };
    }
  | { ok: false; error: string };

export type RequestCrmRecords = {
  company: CompanyRow | null;
  contact: ContactRow | null;
  site: SiteRow | null;
  opportunity: OpportunityRow | null;
};

export type DateListFilters = {
  from?: string;
  to?: string;
};

export type EstimateRequestFilters = DateListFilters & {
  q?: string;
  workflowStatus?: string;
  qualification?: string;
};

export type CompanyListFilters = {
  q?: string;
};

export type OpportunityListFilters = DateListFilters & {
  q?: string;
  stage?: string;
  companyId?: string;
};

export type ProjectListFilters = DateListFilters & {
  q?: string;
  status?: string;
  companyId?: string;
};

export type JobListFilters = DateListFilters & {
  projectId?: string;
  companyId?: string;
  status?: string;
  q?: string;
  fieldUserId?: string;
};

export type JobTaskListFilters = DateListFilters & {
  status?: string;
};

export type JobDocumentListFilters = DateListFilters & {
  kind?: string;
};

export type JobFieldNoteListFilters = DateListFilters & {
  kind?: string;
  workAreaId?: string;
};

export type { JobDetailsInput };

export type EstimateRequestUpdate = {
  workflowStatus: WorkflowStatus;
  assignedTo: string | null;
  nextAction: string | null;
  nextActionDueAt: Date | null;
  lostReason: string | null;
  note?: string;
};

function like(value: string): string {
  return `%${value.replaceAll("%", "\\%").replaceAll("_", "\\_")}%`;
}

export function parseEstimateRequestUpdate(input: {
  workflowStatus?: string;
  assignedTo?: string;
  nextAction?: string;
  nextActionDueAt?: string;
  lostReason?: string;
  note?: string;
}): { ok: true; value: EstimateRequestUpdate } | { ok: false; error: string; field?: string } {
  const workflowStatus = input.workflowStatus ?? "";
  if (!isWorkflowStatus(workflowStatus)) {
    return { ok: false, error: "Choose a valid workflow status.", field: "workflowStatus" };
  }

  const lostReason = input.lostReason?.trim() || null;
  const lostReasonError = requireLostReason(workflowStatus, lostReason);
  if (lostReasonError) return { ok: false, error: lostReasonError, field: "lostReason" };

  const nextActionDueAt = input.nextActionDueAt
    ? new Date(input.nextActionDueAt)
    : null;
  if (nextActionDueAt && Number.isNaN(nextActionDueAt.getTime())) {
    return { ok: false, error: "Next-action due date is invalid.", field: "nextActionDueAt" };
  }

  return {
    ok: true,
    value: {
      workflowStatus,
      assignedTo: input.assignedTo?.trim() || null,
      nextAction: input.nextAction?.trim() || null,
      nextActionDueAt,
      lostReason: workflowStatus === "lost" ? lostReason : null,
      note: input.note?.trim() || undefined,
    },
  };
}

function mapIdentity(row: {
  user: UserRow;
  membership: MembershipRow;
}): UserIdentity | null {
  if (!isFieldMembershipRole(row.membership.role) &&
      row.membership.role !== "administrator" &&
      row.membership.role !== "office") {
    return null;
  }
  return {
    userId: row.user.id,
    organizationId: row.membership.organizationId,
    email: row.user.email,
    displayName: row.user.displayName,
    passwordHash: row.user.passwordHash,
    active: row.user.active,
    membershipActive: row.membership.active,
    role: row.membership.role as MembershipRole,
    sessionVersion: row.user.sessionVersion,
  };
}

export async function listUsers(): Promise<UserListItem[]> {
  if (isDemoOpsStore()) return listDemoUsers();
  const db = getDb();
  const rows = await db
    .select({ user: users, membership: memberships })
    .from(users)
    .innerJoin(memberships, eq(memberships.userId, users.id))
    .where(eq(memberships.organizationId, STRONG_FOAM_ORGANIZATION_ID))
    .orderBy(asc(users.displayName));
  return rows
    .map((row) => {
      const identity = mapIdentity(row);
      return identity
        ? {
            ...identity,
            createdAt: row.user.createdAt,
            updatedAt: row.user.updatedAt,
          }
        : null;
    })
    .filter((user): user is UserListItem => Boolean(user));
}

export async function listActiveFieldUsers(): Promise<UserListItem[]> {
  return (await listUsers()).filter(
    (user) =>
      user.active &&
      user.membershipActive &&
      isFieldMembershipRole(user.role),
  );
}

async function getIdentity(
  by: { id: string } | { email: string },
): Promise<UserIdentity | null> {
  if (isDemoOpsStore()) {
    return "id" in by
      ? getDemoFieldIdentityById(by.id)
      : getDemoFieldIdentityByEmail(by.email);
  }
  const db = getDb();
  const rows = await db
    .select({ user: users, membership: memberships })
    .from(users)
    .innerJoin(memberships, eq(memberships.userId, users.id))
    .where(
      and(
        "id" in by ? eq(users.id, by.id) : eq(users.email, by.email),
        eq(memberships.organizationId, STRONG_FOAM_ORGANIZATION_ID),
      ),
    )
    .limit(1);
  return rows[0] ? mapIdentity(rows[0]) : null;
}

export function getFieldIdentityById(
  userId: string,
): Promise<UserIdentity | null> {
  return getIdentity({ id: userId });
}

export function getFieldIdentityByEmail(
  email: string,
): Promise<UserIdentity | null> {
  return getIdentity({ email: email.trim().toLowerCase() });
}

export function getUserIdentityById(
  userId: string,
): Promise<UserIdentity | null> {
  return getIdentity({ id: userId });
}

export function getUserIdentityByEmail(
  email: string,
): Promise<UserIdentity | null> {
  return getIdentity({ email: email.trim().toLowerCase() });
}

export async function listUserEvents(limit = 50): Promise<UserEventRow[]> {
  if (isDemoOpsStore()) return listDemoUserEvents(limit);
  const db = getDb();
  return db
    .select()
    .from(userEvents)
    .orderBy(desc(userEvents.createdAt))
    .limit(Math.min(Math.max(limit, 1), 100));
}

export async function getUserAssignmentSummary(userId: string): Promise<{
  jobAssignments: number;
  taskAssignments: number;
}> {
  if (isDemoOpsStore()) return getDemoUserAssignmentSummary(userId);
  const db = getDb();
  const [direct, tasks] = await Promise.all([
    db
      .select({ id: jobAssignments.id })
      .from(jobAssignments)
      .where(eq(jobAssignments.userId, userId)),
    db
      .select({ id: jobTasks.id })
      .from(jobTasks)
      .where(eq(jobTasks.assigneeUserId, userId)),
  ]);
  return {
    jobAssignments: direct.length,
    taskAssignments: tasks.length,
  };
}

export async function countActiveAdministrators(): Promise<number> {
  if (isDemoOpsStore()) return countActiveDemoAdministrators();
  const db = getDb();
  const rows = await db
    .select({ id: users.id })
    .from(users)
    .innerJoin(memberships, eq(memberships.userId, users.id))
    .where(
      and(
        eq(memberships.organizationId, STRONG_FOAM_ORGANIZATION_ID),
        eq(memberships.role, "administrator"),
        eq(users.active, true),
        eq(memberships.active, true),
      ),
    );
  return rows.length;
}

export async function addUser(args: {
  actor: string;
  displayName: string;
  email: string;
  passwordHash: string;
  role: MembershipRole;
}): Promise<UserListItem | null> {
  if (isDemoOpsStore()) return addDemoUser(args);
  const db = getDb();
  return db.transaction(async (tx) => {
    const userRows = await tx
      .insert(users)
      .values({
        displayName: args.displayName,
        email: args.email,
        passwordHash: args.passwordHash,
        active: true,
        createdBy: args.actor,
      })
      .onConflictDoNothing({ target: users.email })
      .returning();
    const user = userRows[0];
    if (!user) return null;
    const membershipRows = await tx
      .insert(memberships)
      .values({
        organizationId: STRONG_FOAM_ORGANIZATION_ID,
        userId: user.id,
        role: args.role,
        active: true,
      })
      .returning();
    const membership = membershipRows[0];
    if (!membership) return null;
    const identity = mapIdentity({ user, membership });
    await tx.insert(userEvents).values({
      userId: user.id,
      actor: args.actor,
      kind: "user_created",
      summary: `${user.displayName} created as ${args.role}`,
      payload: { role: args.role },
    });
    return identity
      ? { ...identity, createdAt: user.createdAt, updatedAt: user.updatedAt }
      : null;
  });
}

export async function setUserActive(args: {
  userId: string;
  active: boolean;
  actor: string;
}): Promise<UserListItem | null> {
  if (isDemoOpsStore()) {
    return setDemoUserActive(args.userId, args.active, args.actor);
  }
  const db = getDb();
  await db.transaction(async (tx) => {
    const rows = await tx
      .update(users)
      .set({
        active: args.active,
        sessionVersion: sql`${users.sessionVersion} + 1`,
        updatedAt: new Date(),
      })
      .where(eq(users.id, args.userId))
      .returning({ displayName: users.displayName });
    if (!rows[0]) return;
    await tx
      .update(memberships)
      .set({ active: args.active, updatedAt: new Date() })
      .where(
        and(
          eq(memberships.userId, args.userId),
          eq(memberships.organizationId, STRONG_FOAM_ORGANIZATION_ID),
        ),
      );
    await tx.insert(userEvents).values({
      userId: args.userId,
      actor: args.actor,
      kind: args.active ? "user_activated" : "user_deactivated",
      summary: `${rows[0].displayName} ${
        args.active ? "activated" : "deactivated"
      }`,
    });
  });
  const identity = await getUserIdentityById(args.userId);
  if (!identity) return null;
  const userRows = await db
    .select()
    .from(users)
    .where(eq(users.id, args.userId))
    .limit(1);
  const user = userRows[0];
  return user
    ? { ...identity, createdAt: user.createdAt, updatedAt: user.updatedAt }
    : null;
}

export async function updateUser(args: {
  userId: string;
  actor: string;
  input: UserUpdateInput;
}): Promise<UserListItem | null> {
  if (isDemoOpsStore()) return updateDemoUser(args);
  const db = getDb();
  return db.transaction(async (tx) => {
    const duplicates = await tx
      .select({ id: users.id })
      .from(users)
      .where(
        and(
          eq(users.email, args.input.email),
          sql`${users.id} <> ${args.userId}`,
        ),
      )
      .limit(1);
    if (duplicates.length > 0) return null;
    const currentRows = await tx
      .select({ user: users, membership: memberships })
      .from(users)
      .innerJoin(memberships, eq(memberships.userId, users.id))
      .where(
        and(
          eq(users.id, args.userId),
          eq(memberships.organizationId, STRONG_FOAM_ORGANIZATION_ID),
        ),
      )
      .limit(1);
    const current = currentRows[0];
    if (!current) return null;
    const now = new Date();
    const updatedRows = await tx
      .update(users)
      .set({
        displayName: args.input.displayName,
        email: args.input.email,
        sessionVersion: sql`${users.sessionVersion} + 1`,
        updatedAt: now,
      })
      .where(eq(users.id, args.userId))
      .returning();
    const updated = updatedRows[0];
    if (!updated) return null;
    await tx
      .update(memberships)
      .set({ role: args.input.role, updatedAt: now })
      .where(
        and(
          eq(memberships.userId, args.userId),
          eq(memberships.organizationId, STRONG_FOAM_ORGANIZATION_ID),
        ),
      );
    const foremanAssignments = await tx
      .select({ jobId: jobAssignments.jobId })
      .from(jobAssignments)
      .where(
        and(
          eq(jobAssignments.userId, args.userId),
          eq(jobAssignments.role, "foreman"),
        ),
      );
    for (const assignment of foremanAssignments) {
      await tx
        .update(jobs)
        .set({ foreman: args.input.displayName, updatedAt: now })
        .where(eq(jobs.id, assignment.jobId));
    }
    await tx.insert(userEvents).values({
      userId: args.userId,
      actor: args.actor,
      kind: "user_updated",
      summary: `${args.input.displayName} profile or role updated`,
      payload: {
        before: {
          displayName: current.user.displayName,
          email: current.user.email,
          role: current.membership.role,
        },
        after: {
          displayName: args.input.displayName,
          email: args.input.email,
          role: args.input.role,
        },
      },
    });
    const identity = mapIdentity({
      user: updated,
      membership: {
        ...current.membership,
        role: args.input.role,
        updatedAt: now,
      },
    });
    return identity
      ? { ...identity, createdAt: updated.createdAt, updatedAt: updated.updatedAt }
      : null;
  });
}

export async function resetUserPassword(args: {
  userId: string;
  actor: string;
  passwordHash: string;
}): Promise<UserListItem | null> {
  if (isDemoOpsStore()) return resetDemoUserPassword(args);
  const db = getDb();
  const updated = await db.transaction(async (tx) => {
    const rows = await tx
      .update(users)
      .set({
        passwordHash: args.passwordHash,
        sessionVersion: sql`${users.sessionVersion} + 1`,
        updatedAt: new Date(),
      })
      .where(eq(users.id, args.userId))
      .returning();
    const user = rows[0];
    if (!user) return null;
    await tx.insert(userEvents).values({
      userId: args.userId,
      actor: args.actor,
      kind: "password_reset",
      summary: `${user.displayName} password reset and sessions revoked`,
    });
    return user;
  });
  if (!updated) return null;
  const identity = await getUserIdentityById(args.userId);
  return identity
    ? { ...identity, createdAt: updated.createdAt, updatedAt: updated.updatedAt }
    : null;
}

export async function revokeUserSessions(args: {
  userId: string;
  actor: string;
}): Promise<UserListItem | null> {
  if (isDemoOpsStore()) return revokeDemoUserSessions(args);
  const db = getDb();
  const updated = await db.transaction(async (tx) => {
    const rows = await tx
      .update(users)
      .set({
        sessionVersion: sql`${users.sessionVersion} + 1`,
        updatedAt: new Date(),
      })
      .where(eq(users.id, args.userId))
      .returning();
    const user = rows[0];
    if (!user) return null;
    await tx.insert(userEvents).values({
      userId: args.userId,
      actor: args.actor,
      kind: "sessions_revoked",
      summary: `${user.displayName} sessions revoked`,
    });
    return user;
  });
  if (!updated) return null;
  const identity = await getUserIdentityById(args.userId);
  return identity
    ? { ...identity, createdAt: updated.createdAt, updatedAt: updated.updatedAt }
    : null;
}

export async function listEstimateRequests(
  filters: EstimateRequestFilters = {},
): Promise<EstimateRequestRow[]> {
  if (isDemoOpsStore()) return listDemoEstimateRequests(filters);
  const db = getDb();
  const conditions = [];
  const query = filters.q?.trim();

  if (query) {
    conditions.push(
      or(
        ilike(leads.company, like(query)),
        ilike(leads.firstName, like(query)),
        ilike(leads.lastName, like(query)),
        ilike(leads.email, like(query)),
        ilike(leads.phone, like(query)),
        ilike(leads.city, like(query)),
        ilike(sql<string>`${leads.id}::text`, like(query)),
      ),
    );
  }
  if (filters.workflowStatus && isWorkflowStatus(filters.workflowStatus)) {
    conditions.push(eq(leads.workflowStatus, filters.workflowStatus));
  }
  if (
    filters.qualification === "qualified" ||
    filters.qualification === "secondary"
  ) {
    conditions.push(eq(leads.status, filters.qualification));
  }
  const range = parseDateRange(filters);
  if (range.from) conditions.push(gte(leads.createdAt, startOfDay(range.from)));
  if (range.to) conditions.push(lte(leads.createdAt, endOfDay(range.to)));

  return db
    .select()
    .from(leads)
    .where(conditions.length ? and(...conditions) : undefined)
    .orderBy(desc(leads.createdAt));
}

export async function getEstimateRequest(
  id: string,
): Promise<EstimateRequestRow | null> {
  if (isDemoOpsStore()) return getDemoEstimateRequest(id);
  const db = getDb();
  const rows = await db.select().from(leads).where(eq(leads.id, id)).limit(1);
  return rows[0] ?? null;
}

export async function listEstimateRequestEvents(
  leadId: string,
): Promise<EstimateRequestEvent[]> {
  if (isDemoOpsStore()) return listDemoEstimateRequestEvents(leadId);
  const db = getDb();
  return db
    .select()
    .from(estimateRequestEvents)
    .where(eq(estimateRequestEvents.leadId, leadId))
    .orderBy(desc(estimateRequestEvents.createdAt));
}

export async function updateEstimateRequest(args: {
  id: string;
  actor: string;
  update: EstimateRequestUpdate;
}): Promise<EstimateRequestRow | null> {
  if (isDemoOpsStore()) {
    return updateDemoEstimateRequest(args);
  }

  const existing = await getEstimateRequest(args.id);
  if (!existing) return null;

  const db = getDb();
  const now = new Date();
  const rows = await db
    .update(leads)
    .set({
      workflowStatus: args.update.workflowStatus,
      assignedTo: args.update.assignedTo,
      nextAction: args.update.nextAction,
      nextActionDueAt: args.update.nextActionDueAt,
      lostReason: args.update.lostReason,
      updatedAt: now,
    })
    .where(eq(leads.id, args.id))
    .returning();
  const updated = rows[0];
  if (!updated) return null;

  const changes: string[] = [];
  if (existing.workflowStatus !== updated.workflowStatus) {
    changes.push(
      `status ${existing.workflowStatus} → ${updated.workflowStatus}`,
    );
  }
  if (existing.assignedTo !== updated.assignedTo) {
    changes.push(
      `owner ${existing.assignedTo ?? "unassigned"} → ${updated.assignedTo ?? "unassigned"}`,
    );
  }
  if (existing.nextAction !== updated.nextAction) {
    changes.push("next action updated");
  }
  if (
    existing.nextActionDueAt?.toISOString() !==
    updated.nextActionDueAt?.toISOString()
  ) {
    changes.push("due date updated");
  }
  if (args.update.note) changes.push("internal note added");

  if (changes.length > 0) {
    await db.insert(estimateRequestEvents).values({
      leadId: args.id,
      actor: args.actor,
      kind: "review_update",
      summary: changes.join("; "),
      payload: {
        before: {
          workflowStatus: existing.workflowStatus,
          assignedTo: existing.assignedTo,
          nextAction: existing.nextAction,
          nextActionDueAt: existing.nextActionDueAt,
          lostReason: existing.lostReason,
        },
        after: {
          workflowStatus: updated.workflowStatus,
          assignedTo: updated.assignedTo,
          nextAction: updated.nextAction,
          nextActionDueAt: updated.nextActionDueAt,
          lostReason: updated.lostReason,
        },
        note: args.update.note ?? null,
      },
    });
  }

  if (updated.opportunityId && updated.workflowStatus === "won") {
    await db
      .update(opportunities)
      .set({ stage: "won", updatedAt: now })
      .where(eq(opportunities.id, updated.opportunityId));
  }

  return updated;
}

async function recordEvent(args: {
  leadId: string;
  actor: string;
  kind: string;
  summary: string;
  payload: Record<string, unknown>;
}) {
  const db = getDb();
  await db.insert(estimateRequestEvents).values(args);
}

export async function listEstimateRequestTasks(
  leadId: string,
): Promise<EstimateRequestTask[]> {
  if (isDemoOpsStore()) return listDemoEstimateRequestTasks(leadId);
  const db = getDb();
  return db
    .select()
    .from(estimateRequestTasks)
    .where(eq(estimateRequestTasks.leadId, leadId))
    .orderBy(desc(estimateRequestTasks.createdAt));
}

export async function listEstimateRequestComments(
  leadId: string,
): Promise<EstimateRequestComment[]> {
  if (isDemoOpsStore()) return listDemoEstimateRequestComments(leadId);
  const db = getDb();
  return db
    .select()
    .from(estimateRequestComments)
    .where(eq(estimateRequestComments.leadId, leadId))
    .orderBy(desc(estimateRequestComments.createdAt));
}

export async function addEstimateRequestTask(args: {
  leadId: string;
  actor: string;
  title: string;
  assignee: string | null;
  dueAt: Date | null;
}): Promise<EstimateRequestTask | null> {
  if (isDemoOpsStore()) return addDemoEstimateRequestTask(args);
  if (!(await getEstimateRequest(args.leadId))) return null;
  const db = getDb();
  const rows = await db
    .insert(estimateRequestTasks)
    .values({
      leadId: args.leadId,
      title: args.title,
      assignee: args.assignee,
      dueAt: args.dueAt,
      status: "open",
      createdBy: args.actor,
    })
    .returning();
  const task = rows[0];
  if (!task) return null;
  await recordEvent({
    leadId: args.leadId,
    actor: args.actor,
    kind: "task_created",
    summary: `task created: ${args.title}`,
    payload: { taskId: task.id, title: args.title },
  });
  return task;
}

export async function setEstimateRequestTaskStatus(args: {
  leadId: string;
  taskId: string;
  actor: string;
  status: TaskStatus;
}): Promise<EstimateRequestTask | null> {
  if (isDemoOpsStore()) return setDemoEstimateRequestTaskStatus(args);
  const db = getDb();
  const rows = await db
    .update(estimateRequestTasks)
    .set({ status: args.status, updatedAt: new Date() })
    .where(
      and(
        eq(estimateRequestTasks.id, args.taskId),
        eq(estimateRequestTasks.leadId, args.leadId),
      ),
    )
    .returning();
  const task = rows[0];
  if (!task) return null;
  await recordEvent({
    leadId: args.leadId,
    actor: args.actor,
    kind: args.status === "done" ? "task_completed" : "task_reopened",
    summary:
      args.status === "done"
        ? `task completed: ${task.title}`
        : `task reopened: ${task.title}`,
    payload: { taskId: task.id, status: args.status },
  });
  return task;
}

export async function addEstimateRequestComment(args: {
  leadId: string;
  actor: string;
  body: string;
}): Promise<EstimateRequestComment | null> {
  if (isDemoOpsStore()) return addDemoEstimateRequestComment(args);
  if (!(await getEstimateRequest(args.leadId))) return null;
  const db = getDb();
  const rows = await db
    .insert(estimateRequestComments)
    .values({
      leadId: args.leadId,
      actor: args.actor,
      body: args.body,
    })
    .returning();
  const comment = rows[0];
  if (!comment) return null;
  await recordEvent({
    leadId: args.leadId,
    actor: args.actor,
    kind: "comment_added",
    summary: "internal comment added",
    payload: { commentId: comment.id, body: args.body },
  });
  return comment;
}

export function staffFileHref(
  leadId: string,
  fileIndex: number,
  secret = process.env.LEAD_THANKS_SECRET ?? "",
): string | null {
  if (!secret) return null;
  const token = signLeadId(`${leadId}:${fileIndex}`, secret);
  return `/api/files/${leadId}/${fileIndex}?token=${token}`;
}

export async function listCompanies(
  filters: CompanyListFilters = {},
): Promise<CompanyRow[]> {
  if (isDemoOpsStore()) return listDemoCompanies(filters);
  const db = getDb();
  const query = filters.q?.trim();
  return db
    .select()
    .from(companies)
    .where(
      query
        ? or(
            ilike(companies.name, like(query)),
            ilike(companies.email, like(query)),
            ilike(companies.city, like(query)),
            ilike(companies.phone, like(query)),
          )
        : undefined,
    )
    .orderBy(companies.name);
}

export async function getCompany(id: string): Promise<CompanyRow | null> {
  if (isDemoOpsStore()) return getDemoCompany(id);
  const db = getDb();
  const rows = await db.select().from(companies).where(eq(companies.id, id)).limit(1);
  return rows[0] ?? null;
}

export async function listContacts(companyId?: string): Promise<ContactRow[]> {
  if (isDemoOpsStore()) return listDemoContacts(companyId);
  const db = getDb();
  return db
    .select()
    .from(contacts)
    .where(companyId ? eq(contacts.companyId, companyId) : undefined)
    .orderBy(contacts.lastName);
}

export async function getContact(id: string): Promise<ContactRow | null> {
  if (isDemoOpsStore()) return getDemoContact(id);
  const db = getDb();
  const rows = await db.select().from(contacts).where(eq(contacts.id, id)).limit(1);
  return rows[0] ?? null;
}

export async function listSites(companyId?: string): Promise<SiteRow[]> {
  if (isDemoOpsStore()) return listDemoSites(companyId);
  const db = getDb();
  return db
    .select()
    .from(sites)
    .where(companyId ? eq(sites.companyId, companyId) : undefined)
    .orderBy(sites.name);
}

export async function getSite(id: string): Promise<SiteRow | null> {
  if (isDemoOpsStore()) return getDemoSite(id);
  const db = getDb();
  const rows = await db.select().from(sites).where(eq(sites.id, id)).limit(1);
  return rows[0] ?? null;
}

export async function listOpportunities(
  filters: OpportunityListFilters = {},
): Promise<OpportunityRow[]> {
  if (isDemoOpsStore()) return listDemoOpportunities(filters);
  const db = getDb();
  const conditions = [];
  const query = filters.q?.trim();
  if (filters.companyId) conditions.push(eq(opportunities.companyId, filters.companyId));
  if (filters.stage) conditions.push(eq(opportunities.stage, filters.stage));
  if (query) {
    conditions.push(
      or(
        ilike(opportunities.name, like(query)),
        ilike(opportunities.owner, like(query)),
        ilike(opportunities.source, like(query)),
      ),
    );
  }
  const range = parseDateRange(filters);
  if (range.from) conditions.push(gte(opportunities.createdAt, startOfDay(range.from)));
  if (range.to) conditions.push(lte(opportunities.createdAt, endOfDay(range.to)));
  return db
    .select()
    .from(opportunities)
    .where(conditions.length ? and(...conditions) : undefined)
    .orderBy(desc(opportunities.createdAt));
}

export async function getOpportunity(id: string): Promise<OpportunityRow | null> {
  if (isDemoOpsStore()) return getDemoOpportunity(id);
  const db = getDb();
  const rows = await db
    .select()
    .from(opportunities)
    .where(eq(opportunities.id, id))
    .limit(1);
  return rows[0] ?? null;
}

export async function getRequestCrmRecords(
  request: EstimateRequestRow,
): Promise<RequestCrmRecords> {
  const [company, contact, site, opportunity] = await Promise.all([
    request.companyId ? getCompany(request.companyId) : null,
    request.contactId ? getContact(request.contactId) : null,
    request.siteId ? getSite(request.siteId) : null,
    request.opportunityId ? getOpportunity(request.opportunityId) : null,
  ]);
  return { company, contact, site, opportunity };
}

export async function convertRequestToCrm(args: {
  leadId: string;
  actor: string;
  input: CrmConversionInput;
}): Promise<CrmConversionResult> {
  if (isDemoOpsStore()) return convertDemoRequestToCrm(args);

  const request = await getEstimateRequest(args.leadId);
  if (!request) return { ok: false, error: "That request could not be found." };
  if (request.opportunityId) {
    return { ok: false, error: "This request is already linked to CRM records." };
  }

  const db = getDb();
  const now = new Date();
  const created = { company: false, contact: false, site: false };

  let company = args.input.linkCompanyId
    ? await getCompany(args.input.linkCompanyId)
    : null;
  if (args.input.linkCompanyId && !company) {
    return { ok: false, error: "The selected company could not be found." };
  }
  if (!company) {
    const rows = await db
      .insert(companies)
      .values({
        name: args.input.companyName,
        email: args.input.email,
        phone: args.input.phone || null,
        city: args.input.city,
        province: args.input.province,
      })
      .returning();
    company = rows[0] ?? null;
    created.company = true;
  }
  if (!company) return { ok: false, error: "The company could not be saved." };

  let contact = args.input.linkContactId
    ? await getContact(args.input.linkContactId)
    : null;
  if (args.input.linkContactId && !contact) {
    return { ok: false, error: "The selected contact could not be found." };
  }
  if (!contact) {
    const rows = await db
      .insert(contacts)
      .values({
        companyId: company.id,
        firstName: args.input.firstName,
        lastName: args.input.lastName,
        email: args.input.email,
        phone: args.input.phone || "",
        role: args.input.role,
      })
      .returning();
    contact = rows[0] ?? null;
    created.contact = true;
  } else if (!contact.companyId) {
    const rows = await db
      .update(contacts)
      .set({ companyId: company.id, updatedAt: now })
      .where(eq(contacts.id, contact.id))
      .returning();
    contact = rows[0] ?? contact;
  }
  if (!contact) return { ok: false, error: "The contact could not be saved." };

  const existingSites = await db
    .select()
    .from(sites)
    .where(eq(sites.companyId, company.id));
  let site =
    existingSites.find(
      (item) =>
        item.city.toLowerCase() === args.input.city.toLowerCase() &&
        item.province === args.input.province,
    ) ?? null;
  if (!site) {
    const rows = await db
      .insert(sites)
      .values({
        companyId: company.id,
        name: args.input.siteName,
        city: args.input.city,
        province: args.input.province,
      })
      .returning();
    site = rows[0] ?? null;
    created.site = true;
  }
  if (!site) return { ok: false, error: "The site could not be saved." };

  const opportunityRows = await db
    .insert(opportunities)
    .values({
      companyId: company.id,
      contactId: contact.id,
      siteId: site.id,
      sourceLeadId: request.id,
      name: args.input.opportunityName,
      stage: args.input.stage,
      owner: args.input.owner,
      source: args.input.source,
      services: args.input.services,
      projectType: args.input.projectType,
    })
    .returning();
  const opportunity = opportunityRows[0];
  if (!opportunity) {
    return { ok: false, error: "The opportunity could not be saved." };
  }

  await db
    .update(leads)
    .set({
      companyId: company.id,
      contactId: contact.id,
      siteId: site.id,
      opportunityId: opportunity.id,
      updatedAt: now,
    })
    .where(eq(leads.id, request.id));

  await recordEvent({
    leadId: request.id,
    actor: args.actor,
    kind: "crm_converted",
    summary: created.company
      ? `created CRM records for ${company.name}`
      : `linked CRM records for ${company.name}`,
    payload: {
      companyId: company.id,
      contactId: contact.id,
      siteId: site.id,
      opportunityId: opportunity.id,
      created,
    },
  });

  return {
    ok: true,
    companyId: company.id,
    contactId: contact.id,
    siteId: site.id,
    opportunityId: opportunity.id,
    created,
  };
}

export async function listProjects(
  filters: string | ProjectListFilters = {},
): Promise<ProjectRow[]> {
  const resolved = typeof filters === "string" ? { companyId: filters } : filters;
  if (isDemoOpsStore()) return listDemoProjects(resolved);
  const db = getDb();
  const conditions = [];
  const query = resolved.q?.trim();
  if (resolved.companyId) conditions.push(eq(projects.companyId, resolved.companyId));
  if (resolved.status) conditions.push(eq(projects.status, resolved.status));
  if (query) {
    conditions.push(
      or(
        ilike(projects.name, like(query)),
        ilike(projects.projectManager, like(query)),
      ),
    );
  }
  const range = parseDateRange(resolved);
  if (range.from) conditions.push(gte(projects.createdAt, startOfDay(range.from)));
  if (range.to) conditions.push(lte(projects.createdAt, endOfDay(range.to)));
  return db
    .select()
    .from(projects)
    .where(conditions.length ? and(...conditions) : undefined)
    .orderBy(desc(projects.createdAt));
}

const PORTFOLIO_PROJECT_LIMIT = 250;
const PORTFOLIO_JOB_LIMIT = 2_000;
const PORTFOLIO_TASK_LIMIT = 5_000;
const PORTFOLIO_DEPENDENCY_LIMIT = 10_000;
const PORTFOLIO_CALENDAR_EXCEPTION_LIMIT = 5_000;
const PORTFOLIO_BASELINE_ITEM_LIMIT = 5_000;

export async function listPortfolioSchedule(
  filters: PortfolioScheduleStoreFilters = {},
): Promise<PortfolioScheduleStoreResult> {
  if (isDemoOpsStore()) return listDemoPortfolioSchedule(filters);

  const db = getDb();
  const conditions = [];
  const query = filters.q?.trim();
  const projectStatus = filters.projectStatus?.trim();
  const projectManager = filters.projectManager?.trim();
  if (projectStatus) conditions.push(eq(projects.status, projectStatus));
  if (projectManager) {
    conditions.push(eq(projects.projectManager, projectManager));
  }
  if (query) {
    conditions.push(
      or(
        ilike(projects.name, like(query)),
        ilike(projects.projectManager, like(query)),
      ),
    );
  }

  const projectRows = await db
    .select()
    .from(projects)
    .where(conditions.length ? and(...conditions) : undefined)
    .orderBy(desc(projects.createdAt), asc(projects.id))
    .limit(PORTFOLIO_PROJECT_LIMIT + 1);
  const selectedProjects = projectRows.slice(0, PORTFOLIO_PROJECT_LIMIT);
  if (selectedProjects.length === 0) {
    return {
      projects: [],
      jobs: [],
      tasks: [],
      dependencies: [],
      calendars: [],
      calendarExceptions: [],
      baselines: [],
      baselineItems: [],
      truncation: {
        projects: false,
        jobs: false,
        tasks: false,
        dependencies: false,
        calendarExceptions: false,
        baselineItems: false,
      },
    };
  }

  const projectIds = selectedProjects.map((project) => project.id);
  const [jobRows, dependencyRows, defaultCalendar, latestBaselines] =
    await Promise.all([
      db
        .select()
        .from(jobs)
        .where(inArray(jobs.projectId, projectIds))
        .orderBy(desc(jobs.createdAt), asc(jobs.id))
        .limit(PORTFOLIO_JOB_LIMIT + 1),
      db
        .select()
        .from(jobTaskDependencies)
        .where(inArray(jobTaskDependencies.projectId, projectIds))
        .orderBy(
          asc(jobTaskDependencies.createdAt),
          asc(jobTaskDependencies.id),
        )
        .limit(PORTFOLIO_DEPENDENCY_LIMIT + 1),
      ensureDefaultScheduleCalendar(),
      db
        .selectDistinctOn([projectScheduleBaselines.projectId])
        .from(projectScheduleBaselines)
        .where(
          and(
            inArray(projectScheduleBaselines.projectId, projectIds),
            sql`${projectScheduleBaselines.deletedAt} IS NULL`,
          ),
        )
        .orderBy(
          asc(projectScheduleBaselines.projectId),
          desc(projectScheduleBaselines.capturedAt),
          desc(projectScheduleBaselines.id),
        ),
    ]);

  const selectedJobs = jobRows.slice(0, PORTFOLIO_JOB_LIMIT);
  const renderedJobIds = selectedJobs.map((job) => job.id);
  const calendarIds = [
    ...new Set([
      defaultCalendar.id,
      ...selectedProjects.flatMap((project) =>
        project.scheduleCalendarId ? [project.scheduleCalendarId] : [],
      ),
    ]),
  ];
  const baselineIds = latestBaselines.map((baseline) => baseline.id);
  const [taskRows, selectedCalendars, calendarExceptions, baselineItemRows] =
    await Promise.all([
      renderedJobIds.length > 0
        ? db
            .select()
            .from(jobTasks)
            .where(inArray(jobTasks.jobId, renderedJobIds))
            .orderBy(asc(jobTasks.createdAt), asc(jobTasks.id))
            .limit(PORTFOLIO_TASK_LIMIT + 1)
        : Promise.resolve([]),
      db
        .select()
        .from(scheduleCalendars)
        .where(inArray(scheduleCalendars.id, calendarIds))
        .orderBy(asc(scheduleCalendars.createdAt), asc(scheduleCalendars.id)),
      db
        .select()
        .from(scheduleCalendarExceptions)
        .where(inArray(scheduleCalendarExceptions.calendarId, calendarIds))
        .orderBy(
          asc(scheduleCalendarExceptions.date),
          asc(scheduleCalendarExceptions.id),
        )
        .limit(PORTFOLIO_CALENDAR_EXCEPTION_LIMIT + 1),
      baselineIds.length > 0
        ? db
            .select()
            .from(projectScheduleBaselineItems)
            .where(
              inArray(projectScheduleBaselineItems.baselineId, baselineIds),
            )
            .orderBy(
              asc(projectScheduleBaselineItems.baselineId),
              asc(projectScheduleBaselineItems.entityType),
              asc(projectScheduleBaselineItems.entityId),
              asc(projectScheduleBaselineItems.id),
            )
            .limit(PORTFOLIO_BASELINE_ITEM_LIMIT + 1)
        : Promise.resolve([]),
    ]);

  return {
    projects: selectedProjects,
    jobs: selectedJobs,
    tasks: taskRows.slice(0, PORTFOLIO_TASK_LIMIT),
    dependencies: dependencyRows.slice(0, PORTFOLIO_DEPENDENCY_LIMIT),
    calendars: selectedCalendars,
    calendarExceptions: calendarExceptions.slice(
      0,
      PORTFOLIO_CALENDAR_EXCEPTION_LIMIT,
    ),
    baselines: latestBaselines,
    baselineItems: baselineItemRows.slice(0, PORTFOLIO_BASELINE_ITEM_LIMIT),
    truncation: {
      projects: projectRows.length > PORTFOLIO_PROJECT_LIMIT,
      jobs: jobRows.length > PORTFOLIO_JOB_LIMIT,
      tasks: taskRows.length > PORTFOLIO_TASK_LIMIT,
      dependencies:
        dependencyRows.length > PORTFOLIO_DEPENDENCY_LIMIT,
      calendarExceptions:
        calendarExceptions.length > PORTFOLIO_CALENDAR_EXCEPTION_LIMIT,
      baselineItems:
        baselineItemRows.length > PORTFOLIO_BASELINE_ITEM_LIMIT,
    },
  };
}

export async function getProject(id: string): Promise<ProjectRow | null> {
  if (isDemoOpsStore()) return getDemoProject(id);
  const db = getDb();
  const rows = await db.select().from(projects).where(eq(projects.id, id)).limit(1);
  return rows[0] ?? null;
}

export async function listJobs(filters: JobListFilters = {}): Promise<JobRow[]> {
  if (isDemoOpsStore()) return listDemoJobs(filters);
  const db = getDb();
  const conditions = [];
  const query = filters.q?.trim();
  if (filters.fieldUserId) {
    const [directAssignments, taskAssignments] = await Promise.all([
      db
        .select({ jobId: jobAssignments.jobId })
        .from(jobAssignments)
        .where(eq(jobAssignments.userId, filters.fieldUserId)),
      db
        .select({ jobId: jobTasks.jobId })
        .from(jobTasks)
        .where(eq(jobTasks.assigneeUserId, filters.fieldUserId)),
    ]);
    const accessibleJobIds = [
      ...new Set([
        ...directAssignments.map((assignment) => assignment.jobId),
        ...taskAssignments.map((assignment) => assignment.jobId),
      ]),
    ];
    if (accessibleJobIds.length === 0) return [];
    conditions.push(inArray(jobs.id, accessibleJobIds));
  }
  if (filters.projectId) conditions.push(eq(jobs.projectId, filters.projectId));
  if (filters.companyId) conditions.push(eq(jobs.companyId, filters.companyId));
  if (filters.status) conditions.push(eq(jobs.status, filters.status));
  if (query) {
    conditions.push(
      or(
        ilike(jobs.name, like(query)),
        ilike(jobs.scope, like(query)),
        ilike(jobs.foreman, like(query)),
        ilike(jobs.projectManager, like(query)),
      ),
    );
  }
  const range = parseDateRange(filters);
  const dateExpr = sql`coalesce(${jobs.plannedStartAt}, ${jobs.createdAt})`;
  if (range.from) conditions.push(gte(dateExpr, startOfDay(range.from)));
  if (range.to) conditions.push(lte(dateExpr, endOfDay(range.to)));
  return db
    .select()
    .from(jobs)
    .where(conditions.length ? and(...conditions) : undefined)
    .orderBy(desc(jobs.createdAt));
}

export async function getJob(id: string): Promise<JobRow | null> {
  if (isDemoOpsStore()) return getDemoJob(id);
  const db = getDb();
  const rows = await db.select().from(jobs).where(eq(jobs.id, id)).limit(1);
  return rows[0] ?? null;
}

export async function listJobAssignments(
  jobId: string,
): Promise<JobAssignmentView[]> {
  if (isDemoOpsStore()) return listDemoJobAssignments(jobId);
  const db = getDb();
  const rows = await db
    .select({ assignment: jobAssignments, user: users })
    .from(jobAssignments)
    .innerJoin(users, eq(users.id, jobAssignments.userId))
    .where(eq(jobAssignments.jobId, jobId))
    .orderBy(asc(users.displayName));
  return rows.map(({ assignment, user }) => ({
    id: assignment.id,
    jobId: assignment.jobId,
    userId: assignment.userId,
    role: assignment.role as JobAssignmentRole,
    displayName: user.displayName,
    email: user.email,
    active: user.active,
    createdAt: assignment.createdAt,
  }));
}

export async function listProjectJobAssignments(
  projectId: string,
): Promise<JobAssignmentView[]> {
  if (isDemoOpsStore()) {
    const projectJobs = listDemoJobs({ projectId });
    return projectJobs.flatMap((job) => listDemoJobAssignments(job.id));
  }
  const db = getDb();
  const rows = await db
    .select({ assignment: jobAssignments, user: users })
    .from(jobAssignments)
    .innerJoin(users, eq(users.id, jobAssignments.userId))
    .innerJoin(jobs, eq(jobs.id, jobAssignments.jobId))
    .where(eq(jobs.projectId, projectId))
    .orderBy(asc(users.displayName));
  return rows.map(({ assignment, user }) => ({
    id: assignment.id,
    jobId: assignment.jobId,
    userId: assignment.userId,
    role: assignment.role as JobAssignmentRole,
    displayName: user.displayName,
    email: user.email,
    active: user.active,
    createdAt: assignment.createdAt,
  }));
}

export async function addJobAssignment(args: {
  jobId: string;
  userId: string;
  role: JobAssignmentRole;
  actor: string;
}): Promise<JobAssignmentView | null> {
  if (isDemoOpsStore()) return addDemoJobAssignment(args);
  const [job, identity] = await Promise.all([
    getJob(args.jobId),
    getFieldIdentityById(args.userId),
  ]);
  if (
    !job ||
    !identity ||
    !identity.active ||
    !identity.membershipActive ||
    !isFieldMembershipRole(identity.role)
  ) {
    return null;
  }

  const db = getDb();
  const rows = await db
    .insert(jobAssignments)
    .values({
      jobId: args.jobId,
      userId: args.userId,
      role: args.role,
      createdBy: args.actor,
    })
    .onConflictDoUpdate({
      target: [jobAssignments.jobId, jobAssignments.userId],
      set: { role: args.role, createdBy: args.actor },
    })
    .returning();
  const assignment = rows[0];
  if (!assignment) return null;

  if (args.role === "foreman") {
    await db
      .update(jobs)
      .set({ foreman: identity.displayName, updatedAt: new Date() })
      .where(eq(jobs.id, args.jobId));
  }
  await db.insert(jobEvents).values({
    jobId: args.jobId,
    actor: args.actor,
    kind: "job_assigned",
    summary: `${identity.displayName} assigned as ${args.role}`,
    payload: { userId: args.userId, role: args.role },
  });

  return {
    id: assignment.id,
    jobId: assignment.jobId,
    userId: assignment.userId,
    role: assignment.role as JobAssignmentRole,
    displayName: identity.displayName,
    email: identity.email,
    active: identity.active,
    createdAt: assignment.createdAt,
  };
}

export async function removeJobAssignment(args: {
  jobId: string;
  assignmentId: string;
  actor: string;
}): Promise<JobAssignmentView | null> {
  if (isDemoOpsStore()) return removeDemoJobAssignment(args);
  const existing = (await listJobAssignments(args.jobId)).find(
    (assignment) => assignment.id === args.assignmentId,
  );
  if (!existing) return null;
  const db = getDb();
  const rows = await db
    .delete(jobAssignments)
    .where(
      and(
        eq(jobAssignments.id, args.assignmentId),
        eq(jobAssignments.jobId, args.jobId),
      ),
    )
    .returning();
  if (!rows[0]) return null;
  await db.insert(jobEvents).values({
    jobId: args.jobId,
    actor: args.actor,
    kind: "job_unassigned",
    summary: `${existing.displayName} removed from job`,
    payload: { userId: existing.userId, role: existing.role },
  });
  return existing;
}

export async function canFieldUserAccessJob(
  userId: string,
  jobId: string,
): Promise<boolean> {
  if (isDemoOpsStore()) return canDemoFieldUserAccessJob(userId, jobId);
  const db = getDb();
  const [direct, task] = await Promise.all([
    db
      .select({ id: jobAssignments.id })
      .from(jobAssignments)
      .where(
        and(
          eq(jobAssignments.userId, userId),
          eq(jobAssignments.jobId, jobId),
        ),
      )
      .limit(1),
    db
      .select({ id: jobTasks.id })
      .from(jobTasks)
      .where(
        and(
          eq(jobTasks.assigneeUserId, userId),
          eq(jobTasks.jobId, jobId),
        ),
      )
      .limit(1),
  ]);
  return direct.length > 0 || task.length > 0;
}

export async function canFieldUserAccessTask(
  userId: string,
  jobId: string,
  taskId: string,
): Promise<boolean> {
  if (isDemoOpsStore()) {
    return canDemoFieldUserAccessTask(userId, jobId, taskId);
  }
  const db = getDb();
  const [direct, task] = await Promise.all([
    db
      .select({ id: jobAssignments.id })
      .from(jobAssignments)
      .where(
        and(
          eq(jobAssignments.userId, userId),
          eq(jobAssignments.jobId, jobId),
        ),
      )
      .limit(1),
    db
      .select({ assigneeUserId: jobTasks.assigneeUserId })
      .from(jobTasks)
      .where(and(eq(jobTasks.id, taskId), eq(jobTasks.jobId, jobId)))
      .limit(1),
  ]);
  return (
    direct.length > 0 ||
    (task[0]?.assigneeUserId !== null &&
      task[0]?.assigneeUserId === userId)
  );
}

export async function listJobEvents(jobId: string): Promise<JobEventRow[]> {
  if (isDemoOpsStore()) return listDemoJobEvents(jobId);
  const db = getDb();
  return db
    .select()
    .from(jobEvents)
    .where(eq(jobEvents.jobId, jobId))
    .orderBy(desc(jobEvents.createdAt));
}

export async function listJobEventsSince(args: {
  jobIds: string[];
  after: Date;
  limit?: number;
}): Promise<JobEventRow[]> {
  const limit = Math.min(Math.max(args.limit ?? 100, 1), 500);
  if (args.jobIds.length === 0) return [];
  if (isDemoOpsStore()) {
    return listDemoJobEventsSince({
      jobIds: args.jobIds,
      after: args.after,
      limit,
    });
  }
  const db = getDb();
  return db
    .select()
    .from(jobEvents)
    .where(
      and(
        inArray(jobEvents.jobId, args.jobIds),
        gt(jobEvents.createdAt, args.after),
      ),
    )
    .orderBy(asc(jobEvents.createdAt))
    .limit(limit);
}

export async function convertOpportunityToProject(args: {
  opportunityId: string;
  actor: string;
  input: JobConversionInput;
}): Promise<{ ok: true; projectId: string; jobId: string } | { ok: false; error: string }> {
  if (isDemoOpsStore()) return convertDemoOpportunityToProject(args);

  const opportunity = await getOpportunity(args.opportunityId);
  if (!opportunity) {
    return { ok: false, error: "That opportunity could not be found." };
  }
  if (opportunity.projectId) {
    return { ok: false, error: "This opportunity already has a project." };
  }

  const request = opportunity.sourceLeadId
    ? await getEstimateRequest(opportunity.sourceLeadId)
    : null;
  if (
    !canConvertWonWork({
      workflowStatus: request?.workflowStatus,
      opportunityStage: opportunity.stage,
    })
  ) {
    return {
      ok: false,
      error: "Mark this work won before creating a project and job.",
    };
  }

  const db = getDb();
  const now = new Date();
  const projectRows = await db
    .insert(projects)
    .values({
      companyId: opportunity.companyId,
      siteId: opportunity.siteId,
      opportunityId: opportunity.id,
      sourceLeadId: opportunity.sourceLeadId,
      name: args.input.projectName,
      status: "active",
      projectManager: args.input.projectManager,
    })
    .returning();
  const project = projectRows[0];
  if (!project) return { ok: false, error: "The project could not be saved." };

  const jobRows = await db
    .insert(jobs)
    .values({
      projectId: project.id,
      companyId: opportunity.companyId,
      siteId: opportunity.siteId,
      opportunityId: opportunity.id,
      name: args.input.jobName,
      status: "draft",
      scope: args.input.scope || null,
      services: opportunity.services,
      projectManager: args.input.projectManager,
      foreman: args.input.foreman,
      plannedStartAt: args.input.plannedStartAt,
      plannedEndAt: args.input.plannedEndAt,
    })
    .returning();
  const job = jobRows[0];
  if (!job) return { ok: false, error: "The job could not be saved." };

  await db
    .update(opportunities)
    .set({ projectId: project.id, stage: "won", updatedAt: now })
    .where(eq(opportunities.id, opportunity.id));

  await db.insert(jobEvents).values({
    jobId: job.id,
    actor: args.actor,
    kind: "job_created",
    summary: `job created from won work: ${job.name}`,
    payload: { projectId: project.id, opportunityId: opportunity.id },
  });

  if (request) {
    await db
      .update(leads)
      .set({ workflowStatus: "won", updatedAt: now })
      .where(eq(leads.id, request.id));
    await recordEvent({
      leadId: request.id,
      actor: args.actor,
      kind: "project_created",
      summary: `project created: ${project.name}`,
      payload: { projectId: project.id, jobId: job.id },
    });
  }

  return { ok: true, projectId: project.id, jobId: job.id };
}

export async function addJobToProject(args: {
  projectId: string;
  actor: string;
  input: JobConversionInput;
}): Promise<{ ok: true; jobId: string } | { ok: false; error: string }> {
  if (isDemoOpsStore()) return addDemoJobToProject(args);
  const project = await getProject(args.projectId);
  if (!project) return { ok: false, error: "That project could not be found." };
  const db = getDb();
  const rows = await db
    .insert(jobs)
    .values({
      projectId: project.id,
      companyId: project.companyId,
      siteId: project.siteId,
      opportunityId: project.opportunityId,
      name: args.input.jobName,
      status: "draft",
      scope: args.input.scope || null,
      services: [],
      projectManager: args.input.projectManager ?? project.projectManager,
      foreman: args.input.foreman,
      plannedStartAt: args.input.plannedStartAt,
      plannedEndAt: args.input.plannedEndAt,
    })
    .returning();
  const job = rows[0];
  if (!job) return { ok: false, error: "The job could not be saved." };
  await db.insert(jobEvents).values({
    jobId: job.id,
    actor: args.actor,
    kind: "job_created",
    summary: `job added to project: ${job.name}`,
    payload: { projectId: project.id },
  });
  return { ok: true, jobId: job.id };
}

export async function updateJobStatus(args: {
  jobId: string;
  actor: string;
  status: JobStatus;
  blockerNote: string | null;
}): Promise<JobRow | null> {
  if (isDemoOpsStore()) return setDemoJobStatus(args);
  const existing = await getJob(args.jobId);
  if (!existing) return null;
  const db = getDb();
  const rows = await db
    .update(jobs)
    .set({
      status: args.status,
      blockerNote: args.blockerNote,
      updatedAt: new Date(),
    })
    .where(eq(jobs.id, args.jobId))
    .returning();
  const job = rows[0];
  if (!job) return null;
  await db.insert(jobEvents).values({
    jobId: job.id,
    actor: args.actor,
    kind: "job_status",
    summary: `status ${existing.status} → ${args.status}`,
    payload: {
      before: existing.status,
      after: args.status,
      blockerNote: args.blockerNote,
    },
  });
  return job;
}

export async function listWorkAreas(jobId: string): Promise<WorkAreaRow[]> {
  if (isDemoOpsStore()) return listDemoWorkAreas(jobId);
  const db = getDb();
  return db
    .select()
    .from(workAreas)
    .where(eq(workAreas.jobId, jobId))
    .orderBy(workAreas.sortOrder, workAreas.name);
}

export async function addWorkArea(args: {
  jobId: string;
  actor: string;
  input: WorkAreaInput;
}): Promise<WorkAreaRow | null> {
  if (isDemoOpsStore()) return addDemoWorkArea(args);
  if (!(await getJob(args.jobId))) return null;
  const db = getDb();
  const existing = await db
    .select({ sortOrder: workAreas.sortOrder })
    .from(workAreas)
    .where(eq(workAreas.jobId, args.jobId));
  const sortOrder =
    existing.reduce((max, area) => Math.max(max, area.sortOrder), -1) + 1;
  const rows = await db
    .insert(workAreas)
    .values({
      jobId: args.jobId,
      name: args.input.name,
      kind: args.input.kind,
      notes: args.input.notes,
      sortOrder,
    })
    .returning();
  const area = rows[0];
  if (!area) return null;
  await db.insert(jobEvents).values({
    jobId: args.jobId,
    actor: args.actor,
    kind: "work_area_added",
    summary: `work area added: ${area.name}`,
    payload: { workAreaId: area.id, kind: area.kind },
  });
  return area;
}

export async function listJobTasks(
  jobId: string,
  filters: JobTaskListFilters = {},
): Promise<JobTaskRow[]> {
  if (isDemoOpsStore()) return listDemoJobTasks(jobId, filters);
  const db = getDb();
  const conditions = [eq(jobTasks.jobId, jobId)];
  if (filters.status) conditions.push(eq(jobTasks.status, filters.status));
  const range = parseDateRange(filters);
  const dateExpr = sql`coalesce(${jobTasks.dueAt}, ${jobTasks.createdAt})`;
  if (range.from) conditions.push(gte(dateExpr, startOfDay(range.from)));
  if (range.to) conditions.push(lte(dateExpr, endOfDay(range.to)));
  const rows = await db
    .select()
    .from(jobTasks)
    .where(and(...conditions));
  return sortJobTaskRows(rows);
}

export async function listProjectJobTasks(
  projectId: string,
): Promise<{ tasks: JobTaskRow[]; truncated: boolean }> {
  if (isDemoOpsStore()) return listDemoProjectJobTasks(projectId);
  const db = getDb();
  const rows = await db
    .select({ task: jobTasks })
    .from(jobTasks)
    .innerJoin(jobs, eq(jobTasks.jobId, jobs.id))
    .where(eq(jobs.projectId, projectId))
    .orderBy(asc(jobTasks.createdAt))
    .limit(1_001);
  return {
    tasks: rows.slice(0, 1_000).map(({ task }) => task),
    truncated: rows.length > 1_000,
  };
}

export async function listProjectTaskDependencies(
  projectId: string,
): Promise<ProjectDependencyResult> {
  if (isDemoOpsStore()) {
    return listDemoProjectTaskDependencies(projectId);
  }
  const db = getDb();
  const rows = await db
    .select()
    .from(jobTaskDependencies)
    .where(eq(jobTaskDependencies.projectId, projectId))
    .orderBy(asc(jobTaskDependencies.createdAt))
    .limit(2_001);
  return {
    edges: rows.slice(0, 2_000),
    truncated: rows.length > 2_000,
  };
}

export async function addJobTaskDependency(args: {
  projectId: string;
  predecessorTaskId: string;
  successorTaskId: string;
  lagDays: number;
  actor: string;
}): Promise<
  | { ok: true; dependency: JobTaskDependencyRow }
  | { ok: false; error: string; field?: string }
> {
  if (isDemoOpsStore()) return addDemoJobTaskDependency(args);
  const db = getDb();
  const membership = await db
    .select({ task: jobTasks, projectId: jobs.projectId })
    .from(jobTasks)
    .innerJoin(jobs, eq(jobTasks.jobId, jobs.id))
    .where(
      inArray(jobTasks.id, [
        args.predecessorTaskId,
        args.successorTaskId,
      ]),
    );
  if (
    membership.length !== 2 ||
    membership.some((row) => row.projectId !== args.projectId)
  ) {
    return { ok: false, error: "Both tasks must belong to this project." };
  }

  const [taskResult, dependencyResult] = await Promise.all([
    listProjectJobTasks(args.projectId),
    listProjectTaskDependencies(args.projectId),
  ]);
  const validation = validateDependencyAddition(
    taskResult.tasks.map((task) => ({
      id: task.id,
      title: task.title,
      plannedStartAt: task.plannedStartAt?.toISOString() ?? null,
      plannedEndAt: task.plannedEndAt?.toISOString() ?? null,
    })),
    dependencyResult.edges,
    args,
  );
  if (!validation.ok) return validation;

  const rows = await db
    .insert(jobTaskDependencies)
    .values({
      projectId: args.projectId,
      predecessorTaskId: args.predecessorTaskId,
      successorTaskId: args.successorTaskId,
      lagDays: args.lagDays,
      createdBy: args.actor,
    })
    .returning();
  const dependency = rows[0];
  if (!dependency) {
    return { ok: false, error: "That dependency could not be saved." };
  }
  const successor = membership.find(
    (row) => row.task.id === args.successorTaskId,
  )?.task;
  if (successor) {
    await db.insert(jobEvents).values({
      jobId: successor.jobId,
      actor: args.actor,
      kind: "task_dependency_added",
      summary: `task dependency added: ${successor.title}`,
      payload: {
        dependencyId: dependency.id,
        predecessorTaskId: dependency.predecessorTaskId,
        successorTaskId: dependency.successorTaskId,
        lagDays: dependency.lagDays,
      },
    });
  }
  return { ok: true, dependency };
}

export async function deleteJobTaskDependency(args: {
  projectId: string;
  dependencyId: string;
  actor: string;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  if (isDemoOpsStore()) return deleteDemoJobTaskDependency(args);
  const db = getDb();
  const rows = await db
    .select()
    .from(jobTaskDependencies)
    .where(
      and(
        eq(jobTaskDependencies.id, args.dependencyId),
        eq(jobTaskDependencies.projectId, args.projectId),
      ),
    )
    .limit(1);
  const dependency = rows[0];
  if (!dependency) {
    return { ok: false, error: "That dependency could not be found." };
  }
  const successorRows = await db
    .select()
    .from(jobTasks)
    .where(eq(jobTasks.id, dependency.successorTaskId))
    .limit(1);
  const successor = successorRows[0];
  await db
    .delete(jobTaskDependencies)
    .where(eq(jobTaskDependencies.id, dependency.id));
  if (successor) {
    await db.insert(jobEvents).values({
      jobId: successor.jobId,
      actor: args.actor,
      kind: "task_dependency_removed",
      summary: `task dependency removed: ${successor.title}`,
      payload: {
        dependencyId: dependency.id,
        predecessorTaskId: dependency.predecessorTaskId,
        successorTaskId: dependency.successorTaskId,
        lagDays: dependency.lagDays,
      },
    });
  }
  return { ok: true };
}

export async function rescheduleJob(args: {
  projectId: string;
  jobId: string;
  plannedStartAt: Date | null;
  plannedEndAt: Date | null;
  expectedUpdatedAt: Date;
  actor: string;
}): Promise<
  { ok: true; job: JobRow } | { ok: false; error: string }
> {
  if (isDemoOpsStore()) return rescheduleDemoJob(args);
  if (
    args.plannedStartAt &&
    args.plannedEndAt &&
    args.plannedEndAt < args.plannedStartAt
  ) {
    return {
      ok: false,
      error: "Planned completion must be on or after planned start.",
    };
  }
  const db = getDb();
  const currentRows = await db
    .select()
    .from(jobs)
    .where(
      and(eq(jobs.id, args.jobId), eq(jobs.projectId, args.projectId)),
    )
    .limit(1);
  const current = currentRows[0];
  if (!current) return { ok: false, error: "That job could not be found." };
  if (current.updatedAt.getTime() !== args.expectedUpdatedAt.getTime()) {
    return {
      ok: false,
      error: "This schedule changed. Refresh and try again.",
    };
  }
  const acceptedUpdatedAt = new Date();
  const rows = await db
    .update(jobs)
    .set({
      plannedStartAt: args.plannedStartAt,
      plannedEndAt: args.plannedEndAt,
      updatedAt: acceptedUpdatedAt,
    })
    .where(
      and(
        eq(jobs.id, args.jobId),
        eq(jobs.projectId, args.projectId),
        eq(jobs.updatedAt, args.expectedUpdatedAt),
      ),
    )
    .returning();
  const job = rows[0];
  if (!job) {
    return {
      ok: false,
      error: "This schedule changed. Refresh and try again.",
    };
  }
  await db.insert(jobEvents).values({
    jobId: job.id,
    actor: args.actor,
    kind: "job_rescheduled",
    summary: `job rescheduled: ${job.name}`,
    payload: {
      before: {
        plannedStartAt: current.plannedStartAt?.toISOString() ?? null,
        plannedEndAt: current.plannedEndAt?.toISOString() ?? null,
      },
      after: {
        plannedStartAt: job.plannedStartAt?.toISOString() ?? null,
        plannedEndAt: job.plannedEndAt?.toISOString() ?? null,
      },
      expectedUpdatedAt: args.expectedUpdatedAt.toISOString(),
      acceptedUpdatedAt: job.updatedAt.toISOString(),
    },
  });
  return { ok: true, job };
}

export async function rescheduleJobTask(args: {
  projectId: string;
  jobId: string;
  taskId: string;
  plannedStartAt: Date | null;
  plannedEndAt: Date | null;
  dueAt: Date | null;
  expectedUpdatedAt: Date;
  actor: string;
}): Promise<
  { ok: true; task: JobTaskRow } | { ok: false; error: string }
> {
  if (isDemoOpsStore()) return rescheduleDemoJobTask(args);
  if (
    args.plannedStartAt &&
    args.plannedEndAt &&
    args.plannedEndAt < args.plannedStartAt
  ) {
    return {
      ok: false,
      error: "Planned completion must be on or after planned start.",
    };
  }
  const db = getDb();
  const currentRows = await db
    .select({ task: jobTasks, projectId: jobs.projectId })
    .from(jobTasks)
    .innerJoin(jobs, eq(jobTasks.jobId, jobs.id))
    .where(
      and(eq(jobTasks.id, args.taskId), eq(jobTasks.jobId, args.jobId)),
    )
    .limit(1);
  const current = currentRows[0]?.task;
  if (!current || currentRows[0]?.projectId !== args.projectId) {
    return { ok: false, error: "That task could not be found." };
  }
  if (current.updatedAt.getTime() !== args.expectedUpdatedAt.getTime()) {
    return {
      ok: false,
      error: "This schedule changed. Refresh and try again.",
    };
  }

  const [taskResult, dependencyResult] = await Promise.all([
    listProjectJobTasks(args.projectId),
    listProjectTaskDependencies(args.projectId),
  ]);
  const validation = validateDependencyDates(
    taskResult.tasks.map((task) => ({
      id: task.id,
      title: task.title,
      plannedStartAt:
        task.id === args.taskId
          ? args.plannedStartAt?.toISOString() ?? null
          : task.plannedStartAt?.toISOString() ?? null,
      plannedEndAt:
        task.id === args.taskId
          ? args.plannedEndAt?.toISOString() ?? null
          : task.plannedEndAt?.toISOString() ?? null,
    })),
    dependencyResult.edges,
  );
  if (!validation.ok) return { ok: false, error: validation.error };

  const acceptedUpdatedAt = new Date();
  const rows = await db
    .update(jobTasks)
    .set({
      plannedStartAt: args.plannedStartAt,
      plannedEndAt: args.plannedEndAt,
      dueAt: args.dueAt,
      updatedAt: acceptedUpdatedAt,
    })
    .where(
      and(
        eq(jobTasks.id, args.taskId),
        eq(jobTasks.jobId, args.jobId),
        eq(jobTasks.updatedAt, args.expectedUpdatedAt),
      ),
    )
    .returning();
  const task = rows[0];
  if (!task) {
    return {
      ok: false,
      error: "This schedule changed. Refresh and try again.",
    };
  }
  await db.insert(jobEvents).values({
    jobId: task.jobId,
    actor: args.actor,
    kind: "task_rescheduled",
    summary: `task rescheduled: ${task.title}`,
    payload: {
      before: {
        plannedStartAt: current.plannedStartAt?.toISOString() ?? null,
        plannedEndAt: current.plannedEndAt?.toISOString() ?? null,
        dueAt: current.dueAt?.toISOString() ?? null,
      },
      after: {
        plannedStartAt: task.plannedStartAt?.toISOString() ?? null,
        plannedEndAt: task.plannedEndAt?.toISOString() ?? null,
        dueAt: task.dueAt?.toISOString() ?? null,
      },
      expectedUpdatedAt: args.expectedUpdatedAt.toISOString(),
      acceptedUpdatedAt: task.updatedAt.toISOString(),
    },
  });
  return { ok: true, task };
}

export async function listProjectScheduleBaselines(
  projectId: string,
): Promise<ProjectScheduleBaselineRow[]> {
  if (isDemoOpsStore()) return listDemoProjectScheduleBaselines(projectId);
  const db = getDb();
  return db
    .select()
    .from(projectScheduleBaselines)
    .where(
      and(
        eq(projectScheduleBaselines.projectId, projectId),
        sql`${projectScheduleBaselines.deletedAt} IS NULL`,
      ),
    )
    .orderBy(desc(projectScheduleBaselines.capturedAt));
}

export async function getProjectScheduleBaseline(
  projectId: string,
  baselineId: string,
): Promise<{
  baseline: ProjectScheduleBaselineRow;
  items: ProjectScheduleBaselineItemRow[];
} | null> {
  if (isDemoOpsStore()) {
    return getDemoProjectScheduleBaseline(projectId, baselineId);
  }
  const db = getDb();
  const headers = await db
    .select()
    .from(projectScheduleBaselines)
    .where(
      and(
        eq(projectScheduleBaselines.id, baselineId),
        eq(projectScheduleBaselines.projectId, projectId),
      ),
    )
    .limit(1);
  const baseline = headers[0];
  if (!baseline) return null;
  const items = await db
    .select()
    .from(projectScheduleBaselineItems)
    .where(eq(projectScheduleBaselineItems.baselineId, baseline.id));
  return { baseline, items };
}

export async function captureProjectScheduleBaseline(args: {
  projectId: string;
  name: string;
  actor: string;
}): Promise<
  | {
      ok: true;
      baseline: ProjectScheduleBaselineRow;
      items: ProjectScheduleBaselineItemRow[];
    }
  | { ok: false; error: string }
> {
  if (isDemoOpsStore()) return captureDemoProjectScheduleBaseline(args);
  const name = args.name.trim();
  if (!name) return { ok: false, error: "A baseline name is required." };
  const project = await getProject(args.projectId);
  if (!project) return { ok: false, error: "That project could not be found." };
  const db = getDb();
  const [projectJobs, taskRows] = await Promise.all([
    listJobs({ projectId: args.projectId }),
    db
      .select({ task: jobTasks })
      .from(jobTasks)
      .innerJoin(jobs, eq(jobTasks.jobId, jobs.id))
      .where(eq(jobs.projectId, args.projectId)),
  ]);
  const baseline: ProjectScheduleBaselineRow = {
    id: crypto.randomUUID(),
    projectId: args.projectId,
    name,
    capturedAt: new Date(),
    capturedBy: args.actor,
    deletedAt: null,
    deletedBy: null,
  };
  const items: ProjectScheduleBaselineItemRow[] = [
    ...projectJobs.map((job) => ({
      id: crypto.randomUUID(),
      baselineId: baseline.id,
      entityType: "job",
      entityId: job.id,
      plannedStartAt: job.plannedStartAt,
      plannedEndAt: job.plannedEndAt,
      dueAt: null,
    })),
    ...taskRows.map(({ task }) => ({
      id: crypto.randomUUID(),
      baselineId: baseline.id,
      entityType: "task",
      entityId: task.id,
      plannedStartAt: task.plannedStartAt,
      plannedEndAt: task.plannedEndAt,
      dueAt: task.dueAt,
    })),
  ];
  const headerQuery = db.insert(projectScheduleBaselines).values(baseline);
  if (items.length > 0) {
    await db.batch([
      headerQuery,
      db.insert(projectScheduleBaselineItems).values(items),
    ]);
  } else {
    await db.batch([headerQuery]);
  }
  return { ok: true, baseline, items };
}

export async function removeProjectScheduleBaseline(args: {
  projectId: string;
  baselineId: string;
  actor: string;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  if (isDemoOpsStore()) return removeDemoProjectScheduleBaseline(args);
  const db = getDb();
  const rows = await db
    .update(projectScheduleBaselines)
    .set({ deletedAt: new Date(), deletedBy: args.actor })
    .where(
      and(
        eq(projectScheduleBaselines.id, args.baselineId),
        eq(projectScheduleBaselines.projectId, args.projectId),
        sql`${projectScheduleBaselines.deletedAt} IS NULL`,
      ),
    )
    .returning();
  return rows[0]
    ? { ok: true }
    : { ok: false, error: "That baseline could not be found." };
}

function isValidTimeZone(value: string): boolean {
  try {
    new Intl.DateTimeFormat("en", { timeZone: value }).format();
    return true;
  } catch {
    return false;
  }
}

function isValidIsoDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [year, month, day] = value.split("-").map(Number);
  const parsed = new Date(Date.UTC(year!, month! - 1, day!));
  return (
    parsed.getUTCFullYear() === year &&
    parsed.getUTCMonth() === month! - 1 &&
    parsed.getUTCDate() === day
  );
}

const DEFAULT_SCHEDULE_CALENDAR_UNIQUE_INDEX =
  "schedule_calendars_single_default_idx";

export function isDefaultScheduleCalendarConflict(error: unknown): boolean {
  const seen = new Set<unknown>();
  let candidate = error;
  while (
    typeof candidate === "object" &&
    candidate !== null &&
    !seen.has(candidate)
  ) {
    seen.add(candidate);
    const details = candidate as Record<string, unknown>;
    if (
      details.code === "23505" &&
      details.constraint === DEFAULT_SCHEDULE_CALENDAR_UNIQUE_INDEX
    ) {
      return true;
    }
    candidate = details.cause ?? details.sourceError;
  }
  return false;
}

export async function getOrCreateDefaultScheduleCalendar<T>(
  selectDefault: () => Promise<T | undefined>,
  insertDefault: () => Promise<T>,
): Promise<T> {
  const existing = await selectDefault();
  if (existing !== undefined) return existing;
  try {
    return await insertDefault();
  } catch (error) {
    if (!isDefaultScheduleCalendarConflict(error)) throw error;
    const winner = await selectDefault();
    if (winner !== undefined) return winner;
    throw error;
  }
}

async function ensureDefaultScheduleCalendar(
  actor = "system@strongfoam.com",
): Promise<ScheduleCalendarRow> {
  const db = getDb();
  const selectDefault = () =>
    db
      .select()
      .from(scheduleCalendars)
      .where(eq(scheduleCalendars.isDefault, true))
      .orderBy(asc(scheduleCalendars.createdAt), asc(scheduleCalendars.id))
      .limit(1);
  return getOrCreateDefaultScheduleCalendar(
    async () => (await selectDefault())[0],
    async () => {
      const rows = await db
        .insert(scheduleCalendars)
        .values({
          name: "Standard Monday–Friday",
          timeZone: "America/Toronto",
          weekendDays: [0, 6],
          isDefault: true,
          updatedBy: actor,
        })
        .returning();
      return rows[0]!;
    },
  );
}

export type ResolvedProjectScheduleCalendar = ResolvedWorkingCalendar & {
  id: string;
  name: string;
  updatedAt: string;
  updatedBy: string;
};

export async function resolveProjectScheduleCalendar(
  projectId: string,
): Promise<ResolvedProjectScheduleCalendar> {
  if (isDemoOpsStore()) {
    return resolveDemoProjectScheduleCalendar(projectId);
  }
  const project = await getProject(projectId);
  const db = getDb();
  let calendar: ScheduleCalendarRow | undefined;
  if (project?.scheduleCalendarId) {
    const rows = await db
      .select()
      .from(scheduleCalendars)
      .where(eq(scheduleCalendars.id, project.scheduleCalendarId))
      .limit(1);
    calendar = rows[0];
  }
  calendar ??= await ensureDefaultScheduleCalendar();
  const exceptions = await db
    .select()
    .from(scheduleCalendarExceptions)
    .where(eq(scheduleCalendarExceptions.calendarId, calendar.id))
    .orderBy(asc(scheduleCalendarExceptions.date));
  return {
    id: calendar.id,
    name: calendar.name,
    timeZone: calendar.timeZone,
    weekendDays: calendar.weekendDays,
    updatedAt: calendar.updatedAt.toISOString(),
    updatedBy: calendar.updatedBy,
    exceptions: exceptions.map((exception) => ({
      id: exception.id,
      date: exception.date,
      name: exception.name,
      isWorkingDay: exception.isWorkingDay,
    })),
  };
}

export async function saveProjectScheduleCalendar(args: {
  projectId: string;
  name: string;
  timeZone: string;
  weekendDays: number[];
  actor: string;
}): Promise<
  { ok: true; calendar: ScheduleCalendarRow } | { ok: false; error: string }
> {
  if (isDemoOpsStore()) return saveDemoProjectScheduleCalendar(args);
  const project = await getProject(args.projectId);
  if (!project) return { ok: false, error: "That project could not be found." };
  if (!args.name.trim()) {
    return { ok: false, error: "A calendar name is required." };
  }
  if (!isValidTimeZone(args.timeZone)) {
    return { ok: false, error: "Choose a valid IANA time zone." };
  }
  const weekendDays = [...new Set(args.weekendDays)].sort();
  if (
    weekendDays.some(
      (day) => !Number.isInteger(day) || day < 0 || day > 6,
    )
  ) {
    return { ok: false, error: "Weekend days must be between 0 and 6." };
  }
  const db = getDb();
  if (!project.scheduleCalendarId) {
    const rows = await db
      .insert(scheduleCalendars)
      .values({
        name: args.name.trim(),
        timeZone: args.timeZone,
        weekendDays,
        isDefault: false,
        updatedBy: args.actor,
      })
      .returning();
    const calendar = rows[0];
    if (!calendar) return { ok: false, error: "The calendar could not be saved." };
    await db
      .update(projects)
      .set({ scheduleCalendarId: calendar.id, updatedAt: new Date() })
      .where(eq(projects.id, args.projectId));
    return { ok: true, calendar };
  }
  const rows = await db
    .update(scheduleCalendars)
    .set({
      name: args.name.trim(),
      timeZone: args.timeZone,
      weekendDays,
      updatedAt: new Date(),
      updatedBy: args.actor,
    })
    .where(eq(scheduleCalendars.id, project.scheduleCalendarId))
    .returning();
  const calendar = rows[0];
  return calendar
    ? { ok: true, calendar }
    : { ok: false, error: "The calendar could not be saved." };
}

export async function upsertScheduleCalendarException(args: {
  projectId: string;
  calendarId: string;
  date: string;
  name: string;
  isWorkingDay: boolean;
  actor: string;
}): Promise<
  | { ok: true; exception: ScheduleCalendarExceptionRow }
  | { ok: false; error: string }
> {
  if (isDemoOpsStore()) return upsertDemoScheduleCalendarException(args);
  if (!isValidIsoDate(args.date)) {
    return { ok: false, error: "Use a valid calendar date." };
  }
  if (!args.name.trim()) {
    return { ok: false, error: "An exception name is required." };
  }
  const project = await getProject(args.projectId);
  if (!project || project.scheduleCalendarId !== args.calendarId) {
    return { ok: false, error: "That calendar could not be found." };
  }
  const db = getDb();
  const calendar = await db
    .select()
    .from(scheduleCalendars)
    .where(eq(scheduleCalendars.id, args.calendarId))
    .limit(1);
  if (!calendar[0]) return { ok: false, error: "That calendar could not be found." };
  const rows = await db
    .insert(scheduleCalendarExceptions)
    .values({
      calendarId: args.calendarId,
      date: args.date,
      name: args.name.trim(),
      isWorkingDay: args.isWorkingDay,
      updatedBy: args.actor,
    })
    .onConflictDoUpdate({
      target: [
        scheduleCalendarExceptions.calendarId,
        scheduleCalendarExceptions.date,
      ],
      set: {
        name: args.name.trim(),
        isWorkingDay: args.isWorkingDay,
        updatedAt: new Date(),
        updatedBy: args.actor,
      },
    })
    .returning();
  return { ok: true, exception: rows[0]! };
}

export async function removeScheduleCalendarException(args: {
  projectId: string;
  calendarId: string;
  exceptionId: string;
  actor: string;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  if (isDemoOpsStore()) return removeDemoScheduleCalendarException(args);
  const project = await getProject(args.projectId);
  if (!project || project.scheduleCalendarId !== args.calendarId) {
    return { ok: false, error: "That calendar exception could not be found." };
  }
  const db = getDb();
  const rows = await db
    .delete(scheduleCalendarExceptions)
    .where(
      and(
        eq(scheduleCalendarExceptions.id, args.exceptionId),
        eq(scheduleCalendarExceptions.calendarId, args.calendarId),
      ),
    )
    .returning();
  if (!rows[0]) {
    return { ok: false, error: "That calendar exception could not be found." };
  }
  await db
    .update(scheduleCalendars)
    .set({ updatedAt: new Date(), updatedBy: args.actor })
    .where(eq(scheduleCalendars.id, args.calendarId));
  return { ok: true };
}

export async function addJobTask(args: {
  jobId: string;
  actor: string;
  input: JobTaskInput;
}): Promise<JobTaskRow | null> {
  if (isDemoOpsStore()) return addDemoJobTask(args);
  if (!(await getJob(args.jobId))) return null;
  if (args.input.workAreaId) {
    const areas = await listWorkAreas(args.jobId);
    if (!areas.some((area) => area.id === args.input.workAreaId)) return null;
  }
  let assignee = args.input.assignee;
  if (args.input.assigneeUserId) {
    const identity = await getFieldIdentityById(args.input.assigneeUserId);
    if (
      !identity ||
      !identity.active ||
      !identity.membershipActive ||
      !isFieldMembershipRole(identity.role)
    ) {
      return null;
    }
    assignee = identity.displayName;
  }
  const db = getDb();
  const rows = await db
    .insert(jobTasks)
    .values({
      jobId: args.jobId,
      workAreaId: args.input.workAreaId,
      title: args.input.title,
      assignee,
      assigneeUserId: args.input.assigneeUserId,
      dueAt: args.input.dueAt,
      plannedStartAt: args.input.plannedStartAt,
      plannedEndAt: args.input.plannedEndAt,
      status: "open",
      createdBy: args.actor,
    })
    .returning();
  const task = rows[0];
  if (!task) return null;
  await db.insert(jobEvents).values({
    jobId: args.jobId,
    actor: args.actor,
    kind: "task_created",
    summary: `task created: ${task.title}`,
    payload: {
      taskId: task.id,
      workAreaId: task.workAreaId,
      plannedStartAt: task.plannedStartAt?.toISOString() ?? null,
      plannedEndAt: task.plannedEndAt?.toISOString() ?? null,
    },
  });
  return task;
}

export async function setJobTaskStatus(args: {
  jobId: string;
  taskId: string;
  actor: string;
  status: TaskStatus;
  expectedUpdatedAt?: Date;
  completedAt?: Date | null;
  restoredUpdatedAt?: Date;
}): Promise<JobTaskRow | null> {
  if (isDemoOpsStore()) return setDemoJobTaskStatus(args);
  const db = getDb();
  const conditions = [
    eq(jobTasks.id, args.taskId),
    eq(jobTasks.jobId, args.jobId),
  ];
  if (args.expectedUpdatedAt) {
    conditions.push(eq(jobTasks.updatedAt, args.expectedUpdatedAt));
  }
  const rows = await db
    .update(jobTasks)
    .set({
      status: args.status,
      completedAt:
        args.status === "done"
          ? args.completedAt === undefined
            ? new Date()
            : args.completedAt
          : null,
      updatedAt: args.restoredUpdatedAt ?? new Date(),
    })
    .where(and(...conditions))
    .returning();
  const task = rows[0];
  if (!task) return null;
  await db.insert(jobEvents).values({
    jobId: args.jobId,
    actor: args.actor,
    kind: args.status === "done" ? "task_completed" : "task_reopened",
    summary:
      args.status === "done"
        ? `task completed: ${task.title}`
        : `task reopened: ${task.title}`,
    payload: {
      taskId: task.id,
      status: args.status,
      completedAt: task.completedAt?.toISOString() ?? null,
    },
  });
  return task;
}

export async function listJobDocuments(
  jobId: string,
  filters: JobDocumentListFilters = {},
): Promise<JobDocumentRow[]> {
  if (isDemoOpsStore()) return listDemoJobDocuments(jobId, filters);
  const db = getDb();
  const conditions = [eq(jobDocuments.jobId, jobId)];
  if (filters.kind) conditions.push(eq(jobDocuments.kind, filters.kind));
  const range = parseDateRange(filters);
  if (range.from) conditions.push(gte(jobDocuments.createdAt, startOfDay(range.from)));
  if (range.to) conditions.push(lte(jobDocuments.createdAt, endOfDay(range.to)));
  return db
    .select()
    .from(jobDocuments)
    .where(and(...conditions))
    .orderBy(desc(jobDocuments.createdAt));
}

export async function addJobDocument(args: {
  jobId: string;
  actor: string;
  input: JobDocumentInput;
  bytes: Uint8Array;
}): Promise<JobDocumentRow | null> {
  if (isDemoOpsStore()) return addDemoJobDocument(args);
  throw new Error(
    "Database-backed job documents must use the authenticated Blob upload flow.",
  );
}

export async function recordUploadedJobDocument(args: {
  jobId: string;
  actor: string;
  input: JobDocumentInput;
  pathname: string;
}): Promise<JobDocumentRow | null> {
  if (isDemoOpsStore()) return null;
  if (!(await getJob(args.jobId))) return null;
  if (args.input.workAreaId) {
    const areas = await listWorkAreas(args.jobId);
    if (!areas.some((area) => area.id === args.input.workAreaId)) return null;
  }
  const db = getDb();
  const existing = await db
    .select()
    .from(jobDocuments)
    .where(eq(jobDocuments.pathname, args.pathname))
    .limit(1);
  if (existing[0]) return existing[0];

  const documentId = crypto.randomUUID();
  let sheetKey = documentId;
  let versionNumber = 1;
  let replacesDocumentId: string | null = null;
  let previousDocumentId: string | null = null;
  const previousId = args.input.replacesDocumentId ?? null;
  if (previousId) {
    const previousRows = await db
      .select()
      .from(jobDocuments)
      .where(
        and(eq(jobDocuments.id, previousId), eq(jobDocuments.jobId, args.jobId)),
      )
      .limit(1);
    const previous = previousRows[0];
    if (
      !previous ||
      !isCurrentPlanDocument(previous) ||
      args.input.kind !== "plan"
    ) {
      return null;
    }
    sheetKey = planSheetKey(previous);
    replacesDocumentId = previous.id;
    previousDocumentId = previous.id;
    versionNumber = previous.versionNumber + 1;
  }

  const insertDocument = db
    .insert(jobDocuments)
    .values({
      id: documentId,
      jobId: args.jobId,
      workAreaId: args.input.workAreaId,
      filename: args.input.filename,
      contentType: args.input.contentType,
      sizeBytes: args.input.sizeBytes,
      pathname: args.pathname,
      storage: "blob",
      kind: args.input.kind,
      uploadedBy: args.actor,
      sheetKey,
      versionNumber,
      replacesDocumentId,
    })
    .onConflictDoNothing({ target: jobDocuments.pathname });
  if (previousDocumentId) {
    await db.batch([
      db
        .update(jobDocuments)
        .set({ sheetKey, supersededAt: new Date() })
        .where(eq(jobDocuments.id, previousDocumentId)),
      insertDocument,
    ]);
  } else {
    await insertDocument;
  }
  const document = (
    await db
      .select()
      .from(jobDocuments)
      .where(eq(jobDocuments.pathname, args.pathname))
      .limit(1)
  )[0];
  if (!document) return null;
  if (document.id !== documentId) return document;
  try {
    await db.insert(jobEvents).values({
      jobId: args.jobId,
      actor: args.actor,
      kind: "document_uploaded",
      summary: `document uploaded: ${document.filename}`,
      payload: {
        documentId: document.id,
        kind: document.kind,
        workAreaId: document.workAreaId,
      },
    });
  } catch (error) {
    console.error("Could not record the document upload event.", error);
  }
  return document;
}

export async function getJobDocumentDownload(
  jobId: string,
  documentId: string,
): Promise<JobDocumentDownload | null> {
  if (isDemoOpsStore()) {
    const result = getDemoJobDocumentDownload(jobId, documentId);
    if (!result) return null;
    return {
      filename: result.document.filename,
      contentType: result.document.contentType,
      kind: "bytes",
      bytes: result.bytes,
    };
  }

  const db = getDb();
  const rows = await db
    .select()
    .from(jobDocuments)
    .where(and(eq(jobDocuments.id, documentId), eq(jobDocuments.jobId, jobId)))
    .limit(1);
  const document = rows[0];
  if (!document) return null;

  if (document.storage === "blob") {
    const { resolveFileUrl } = await import("@/lib/leads/adapters");
    const signedUrl = await resolveFileUrl(document.pathname, 5 * 60 * 1000);
    return {
      filename: document.filename,
      contentType: document.contentType,
      kind: "redirect",
      url: signedUrl,
    };
  }

  const bytes = getStoredJobDocumentBytes(document.id);
  if (!bytes) return null;
  return {
    filename: document.filename,
    contentType: document.contentType,
    kind: "bytes",
    bytes,
  };
}

export async function listJobPlanAnnotations(
  jobId: string,
  documentId?: string,
): Promise<JobPlanAnnotationRow[]> {
  if (isDemoOpsStore()) return listDemoJobPlanAnnotations(jobId, documentId);
  const db = getDb();
  const conditions = [
    eq(jobPlanAnnotations.jobId, jobId),
    sql`${jobPlanAnnotations.voidedAt} IS NULL`,
  ];
  if (documentId) conditions.push(eq(jobPlanAnnotations.documentId, documentId));
  return db
    .select()
    .from(jobPlanAnnotations)
    .where(and(...conditions))
    .orderBy(asc(jobPlanAnnotations.createdAt));
}

export async function getJobPlanAnnotation(
  jobId: string,
  annotationId: string,
): Promise<JobPlanAnnotationRow | null> {
  if (isDemoOpsStore()) return getDemoJobPlanAnnotation(jobId, annotationId);
  const db = getDb();
  const rows = await db
    .select()
    .from(jobPlanAnnotations)
    .where(
      and(
        eq(jobPlanAnnotations.id, annotationId),
        eq(jobPlanAnnotations.jobId, jobId),
      ),
    )
    .limit(1);
  return rows[0] ?? null;
}

export async function addJobPlanAnnotation(args: {
  jobId: string;
  actor: string;
  input: PlanAnnotationInput;
}): Promise<JobPlanAnnotationRow | null> {
  if (isDemoOpsStore()) return addDemoJobPlanAnnotation(args);
  const documentRows = await listJobDocuments(args.jobId);
  const document = documentRows.find((item) => item.id === args.input.documentId);
  if (!document || !isCurrentPlanDocument(document)) return null;
  if (args.input.workAreaId) {
    const areas = await listWorkAreas(args.jobId);
    if (!areas.some((area) => area.id === args.input.workAreaId)) return null;
  }
  if (args.input.taskId) {
    const tasks = await listJobTasks(args.jobId);
    if (!tasks.some((task) => task.id === args.input.taskId)) return null;
  }
  const db = getDb();
  return db.transaction(async (tx) => {
    const lockedDocuments = await tx
      .select()
      .from(jobDocuments)
      .where(
        and(
          eq(jobDocuments.id, args.input.documentId),
          eq(jobDocuments.jobId, args.jobId),
        ),
      )
      .for("update");
    const lockedDocument = lockedDocuments[0];
    if (!lockedDocument || !isCurrentPlanDocument(lockedDocument)) return null;

    const now = new Date();
    const rows = await tx
      .insert(jobPlanAnnotations)
      .values({
        jobId: args.jobId,
        documentId: args.input.documentId,
        pageNumber: args.input.pageNumber,
        x: args.input.x,
        y: args.input.y,
        kind: args.input.kind,
        geometry: args.input.geometry,
        status: args.input.status,
        trade: args.input.trade,
        title: args.input.title,
        body: args.input.body,
        workAreaId: args.input.workAreaId,
        taskId: args.input.taskId,
        createdBy: args.actor,
        completedAt: args.input.status === "completed" ? now : null,
        completedBy: args.input.status === "completed" ? args.actor : null,
      })
      .returning();
    const annotation = rows[0];
    if (!annotation) return null;
    await tx.insert(jobEvents).values({
      jobId: args.jobId,
      actor: args.actor,
      kind: "plan_annotation_added",
      summary: `plan mark added: ${annotation.title}`,
      payload: {
        annotationId: annotation.id,
        documentId: annotation.documentId,
        status: annotation.status,
        taskId: annotation.taskId,
      },
    });
    return annotation;
  });
}

export async function setJobPlanAnnotationStatus(args: {
  jobId: string;
  annotationId: string;
  actor: string;
  status: PlanAnnotationStatus;
  body?: string | null;
}): Promise<JobPlanAnnotationRow | null> {
  if (isDemoOpsStore()) return setDemoJobPlanAnnotationStatus(args);
  const existing = await getJobPlanAnnotation(args.jobId, args.annotationId);
  if (!existing || existing.voidedAt) return null;
  const documents = await listJobDocuments(args.jobId, { kind: "plan" });
  const document = documents.find((item) => item.id === existing.documentId);
  if (!document || !isCurrentPlanDocument(document)) return null;
  const now = new Date();
  const db = getDb();
  const rows = await db
    .update(jobPlanAnnotations)
    .set({
      status: args.status,
      body: args.body === undefined ? existing.body : args.body,
      completedAt: args.status === "completed" ? now : null,
      completedBy: args.status === "completed" ? args.actor : null,
      updatedAt: now,
    })
    .where(
      and(
        eq(jobPlanAnnotations.id, args.annotationId),
        eq(jobPlanAnnotations.jobId, args.jobId),
        sql`EXISTS (
          SELECT 1
          FROM ${jobDocuments}
          WHERE ${jobDocuments.id} = ${jobPlanAnnotations.documentId}
            AND ${jobDocuments.kind} = 'plan'
            AND ${jobDocuments.supersededAt} IS NULL
        )`,
      ),
    )
    .returning();
  const annotation = rows[0];
  if (!annotation) return null;
  await db.insert(jobEvents).values({
    jobId: args.jobId,
    actor: args.actor,
    kind:
      args.status === "completed"
        ? "plan_annotation_completed"
        : "plan_annotation_updated",
    summary: `plan mark ${args.status.replace("_", " ")}: ${annotation.title}`,
    payload: {
      annotationId: annotation.id,
      documentId: annotation.documentId,
      status: annotation.status,
      taskId: annotation.taskId,
    },
  });
  return annotation;
}

export async function voidJobPlanAnnotation(args: {
  jobId: string;
  annotationId: string;
  actor: string;
}): Promise<JobPlanAnnotationRow | null> {
  if (isDemoOpsStore()) return voidDemoJobPlanAnnotation(args);
  const existing = await getJobPlanAnnotation(args.jobId, args.annotationId);
  if (!existing || existing.voidedAt) return null;
  const documents = await listJobDocuments(args.jobId, { kind: "plan" });
  const document = documents.find((item) => item.id === existing.documentId);
  if (!document || !isCurrentPlanDocument(document)) return null;
  const now = new Date();
  const db = getDb();
  const rows = await db
    .update(jobPlanAnnotations)
    .set({
      voidedAt: now,
      voidedBy: args.actor,
      updatedAt: now,
    })
    .where(
      and(
        eq(jobPlanAnnotations.id, args.annotationId),
        eq(jobPlanAnnotations.jobId, args.jobId),
        sql`EXISTS (
          SELECT 1
          FROM ${jobDocuments}
          WHERE ${jobDocuments.id} = ${jobPlanAnnotations.documentId}
            AND ${jobDocuments.kind} = 'plan'
            AND ${jobDocuments.supersededAt} IS NULL
        )`,
      ),
    )
    .returning();
  const annotation = rows[0];
  if (!annotation) return null;
  await db.insert(jobEvents).values({
    jobId: args.jobId,
    actor: args.actor,
    kind: "plan_annotation_voided",
    summary: `plan mark voided: ${annotation.title}`,
    payload: {
      annotationId: annotation.id,
      documentId: annotation.documentId,
    },
  });
  return annotation;
}

export async function listJobFieldNotes(
  jobId: string,
  filters: JobFieldNoteListFilters = {},
): Promise<JobFieldNoteRow[]> {
  if (isDemoOpsStore()) return listDemoJobFieldNotes(jobId, filters);
  const db = getDb();
  const conditions = [eq(jobFieldNotes.jobId, jobId)];
  if (filters.kind) conditions.push(eq(jobFieldNotes.kind, filters.kind));
  if (filters.workAreaId) {
    conditions.push(eq(jobFieldNotes.workAreaId, filters.workAreaId));
  }
  const range = parseDateRange(filters);
  if (range.from) conditions.push(gte(jobFieldNotes.createdAt, startOfDay(range.from)));
  if (range.to) conditions.push(lte(jobFieldNotes.createdAt, endOfDay(range.to)));
  return db
    .select()
    .from(jobFieldNotes)
    .where(and(...conditions))
    .orderBy(desc(jobFieldNotes.createdAt));
}

export async function addJobFieldNote(args: {
  jobId: string;
  actor: string;
  input: FieldNoteInput;
}): Promise<JobFieldNoteRow | null> {
  if (isDemoOpsStore()) return addDemoJobFieldNote(args);
  if (!(await getJob(args.jobId))) return null;
  if (args.input.workAreaId) {
    const areas = await listWorkAreas(args.jobId);
    if (!areas.some((area) => area.id === args.input.workAreaId)) return null;
  }
  if (args.input.taskId) {
    const tasks = await listJobTasks(args.jobId);
    if (!tasks.some((task) => task.id === args.input.taskId)) return null;
  }

  const db = getDb();
  const rows = await db
    .insert(jobFieldNotes)
    .values({
      jobId: args.jobId,
      workAreaId: args.input.workAreaId,
      taskId: args.input.taskId,
      annotationId: args.input.annotationId ?? null,
      kind: args.input.kind,
      body: args.input.body,
      quantity: args.input.quantity,
      unit: args.input.unit,
      createdBy: args.actor,
    })
    .returning();
  const note = rows[0];
  if (!note) return null;

  const labels: Record<FieldNoteInput["kind"], string> = {
    note: "field note added",
    quantity: "quantity recorded",
    blocker: "blocker reported",
    deficiency: "deficiency recorded",
    material_request: "material request added",
    daily_report: "daily report submitted",
  };
  await db.insert(jobEvents).values({
    jobId: args.jobId,
    actor: args.actor,
    kind: `field_${args.input.kind}`,
    summary: `${labels[args.input.kind]}: ${note.body.slice(0, 80)}`,
    payload: {
      noteId: note.id,
      kind: note.kind,
      workAreaId: note.workAreaId,
      taskId: note.taskId,
      quantity: note.quantity,
      unit: note.unit,
    },
  });
  return note;
}

export async function recordTaskCommandEvent(args: {
  jobId: string;
  actor: string;
  kind: "task_command_applied" | "task_command_undone";
  summary: string;
  payload: Record<string, unknown>;
}): Promise<void> {
  if (isDemoOpsStore()) {
    recordDemoTaskCommandEvent(args);
    return;
  }
  const db = getDb();
  await db.insert(jobEvents).values({
    jobId: args.jobId,
    actor: args.actor,
    kind: args.kind,
    summary: args.summary,
    payload: args.payload,
  });
}

export async function recordScheduleDiffAccepted(args: {
  jobId: string;
  actor: string;
  noteId: string;
}): Promise<void> {
  if (isDemoOpsStore()) {
    recordDemoScheduleDiffAccepted(args);
    return;
  }
  const db = getDb();
  await db.insert(jobEvents).values({
    jobId: args.jobId,
    actor: args.actor,
    kind: "schedule_diff_accepted",
    summary: "schedule diff accepted",
    payload: { noteId: args.noteId },
  });
}

export async function recordAiJobEvent(args: {
  jobId: string;
  actor: string;
  capabilityId: "AI-008" | "AI-009";
  provider: string;
  model: string;
  citationIds: string[];
}): Promise<void> {
  if (isDemoOpsStore()) {
    recordDemoAiJobEvent(args);
    return;
  }
  const db = getDb();
  await db.insert(jobEvents).values({
    jobId: args.jobId,
    actor: args.actor,
    kind: "ai_requested",
    summary: `${args.capabilityId} requested`,
    payload: {
      capabilityId: args.capabilityId,
      provider: args.provider,
      model: args.model,
      citationIds: args.citationIds,
    },
  });
}

export async function listHomeExceptionSource() {
  if (isDemoOpsStore()) return listDemoHomeExceptionSource();
  const db = getDb();
  const since = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000);
  const [jobRows, taskRows, noteRows, voiceRows, eventRows, defaultCalendars] =
    await Promise.all([
    db
      .select({
        id: jobs.id,
        name: jobs.name,
        status: jobs.status,
        updatedAt: jobs.updatedAt,
        timeZone: scheduleCalendars.timeZone,
      })
      .from(jobs)
      .leftJoin(projects, eq(projects.id, jobs.projectId))
      .leftJoin(
        scheduleCalendars,
        eq(scheduleCalendars.id, projects.scheduleCalendarId),
      ),
    db
      .select({
        id: jobTasks.id,
        jobId: jobTasks.jobId,
        title: jobTasks.title,
        status: jobTasks.status,
        dueAt: jobTasks.dueAt,
        plannedEndAt: jobTasks.plannedEndAt,
      })
      .from(jobTasks)
      .where(ne(jobTasks.status, "done")),
    db
      .select({
        jobId: jobFieldNotes.jobId,
        kind: jobFieldNotes.kind,
        createdAt: jobFieldNotes.createdAt,
      })
      .from(jobFieldNotes)
      .where(
        and(eq(jobFieldNotes.kind, "daily_report"), gte(jobFieldNotes.createdAt, since)),
      ),
    db
      .select({
        id: jobVoiceNotes.id,
        jobId: jobVoiceNotes.jobId,
        status: jobVoiceNotes.status,
        transcript: jobVoiceNotes.transcript,
        filename: jobVoiceNotes.filename,
        createdAt: jobVoiceNotes.createdAt,
      })
      .from(jobVoiceNotes)
      .where(inArray(jobVoiceNotes.status, ["failed", "completed"])),
    db
      .select({
        kind: jobEvents.kind,
        payload: jobEvents.payload,
        createdAt: jobEvents.createdAt,
      })
      .from(jobEvents)
      .where(eq(jobEvents.kind, "voice_note_extracted")),
    db
      .select({ timeZone: scheduleCalendars.timeZone })
      .from(scheduleCalendars)
      .where(eq(scheduleCalendars.isDefault, true))
      .limit(1),
  ]);
  const fallbackTimeZone = defaultCalendars[0]?.timeZone?.trim() || "America/Toronto";
  return {
    jobs: jobRows.map((job) => ({
      id: job.id,
      name: job.name,
      status: job.status,
      updatedAt: job.updatedAt,
      timeZone: job.timeZone?.trim() || fallbackTimeZone,
    })),
    tasks: taskRows,
    fieldNotes: noteRows,
    voiceNotes: voiceRows,
    events: eventRows,
  };
}

export async function listJobVoiceNotes(jobId: string): Promise<JobVoiceNoteRow[]> {
  if (isDemoOpsStore()) return listDemoJobVoiceNotes(jobId);
  const db = getDb();
  return db
    .select()
    .from(jobVoiceNotes)
    .where(eq(jobVoiceNotes.jobId, jobId))
    .orderBy(desc(jobVoiceNotes.createdAt));
}

export async function getJobVoiceNote(
  jobId: string,
  voiceNoteId: string,
): Promise<JobVoiceNoteRow | null> {
  if (isDemoOpsStore()) return getDemoJobVoiceNote(jobId, voiceNoteId);
  const db = getDb();
  const rows = await db
    .select()
    .from(jobVoiceNotes)
    .where(
      and(eq(jobVoiceNotes.id, voiceNoteId), eq(jobVoiceNotes.jobId, jobId)),
    )
    .limit(1);
  return rows[0] ?? null;
}

export async function addJobVoiceNote(args: {
  jobId: string;
  actor: string;
  input: VoiceNoteInput;
  bytes: Uint8Array;
}): Promise<JobVoiceNoteRow | null> {
  if (isDemoOpsStore()) return addDemoJobVoiceNote(args);
  if (!(await getJob(args.jobId))) return null;
  if (args.input.workAreaId) {
    const areas = await listWorkAreas(args.jobId);
    if (!areas.some((area) => area.id === args.input.workAreaId)) return null;
  }
  if (args.input.taskId) {
    const tasks = await listJobTasks(args.jobId);
    if (!tasks.some((task) => task.id === args.input.taskId)) return null;
  }
  if (args.input.annotationId) {
    const annotation = await getJobPlanAnnotation(
      args.jobId,
      args.input.annotationId,
    );
    if (!annotation) return null;
  }
  if (args.input.documentId) {
    const documents = await listJobDocuments(args.jobId);
    if (!documents.some((document) => document.id === args.input.documentId)) {
      return null;
    }
  }
  if (!process.env.BLOB_READ_WRITE_TOKEN) return null;

  const id = crypto.randomUUID();
  const pathname = `jobs/${args.jobId}/voice/${id}/${args.input.filename}`;
  const { put } = await import("@vercel/blob");
  await put(pathname, Buffer.from(args.bytes), {
    access: "private",
    contentType: args.input.contentType,
    token: process.env.BLOB_READ_WRITE_TOKEN,
  });

  const db = getDb();
  const rows = await db
    .insert(jobVoiceNotes)
    .values({
      id,
      jobId: args.jobId,
      workAreaId: args.input.workAreaId,
      taskId: args.input.taskId,
      annotationId: args.input.annotationId,
      documentId: args.input.documentId,
      source: args.input.source,
      filename: args.input.filename,
      contentType: args.input.contentType,
      sizeBytes: args.input.sizeBytes,
      pathname,
      storage: "blob",
      durationSeconds: args.input.durationSeconds,
      language: args.input.language,
      status: "queued",
      consentAt: args.input.consentAt,
      createdBy: args.actor,
    })
    .returning();
  const note = rows[0];
  if (!note) return null;
  try {
    await db.insert(jobEvents).values({
      jobId: args.jobId,
      actor: args.actor,
      kind: "voice_note_added",
      summary: `voice note queued: ${note.filename}`,
      payload: {
        voiceNoteId: note.id,
        source: note.source,
        status: note.status,
      },
    });
  } catch (error) {
    console.error("Could not record the voice note event.", error);
  }
  return note;
}

export async function processJobVoiceTranscription(
  voiceNoteId: string,
): Promise<JobVoiceNoteRow | null> {
  if (isDemoOpsStore()) return processDemoVoiceTranscription(voiceNoteId);
  const db = getDb();
  const existing = (
    await db
      .select()
      .from(jobVoiceNotes)
      .where(eq(jobVoiceNotes.id, voiceNoteId))
      .limit(1)
  )[0];
  if (!existing) return null;
  if (existing.status !== "queued" && existing.status !== "processing") {
    return existing;
  }

  const claimed = (
    await db
      .update(jobVoiceNotes)
      .set({
        status: "processing",
        processingStartedAt: existing.processingStartedAt ?? new Date(),
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(jobVoiceNotes.id, voiceNoteId),
          eq(jobVoiceNotes.status, existing.status),
        ),
      )
      .returning()
  )[0];
  if (!claimed) {
    return (
      (
        await db
          .select()
          .from(jobVoiceNotes)
          .where(eq(jobVoiceNotes.id, voiceNoteId))
          .limit(1)
      )[0] ?? null
    );
  }

  try {
    let bytes: Uint8Array | null = null;
    if (claimed.storage === "blob") {
      const { resolveFileUrl } = await import("@/lib/leads/adapters");
      const signedUrl = await resolveFileUrl(claimed.pathname, 5 * 60 * 1000);
      const response = await fetch(signedUrl);
      if (!response.ok) {
        throw new Error("The recording could not be downloaded for transcription.");
      }
      bytes = new Uint8Array(await response.arrayBuffer());
    } else {
      bytes = getStoredVoiceNoteBytes(claimed.id);
    }
    if (!bytes) {
      throw new Error("The recording bytes are no longer available.");
    }
    const result = await transcribeVoiceAudio({
      bytes,
      filename: claimed.filename,
      contentType: claimed.contentType,
      language: claimed.language,
    });
    const now = new Date();
    const completed = (
      await db
        .update(jobVoiceNotes)
        .set({
          status: "completed",
          provider: result.provider,
          model: result.model,
          confidence: result.confidence,
          machineTranscript: result.transcript || null,
          transcript: claimed.transcript || result.transcript || null,
          completedAt: now,
          failedAt: null,
          error: null,
          updatedAt: now,
        })
        .where(eq(jobVoiceNotes.id, voiceNoteId))
        .returning()
    )[0];
    if (completed) {
      await db.insert(jobEvents).values({
        jobId: completed.jobId,
        actor: "system",
        kind: "voice_note_transcribed",
        summary: `voice note transcribed: ${completed.filename}`,
        payload: { voiceNoteId: completed.id, status: completed.status },
      });
    }
    return completed ?? claimed;
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Transcription could not be completed.";
    const failed = (
      await db
        .update(jobVoiceNotes)
        .set({
          status: "failed",
          error: message.slice(0, 500),
          failedAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(jobVoiceNotes.id, voiceNoteId))
        .returning()
    )[0];
    return failed ?? claimed;
  }
}

export async function attachJobVoiceNoteToPlanMark(args: {
  jobId: string;
  voiceNoteId: string;
  annotationId: string;
  documentId: string;
  taskId: string | null;
  actor: string;
}): Promise<JobVoiceNoteRow | null> {
  if (isDemoOpsStore()) return attachDemoVoiceNoteToPlanMark(args);
  const db = getDb();
  const mark = await getJobPlanAnnotation(args.jobId, args.annotationId);
  if (!mark || mark.voidedAt) return null;
  const rows = await db
    .update(jobVoiceNotes)
    .set({
      annotationId: mark.id,
      documentId: args.documentId,
      taskId: args.taskId,
      source: "annotation",
      updatedAt: new Date(),
    })
    .where(
      and(eq(jobVoiceNotes.id, args.voiceNoteId), eq(jobVoiceNotes.jobId, args.jobId)),
    )
    .returning();
  const note = rows[0];
  if (!note) return null;
  await db.insert(jobEvents).values({
    jobId: args.jobId,
    actor: args.actor,
    kind: "voice_note_attached",
    summary: `voice note attached: ${note.filename}`,
    payload: { voiceNoteId: note.id, annotationId: mark.id },
  });
  return note;
}

export async function updateJobVoiceTranscript(args: {
  jobId: string;
  voiceNoteId: string;
  actor: string;
  transcript: string;
}): Promise<JobVoiceNoteRow | null> {
  if (isDemoOpsStore()) return updateDemoVoiceTranscript(args);
  const db = getDb();
  const rows = await db
    .update(jobVoiceNotes)
    .set({
      transcript: args.transcript,
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(jobVoiceNotes.id, args.voiceNoteId),
        eq(jobVoiceNotes.jobId, args.jobId),
        eq(jobVoiceNotes.status, "completed"),
      ),
    )
    .returning();
  const note = rows[0];
  if (!note) return null;
  await db.insert(jobEvents).values({
    jobId: args.jobId,
    actor: args.actor,
    kind: "voice_note_updated",
    summary: `voice transcript edited: ${note.filename}`,
    payload: { voiceNoteId: note.id },
  });
  return note;
}

export async function extractJobVoiceNote(args: {
  jobId: string;
  voiceNoteId: string;
  actor: string;
  kind: VoiceExtractKind;
  selectedText: string;
}): Promise<{ ok: true; created: "task" | "field_note" } | { ok: false; error: string }> {
  if (isDemoOpsStore()) return extractDemoVoiceNote(args);
  const note = await getJobVoiceNote(args.jobId, args.voiceNoteId);
  if (!note) return { ok: false, error: "That voice note could not be found." };
  const db = getDb();
  if (args.kind === "task") {
    const task = await addJobTask({
      jobId: args.jobId,
      actor: args.actor,
      input: {
        title: args.selectedText.slice(0, 160),
        assignee: null,
        assigneeUserId: null,
        dueAt: null,
        plannedStartAt: null,
        plannedEndAt: null,
        workAreaId: note.workAreaId,
      },
    });
    if (!task) return { ok: false, error: "That task could not be created." };
    await db.insert(jobEvents).values({
      jobId: args.jobId,
      actor: args.actor,
      kind: "voice_note_extracted",
      summary: `voice note extracted: ${note.filename}`,
      payload: { voiceNoteId: note.id },
    });
    return { ok: true, created: "task" };
  }
  const fieldNote = await addJobFieldNote({
    jobId: args.jobId,
    actor: args.actor,
    input: {
      kind:
        args.kind === "blocker"
          ? "blocker"
          : args.kind === "deficiency"
            ? "deficiency"
            : args.kind === "material_request"
              ? "material_request"
              : "daily_report",
      body: args.selectedText,
      workAreaId: note.workAreaId,
      taskId: note.taskId,
      annotationId: note.annotationId,
      quantity: null,
      unit: null,
    },
  });
  if (!fieldNote) return { ok: false, error: "That field entry could not be created." };
  await db.insert(jobEvents).values({
    jobId: args.jobId,
    actor: args.actor,
    kind: "voice_note_extracted",
    summary: `voice note extracted: ${note.filename}`,
    payload: { voiceNoteId: note.id },
  });
  return { ok: true, created: "field_note" };
}

export async function deleteJobVoiceNote(args: {
  jobId: string;
  voiceNoteId: string;
  actor: string;
}): Promise<JobVoiceNoteRow | null> {
  if (isDemoOpsStore()) return deleteDemoJobVoiceNote(args);
  const db = getDb();
  const existing = (
    await db
      .select()
      .from(jobVoiceNotes)
      .where(
        and(
          eq(jobVoiceNotes.id, args.voiceNoteId),
          eq(jobVoiceNotes.jobId, args.jobId),
        ),
      )
      .limit(1)
  )[0];
  if (!existing) return null;
  await db
    .delete(jobVoiceNotes)
    .where(
      and(
        eq(jobVoiceNotes.id, args.voiceNoteId),
        eq(jobVoiceNotes.jobId, args.jobId),
      ),
    );
  if (existing.storage === "blob") {
    try {
      const { del } = await import("@vercel/blob");
      await del(existing.pathname, {
        token: process.env.BLOB_READ_WRITE_TOKEN,
      });
    } catch (error) {
      console.error("Could not delete a voice note blob.", error);
    }
  } else {
    clearVoiceNoteBytes(existing.id);
  }
  await db.insert(jobEvents).values({
    jobId: args.jobId,
    actor: args.actor,
    kind: "voice_note_deleted",
    summary: `voice note deleted: ${existing.filename}`,
    payload: { voiceNoteId: existing.id },
  });
  return existing;
}

export async function getJobVoiceNoteDownload(
  jobId: string,
  voiceNoteId: string,
): Promise<JobDocumentDownload | null> {
  if (isDemoOpsStore()) {
    const result = getDemoJobVoiceNoteDownload(jobId, voiceNoteId);
    if (!result) return null;
    return {
      filename: result.note.filename,
      contentType: result.note.contentType,
      kind: "bytes",
      bytes: result.bytes,
    };
  }

  const note = await getJobVoiceNote(jobId, voiceNoteId);
  if (!note) return null;
  if (note.storage === "blob") {
    const { resolveFileUrl } = await import("@/lib/leads/adapters");
    const signedUrl = await resolveFileUrl(note.pathname, 5 * 60 * 1000);
    return {
      filename: note.filename,
      contentType: note.contentType,
      kind: "redirect",
      url: signedUrl,
    };
  }
  const bytes = getStoredVoiceNoteBytes(note.id);
  if (!bytes) return null;
  return {
    filename: note.filename,
    contentType: note.contentType,
    kind: "bytes",
    bytes,
  };
}

export async function addCompany(input: CompanyInput): Promise<CompanyRow> {
  if (isDemoOpsStore()) return addDemoCompany(input);
  const db = getDb();
  const rows = await db.insert(companies).values(input).returning();
  if (!rows[0]) throw new Error("The company could not be saved.");
  return rows[0];
}

export async function updateCompany(
  id: string,
  input: CompanyInput,
): Promise<CompanyRow | null> {
  if (isDemoOpsStore()) return updateDemoCompany(id, input);
  const db = getDb();
  const rows = await db
    .update(companies)
    .set({ ...input, updatedAt: new Date() })
    .where(eq(companies.id, id))
    .returning();
  return rows[0] ?? null;
}

export async function deleteCompany(
  id: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  if (isDemoOpsStore()) return deleteDemoCompany(id);
  const [companyContacts, companySites, companyOpps, companyProjects, companyJobs] =
    await Promise.all([
      listContacts(id),
      listSites(id),
      listOpportunities({ companyId: id }),
      listProjects({ companyId: id }),
      listJobs({ companyId: id }),
    ]);
  if (companyContacts.length) {
    return { ok: false, error: "Remove or reassign contacts before deleting this company." };
  }
  if (companySites.length) {
    return { ok: false, error: "Remove sites before deleting this company." };
  }
  if (companyOpps.length) {
    return { ok: false, error: "This company still has opportunities." };
  }
  if (companyProjects.length || companyJobs.length) {
    return { ok: false, error: "This company still has projects or jobs." };
  }
  const db = getDb();
  const rows = await db.delete(companies).where(eq(companies.id, id)).returning();
  return rows[0]
    ? { ok: true }
    : { ok: false, error: "That company could not be found." };
}

export async function addContact(args: {
  companyId: string;
  input: ContactInput;
}): Promise<ContactRow | null> {
  if (isDemoOpsStore()) return addDemoContact(args);
  if (!(await getCompany(args.companyId))) return null;
  const db = getDb();
  const rows = await db
    .insert(contacts)
    .values({ companyId: args.companyId, ...args.input })
    .returning();
  return rows[0] ?? null;
}

export async function updateContact(
  id: string,
  input: ContactInput,
): Promise<ContactRow | null> {
  if (isDemoOpsStore()) return updateDemoContact(id, input);
  const db = getDb();
  const rows = await db
    .update(contacts)
    .set({ ...input, updatedAt: new Date() })
    .where(eq(contacts.id, id))
    .returning();
  return rows[0] ?? null;
}

export async function deleteContact(id: string): Promise<ContactRow | null> {
  if (isDemoOpsStore()) return deleteDemoContact(id);
  const db = getDb();
  const rows = await db.delete(contacts).where(eq(contacts.id, id)).returning();
  return rows[0] ?? null;
}

export async function addSite(args: {
  companyId: string;
  input: SiteInput;
}): Promise<SiteRow | null> {
  if (isDemoOpsStore()) return addDemoSite(args);
  if (!(await getCompany(args.companyId))) return null;
  const db = getDb();
  const rows = await db
    .insert(sites)
    .values({ companyId: args.companyId, ...args.input })
    .returning();
  return rows[0] ?? null;
}

export async function updateSite(
  id: string,
  input: SiteInput,
): Promise<SiteRow | null> {
  if (isDemoOpsStore()) return updateDemoSite(id, input);
  const db = getDb();
  const rows = await db
    .update(sites)
    .set({ ...input, updatedAt: new Date() })
    .where(eq(sites.id, id))
    .returning();
  return rows[0] ?? null;
}

export async function deleteSite(
  id: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  if (isDemoOpsStore()) return deleteDemoSite(id);
  const db = getDb();
  const [linkedOpps, linkedProjects, linkedJobs] = await Promise.all([
    db.select({ id: opportunities.id }).from(opportunities).where(eq(opportunities.siteId, id)),
    db.select({ id: projects.id }).from(projects).where(eq(projects.siteId, id)),
    db.select({ id: jobs.id }).from(jobs).where(eq(jobs.siteId, id)),
  ]);
  if (linkedOpps.length || linkedProjects.length || linkedJobs.length) {
    return { ok: false, error: "This site is still used by an opportunity, project, or job." };
  }
  const rows = await db.delete(sites).where(eq(sites.id, id)).returning();
  return rows[0]
    ? { ok: true }
    : { ok: false, error: "That site could not be found." };
}

export async function updateOpportunity(args: {
  id: string;
  input: OpportunityUpdateInput;
}): Promise<OpportunityRow | null> {
  if (isDemoOpsStore()) return updateDemoOpportunity(args);
  const db = getDb();
  const rows = await db
    .update(opportunities)
    .set({ ...args.input, updatedAt: new Date() })
    .where(eq(opportunities.id, args.id))
    .returning();
  return rows[0] ?? null;
}

export async function deleteOpportunity(
  id: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  if (isDemoOpsStore()) return deleteDemoOpportunity(id);
  const opportunity = await getOpportunity(id);
  if (!opportunity) return { ok: false, error: "That opportunity could not be found." };
  if (opportunity.projectId) {
    return { ok: false, error: "Convert or unlink the project before deleting this opportunity." };
  }
  const db = getDb();
  const rows = await db.delete(opportunities).where(eq(opportunities.id, id)).returning();
  return rows[0]
    ? { ok: true }
    : { ok: false, error: "That opportunity could not be found." };
}

export async function updateProject(args: {
  id: string;
  input: ProjectUpdateInput;
}): Promise<ProjectRow | null> {
  if (isDemoOpsStore()) return updateDemoProject(args);
  const db = getDb();
  const rows = await db
    .update(projects)
    .set({ ...args.input, updatedAt: new Date() })
    .where(eq(projects.id, args.id))
    .returning();
  return rows[0] ?? null;
}

export async function deleteProject(
  id: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  if (isDemoOpsStore()) return deleteDemoProject(id);
  const projectJobs = await listJobs({ projectId: id });
  if (projectJobs.length) {
    return { ok: false, error: "Remove jobs before deleting this project." };
  }
  const db = getDb();
  const rows = await db.delete(projects).where(eq(projects.id, id)).returning();
  return rows[0]
    ? { ok: true }
    : { ok: false, error: "That project could not be found." };
}

export async function updateJobDetails(args: {
  jobId: string;
  actor: string;
  input: JobDetailsInput;
}): Promise<JobRow | null> {
  if (isDemoOpsStore()) return updateDemoJobDetails(args);
  const existing = await getJob(args.jobId);
  if (!existing) return null;
  const db = getDb();
  const rows = await db
    .update(jobs)
    .set({
      name: args.input.name,
      scope: args.input.scope,
      projectManager: args.input.projectManager,
      foreman: args.input.foreman,
      plannedStartAt: args.input.plannedStartAt,
      plannedEndAt: args.input.plannedEndAt,
      updatedAt: new Date(),
    })
    .where(eq(jobs.id, args.jobId))
    .returning();
  const job = rows[0];
  if (!job) return null;
  await db.insert(jobEvents).values({
    jobId: job.id,
    actor: args.actor,
    kind: "job_updated",
    summary: `job details updated: ${job.name}`,
    payload: { name: job.name, scope: job.scope },
  });
  return job;
}

export async function deleteJob(
  jobId: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  if (isDemoOpsStore()) return deleteDemoJob(jobId);
  if (!(await getJob(jobId))) {
    return { ok: false, error: "That job could not be found." };
  }
  const db = getDb();
  const voiceNotes = await db
    .select()
    .from(jobVoiceNotes)
    .where(eq(jobVoiceNotes.jobId, jobId));
  for (const note of voiceNotes) {
    if (note.storage === "blob") {
      try {
        const { del } = await import("@vercel/blob");
        await del(note.pathname, { token: process.env.BLOB_READ_WRITE_TOKEN });
      } catch (error) {
        console.error("Could not delete a voice note blob.", error);
      }
    } else {
      clearVoiceNoteBytes(note.id);
    }
  }
  await db.delete(jobVoiceNotes).where(eq(jobVoiceNotes.jobId, jobId));
  await db.delete(jobFieldNotes).where(eq(jobFieldNotes.jobId, jobId));
  await db.delete(jobPlanAnnotations).where(eq(jobPlanAnnotations.jobId, jobId));
  const documents = await db
    .select()
    .from(jobDocuments)
    .where(eq(jobDocuments.jobId, jobId));
  for (const document of documents) {
    if (document.storage === "blob") {
      try {
        const { del } = await import("@vercel/blob");
        await del(document.pathname, { token: process.env.BLOB_READ_WRITE_TOKEN });
      } catch (error) {
        console.error("Could not delete a job document blob.", error);
      }
    } else {
      clearJobDocumentBytes(document.id);
    }
  }
  await db.delete(jobDocuments).where(eq(jobDocuments.jobId, jobId));
  await db.delete(jobTasks).where(eq(jobTasks.jobId, jobId));
  await db.delete(workAreas).where(eq(workAreas.jobId, jobId));
  await db.delete(jobEvents).where(eq(jobEvents.jobId, jobId));
  await db.delete(jobs).where(eq(jobs.id, jobId));
  return { ok: true };
}

export async function updateWorkArea(args: {
  jobId: string;
  workAreaId: string;
  actor: string;
  input: WorkAreaInput;
}): Promise<WorkAreaRow | null> {
  if (isDemoOpsStore()) return updateDemoWorkArea(args);
  const db = getDb();
  const rows = await db
    .update(workAreas)
    .set({
      name: args.input.name,
      kind: args.input.kind,
      notes: args.input.notes,
      updatedAt: new Date(),
    })
    .where(and(eq(workAreas.id, args.workAreaId), eq(workAreas.jobId, args.jobId)))
    .returning();
  const area = rows[0];
  if (!area) return null;
  await db.insert(jobEvents).values({
    jobId: args.jobId,
    actor: args.actor,
    kind: "work_area_updated",
    summary: `work area updated: ${area.name}`,
    payload: { workAreaId: area.id, kind: area.kind },
  });
  return area;
}

export async function deleteWorkArea(args: {
  jobId: string;
  workAreaId: string;
  actor: string;
}): Promise<WorkAreaRow | null> {
  if (isDemoOpsStore()) return deleteDemoWorkArea(args);
  const db = getDb();
  const existing = await db
    .select()
    .from(workAreas)
    .where(and(eq(workAreas.id, args.workAreaId), eq(workAreas.jobId, args.jobId)))
    .limit(1);
  const area = existing[0];
  if (!area) return null;
  await db
    .update(jobTasks)
    .set({ workAreaId: null, updatedAt: new Date() })
    .where(and(eq(jobTasks.jobId, args.jobId), eq(jobTasks.workAreaId, args.workAreaId)));
  await db
    .update(jobDocuments)
    .set({ workAreaId: null })
    .where(
      and(eq(jobDocuments.jobId, args.jobId), eq(jobDocuments.workAreaId, args.workAreaId)),
    );
  await db
    .update(jobFieldNotes)
    .set({ workAreaId: null })
    .where(
      and(eq(jobFieldNotes.jobId, args.jobId), eq(jobFieldNotes.workAreaId, args.workAreaId)),
    );
  await db
    .update(jobPlanAnnotations)
    .set({ workAreaId: null, updatedAt: new Date() })
    .where(
      and(
        eq(jobPlanAnnotations.jobId, args.jobId),
        eq(jobPlanAnnotations.workAreaId, args.workAreaId),
      ),
    );
  await db
    .delete(workAreas)
    .where(and(eq(workAreas.id, args.workAreaId), eq(workAreas.jobId, args.jobId)));
  await db.insert(jobEvents).values({
    jobId: args.jobId,
    actor: args.actor,
    kind: "work_area_deleted",
    summary: `work area deleted: ${area.name}`,
    payload: { workAreaId: area.id },
  });
  return area;
}

export async function updateJobTask(args: {
  jobId: string;
  taskId: string;
  actor: string;
  input: JobTaskInput;
  expectedUpdatedAt?: Date;
  restoredUpdatedAt?: Date;
}): Promise<JobTaskRow | null> {
  if (isDemoOpsStore()) return updateDemoJobTask(args);
  if (args.input.workAreaId) {
    const areas = await listWorkAreas(args.jobId);
    if (!areas.some((area) => area.id === args.input.workAreaId)) return null;
  }
  let assignee = args.input.assignee;
  if (args.input.assigneeUserId) {
    const identity = await getFieldIdentityById(args.input.assigneeUserId);
    if (
      !identity ||
      !identity.active ||
      !identity.membershipActive ||
      !isFieldMembershipRole(identity.role)
    ) {
      return null;
    }
    assignee = identity.displayName;
  }
  const db = getDb();
  const conditions = [
    eq(jobTasks.id, args.taskId),
    eq(jobTasks.jobId, args.jobId),
  ];
  if (args.expectedUpdatedAt) {
    conditions.push(eq(jobTasks.updatedAt, args.expectedUpdatedAt));
  }
  const rows = await db
    .update(jobTasks)
    .set({
      title: args.input.title,
      assignee,
      assigneeUserId: args.input.assigneeUserId,
      dueAt: args.input.dueAt,
      plannedStartAt: args.input.plannedStartAt,
      plannedEndAt: args.input.plannedEndAt,
      workAreaId: args.input.workAreaId,
      updatedAt: args.restoredUpdatedAt ?? new Date(),
    })
    .where(and(...conditions))
    .returning();
  const task = rows[0];
  if (!task) return null;
  await db.insert(jobEvents).values({
    jobId: args.jobId,
    actor: args.actor,
    kind: "task_updated",
    summary: `task updated: ${task.title}`,
    payload: {
      taskId: task.id,
      workAreaId: task.workAreaId,
      plannedStartAt: task.plannedStartAt?.toISOString() ?? null,
      plannedEndAt: task.plannedEndAt?.toISOString() ?? null,
    },
  });
  return task;
}

export async function deleteJobTask(args: {
  jobId: string;
  taskId: string;
  actor: string;
}): Promise<JobTaskRow | null> {
  if (isDemoOpsStore()) return deleteDemoJobTask(args);
  const db = getDb();
  const existing = await db
    .select()
    .from(jobTasks)
    .where(and(eq(jobTasks.id, args.taskId), eq(jobTasks.jobId, args.jobId)))
    .limit(1);
  const task = existing[0];
  if (!task) return null;
  await db
    .update(jobFieldNotes)
    .set({ taskId: null })
    .where(and(eq(jobFieldNotes.jobId, args.jobId), eq(jobFieldNotes.taskId, args.taskId)));
  await db
    .update(jobPlanAnnotations)
    .set({ taskId: null })
    .where(
      and(
        eq(jobPlanAnnotations.jobId, args.jobId),
        eq(jobPlanAnnotations.taskId, args.taskId),
      ),
    );
  await db
    .update(jobVoiceNotes)
    .set({ taskId: null })
    .where(
      and(
        eq(jobVoiceNotes.jobId, args.jobId),
        eq(jobVoiceNotes.taskId, args.taskId),
      ),
    );
  await db
    .delete(jobTasks)
    .where(and(eq(jobTasks.id, args.taskId), eq(jobTasks.jobId, args.jobId)));
  await db.insert(jobEvents).values({
    jobId: args.jobId,
    actor: args.actor,
    kind: "task_deleted",
    summary: `task deleted: ${task.title}`,
    payload: { taskId: task.id },
  });
  return task;
}

export async function updateJobDocument(args: {
  jobId: string;
  documentId: string;
  actor: string;
  input: { kind: JobDocumentKind; workAreaId: string | null };
}): Promise<JobDocumentRow | null> {
  if (isDemoOpsStore()) return updateDemoJobDocument(args);
  const db = getDb();
  const existingRows = await db
    .select()
    .from(jobDocuments)
    .where(
      and(
        eq(jobDocuments.id, args.documentId),
        eq(jobDocuments.jobId, args.jobId),
      ),
    )
    .limit(1);
  const existing = existingRows[0];
  if (!existing) return null;
  if (existing.kind === "plan" || args.input.kind === "plan") return null;
  if (args.input.workAreaId) {
    const areas = await listWorkAreas(args.jobId);
    if (!areas.some((area) => area.id === args.input.workAreaId)) return null;
  }
  const rows = await db
    .update(jobDocuments)
    .set({ kind: args.input.kind, workAreaId: args.input.workAreaId })
    .where(and(eq(jobDocuments.id, args.documentId), eq(jobDocuments.jobId, args.jobId)))
    .returning();
  const document = rows[0];
  if (!document) return null;
  await db.insert(jobEvents).values({
    jobId: args.jobId,
    actor: args.actor,
    kind: "document_updated",
    summary: `document updated: ${document.filename}`,
    payload: { documentId: document.id, kind: document.kind },
  });
  return document;
}

export async function deleteJobDocument(args: {
  jobId: string;
  documentId: string;
  actor: string;
}): Promise<JobDocumentRow | null> {
  if (isDemoOpsStore()) return deleteDemoJobDocument(args);
  const db = getDb();
  const existing = await db
    .select()
    .from(jobDocuments)
    .where(and(eq(jobDocuments.id, args.documentId), eq(jobDocuments.jobId, args.jobId)))
    .limit(1);
  const document = existing[0];
  if (!document) return null;
  if (document.kind === "plan") return null;
  const annotationRows = await db
    .select({ id: jobPlanAnnotations.id })
    .from(jobPlanAnnotations)
    .where(eq(jobPlanAnnotations.documentId, args.documentId));
  const annotationIds = annotationRows.map((annotation) => annotation.id);
  if (annotationIds.length > 0) {
    await db
      .update(jobFieldNotes)
      .set({ annotationId: null })
      .where(inArray(jobFieldNotes.annotationId, annotationIds));
  }
  await db
    .update(jobDocuments)
    .set({ replacesDocumentId: null })
    .where(eq(jobDocuments.replacesDocumentId, args.documentId));
  await db
    .delete(jobPlanAnnotations)
    .where(eq(jobPlanAnnotations.documentId, args.documentId));
  await db
    .delete(jobDocuments)
    .where(and(eq(jobDocuments.id, args.documentId), eq(jobDocuments.jobId, args.jobId)));
  if (document.storage === "blob") {
    try {
      const { del } = await import("@vercel/blob");
      await del(document.pathname, { token: process.env.BLOB_READ_WRITE_TOKEN });
    } catch (error) {
      console.error("Could not delete a job document blob.", error);
    }
  } else {
    clearJobDocumentBytes(document.id);
  }
  await db.insert(jobEvents).values({
    jobId: args.jobId,
    actor: args.actor,
    kind: "document_deleted",
    summary: `document deleted: ${document.filename}`,
    payload: { documentId: document.id },
  });
  return document;
}

export async function updateJobFieldNote(args: {
  jobId: string;
  noteId: string;
  actor: string;
  input: FieldNoteInput;
}): Promise<JobFieldNoteRow | null> {
  if (isDemoOpsStore()) return updateDemoJobFieldNote(args);
  if (args.input.workAreaId) {
    const areas = await listWorkAreas(args.jobId);
    if (!areas.some((area) => area.id === args.input.workAreaId)) return null;
  }
  if (args.input.taskId) {
    const tasks = await listJobTasks(args.jobId);
    if (!tasks.some((task) => task.id === args.input.taskId)) return null;
  }
  const db = getDb();
  const rows = await db
    .update(jobFieldNotes)
    .set({
      kind: args.input.kind,
      body: args.input.body,
      workAreaId: args.input.workAreaId,
      taskId: args.input.taskId,
      quantity: args.input.quantity,
      unit: args.input.unit,
    })
    .where(and(eq(jobFieldNotes.id, args.noteId), eq(jobFieldNotes.jobId, args.jobId)))
    .returning();
  const note = rows[0];
  if (!note) return null;
  await db.insert(jobEvents).values({
    jobId: args.jobId,
    actor: args.actor,
    kind: "field_note_updated",
    summary: `field entry updated: ${note.body.slice(0, 80)}`,
    payload: { noteId: note.id, kind: note.kind },
  });
  return note;
}

export async function deleteJobFieldNote(args: {
  jobId: string;
  noteId: string;
  actor: string;
}): Promise<JobFieldNoteRow | null> {
  if (isDemoOpsStore()) return deleteDemoJobFieldNote(args);
  const db = getDb();
  const existing = await db
    .select()
    .from(jobFieldNotes)
    .where(and(eq(jobFieldNotes.id, args.noteId), eq(jobFieldNotes.jobId, args.jobId)))
    .limit(1);
  const note = existing[0];
  if (!note) return null;
  await db
    .delete(jobFieldNotes)
    .where(and(eq(jobFieldNotes.id, args.noteId), eq(jobFieldNotes.jobId, args.jobId)));
  await db.insert(jobEvents).values({
    jobId: args.jobId,
    actor: args.actor,
    kind: "field_note_deleted",
    summary: `field entry deleted: ${note.body.slice(0, 80)}`,
    payload: { noteId: note.id, kind: note.kind },
  });
  return note;
}

export async function updateEstimateRequestTask(args: {
  leadId: string;
  taskId: string;
  actor: string;
  title: string;
  assignee: string | null;
  dueAt: Date | null;
}): Promise<EstimateRequestTask | null> {
  if (isDemoOpsStore()) return updateDemoEstimateRequestTask(args);
  const db = getDb();
  const rows = await db
    .update(estimateRequestTasks)
    .set({
      title: args.title,
      assignee: args.assignee,
      dueAt: args.dueAt,
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(estimateRequestTasks.id, args.taskId),
        eq(estimateRequestTasks.leadId, args.leadId),
      ),
    )
    .returning();
  const task = rows[0];
  if (!task) return null;
  await recordEvent({
    leadId: args.leadId,
    actor: args.actor,
    kind: "task_updated",
    summary: `task updated: ${task.title}`,
    payload: { taskId: task.id },
  });
  return task;
}

export async function deleteEstimateRequestTask(args: {
  leadId: string;
  taskId: string;
  actor: string;
}): Promise<EstimateRequestTask | null> {
  if (isDemoOpsStore()) return deleteDemoEstimateRequestTask(args);
  const db = getDb();
  const existing = await db
    .select()
    .from(estimateRequestTasks)
    .where(
      and(
        eq(estimateRequestTasks.id, args.taskId),
        eq(estimateRequestTasks.leadId, args.leadId),
      ),
    )
    .limit(1);
  const task = existing[0];
  if (!task) return null;
  await db
    .delete(estimateRequestTasks)
    .where(
      and(
        eq(estimateRequestTasks.id, args.taskId),
        eq(estimateRequestTasks.leadId, args.leadId),
      ),
    );
  await recordEvent({
    leadId: args.leadId,
    actor: args.actor,
    kind: "task_deleted",
    summary: `task deleted: ${task.title}`,
    payload: { taskId: task.id },
  });
  return task;
}

export async function deleteEstimateRequestComment(args: {
  leadId: string;
  commentId: string;
  actor: string;
}): Promise<EstimateRequestComment | null> {
  if (isDemoOpsStore()) return deleteDemoEstimateRequestComment(args);
  const db = getDb();
  const existing = await db
    .select()
    .from(estimateRequestComments)
    .where(
      and(
        eq(estimateRequestComments.id, args.commentId),
        eq(estimateRequestComments.leadId, args.leadId),
      ),
    )
    .limit(1);
  const comment = existing[0];
  if (!comment) return null;
  await db
    .delete(estimateRequestComments)
    .where(
      and(
        eq(estimateRequestComments.id, args.commentId),
        eq(estimateRequestComments.leadId, args.leadId),
      ),
    );
  await recordEvent({
    leadId: args.leadId,
    actor: args.actor,
    kind: "comment_deleted",
    summary: "internal comment deleted",
    payload: { commentId: comment.id },
  });
  return comment;
}
