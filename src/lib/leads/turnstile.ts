export const TURNSTILE_SCRIPT_URL = "https://challenges.cloudflare.com/turnstile/v0/api.js";
export const TURNSTILE_SITEVERIFY_URL = "https://challenges.cloudflare.com/turnstile/v0/siteverify";

export function turnstileSiteKey(env: Record<string, string | undefined> = process.env): string {
  return env.NEXT_PUBLIC_TURNSTILE_SITE_KEY?.trim() ?? "";
}

export function turnstileSecret(env: Record<string, string | undefined> = process.env): string {
  return env.TURNSTILE_SECRET_KEY?.trim() ?? "";
}

export async function verifyTurnstileToken(args: {
  token: string;
  secret: string;
  ip?: string;
  fetchImpl?: typeof fetch;
}): Promise<boolean> {
  if (!args.secret.trim()) return true;
  if (!args.token.trim()) return false;
  const body = new URLSearchParams({ secret: args.secret, response: args.token });
  if (args.ip) body.set("remoteip", args.ip);
  try {
    const response = await (args.fetchImpl ?? fetch)(TURNSTILE_SITEVERIFY_URL, {
      method: "POST",
      body,
    });
    if (!response.ok) return false;
    const payload = (await response.json()) as { success?: boolean };
    return payload.success === true;
  } catch {
    return false;
  }
}
