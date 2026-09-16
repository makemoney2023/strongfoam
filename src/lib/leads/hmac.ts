import { createHmac, timingSafeEqual } from "node:crypto";

export function signLeadId(leadId: string, secret: string): string {
  return createHmac("sha256", secret).update(leadId).digest("hex");
}

export function verifyLeadId(
  leadId: string,
  token: string,
  secret: string,
): boolean {
  const expected = signLeadId(leadId, secret);
  const a = Buffer.from(expected);
  const b = Buffer.from(token);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}
