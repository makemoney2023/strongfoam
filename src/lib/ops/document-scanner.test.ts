import { describe, expect, it } from "vitest";
import {
  applyScanOutcome,
  createDemoMalwareScanner,
  EICAR_TEST_STRING,
  parseClamAvResponse,
  resolveMalwareScanner,
} from "@/lib/ops/document-scanner";

const encoder = new TextEncoder();

async function scan(bytes: Uint8Array) {
  return createDemoMalwareScanner().scan(
    (async function* () {
      yield bytes;
    })(),
  );
}

describe("document malware scan", () => {
  it("marks a normal file clean in demo mode", async () => {
    await expect(scan(encoder.encode("%PDF-1.4 clean plan"))).resolves.toEqual({
      status: "clean",
      engine: "demo",
    });
  });

  it("rejects the EICAR test string as malware-positive", async () => {
    const result = await scan(encoder.encode(EICAR_TEST_STRING));
    expect(result).toEqual({
      status: "infected",
      engine: "demo",
      signature: "EICAR-Test-Signature",
    });
  });

  it("parses ClamAV clean and infected responses", () => {
    expect(parseClamAvResponse("stream: OK")).toEqual({
      status: "clean",
      engine: "clamav",
    });
    expect(parseClamAvResponse("stream: Eicar-Test-Signature FOUND")).toEqual({
      status: "infected",
      engine: "clamav",
      signature: "Eicar-Test-Signature",
    });
  });

  it("keeps a file quarantined when production has no scanner", () => {
    expect(
      resolveMalwareScanner({ DATABASE_URL: "postgres://example" }),
    ).toBeNull();
    expect(
      applyScanOutcome(null),
    ).toEqual({
      status: "quarantined",
      sha256: null,
      enqueueExtraction: false,
      retry: false,
      reason: "scanner_unavailable",
    });
  });

  it("does not enqueue extraction for an infected file", () => {
    expect(
      applyScanOutcome(
        { status: "infected", engine: "demo", signature: "Eicar-Test-Signature" },
        "abc",
      ),
    ).toMatchObject({
      status: "rejected",
      enqueueExtraction: false,
      reason: "malware",
    });
  });
});
