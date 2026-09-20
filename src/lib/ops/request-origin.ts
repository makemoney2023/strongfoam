/**
 * Redirect origin for login/logout when the process is bound to 0.0.0.0.
 * Next.js then reports that bind address as request.url, which drops cookies
 * set on localhost or 127.0.0.1. Only rewrite that unspecified host.
 */
export function requestOrigin(request: Request): string {
  const url = new URL(request.url);
  if (!isUnspecifiedAddress(url.hostname)) {
    return url.origin;
  }

  const host = request.headers.get("host")?.trim() ?? "";
  if (!isSafeHost(host)) {
    return url.origin;
  }

  return `${url.protocol}//${host}`;
}

function isUnspecifiedAddress(hostname: string): boolean {
  return hostname === "0.0.0.0" || hostname === "[::]" || hostname === "::";
}

function isSafeHost(host: string): boolean {
  return (
    /^[a-zA-Z0-9.-]+(?::\d{1,5})?$/.test(host) ||
    /^\[::1\](?::\d{1,5})?$/.test(host)
  );
}
