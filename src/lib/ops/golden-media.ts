import { deflateSync } from "node:zlib";
import { createSilentWav } from "@/lib/ops/voice-bytes";

const WIDTH = 160;
const HEIGHT = 90;

function crc32(bytes: Uint8Array): number {
  let crc = 0xffffffff;
  for (const byte of bytes) {
    crc ^= byte;
    for (let bit = 0; bit < 8; bit += 1) {
      const mask = -(crc & 1);
      crc = (crc >>> 1) ^ (0xedb88320 & mask);
    }
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function pngChunk(type: string, data: Uint8Array): Buffer {
  const typeBytes = Buffer.from(type, "ascii");
  const payload = Buffer.concat([typeBytes, Buffer.from(data)]);
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(payload));
  return Buffer.concat([length, payload, crc]);
}

function fill(pixels: Uint8Array, color: [number, number, number], x: number, y: number, w: number, h: number) {
  for (let row = y; row < y + h && row < HEIGHT; row += 1) {
    for (let col = x; col < x + w && col < WIDTH; col += 1) {
      const index = (row * WIDTH + col) * 3;
      pixels[index] = color[0];
      pixels[index + 1] = color[1];
      pixels[index + 2] = color[2];
    }
  }
}

/** Generated warehouse roof drawing. No third-party photo. */
export function createWarehousePhotoPng(): Uint8Array {
  const pixels = new Uint8Array(WIDTH * HEIGHT * 3);
  fill(pixels, [186, 214, 232], 0, 0, WIDTH, HEIGHT);
  fill(pixels, [90, 98, 104], 18, 28, 124, 40);
  fill(pixels, [214, 176, 74], 36, 40, 28, 16);
  const raw = Buffer.alloc((WIDTH * 3 + 1) * HEIGHT);
  for (let row = 0; row < HEIGHT; row += 1) {
    const start = row * (WIDTH * 3 + 1);
    raw[start] = 0;
    pixels.subarray(row * WIDTH * 3, (row + 1) * WIDTH * 3).forEach((byte, index) => {
      raw[start + 1 + index] = byte;
    });
  }
  const header = Buffer.alloc(13);
  header.writeUInt32BE(WIDTH, 0);
  header.writeUInt32BE(HEIGHT, 4);
  header[8] = 8;
  header[9] = 2;
  const png = Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    pngChunk("IHDR", header),
    pngChunk("IDAT", deflateSync(raw)),
    pngChunk("IEND", new Uint8Array()),
  ]);
  return new Uint8Array(png);
}

export function createWarehouseVoiceWav(): Uint8Array {
  return createSilentWav(900);
}
