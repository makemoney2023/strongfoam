export const WORKFLOW_STATUSES = [
  "new",
  "reviewing",
  "site_visit_needed",
  "estimating",
  "quote_sent",
  "won",
  "lost",
  "archived",
] as const;

export type WorkflowStatus = (typeof WORKFLOW_STATUSES)[number];

export const WORKFLOW_LABELS: Record<WorkflowStatus, string> = {
  new: "New",
  reviewing: "Reviewing",
  site_visit_needed: "Site visit needed",
  estimating: "Estimating",
  quote_sent: "Quote sent",
  won: "Won",
  lost: "Lost",
  archived: "Archived",
};

export const PROJECT_TYPE_LABELS = {
  commercial_ici: "Commercial / ICI",
  multi_unit: "Multi-unit residential",
  industrial: "Industrial",
  residential_other: "Residential / other",
} as const;

export const QUALIFICATION_LABELS = {
  qualified: "Qualified",
  secondary: "Secondary",
} as const;

export const BOOKING_LABELS = {
  none: "None",
  offered: "Offered",
  booked: "Booked",
  canceled: "Canceled",
} as const;

export const SERVICE_LABELS: Record<string, string> = {
  "spray-foam": "Spray foam",
  fireproofing: "Fireproofing",
  intumescent: "Intumescent",
  avb: "AVB",
  "spf-roofing": "SPF roofing",
};

export function isWorkflowStatus(value: string): value is WorkflowStatus {
  return WORKFLOW_STATUSES.includes(value as WorkflowStatus);
}

export function requireLostReason(
  status: WorkflowStatus,
  lostReason: string | null | undefined,
): string | null {
  if (status !== "lost") return null;
  const reason = lostReason?.trim() ?? "";
  return reason.length > 0
    ? null
    : "A lost reason is required when a request is marked lost.";
}

export function formatRequestNumber(id: string): string {
  return `SF-${id.slice(0, 8).toUpperCase()}`;
}

export function formatRelativeAge(createdAt: Date, now = new Date()): string {
  const minutes = Math.max(
    0,
    Math.floor((now.getTime() - createdAt.getTime()) / 60_000),
  );
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  if (hours < 48) return `${hours}h`;
  return `${Math.floor(hours / 24)}d`;
}

export function formatServices(services: string[]): string {
  if (services.length === 0) return "Unspecified";
  return services.map((id) => SERVICE_LABELS[id] ?? id).join(", ");
}

export function formatFullName(firstName: string, lastName: string): string {
  return [firstName, lastName].filter(Boolean).join(" ").trim() || "Unknown";
}

export function formatCompany(company: string, fallback: string): string {
  return company.trim() || fallback;
}
