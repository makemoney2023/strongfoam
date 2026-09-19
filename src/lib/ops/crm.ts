import {
  formatCompany,
  formatFullName,
  PROJECT_TYPE_LABELS,
} from "@/lib/ops/workflow";

export const OPPORTUNITY_STAGES = [
  "qualification",
  "site_visit",
  "estimating",
  "proposal",
  "won",
  "lost",
] as const;

export type OpportunityStage = (typeof OPPORTUNITY_STAGES)[number];

export const OPPORTUNITY_LABELS: Record<OpportunityStage, string> = {
  qualification: "Qualification",
  site_visit: "Site visit",
  estimating: "Estimating",
  proposal: "Proposal",
  won: "Won",
  lost: "Lost",
};

export const ROLE_LABELS: Record<string, string> = {
  gc: "General contractor / construction manager",
  owner_rep: "Developer / owner's representative",
  consultant: "Architect / consultant",
  property_manager: "Property / asset manager",
  other: "Other",
};

const LEGAL_SUFFIX =
  /\b(inc|incorporated|ltd|limited|llc|corp|corporation|co|company)\b/g;

export type CrmDraft = {
  companyName: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  role: string | null;
  siteName: string;
  city: string;
  province: string;
  opportunityName: string;
  stage: OpportunityStage;
  owner: string | null;
  source: string;
  services: string[];
  projectType: string;
};

export type CrmConversionInput = CrmDraft & {
  linkCompanyId: string | null;
  linkContactId: string | null;
  createNew: boolean;
};

export type CompanyMatch = {
  id: string;
  name: string;
  reason: "name";
};

export type ContactMatch = {
  id: string;
  name: string;
  email: string;
  reason: "email" | "phone";
};

export function isOpportunityStage(value: string): value is OpportunityStage {
  return OPPORTUNITY_STAGES.includes(value as OpportunityStage);
}

export function normalizeName(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(LEGAL_SUFFIX, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function normalizeEmail(value: string): string {
  return value.trim().toLowerCase();
}

export function normalizePhone(value: string): string {
  return value.replace(/\D/g, "").slice(-10);
}

export function namesMatch(left: string, right: string): boolean {
  const a = normalizeName(left);
  const b = normalizeName(right);
  return Boolean(a) && a === b;
}

export function emailsMatch(left: string, right: string): boolean {
  const a = normalizeEmail(left);
  const b = normalizeEmail(right);
  return Boolean(a) && a === b;
}

export function phonesMatch(left: string, right: string): boolean {
  const a = normalizePhone(left);
  const b = normalizePhone(right);
  return a.length >= 10 && a === b;
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

export function draftCrmFromRequest(request: {
  company: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  city: string;
  province: string;
  projectType: string;
  services: string[];
  assignedTo: string | null;
  answers: unknown;
  sourcePath?: string | null;
}): CrmDraft {
  const answers = asRecord(request.answers);
  const contactName = formatFullName(request.firstName, request.lastName);
  const companyName = formatCompany(request.company, contactName);
  const roleValue = typeof answers.role === "string" ? answers.role : "";
  const projectLabel =
    PROJECT_TYPE_LABELS[request.projectType as keyof typeof PROJECT_TYPE_LABELS] ??
    request.projectType;

  return {
    companyName,
    firstName: request.firstName.trim(),
    lastName: request.lastName.trim(),
    email: normalizeEmail(request.email),
    phone: request.phone.trim(),
    role: ROLE_LABELS[roleValue] ?? (roleValue || null),
    siteName: `${request.city.trim()} jobsite`,
    city: request.city.trim(),
    province: request.province.trim(),
    opportunityName: `${companyName} · ${request.city.trim()} ${projectLabel}`,
    stage: "qualification",
    owner: request.assignedTo,
    source: request.sourcePath?.trim() || "estimate-request",
    services: request.services,
    projectType: request.projectType,
  };
}

export function parseCrmConversion(input: {
  companyName?: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  role?: string | null;
  siteName?: string;
  city?: string;
  province?: string;
  opportunityName?: string;
  stage?: string;
  owner?: string | null;
  source?: string;
  services?: string[];
  projectType?: string;
  linkCompanyId?: string;
  linkContactId?: string;
  createNew?: string | boolean;
}):
  | { ok: true; value: CrmConversionInput }
  | { ok: false; error: string; field?: string } {
  const companyName = input.companyName?.trim() ?? "";
  const firstName = input.firstName?.trim() ?? "";
  const lastName = input.lastName?.trim() ?? "";
  const email = normalizeEmail(input.email ?? "");
  const city = input.city?.trim() ?? "";
  const province = input.province?.trim() ?? "";
  const opportunityName = input.opportunityName?.trim() ?? "";
  const stage = input.stage ?? "qualification";

  if (!companyName) return { ok: false, error: "A company name is required.", field: "companyName" };
  if (!firstName) {
    return { ok: false, error: "A contact first name is required.", field: "firstName" };
  }
  if (!lastName) {
    return { ok: false, error: "A contact last name is required.", field: "lastName" };
  }
  if (!email || !email.includes("@")) {
    return { ok: false, error: "A valid contact email is required.", field: "email" };
  }
  if (!city) {
    return { ok: false, error: "A site city is required.", field: "city" };
  }
  if (!province) {
    return { ok: false, error: "A site province is required.", field: "province" };
  }
  if (!opportunityName) {
    return { ok: false, error: "An opportunity name is required.", field: "opportunityName" };
  }
  if (!isOpportunityStage(stage)) {
    return { ok: false, error: "Choose a valid opportunity stage.", field: "stage" };
  }

  return {
    ok: true,
    value: {
      companyName,
      firstName,
      lastName,
      email,
      phone: input.phone?.trim() ?? "",
      role: input.role?.trim() || null,
      siteName: input.siteName?.trim() || `${city} jobsite`,
      city,
      province,
      opportunityName,
      stage,
      owner: input.owner?.trim() || null,
      source: input.source?.trim() || "estimate-request",
      services: input.services ?? [],
      projectType: input.projectType ?? "",
      linkCompanyId: input.linkCompanyId?.trim() || null,
      linkContactId: input.linkContactId?.trim() || null,
      createNew:
        input.createNew === true ||
        input.createNew === "true" ||
        input.createNew === "on" ||
        input.createNew === "1",
    },
  };
}

export function findCompanyMatches(
  companyName: string,
  companies: Array<{ id: string; name: string }>,
): CompanyMatch[] {
  return companies
    .filter((company) => namesMatch(companyName, company.name))
    .map((company) => ({
      id: company.id,
      name: company.name,
      reason: "name" as const,
    }));
}

export function findContactMatches(
  email: string,
  phone: string,
  contacts: Array<{
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
  }>,
): ContactMatch[] {
  const matches: ContactMatch[] = [];
  for (const contact of contacts) {
    const reason = emailsMatch(email, contact.email)
      ? "email"
      : phonesMatch(phone, contact.phone)
        ? "phone"
        : null;
    if (!reason) continue;
    matches.push({
      id: contact.id,
      name: formatFullName(contact.firstName, contact.lastName),
      email: contact.email,
      reason,
    });
  }
  return matches;
}

export function requiresDuplicateDecision(args: {
  companyMatches: CompanyMatch[];
  contactMatches: ContactMatch[];
  linkCompanyId: string | null;
  linkContactId: string | null;
  createNew: boolean;
}): { error: string; field: string } | null {
  if (args.createNew) return null;
  if (args.companyMatches.length > 0 && !args.linkCompanyId) {
    return {
      error: "A similar company already exists. Link it or confirm creating a new company.",
      field: "linkCompanyId",
    };
  }
  if (args.contactMatches.length > 0 && !args.linkContactId) {
    return {
      error: "A similar contact already exists. Link it or confirm creating a new contact.",
      field: "linkContactId",
    };
  }
  return null;
}
