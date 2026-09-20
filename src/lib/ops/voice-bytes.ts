type VoiceByteStore = Map<string, Uint8Array>;

function getByteStore(): VoiceByteStore {
  const globalForBytes = globalThis as typeof globalThis & {
    __strongfoamVoiceBytes?: VoiceByteStore;
  };
  if (!globalForBytes.__strongfoamVoiceBytes) {
    globalForBytes.__strongfoamVoiceBytes = new Map();
  }
  return globalForBytes.__strongfoamVoiceBytes;
}

export function setVoiceNoteBytes(id: string, bytes: Uint8Array): void {
  getByteStore().set(id, bytes);
}

export function getStoredVoiceNoteBytes(id: string): Uint8Array | null {
  return getByteStore().get(id) ?? null;
}

export function clearVoiceNoteBytes(id: string): void {
  getByteStore().delete(id);
}

export function createSilentWav(durationMs = 240): Uint8Array {
  const sampleRate = 8_000;
  const samples = Math.max(1, Math.round((sampleRate * durationMs) / 1000));
  const dataSize = samples * 2;
  const bytes = new Uint8Array(44 + dataSize);
  const view = new DataView(bytes.buffer);
  const write = (offset: number, text: string) => {
    for (let index = 0; index < text.length; index += 1) {
      bytes[offset + index] = text.charCodeAt(index);
    }
  };
  write(0, "RIFF");
  view.setUint32(4, 36 + dataSize, true);
  write(8, "WAVE");
  write(12, "fmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 1, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  write(36, "data");
  view.setUint32(40, dataSize, true);
  return bytes;
}
