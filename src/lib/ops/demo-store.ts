import {
  demoCompanies,
  demoContacts,
  demoEstimateComments,
  demoEstimateEvents,
  demoEstimateRequests,
  demoEstimateTasks,
  demoJobDocuments,
  demoJobEvents,
  demoJobFieldNotes,
  demoJobTasks,
  demoJobs,
  demoOpportunities,
  demoProjects,
  demoSites,
  demoWorkAreas,
  type CompanyRow,
  type ContactRow,
  type EstimateRequestComment,
  type EstimateRequestEvent,
  type EstimateRequestRow,
  type EstimateRequestTask,
  type JobDocumentRow,
  type JobEventRow,
  type JobFieldNoteRow,
  type JobRow,
  type JobTaskDependencyRow,
  type JobTaskRow,
  type OpportunityRow,
  type ProjectRow,
  type SiteRow,
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
import { isInDateRange, matchesQuery } from "@/lib/ops/filters";
import {
  sortJobTaskRows,
  type JobDocumentInput,
  type JobDocumentKind,
  type JobTaskInput,
  type WorkAreaInput,
} from "@/lib/ops/job-workspace";
import type { FieldNoteInput, FieldNoteKind } from "@/lib/ops/field-workspace";
import { validateDependencyAddition } from "@/lib/ops/project-schedule-graph";
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
  ProjectListFilters,
} from "@/lib/ops/store";
import { isWorkflowStatus } from "@/lib/ops/workflow";

type DemoOpsState = {
  requests: EstimateRequestRow[];
  events: EstimateRequestEvent[];
  tasks: EstimateRequestTask[];
  comments: EstimateRequestComment[];
  companies: CompanyRow[];
  contacts: ContactRow[];
  sites: SiteRow[];
  opportunities: OpportunityRow[];
  projects: ProjectRow[];
  jobsList: JobRow[];
  jobEvents: JobEventRow[];
  workAreas: WorkAreaRow[];
  jobTasks: JobTaskRow[];
  jobTaskDependencies: JobTaskDependencyRow[];
  jobDocuments: JobDocumentRow[];
  jobFieldNotes: JobFieldNoteRow[];
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
      companies: demoCompanies(),
      contacts: demoContacts(),
      sites: demoSites(),
      opportunities: demoOpportunities(),
      projects: demoProjects(),
      jobsList: demoJobs(),
      jobEvents: demoJobEvents(),
      workAreas: demoWorkAreas(),
      jobTasks: demoJobTasks(),
      jobTaskDependencies: [],
      jobDocuments: demoJobDocuments(),
      jobFieldNotes: demoJobFieldNotes(),
    };
  } else if (!globalForDemo.__strongfoamDemoOps.jobFieldNotes) {
    globalForDemo.__strongfoamDemoOps.jobFieldNotes = demoJobFieldNotes();
  }
  if (!globalForDemo.__strongfoamDemoOps.jobTaskDependencies) {
    globalForDemo.__strongfoamDemoOps.jobTaskDependencies = [];
  }
  return globalForDemo.__strongfoamDemoOps;
}

const {
  requests,
  events,
  tasks,
  comments,
  companies,
  contacts,
  sites,
  opportunities,
  projects,
  jobsList,
  jobEvents,
  workAreas,
  jobTasks,
  jobTaskDependencies,
  jobDocuments,
  jobFieldNotes,
} = getDemoState();

export function isDemoOpsStore(
  env: Record<string, string | undefined> = process.env,
): boolean {
  return env.OPS_DEMO === "1" || !env.DATABASE_URL;
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

export function getDemoProject(id: string): ProjectRow | null {
  return projects.find((project) => project.id === id) ?? null;
}

export function listDemoJobs(filters: JobListFilters = {}): JobRow[] {
  return jobsList
    .filter((job) => {
      if (filters.projectId && job.projectId !== filters.projectId) return false;
      if (filters.companyId && job.companyId !== filters.companyId) return false;
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

export function addDemoJobTask(args: {
  jobId: string;
  actor: string;
  input: JobTaskInput;
}): JobTaskRow | null {
  if (!getDemoJob(args.jobId)) return null;
  if (args.input.workAreaId && !getDemoWorkArea(args.jobId, args.input.workAreaId)) {
    return null;
  }
  const now = new Date();
  const task: JobTaskRow = {
    id: crypto.randomUUID(),
    createdAt: now,
    updatedAt: now,
    jobId: args.jobId,
    workAreaId: args.input.workAreaId,
    title: args.input.title,
    assignee: args.input.assignee,
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
    createdAt: new Date(),
    jobId: args.jobId,
    workAreaId: args.input.workAreaId,
    taskId: args.input.taskId,
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
  for (let i = jobFieldNotes.length - 1; i >= 0; i -= 1) {
    if (jobFieldNotes[i]?.jobId === jobId) jobFieldNotes.splice(i, 1);
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
  task.title = args.input.title;
  task.assignee = args.input.assignee;
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
