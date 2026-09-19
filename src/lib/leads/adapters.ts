import { issueSignedToken, presignUrl } from "@vercel/blob";
import { and, desc, eq, gte } from "drizzle-orm";
import { getDb } from "@/db";
import { calendlyUnmatchedEvents, leads } from "@/db/schema";
import type { CalendlyLeadStore } from "@/lib/leads/calendly";
import type { LeadStore, Mailer, StoredLead } from "@/lib/leads/create-lead";
import { buildEstimatingEmail, buildVisitorEmail } from "@/lib/leads/email";
import { MemoryRateLimiter, type RateLimiter } from "@/lib/leads/rate-limit";
import type { LeadPayload } from "@/lib/leads/schema";

export function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`${name} is not set`);
  }
  return value;
}

/**
 * Upstash Redis REST-based fixed-window rate limiter. Uses plain `fetch`
 * against the REST API so no extra SDK dependency is required.
 */
export class UpstashRateLimiter implements RateLimiter {
  constructor(
    private readonly url: string,
    private readonly token: string,
    private readonly max: number,
    private readonly windowSeconds: number,
  ) {}

  async limit(key: string): Promise<{ success: boolean }> {
    const encodedKey = encodeURIComponent(`lead-rl:${key}`);
    const incrResponse = await fetch(`${this.url}/incr/${encodedKey}`, {
      headers: { Authorization: `Bearer ${this.token}` },
    });
    if (!incrResponse.ok) {
      // Fail open: do not block leads if the rate limit backend is down.
      return { success: true };
    }
    const { result: count } = (await incrResponse.json()) as {
      result: number;
    };
    if (count === 1) {
      await fetch(`${this.url}/expire/${encodedKey}/${this.windowSeconds}`, {
        headers: { Authorization: `Bearer ${this.token}` },
      });
    }
    return { success: count <= this.max };
  }
}

export function createRateLimiter(
  env: Record<string, string | undefined>,
): RateLimiter {
  const url = env.UPSTASH_REDIS_REST_URL;
  const token = env.UPSTASH_REDIS_REST_TOKEN;
  if (url && token) {
    return new UpstashRateLimiter(url, token, 5, 15 * 60);
  }
  return new MemoryRateLimiter();
}

let rateLimiterSingleton: RateLimiter | null = null;

export function getRateLimiter(): RateLimiter {
  if (!rateLimiterSingleton) {
    rateLimiterSingleton = createRateLimiter(process.env);
  }
  return rateLimiterSingleton;
}

function rowToStoredLead(row: typeof leads.$inferSelect): StoredLead {
  return {
    id: row.id,
    createdAt: row.createdAt.getTime(),
    status: row.status as StoredLead["status"],
    bookingStatus: row.bookingStatus as StoredLead["bookingStatus"],
    notifyStatus: row.notifyStatus as StoredLead["notifyStatus"],
    email: row.email,
    idempotencyKey: row.idempotencyKey,
  };
}

/** Pure mapping from a create-lead insert payload to Drizzle insert values. */
export function buildLeadInsertValues(
  lead: Omit<StoredLead, "id" | "createdAt"> & { payload: unknown },
  now: number = Date.now(),
): typeof leads.$inferInsert {
  const payload = lead.payload as LeadPayload;
  return {
    status: lead.status,
    bookingStatus: lead.bookingStatus,
    notifyStatus: lead.notifyStatus,
    email: lead.email,
    phone: payload.phone,
    firstName: payload.firstName,
    lastName: payload.lastName,
    company: payload.company,
    projectType: payload.projectType,
    city: payload.city,
    province: payload.province,
    services: "services" in payload ? [...payload.services] : [],
    answers: payload,
    recommendedServices: "services" in payload ? [...payload.services] : [],
    files: payload.uploadPaths.map((pathname) => ({ pathname })),
    sourcePath: null,
    utm: null,
    referrer: null,
    idempotencyKey: lead.idempotencyKey,
    consentAt: new Date(now),
    workflowStatus: "new",
    assignedTo: null,
    nextAction: null,
    nextActionDueAt: null,
    lostReason: null,
  };
}

export function getLeadStore(): LeadStore {
  return {
    async findByIdempotencyKey(key) {
      const db = getDb();
      const rows = await db
        .select()
        .from(leads)
        .where(eq(leads.idempotencyKey, key))
        .limit(1);
      return rows[0] ? rowToStoredLead(rows[0]) : null;
    },

    async insert(lead) {
      const db = getDb();
      const rows = await db
        .insert(leads)
        .values(buildLeadInsertValues(lead))
        .returning();
      const row = rows[0];
      if (!row) {
        throw new Error("Insert did not return a row");
      }
      return rowToStoredLead(row);
    },

    async updateNotifyStatus(id, status) {
      const db = getDb();
      await db.update(leads).set({ notifyStatus: status }).where(eq(leads.id, id));
    },
  };
}

export type ThanksLead = {
  status: "qualified" | "secondary";
  firstName: string;
  lastName: string;
  email: string;
};

export async function getLeadById(id: string): Promise<ThanksLead | null> {
  const db = getDb();
  const rows = await db
    .select({
      status: leads.status,
      firstName: leads.firstName,
      lastName: leads.lastName,
      email: leads.email,
    })
    .from(leads)
    .where(eq(leads.id, id))
    .limit(1);
  const row = rows[0];
  if (!row) return null;
  if (row.status !== "qualified" && row.status !== "secondary") return null;
  return {
    status: row.status,
    firstName: row.firstName,
    lastName: row.lastName,
    email: row.email,
  };
}

export async function getLeadFilesById(
  leadId: string,
): Promise<{ files: Array<{ pathname: string }> } | null> {
  const db = getDb();
  const rows = await db
    .select({ files: leads.files })
    .from(leads)
    .where(eq(leads.id, leadId))
    .limit(1);
  const row = rows[0];
  if (!row) return null;
  return { files: row.files as Array<{ pathname: string }> };
}

export function getCalendlyStore(): CalendlyLeadStore {
  return {
    async findLatestByEmailSince(email, sinceMs) {
      const db = getDb();
      const rows = await db
        .select()
        .from(leads)
        .where(and(eq(leads.email, email), gte(leads.createdAt, new Date(sinceMs))))
        .orderBy(desc(leads.createdAt))
        .limit(1);
      return rows[0] ? rowToStoredLead(rows[0]) : null;
    },

    async updateBooking(id, status, inviteeUri) {
      const db = getDb();
      await db
        .update(leads)
        .set({ bookingStatus: status, calendlyInviteeUri: inviteeUri })
        .where(eq(leads.id, id));
    },

    async insertUnmatched(payload) {
      const db = getDb();
      await db.insert(calendlyUnmatchedEvents).values({ payload });
    },
  };
}

async function sendResendEmail(args: {
  to: string;
  subject: string;
  text: string;
}): Promise<void> {
  const apiKey = requireEnv("RESEND_API_KEY");
  const from = process.env.RESEND_FROM ?? "Strong Foam <estimates@strongfoam.com>";
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ from, to: [args.to], subject: args.subject, text: args.text }),
  });
  if (!response.ok) {
    throw new Error(`Resend request failed with status ${response.status}`);
  }
}

export function getMailer(): Mailer {
  return {
    async sendEstimating(input) {
      const to = process.env.LEAD_NOTIFY_TO ?? "estimating@strongfoam.com";
      const message = buildEstimatingEmail(input);
      await sendResendEmail({ to, ...message });
    },

    async sendVisitor(input) {
      const message = buildVisitorEmail(input);
      await sendResendEmail({ to: input.email, ...message });
    },
  };
}

export async function resolveFileUrl(
  pathname: string,
  validForMs = 7 * 24 * 60 * 60 * 1000,
): Promise<string> {
  const validUntil = Date.now() + validForMs;
  const token = await issueSignedToken({
    pathname,
    operations: ["get"],
    validUntil,
  });
  const { presignedUrl } = await presignUrl(token, {
    pathname,
    operation: "get",
    access: "private",
    validUntil,
  });
  return presignedUrl;
}
