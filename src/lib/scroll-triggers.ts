export function getServicesPinDistance(
  trackWidth: number,
  viewportWidth: number,
) {
  return Math.max(0, trackWidth - viewportWidth);
}

export function getServicesScrollTrigger(distance: number) {
  return {
    start: "top top" as const,
    end: `+=${distance}`,
    pin: true,
    pinSpacing: true,
    scrub: 0.6,
    anticipatePin: 1,
    invalidateOnRefresh: true,
  };
}
