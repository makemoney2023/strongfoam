import { issueSignedToken, presignUrl } from "@vercel/blob";
import {
  parseNotifyRecipients,
  sendThroughCloudflareEmail,
} from "@/lib/cloudflare/email";
import { D1RateLimiter } from "@/lib/cloudflare/rate-limit";
import { getPlatform, type CloudflareBindings } from "@/lib/cloudflare/platform";
import { getObject } from "@/lib/cloudflare/objects";
import { and, desc, eq, gte } from "drizzle-orm";
import { getDb } from "@/db";
import { STRONG_FOAM_ORGANIZATION_ID } from "@/lib/ops/identity";
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

export async function getRateLimiter(): Promise<RateLimiter> {
  const platform = await getPlatform();
  if (platform?.DB) return new D1RateLimiter(platform.DB, 5, 15 * 60);
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
  if (payload.intakeType === "general") {
    return {
      organizationId: STRONG_FOAM_ORGANIZATION_ID,
      status: lead.status,
      bookingStatus: lead.bookingStatus,
      notifyStatus: lead.notifyStatus,
      email: lead.email,
      phone: payload.phone,
      firstName: payload.firstName,
      lastName: payload.lastName,
      company: payload.company,
      projectType: "general_inquiry",
      city: "",
      province: "not_applicable",
      services: [],
      answers: { intakeType: "general", message: payload.message },
      recommendedServices: [],
      files: [],
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
  return {
    organizationId: STRONG_FOAM_ORGANIZATION_ID,
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

const DEFAULT_FROM = "Strong Foam <estimates@strongfoam.com>";

export function createCloudflareMailer(
  env: Record<string, string | undefined>,
  platform: CloudflareBindings | null,
): Mailer {
  async function deliver(to: string[], message: { subject: string; text: string }) {
    if (!platform?.EMAIL) {
      throw new Error("Cloudflare EMAIL binding is not available");
    }
    await sendThroughCloudflareEmail(platform.EMAIL, {
      to,
      from: platform.EMAIL_FROM ?? DEFAULT_FROM,
      subject: message.subject,
      text: message.text,
    });
  }

  return {
    async sendEstimating(input) {
      const to = parseNotifyRecipients(
        env.LEAD_NOTIFY_TO ?? "estimating@strongfoam.com",
      );
      await deliver(to, buildEstimatingEmail(input));
    },

    async sendVisitor(input) {
      await deliver(parseNotifyRecipients(input.email), buildVisitorEmail(input));
    },
  };
}

export function getMailer(): Mailer {
  return {
    async sendEstimating(input) {
      const platform = await getPlatform();
      await createCloudflareMailer(process.env, platform).sendEstimating(input);
    },

    async sendVisitor(input) {
      const platform = await getPlatform();
      await createCloudflareMailer(process.env, platform).sendVisitor(input);
    },
  };
}

export async function readStoredFile(
  pathname: string,
): Promise<{ body: Uint8Array; contentType: string } | null> {
  const platform = await getPlatform();
  if (!platform?.FILES) return null;
  const stored = await getObject(platform.FILES, pathname);
  if (!stored) return null;
  return { body: stored.body, contentType: stored.contentType };
}

export async function resolveFileUrl(
  pathname: string,
  validForMs = 7 * 24 * 60 * 60 * 1000,
): Promise<string> {
  const platform = await getPlatform();
  if (platform?.FILES) return `r2:${pathname}`;
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
