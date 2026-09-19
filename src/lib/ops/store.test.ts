import { describe, expect, it } from "vitest";
import { signLeadId } from "@/lib/leads/hmac";
import {
  getOrCreateDefaultScheduleCalendar,
  isDefaultScheduleCalendarConflict,
  parseEstimateRequestUpdate,
  staffFileHref,
} from "@/lib/ops/store";

describe("default schedule calendar conflicts", () => {
  it("recognizes only the partial unique-index violation", () => {
    const violation = {
      code: "23505",
      constraint: "schedule_calendars_single_default_idx",
    };

    expect(isDefaultScheduleCalendarConflict(violation)).toBe(true);
    expect(
      isDefaultScheduleCalendarConflict({
        cause: violation,
      }),
    ).toBe(true);
    expect(
      isDefaultScheduleCalendarConflict({
        code: "23505",
        constraint: "another_unique_constraint",
      }),
    ).toBe(false);
    expect(
      isDefaultScheduleCalendarConflict({
        code: "23503",
        constraint: "schedule_calendars_single_default_idx",
      }),
    ).toBe(false);
    expect(isDefaultScheduleCalendarConflict(new Error("insert failed"))).toBe(
      false,
    );
  });

  it("reselects the winning default after a concurrent insert", async () => {
    const winner = { id: "winner" };
    let selections = 0;
    const result = await getOrCreateDefaultScheduleCalendar(
      async () => (++selections === 1 ? undefined : winner),
      async () => {
        throw {
          cause: {
            code: "23505",
            constraint: "schedule_calendars_single_default_idx",
          },
        };
      },
    );

    expect(result).toBe(winner);
    expect(selections).toBe(2);
  });

  it("does not hide unrelated default-calendar insert failures", async () => {
    const failure = {
      code: "23505",
      constraint: "another_unique_constraint",
    };
    let selections = 0;

    await expect(
      getOrCreateDefaultScheduleCalendar(
        async () => {
          selections += 1;
          return undefined;
        },
        async () => {
          throw failure;
        },
      ),
    ).rejects.toBe(failure);
    expect(selections).toBe(1);
  });
});

describe("parseEstimateRequestUpdate", () => {
  it("accepts a complete reviewing update", () => {
    const parsed = parseEstimateRequestUpdate({
      workflowStatus: "reviewing",
      assignedTo: "Alex Rivera",
      nextAction: "Call the GC",
      nextActionDueAt: "2026-09-19T14:00",
      note: "Asked for latest drawings",
    });

    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;
    expect(parsed.value.workflowStatus).toBe("reviewing");
    expect(parsed.value.assignedTo).toBe("Alex Rivera");
    expect(parsed.value.nextAction).toBe("Call the GC");
    expect(parsed.value.lostReason).toBeNull();
  });

  it("rejects invalid status and missing lost reasons", () => {
    expect(parseEstimateRequestUpdate({ workflowStatus: "quoted" }).ok).toBe(
      false,
    );
    expect(
      parseEstimateRequestUpdate({
        workflowStatus: "lost",
        lostReason: "",
      }),
    ).toEqual({
      ok: false,
      error: "A lost reason is required when a request is marked lost.",
      field: "lostReason",
    });
  });
});

describe("staffFileHref", () => {
  it("returns a signed staff download path", () => {
    const secret = "file-secret";
    const leadId = "11111111-1111-4111-8111-111111111111";
    const href = staffFileHref(leadId, 0, secret);
    expect(href).toBe(
      `/api/files/${leadId}/0?token=${signLeadId(`${leadId}:0`, secret)}`,
    );
  });
});
