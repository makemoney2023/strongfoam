import { describe, expect, it } from "vitest";
import { TakeoffRejected, measureTakeoff, type TakeoffInput } from "@/lib/ops/takeoff";

const page = { widthPoints: 2592, heightPoints: 1728 };
const quarterInch = { method: "title_block" as const, paperInches: 0.25, realFeet: 1, confirmed: true as const };

function input(overrides: Partial<TakeoffInput> = {}): TakeoffInput {
  return {
    page,
    scale: quarterInch,
    region: {
      kind: "polygon",
      points: [
        { x: 0, y: 0 },
        { x: 1, y: 0 },
        { x: 1, y: 1 },
        { x: 0, y: 1 },
      ],
    },
    ...overrides,
  };
}

describe("plan takeoff", () => {
  it("measures a full-page rectangle at 1/4 inch equals 1 foot", () => {
    expect(measureTakeoff(input())).toEqual({ quantity: 13824, unit: "sq_ft" });
  });

  it("matches that scale with a two-point calibration", () => {
    const measured = measureTakeoff(
      input({
        scale: {
          method: "calibration",
          confirmed: true,
          pointA: { x: 0, y: 0 },
          pointB: { x: 1, y: 0 },
          realFeet: 144,
        },
      }),
    );
    expect(measured).toEqual({ quantity: 13824, unit: "sq_ft" });
  });

  it("subtracts an opening", () => {
    const measured = measureTakeoff(
      input({
        region: {
          kind: "polygon",
          points: [
            { x: 0, y: 0 },
            { x: 1, y: 0 },
            { x: 1, y: 1 },
            { x: 0, y: 1 },
          ],
          openings: [
            [
              { x: 0, y: 0 },
              { x: 0.5, y: 0 },
              { x: 0.5, y: 0.5 },
              { x: 0, y: 0.5 },
            ],
          ],
        },
      }),
    );
    expect(measured).toEqual({ quantity: 10368, unit: "sq_ft" });
  });

  it("measures a polyline in linear feet and a wall from a person-entered height", () => {
    const line = input({
      region: {
        kind: "polyline",
        points: [
          { x: 0, y: 0 },
          { x: 1, y: 0 },
        ],
      },
    });
    expect(measureTakeoff(line)).toEqual({ quantity: 144, unit: "lin_ft" });
    expect(measureTakeoff({ ...line, heightFeet: 10 })).toEqual({ quantity: 1440, unit: "sq_ft" });
  });

  it("counts confirmed points", () => {
    expect(
      measureTakeoff(
        input({
          region: {
            kind: "count",
            points: [
              { x: 0.2, y: 0.2 },
              { x: 0.4, y: 0.2 },
              { x: 0.6, y: 0.2 },
            ],
          },
        }),
      ),
    ).toEqual({ quantity: 3, unit: "count" });
  });

  it("rejects an unconfirmed scale, NTS, a missing page size, and an open polygon", () => {
    expect(() => measureTakeoff(input({ scale: { ...quarterInch, confirmed: false } }))).toThrow(
      TakeoffRejected,
    );
    expect(() =>
      measureTakeoff(input({ scale: { method: "nts", confirmed: false } })),
    ).toThrow(TakeoffRejected);
    expect(() => measureTakeoff(input({ page: { widthPoints: 0, heightPoints: 1728 } }))).toThrow(
      TakeoffRejected,
    );
    expect(() =>
      measureTakeoff(
        input({
          region: {
            kind: "polygon",
            points: [
              { x: 0, y: 0 },
              { x: 1, y: 0 },
            ],
          },
        }),
      ),
    ).toThrow(TakeoffRejected);
  });

  it("rejects a model-supplied quantity, bag count, price, or total", () => {
    for (const field of ["quantity", "bags", "price", "total"] as const) {
      expect(() => measureTakeoff(input({ modelFields: { [field]: 12 } }))).toThrow(TakeoffRejected);
    }
  });
});
