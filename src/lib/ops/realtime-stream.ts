import "server-only";

import { listJobEventsSince } from "@/lib/ops/store";

const encoder = new TextEncoder();
const STREAM_WINDOW_MS = 25_000;
const POLL_INTERVAL_MS = 1_000;
const EVENT_ID_SEPARATOR = "|";

type StreamResumeState = {
  cursor: Date;
  jobIds: string[] | null;
};

function encodeEventId(cursor: Date, jobIds: string[]): string {
  return `${cursor.toISOString()}${EVENT_ID_SEPARATOR}${jobIds.join(",")}`;
}

function parseEventId(value: string | null): StreamResumeState | null {
  if (!value) return null;
  const separatorIndex = value.indexOf(EVENT_ID_SEPARATOR);
  const cursorValue =
    separatorIndex === -1 ? value : value.slice(0, separatorIndex);
  const cursor = new Date(cursorValue);
  if (Number.isNaN(cursor.getTime())) return null;
  const encodedJobIds =
    separatorIndex === -1 ? null : value.slice(separatorIndex + 1);
  return {
    cursor,
    jobIds:
      encodedJobIds === null
        ? null
        : encodedJobIds.split(",").filter(Boolean).sort(),
  };
}

function wait(ms: number, signal: AbortSignal): Promise<void> {
  return new Promise((resolve) => {
    const timer = setTimeout(resolve, ms);
    signal.addEventListener(
      "abort",
      () => {
        clearTimeout(timer);
        resolve();
      },
      { once: true },
    );
  });
}

export function createJobEventStream(
  request: Request,
  getJobIds: () => Promise<string[] | null>,
): Response {
  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const startedAt = Date.now();
      const resumeState = parseEventId(request.headers.get("last-event-id"));
      const isReconnect = resumeState !== null;
      let cursor = resumeState?.cursor ?? new Date(startedAt - 1_000);
      let previousJobIds = resumeState?.jobIds ?? null;
      let readySent = false;

      const send = (event: string, data: unknown, id: string) => {
        controller.enqueue(
          encoder.encode(
            `id: ${id}\nevent: ${event}\ndata: ${JSON.stringify(data)}\n\n`,
          ),
        );
      };

      controller.enqueue(encoder.encode("retry: 500\n\n"));
      try {
        while (
          !request.signal.aborted &&
          Date.now() - startedAt < STREAM_WINDOW_MS
        ) {
          const jobIdsOrNull = await getJobIds();
          if (jobIdsOrNull === null) {
            send(
              "unauthorized",
              { at: new Date().toISOString() },
              encodeEventId(cursor, previousJobIds ?? []),
            );
            break;
          }
          const jobIds = [...new Set(jobIdsOrNull)].sort();
          const eventId = () => encodeEventId(cursor, jobIds);
          if (!readySent) {
            send(
              "ready",
              { at: new Date().toISOString(), resumed: isReconnect },
              eventId(),
            );
            readySent = true;
          }
          if (
            previousJobIds &&
            jobIds.join(",") !== previousJobIds.join(",")
          ) {
            send("assignments", { jobIds }, eventId());
          }
          previousJobIds = jobIds;

          const events = await listJobEventsSince({
            jobIds,
            after: cursor,
            limit: 100,
          });
          for (const event of events) {
            send(
              "job",
              {
                id: event.id,
                jobId: event.jobId,
                type: event.kind,
                at: event.createdAt.toISOString(),
              },
              encodeEventId(event.createdAt, jobIds),
            );
            if (event.createdAt > cursor) cursor = event.createdAt;
          }
          send("heartbeat", { at: new Date().toISOString() }, eventId());
          await wait(POLL_INTERVAL_MS, request.signal);
        }
      } catch (error) {
        console.error("Realtime job stream failed.", error);
        send(
          "error",
          { message: "Realtime connection interrupted." },
          encodeEventId(cursor, previousJobIds ?? []),
        );
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
