import {
  demoCompanies,
  demoContacts,
  demoEstimateComments,
  demoEstimateEvents,
  demoEstimateRequests,
  demoEstimateTasks,
  demoJobAssignments,
  DEMO_PLAN_DOCUMENT_ID,
  DEMO_VOICE_NOTE_ID,
  demoJobDocuments,
  demoJobEvents,
  demoJobFieldNotes,
  demoJobPlanAnnotations,
  demoJobVoiceNotes,
  demoJobTaskDependencies,
  demoJobTasks,
  demoJobs,
  demoMemberships,
  demoOpportunities,
  demoOrganizations,
  demoProjectScheduleBaselineItems,
  demoProjectScheduleBaselines,
  demoProjects,
  demoScheduleCalendarExceptions,
  demoScheduleCalendars,
  demoSites,
  demoUserEvents,
  demoUsers,
  demoWorkAreas,
  type CompanyRow,
  type ContactRow,
  type EstimateRequestComment,
  type EstimateRequestEvent,
  type EstimateRequestRow,
  type EstimateRequestTask,
  type JobAssignmentRow,
  type JobDocumentRow,
  type JobEventRow,
  type JobFieldNoteRow,
  type JobPlanAnnotationRow,
  type JobVoiceNoteRow,
  type JobRow,
  type JobTaskDependencyRow,
  type JobTaskRow,
  type MembershipRow,
  type OpportunityRow,
  type OrganizationRow,
  type ProjectRow,
  type ProjectScheduleBaselineItemRow,
  type ProjectScheduleBaselineRow,
  type ScheduleCalendarExceptionRow,
  type ScheduleCalendarRow,
  type SiteRow,
  type UserRow,
  type UserEventRow,
  type WorkAreaRow,
} from "@/lib/ops/demo-data";
import type { CrmConversionInput } from "@/lib/ops/crm";
import {
  canConvertWonWork,
  type JobConversionInput,
  type JobDetailsInput,
  type JobStatus,
} from "@/lib/ops/jobs";
import {
  clearJobDocumentBytes,
  setJobDocumentBytes,
  getStoredJobDocumentBytes,
} from "@/lib/ops/job-document-bytes";
import { createDemoFloorPlanPng } from "@/lib/ops/demo-floor-plan";
import {
  createSilentWav,
  getStoredVoiceNoteBytes,
  setVoiceNoteBytes,
  clearVoiceNoteBytes,
} from "@/lib/ops/voice-bytes";
import {
  demoVoiceTranscript,
  type VoiceExtractKind,
  type VoiceNoteInput,
  type VoiceTranscriptStatus,
} from "@/lib/ops/voice-notes";
import { isInDateRange, matchesQuery } from "@/lib/ops/filters";
import {
  isCurrentPlanDocument,
  planSheetKey,
  type PlanAnnotationInput,
  type PlanAnnotationStatus,
} from "@/lib/ops/plan-markup";
import {
  sortJobTaskRows,
  type JobDocumentInput,
  type JobDocumentKind,
  type JobTaskInput,
  type WorkAreaInput,
} from "@/lib/ops/job-workspace";
import type { FieldNoteInput, FieldNoteKind } from "@/lib/ops/field-workspace";
import {
  STRONG_FOAM_ORGANIZATION_ID,
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
import type {
  CompanyInput,
  ContactInput,
  OpportunityUpdateInput,
  ProjectUpdateInput,
  SiteInput,
} from "@/lib/ops/records";
import type {
  CompanyListFilters,
  EstimateRequestFilters,
  EstimateRequestUpdate,
  JobDocumentListFilters,
  JobFieldNoteListFilters,
  JobListFilters,
  JobTaskListFilters,
  OpportunityListFilters,
  PortfolioScheduleStoreFilters,
  PortfolioScheduleStoreResult,
  ProjectListFilters,
} from "@/lib/ops/store";
import { getOpsNow } from "@/lib/ops/ops-now";
import { isWorkflowStatus } from "@/lib/ops/workflow";

export { isDemoOpsStore } from "@/lib/ops/demo-mode";

type DemoOpsState = {
  requests: EstimateRequestRow[];
  events: EstimateRequestEvent[];
  tasks: EstimateRequestTask[];
  comments: EstimateRequestComment[];
  organizations: OrganizationRow[];
  users: UserRow[];
  userEvents: UserEventRow[];
  memberships: MembershipRow[];
  companies: CompanyRow[];
  contacts: ContactRow[];
  sites: SiteRow[];
  opportunities: OpportunityRow[];
  projects: ProjectRow[];
  jobsList: JobRow[];
  jobEvents: JobEventRow[];
  jobAssignments: JobAssignmentRow[];
  workAreas: WorkAreaRow[];
  jobTasks: JobTaskRow[];
  jobTaskDependencies: JobTaskDependencyRow[];
  scheduleCalendars: ScheduleCalendarRow[];
  scheduleCalendarExceptions: ScheduleCalendarExceptionRow[];
  projectScheduleBaselines: ProjectScheduleBaselineRow[];
  projectScheduleBaselineItems: ProjectScheduleBaselineItemRow[];
  jobDocuments: JobDocumentRow[];
  jobPlanAnnotations: JobPlanAnnotationRow[];
  jobFieldNotes: JobFieldNoteRow[];
  jobVoiceNotes: JobVoiceNoteRow[];
};

function getDemoState(): DemoOpsState {
  // Server actions and route handlers can load separate module copies.
  // Keep demo mutations on globalThis so uploads remain downloadable.
  const globalForDemo = globalThis as typeof globalThis & {
    __strongfoamDemoOps?: DemoOpsState;
  };
  if (!globalForDemo.__strongfoamDemoOps) {
    globalForDemo.__strongfoamDemoOps = {
      requests: demoEstimateRequests(),
      events: demoEstimateEvents(),
      tasks: demoEstimateTasks(),
      comments: demoEstimateComments(),
      organizations: demoOrganizations(),
      users: demoUsers(),
      userEvents: demoUserEvents(),
      memberships: demoMemberships(),
      companies: demoCompanies(),
      contacts: demoContacts(),
      sites: demoSites(),
      opportunities: demoOpportunities(),
      projects: demoProjects(),
      jobsList: demoJobs(),
      jobEvents: demoJobEvents(),
      jobAssignments: demoJobAssignments(),
      workAreas: demoWorkAreas(),
      jobTasks: demoJobTasks(),
      jobTaskDependencies: demoJobTaskDependencies(),
      scheduleCalendars: demoScheduleCalendars(),
      scheduleCalendarExceptions: demoScheduleCalendarExceptions(),
      projectScheduleBaselines: demoProjectScheduleBaselines(),
      projectScheduleBaselineItems: demoProjectScheduleBaselineItems(),
      jobDocuments: demoJobDocuments(),
      jobPlanAnnotations: demoJobPlanAnnotations(),
      jobFieldNotes: demoJobFieldNotes(),
      jobVoiceNotes: demoJobVoiceNotes(),
    };
    seedDemoPlanBytes(globalForDemo.__strongfoamDemoOps);
  } else if (!globalForDemo.__strongfoamDemoOps.jobFieldNotes) {
    globalForDemo.__strongfoamDemoOps.jobFieldNotes = demoJobFieldNotes();
  }
  if (!globalForDemo.__strongfoamDemoOps.users) {
    globalForDemo.__strongfoamDemoOps.organizations = demoOrganizations();
    globalForDemo.__strongfoamDemoOps.users = demoUsers();
    globalForDemo.__strongfoamDemoOps.userEvents = demoUserEvents();
    globalForDemo.__strongfoamDemoOps.memberships = demoMemberships();
    globalForDemo.__strongfoamDemoOps.jobAssignments = demoJobAssignments();
  }
  if (!globalForDemo.__strongfoamDemoOps.userEvents) {
    globalForDemo.__strongfoamDemoOps.userEvents = demoUserEvents();
  }
  if (!globalForDemo.__strongfoamDemoOps.jobTaskDependencies) {
    globalForDemo.__strongfoamDemoOps.jobTaskDependencies = [];
  }
  if (!globalForDemo.__strongfoamDemoOps.scheduleCalendars) {
    globalForDemo.__strongfoamDemoOps.scheduleCalendars = [];
    globalForDemo.__strongfoamDemoOps.scheduleCalendarExceptions = [];
    globalForDemo.__strongfoamDemoOps.projectScheduleBaselines = [];
    globalForDemo.__strongfoamDemoOps.projectScheduleBaselineItems = [];
  }
  if (!globalForDemo.__strongfoamDemoOps.jobPlanAnnotations) {
    globalForDemo.__strongfoamDemoOps.jobPlanAnnotations = demoJobPlanAnnotations();
  }
  if (!globalForDemo.__strongfoamDemoOps.jobVoiceNotes) {
    globalForDemo.__strongfoamDemoOps.jobVoiceNotes = demoJobVoiceNotes();
  }
  for (const document of globalForDemo.__strongfoamDemoOps.jobDocuments) {
    document.sheetKey ??= "";
    document.versionNumber ??= 1;
    document.replacesDocumentId ??= null;
    document.supersededAt ??= null;
  }
  for (const note of globalForDemo.__strongfoamDemoOps.jobFieldNotes) {
    note.annotationId ??= null;
  }
  seedDemoPlanBytes(globalForDemo.__strongfoamDemoOps);
  seedDemoVoiceBytes(globalForDemo.__strongfoamDemoOps);
  return globalForDemo.__strongfoamDemoOps;
}

function seedDemoVoiceBytes(state: DemoOpsState) {
  for (const note of state.jobVoiceNotes) {
    if (note.id === DEMO_VOICE_NOTE_ID && !getStoredVoiceNoteBytes(note.id)) {
      const bytes = createSilentWav(360);
      note.sizeBytes = bytes.byteLength;
      setVoiceNoteBytes(note.id, bytes);
    }
  }
}

function seedDemoPlanBytes(state: DemoOpsState) {
  for (const document of state.jobDocuments) {
    if (
      document.id === DEMO_PLAN_DOCUMENT_ID &&
      !getStoredJobDocumentBytes(document.id)
    ) {
      const bytes = createDemoFloorPlanPng();
      document.sizeBytes = bytes.byteLength;
      setJobDocumentBytes(document.id, bytes);
    }
  }
}

const {
  requests,
  events,
  tasks,
  comments,
  users,
  userEvents,
  memberships,
  companies,
  contacts,
  sites,
  opportunities,
  projects,
  jobsList,
  jobEvents,
  jobAssignments,
  workAreas,
  jobTasks,
  jobTaskDependencies,
  scheduleCalendars,
  scheduleCalendarExceptions,
  projectScheduleBaselines,
  projectScheduleBaselineItems,
  jobDocuments,
  jobPlanAnnotations,
  jobFieldNotes,
  jobVoiceNotes,
} = getDemoState();

const PORTFOLIO_PROJECT_LIMIT = 250;
const PORTFOLIO_JOB_LIMIT = 2_000;
const PORTFOLIO_TASK_LIMIT = 5_000;
const PORTFOLIO_DEPENDENCY_LIMIT = 10_000;
const PORTFOLIO_CALENDAR_EXCEPTION_LIMIT = 5_000;
const PORTFOLIO_BASELINE_ITEM_LIMIT = 5_000;
const DEMO_DEFAULT_CALENDAR_ID = "00000000-0000-4000-8000-000000000001";
const DEMO_DEFAULT_CALENDAR_TIMESTAMP = "2000-01-01T00:00:00.000Z";

export function boundedRows<T>(
  rows: readonly T[],
  limit: number,
): { rows: T[]; truncated: boolean } {
  return {
    rows: rows.slice(0, limit),
    truncated: rows.length > limit,
  };
}

function demoIdentity(user: UserRow): UserIdentity | null {
  const membership = memberships.find(
    (item) =>
      item.userId === user.id &&
      item.organizationId === STRONG_FOAM_ORGANIZATION_ID,
  );
  if (!membership) return null;
  return {
    userId: user.id,
    organizationId: membership.organizationId,
    email: user.email,
    displayName: user.displayName,
    passwordHash: user.passwordHash,
    active: user.active,
    membershipActive: membership.active,
    role: membership.role as MembershipRole,
    sessionVersion: user.sessionVersion,
  };
}

function recordDemoUserEvent(args: {
  userId: string;
  actor: string;
  kind: string;
  summary: string;
  payload?: Record<string, unknown>;
}) {
  userEvents.unshift({
    id: crypto.randomUUID(),
    createdAt: new Date(),
    userId: args.userId,
    actor: args.actor,
    kind: args.kind,
    summary: args.summary,
    payload: args.payload ?? {},
  });
}

export function listDemoUsers(): UserListItem[] {
  return users
    .map((user) => {
      const identity = demoIdentity(user);
      return identity
        ? {
            ...identity,
            createdAt: user.createdAt,
            updatedAt: user.updatedAt,
          }
        : null;
    })
    .filter((user): user is UserListItem => Boolean(user))
    .sort((left, right) => left.displayName.localeCompare(right.displayName));
}

export function getDemoFieldIdentityByEmail(
  email: string,
): UserIdentity | null {
  const user = users.find((item) => item.email === email);
  return user ? demoIdentity(user) : null;
}

export function getDemoFieldIdentityById(
  userId: string,
): UserIdentity | null {
  const user = users.find((item) => item.id === userId);
  return user ? demoIdentity(user) : null;
}

export function listDemoUserEvents(limit = 50): UserEventRow[] {
  return [...userEvents]
    .sort((left, right) => right.createdAt.getTime() - left.createdAt.getTime())
    .slice(0, limit);
}

export function getDemoUserAssignmentSummary(userId: string): {
  jobAssignments: number;
  taskAssignments: number;
} {
  return {
    jobAssignments: jobAssignments.filter(
      (assignment) => assignment.userId === userId,
    ).length,
    taskAssignments: jobTasks.filter((task) => task.assigneeUserId === userId)
      .length,
  };
}

export function countActiveDemoAdministrators(): number {
  return listDemoUsers().filter(
    (user) =>
      user.active &&
      user.membershipActive &&
      user.role === "administrator",
  ).length;
}

export function addDemoUser(args: {
  actor: string;
  displayName: string;
  email: string;
  passwordHash: string;
  role: MembershipRole;
}): UserListItem | null {
  if (users.some((user) => user.email === args.email)) return null;
  const now = new Date();
  const user: UserRow = {
    id: crypto.randomUUID(),
    createdAt: now,
    updatedAt: now,
    email: args.email,
    displayName: args.displayName,
    passwordHash: args.passwordHash,
    active: true,
    sessionVersion: 1,
    createdBy: args.actor,
  };
  const membership: MembershipRow = {
    id: crypto.randomUUID(),
    createdAt: now,
    updatedAt: now,
    organizationId: STRONG_FOAM_ORGANIZATION_ID,
    userId: user.id,
    role: args.role,
    active: true,
  };
  users.push(user);
  memberships.push(membership);
  recordDemoUserEvent({
    userId: user.id,
    actor: args.actor,
    kind: "user_created",
    summary: `${user.displayName} created as ${args.role}`,
    payload: { role: args.role },
  });
  return {
    ...demoIdentity(user)!,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  };
}

export function setDemoUserActive(
  userId: string,
  active: boolean,
  actor = "system",
): UserListItem | null {
  const user = users.find((item) => item.id === userId);
  const membership = memberships.find(
    (item) =>
      item.userId === userId &&
      item.organizationId === STRONG_FOAM_ORGANIZATION_ID,
  );
  if (!user || !membership) return null;
  const now = new Date();
  user.active = active;
  user.sessionVersion += 1;
  user.updatedAt = now;
  membership.active = active;
  membership.updatedAt = now;
  recordDemoUserEvent({
    userId,
    actor,
    kind: active ? "user_activated" : "user_deactivated",
    summary: `${user.displayName} ${active ? "activated" : "deactivated"}`,
  });
  return {
    ...demoIdentity(user)!,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  };
}

export function updateDemoUser(args: {
  userId: string;
  actor: string;
  input: UserUpdateInput;
}): UserListItem | null {
  const user = users.find((item) => item.id === args.userId);
  const membership = memberships.find(
    (item) =>
      item.userId === args.userId &&
      item.organizationId === STRONG_FOAM_ORGANIZATION_ID,
  );
  if (!user || !membership) return null;
  if (
    users.some(
      (item) => item.id !== args.userId && item.email === args.input.email,
    )
  ) {
    return null;
  }
  const previous = {
    displayName: user.displayName,
    email: user.email,
    role: membership.role,
  };
  const now = new Date();
  user.displayName = args.input.displayName;
  user.email = args.input.email;
  user.sessionVersion += 1;
  user.updatedAt = now;
  membership.role = args.input.role;
  membership.updatedAt = now;
  for (const assignment of jobAssignments) {
    if (assignment.userId !== args.userId || assignment.role !== "foreman") {
      continue;
    }
    const job = jobsList.find((item) => item.id === assignment.jobId);
    if (job) {
      job.foreman = user.displayName;
      job.updatedAt = now;
    }
  }
  recordDemoUserEvent({
    userId: args.userId,
    actor: args.actor,
    kind: "user_updated",
    summary: `${user.displayName} profile or role updated`,
    payload: {
      before: previous,
      after: {
        displayName: user.displayName,
        email: user.email,
        role: membership.role,
      },
    },
  });
  return {
    ...demoIdentity(user)!,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  };
}

export function resetDemoUserPassword(args: {
  userId: string;
  actor: string;
  passwordHash: string;
}): UserListItem | null {
  const user = users.find((item) => item.id === args.userId);
  if (!user || !demoIdentity(user)) return null;
  user.passwordHash = args.passwordHash;
  user.sessionVersion += 1;
  user.updatedAt = new Date();
  recordDemoUserEvent({
    userId: args.userId,
    actor: args.actor,
    kind: "password_reset",
    summary: `${user.displayName} password reset and sessions revoked`,
  });
  return {
    ...demoIdentity(user)!,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  };
}

export function revokeDemoUserSessions(args: {
  userId: string;
  actor: string;
}): UserListItem | null {
  const user = users.find((item) => item.id === args.userId);
  if (!user || !demoIdentity(user)) return null;
  user.sessionVersion += 1;
  user.updatedAt = new Date();
  recordDemoUserEvent({
    userId: args.userId,
    actor: args.actor,
    kind: "sessions_revoked",
    summary: `${user.displayName} sessions revoked`,
  });
  return {
    ...demoIdentity(user)!,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  };
}

export function listDemoJobAssignments(jobId: string): JobAssignmentView[] {
  return jobAssignments
    .filter((assignment) => assignment.jobId === jobId)
    .flatMap((assignment): JobAssignmentView[] => {
      const user = users.find((item) => item.id === assignment.userId);
      if (!user) return [];
      return [
        {
          id: assignment.id,
          jobId: assignment.jobId,
          userId: assignment.userId,
          role: assignment.role as JobAssignmentRole,
          displayName: user.displayName,
          email: user.email,
          active: user.active,
          createdAt: assignment.createdAt,
        },
      ];
    })
    .sort((left, right) => left.displayName.localeCompare(right.displayName));
}

export function addDemoJobAssignment(args: {
  jobId: string;
  userId: string;
  role: JobAssignmentRole;
  actor: string;
}): JobAssignmentView | null {
  const job = getDemoJob(args.jobId);
  const identity = getDemoFieldIdentityById(args.userId);
  if (
    !job ||
    !identity ||
    !identity.active ||
    !identity.membershipActive ||
    (identity.role !== "field_lead" && identity.role !== "field_worker")
  ) {
    return null;
  }
  const existing = jobAssignments.find(
    (assignment) =>
      assignment.jobId === args.jobId && assignment.userId === args.userId,
  );
  if (existing) {
    existing.role = args.role;
  } else {
    jobAssignments.push({
      id: crypto.randomUUID(),
      createdAt: new Date(),
      jobId: args.jobId,
      userId: args.userId,
      role: args.role,
      createdBy: args.actor,
    });
  }
  if (args.role === "foreman") job.foreman = identity.displayName;
  job.updatedAt = new Date();
  jobEvents.push({
    id: crypto.randomUUID(),
    jobId: args.jobId,
    createdAt: new Date(),
    actor: args.actor,
    kind: "job_assigned",
    summary: `${identity.displayName} assigned as ${args.role}`,
    payload: { userId: args.userId, role: args.role },
  });
  return listDemoJobAssignments(args.jobId).find(
    (assignment) => assignment.userId === args.userId,
  ) ?? null;
}

export function removeDemoJobAssignment(args: {
  jobId: string;
  assignmentId: string;
  actor: string;
}): JobAssignmentView | null {
  const index = jobAssignments.findIndex(
    (assignment) =>
      assignment.id === args.assignmentId && assignment.jobId === args.jobId,
  );
  if (index < 0) return null;
  const view = listDemoJobAssignments(args.jobId).find(
    (assignment) => assignment.id === args.assignmentId,
  );
  const [removed] = jobAssignments.splice(index, 1);
  if (!removed || !view) return null;
  jobEvents.push({
    id: crypto.randomUUID(),
    jobId: args.jobId,
    createdAt: new Date(),
    actor: args.actor,
    kind: "job_unassigned",
    summary: `${view.displayName} removed from job`,
    payload: { userId: view.userId, role: view.role },
  });
  return view;
}

export function canDemoFieldUserAccessJob(
  userId: string,
  jobId: string,
): boolean {
  return (
    jobAssignments.some(
      (assignment) =>
        assignment.userId === userId && assignment.jobId === jobId,
    ) ||
    jobTasks.some(
      (task) => task.assigneeUserId === userId && task.jobId === jobId,
    )
  );
}

export function canDemoFieldUserAccessTask(
  userId: string,
  jobId: string,
  taskId: string,
): boolean {
  const hasJobAssignment = jobAssignments.some(
    (assignment) =>
      assignment.userId === userId && assignment.jobId === jobId,
  );
  const task = jobTasks.find(
    (item) => item.id === taskId && item.jobId === jobId,
  );
  return Boolean(task && (hasJobAssignment || task.assigneeUserId === userId));
}

export function matchesEstimateRequestFilters(
  request: EstimateRequestRow,
  filters: EstimateRequestFilters,
): boolean {
  const query = filters.q?.trim().toLowerCase();
  if (query) {
    const haystack = [
      request.id,
      request.company,
      request.firstName,
      request.lastName,
      request.email,
      request.phone,
      request.city,
    ]
      .join(" ")
      .toLowerCase();
    if (!haystack.includes(query)) return false;
  }
  if (filters.workflowStatus && isWorkflowStatus(filters.workflowStatus)) {
    if (request.workflowStatus !== filters.workflowStatus) return false;
  }
  if (
    filters.qualification === "qualified" ||
    filters.qualification === "secondary"
  ) {
    if (request.status !== filters.qualification) return false;
  }
  if (!isInDateRange(request.createdAt, filters)) return false;
  return true;
}

export function listDemoEstimateRequests(
  filters: EstimateRequestFilters = {},
): EstimateRequestRow[] {
  return requests
    .filter((request) => matchesEstimateRequestFilters(request, filters))
    .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
}

export function getDemoEstimateRequest(
  id: string,
): EstimateRequestRow | null {
  return requests.find((request) => request.id === id) ?? null;
}

export function listDemoEstimateRequestEvents(
  leadId: string,
): EstimateRequestEvent[] {
  return events
    .filter((event) => event.leadId === leadId)
    .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
}

export function updateDemoEstimateRequest(args: {
  id: string;
  actor: string;
  update: EstimateRequestUpdate;
}): EstimateRequestRow | null {
  const existing = getDemoEstimateRequest(args.id);
  if (!existing) return null;

  const now = new Date();
  existing.workflowStatus = args.update.workflowStatus;
  existing.assignedTo = args.update.assignedTo;
  existing.nextAction = args.update.nextAction;
  existing.nextActionDueAt = args.update.nextActionDueAt;
  existing.lostReason = args.update.lostReason;
  existing.updatedAt = now;

  const changes: string[] = [];
  if (existing.workflowStatus) changes.push("review updated");
  if (args.update.note) changes.push("internal note added");
  events.unshift({
    id: crypto.randomUUID(),
    leadId: args.id,
    createdAt: now,
    actor: args.actor,
    kind: "review_update",
    summary: args.update.note
      ? `review updated; internal note added`
      : "review updated",
    payload: {
      after: {
        workflowStatus: existing.workflowStatus,
        assignedTo: existing.assignedTo,
        nextAction: existing.nextAction,
      },
      note: args.update.note ?? null,
    },
  });
  if (existing.opportunityId && existing.workflowStatus === "won") {
    const opportunity = getDemoOpportunity(existing.opportunityId);
    if (opportunity) {
      opportunity.stage = "won";
      opportunity.updatedAt = now;
    }
  }
  return existing;
}

function recordEvent(args: {
  leadId: string;
  actor: string;
  kind: string;
  summary: string;
  payload: Record<string, unknown>;
}) {
  events.unshift({
    id: crypto.randomUUID(),
    leadId: args.leadId,
    createdAt: new Date(),
    actor: args.actor,
    kind: args.kind,
    summary: args.summary,
    payload: args.payload,
  });
}

export function listDemoEstimateRequestTasks(
  leadId: string,
): EstimateRequestTask[] {
  return tasks
    .filter((task) => task.leadId === leadId)
    .sort((a, b) => {
      if (a.status !== b.status) return a.status === "open" ? -1 : 1;
      return b.createdAt.getTime() - a.createdAt.getTime();
    });
}

export function listDemoEstimateRequestComments(
  leadId: string,
): EstimateRequestComment[] {
  return comments
    .filter((comment) => comment.leadId === leadId)
    .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
}

export function addDemoEstimateRequestTask(args: {
  leadId: string;
  actor: string;
  title: string;
  assignee: string | null;
  dueAt: Date | null;
}): EstimateRequestTask | null {
  if (!getDemoEstimateRequest(args.leadId)) return null;
  const now = new Date();
  const task: EstimateRequestTask = {
    id: crypto.randomUUID(),
    leadId: args.leadId,
    createdAt: now,
    updatedAt: now,
    title: args.title,
    assignee: args.assignee,
    dueAt: args.dueAt,
    status: "open",
    createdBy: args.actor,
  };
  tasks.unshift(task);
  recordEvent({
    leadId: args.leadId,
    actor: args.actor,
    kind: "task_created",
    summary: `task created: ${args.title}`,
    payload: { taskId: task.id, title: args.title },
  });
  return task;
}

export function setDemoEstimateRequestTaskStatus(args: {
  leadId: string;
  taskId: string;
  actor: string;
  status: "open" | "done";
}): EstimateRequestTask | null {
  const task = tasks.find(
    (item) => item.id === args.taskId && item.leadId === args.leadId,
  );
  if (!task) return null;
  task.status = args.status;
  task.updatedAt = new Date();
  recordEvent({
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

export function addDemoEstimateRequestComment(args: {
  leadId: string;
  actor: string;
  body: string;
}): EstimateRequestComment | null {
  if (!getDemoEstimateRequest(args.leadId)) return null;
  const comment: EstimateRequestComment = {
    id: crypto.randomUUID(),
    leadId: args.leadId,
    createdAt: new Date(),
    actor: args.actor,
    body: args.body,
  };
  comments.unshift(comment);
  recordEvent({
    leadId: args.leadId,
    actor: args.actor,
    kind: "comment_added",
    summary: "internal comment added",
    payload: { commentId: comment.id, body: args.body },
  });
  return comment;
}

export function listDemoCompanies(filters: CompanyListFilters = {}): CompanyRow[] {
  return companies
    .filter((company) =>
      matchesQuery(filters.q, [
        company.name,
        company.email,
        company.phone,
        company.city,
        company.province,
      ]),
    )
    .sort((a, b) => a.name.localeCompare(b.name));
}

export function getDemoCompany(id: string): CompanyRow | null {
  return companies.find((company) => company.id === id) ?? null;
}

export function listDemoContacts(companyId?: string): ContactRow[] {
  return contacts
    .filter((contact) => !companyId || contact.companyId === companyId)
    .sort((a, b) => a.lastName.localeCompare(b.lastName));
}

export function getDemoContact(id: string): ContactRow | null {
  return contacts.find((contact) => contact.id === id) ?? null;
}

export function listDemoSites(companyId?: string): SiteRow[] {
  return sites
    .filter((site) => !companyId || site.companyId === companyId)
    .sort((a, b) => a.name.localeCompare(b.name));
}

export function getDemoSite(id: string): SiteRow | null {
  return sites.find((site) => site.id === id) ?? null;
}

export function listDemoOpportunities(
  filters: OpportunityListFilters = {},
): OpportunityRow[] {
  return opportunities
    .filter((opportunity) => {
      if (filters.companyId && opportunity.companyId !== filters.companyId) {
        return false;
      }
      if (filters.stage && opportunity.stage !== filters.stage) return false;
      if (
        !matchesQuery(filters.q, [
          opportunity.name,
          opportunity.owner,
          opportunity.source,
          opportunity.projectType,
        ])
      ) {
        return false;
      }
      return isInDateRange(opportunity.createdAt, filters);
    })
    .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
}

export function getDemoOpportunity(id: string): OpportunityRow | null {
  return opportunities.find((opportunity) => opportunity.id === id) ?? null;
}

export function convertDemoRequestToCrm(args: {
  leadId: string;
  actor: string;
  input: CrmConversionInput;
}):
  | {
      ok: true;
      companyId: string;
      contactId: string;
      siteId: string;
      opportunityId: string;
      created: { company: boolean; contact: boolean; site: boolean };
    }
  | { ok: false; error: string } {
  const request = getDemoEstimateRequest(args.leadId);
  if (!request) return { ok: false, error: "That request could not be found." };
  if (request.opportunityId) {
    return {
      ok: false,
      error: "This request is already linked to CRM records.",
    };
  }

  let company = args.input.linkCompanyId
    ? getDemoCompany(args.input.linkCompanyId)
    : null;
  if (args.input.linkCompanyId && !company) {
    return { ok: false, error: "The selected company could not be found." };
  }

  let contact = args.input.linkContactId
    ? getDemoContact(args.input.linkContactId)
    : null;
  if (args.input.linkContactId && !contact) {
    return { ok: false, error: "The selected contact could not be found." };
  }

  const now = new Date();
  const created = { company: false, contact: false, site: false };

  if (!company) {
    company = {
      id: crypto.randomUUID(),
      createdAt: now,
      updatedAt: now,
      name: args.input.companyName,
      email: args.input.email,
      phone: args.input.phone || null,
      city: args.input.city,
      province: args.input.province,
    };
    companies.unshift(company);
    created.company = true;
  }

  if (!contact) {
    contact = {
      id: crypto.randomUUID(),
      createdAt: now,
      updatedAt: now,
      companyId: company.id,
      firstName: args.input.firstName,
      lastName: args.input.lastName,
      email: args.input.email,
      phone: args.input.phone || "",
      role: args.input.role,
    };
    contacts.unshift(contact);
    created.contact = true;
  } else if (!contact.companyId) {
    contact.companyId = company.id;
    contact.updatedAt = now;
  }

  let site =
    sites.find(
      (item) =>
        item.companyId === company.id &&
        item.city.toLowerCase() === args.input.city.toLowerCase() &&
        item.province === args.input.province,
    ) ?? null;
  if (!site) {
    site = {
      id: crypto.randomUUID(),
      createdAt: now,
      updatedAt: now,
      companyId: company.id,
      name: args.input.siteName,
      city: args.input.city,
      province: args.input.province,
    };
    sites.unshift(site);
    created.site = true;
  }

  const opportunity: OpportunityRow = {
    id: crypto.randomUUID(),
    createdAt: now,
    updatedAt: now,
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
    projectId: null,
  };
  opportunities.unshift(opportunity);

  request.companyId = company.id;
  request.contactId = contact.id;
  request.siteId = site.id;
  request.opportunityId = opportunity.id;
  request.updatedAt = now;

  recordEvent({
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

export function listDemoProjects(
  filters: string | ProjectListFilters = {},
): ProjectRow[] {
  const resolved =
    typeof filters === "string" ? { companyId: filters } : filters;
  return projects
    .filter((project) => {
      if (resolved.companyId && project.companyId !== resolved.companyId) {
        return false;
      }
      if (resolved.status && project.status !== resolved.status) return false;
      if (
        !matchesQuery(resolved.q, [project.name, project.projectManager])
      ) {
        return false;
      }
      return isInDateRange(project.createdAt, resolved);
    })
    .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
}

export function listDemoPortfolioSchedule(
  filters: PortfolioScheduleStoreFilters = {},
): PortfolioScheduleStoreResult {
  const query = filters.q?.trim();
  const projectStatus = filters.projectStatus?.trim();
  const projectManager = filters.projectManager?.trim();
  const projectResult = boundedRows(
    projects
      .filter((project) => {
        if (projectStatus && project.status !== projectStatus) return false;
        if (projectManager && project.projectManager !== projectManager) {
          return false;
        }
        return matchesQuery(query, [project.name, project.projectManager]);
      })
      .sort(
        (a, b) =>
          b.createdAt.getTime() - a.createdAt.getTime() ||
          a.id.localeCompare(b.id),
      )
      .slice(0, PORTFOLIO_PROJECT_LIMIT + 1),
    PORTFOLIO_PROJECT_LIMIT,
  );
  const selectedProjects = projectResult.rows;
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

  const projectIds = new Set(selectedProjects.map((project) => project.id));
  const jobResult = boundedRows(
    jobsList
      .filter((job) => job.projectId && projectIds.has(job.projectId))
      .sort(
        (a, b) =>
          b.createdAt.getTime() - a.createdAt.getTime() ||
          a.id.localeCompare(b.id),
      )
      .slice(0, PORTFOLIO_JOB_LIMIT + 1),
    PORTFOLIO_JOB_LIMIT,
  );
  const jobIds = new Set(jobResult.rows.map((job) => job.id));
  const taskResult = boundedRows(
    jobTasks
      .filter((task) => jobIds.has(task.jobId))
      .sort(
        (a, b) =>
          a.createdAt.getTime() - b.createdAt.getTime() ||
          a.id.localeCompare(b.id),
      )
      .slice(0, PORTFOLIO_TASK_LIMIT + 1),
    PORTFOLIO_TASK_LIMIT,
  );
  const dependencyResult = boundedRows(
    jobTaskDependencies
      .filter((dependency) => projectIds.has(dependency.projectId))
      .sort(
        (a, b) =>
          a.createdAt.getTime() - b.createdAt.getTime() ||
          a.id.localeCompare(b.id),
      )
      .slice(0, PORTFOLIO_DEPENDENCY_LIMIT + 1),
    PORTFOLIO_DEPENDENCY_LIMIT,
  );

  const defaultCalendar =
    findDemoDefaultScheduleCalendar() ?? createDemoDefaultScheduleCalendar();
  const calendarIds = new Set([
    defaultCalendar.id,
    ...selectedProjects.flatMap((project) =>
      project.scheduleCalendarId ? [project.scheduleCalendarId] : [],
    ),
  ]);
  const selectedCalendars = [
    defaultCalendar,
    ...scheduleCalendars.filter(
      (calendar) =>
        calendar.id !== defaultCalendar.id && calendarIds.has(calendar.id),
    ),
  ]
    .sort(
      (a, b) =>
        a.createdAt.getTime() - b.createdAt.getTime() ||
        a.id.localeCompare(b.id),
    );
  const calendarExceptionResult = boundedRows(
    scheduleCalendarExceptions
      .filter((exception) => calendarIds.has(exception.calendarId))
      .sort(
        (a, b) =>
          a.date.localeCompare(b.date) || a.id.localeCompare(b.id),
      )
      .slice(0, PORTFOLIO_CALENDAR_EXCEPTION_LIMIT + 1),
    PORTFOLIO_CALENDAR_EXCEPTION_LIMIT,
  );

  const latestBaselines = projectScheduleBaselines
    .filter(
      (baseline) =>
        projectIds.has(baseline.projectId) && baseline.deletedAt === null,
    )
    .sort(
      (a, b) =>
        a.projectId.localeCompare(b.projectId) ||
        b.capturedAt.getTime() - a.capturedAt.getTime() ||
        b.id.localeCompare(a.id),
    )
    .filter(
      (baseline, index, rows) =>
        index === 0 || rows[index - 1]?.projectId !== baseline.projectId,
    );
  const baselineIds = new Set(latestBaselines.map((baseline) => baseline.id));
  const baselineItemResult = boundedRows(
    projectScheduleBaselineItems
      .filter((item) => baselineIds.has(item.baselineId))
      .sort(
        (a, b) =>
          a.baselineId.localeCompare(b.baselineId) ||
          a.entityType.localeCompare(b.entityType) ||
          a.entityId.localeCompare(b.entityId) ||
          a.id.localeCompare(b.id),
      )
      .slice(0, PORTFOLIO_BASELINE_ITEM_LIMIT + 1),
    PORTFOLIO_BASELINE_ITEM_LIMIT,
  );

  return structuredClone({
    projects: selectedProjects,
    jobs: jobResult.rows,
    tasks: taskResult.rows,
    dependencies: dependencyResult.rows,
    calendars: selectedCalendars,
    calendarExceptions: calendarExceptionResult.rows,
    baselines: latestBaselines,
    baselineItems: baselineItemResult.rows,
    truncation: {
      projects: projectResult.truncated,
      jobs: jobResult.truncated,
      tasks: taskResult.truncated,
      dependencies: dependencyResult.truncated,
      calendarExceptions: calendarExceptionResult.truncated,
      baselineItems: baselineItemResult.truncated,
    },
  });
}

export function getDemoProject(id: string): ProjectRow | null {
  return projects.find((project) => project.id === id) ?? null;
}

export function listDemoJobs(filters: JobListFilters = {}): JobRow[] {
  return jobsList
    .filter((job) => {
      if (filters.projectId && job.projectId !== filters.projectId) return false;
      if (filters.companyId && job.companyId !== filters.companyId) return false;
      if (
        filters.fieldUserId &&
        !canDemoFieldUserAccessJob(filters.fieldUserId, job.id)
      ) {
        return false;
      }
      if (filters.status && job.status !== filters.status) return false;
      if (
        !matchesQuery(filters.q, [
          job.name,
          job.scope,
          job.foreman,
          job.projectManager,
        ])
      ) {
        return false;
      }
      return isInDateRange(job.plannedStartAt ?? job.createdAt, filters);
    })
    .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
}

export function getDemoJob(id: string): JobRow | null {
  return jobsList.find((job) => job.id === id) ?? null;
}

export function listDemoJobEvents(jobId: string): JobEventRow[] {
  return jobEvents
    .filter((event) => event.jobId === jobId)
    .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
}

export function listDemoJobEventsSince(args: {
  jobIds: string[];
  after: Date;
  limit: number;
}): JobEventRow[] {
  const allowed = new Set(args.jobIds);
  return jobEvents
    .filter(
      (event) =>
        allowed.has(event.jobId) && event.createdAt.getTime() > args.after.getTime(),
    )
    .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime())
    .slice(0, args.limit);
}

function recordJobEvent(args: {
  jobId: string;
  actor: string;
  kind: string;
  summary: string;
  payload: Record<string, unknown>;
}) {
  jobEvents.unshift({
    id: crypto.randomUUID(),
    jobId: args.jobId,
    createdAt: new Date(),
    actor: args.actor,
    kind: args.kind,
    summary: args.summary,
    payload: args.payload,
  });
}

export function recordDemoAiJobEvent(args: {
  jobId: string;
  actor: string;
  capabilityId: "AI-008" | "AI-009";
  provider: string;
  model: string;
  citationIds: string[];
}) {
  recordJobEvent({
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

export function listDemoHomeExceptionSource(): {
  jobs: Array<{ id: string; name: string; status: string; updatedAt: Date }>;
  tasks: Array<{
    id: string;
    jobId: string;
    title: string;
    status: string;
    dueAt: Date | null;
    plannedEndAt: Date | null;
  }>;
  fieldNotes: Array<{ jobId: string; kind: string; createdAt: Date }>;
  voiceNotes: Array<{
    id: string;
    jobId: string;
    status: string;
    transcript: string | null;
    filename: string;
    createdAt: Date;
  }>;
  events: Array<{ kind: string; payload: unknown; createdAt: Date }>;
} {
  return {
    jobs: jobsList.map((job) => ({
      id: job.id,
      name: job.name,
      status: job.status,
      updatedAt: job.updatedAt,
      timeZone: resolveDemoProjectScheduleCalendar(job.projectId).timeZone,
    })),
    tasks: jobTasks
      .filter((task) => task.status !== "done")
      .map((task) => ({
        id: task.id,
        jobId: task.jobId,
        title: task.title,
        status: task.status,
        dueAt: task.dueAt,
        plannedEndAt: task.plannedEndAt,
      })),
    fieldNotes: jobFieldNotes
      .filter((note) => note.kind === "daily_report")
      .map((note) => ({
        jobId: note.jobId,
        kind: note.kind,
        createdAt: note.createdAt,
      })),
    voiceNotes: jobVoiceNotes
      .filter((note) => note.status === "failed" || note.status === "completed")
      .map((note) => ({
        id: note.id,
        jobId: note.jobId,
        status: note.status,
        transcript: note.transcript,
        filename: note.filename,
        createdAt: note.createdAt,
      })),
    events: jobEvents
      .filter((event) => event.kind === "voice_note_extracted")
      .map((event) => ({
        kind: event.kind,
        payload: event.payload,
        createdAt: event.createdAt,
      })),
  };
}

export function convertDemoOpportunityToProject(args: {
  opportunityId: string;
  actor: string;
  input: JobConversionInput;
}):
  | { ok: true; projectId: string; jobId: string }
  | { ok: false; error: string } {
  const opportunity = getDemoOpportunity(args.opportunityId);
  if (!opportunity) {
    return { ok: false, error: "That opportunity could not be found." };
  }
  if (opportunity.projectId) {
    return { ok: false, error: "This opportunity already has a project." };
  }

  const request = opportunity.sourceLeadId
    ? getDemoEstimateRequest(opportunity.sourceLeadId)
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

  const now = new Date();
  const project: ProjectRow = {
    id: crypto.randomUUID(),
    createdAt: now,
    updatedAt: now,
    companyId: opportunity.companyId,
    siteId: opportunity.siteId,
    opportunityId: opportunity.id,
    sourceLeadId: opportunity.sourceLeadId,
    name: args.input.projectName,
    status: "active",
    projectManager: args.input.projectManager,
    scheduleCalendarId: null,
  };
  projects.unshift(project);
  opportunity.projectId = project.id;
  opportunity.stage = "won";
  opportunity.updatedAt = now;

  const job: JobRow = {
    id: crypto.randomUUID(),
    createdAt: now,
    updatedAt: now,
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
    blockerNote: null,
  };
  jobsList.unshift(job);
  recordJobEvent({
    jobId: job.id,
    actor: args.actor,
    kind: "job_created",
    summary: `job created from won work: ${job.name}`,
    payload: { projectId: project.id, opportunityId: opportunity.id },
  });

  if (request) {
    request.workflowStatus = "won";
    request.updatedAt = now;
    recordEvent({
      leadId: request.id,
      actor: args.actor,
      kind: "project_created",
      summary: `project created: ${project.name}`,
      payload: { projectId: project.id, jobId: job.id },
    });
  }

  return { ok: true, projectId: project.id, jobId: job.id };
}

export function addDemoJobToProject(args: {
  projectId: string;
  actor: string;
  input: JobConversionInput;
}): { ok: true; jobId: string } | { ok: false; error: string } {
  const project = getDemoProject(args.projectId);
  if (!project) return { ok: false, error: "That project could not be found." };
  const now = new Date();
  const job: JobRow = {
    id: crypto.randomUUID(),
    createdAt: now,
    updatedAt: now,
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
    blockerNote: null,
  };
  jobsList.unshift(job);
  recordJobEvent({
    jobId: job.id,
    actor: args.actor,
    kind: "job_created",
    summary: `job added to project: ${job.name}`,
    payload: { projectId: project.id },
  });
  return { ok: true, jobId: job.id };
}

export function setDemoJobStatus(args: {
  jobId: string;
  actor: string;
  status: JobStatus;
  blockerNote: string | null;
}): JobRow | null {
  const job = getDemoJob(args.jobId);
  if (!job) return null;
  const before = job.status;
  job.status = args.status;
  job.blockerNote = args.blockerNote;
  job.updatedAt = new Date();
  recordJobEvent({
    jobId: job.id,
    actor: args.actor,
    kind: "job_status",
    summary: `status ${before} → ${args.status}`,
    payload: { before, after: args.status, blockerNote: args.blockerNote },
  });
  return job;
}

export function listDemoWorkAreas(jobId: string): WorkAreaRow[] {
  return workAreas
    .filter((area) => area.jobId === jobId)
    .sort((a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name));
}

export function getDemoWorkArea(
  jobId: string,
  workAreaId: string,
): WorkAreaRow | null {
  return (
    workAreas.find(
      (area) => area.id === workAreaId && area.jobId === jobId,
    ) ?? null
  );
}

export function addDemoWorkArea(args: {
  jobId: string;
  actor: string;
  input: WorkAreaInput;
}): WorkAreaRow | null {
  if (!getDemoJob(args.jobId)) return null;
  const now = new Date();
  const sortOrder =
    workAreas.reduce(
      (max, area) =>
        area.jobId === args.jobId ? Math.max(max, area.sortOrder) : max,
      -1,
    ) + 1;
  const area: WorkAreaRow = {
    id: crypto.randomUUID(),
    createdAt: now,
    updatedAt: now,
    jobId: args.jobId,
    name: args.input.name,
    kind: args.input.kind,
    notes: args.input.notes,
    sortOrder,
  };
  workAreas.push(area);
  recordJobEvent({
    jobId: args.jobId,
    actor: args.actor,
    kind: "work_area_added",
    summary: `work area added: ${area.name}`,
    payload: { workAreaId: area.id, kind: area.kind },
  });
  return area;
}

export function listDemoJobTasks(
  jobId: string,
  filters: JobTaskListFilters = {},
): JobTaskRow[] {
  return sortJobTaskRows(
    jobTasks.filter((task) => {
      if (task.jobId !== jobId) return false;
      if (filters.status && task.status !== filters.status) return false;
      return isInDateRange(task.dueAt ?? task.createdAt, filters);
    }),
  );
}

export function listDemoProjectJobTasks(projectId: string): {
  tasks: JobTaskRow[];
  truncated: boolean;
} {
  const jobIds = new Set(
    jobsList.filter((job) => job.projectId === projectId).map((job) => job.id),
  );
  const rows = jobTasks
    .filter((task) => jobIds.has(task.jobId))
    .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime())
    .slice(0, 1_001);
  return {
    tasks: rows.slice(0, 1_000),
    truncated: rows.length > 1_000,
  };
}

export function listDemoProjectTaskDependencies(projectId: string): {
  edges: JobTaskDependencyRow[];
  truncated: boolean;
} {
  const rows = jobTaskDependencies
    .filter((edge) => edge.projectId === projectId)
    .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime())
    .slice(0, 2_001);
  return {
    edges: rows.slice(0, 2_000),
    truncated: rows.length > 2_000,
  };
}

export function addDemoJobTaskDependency(args: {
  projectId: string;
  predecessorTaskId: string;
  successorTaskId: string;
  lagDays: number;
  actor: string;
}):
  | { ok: true; dependency: JobTaskDependencyRow }
  | { ok: false; error: string; field?: string } {
  const projectTasks = listDemoProjectJobTasks(args.projectId).tasks;
  const taskIds = new Set(projectTasks.map((task) => task.id));
  if (
    !taskIds.has(args.predecessorTaskId) ||
    !taskIds.has(args.successorTaskId)
  ) {
    return { ok: false, error: "Both tasks must belong to this project." };
  }
  const existing = listDemoProjectTaskDependencies(args.projectId).edges;
  const validation = validateDependencyAddition(
    projectTasks.map((task) => ({
      id: task.id,
      title: task.title,
      plannedStartAt: task.plannedStartAt?.toISOString() ?? null,
      plannedEndAt: task.plannedEndAt?.toISOString() ?? null,
    })),
    existing,
    args,
  );
  if (!validation.ok) return validation;

  const dependency: JobTaskDependencyRow = {
    id: crypto.randomUUID(),
    createdAt: new Date(),
    projectId: args.projectId,
    predecessorTaskId: args.predecessorTaskId,
    successorTaskId: args.successorTaskId,
    lagDays: args.lagDays,
    createdBy: args.actor,
  };
  jobTaskDependencies.push(dependency);
  const successor = projectTasks.find(
    (task) => task.id === args.successorTaskId,
  );
  if (successor) {
    recordJobEvent({
      jobId: successor.jobId,
      actor: args.actor,
      kind: "task_dependency_added",
      summary: `task dependency added: ${successor.title}`,
      payload: {
        dependencyId: dependency.id,
        predecessorTaskId: args.predecessorTaskId,
        successorTaskId: args.successorTaskId,
        lagDays: args.lagDays,
      },
    });
  }
  return { ok: true, dependency };
}

export function deleteDemoJobTaskDependency(args: {
  projectId: string;
  dependencyId: string;
  actor: string;
}): { ok: true } | { ok: false; error: string } {
  const dependency = jobTaskDependencies.find(
    (edge) =>
      edge.id === args.dependencyId && edge.projectId === args.projectId,
  );
  if (!dependency) {
    return { ok: false, error: "That dependency could not be found." };
  }
  const successor = jobTasks.find(
    (task) => task.id === dependency.successorTaskId,
  );
  removeById(jobTaskDependencies, dependency.id);
  if (successor) {
    recordJobEvent({
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

export function rescheduleDemoJob(args: {
  projectId: string;
  jobId: string;
  plannedStartAt: Date | null;
  plannedEndAt: Date | null;
  expectedUpdatedAt: Date;
  actor: string;
}): { ok: true; job: JobRow } | { ok: false; error: string } {
  const job = jobsList.find(
    (item) => item.id === args.jobId && item.projectId === args.projectId,
  );
  if (!job) return { ok: false, error: "That job could not be found." };
  if (job.updatedAt.getTime() !== args.expectedUpdatedAt.getTime()) {
    return {
      ok: false,
      error: "This schedule changed. Refresh and try again.",
    };
  }
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
  const before = {
    plannedStartAt: job.plannedStartAt?.toISOString() ?? null,
    plannedEndAt: job.plannedEndAt?.toISOString() ?? null,
  };
  job.plannedStartAt = args.plannedStartAt;
  job.plannedEndAt = args.plannedEndAt;
  job.updatedAt = new Date();
  recordJobEvent({
    jobId: job.id,
    actor: args.actor,
    kind: "job_rescheduled",
    summary: `job rescheduled: ${job.name}`,
    payload: {
      before,
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

export function rescheduleDemoJobTask(args: {
  projectId: string;
  jobId: string;
  taskId: string;
  plannedStartAt: Date | null;
  plannedEndAt: Date | null;
  dueAt: Date | null;
  expectedUpdatedAt: Date;
  actor: string;
}): { ok: true; task: JobTaskRow } | { ok: false; error: string } {
  const job = jobsList.find(
    (item) => item.id === args.jobId && item.projectId === args.projectId,
  );
  const task = jobTasks.find(
    (item) => item.id === args.taskId && item.jobId === args.jobId,
  );
  if (!job || !task) {
    return { ok: false, error: "That task could not be found." };
  }
  if (task.updatedAt.getTime() !== args.expectedUpdatedAt.getTime()) {
    return {
      ok: false,
      error: "This schedule changed. Refresh and try again.",
    };
  }
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
  const projectTasks = listDemoProjectJobTasks(args.projectId).tasks;
  const validation = validateDependencyDates(
    projectTasks.map((item) => ({
      id: item.id,
      title: item.title,
      plannedStartAt:
        item.id === task.id
          ? args.plannedStartAt?.toISOString() ?? null
          : item.plannedStartAt?.toISOString() ?? null,
      plannedEndAt:
        item.id === task.id
          ? args.plannedEndAt?.toISOString() ?? null
          : item.plannedEndAt?.toISOString() ?? null,
    })),
    listDemoProjectTaskDependencies(args.projectId).edges,
  );
  if (!validation.ok) return { ok: false, error: validation.error };

  const before = {
    plannedStartAt: task.plannedStartAt?.toISOString() ?? null,
    plannedEndAt: task.plannedEndAt?.toISOString() ?? null,
    dueAt: task.dueAt?.toISOString() ?? null,
  };
  task.plannedStartAt = args.plannedStartAt;
  task.plannedEndAt = args.plannedEndAt;
  task.dueAt = args.dueAt;
  task.updatedAt = new Date();
  recordJobEvent({
    jobId: task.jobId,
    actor: args.actor,
    kind: "task_rescheduled",
    summary: `task rescheduled: ${task.title}`,
    payload: {
      before,
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

export function listDemoProjectScheduleBaselines(
  projectId: string,
): ProjectScheduleBaselineRow[] {
  return projectScheduleBaselines
    .filter(
      (baseline) =>
        baseline.projectId === projectId && baseline.deletedAt === null,
    )
    .sort((a, b) => b.capturedAt.getTime() - a.capturedAt.getTime());
}

export function getDemoProjectScheduleBaseline(
  projectId: string,
  baselineId: string,
): {
  baseline: ProjectScheduleBaselineRow;
  items: ProjectScheduleBaselineItemRow[];
} | null {
  const baseline = projectScheduleBaselines.find(
    (item) => item.id === baselineId && item.projectId === projectId,
  );
  if (!baseline) return null;
  return {
    baseline,
    items: projectScheduleBaselineItems.filter(
      (item) => item.baselineId === baseline.id,
    ),
  };
}

export function captureDemoProjectScheduleBaseline(args: {
  projectId: string;
  name: string;
  actor: string;
}):
  | {
      ok: true;
      baseline: ProjectScheduleBaselineRow;
      items: ProjectScheduleBaselineItemRow[];
    }
  | { ok: false; error: string } {
  if (!getDemoProject(args.projectId)) {
    return { ok: false, error: "That project could not be found." };
  }
  const name = args.name.trim();
  if (!name) return { ok: false, error: "A baseline name is required." };
  const baseline: ProjectScheduleBaselineRow = {
    id: crypto.randomUUID(),
    projectId: args.projectId,
    name,
    capturedAt: new Date(),
    capturedBy: args.actor,
    deletedAt: null,
    deletedBy: null,
  };
  const projectJobs = jobsList.filter(
    (job) => job.projectId === args.projectId,
  );
  const jobIds = new Set(projectJobs.map((job) => job.id));
  const projectTasks = jobTasks.filter((task) => jobIds.has(task.jobId));
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
    ...projectTasks.map((task) => ({
      id: crypto.randomUUID(),
      baselineId: baseline.id,
      entityType: "task",
      entityId: task.id,
      plannedStartAt: task.plannedStartAt,
      plannedEndAt: task.plannedEndAt,
      dueAt: task.dueAt,
    })),
  ];
  projectScheduleBaselines.push(baseline);
  projectScheduleBaselineItems.push(...items);
  return { ok: true, baseline, items };
}

export function removeDemoProjectScheduleBaseline(args: {
  projectId: string;
  baselineId: string;
  actor: string;
}): { ok: true } | { ok: false; error: string } {
  const baseline = projectScheduleBaselines.find(
    (item) =>
      item.id === args.baselineId &&
      item.projectId === args.projectId &&
      item.deletedAt === null,
  );
  if (!baseline) {
    return { ok: false, error: "That baseline could not be found." };
  }
  baseline.deletedAt = new Date();
  baseline.deletedBy = args.actor;
  return { ok: true };
}

function validTimeZone(value: string): boolean {
  try {
    new Intl.DateTimeFormat("en", { timeZone: value }).format();
    return true;
  } catch {
    return false;
  }
}

function validIsoDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [year, month, day] = value.split("-").map(Number);
  const parsed = new Date(Date.UTC(year!, month! - 1, day!));
  return (
    parsed.getUTCFullYear() === year &&
    parsed.getUTCMonth() === month! - 1 &&
    parsed.getUTCDate() === day
  );
}

function findDemoDefaultScheduleCalendar(): ScheduleCalendarRow | undefined {
  return scheduleCalendars
    .filter((calendar) => calendar.isDefault)
    .sort(
      (a, b) =>
        a.createdAt.getTime() - b.createdAt.getTime() ||
        a.id.localeCompare(b.id),
    )[0];
}

function createDemoDefaultScheduleCalendar(
  actor = "system@strongfoam.com",
): ScheduleCalendarRow {
  return {
    id: DEMO_DEFAULT_CALENDAR_ID,
    createdAt: new Date(DEMO_DEFAULT_CALENDAR_TIMESTAMP),
    updatedAt: new Date(DEMO_DEFAULT_CALENDAR_TIMESTAMP),
    updatedBy: actor,
    name: "Standard Monday–Friday",
    timeZone: "America/Toronto",
    weekendDays: [0, 6],
    isDefault: true,
  };
}

function ensureDemoDefaultScheduleCalendar(
  actor = "system@strongfoam.com",
): ScheduleCalendarRow {
  const existing = findDemoDefaultScheduleCalendar();
  if (existing) return existing;
  const calendar = createDemoDefaultScheduleCalendar(actor);
  scheduleCalendars.push(calendar);
  return calendar;
}

export function resolveDemoProjectScheduleCalendar(
  projectId: string,
): ResolvedWorkingCalendar & {
  id: string;
  name: string;
  updatedAt: string;
  updatedBy: string;
} {
  const project = getDemoProject(projectId);
  const calendar =
    scheduleCalendars.find(
      (candidate) => candidate.id === project?.scheduleCalendarId,
    ) ?? ensureDemoDefaultScheduleCalendar();
  return {
    id: calendar.id,
    name: calendar.name,
    timeZone: calendar.timeZone,
    weekendDays: [...calendar.weekendDays],
    updatedAt: calendar.updatedAt.toISOString(),
    updatedBy: calendar.updatedBy,
    exceptions: scheduleCalendarExceptions
      .filter((exception) => exception.calendarId === calendar.id)
      .map((exception) => ({
        id: exception.id,
        date: exception.date,
        name: exception.name,
        isWorkingDay: exception.isWorkingDay,
      })),
  };
}

export function saveDemoProjectScheduleCalendar(args: {
  projectId: string;
  name: string;
  timeZone: string;
  weekendDays: number[];
  actor: string;
}): { ok: true; calendar: ScheduleCalendarRow } | { ok: false; error: string } {
  const project = getDemoProject(args.projectId);
  if (!project) return { ok: false, error: "That project could not be found." };
  if (!args.name.trim()) {
    return { ok: false, error: "A calendar name is required." };
  }
  if (!validTimeZone(args.timeZone)) {
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
  let calendar = scheduleCalendars.find(
    (candidate) => candidate.id === project.scheduleCalendarId,
  );
  if (!calendar) {
    const now = new Date();
    calendar = {
      id: crypto.randomUUID(),
      createdAt: now,
      updatedAt: now,
      updatedBy: args.actor,
      name: args.name.trim(),
      timeZone: args.timeZone,
      weekendDays,
      isDefault: scheduleCalendars.length === 0,
    };
    scheduleCalendars.push(calendar);
    project.scheduleCalendarId = calendar.id;
    project.updatedAt = now;
  } else {
    calendar.name = args.name.trim();
    calendar.timeZone = args.timeZone;
    calendar.weekendDays = weekendDays;
    calendar.updatedAt = new Date();
    calendar.updatedBy = args.actor;
  }
  return { ok: true, calendar };
}

export function upsertDemoScheduleCalendarException(args: {
  projectId: string;
  calendarId: string;
  date: string;
  name: string;
  isWorkingDay: boolean;
  actor: string;
}):
  | { ok: true; exception: ScheduleCalendarExceptionRow }
  | { ok: false; error: string } {
  const project = getDemoProject(args.projectId);
  if (
    !project ||
    project.scheduleCalendarId !== args.calendarId ||
    !scheduleCalendars.some((calendar) => calendar.id === args.calendarId)
  ) {
    return { ok: false, error: "That calendar could not be found." };
  }
  if (!validIsoDate(args.date)) {
    return { ok: false, error: "Use a valid calendar date." };
  }
  if (!args.name.trim()) {
    return { ok: false, error: "An exception name is required." };
  }
  const existing = scheduleCalendarExceptions.find(
    (exception) =>
      exception.calendarId === args.calendarId &&
      exception.date === args.date,
  );
  if (existing) {
    existing.name = args.name.trim();
    existing.isWorkingDay = args.isWorkingDay;
    existing.updatedAt = new Date();
    existing.updatedBy = args.actor;
    return { ok: true, exception: existing };
  }
  const now = new Date();
  const exception: ScheduleCalendarExceptionRow = {
    id: crypto.randomUUID(),
    createdAt: now,
    updatedAt: now,
    updatedBy: args.actor,
    calendarId: args.calendarId,
    date: args.date,
    name: args.name.trim(),
    isWorkingDay: args.isWorkingDay,
  };
  scheduleCalendarExceptions.push(exception);
  return { ok: true, exception };
}

export function removeDemoScheduleCalendarException(args: {
  projectId: string;
  calendarId: string;
  exceptionId: string;
  actor: string;
}): { ok: true } | { ok: false; error: string } {
  const project = getDemoProject(args.projectId);
  if (!project || project.scheduleCalendarId !== args.calendarId) {
    return { ok: false, error: "That calendar exception could not be found." };
  }
  const exception = scheduleCalendarExceptions.find(
    (item) =>
      item.id === args.exceptionId && item.calendarId === args.calendarId,
  );
  if (!exception) {
    return { ok: false, error: "That calendar exception could not be found." };
  }
  removeById(scheduleCalendarExceptions, exception.id);
  const calendar = scheduleCalendars.find(
    (item) => item.id === args.calendarId,
  );
  if (calendar) {
    calendar.updatedAt = new Date();
    calendar.updatedBy = args.actor;
  }
  return { ok: true };
}

export function addDemoJobTask(args: {
  jobId: string;
  actor: string;
  input: JobTaskInput;
}): JobTaskRow | null {
  if (!getDemoJob(args.jobId)) return null;
  if (args.input.workAreaId && !getDemoWorkArea(args.jobId, args.input.workAreaId)) {
    return null;
  }
  const assigneeIdentity = args.input.assigneeUserId
    ? getDemoFieldIdentityById(args.input.assigneeUserId)
    : null;
  if (args.input.assigneeUserId && !assigneeIdentity) return null;
  const now = new Date();
  const task: JobTaskRow = {
    id: crypto.randomUUID(),
    createdAt: now,
    updatedAt: now,
    jobId: args.jobId,
    workAreaId: args.input.workAreaId,
    title: args.input.title,
    assignee: assigneeIdentity?.displayName ?? args.input.assignee,
    assigneeUserId: args.input.assigneeUserId,
    dueAt: args.input.dueAt,
    plannedStartAt: args.input.plannedStartAt,
    plannedEndAt: args.input.plannedEndAt,
    completedAt: null,
    status: "open",
    createdBy: args.actor,
  };
  jobTasks.unshift(task);
  recordJobEvent({
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

export function setDemoJobTaskStatus(args: {
  jobId: string;
  taskId: string;
  actor: string;
  status: "open" | "done";
}): JobTaskRow | null {
  const task = jobTasks.find(
    (item) => item.id === args.taskId && item.jobId === args.jobId,
  );
  if (!task) return null;
  task.status = args.status;
  task.completedAt = args.status === "done" ? new Date() : null;
  task.updatedAt = new Date();
  recordJobEvent({
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

export function listDemoJobDocuments(
  jobId: string,
  filters: JobDocumentListFilters = {},
): JobDocumentRow[] {
  return jobDocuments
    .filter((document) => {
      if (document.jobId !== jobId) return false;
      if (filters.kind && document.kind !== filters.kind) return false;
      return isInDateRange(document.createdAt, filters);
    })
    .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
}

export function getDemoJobDocument(
  jobId: string,
  documentId: string,
): JobDocumentRow | null {
  return (
    jobDocuments.find(
      (document) => document.id === documentId && document.jobId === jobId,
    ) ?? null
  );
}

export function addDemoJobDocument(args: {
  jobId: string;
  actor: string;
  input: JobDocumentInput;
  bytes: Uint8Array;
}): JobDocumentRow | null {
  if (!getDemoJob(args.jobId)) return null;
  if (args.input.workAreaId && !getDemoWorkArea(args.jobId, args.input.workAreaId)) {
    return null;
  }
  const id = crypto.randomUUID();
  const now = new Date();
  const pathname = `jobs/${args.jobId}/${id}/${args.input.filename}`;
  let sheetKey = id;
  let versionNumber = 1;
  let replacesDocumentId: string | null = null;
  const previousId = args.input.replacesDocumentId ?? null;
  if (previousId) {
    const previous = getDemoJobDocument(args.jobId, previousId);
    if (
      !previous ||
      !isCurrentPlanDocument(previous) ||
      args.input.kind !== "plan"
    ) {
      return null;
    }
    sheetKey = planSheetKey(previous);
    previous.sheetKey = sheetKey;
    previous.supersededAt = now;
    versionNumber = previous.versionNumber + 1;
    replacesDocumentId = previous.id;
  }
  const document: JobDocumentRow = {
    id,
    createdAt: now,
    jobId: args.jobId,
    workAreaId: args.input.workAreaId,
    filename: args.input.filename,
    contentType: args.input.contentType,
    sizeBytes: args.input.sizeBytes,
    pathname,
    storage: "memory",
    kind: args.input.kind,
    uploadedBy: args.actor,
    sheetKey,
    versionNumber,
    replacesDocumentId,
    supersededAt: null,
  };
  setJobDocumentBytes(id, args.bytes);
  jobDocuments.unshift(document);
  recordJobEvent({
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
  return document;
}

export function getDemoJobDocumentDownload(
  jobId: string,
  documentId: string,
): { document: JobDocumentRow; bytes: Uint8Array } | null {
  const document = getDemoJobDocument(jobId, documentId);
  if (!document) return null;
  const bytes = getStoredJobDocumentBytes(document.id);
  if (!bytes) return null;
  return { document, bytes };
}

export function listDemoJobFieldNotes(
  jobId: string,
  filters: JobFieldNoteListFilters = {},
): JobFieldNoteRow[] {
  return jobFieldNotes
    .filter((note) => {
      if (note.jobId !== jobId) return false;
      if (filters.kind && note.kind !== filters.kind) return false;
      if (filters.workAreaId && note.workAreaId !== filters.workAreaId) {
        return false;
      }
      return isInDateRange(note.createdAt, filters);
    })
    .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
}

export function addDemoJobFieldNote(args: {
  jobId: string;
  actor: string;
  input: FieldNoteInput;
}): JobFieldNoteRow | null {
  if (!getDemoJob(args.jobId)) return null;
  if (args.input.workAreaId && !getDemoWorkArea(args.jobId, args.input.workAreaId)) {
    return null;
  }
  if (
    args.input.taskId &&
    !jobTasks.some(
      (task) => task.id === args.input.taskId && task.jobId === args.jobId,
    )
  ) {
    return null;
  }

  const note: JobFieldNoteRow = {
    id: crypto.randomUUID(),
    createdAt: getOpsNow(),
    jobId: args.jobId,
    workAreaId: args.input.workAreaId,
    taskId: args.input.taskId,
    annotationId: args.input.annotationId ?? null,
    kind: args.input.kind,
    body: args.input.body,
    quantity: args.input.quantity,
    unit: args.input.unit,
    createdBy: args.actor,
  };
  jobFieldNotes.unshift(note);

  const labels: Record<FieldNoteInput["kind"], string> = {
    note: "field note added",
    quantity: "quantity recorded",
    blocker: "blocker reported",
    deficiency: "deficiency recorded",
    material_request: "material request added",
    daily_report: "daily report submitted",
  };
  recordJobEvent({
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

function removeById<T extends { id: string }>(items: T[], id: string): T | null {
  const index = items.findIndex((item) => item.id === id);
  if (index === -1) return null;
  return items.splice(index, 1)[0] ?? null;
}

export function addDemoCompany(input: CompanyInput): CompanyRow {
  const now = new Date();
  const company: CompanyRow = {
    id: crypto.randomUUID(),
    createdAt: now,
    updatedAt: now,
    ...input,
  };
  companies.unshift(company);
  return company;
}

export function updateDemoCompany(
  id: string,
  input: CompanyInput,
): CompanyRow | null {
  const company = getDemoCompany(id);
  if (!company) return null;
  Object.assign(company, input, { updatedAt: new Date() });
  return company;
}

export function deleteDemoCompany(
  id: string,
): { ok: true } | { ok: false; error: string } {
  if (contacts.some((item) => item.companyId === id)) {
    return { ok: false, error: "Remove or reassign contacts before deleting this company." };
  }
  if (sites.some((item) => item.companyId === id)) {
    return { ok: false, error: "Remove sites before deleting this company." };
  }
  if (opportunities.some((item) => item.companyId === id)) {
    return { ok: false, error: "This company still has opportunities." };
  }
  if (projects.some((item) => item.companyId === id) || jobsList.some((item) => item.companyId === id)) {
    return { ok: false, error: "This company still has projects or jobs." };
  }
  return removeById(companies, id)
    ? { ok: true }
    : { ok: false, error: "That company could not be found." };
}

export function addDemoContact(args: {
  companyId: string;
  input: ContactInput;
}): ContactRow | null {
  if (!getDemoCompany(args.companyId)) return null;
  const now = new Date();
  const contact: ContactRow = {
    id: crypto.randomUUID(),
    createdAt: now,
    updatedAt: now,
    companyId: args.companyId,
    ...args.input,
  };
  contacts.unshift(contact);
  return contact;
}

export function updateDemoContact(
  id: string,
  input: ContactInput,
): ContactRow | null {
  const contact = getDemoContact(id);
  if (!contact) return null;
  Object.assign(contact, input, { updatedAt: new Date() });
  return contact;
}

export function deleteDemoContact(id: string): ContactRow | null {
  return removeById(contacts, id);
}

export function addDemoSite(args: {
  companyId: string;
  input: SiteInput;
}): SiteRow | null {
  if (!getDemoCompany(args.companyId)) return null;
  const now = new Date();
  const site: SiteRow = {
    id: crypto.randomUUID(),
    createdAt: now,
    updatedAt: now,
    companyId: args.companyId,
    ...args.input,
  };
  sites.unshift(site);
  return site;
}

export function updateDemoSite(id: string, input: SiteInput): SiteRow | null {
  const site = getDemoSite(id);
  if (!site) return null;
  Object.assign(site, input, { updatedAt: new Date() });
  return site;
}

export function deleteDemoSite(
  id: string,
): { ok: true } | { ok: false; error: string } {
  if (
    opportunities.some((item) => item.siteId === id) ||
    projects.some((item) => item.siteId === id) ||
    jobsList.some((item) => item.siteId === id)
  ) {
    return { ok: false, error: "This site is still used by an opportunity, project, or job." };
  }
  return removeById(sites, id)
    ? { ok: true }
    : { ok: false, error: "That site could not be found." };
}

export function updateDemoOpportunity(args: {
  id: string;
  input: OpportunityUpdateInput;
}): OpportunityRow | null {
  const opportunity = getDemoOpportunity(args.id);
  if (!opportunity) return null;
  opportunity.name = args.input.name;
  opportunity.stage = args.input.stage;
  opportunity.owner = args.input.owner;
  opportunity.updatedAt = new Date();
  return opportunity;
}

export function deleteDemoOpportunity(
  id: string,
): { ok: true } | { ok: false; error: string } {
  const opportunity = getDemoOpportunity(id);
  if (!opportunity) return { ok: false, error: "That opportunity could not be found." };
  if (opportunity.projectId) {
    return { ok: false, error: "Convert or unlink the project before deleting this opportunity." };
  }
  return removeById(opportunities, id)
    ? { ok: true }
    : { ok: false, error: "That opportunity could not be found." };
}

export function updateDemoProject(args: {
  id: string;
  input: ProjectUpdateInput;
}): ProjectRow | null {
  const project = getDemoProject(args.id);
  if (!project) return null;
  project.name = args.input.name;
  project.status = args.input.status;
  project.projectManager = args.input.projectManager;
  project.updatedAt = new Date();
  return project;
}

export function deleteDemoProject(
  id: string,
): { ok: true } | { ok: false; error: string } {
  if (jobsList.some((job) => job.projectId === id)) {
    return { ok: false, error: "Remove jobs before deleting this project." };
  }
  return removeById(projects, id)
    ? { ok: true }
    : { ok: false, error: "That project could not be found." };
}

export function updateDemoJobDetails(args: {
  jobId: string;
  actor: string;
  input: JobDetailsInput;
}): JobRow | null {
  const job = getDemoJob(args.jobId);
  if (!job) return null;
  job.name = args.input.name;
  job.scope = args.input.scope;
  job.projectManager = args.input.projectManager;
  job.foreman = args.input.foreman;
  job.plannedStartAt = args.input.plannedStartAt;
  job.plannedEndAt = args.input.plannedEndAt;
  job.updatedAt = new Date();
  recordJobEvent({
    jobId: job.id,
    actor: args.actor,
    kind: "job_updated",
    summary: `job details updated: ${job.name}`,
    payload: { name: job.name, scope: job.scope },
  });
  return job;
}

export function deleteDemoJob(
  jobId: string,
): { ok: true } | { ok: false; error: string } {
  if (!getDemoJob(jobId)) {
    return { ok: false, error: "That job could not be found." };
  }
  for (let i = jobVoiceNotes.length - 1; i >= 0; i -= 1) {
    const note = jobVoiceNotes[i];
    if (note?.jobId === jobId) {
      clearVoiceNoteBytes(note.id);
      jobVoiceNotes.splice(i, 1);
    }
  }
  for (let i = jobFieldNotes.length - 1; i >= 0; i -= 1) {
    if (jobFieldNotes[i]?.jobId === jobId) jobFieldNotes.splice(i, 1);
  }
  for (let i = jobPlanAnnotations.length - 1; i >= 0; i -= 1) {
    if (jobPlanAnnotations[i]?.jobId === jobId) jobPlanAnnotations.splice(i, 1);
  }
  for (let i = jobDocuments.length - 1; i >= 0; i -= 1) {
    const document = jobDocuments[i];
    if (document?.jobId === jobId) {
      clearJobDocumentBytes(document.id);
      jobDocuments.splice(i, 1);
    }
  }
  for (let i = jobTasks.length - 1; i >= 0; i -= 1) {
    if (jobTasks[i]?.jobId === jobId) jobTasks.splice(i, 1);
  }
  for (let i = workAreas.length - 1; i >= 0; i -= 1) {
    if (workAreas[i]?.jobId === jobId) workAreas.splice(i, 1);
  }
  for (let i = jobEvents.length - 1; i >= 0; i -= 1) {
    if (jobEvents[i]?.jobId === jobId) jobEvents.splice(i, 1);
  }
  removeById(jobsList, jobId);
  return { ok: true };
}

export function updateDemoWorkArea(args: {
  jobId: string;
  workAreaId: string;
  actor: string;
  input: WorkAreaInput;
}): WorkAreaRow | null {
  const area = getDemoWorkArea(args.jobId, args.workAreaId);
  if (!area) return null;
  area.name = args.input.name;
  area.kind = args.input.kind;
  area.notes = args.input.notes;
  area.updatedAt = new Date();
  recordJobEvent({
    jobId: args.jobId,
    actor: args.actor,
    kind: "work_area_updated",
    summary: `work area updated: ${area.name}`,
    payload: { workAreaId: area.id, kind: area.kind },
  });
  return area;
}

export function deleteDemoWorkArea(args: {
  jobId: string;
  workAreaId: string;
  actor: string;
}): WorkAreaRow | null {
  const area = getDemoWorkArea(args.jobId, args.workAreaId);
  if (!area) return null;
  for (const task of jobTasks) {
    if (task.jobId === args.jobId && task.workAreaId === args.workAreaId) {
      task.workAreaId = null;
    }
  }
  for (const document of jobDocuments) {
    if (document.jobId === args.jobId && document.workAreaId === args.workAreaId) {
      document.workAreaId = null;
    }
  }
  for (const note of jobFieldNotes) {
    if (note.jobId === args.jobId && note.workAreaId === args.workAreaId) {
      note.workAreaId = null;
    }
  }
  for (const annotation of jobPlanAnnotations) {
    if (
      annotation.jobId === args.jobId &&
      annotation.workAreaId === args.workAreaId
    ) {
      annotation.workAreaId = null;
    }
  }
  for (const note of jobVoiceNotes) {
    if (note.jobId === args.jobId && note.workAreaId === args.workAreaId) {
      note.workAreaId = null;
    }
  }
  removeById(workAreas, args.workAreaId);
  recordJobEvent({
    jobId: args.jobId,
    actor: args.actor,
    kind: "work_area_deleted",
    summary: `work area deleted: ${area.name}`,
    payload: { workAreaId: area.id },
  });
  return area;
}

export function updateDemoJobTask(args: {
  jobId: string;
  taskId: string;
  actor: string;
  input: JobTaskInput;
}): JobTaskRow | null {
  const task = jobTasks.find(
    (item) => item.id === args.taskId && item.jobId === args.jobId,
  );
  if (!task) return null;
  if (args.input.workAreaId && !getDemoWorkArea(args.jobId, args.input.workAreaId)) {
    return null;
  }
  const assigneeIdentity = args.input.assigneeUserId
    ? getDemoFieldIdentityById(args.input.assigneeUserId)
    : null;
  if (args.input.assigneeUserId && !assigneeIdentity) return null;
  task.title = args.input.title;
  task.assignee = assigneeIdentity?.displayName ?? args.input.assignee;
  task.assigneeUserId = args.input.assigneeUserId;
  task.dueAt = args.input.dueAt;
  task.plannedStartAt = args.input.plannedStartAt;
  task.plannedEndAt = args.input.plannedEndAt;
  task.workAreaId = args.input.workAreaId;
  task.updatedAt = new Date();
  recordJobEvent({
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

export function deleteDemoJobTask(args: {
  jobId: string;
  taskId: string;
  actor: string;
}): JobTaskRow | null {
  const task = jobTasks.find(
    (item) => item.id === args.taskId && item.jobId === args.jobId,
  );
  if (!task) return null;
  for (const note of jobFieldNotes) {
    if (note.jobId === args.jobId && note.taskId === args.taskId) {
      note.taskId = null;
    }
  }
  for (const annotation of jobPlanAnnotations) {
    if (annotation.jobId === args.jobId && annotation.taskId === args.taskId) {
      annotation.taskId = null;
    }
  }
  for (const note of jobVoiceNotes) {
    if (note.jobId === args.jobId && note.taskId === args.taskId) {
      note.taskId = null;
    }
  }
  removeById(jobTasks, args.taskId);
  recordJobEvent({
    jobId: args.jobId,
    actor: args.actor,
    kind: "task_deleted",
    summary: `task deleted: ${task.title}`,
    payload: { taskId: task.id },
  });
  return task;
}

export function updateDemoJobDocument(args: {
  jobId: string;
  documentId: string;
  actor: string;
  input: { kind: JobDocumentKind; workAreaId: string | null };
}): JobDocumentRow | null {
  const document = getDemoJobDocument(args.jobId, args.documentId);
  if (!document) return null;
  if (document.kind === "plan" || args.input.kind === "plan") return null;
  if (args.input.workAreaId && !getDemoWorkArea(args.jobId, args.input.workAreaId)) {
    return null;
  }
  document.kind = args.input.kind;
  document.workAreaId = args.input.workAreaId;
  recordJobEvent({
    jobId: args.jobId,
    actor: args.actor,
    kind: "document_updated",
    summary: `document updated: ${document.filename}`,
    payload: { documentId: document.id, kind: document.kind },
  });
  return document;
}

export function deleteDemoJobDocument(args: {
  jobId: string;
  documentId: string;
  actor: string;
}): JobDocumentRow | null {
  const document = getDemoJobDocument(args.jobId, args.documentId);
  if (!document) return null;
  if (document.kind === "plan") return null;
  const annotationIds = new Set(
    jobPlanAnnotations
      .filter((annotation) => annotation.documentId === args.documentId)
      .map((annotation) => annotation.id),
  );
  for (const note of jobFieldNotes) {
    if (note.annotationId && annotationIds.has(note.annotationId)) {
      note.annotationId = null;
    }
  }
  for (const note of jobVoiceNotes) {
    if (note.documentId === args.documentId) note.documentId = null;
    if (note.annotationId && annotationIds.has(note.annotationId)) {
      note.annotationId = null;
    }
  }
  for (const candidate of jobDocuments) {
    if (candidate.replacesDocumentId === args.documentId) {
      candidate.replacesDocumentId = null;
    }
  }
  for (let i = jobPlanAnnotations.length - 1; i >= 0; i -= 1) {
    if (jobPlanAnnotations[i]?.documentId === args.documentId) {
      jobPlanAnnotations.splice(i, 1);
    }
  }
  clearJobDocumentBytes(document.id);
  removeById(jobDocuments, args.documentId);
  recordJobEvent({
    jobId: args.jobId,
    actor: args.actor,
    kind: "document_deleted",
    summary: `document deleted: ${document.filename}`,
    payload: { documentId: document.id },
  });
  return document;
}

export function updateDemoJobFieldNote(args: {
  jobId: string;
  noteId: string;
  actor: string;
  input: FieldNoteInput;
}): JobFieldNoteRow | null {
  const note = jobFieldNotes.find(
    (item) => item.id === args.noteId && item.jobId === args.jobId,
  );
  if (!note) return null;
  if (args.input.workAreaId && !getDemoWorkArea(args.jobId, args.input.workAreaId)) {
    return null;
  }
  if (
    args.input.taskId &&
    !jobTasks.some((task) => task.id === args.input.taskId && task.jobId === args.jobId)
  ) {
    return null;
  }
  note.kind = args.input.kind;
  note.body = args.input.body;
  note.workAreaId = args.input.workAreaId;
  note.taskId = args.input.taskId;
  note.annotationId = args.input.annotationId ?? note.annotationId;
  note.quantity = args.input.quantity;
  note.unit = args.input.unit;
  recordJobEvent({
    jobId: args.jobId,
    actor: args.actor,
    kind: "field_note_updated",
    summary: `field entry updated: ${note.body.slice(0, 80)}`,
    payload: { noteId: note.id, kind: note.kind as FieldNoteKind },
  });
  return note;
}

export function deleteDemoJobFieldNote(args: {
  jobId: string;
  noteId: string;
  actor: string;
}): JobFieldNoteRow | null {
  const note = jobFieldNotes.find(
    (item) => item.id === args.noteId && item.jobId === args.jobId,
  );
  if (!note) return null;
  removeById(jobFieldNotes, args.noteId);
  recordJobEvent({
    jobId: args.jobId,
    actor: args.actor,
    kind: "field_note_deleted",
    summary: `field entry deleted: ${note.body.slice(0, 80)}`,
    payload: { noteId: note.id, kind: note.kind },
  });
  return note;
}

export function updateDemoEstimateRequestTask(args: {
  leadId: string;
  taskId: string;
  actor: string;
  title: string;
  assignee: string | null;
  dueAt: Date | null;
}): EstimateRequestTask | null {
  const task = tasks.find(
    (item) => item.id === args.taskId && item.leadId === args.leadId,
  );
  if (!task) return null;
  task.title = args.title;
  task.assignee = args.assignee;
  task.dueAt = args.dueAt;
  task.updatedAt = new Date();
  recordEvent({
    leadId: args.leadId,
    actor: args.actor,
    kind: "task_updated",
    summary: `task updated: ${task.title}`,
    payload: { taskId: task.id },
  });
  return task;
}

export function deleteDemoEstimateRequestTask(args: {
  leadId: string;
  taskId: string;
  actor: string;
}): EstimateRequestTask | null {
  const task = tasks.find(
    (item) => item.id === args.taskId && item.leadId === args.leadId,
  );
  if (!task) return null;
  removeById(tasks, args.taskId);
  recordEvent({
    leadId: args.leadId,
    actor: args.actor,
    kind: "task_deleted",
    summary: `task deleted: ${task.title}`,
    payload: { taskId: task.id },
  });
  return task;
}

export function deleteDemoEstimateRequestComment(args: {
  leadId: string;
  commentId: string;
  actor: string;
}): EstimateRequestComment | null {
  const comment = comments.find(
    (item) => item.id === args.commentId && item.leadId === args.leadId,
  );
  if (!comment) return null;
  removeById(comments, args.commentId);
  recordEvent({
    leadId: args.leadId,
    actor: args.actor,
    kind: "comment_deleted",
    summary: "internal comment deleted",
    payload: { commentId: comment.id },
  });
  return comment;
}

export function listDemoJobPlanAnnotations(
  jobId: string,
  documentId?: string,
): JobPlanAnnotationRow[] {
  return jobPlanAnnotations
    .filter((annotation) => {
      if (annotation.jobId !== jobId || annotation.voidedAt) return false;
      if (documentId && annotation.documentId !== documentId) return false;
      return true;
    })
    .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
}

export function getDemoJobPlanAnnotation(
  jobId: string,
  annotationId: string,
): JobPlanAnnotationRow | null {
  return (
    jobPlanAnnotations.find(
      (annotation) =>
        annotation.id === annotationId && annotation.jobId === jobId,
    ) ?? null
  );
}

export function addDemoJobPlanAnnotation(args: {
  jobId: string;
  actor: string;
  input: PlanAnnotationInput;
}): JobPlanAnnotationRow | null {
  const document = getDemoJobDocument(args.jobId, args.input.documentId);
  if (!document || !isCurrentPlanDocument(document)) return null;
  if (args.input.workAreaId && !getDemoWorkArea(args.jobId, args.input.workAreaId)) {
    return null;
  }
  if (
    args.input.taskId &&
    !jobTasks.some(
      (task) => task.id === args.input.taskId && task.jobId === args.jobId,
    )
  ) {
    return null;
  }
  const now = new Date();
  const annotation: JobPlanAnnotationRow = {
    id: crypto.randomUUID(),
    createdAt: now,
    updatedAt: now,
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
    voidedAt: null,
    voidedBy: null,
  };
  jobPlanAnnotations.push(annotation);
  recordJobEvent({
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
}

export function setDemoJobPlanAnnotationStatus(args: {
  jobId: string;
  annotationId: string;
  actor: string;
  status: PlanAnnotationStatus;
  body?: string | null;
}): JobPlanAnnotationRow | null {
  const annotation = getDemoJobPlanAnnotation(args.jobId, args.annotationId);
  if (!annotation || annotation.voidedAt) return null;
  const document = getDemoJobDocument(args.jobId, annotation.documentId);
  if (!document || !isCurrentPlanDocument(document)) return null;
  const now = new Date();
  annotation.status = args.status;
  annotation.updatedAt = now;
  if (args.body !== undefined) annotation.body = args.body;
  if (args.status === "completed") {
    annotation.completedAt = now;
    annotation.completedBy = args.actor;
  } else {
    annotation.completedAt = null;
    annotation.completedBy = null;
  }
  recordJobEvent({
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

export function voidDemoJobPlanAnnotation(args: {
  jobId: string;
  annotationId: string;
  actor: string;
}): JobPlanAnnotationRow | null {
  const annotation = getDemoJobPlanAnnotation(args.jobId, args.annotationId);
  if (!annotation || annotation.voidedAt) return null;
  const document = getDemoJobDocument(args.jobId, annotation.documentId);
  if (!document || !isCurrentPlanDocument(document)) return null;
  const now = new Date();
  annotation.voidedAt = now;
  annotation.voidedBy = args.actor;
  annotation.updatedAt = now;
  recordJobEvent({
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

export function listDemoJobVoiceNotes(jobId: string): JobVoiceNoteRow[] {
  for (const note of jobVoiceNotes) {
    if (note.jobId === jobId && note.status === "queued") {
      processDemoVoiceTranscription(note.id);
    }
  }
  return jobVoiceNotes
    .filter((note) => note.jobId === jobId)
    .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
}

export function getDemoJobVoiceNote(
  jobId: string,
  voiceNoteId: string,
): JobVoiceNoteRow | null {
  return (
    jobVoiceNotes.find(
      (note) => note.id === voiceNoteId && note.jobId === jobId,
    ) ?? null
  );
}

export function addDemoJobVoiceNote(args: {
  jobId: string;
  actor: string;
  input: VoiceNoteInput;
  bytes: Uint8Array;
}): JobVoiceNoteRow | null {
  if (!getDemoJob(args.jobId)) return null;
  if (args.input.workAreaId && !getDemoWorkArea(args.jobId, args.input.workAreaId)) {
    return null;
  }
  if (
    args.input.taskId &&
    !jobTasks.some((task) => task.id === args.input.taskId && task.jobId === args.jobId)
  ) {
    return null;
  }
  if (
    args.input.annotationId &&
    !jobPlanAnnotations.some(
      (annotation) =>
        annotation.id === args.input.annotationId && annotation.jobId === args.jobId,
    )
  ) {
    return null;
  }
  if (
    args.input.documentId &&
    !jobDocuments.some(
      (document) => document.id === args.input.documentId && document.jobId === args.jobId,
    )
  ) {
    return null;
  }
  const now = new Date();
  const id = crypto.randomUUID();
  const note: JobVoiceNoteRow = {
    id,
    createdAt: now,
    updatedAt: now,
    jobId: args.jobId,
    workAreaId: args.input.workAreaId,
    taskId: args.input.taskId,
    annotationId: args.input.annotationId,
    documentId: args.input.documentId,
    source: args.input.source,
    filename: args.input.filename,
    contentType: args.input.contentType,
    sizeBytes: args.input.sizeBytes,
    pathname: `jobs/${args.jobId}/voice/${id}/${args.input.filename}`,
    storage: "memory",
    durationSeconds: args.input.durationSeconds,
    language: args.input.language,
    provider: null,
    model: null,
    status: "queued",
    machineTranscript: null,
    transcript: null,
    confidence: null,
    queuedAt: now,
    processingStartedAt: null,
    completedAt: null,
    failedAt: null,
    error: null,
    consentAt: args.input.consentAt,
    createdBy: args.actor,
  };
  jobVoiceNotes.unshift(note);
  setVoiceNoteBytes(id, args.bytes);
  recordJobEvent({
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
  return note;
}

export function processDemoVoiceTranscription(
  voiceNoteId: string,
): JobVoiceNoteRow | null {
  const note = jobVoiceNotes.find((item) => item.id === voiceNoteId);
  if (!note || (note.status !== "queued" && note.status !== "processing")) {
    return note ?? null;
  }
  const job = getDemoJob(note.jobId);
  const task = note.taskId
    ? jobTasks.find((item) => item.id === note.taskId)
    : null;
  const annotation = note.annotationId
    ? jobPlanAnnotations.find((item) => item.id === note.annotationId)
    : null;
  const document = note.documentId
    ? jobDocuments.find((item) => item.id === note.documentId)
    : null;
  const result = demoVoiceTranscript({
    jobName: job?.name ?? "this job",
    source: note.source as VoiceNoteInput["source"],
    taskTitle: task?.title,
    annotationTitle: annotation?.title,
    documentName: document?.filename,
  });
  const now = new Date();
  note.status = "completed";
  note.processingStartedAt = note.processingStartedAt ?? now;
  note.completedAt = now;
  note.updatedAt = now;
  note.provider = result.provider;
  note.model = result.model;
  note.confidence = result.confidence;
  note.machineTranscript = result.transcript;
  note.transcript = note.transcript || result.transcript;
  note.error = null;
  recordJobEvent({
    jobId: note.jobId,
    actor: "system",
    kind: "voice_note_transcribed",
    summary: `voice note transcribed: ${note.filename}`,
    payload: { voiceNoteId: note.id, status: note.status },
  });
  return note;
}

export function updateDemoVoiceTranscript(args: {
  jobId: string;
  voiceNoteId: string;
  actor: string;
  transcript: string;
}): JobVoiceNoteRow | null {
  const note = getDemoJobVoiceNote(args.jobId, args.voiceNoteId);
  if (!note || note.status !== "completed") return null;
  note.transcript = args.transcript;
  note.updatedAt = new Date();
  recordJobEvent({
    jobId: args.jobId,
    actor: args.actor,
    kind: "voice_note_updated",
    summary: `voice transcript edited: ${note.filename}`,
    payload: { voiceNoteId: note.id },
  });
  return note;
}

export function extractDemoVoiceNote(args: {
  jobId: string;
  voiceNoteId: string;
  actor: string;
  kind: VoiceExtractKind;
  selectedText: string;
}): { ok: true; created: "task" | "field_note" } | { ok: false; error: string } {
  const note = getDemoJobVoiceNote(args.jobId, args.voiceNoteId);
  if (!note) return { ok: false, error: "That voice note could not be found." };
  if (args.kind === "task") {
    const task = addDemoJobTask({
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
    recordJobEvent({
      jobId: args.jobId,
      actor: args.actor,
      kind: "voice_note_extracted",
      summary: `voice note extracted: ${note.filename}`,
      payload: { voiceNoteId: note.id },
    });
    return { ok: true, created: "task" };
  }
  const fieldNote = addDemoJobFieldNote({
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
  recordJobEvent({
    jobId: args.jobId,
    actor: args.actor,
    kind: "voice_note_extracted",
    summary: `voice note extracted: ${note.filename}`,
    payload: { voiceNoteId: note.id },
  });
  return { ok: true, created: "field_note" };
}

export function deleteDemoJobVoiceNote(args: {
  jobId: string;
  voiceNoteId: string;
  actor: string;
}): JobVoiceNoteRow | null {
  const note = getDemoJobVoiceNote(args.jobId, args.voiceNoteId);
  if (!note) return null;
  clearVoiceNoteBytes(note.id);
  const index = jobVoiceNotes.findIndex((item) => item.id === note.id);
  if (index >= 0) jobVoiceNotes.splice(index, 1);
  recordJobEvent({
    jobId: args.jobId,
    actor: args.actor,
    kind: "voice_note_deleted",
    summary: `voice note deleted: ${note.filename}`,
    payload: { voiceNoteId: note.id },
  });
  return note;
}

export function getDemoJobVoiceNoteDownload(
  jobId: string,
  voiceNoteId: string,
): { note: JobVoiceNoteRow; bytes: Uint8Array } | null {
  const note = getDemoJobVoiceNote(jobId, voiceNoteId);
  if (!note) return null;
  const bytes = getStoredVoiceNoteBytes(note.id);
  if (!bytes) return null;
  return { note, bytes };
}

export type { VoiceTranscriptStatus };
