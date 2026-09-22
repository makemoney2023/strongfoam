type BidDocumentByteStore = Map<string, Uint8Array>;

function getByteStore(): BidDocumentByteStore {
  const globalForBytes = globalThis as typeof globalThis & {
    __strongfoamBidDocumentBytes?: BidDocumentByteStore;
  };
  if (!globalForBytes.__strongfoamBidDocumentBytes) {
    globalForBytes.__strongfoamBidDocumentBytes = new Map();
  }
  return globalForBytes.__strongfoamBidDocumentBytes;
}

export function setBidDocumentBytes(id: string, bytes: Uint8Array): void {
  getByteStore().set(id, bytes);
}

export function getStoredBidDocumentBytes(id: string): Uint8Array | null {
  return getByteStore().get(id) ?? null;
}
