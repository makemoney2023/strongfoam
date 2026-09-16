import { getCalendlyStore, requireEnv } from "@/lib/leads/adapters";
import {
  applyCalendlyEvent,
  verifyCalendlySignature,
  type CalendlyLeadStore,
} from "@/lib/leads/calendly";

export type CalendlyPostDeps = {
  signingKey: string;
  store: CalendlyLeadStore;
  now?: number;
};

type CalendlyWebhookBody = {
  event?: string;
  payload?: {
    email?: string;
    uri?: string;
  };
};

export async function handleCalendlyPost(
  request: Request,
  deps: CalendlyPostDeps,
): Promise<Response> {
  const raw = await request.text();
  const header = request.headers.get("calendly-webhook-signature") ?? "";

  const valid = verifyCalendlySignature({
    payload: raw,
    header,
    signingKey: deps.signingKey,
  });
  if (!valid) {
    return Response.json({ error: "invalid_signature" }, { status: 401 });
  }

  let body: CalendlyWebhookBody = {};
  try {
    body = JSON.parse(raw) as CalendlyWebhookBody;
  } catch {
    body = {};
  }

  await applyCalendlyEvent({
    event: body.event ?? "",
    email: body.payload?.email ?? "",
    inviteeUri: body.payload?.uri ?? "",
    store: deps.store,
    now: deps.now ?? Date.now(),
  });

  return new Response(null, { status: 200 });
}

export async function POST(request: Request): Promise<Response> {
  return handleCalendlyPost(request, {
    signingKey: requireEnv("CALENDLY_WEBHOOK_SIGNING_KEY"),
    store: getCalendlyStore(),
  });
}
