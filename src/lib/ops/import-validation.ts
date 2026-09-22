import { createHash } from "node:crypto";
import { isOpportunityStage } from "@/lib/ops/crm";
import {
  IMPORT_COMMIT_ORDER,
  IMPORT_ENTITY_LABELS,
  isImportEntityType,
  validateImportLimits,
  type ImportEntityType,
  type ImportRowStatus,
} from "@/lib/ops/import-contract";
import { isMembershipRole } from "@/lib/ops/identity";
import { isJobStatus } from "@/lib/ops/jobs";
import { isPriceBookTrade, isPriceBookUnit, parseUnitPriceCents } from "@/lib/ops/price-book";
import { isProjectStatus } from "@/lib/ops/records";
import {
  parseImportWorkbook,
  type WorkbookCell,
  type WorkbookSheet,
} from "@/lib/ops/import-workbook";

export type StagedImportRow = {
  sheetName: string;
  rowNumber: number;
  entityType: ImportEntityType;
  sourceKey: string;
  status: ImportRowStatus;
  messages: string[];
  values: Record<string, string>;
};

export type StagedImportSheet = {
  name: string;
  entityType: ImportEntityType | null;
  headers: string[];
  rowCount: number;
};

export type StagedImport = {
  sheets: StagedImportSheet[];
  rows: StagedImportRow[];
  status: "ready" | "invalid" | "needs_mapping";
  previewHash: string;
  summary: {
    rowCount: number;
    errorCount: number;
    warningCount: number;
    validCount: number;
    sheetCount: number;
  };
};

const SHEET_ALIASES: Record<string, ImportEntityType> = {
  company: "company",
  companies: "company",
  customer: "company",
  customers: "company",
  contact: "contact",
  contacts: "contact",
  site: "site",
  sites: "site",
  workforce: "workforce_user",
  workforceuser: "workforce_user",
  workforceusers: "workforce_user",
  users: "workforce_user",
  employees: "workforce_user",
  pricebook: "price_book_item",
  pricebookitem: "price_book_item",
  pricebookitems: "price_book_item",
  prices: "price_book_item",
  opportunity: "opportunity",
  opportunities: "opportunity",
  project: "project",
  projects: "project",
  job: "job",
  jobs: "job",
  assignment: "job_assignment",
  assignments: "job_assignment",
  jobassignment: "job_assignment",
  jobassignments: "job_assignment",
  workarea: "work_area",
  workareas: "work_area",
  task: "job_task",
  tasks: "job_task",
  jobtask: "job_task",
  jobtasks: "job_task",
};

const HEADER_ALIASES: Record<string, string> = {
  sourcekey: "source_key",
  source_key: "source_key",
  externalid: "source_key",
  customercode: "source_key",
  itemcode: "item_code",
  item_code: "item_code",
  code: "source_key",
  name: "name",
  companyname: "company_name",
  company: "company_name",
  companysourcekey: "company_source_key",
  contactsourcekey: "contact_source_key",
  sitesourcekey: "site_source_key",
  opportunitysourcekey: "opportunity_source_key",
  projectsourcekey: "project_source_key",
  jobsourcekey: "job_source_key",
  workareasourcekey: "work_area_source_key",
  firstname: "first_name",
  lastname: "last_name",
  displayname: "display_name",
  email: "email",
  phone: "phone",
  city: "city",
  province: "province",
  state: "province",
  address: "address_line",
  addressline: "address_line",
  postalcode: "postal_code",
  postal: "postal_code",
  role: "role",
  trade: "trade",
  unit: "unit",
  unitprice: "unit_price",
  unitpricecents: "unit_price_cents",
  price: "unit_price",
  sellingprice: "unit_price",
  unitcost: "unit_cost",
  unitcostcents: "unit_cost_cents",
  itemkind: "item_kind",
  kind: "item_kind",
  supplier: "supplier",
  stage: "stage",
  status: "status",
  services: "services",
  title: "title",
  scope: "scope",
  active: "active",
};

export function stageImportFile(input: {
  bytes: Buffer;
  filename: string;
  entityType?: string | null;
}): { ok: true; value: StagedImport } | { ok: false; error: string } {
  const parsed = parseImportWorkbook(input.bytes, input.filename);
  if (!parsed.ok) return parsed;
  const override = input.entityType && isImportEntityType(input.entityType)
    ? input.entityType
    : null;
  const sheets: StagedImportSheet[] = [];
  const rows: StagedImportRow[] = [];
  let unmapped = false;
  for (const sheet of parsed.sheets) {
    const detected = override ?? detectEntity(sheet);
    if (!detected) {
      unmapped = true;
      sheets.push({
        name: sheet.name,
        entityType: null,
        headers: headerLabels(sheet),
        rowCount: Math.max(sheet.rows.length - 1, 0),
      });
      continue;
    }
    const staged = stageSheet(sheet, detected);
    if (!staged.ok) return staged;
    sheets.push(staged.sheet);
    rows.push(...staged.rows);
  }
  const limits = validateImportLimits({
    fileBytes: input.bytes.length,
    sheetCount: parsed.sheets.length,
    rowCount: Math.max(rows.length, unmapped ? 1 : 0),
  });
  if (!limits.ok) return limits;
  if (rows.length === 0 && !unmapped) {
    return { ok: false, error: "The file needs a header row and at least one data row." };
  }
  const errorCount = rows.filter((row) => row.status === "error" || row.status === "conflict").length;
  const warningCount = rows.filter((row) => row.status === "warning").length;
  const status = unmapped ? "needs_mapping" : errorCount > 0 ? "invalid" : "ready";
  return {
    ok: true,
    value: {
      sheets,
      rows,
      status,
      previewHash: previewHash(rows),
      summary: {
        rowCount: rows.length,
        errorCount,
        warningCount,
        validCount: rows.length - errorCount,
        sheetCount: sheets.length,
      },
    },
  };
}

export function previewHash(rows: StagedImportRow[]): string {
  const canonical = [...rows]
    .sort((left, right) =>
      `${left.sheetName}:${left.rowNumber}`.localeCompare(`${right.sheetName}:${right.rowNumber}`),
    )
    .map((row) => ({
      sheetName: row.sheetName,
      rowNumber: row.rowNumber,
      entityType: row.entityType,
      sourceKey: row.sourceKey,
      status: row.status,
      values: row.values,
    }));
  return createHash("sha256").update(stableStringify(canonical)).digest("hex");
}

function stableStringify(value: unknown): string {
  if (value === null || typeof value !== "object") return JSON.stringify(value) ?? "null";
  if (Array.isArray(value)) return `[${value.map((item) => stableStringify(item)).join(",")}]`;
  const record = value as Record<string, unknown>;
  return `{${Object.keys(record)
    .sort()
    .map((key) => `${JSON.stringify(key)}:${stableStringify(record[key])}`)
    .join(",")}}`;
}

const ENTITY_HEADER_ALIASES: Partial<Record<ImportEntityType, Record<string, string>>> = {
  company: {
    company: "name",
    companyname: "name",
    customer: "name",
    customername: "name",
  },
  workforce_user: {
    name: "display_name",
    fullname: "display_name",
    employeename: "display_name",
  },
  job: {
    job: "name",
    jobname: "name",
  },
  project: {
    project: "name",
    projectname: "name",
  },
  opportunity: {
    opportunity: "name",
    opportunityname: "name",
  },
  site: {
    site: "name",
    sitename: "name",
  },
  work_area: {
    area: "name",
    areaname: "name",
    workarea: "name",
    job: "job_name",
    jobname: "job_name",
  },
  job_assignment: {
    job: "job_name",
    jobname: "job_name",
  },
  job_task: {
    name: "title",
    task: "title",
    taskname: "title",
    job: "job_name",
    jobname: "job_name",
  },
};

function detectEntity(sheet: WorkbookSheet): ImportEntityType | null {
  const alias = SHEET_ALIASES[normalizeKey(sheet.name)];
  if (alias) return alias;
  const fields = new Set(
    headerLabels(sheet).map((header) => HEADER_ALIASES[normalizeKey(header)] ?? ""),
  );
  if (fields.has("unit_price") || fields.has("unit_price_cents")) return "price_book_item";
  if (fields.has("display_name")) return "workforce_user";
  if (fields.has("first_name")) return "contact";
  return null;
}

function fieldForHeader(header: string, entityType: ImportEntityType): string {
  const key = normalizeKey(header);
  if (!key) return "";
  return ENTITY_HEADER_ALIASES[entityType]?.[key] ?? HEADER_ALIASES[key] ?? "";
}

function headerLabels(sheet: WorkbookSheet): string[] {
  return (sheet.rows[0] ?? []).map((cell) => cell.value.trim()).filter(Boolean);
}

function stageSheet(
  sheet: WorkbookSheet,
  entityType: ImportEntityType,
):
  | { ok: true; sheet: StagedImportSheet; rows: StagedImportRow[] }
  | { ok: false; error: string } {
  const headerRow = sheet.rows[0];
  if (!headerRow) return { ok: false, error: `${sheet.name} has no header row.` };
  const headers = headerRow.map((cell) => cell.value.trim());
  if (headers.some((header) => /password|passwd|secret/i.test(header))) {
    return {
      ok: false,
      error: "Import files cannot include a password column.",
    };
  }
  const fields = headers.map((header) => fieldForHeader(header, entityType));
  const rows: StagedImportRow[] = [];
  const seen = new Set<string>();
  for (let index = 1; index < sheet.rows.length; index += 1) {
    const source = sheet.rows[index] ?? [];
    if (source.every((cell) => !cell.value.trim() && !cell.formula)) continue;
    rows.push(stageRow({
      sheetName: sheet.name,
      rowNumber: index + 1,
      entityType,
      fields,
      cells: source,
      seen,
    }));
  }
  return {
    ok: true,
    sheet: {
      name: sheet.name,
      entityType,
      headers: headers.filter(Boolean),
      rowCount: rows.length,
    },
    rows,
  };
}

function stageRow(input: {
  sheetName: string;
  rowNumber: number;
  entityType: ImportEntityType;
  fields: string[];
  cells: WorkbookCell[];
  seen: Set<string>;
}): StagedImportRow {
  const messages: string[] = [];
  let status: ImportRowStatus = "valid";
  const values: Record<string, string> = {};
  input.cells.forEach((cell, index) => {
    const field = input.fields[index];
    if (!field) return;
    if (cell.formula && !cell.value.trim()) {
      status = "error";
      messages.push(
        `${field} contains a formula without a cached value. Replace the formula with a value.`,
      );
      return;
    }
    if (cell.formula && cell.value.trim()) {
      messages.push(`${field} used the spreadsheet's cached value and was not evaluated.`);
      if (status === "valid") status = "warning";
    }
    values[field] = cell.value.trim();
  });
  normalizeRow(input.entityType, values, messages, (next) => {
    status = worse(status, next);
  });
  const sourceKey = values.source_key || syntheticSourceKey(input.entityType, values);
  if (!values.source_key) {
    messages.push("No source key was provided, so repeat imports match the exact protected value.");
    if (status === "valid") status = "warning";
  }
  values.source_key = sourceKey;
  const duplicateKey = `${input.entityType}:${sourceKey}`;
  if (input.seen.has(duplicateKey)) {
    status = "error";
    messages.push("This source key is repeated in the file.");
  }
  input.seen.add(duplicateKey);
  if (input.entityType === "workforce_user" && /^(1|true|yes|active)$/i.test(values.active ?? "")) {
    messages.push("Imported users stay inactive until someone activates them on Users.");
    if (status === "valid") status = "warning";
  }
  return {
    sheetName: input.sheetName,
    rowNumber: input.rowNumber,
    entityType: input.entityType,
    sourceKey,
    status,
    messages,
    values,
  };
}

function normalizeRow(
  entityType: ImportEntityType,
  values: Record<string, string>,
  messages: string[],
  setStatus: (status: ImportRowStatus) => void,
) {
  const requireField = (field: string, label: string) => {
    if (!values[field]?.trim()) {
      setStatus("error");
      messages.push(`${label} is required.`);
    }
  };
  if (values.email) values.email = values.email.trim().toLowerCase();
  if (entityType === "company") requireField("name", "Company name");
  if (entityType === "contact") {
    requireField("email", "Email");
    if (!values.first_name && values.name) {
      const [first, ...rest] = values.name.split(/\s+/);
      values.first_name = first ?? "";
      values.last_name = rest.join(" ");
    }
    requireField("first_name", "First name");
    requireField("last_name", "Last name");
    if (!values.company_source_key && !values.company_name) {
      setStatus("error");
      messages.push("A contact needs a company source key or an exact company name.");
    }
  }
  if (entityType === "site") {
    requireField("name", "Site name");
    requireField("city", "City");
    requireField("province", "Province");
    if (!values.company_source_key && !values.company_name) {
      setStatus("error");
      messages.push("A site needs a company source key or an exact company name.");
    }
  }
  if (entityType === "workforce_user") {
    requireField("email", "Email");
    if (!values.display_name) {
      values.display_name = [values.first_name, values.last_name].filter(Boolean).join(" ");
    }
    requireField("display_name", "Name");
    if (values.role && !isMembershipRole(values.role)) {
      const normalized = values.role.toLowerCase().replaceAll(" ", "_");
      if (isMembershipRole(normalized)) values.role = normalized;
      else {
        setStatus("error");
        messages.push("Role must be administrator, office, field lead, or field worker.");
      }
    }
    if (!values.role) values.role = "field_worker";
  }
  if (entityType === "price_book_item") {
    requireField("name", "Item name");
    values.trade = normalizeTrade(values.trade ?? "");
    values.unit = normalizeUnit(values.unit ?? "");
    if (!isPriceBookTrade(values.trade)) {
      setStatus("error");
      messages.push("Trade must be spray foam, fireproofing, intumescent, AVB, or SPF roofing.");
    }
    if (!isPriceBookUnit(values.unit)) {
      setStatus("error");
      messages.push("Unit must be bags, sq ft, hour, or each.");
    }
    const price = values.unit_price_cents
      ? { ok: true as const, cents: Number(values.unit_price_cents) }
      : parseUnitPriceCents(values.unit_price ?? "");
    if (!price.ok || !Number.isInteger(price.cents)) {
      setStatus("error");
      messages.push("Enter a selling price in dollars with at most two decimal places.");
    } else {
      values.unit_price_cents = String(price.cents);
    }
    if (values.unit_cost) {
      const cost = parseUnitPriceCents(values.unit_cost);
      if (!cost.ok) {
        setStatus("error");
        messages.push("Unit cost must be a dollar amount with at most two decimal places.");
      } else values.unit_cost_cents = String(cost.cents);
    }
    if (values.item_kind) {
      const kind = values.item_kind.toLowerCase();
      if (!["material", "labour", "labor", "equipment"].includes(kind)) {
        setStatus("error");
        messages.push("Item kind must be material, labour, or equipment.");
      } else values.item_kind = kind === "labor" ? "labour" : kind;
    }
    if (values.item_code && !values.source_key) values.source_key = values.item_code;
  }
  if (entityType === "opportunity") {
    requireField("name", "Opportunity name");
    if (values.stage) {
      const stage = normalizeToken(values.stage);
      if (!isOpportunityStage(stage)) {
        setStatus("error");
        messages.push("Stage is not one of the opportunity stages.");
      } else values.stage = stage;
    } else values.stage = "qualification";
  }
  if (entityType === "project") {
    requireField("name", "Project name");
    if (values.status) {
      const status = normalizeToken(values.status);
      if (!isProjectStatus(status)) {
        setStatus("error");
        messages.push("Project status is not recognized.");
      } else values.status = status;
    } else values.status = "active";
  }
  if (entityType === "job") {
    requireField("name", "Job name");
    if (values.status) {
      const status = normalizeToken(values.status);
      if (!isJobStatus(status)) {
        setStatus("error");
        messages.push("Job status is not recognized.");
      } else values.status = status;
    } else values.status = "draft";
  }
  if (entityType === "job_assignment") {
    requireField("email", "Email");
    if (!values.job_source_key && !values.job_name && !values.name) {
      setStatus("error");
      messages.push("An assignment needs a job source key or an exact job name.");
    }
    const role = (values.role || "technician").toLowerCase();
    if (role !== "foreman" && role !== "technician") {
      setStatus("error");
      messages.push("Assignment role must be foreman or technician.");
    } else values.role = role;
  }
  if (entityType === "work_area") {
    requireField("name", "Work area name");
    if (!values.job_source_key && !values.job_name) {
      setStatus("error");
      messages.push("A work area needs a job source key or an exact job name.");
    }
  }
  if (entityType === "job_task") {
    if (!values.title && values.name) values.title = values.name;
    requireField("title", "Task title");
    if (!values.job_source_key && !values.job_name) {
      setStatus("error");
      messages.push("A task needs a job source key or an exact job name.");
    }
  }
}

function syntheticSourceKey(entityType: ImportEntityType, values: Record<string, string>): string {
  if (entityType === "contact" || entityType === "workforce_user" || entityType === "job_assignment") {
    return `email:${values.email ?? ""}`;
  }
  if (entityType === "price_book_item" && values.item_code) return values.item_code;
  if (entityType === "price_book_item") {
    return `item:${normalizeKey(values.name ?? "")}:${values.trade ?? ""}`;
  }
  if (entityType === "site") {
    return `site:${normalizeKey(values.company_name ?? values.company_source_key ?? "")}:${normalizeKey(values.name ?? "")}`;
  }
  if (entityType === "job_task") return `task:${normalizeKey(values.title ?? "")}`;
  return `name:${normalizeKey(values.name ?? values.display_name ?? values.title ?? "")}`;
}

function worse(current: ImportRowStatus, next: ImportRowStatus): ImportRowStatus {
  const rank: Record<ImportRowStatus, number> = {
    valid: 0,
    warning: 1,
    conflict: 2,
    error: 3,
  };
  return rank[next] > rank[current] ? next : current;
}

function normalizeKey(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "");
}

function normalizeToken(value: string): string {
  return value.trim().toLowerCase().replace(/[\s-]+/g, "_");
}

function normalizeTrade(value: string): string {
  return value.trim().toLowerCase().replace(/[\s_]+/g, "-");
}

function normalizeUnit(value: string): string {
  const token = value.trim().toLowerCase().replace(/[\s-]+/g, "_");
  if (token === "sqft" || token === "square_feet" || token === "sq_ft") return "sq_ft";
  if (token === "hr" || token === "hours") return "hour";
  if (token === "ea" || token === "each") return "each";
  if (token === "bag" || token === "bags") return "bags";
  return token;
}

export function importTemplateCsv(entityType: ImportEntityType): string {
  const headers: Record<ImportEntityType, string[]> = {
    company: ["source_key", "name", "email", "phone", "city", "province"],
    contact: ["source_key", "company_source_key", "first_name", "last_name", "email", "phone", "role"],
    site: ["source_key", "company_source_key", "name", "address_line", "city", "province", "postal_code"],
    workforce_user: ["source_key", "display_name", "email", "role"],
    price_book_item: ["source_key", "item_code", "name", "trade", "unit", "unit_price", "item_kind", "supplier", "unit_cost"],
    opportunity: ["source_key", "name", "company_source_key", "stage", "services"],
    project: ["source_key", "name", "company_source_key", "site_source_key", "status"],
    job: ["source_key", "name", "project_source_key", "company_source_key", "status", "services"],
    job_assignment: ["source_key", "job_source_key", "email", "role"],
    work_area: ["source_key", "job_source_key", "name"],
    job_task: ["source_key", "job_source_key", "work_area_source_key", "title"],
  };
  return `${headers[entityType].join(",")}\n`;
}

export function orderedImportRows(rows: StagedImportRow[]): StagedImportRow[] {
  const rank = new Map(IMPORT_COMMIT_ORDER.map((entity, index) => [entity, index]));
  return [...rows].sort((left, right) => {
    const entity = (rank.get(left.entityType) ?? 0) - (rank.get(right.entityType) ?? 0);
    if (entity !== 0) return entity;
    return left.rowNumber - right.rowNumber;
  });
}

export function entityLabel(entityType: ImportEntityType): string {
  return IMPORT_ENTITY_LABELS[entityType];
}
