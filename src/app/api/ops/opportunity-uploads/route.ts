import { del, head } from "@vercel/blob";
import { handleUpload, type HandleUploadBody } from "@vercel/blob/client";
import { getOpsSession } from "@/lib/ops/auth";
import { resolveCommercialAccess, type CommercialActor } from "@/lib/ops/commercial-authorization";
import {
  isBidDocumentKind,
  isOwnedOpportunityPath,
  parseBidDocumentInput,
  sanitizeBidFilename,
  ALLOWED_UPLOAD_TYPES,
  MAX_UPLOAD_BYTES,
} from "@/lib/ops/commercial-documents";
import { isUuid } from "@/lib/ops/job-workspace";
import {
  getAuthorizedOpportunity,
  recordQuarantinedBidDocument,
} from "@/lib/ops/store";

export type OpportunityUploadPayload = {
  organizationId: string;
  opportunityId: string;
  documentId: string | null;
  kind: "plan" | "specification" | "addendum" | "schedule" | "photo" | "other";
  revisionLabel: string | null;
  filename: string;
  actor: string;
};

function parsePayload(
  value: string | null,
  actor: string,
  organizationId: string,
): OpportunityUploadPayload | null {
  try {
    const payload = JSON.parse(value ?? "{}") as Partial<OpportunityUploadPayload>;
    const filename = sanitizeBidFilename(payload.filename ?? "");
    const documentId = payload.documentId?.trim() || null;
    const revisionLabel = payload.revisionLabel?.trim() || null;
    if (
      typeof payload.opportunityId !== "string" ||
      !isUuid(payload.opportunityId) ||
      !filename ||
      typeof payload.kind !== "string" ||
      !isBidDocumentKind(payload.kind) ||
      (documentId !== null && !isUuid(documentId)) ||
      (revisionLabel !== null && revisionLabel.length > 80)
    ) {
      return null;
    }
    return {
      organizationId,
      opportunityId: payload.opportunityId,
      documentId,
      kind: payload.kind,
      revisionLabel,
      filename,
      actor,
    };
  } catch {
    return null;
  }
}

export type OpportunityUploadPostDeps = {
  handleUpload: (options: Parameters<typeof handleUpload>[0]) => ReturnType<
    typeof handleUpload
  >;
  getSession: () => Promise<(CommercialActor & { email: string }) | null>;
  getOpportunity: typeof getAuthorizedOpportunity;
  getBlobMetadata: typeof head;
  deleteBlob: typeof del;
  recordDocument: typeof recordQuarantinedBidDocument;
  blobToken?: string;
};

const defaultDeps: OpportunityUploadPostDeps = {
  handleUpload,
  getSession: getOpsSession,
  getOpportunity: getAuthorizedOpportunity,
  getBlobMetadata: head,
  deleteBlob: del,
  recordDocument: recordQuarantinedBidDocument,
  blobToken: process.env.BLOB_READ_WRITE_TOKEN,
};

export async function handleOpportunityUploadPost(
  request: Request,
  deps: OpportunityUploadPostDeps = defaultDeps,
): Promise<Response> {
  if (!deps.blobToken) {
    return Response.json(
      { error: "Bid package storage is not configured." },
      { status: 503 },
    );
  }
  const session = await deps.getSession();
  if (!session) {
    return Response.json({ error: "Unauthorized." }, { status: 401 });
  }
  const access = resolveCommercialAccess(session, "estimate.edit");
  if (!access.ok) {
    return Response.json({ error: "Forbidden." }, { status: 403 });
  }

  const body = (await request.json()) as HandleUploadBody;
  try {
    const response = await deps.handleUpload({
      body,
      request,
      token: deps.blobToken,
      onBeforeGenerateToken: async (pathname, clientPayload) => {
        const payload = parsePayload(
          clientPayload ?? null,
          session.email,
          access.organizationId,
        );
        if (
          !payload ||
          !isOwnedOpportunityPath(
            payload.organizationId,
            payload.opportunityId,
            pathname,
          )
        ) {
          throw new Error("invalid_opportunity_upload");
        }
        if (!(await deps.getOpportunity(payload.organizationId, payload.opportunityId))) {
          throw new Error("opportunity_not_found");
        }
        return {
          addRandomSuffix: true,
          allowedContentTypes: [...ALLOWED_UPLOAD_TYPES],
          maximumSizeInBytes: MAX_UPLOAD_BYTES,
          tokenPayload: JSON.stringify(payload),
        };
      },
      onUploadCompleted: async ({ blob, tokenPayload }) => {
        const live = await deps.getSession();
        const liveAccess = live
          ? resolveCommercialAccess(live, "estimate.edit")
          : { ok: false as const };
        let claimedActor = "";
        try {
          claimedActor = String(
            (JSON.parse(tokenPayload ?? "{}") as { actor?: string }).actor ?? "",
          );
        } catch {
          claimedActor = "";
        }
        const payload = parsePayload(
          tokenPayload ?? null,
          live?.email ?? "",
          liveAccess.ok ? liveAccess.organizationId : "",
        );
        if (
          !live ||
          !liveAccess.ok ||
          !payload ||
          claimedActor !== live.email ||
          !isOwnedOpportunityPath(
            payload.organizationId,
            payload.opportunityId,
            blob.pathname,
          )
        ) {
          throw new Error("invalid_opportunity_upload");
        }
        if (!(await deps.getOpportunity(payload.organizationId, payload.opportunityId))) {
          throw new Error("opportunity_not_found");
        }
        const metadata = await deps.getBlobMetadata(blob.pathname, {
          token: deps.blobToken,
        });
        const parsed = parseBidDocumentInput({
          filename: payload.filename,
          contentType: metadata.contentType,
          sizeBytes: metadata.size,
          kind: payload.kind,
          revisionLabel: payload.revisionLabel,
        });
        if (!parsed.ok) {
          await deps.deleteBlob(blob.pathname, { token: deps.blobToken });
          throw new Error(parsed.error);
        }
        try {
          const recorded = await deps.recordDocument({
            organizationId: payload.organizationId,
            opportunityId: payload.opportunityId,
            documentId: payload.documentId,
            actor: payload.actor,
            input: parsed.value,
            pathname: blob.pathname,
          });
          if (!recorded) throw new Error("bid_document_not_saved");
        } catch (error) {
          try {
            await deps.deleteBlob(blob.pathname, { token: deps.blobToken });
          } catch (cleanupError) {
            console.error("Could not clean up an orphaned bid document.", cleanupError);
          }
          throw error;
        }
      },
    });
    return Response.json(response);
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : String(error) },
      { status: 400 },
    );
  }
}

export async function POST(request: Request): Promise<Response> {
  return handleOpportunityUploadPost(request);
}
