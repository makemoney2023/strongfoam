const bytesById = new Map<string, Uint8Array>();

export function setJobDocumentBytes(id: string, bytes: Uint8Array): void {
  bytesById.set(id, bytes);
}

export function getStoredJobDocumentBytes(id: string): Uint8Array | null {
  return bytesById.get(id) ?? null;
}
