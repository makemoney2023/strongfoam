import {
  demoCompanies,
  demoContacts,
  demoEstimateComments,
  demoEstimateEvents,
  demoEstimateRequests,
  demoEstimateTasks,
  demoOpportunities,
  demoSites,
  type CompanyRow,
  type ContactRow,
  type EstimateRequestComment,
  type EstimateRequestEvent,
  type EstimateRequestRow,
  type EstimateRequestTask,
  type OpportunityRow,
  type SiteRow,
} from "@/lib/ops/demo-data";
import type { CrmConversionInput } from "@/lib/ops/crm";
import type {
  EstimateRequestFilters,
  EstimateRequestUpdate,
} from "@/lib/ops/store";
import { isWorkflowStatus } from "@/lib/ops/workflow";

const requests = demoEstimateRequests();
const events = demoEstimateEvents();
const tasks = demoEstimateTasks();
const comments = demoEstimateComments();
const companies = demoCompanies();
const contacts = demoContacts();
const sites = demoSites();
const opportunities = demoOpportunities();

export function useDemoOpsStore(
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
