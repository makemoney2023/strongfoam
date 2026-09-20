import { deflateSync } from "node:zlib";

const WIDTH = 640;
const HEIGHT = 420;

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

function fillRect(
  pixels: Uint8Array,
  x: number,
  y: number,
  width: number,
  height: number,
  color: [number, number, number],
) {
  const maxX = Math.min(WIDTH, x + width);
  const maxY = Math.min(HEIGHT, y + height);
  for (let row = Math.max(0, y); row < maxY; row += 1) {
    for (let col = Math.max(0, x); col < maxX; col += 1) {
      const index = (row * WIDTH + col) * 3;
      pixels[index] = color[0];
      pixels[index + 1] = color[1];
      pixels[index + 2] = color[2];
    }
  }
}

export function createDemoFloorPlanPng(): Uint8Array {
  const pixels = new Uint8Array(WIDTH * HEIGHT * 3);
  fillRect(pixels, 0, 0, WIDTH, HEIGHT, [228, 228, 231]);
  fillRect(pixels, 24, 24, 592, 372, [39, 39, 42]);
  fillRect(pixels, 36, 36, 568, 348, [250, 250, 249]);
  fillRect(pixels, 48, 48, 250, 200, [241, 245, 249]);
  fillRect(pixels, 330, 48, 260, 200, [236, 253, 245]);
  fillRect(pixels, 48, 268, 542, 100, [254, 243, 199]);
  fillRect(pixels, 292, 48, 24, 200, [228, 228, 231]);
  fillRect(pixels, 48, 248, 542, 20, [228, 228, 231]);

  const raw = Buffer.alloc((WIDTH * 3 + 1) * HEIGHT);
  for (let row = 0; row < HEIGHT; row += 1) {
    raw[row * (WIDTH * 3 + 1)] = 0;
    raw.set(
      pixels.subarray(row * WIDTH * 3, (row + 1) * WIDTH * 3),
      row * (WIDTH * 3 + 1) + 1,
    );
  }

  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(WIDTH, 0);
  ihdr.writeUInt32BE(HEIGHT, 4);
  ihdr[8] = 8;
  ihdr[9] = 2;

  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    pngChunk("IHDR", ihdr),
    pngChunk("IDAT", deflateSync(raw)),
    pngChunk("IEND", new Uint8Array()),
  ]);
}
