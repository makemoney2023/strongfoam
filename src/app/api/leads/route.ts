import { getLeadStore, getMailer, getRateLimiter, requireEnv } from "@/lib/leads/adapters";
import { createLead, type CreateLeadResult } from "@/lib/leads/create-lead";

export type LeadPostDeps = {
  createLead: (args: {
    body: unknown;
    ip: string;
  }) => Promise<CreateLeadResult>;
};

async function readJsonBody(request: Request): Promise<unknown> {
  try {
    return await request.json();
  } catch {
    return null;
  }
}

export async function handleLeadPost(
  request: Request,
  deps: LeadPostDeps,
): Promise<Response> {
  const body = await readJsonBody(request);
  const ip = request.headers.get("x-forwarded-for") ?? "127.0.0.1";

  const result = await deps.createLead({ body, ip });

  if (!result.ok) {
    const status = result.error === "rate_limited" ? 429 : 400;
    return Response.json({ error: result.error }, { status });
  }

  return Response.json({ thanksPath: result.thanksPath }, { status: 200 });
}

export async function POST(request: Request): Promise<Response> {
  return handleLeadPost(request, {
    createLead: (args) =>
      createLead({
        ...args,
        limiter: getRateLimiter(),
        store: getLeadStore(),
        mailer: getMailer(),
        thanksSecret: requireEnv("LEAD_THANKS_SECRET"),
      }),
  });
}
