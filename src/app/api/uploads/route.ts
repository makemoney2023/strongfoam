import { handleUpload, type HandleUploadBody } from "@vercel/blob/client";
import { isDirectUpload, readDirectUpload } from "@/lib/cloudflare/direct-upload";
import { writePrivateObject } from "@/lib/cloudflare/private-objects";
import {
  ALLOWED_UPLOAD_TYPES,
  isOwnedUploadPath,
  MAX_UPLOAD_BYTES,
} from "@/lib/leads/uploads";

const DRAFT_ID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export type UploadPostDeps = {
  handleUpload: (options: Parameters<typeof handleUpload>[0]) => ReturnType<
    typeof handleUpload
  >;
};

const defaultDeps: UploadPostDeps = { handleUpload };

export async function handleUploadPost(
  request: Request,
  deps: UploadPostDeps = defaultDeps,
): Promise<Response> {
  const body = (await request.json()) as HandleUploadBody;

  try {
    const jsonResponse = await deps.handleUpload({
      body,
      request,
      onBeforeGenerateToken: async (pathname, clientPayload) => {
        let draftId: unknown;
        try {
          draftId = (JSON.parse(clientPayload ?? "{}") as { draftId?: unknown })
            .draftId;
        } catch {
          throw new Error("invalid_client_payload");
        }
        if (typeof draftId !== "string" || !DRAFT_ID_PATTERN.test(draftId)) {
          throw new Error("invalid_draft_id");
        }
        if (!isOwnedUploadPath(draftId, pathname)) {
          throw new Error("invalid_pathname");
        }

        return {
          addRandomSuffix: true,
          allowedContentTypes: [...ALLOWED_UPLOAD_TYPES],
          maximumSizeInBytes: MAX_UPLOAD_BYTES,
          tokenPayload: JSON.stringify({ draftId }),
        };
      },
      onUploadCompleted: async () => {},
    });

    return Response.json(jsonResponse);
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : String(error) },
      { status: 400 },
    );
  }
}

export async function handleDirectLeadUpload(request: Request): Promise<Response> {
  const upload = await readDirectUpload(request);
  if (!isDirectUpload(upload)) {
    return Response.json({ error: upload.error }, { status: 400 });
  }
  if (upload.bytes.byteLength > MAX_UPLOAD_BYTES) {
    return Response.json({ error: "file_too_large" }, { status: 400 });
  }
  if (upload.contentType && !ALLOWED_UPLOAD_TYPES.includes(upload.contentType as never)) {
    return Response.json({ error: "invalid_content_type" }, { status: 400 });
  }
  let draftId: unknown;
  try {
    draftId = (JSON.parse(upload.clientPayload || "{}") as { draftId?: unknown }).draftId;
  } catch {
    return Response.json({ error: "invalid_client_payload" }, { status: 400 });
  }
  if (typeof draftId !== "string" || !DRAFT_ID_PATTERN.test(draftId)) {
    return Response.json({ error: "invalid_draft_id" }, { status: 400 });
  }
  if (!isOwnedUploadPath(draftId, upload.pathname)) {
    return Response.json({ error: "invalid_pathname" }, { status: 400 });
  }
  const stored = await writePrivateObject(upload.pathname, upload.bytes, upload.contentType);
  if (!stored) {
    return Response.json({ error: "File storage is not configured." }, { status: 503 });
  }
  return Response.json({ pathname: upload.pathname });
}

export async function POST(request: Request): Promise<Response> {
  if ((request.headers.get("content-type") ?? "").includes("multipart/form-data")) {
    return handleDirectLeadUpload(request);
  }
  return handleUploadPost(request);
}
