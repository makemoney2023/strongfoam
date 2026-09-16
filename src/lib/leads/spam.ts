export const MIN_FILL_MS = 8000;

export function assertNotSpam(input: {
  companyWebsite: string;
  startedAt: number;
  now: number;
}): "ok" | "honeypot" | "too_fast" {
  if (input.companyWebsite.trim() !== "") return "honeypot";
  if (input.now - input.startedAt < MIN_FILL_MS) return "too_fast";
  return "ok";
}
