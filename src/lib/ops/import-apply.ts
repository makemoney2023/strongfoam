import { priceRevisionContentHash } from "@/lib/ops/price-book";
import type { ImportEntityType, ImportOperation } from "@/lib/ops/import-contract";
import { orderedImportRows, type StagedImportRow } from "@/lib/ops/import-validation";

export type ImportCompany = {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  city: string | null;
  province: string | null;
};

export type ImportContact = {
  id: string;
  companyId: string | null;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  role: string | null;
};

export type ImportSite = {
  id: string;
  companyId: string | null;
  name: string;
  city: string;
  province: string;
  addressLine: string | null;
  postalCode: string | null;
};

export type ImportUser = {
  id: string;
  email: string;
  displayName: string;
  active: boolean;
  passwordHash: string;
};

export type ImportMembership = {
  id: string;
  userId: string;
  role: string;
  active: boolean;
};

export type ImportPriceItem = {
  id: string;
  name: string;
  trade: string;
  unit: string;
  unitPriceCents: number;
  itemCode: string | null;
  itemKind: string | null;
  supplier: string | null;
  unitCostCents: number | null;
  active: boolean;
};

export type ImportPriceVersion = {
  id: string;
  itemId: string;
  versionNumber: number;
  status: "draft" | "approved";
  trade: string;
  description: string;
  unit: string;
  unitPriceCents: number;
  unitCostCents: number | null;
  contentHash: string;
  createdBy: string;
};

export type ImportOpportunity = {
  id: string;
  name: string;
  companyId: string | null;
  contactId: string | null;
  siteId: string | null;
  stage: string;
  services: string[];
};

export type ImportProject = {
  id: string;
  name: string;
  companyId: string | null;
  siteId: string | null;
  opportunityId: string | null;
  status: string;
};

export type ImportJob = {
  id: string;
  name: string;
  projectId: string | null;
  companyId: string | null;
  siteId: string | null;
  opportunityId: string | null;
  status: string;
  services: string[];
};

export type ImportAssignment = {
  id: string;
  jobId: string;
  userId: string;
  role: string;
};

export type ImportWorkArea = {
  id: string;
  jobId: string;
  name: string;
};

export type ImportTask = {
  id: string;
  jobId: string;
  workAreaId: string | null;
  title: string;
};

export type ImportCrosswalk = {
  entityType: ImportEntityType;
  sourceKey: string;
  targetId: string;
};

export type ImportDomain = {
  companies: ImportCompany[];
  contacts: ImportContact[];
  sites: ImportSite[];
  users: ImportUser[];
  memberships: ImportMembership[];
  priceItems: ImportPriceItem[];
  priceVersions: ImportPriceVersion[];
  opportunities: ImportOpportunity[];
  projects: ImportProject[];
  jobs: ImportJob[];
  assignments: ImportAssignment[];
  workAreas: ImportWorkArea[];
  tasks: ImportTask[];
  crosswalk: ImportCrosswalk[];
};

export type ImportWrite = {
  companies: ImportCompany[];
  contacts: ImportContact[];
  sites: ImportSite[];
  users: ImportUser[];
  memberships: ImportMembership[];
  priceItems: ImportPriceItem[];
  priceVersions: ImportPriceVersion[];
  opportunities: ImportOpportunity[];
  projects: ImportProject[];
  jobs: ImportJob[];
  assignments: ImportAssignment[];
  workAreas: ImportWorkArea[];
  tasks: ImportTask[];
  crosswalk: ImportCrosswalk[];
  companyUpdates: ImportCompany[];
  priceItemUpdates: ImportPriceItem[];
};

export type ImportApplySuccess = {
  ok: true;
  domain: ImportDomain;
  writes: ImportWrite;
  rowResults: Array<{
    sheetName: string;
    rowNumber: number;
    operation: ImportOperation;
    targetId: string;
  }>;
};

export function emptyImportDomain(): ImportDomain {
  return {
    companies: [],
    contacts: [],
    sites: [],
    users: [],
    memberships: [],
    priceItems: [],
    priceVersions: [],
    opportunities: [],
    projects: [],
    jobs: [],
    assignments: [],
    workAreas: [],
    tasks: [],
    crosswalk: [],
  };
}

export function emptyImportWrites(): ImportWrite {
  return {
    companies: [],
    contacts: [],
    sites: [],
    users: [],
    memberships: [],
    priceItems: [],
    priceVersions: [],
    opportunities: [],
    projects: [],
    jobs: [],
    assignments: [],
    workAreas: [],
    tasks: [],
    crosswalk: [],
    companyUpdates: [],
    priceItemUpdates: [],
  };
}

export function applyImportRows(input: {
  domain: ImportDomain;
  rows: StagedImportRow[];
  createId: () => string;
  actor: string;
  passwordHash: string;
}): ImportApplySuccess | { ok: false; error: string } {
  const blocking = input.rows.find((row) => row.status === "error" || row.status === "conflict");
  if (blocking) {
    return {
      ok: false,
      error: `Row ${blocking.rowNumber} on ${blocking.sheetName} must be fixed before commit.`,
    };
  }
  const domain = structuredClone(input.domain);
  const writes = emptyImportWrites();
  const rowResults: ImportApplySuccess["rowResults"] = [];
  const touchedCompanies = new Set<string>();

  const link = (entityType: ImportEntityType, sourceKey: string, targetId: string) => {
    const existing = domain.crosswalk.find(
      (item) => item.entityType === entityType && item.sourceKey === sourceKey,
    );
    if (existing) {
      existing.targetId = targetId;
      return;
    }
    const entry = { entityType, sourceKey, targetId };
    domain.crosswalk.push(entry);
    writes.crosswalk.push(entry);
  };

  const lookup = (entityType: ImportEntityType, sourceKey: string | undefined) => {
    if (!sourceKey) return null;
    return domain.crosswalk.find(
      (item) => item.entityType === entityType && item.sourceKey === sourceKey,
    )?.targetId ?? null;
  };

  for (const row of orderedImportRows(input.rows)) {
    const values = row.values;
    if (row.entityType === "company") {
      const linked = lookup("company", row.sourceKey);
      const named = domain.companies.filter((company) => sameText(company.name, values.name ?? ""));
      const targetId = linked ?? (named.length === 1 ? named[0]?.id : null);
      if (!linked && named.length > 1) {
        return { ok: false, error: `More than one company is named ${values.name}. Add a source key and resolve the match.` };
      }
      if (targetId) {
        const company = domain.companies.find((item) => item.id === targetId);
        if (!company) return { ok: false, error: "A matched company could not be found." };
        company.email = incoming(values.email, company.email);
        company.phone = incoming(values.phone, company.phone);
        company.city = incoming(values.city, company.city);
        company.province = incoming(values.province, company.province);
        if (!touchedCompanies.has(company.id)) writes.companyUpdates.push(company);
        touchedCompanies.add(company.id);
        link("company", row.sourceKey, company.id);
        rowResults.push({ sheetName: row.sheetName, rowNumber: row.rowNumber, operation: "update", targetId: company.id });
      } else {
        const company: ImportCompany = {
          id: input.createId(),
          name: values.name ?? "",
          email: values.email || null,
          phone: values.phone || null,
          city: values.city || null,
          province: values.province || null,
        };
        domain.companies.push(company);
        writes.companies.push(company);
        link("company", row.sourceKey, company.id);
        rowResults.push({ sheetName: row.sheetName, rowNumber: row.rowNumber, operation: "create", targetId: company.id });
      }
    } else if (row.entityType === "contact") {
      const companyId = resolveCompany(domain, values);
      if (!companyId) return { ok: false, error: `Contact row ${row.rowNumber} does not match one company.` };
      const email = values.email ?? "";
      const existing = domain.contacts.filter((contact) => contact.email.toLowerCase() === email);
      if (existing.length > 1) {
        return { ok: false, error: `More than one contact uses ${email}.` };
      }
      const contact = existing[0];
      if (contact) {
        link("contact", row.sourceKey, contact.id);
        rowResults.push({ sheetName: row.sheetName, rowNumber: row.rowNumber, operation: "skip", targetId: contact.id });
      } else {
        const created: ImportContact = {
          id: input.createId(),
          companyId,
          firstName: values.first_name ?? "",
          lastName: values.last_name ?? "",
          email,
          phone: values.phone ?? "",
          role: values.role || null,
        };
        domain.contacts.push(created);
        writes.contacts.push(created);
        link("contact", row.sourceKey, created.id);
        rowResults.push({ sheetName: row.sheetName, rowNumber: row.rowNumber, operation: "create", targetId: created.id });
      }
    } else if (row.entityType === "site") {
      const companyId = resolveCompany(domain, values);
      if (!companyId) return { ok: false, error: `Site row ${row.rowNumber} does not match one company.` };
      const existing = domain.sites.filter(
        (site) => site.companyId === companyId && sameText(site.name, values.name ?? ""),
      );
      if (existing.length > 1) return { ok: false, error: `More than one site is named ${values.name}.` };
      const site = existing[0];
      if (site) {
        link("site", row.sourceKey, site.id);
        rowResults.push({ sheetName: row.sheetName, rowNumber: row.rowNumber, operation: "skip", targetId: site.id });
      } else {
        const created: ImportSite = {
          id: input.createId(),
          companyId,
          name: values.name ?? "",
          city: values.city ?? "",
          province: values.province ?? "",
          addressLine: values.address_line || null,
          postalCode: values.postal_code || null,
        };
        domain.sites.push(created);
        writes.sites.push(created);
        link("site", row.sourceKey, created.id);
        rowResults.push({ sheetName: row.sheetName, rowNumber: row.rowNumber, operation: "create", targetId: created.id });
      }
    } else if (row.entityType === "workforce_user") {
      const email = values.email ?? "";
      let user = domain.users.find((item) => item.email.toLowerCase() === email);
      if (!user) {
        user = {
          id: input.createId(),
          email,
          displayName: values.display_name ?? email,
          active: false,
          passwordHash: input.passwordHash,
        };
        domain.users.push(user);
        writes.users.push(user);
      }
      const membership = domain.memberships.find((item) => item.userId === user.id);
      if (!membership) {
        const created: ImportMembership = {
          id: input.createId(),
          userId: user.id,
          role: values.role || "field_worker",
          active: false,
        };
        domain.memberships.push(created);
        writes.memberships.push(created);
      }
      link("workforce_user", row.sourceKey, user.id);
      rowResults.push({
        sheetName: row.sheetName,
        rowNumber: row.rowNumber,
        operation: writes.users.some((item) => item.id === user.id) ? "create" : "skip",
        targetId: user.id,
      });
    } else if (row.entityType === "price_book_item") {
      const linked = lookup("price_book_item", row.sourceKey);
      const named = domain.priceItems.filter(
        (item) => sameText(item.name, values.name ?? "") && item.trade === values.trade,
      );
      if (!linked && named.length > 1) {
        return { ok: false, error: `More than one price-book item is named ${values.name}.` };
      }
      const existing = domain.priceItems.find((item) => item.id === linked) ?? named[0];
      const cents = Number(values.unit_price_cents);
      const cost = values.unit_cost_cents ? Number(values.unit_cost_cents) : null;
      if (existing) {
        const versionNumber = nextVersion(domain, existing.id);
        const version = draftVersion({
          id: input.createId(),
          itemId: existing.id,
          versionNumber,
          trade: values.trade ?? existing.trade,
          description: values.name ?? existing.name,
          unit: values.unit ?? existing.unit,
          unitPriceCents: cents,
          unitCostCents: cost,
          createdBy: input.actor,
        });
        domain.priceVersions.push(version);
        writes.priceVersions.push(version);
        link("price_book_item", row.sourceKey, existing.id);
        rowResults.push({ sheetName: row.sheetName, rowNumber: row.rowNumber, operation: "update", targetId: existing.id });
      } else {
        const item: ImportPriceItem = {
          id: input.createId(),
          name: values.name ?? "",
          trade: values.trade ?? "",
          unit: values.unit ?? "",
          unitPriceCents: cents,
          itemCode: values.item_code || values.source_key || null,
          itemKind: values.item_kind || null,
          supplier: values.supplier || null,
          unitCostCents: cost,
          active: true,
        };
        const version = draftVersion({
          id: input.createId(),
          itemId: item.id,
          versionNumber: 1,
          trade: item.trade,
          description: item.name,
          unit: item.unit,
          unitPriceCents: cents,
          unitCostCents: cost,
          createdBy: input.actor,
        });
        domain.priceItems.push(item);
        domain.priceVersions.push(version);
        writes.priceItems.push(item);
        writes.priceVersions.push(version);
        link("price_book_item", row.sourceKey, item.id);
        rowResults.push({ sheetName: row.sheetName, rowNumber: row.rowNumber, operation: "create", targetId: item.id });
      }
    } else if (row.entityType === "opportunity") {
      const created: ImportOpportunity = {
        id: lookup("opportunity", row.sourceKey) ?? input.createId(),
        name: values.name ?? "",
        companyId: resolveCompany(domain, values),
        contactId: lookup("contact", values.contact_source_key),
        siteId: lookup("site", values.site_source_key),
        stage: values.stage || "qualification",
        services: splitList(values.services),
      };
      if (lookup("opportunity", row.sourceKey)) {
        rowResults.push({ sheetName: row.sheetName, rowNumber: row.rowNumber, operation: "skip", targetId: created.id });
      } else {
        domain.opportunities.push(created);
        writes.opportunities.push(created);
        link("opportunity", row.sourceKey, created.id);
        rowResults.push({ sheetName: row.sheetName, rowNumber: row.rowNumber, operation: "create", targetId: created.id });
      }
    } else if (row.entityType === "project") {
      const existingId = lookup("project", row.sourceKey);
      if (existingId) {
        rowResults.push({ sheetName: row.sheetName, rowNumber: row.rowNumber, operation: "skip", targetId: existingId });
      } else {
        const created: ImportProject = {
          id: input.createId(),
          name: values.name ?? "",
          companyId: resolveCompany(domain, values),
          siteId: lookup("site", values.site_source_key),
          opportunityId: lookup("opportunity", values.opportunity_source_key),
          status: values.status || "active",
        };
        domain.projects.push(created);
        writes.projects.push(created);
        link("project", row.sourceKey, created.id);
        rowResults.push({ sheetName: row.sheetName, rowNumber: row.rowNumber, operation: "create", targetId: created.id });
      }
    } else if (row.entityType === "job") {
      const existingId = lookup("job", row.sourceKey);
      if (existingId) {
        rowResults.push({ sheetName: row.sheetName, rowNumber: row.rowNumber, operation: "skip", targetId: existingId });
      } else {
        const created: ImportJob = {
          id: input.createId(),
          name: values.name ?? "",
          projectId: lookup("project", values.project_source_key),
          companyId: resolveCompany(domain, values),
          siteId: lookup("site", values.site_source_key),
          opportunityId: lookup("opportunity", values.opportunity_source_key),
          status: values.status || "draft",
          services: splitList(values.services),
        };
        domain.jobs.push(created);
        writes.jobs.push(created);
        link("job", row.sourceKey, created.id);
        rowResults.push({ sheetName: row.sheetName, rowNumber: row.rowNumber, operation: "create", targetId: created.id });
      }
    } else if (row.entityType === "job_assignment") {
      const jobId = lookup("job", values.job_source_key) ?? findByName(domain.jobs, values.job_name ?? values.name);
      const user = domain.users.find((item) => item.email.toLowerCase() === (values.email ?? ""));
      if (!jobId || !user) {
        return { ok: false, error: `Assignment row ${row.rowNumber} does not match one job and one user.` };
      }
      const existing = domain.assignments.find((item) => item.jobId === jobId && item.userId === user.id);
      if (existing) {
        rowResults.push({ sheetName: row.sheetName, rowNumber: row.rowNumber, operation: "skip", targetId: existing.id });
      } else {
        const created: ImportAssignment = {
          id: input.createId(),
          jobId,
          userId: user.id,
          role: values.role || "technician",
        };
        domain.assignments.push(created);
        writes.assignments.push(created);
        rowResults.push({ sheetName: row.sheetName, rowNumber: row.rowNumber, operation: "create", targetId: created.id });
      }
    } else if (row.entityType === "work_area") {
      const existingId = lookup("work_area", row.sourceKey);
      if (existingId) {
        rowResults.push({ sheetName: row.sheetName, rowNumber: row.rowNumber, operation: "skip", targetId: existingId });
        continue;
      }
      const jobId = lookup("job", values.job_source_key) ?? findByName(domain.jobs, values.job_name);
      if (!jobId) return { ok: false, error: `Work area row ${row.rowNumber} does not match one job.` };
      const created: ImportWorkArea = { id: input.createId(), jobId, name: values.name ?? "" };
      domain.workAreas.push(created);
      writes.workAreas.push(created);
      link("work_area", row.sourceKey, created.id);
      rowResults.push({ sheetName: row.sheetName, rowNumber: row.rowNumber, operation: "create", targetId: created.id });
    } else if (row.entityType === "job_task") {
      const existingId = lookup("job_task", row.sourceKey);
      if (existingId) {
        rowResults.push({ sheetName: row.sheetName, rowNumber: row.rowNumber, operation: "skip", targetId: existingId });
        continue;
      }
      const jobId = lookup("job", values.job_source_key) ?? findByName(domain.jobs, values.job_name);
      if (!jobId) return { ok: false, error: `Task row ${row.rowNumber} does not match one job.` };
      const created: ImportTask = {
        id: input.createId(),
        jobId,
        workAreaId: lookup("work_area", values.work_area_source_key),
        title: values.title ?? "",
      };
      domain.tasks.push(created);
      writes.tasks.push(created);
      link("job_task", row.sourceKey, created.id);
      rowResults.push({ sheetName: row.sheetName, rowNumber: row.rowNumber, operation: "create", targetId: created.id });
    }
  }

  return { ok: true, domain, writes, rowResults };
}

function draftVersion(input: Omit<ImportPriceVersion, "status" | "contentHash">): ImportPriceVersion {
  return {
    ...input,
    status: "draft",
    contentHash: priceRevisionContentHash({
      itemId: input.itemId,
      versionNumber: input.versionNumber,
      trade: input.trade,
      description: input.description,
      unit: input.unit,
      unitPriceCents: input.unitPriceCents,
    }),
  };
}

function nextVersion(domain: ImportDomain, itemId: string): number {
  const versions = domain.priceVersions.filter((version) => version.itemId === itemId);
  return versions.reduce((max, version) => Math.max(max, version.versionNumber), 0) + 1;
}

function resolveCompany(domain: ImportDomain, values: Record<string, string>): string | null {
  const linked = domain.crosswalk.find(
    (item) => item.entityType === "company" && item.sourceKey === values.company_source_key,
  )?.targetId;
  if (linked) return linked;
  if (!values.company_name) return null;
  const matches = domain.companies.filter((company) => sameText(company.name, values.company_name ?? ""));
  return matches.length === 1 ? matches[0]?.id ?? null : null;
}

function findByName(records: Array<{ id: string; name: string }>, name: string | undefined): string | null {
  if (!name) return null;
  const matches = records.filter((record) => sameText(record.name, name));
  return matches.length === 1 ? matches[0]?.id ?? null : null;
}

function sameText(left: string, right: string): boolean {
  return left.trim().replace(/\s+/g, " ").toLowerCase() === right.trim().replace(/\s+/g, " ").toLowerCase();
}

function incoming(value: string | undefined, current: string | null): string | null {
  const next = value?.trim();
  if (!next) return current;
  return next;
}

function splitList(value: string | undefined): string[] {
  if (!value?.trim()) return [];
  return value.split(/[;,]/).map((item) => item.trim()).filter(Boolean);
}
