import "server-only";

import { listJobEventsSince } from "@/lib/ops/store";

const encoder = new TextEncoder();
const STREAM_WINDOW_MS = 25_000;
const POLL_INTERVAL_MS = 1_000;

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
  getJobIds: () => Promise<string[]>,
): Response {
  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const startedAt = Date.now();
      let cursor = new Date(startedAt - 1_000);
      let previousJobIds: string[] | null = null;

      const send = (event: string, data: unknown) => {
        controller.enqueue(
          encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`),
        );
      };

      send("ready", { at: new Date().toISOString() });
      try {
        while (
          !request.signal.aborted &&
          Date.now() - startedAt < STREAM_WINDOW_MS
        ) {
          const jobIds = [...new Set(await getJobIds())].sort();
          if (
            previousJobIds &&
            jobIds.join(",") !== previousJobIds.join(",")
          ) {
            send("assignments", { jobIds });
          }
          previousJobIds = jobIds;

          const events = await listJobEventsSince({
            jobIds,
            after: cursor,
            limit: 100,
          });
          for (const event of events) {
            send("job", {
              id: event.id,
              jobId: event.jobId,
              type: event.kind,
              at: event.createdAt.toISOString(),
            });
            if (event.createdAt > cursor) cursor = event.createdAt;
          }
          controller.enqueue(encoder.encode(": keep-alive\n\n"));
          await wait(POLL_INTERVAL_MS, request.signal);
        }
      } catch (error) {
        console.error("Realtime job stream failed.", error);
        send("error", { message: "Realtime connection interrupted." });
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
