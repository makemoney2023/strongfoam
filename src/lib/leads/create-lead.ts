import {
  buildEstimatingEmail,
  buildVisitorEmail,
  type LeadEmailInput,
} from "@/lib/leads/email";
import { signLeadId } from "@/lib/leads/hmac";
import { idempotencyKey } from "@/lib/leads/idempotency";
import { qualifyLead } from "@/lib/leads/qualify";
import type { RateLimiter } from "@/lib/leads/rate-limit";
import { parseLeadPayload, type LeadPayload } from "@/lib/leads/schema";
import { assertNotSpam } from "@/lib/leads/spam";
import type { ListedServiceId } from "@/lib/leads/types";
import { isOwnedUploadPath } from "@/lib/leads/uploads";

export const IDEMPOTENCY_WINDOW_MS = 10 * 60 * 1000;

export type StoredLead = {
  id: string;
  createdAt: number;
  status: "qualified" | "secondary";
  bookingStatus: "none" | "offered" | "booked" | "canceled";
  notifyStatus: "pending" | "sent" | "failed";
  email: string;
  idempotencyKey: string;
};

export type LeadStore = {
  findByIdempotencyKey(key: string): Promise<StoredLead | null>;
  insert(
    lead: Omit<StoredLead, "id" | "createdAt"> & { payload: unknown },
  ): Promise<StoredLead>;
  updateNotifyStatus(
    id: string,
    status: StoredLead["notifyStatus"],
  ): Promise<void>;
};

export type Mailer = {
  sendEstimating(input: LeadEmailInput): Promise<void>;
  sendVisitor(input: LeadEmailInput): Promise<void>;
};

export type CreateLeadResult =
  | { ok: true; leadId: string; thanksPath: string; duplicate: boolean }
  | { ok: false; error: "rate_limited" | "spam" | "invalid" };

function servicesOf(payload: LeadPayload): ListedServiceId[] {
  return "services" in payload ? [...payload.services] : [];
}

function emailInput(
  payload: LeadPayload,
  status: StoredLead["status"],
  reasons: string[],
): LeadEmailInput {
  return {
    status,
    firstName: payload.firstName,
    lastName: payload.lastName,
    company: payload.company,
    city: payload.city,
    services: servicesOf(payload),
    reasons,
    fileLinks: payload.uploadPaths,
    calendlyOffered: status === "qualified",
  };
}

function thanksPath(leadId: string, secret: string): string {
  return `/request-estimate/thanks?lid=${leadId}&k=${signLeadId(leadId, secret)}`;
}

export async function createLead(args: {
  body: unknown;
  ip: string;
  now?: number;
  limiter: RateLimiter;
  store: LeadStore;
  mailer: Mailer;
  thanksSecret: string;
}): Promise<CreateLeadResult> {
  const now = args.now ?? Date.now();
  const limited = await args.limiter.limit(args.ip);
  if (!limited.success) return { ok: false, error: "rate_limited" };

  const parsed = parseLeadPayload(args.body);
  if (!parsed.ok) return { ok: false, error: "invalid" };
  const payload = parsed.data;

  const companyWebsite =
    (args.body as { companyWebsite?: string }).companyWebsite ?? "";
  const spam = assertNotSpam({
    companyWebsite,
    startedAt: payload.startedAt,
    now,
  });
  if (spam !== "ok") return { ok: false, error: "spam" };

  if (
    payload.uploadPaths.some(
      (path) => !isOwnedUploadPath(payload.draftId, path),
    )
  ) {
    return { ok: false, error: "invalid" };
  }

  const key = idempotencyKey(payload);
  const existing = await args.store.findByIdempotencyKey(key);
  if (
    existing &&
    now >= existing.createdAt &&
    now - existing.createdAt <= IDEMPOTENCY_WINDOW_MS
  ) {
    return {
      ok: true,
      leadId: existing.id,
      thanksPath: thanksPath(existing.id, args.thanksSecret),
      duplicate: true,
    };
  }

  const qualification = qualifyLead({
    projectType: payload.projectType,
    province: payload.province,
    services: servicesOf(payload),
  });
  const inserted = await args.store.insert({
    status: qualification.status,
    bookingStatus: qualification.status === "qualified" ? "offered" : "none",
    notifyStatus: "pending",
    email: payload.email,
    idempotencyKey: key,
    payload,
  });
  const message = emailInput(
    payload,
    qualification.status,
    qualification.reasons,
  );

  void buildEstimatingEmail(message);
  void buildVisitorEmail(message);
  try {
    await args.mailer.sendEstimating(message);
    await args.mailer.sendVisitor(message);
    await args.store.updateNotifyStatus(inserted.id, "sent");
  } catch {
    await args.store.updateNotifyStatus(inserted.id, "failed");
  }

  return {
    ok: true,
    leadId: inserted.id,
    thanksPath: thanksPath(inserted.id, args.thanksSecret),
    duplicate: false,
  };
}
