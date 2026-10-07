export class TakeoffRejected extends Error {
  constructor(reason: string) {
    super(reason);
    this.name = "TakeoffRejected";
  }
}

export type TakeoffPoint = { x: number; y: number };

export type TakeoffScale =
  | {
      method: "title_block";
      paperInches: number;
      realFeet: number;
      confirmed: boolean;
    }
  | {
      method: "calibration";
      confirmed: boolean;
      pointA: TakeoffPoint;
      pointB: TakeoffPoint;
      realFeet: number;
    }
  | { method: "nts"; confirmed: false };

export type TakeoffInput = {
  page: { widthPoints: number; heightPoints: number };
  scale: TakeoffScale;
  region: {
    kind: "polygon" | "polyline" | "count";
    points: TakeoffPoint[];
    openings?: TakeoffPoint[][];
  };
  heightFeet?: number;
  modelFields?: Record<string, unknown>;
};

export type TakeoffMeasure = {
  quantity: number;
  unit: "sq_ft" | "lin_ft" | "count";
};

const POINTS_PER_INCH = 72;
const MODEL_FIELDS = ["quantity", "bags", "price", "total"] as const;

function reject(reason: string): never {
  throw new TakeoffRejected(reason);
}

function feetPerPoint(scale: TakeoffScale, page: TakeoffInput["page"]): number {
  if (!scale.confirmed || scale.method === "nts") reject("scale-unconfirmed");
  if (scale.method === "title_block") {
    if (scale.paperInches <= 0 || scale.realFeet <= 0) reject("scale-unconfirmed");
    return scale.realFeet / scale.paperInches / POINTS_PER_INCH;
  }
  const paperPoints = Math.hypot(
    (scale.pointB.x - scale.pointA.x) * page.widthPoints,
    (scale.pointB.y - scale.pointA.y) * page.heightPoints,
  );
  if (paperPoints <= 0 || scale.realFeet <= 0) reject("scale-unconfirmed");
  return scale.realFeet / paperPoints;
}

function toFeet(point: TakeoffPoint, page: TakeoffInput["page"], feetPerPaperPoint: number) {
  if (point.x < 0 || point.x > 1 || point.y < 0 || point.y > 1) reject("point-out-of-page");
  return {
    x: point.x * page.widthPoints * feetPerPaperPoint,
    y: point.y * page.heightPoints * feetPerPaperPoint,
  };
}

function ringArea(points: TakeoffPoint[], page: TakeoffInput["page"], feetPerPaperPoint: number): number {
  if (points.length < 3) reject("open-polygon");
  const feet = points.map((point) => toFeet(point, page, feetPerPaperPoint));
  let sum = 0;
  for (let index = 0; index < feet.length; index += 1) {
    const next = feet[(index + 1) % feet.length];
    sum += feet[index].x * next.y - next.x * feet[index].y;
  }
  return Math.abs(sum) / 2;
}

function lengthFeet(points: TakeoffPoint[], page: TakeoffInput["page"], feetPerPaperPoint: number): number {
  if (points.length < 2) reject("open-line");
  const feet = points.map((point) => toFeet(point, page, feetPerPaperPoint));
  let length = 0;
  for (let index = 1; index < feet.length; index += 1) {
    length += Math.hypot(feet[index].x - feet[index - 1].x, feet[index].y - feet[index - 1].y);
  }
  return length;
}

export function measureTakeoff(input: TakeoffInput): TakeoffMeasure {
  if (input.modelFields) {
    for (const field of MODEL_FIELDS) {
      if (field in input.modelFields) reject("model-quantity");
    }
  }
  if (input.region.kind === "count") {
    if (input.region.points.length < 1) reject("empty-count");
    for (const point of input.region.points) {
      if (point.x < 0 || point.x > 1 || point.y < 0 || point.y > 1) reject("point-out-of-page");
    }
    return { quantity: input.region.points.length, unit: "count" };
  }
  if (!(input.page.widthPoints > 0) || !(input.page.heightPoints > 0)) reject("missing-page-size");
  const perPoint = feetPerPoint(input.scale, input.page);
  if (input.region.kind === "polyline") {
    const length = lengthFeet(input.region.points, input.page, perPoint);
    if (input.heightFeet != null) {
      if (!(input.heightFeet > 0)) reject("missing-height");
      return { quantity: length * input.heightFeet, unit: "sq_ft" };
    }
    return { quantity: length, unit: "lin_ft" };
  }
  const gross = ringArea(input.region.points, input.page, perPoint);
  const openings = (input.region.openings ?? []).reduce(
    (sum, opening) => sum + ringArea(opening, input.page, perPoint),
    0,
  );
  const net = gross - openings;
  if (!(net > 0)) reject("empty-area");
  return { quantity: net, unit: "sq_ft" };
}
