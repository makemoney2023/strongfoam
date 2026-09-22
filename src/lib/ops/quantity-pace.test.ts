import { describe, expect, it } from "vitest";
import {
  formatStatedQuantity,
  listQuantityPaceWarnings,
  parseStatedQuantity,
  quantityPaceLabel,
} from "@/lib/ops/quantity-pace";

const job = { id: "job-1", name: "Podium" };

describe("stated quantity", () => {
  it("accepts bags or square feet and allows a blank pair", () => {
    expect(parseStatedQuantity({ statedQuantity: "40", statedUnit: "bags" })).toEqual({
      ok: true,
      statedQuantity: 40,
      statedUnit: "bags",
    });
    expect(parseStatedQuantity({ statedQuantity: "", statedUnit: "" })).toEqual({
      ok: true,
      statedQuantity: null,
      statedUnit: null,
    });
    expect(formatStatedQuantity(40, "bags")).toBe("40 bags remaining");
    expect(formatStatedQuantity(1200, "sq_ft")).toBe("1,200 sq ft remaining");
  });

  it("rejects a quantity without bags or square feet", () => {
    expect(parseStatedQuantity({ statedQuantity: "12", statedUnit: "hours" })).toMatchObject({
      ok: false,
      field: "statedUnit",
    });
    expect(parseStatedQuantity({ statedQuantity: "", statedUnit: "bags" })).toMatchObject({
      ok: false,
      field: "statedQuantity",
    });
    expect(parseStatedQuantity({ statedQuantity: "1.5", statedUnit: "sq_ft" })).toMatchObject({
      ok: false,
      field: "statedQuantity",
    });
  });
});

describe("quantity pace", () => {
  it("warns when installed bags or square feet exceed the open-task remainder", () => {
    const warnings = listQuantityPaceWarnings({
      jobs: [job],
      tasks: [
        {
          jobId: job.id,
          status: "open",
          statedQuantity: 30,
          statedUnit: "bags",
        },
        {
          jobId: job.id,
          status: "open",
          statedQuantity: 10,
          statedUnit: "bags",
        },
        {
          jobId: job.id,
          status: "done",
          statedQuantity: 100,
          statedUnit: "bags",
        },
        {
          jobId: job.id,
          status: "open",
          statedQuantity: 80,
          statedUnit: "sq_ft",
        },
      ],
      quantities: [
        { jobId: job.id, quantity: 48, unit: "bags" },
        { jobId: job.id, quantity: 90, unit: "sq_ft" },
        { jobId: job.id, quantity: 12, unit: "hours" },
      ],
    });

    expect(warnings).toEqual([
      {
        jobId: job.id,
        jobName: job.name,
        unit: "bags",
        installed: 48,
        statedRemaining: 40,
      },
      {
        jobId: job.id,
        jobName: job.name,
        unit: "sq_ft",
        installed: 90,
        statedRemaining: 80,
      },
    ]);
    expect(quantityPaceLabel(warnings[0])).toBe(
      "Quantity pace: 48 bags installed is ahead of 40 bags still stated on open tasks: Podium",
    );
    expect(quantityPaceLabel(warnings[0])).not.toMatch(/\$|dollar|margin/i);
  });

  it("stays quiet when installed quantity is within the stated remainder", () => {
    expect(
      listQuantityPaceWarnings({
        jobs: [job],
        tasks: [
          {
            jobId: job.id,
            status: "open",
            statedQuantity: 40,
            statedUnit: "bags",
          },
        ],
        quantities: [{ jobId: job.id, quantity: 40, unit: "bags" }],
      }),
    ).toEqual([]);
  });

  it("stays quiet when no open task states a quantity", () => {
    expect(
      listQuantityPaceWarnings({
        jobs: [job],
        tasks: [{ jobId: job.id, status: "open" }],
        quantities: [{ jobId: job.id, quantity: 48, unit: "bags" }],
      }),
    ).toEqual([]);
  });
});
