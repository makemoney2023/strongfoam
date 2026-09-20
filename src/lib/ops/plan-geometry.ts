import type {
  PlanAnnotationGeometry,
  PlanAnnotationKind,
  PlanPoint,
} from "@/lib/ops/plan-markup";

const POINT_HIT = 0.045;

export type DrawableMark = {
  id: string;
  x: number;
  y: number;
  kind: PlanAnnotationKind;
  geometry: PlanAnnotationGeometry;
};

export function clampUnit(value: number): number {
  return Math.min(1, Math.max(0, Math.round(value * 10_000) / 10_000));
}

export function hitTestMark(
  marks: DrawableMark[],
  point: PlanPoint,
): DrawableMark | null {
  let match: DrawableMark | null = null;
  let best = POINT_HIT;
  for (const mark of marks) {
    const distance = distanceToMark(mark, point);
    if (distance < best) {
      best = distance;
      match = mark;
    }
  }
  return match;
}

export function distanceToMark(mark: DrawableMark, point: PlanPoint): number {
  const geometry = mark.geometry;
  if (geometry.type === "circle" || geometry.type === "ellipse") {
    const nx = (point.x - mark.x) / Math.max(geometry.rx, 0.001);
    const ny = (point.y - mark.y) / Math.max(geometry.ry, 0.001);
    const radial = Math.hypot(nx, ny);
    return radial <= 1 ? 0 : (radial - 1) * Math.max(geometry.rx, geometry.ry);
  }
  if (geometry.type === "arrow") {
    return distanceToSegment(point, { x: mark.x, y: mark.y }, {
      x: geometry.x2,
      y: geometry.y2,
    });
  }
  if (geometry.type === "polygon") {
    if (pointInPolygon(point, geometry.points)) return 0;
    let best = Number.POSITIVE_INFINITY;
    for (let index = 0; index < geometry.points.length; index += 1) {
      const start = geometry.points[index];
      const end = geometry.points[(index + 1) % geometry.points.length];
      best = Math.min(best, distanceToSegment(point, start, end));
    }
    return best;
  }
  return Math.hypot(mark.x - point.x, mark.y - point.y);
}

export function polygonPath(points: PlanPoint[]): string {
  return points
    .map((point, index) => `${index === 0 ? "M" : "L"} ${point.x} ${point.y}`)
    .join(" ");
}

export function arrowHeadPoints(start: PlanPoint, end: PlanPoint): string {
  const angle = Math.atan2(end.y - start.y, end.x - start.x);
  const length = 0.028;
  const spread = Math.PI / 7;
  const left = {
    x: clampUnit(end.x - Math.cos(angle - spread) * length),
    y: clampUnit(end.y - Math.sin(angle - spread) * length),
  };
  const right = {
    x: clampUnit(end.x - Math.cos(angle + spread) * length),
    y: clampUnit(end.y - Math.sin(angle + spread) * length),
  };
  return `${left.x},${left.y} ${end.x},${end.y} ${right.x},${right.y}`;
}

export function visualCircleRadii(
  center: PlanPoint,
  edge: PlanPoint,
  aspect: number,
): { rx: number; ry: number } {
  const dx = edge.x - center.x;
  const dy = edge.y - center.y;
  const radius = Math.hypot(dx, dy * aspect);
  return {
    rx: clampUnit(Math.max(0.01, radius)),
    ry: clampUnit(Math.max(0.01, radius / Math.max(aspect, 0.001))),
  };
}

function distanceToSegment(
  point: PlanPoint,
  start: PlanPoint,
  end: PlanPoint,
): number {
  const dx = end.x - start.x;
  const dy = end.y - start.y;
  const length = dx * dx + dy * dy;
  if (length === 0) return Math.hypot(point.x - start.x, point.y - start.y);
  const t = Math.min(
    1,
    Math.max(0, ((point.x - start.x) * dx + (point.y - start.y) * dy) / length),
  );
  return Math.hypot(point.x - (start.x + t * dx), point.y - (start.y + t * dy));
}

function pointInPolygon(point: PlanPoint, points: PlanPoint[]): boolean {
  let inside = false;
  for (let i = 0, j = points.length - 1; i < points.length; j = i, i += 1) {
    const a = points[i];
    const b = points[j];
    const intersect =
      a.y > point.y !== b.y > point.y &&
      point.x < ((b.x - a.x) * (point.y - a.y)) / (b.y - a.y || Number.EPSILON) + a.x;
    if (intersect) inside = !inside;
  }
  return inside;
}
