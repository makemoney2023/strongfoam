import { createHmac, timingSafeEqual } from "node:crypto";
import type { StoredLead } from "@/lib/leads/create-lead";

const LEAD_LOOKBACK_MS = 30 * 24 * 60 * 60 * 1000;

export type CalendlyLeadStore = {
  findLatestByEmailSince(
    email: string,
    sinceMs: number,
  ): Promise<StoredLead | null>;
  updateBooking(
    id: string,
    status: "booked" | "canceled",
    inviteeUri: string,
  ): Promise<void>;
  insertUnmatched(payload: unknown): Promise<void>;
};

export function verifyCalendlySignature(args: {
  payload: string;
  header: string;
  signingKey: string;
}): boolean {
  const fields = new Map(
    args.header.split(",").map((field) => {
      const separator = field.indexOf("=");
      return [field.slice(0, separator), field.slice(separator + 1)];
    }),
  );
  const timestamp = fields.get("t");
  const signature = fields.get("v1");
  if (!timestamp || !signature || !/^[0-9a-f]{64}$/i.test(signature)) {
    return false;
  }

  const expected = createHmac("sha256", args.signingKey)
    .update(`${timestamp}.${args.payload}`)
    .digest();
  const received = Buffer.from(signature, "hex");

  return timingSafeEqual(expected, received);
}

export async function applyCalendlyEvent(args: {
  event: string;
  email: string;
  inviteeUri: string;
  store: CalendlyLeadStore;
  now: number;
}): Promise<void> {
  const status =
    args.event === "invitee.created"
      ? "booked"
      : args.event === "invitee.canceled"
        ? "canceled"
        : null;
  if (!status) return;

  const lead = await args.store.findLatestByEmailSince(
    args.email,
    args.now - LEAD_LOOKBACK_MS,
  );
  if (!lead) {
    await args.store.insertUnmatched({
      event: args.event,
      email: args.email,
      inviteeUri: args.inviteeUri,
    });
    return;
  }

  await args.store.updateBooking(lead.id, status, args.inviteeUri);
}
