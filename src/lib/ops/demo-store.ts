import {
  demoCompanies,
  demoContacts,
  demoEstimateComments,
  demoEstimateEvents,
  demoEstimateRequests,
  demoEstimateTasks,
  demoJobDocuments,
  demoJobEvents,
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
  type JobRow,
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
  type JobStatus,
} from "@/lib/ops/jobs";
import {
  setJobDocumentBytes,
  getStoredJobDocumentBytes,
} from "@/lib/ops/job-document-bytes";
import type {
  JobDocumentInput,
  JobTaskInput,
  WorkAreaInput,
} from "@/lib/ops/job-workspace";
import type {
  EstimateRequestFilters,
  EstimateRequestUpdate,
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
  jobDocuments: JobDocumentRow[];
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
      jobDocuments: demoJobDocuments(),
    };
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
  jobDocuments,
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

export function listDemoCompanies(): CompanyRow[] {
  return [...companies].sort((a, b) => a.name.localeCompare(b.name));
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

export function listDemoOpportunities(): OpportunityRow[] {
  return [...opportunities].sort(
    (a, b) => b.createdAt.getTime() - a.createdAt.getTime(),
  );
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

export function listDemoProjects(companyId?: string): ProjectRow[] {
  return projects
    .filter((project) => !companyId || project.companyId === companyId)
    .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
}

export function getDemoProject(id: string): ProjectRow | null {
  return projects.find((project) => project.id === id) ?? null;
}

export function listDemoJobs(filters: {
  projectId?: string;
  companyId?: string;
  status?: string;
} = {}): JobRow[] {
  return jobsList
    .filter((job) => {
      if (filters.projectId && job.projectId !== filters.projectId) return false;
      if (filters.companyId && job.companyId !== filters.companyId) return false;
      if (filters.status && job.status !== filters.status) return false;
      return true;
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

export function listDemoJobTasks(jobId: string): JobTaskRow[] {
  return jobTasks
    .filter((task) => task.jobId === jobId)
    .sort((a, b) => {
      if (a.status !== b.status) return a.status === "open" ? -1 : 1;
      return b.createdAt.getTime() - a.createdAt.getTime();
    });
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
    status: "open",
    createdBy: args.actor,
  };
  jobTasks.unshift(task);
  recordJobEvent({
    jobId: args.jobId,
    actor: args.actor,
    kind: "task_created",
    summary: `task created: ${task.title}`,
    payload: { taskId: task.id, workAreaId: task.workAreaId },
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
  task.updatedAt = new Date();
  recordJobEvent({
    jobId: args.jobId,
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

export function listDemoJobDocuments(jobId: string): JobDocumentRow[] {
  return jobDocuments
    .filter((document) => document.jobId === jobId)
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
