export const EICAR_TEST_STRING =
  "X5O!P%@AP[4\\PZX54(P^)7CC)7}$EICAR-STANDARD-ANTIVIRUS-TEST-FILE!$H+H*";

export type ScanResult =
  | { status: "clean"; engine: string }
  | { status: "infected"; engine: string; signature: string }
  | { status: "failed"; message: string };

export interface MalwareScanner {
  scan(input: AsyncIterable<Uint8Array>): Promise<ScanResult>;
}

export type ScanDecision = {
  status: "clean" | "rejected" | "quarantined";
  sha256: string | null;
  enqueueExtraction: boolean;
  retry: boolean;
  reason: string | null;
};

async function readChunks(input: AsyncIterable<Uint8Array>): Promise<Uint8Array> {
  const parts: Uint8Array[] = [];
  for await (const chunk of input) parts.push(chunk);
  const length = parts.reduce((sum, part) => sum + part.length, 0);
  const bytes = new Uint8Array(length);
  let offset = 0;
  for (const part of parts) {
    bytes.set(part, offset);
    offset += part.length;
  }
  return bytes;
}

export function createDemoMalwareScanner(): MalwareScanner {
  return {
    async scan(input) {
      const bytes = await readChunks(input);
      if (bytes.length === 0) {
        return { status: "failed", message: "The scanner received an empty file." };
      }
      const text = new TextDecoder().decode(bytes);
      if (text.includes(EICAR_TEST_STRING)) {
        return {
          status: "infected",
          engine: "demo",
          signature: "EICAR-Test-Signature",
        };
      }
      return { status: "clean", engine: "demo" };
    },
  };
}

export function parseClamAvResponse(raw: string): ScanResult {
  const line = raw.trim();
  if (line.endsWith("OK")) return { status: "clean", engine: "clamav" };
  const found = line.match(/:\s(.+)\sFOUND$/);
  if (found?.[1]) {
    return { status: "infected", engine: "clamav", signature: found[1] };
  }
  return {
    status: "failed",
    message: line || "Scanner returned an empty response.",
  };
}

export function resolveMalwareScanner(env: {
  OPS_DEMO?: string;
  DATABASE_URL?: string;
  CLAMAV_HOST?: string;
  CLAMAV_PORT?: string;
}): MalwareScanner | null {
  if (env.OPS_DEMO === "1" || !env.DATABASE_URL) return createDemoMalwareScanner();
  // Production scan uses the worker's ClamAV client. Without that service the
  // version stays quarantined and extraction is not enqueued.
  void env.CLAMAV_HOST;
  void env.CLAMAV_PORT;
  return null;
}

export function applyScanOutcome(
  result: ScanResult | null,
  sha256: string | null = null,
  options?: { duplicate?: boolean },
): ScanDecision {
  if (!result) {
    return {
      status: "quarantined",
      sha256: null,
      enqueueExtraction: false,
      retry: false,
      reason: "scanner_unavailable",
    };
  }
  if (result.status === "failed") {
    return {
      status: "quarantined",
      sha256: null,
      enqueueExtraction: false,
      retry: true,
      reason: result.message,
    };
  }
  if (result.status === "infected") {
    return {
      status: "rejected",
      sha256: null,
      enqueueExtraction: false,
      retry: false,
      reason: "malware",
    };
  }
  if (options?.duplicate) {
    return {
      status: "rejected",
      sha256: null,
      enqueueExtraction: false,
      retry: false,
      reason: "duplicate",
    };
  }
  return {
    status: "clean",
    sha256,
    enqueueExtraction: true,
    retry: false,
    reason: null,
  };
}
