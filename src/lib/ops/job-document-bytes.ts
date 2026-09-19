type JobDocumentByteStore = Map<string, Uint8Array>;

function getByteStore(): JobDocumentByteStore {
  const globalForBytes = globalThis as typeof globalThis & {
    __strongfoamJobDocumentBytes?: JobDocumentByteStore;
  };
  if (!globalForBytes.__strongfoamJobDocumentBytes) {
    globalForBytes.__strongfoamJobDocumentBytes = new Map();
  }
  return globalForBytes.__strongfoamJobDocumentBytes;
}

export function setJobDocumentBytes(id: string, bytes: Uint8Array): void {
  getByteStore().set(id, bytes);
}

export function getStoredJobDocumentBytes(id: string): Uint8Array | null {
  return getByteStore().get(id) ?? null;
}

export function clearJobDocumentBytes(id: string): void {
  getByteStore().delete(id);
}
