import {
  parseClamAvResponse,
  type MalwareScanner,
  type ScanResult,
} from "@/lib/ops/document-scanner";

type WorkersSocket = {
  readable: ReadableStream<Uint8Array>;
  writable: WritableStream<Uint8Array>;
  close: () => void;
};

export type ClamSocket = {
  write(chunk: Uint8Array): Promise<void>;
  read(): Promise<Uint8Array | null>;
  close(): void;
};

function concat(parts: Uint8Array[]): Uint8Array {
  const length = parts.reduce((sum, part) => sum + part.length, 0);
  const bytes = new Uint8Array(length);
  let offset = 0;
  for (const part of parts) {
    bytes.set(part, offset);
    offset += part.length;
  }
  return bytes;
}

export async function scanInstream(
  socket: ClamSocket,
  input: AsyncIterable<Uint8Array>,
): Promise<ScanResult> {
  const encoder = new TextEncoder();
  try {
    await socket.write(encoder.encode("zINSTREAM\0"));
    for await (const chunk of input) {
      if (chunk.length === 0) continue;
      const header = new Uint8Array(4);
      new DataView(header.buffer).setUint32(0, chunk.length);
      await socket.write(header);
      await socket.write(chunk);
    }
    await socket.write(new Uint8Array(4));
    const parts: Uint8Array[] = [];
    for (;;) {
      const chunk = await socket.read();
      if (!chunk || chunk.length === 0) break;
      parts.push(chunk);
      const text = new TextDecoder().decode(concat(parts));
      if (text.includes("\n") || text.includes("OK") || text.includes("FOUND")) break;
    }
    return parseClamAvResponse(new TextDecoder().decode(concat(parts)));
  } finally {
    socket.close();
  }
}

async function openSocket(host: string, port: number): Promise<ClamSocket> {
  try {
    const load = new Function(
      "specifier",
      "return import(specifier)",
    ) as (specifier: string) => Promise<{
      connect(address: { hostname: string; port: number }): WorkersSocket;
    }>;
    const sockets = await load("cloudflare:sockets");
    const socket = sockets.connect({ hostname: host, port });
    const writer = socket.writable.getWriter();
    const reader = socket.readable.getReader();
    return {
      async write(chunk) {
        await writer.write(chunk);
      },
      async read() {
        const next = await reader.read();
        return next.done ? null : next.value;
      },
      close() {
        socket.close();
      },
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`scanner_unsupported: ${message}`);
  }
}

export function createClamAvScanner(options: {
  host: string;
  port: number;
  connect?: () => Promise<ClamSocket>;
}): MalwareScanner {
  return {
    async scan(input) {
      try {
        const socket = options.connect ? await options.connect() : await openSocket(options.host, options.port);
        return await scanInstream(socket, input);
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        if (message.startsWith("scanner_unsupported")) {
          return { status: "failed", message };
        }
        return { status: "failed", message: message || "The malware scanner failed." };
      }
    },
  };
}
