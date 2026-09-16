export const PAGE_MAX_REM = 88;

const PAGE_INLINE_PX = {
  base: 16,
  sm: 24,
  lg: 40,
} as const;

export function getPageInline(viewportWidth: number) {
  if (viewportWidth >= 1024) {
    return PAGE_INLINE_PX.lg;
  }

  if (viewportWidth >= 640) {
    return PAGE_INLINE_PX.sm;
  }

  return PAGE_INLINE_PX.base;
}

export function getPageRailInset(viewportWidth: number, remSize = 16) {
  const maxPx = PAGE_MAX_REM * remSize;
  const side = Math.max(0, (viewportWidth - maxPx) / 2);
  return side + getPageInline(viewportWidth);
}
