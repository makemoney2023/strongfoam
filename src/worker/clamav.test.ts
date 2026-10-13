import { describe, expect, it } from "vitest";
import { createClamAvScanner, scanInstream, type ClamSocket } from "@/worker/clamav";

function fakeSocket(response: string): ClamSocket & { writes: Uint8Array[] } {
  const writes: Uint8Array[] = [];
  let read = false;
  return {
    writes,
    async write(chunk) {
      writes.push(chunk);
    },
    async read() {
      if (read) return null;
      read = true;
      return new TextEncoder().encode(response);
    },
    close() {},
  };
}

describe("ClamAV INSTREAM", () => {
  it("writes a length-prefixed stream and parses a clean response", async () => {
    const socket = fakeSocket("stream: OK");
    const result = await scanInstream(socket, (async function* () {
      yield new TextEncoder().encode("hello");
    })());
    expect(result).toEqual({ status: "clean", engine: "clamav" });
    const header = socket.writes[1];
    expect(header).toBeDefined();
    expect(new DataView(header!.buffer).getUint32(0)).toBe(5);
    expect(new TextDecoder().decode(socket.writes[0])).toBe("zINSTREAM\0");
  });

  it("fails closed when the socket cannot be opened", async () => {
    const scanner = createClamAvScanner({
      host: "clam.example",
      port: 3310,
      connect: async () => {
        throw new Error("scanner_unsupported: TCP is not available");
      },
    });
    await expect(scanner.scan((async function* () {})())).resolves.toEqual({
      status: "failed",
      message: "scanner_unsupported: TCP is not available",
    });
  });
});
