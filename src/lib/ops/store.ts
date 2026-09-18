import { and, desc, eq, ilike, or, sql } from "drizzle-orm";
import { getDb } from "@/db";
import {
  companies,
  contacts,
  estimateRequestComments,
  estimateRequestEvents,
  estimateRequestTasks,
  leads,
  opportunities,
  sites,
} from "@/db/schema";
import { signLeadId } from "@/lib/leads/hmac";
import type { CrmConversionInput } from "@/lib/ops/crm";
import {
  addDemoEstimateRequestComment,
  addDemoEstimateRequestTask,
  convertDemoRequestToCrm,
  getDemoCompany,
  getDemoContact,
  getDemoEstimateRequest,
  getDemoOpportunity,
  getDemoSite,
  listDemoCompanies,
  listDemoContacts,
  listDemoEstimateRequestComments,
  listDemoEstimateRequestEvents,
  listDemoEstimateRequestTasks,
  listDemoEstimateRequests,
  listDemoOpportunities,
  listDemoSites,
  setDemoEstimateRequestTaskStatus,
  updateDemoEstimateRequest,
  useDemoOpsStore,
} from "@/lib/ops/demo-store";
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
export type ContactRow = typeof contacts.$inferSelect;
export type SiteRow = typeof sites.$inferSelect;
export type OpportunityRow = typeof opportunities.$inferSelect;

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

export type EstimateRequestFilters = {
  q?: string;
  workflowStatus?: string;
  qualification?: string;
};

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
}): { ok: true; value: EstimateRequestUpdate } | { ok: false; error: string } {
  const workflowStatus = input.workflowStatus ?? "";
  if (!isWorkflowStatus(workflowStatus)) {
    return { ok: false, error: "Choose a valid workflow status." };
  }

  const lostReason = input.lostReason?.trim() || null;
  const lostReasonError = requireLostReason(workflowStatus, lostReason);
  if (lostReasonError) return { ok: false, error: lostReasonError };

  const nextActionDueAt = input.nextActionDueAt
    ? new Date(input.nextActionDueAt)
    : null;
  if (nextActionDueAt && Number.isNaN(nextActionDueAt.getTime())) {
    return { ok: false, error: "Next-action due date is invalid." };
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

export async function listEstimateRequests(
  filters: EstimateRequestFilters = {},
): Promise<EstimateRequestRow[]> {
  if (useDemoOpsStore()) return listDemoEstimateRequests(filters);
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

  return db
    .select()
    .from(leads)
    .where(conditions.length ? and(...conditions) : undefined)
    .orderBy(desc(leads.createdAt));
}

export async function getEstimateRequest(
  id: string,
): Promise<EstimateRequestRow | null> {
  if (useDemoOpsStore()) return getDemoEstimateRequest(id);
  const db = getDb();
  const rows = await db.select().from(leads).where(eq(leads.id, id)).limit(1);
  return rows[0] ?? null;
}

export async function listEstimateRequestEvents(
  leadId: string,
): Promise<EstimateRequestEvent[]> {
  if (useDemoOpsStore()) return listDemoEstimateRequestEvents(leadId);
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
  if (useDemoOpsStore()) {
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
  if (useDemoOpsStore()) return listDemoEstimateRequestTasks(leadId);
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
  if (useDemoOpsStore()) return listDemoEstimateRequestComments(leadId);
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
  if (useDemoOpsStore()) return addDemoEstimateRequestTask(args);
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
  if (useDemoOpsStore()) return setDemoEstimateRequestTaskStatus(args);
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
  if (useDemoOpsStore()) return addDemoEstimateRequestComment(args);
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

export async function listCompanies(): Promise<CompanyRow[]> {
  if (useDemoOpsStore()) return listDemoCompanies();
  const db = getDb();
  return db.select().from(companies).orderBy(companies.name);
}

export async function getCompany(id: string): Promise<CompanyRow | null> {
  if (useDemoOpsStore()) return getDemoCompany(id);
  const db = getDb();
  const rows = await db.select().from(companies).where(eq(companies.id, id)).limit(1);
  return rows[0] ?? null;
}

export async function listContacts(companyId?: string): Promise<ContactRow[]> {
  if (useDemoOpsStore()) return listDemoContacts(companyId);
  const db = getDb();
  return db
    .select()
    .from(contacts)
    .where(companyId ? eq(contacts.companyId, companyId) : undefined)
    .orderBy(contacts.lastName);
}

export async function getContact(id: string): Promise<ContactRow | null> {
  if (useDemoOpsStore()) return getDemoContact(id);
  const db = getDb();
  const rows = await db.select().from(contacts).where(eq(contacts.id, id)).limit(1);
  return rows[0] ?? null;
}

export async function listSites(companyId?: string): Promise<SiteRow[]> {
  if (useDemoOpsStore()) return listDemoSites(companyId);
  const db = getDb();
  return db
    .select()
    .from(sites)
    .where(companyId ? eq(sites.companyId, companyId) : undefined)
    .orderBy(sites.name);
}

export async function getSite(id: string): Promise<SiteRow | null> {
  if (useDemoOpsStore()) return getDemoSite(id);
  const db = getDb();
  const rows = await db.select().from(sites).where(eq(sites.id, id)).limit(1);
  return rows[0] ?? null;
}

export async function listOpportunities(): Promise<OpportunityRow[]> {
  if (useDemoOpsStore()) return listDemoOpportunities();
  const db = getDb();
  return db.select().from(opportunities).orderBy(desc(opportunities.createdAt));
}

export async function getOpportunity(id: string): Promise<OpportunityRow | null> {
  if (useDemoOpsStore()) return getDemoOpportunity(id);
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
  if (useDemoOpsStore()) return convertDemoRequestToCrm(args);

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
