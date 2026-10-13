import { putObject } from "@/lib/cloudflare/objects";
import type { CloudflareBindings } from "@/lib/cloudflare/platform";
import {
  parseRawEmail,
  prepareInboundProposal,
  type InboundProposal,
  type InboundRepository,
} from "@/lib/leads/inbound-mail";
import { drizzleInboundRepository } from "@/lib/leads/inbound-store";

export type RoutingMessage = {
  from: string;
  to: string;
  headers: { get(name: string): string | null };
  raw: ReadableStream<Uint8Array> | ArrayBuffer | Uint8Array | string;
  reply?: (...args: unknown[]) => Promise<unknown> | unknown;
  forward?: (...args: unknown[]) => Promise<unknown> | unknown;
  setReject?: (reason: string) => void;
};

async function readRaw(
  raw: RoutingMessage["raw"],
): Promise<string> {
  if (typeof raw === "string") return raw;
  if (raw instanceof Uint8Array) return new TextDecoder().decode(raw);
  if (raw instanceof ArrayBuffer) return new TextDecoder().decode(new Uint8Array(raw));
  return new Response(raw).text();
}

export async function handleRoutingEmail(
  message: RoutingMessage,
  deps?: {
    repo?: InboundRepository;
    putObject?: (key: string, bytes: Uint8Array, contentType: string) => Promise<void>;
    enqueue?: (proposal: InboundProposal) => Promise<boolean>;
    send?: (message: unknown) => Promise<void>;
    now?: Date;
  },
): Promise<InboundProposal | null> {
  const raw = await readRaw(message.raw);
  const receivedAt = (deps?.now ?? new Date()).toISOString();
  const parsed = parseRawEmail(raw, receivedAt);
  if (!parsed.fromEmail) {
    const from = message.from?.trim();
    if (from) parsed.fromEmail = from.toLowerCase();
  }
  if (!parsed.to) parsed.to = message.to?.trim().toLowerCase() ?? "";
  const headerSubject = message.headers.get("subject");
  if (!parsed.subject && headerSubject) parsed.subject = headerSubject;
  const headerId = message.headers.get("message-id");
  if (!parsed.messageId && headerId) parsed.messageId = headerId.replace(/^<|>$/g, "");
  const repo = deps?.repo ?? drizzleInboundRepository();
  const prepared = await prepareInboundProposal(parsed, {
    repo,
    putObject: deps?.putObject,
  });
  if (prepared.outcome === "duplicate") return prepared.proposal;
  const queued = deps?.enqueue ? await deps.enqueue(prepared.proposal) : false;
  if (!queued) await repo.insertProposal(prepared.proposal);
  return prepared.proposal;
}

export async function persistQueuedInbound(
  data: Record<string, unknown>,
  repo: InboundRepository = drizzleInboundRepository(),
): Promise<void> {
  const proposal = data.proposal;
  if (!proposal || typeof proposal !== "object") return;
  const record = proposal as InboundProposal;
  if (!record.dedupeKey || !record.organizationId) return;
  const existing = await repo.findProposal(record.organizationId, record.dedupeKey);
  if (existing) return;
  await repo.insertProposal(record);
}

export function bucketPut(env: CloudflareBindings) {
  if (!env.FILES) return undefined;
  return (key: string, bytes: Uint8Array, contentType: string) =>
    putObject(env.FILES!, key, bytes, contentType);
}
