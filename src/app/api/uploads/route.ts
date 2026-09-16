import { handleUpload, type HandleUploadBody } from "@vercel/blob/client";
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

export async function POST(request: Request): Promise<Response> {
  return handleUploadPost(request);
}
