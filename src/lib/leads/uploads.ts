export const ALLOWED_UPLOAD_TYPES = [
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/webp",
] as const;

export const MAX_UPLOAD_BYTES = 25 * 1024 * 1024;
export const MAX_UPLOAD_FILES = 5;

export function isAllowedUploadContentType(type: string): boolean {
  return (ALLOWED_UPLOAD_TYPES as readonly string[]).includes(type);
}

export function isOwnedUploadPath(draftId: string, pathname: string): boolean {
  if (pathname.includes("..") || pathname.startsWith("/")) return false;
  return pathname.startsWith(`leads/${draftId}/`);
}
