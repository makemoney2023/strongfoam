import net from "node:net";
import {
  parseClamAvResponse,
  type MalwareScanner,
  type ScanResult,
} from "@/lib/ops/document-scanner";

export function createClamAvScanner(options: {
  host: string;
  port: number;
}): MalwareScanner {
  return {
    scan(input) {
      return new Promise((resolve, reject) => {
        const socket = net.connect({ host: options.host, port: options.port });
        const response: Buffer[] = [];
        let settled = false;
        const finish = (result: ScanResult | Error) => {
          if (settled) return;
          settled = true;
          socket.destroy();
          if (result instanceof Error) reject(result);
          else resolve(result);
        };
        socket.setTimeout(30_000, () => {
          finish(new Error("The malware scanner timed out."));
        });
        socket.on("error", (error) => finish(error));
        socket.on("data", (chunk) => response.push(chunk));
        socket.on("connect", () => {
          socket.write("zINSTREAM\0");
          void (async () => {
            try {
              for await (const chunk of input) {
                if (chunk.length === 0) continue;
                const header = Buffer.alloc(4);
                header.writeUInt32BE(chunk.length, 0);
                socket.write(header);
                socket.write(chunk);
              }
              socket.write(Buffer.alloc(4));
            } catch (error) {
              finish(error instanceof Error ? error : new Error(String(error)));
            }
          })();
        });
        socket.on("end", () => {
          finish(parseClamAvResponse(Buffer.concat(response).toString("utf8")));
        });
      });
    },
  };
}
