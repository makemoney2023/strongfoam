import { describe, expect, it } from "vitest";
import { DEFAULT_WORKING_CALENDAR } from "@/lib/ops/project-schedule-planning";
import {
  applyApprovedScheduleMoves,
  proposeScheduleDiff,
  scheduleDiffMatchesApproval,
} from "@/lib/ops/schedule-diff";

const calendar = DEFAULT_WORKING_CALENDAR;

describe("schedule diff", () => {
  it("slips a blocked task one working day when the successor still fits", () => {
    const proposal = proposeScheduleDiff({
      note: { id: "note-1", kind: "blocker", taskId: "prep" },
      calendar,
      edges: [
        { predecessorTaskId: "prep", successorTaskId: "install", lagDays: 0 },
      ],
      tasks: [
        {
          id: "prep",
          jobId: "job-1",
          title: "Prepare deck",
          plannedStartAt: new Date("2026-09-21T12:00:00.000Z"),
          plannedEndAt: new Date("2026-09-22T12:00:00.000Z"),
          dueAt: null,
          updatedAt: new Date("2026-09-18T12:00:00.000Z"),
        },
        {
          id: "install",
          jobId: "job-1",
          title: "Install foam",
          plannedStartAt: new Date("2026-09-24T12:00:00.000Z"),
          plannedEndAt: new Date("2026-09-25T12:00:00.000Z"),
          dueAt: null,
          updatedAt: new Date("2026-09-18T12:00:00.000Z"),
        },
      ],
    });
    expect(proposal?.moves.map((move) => move.taskId)).toEqual(["prep"]);
    expect(proposal?.moves[0]?.plannedStartAt.slice(0, 10)).toBe("2026-09-22");
    expect(proposal?.moves[0]?.plannedEndAt.slice(0, 10)).toBe("2026-09-23");
  });

  it("moves the successor first when the slip would otherwise break finish-to-start", () => {
    const proposal = proposeScheduleDiff({
      note: { id: "note-1", kind: "quantity", taskId: "prep" },
      calendar,
      edges: [
        { predecessorTaskId: "prep", successorTaskId: "install", lagDays: 1 },
      ],
      tasks: [
        {
          id: "prep",
          jobId: "job-1",
          title: "Prepare deck",
          plannedStartAt: new Date("2026-09-21T12:00:00.000Z"),
          plannedEndAt: new Date("2026-09-22T12:00:00.000Z"),
          dueAt: null,
          updatedAt: new Date("2026-09-18T12:00:00.000Z"),
        },
        {
          id: "install",
          jobId: "job-1",
          title: "Install foam",
          plannedStartAt: new Date("2026-09-23T12:00:00.000Z"),
          plannedEndAt: new Date("2026-09-24T12:00:00.000Z"),
          dueAt: null,
          updatedAt: new Date("2026-09-18T12:00:00.000Z"),
        },
      ],
    });
    expect(proposal?.moves.map((move) => move.title)).toEqual([
      "Install foam",
      "Prepare deck",
    ]);
    expect(proposal?.moves[0]?.plannedStartAt.slice(0, 10)).toBe("2026-09-24");
  });

  it("accepts only the same moves in the same order", () => {
    const proposal = proposeScheduleDiff({
      note: { id: "note-1", kind: "quantity", taskId: "prep" },
      calendar,
      edges: [
        { predecessorTaskId: "prep", successorTaskId: "install", lagDays: 1 },
      ],
      tasks: [
        {
          id: "prep",
          jobId: "job-1",
          title: "Prepare deck",
          plannedStartAt: new Date("2026-09-21T12:00:00.000Z"),
          plannedEndAt: new Date("2026-09-22T12:00:00.000Z"),
          dueAt: null,
          updatedAt: new Date("2026-09-18T12:00:00.000Z"),
        },
        {
          id: "install",
          jobId: "job-1",
          title: "Install foam",
          plannedStartAt: new Date("2026-09-23T12:00:00.000Z"),
          plannedEndAt: new Date("2026-09-24T12:00:00.000Z"),
          dueAt: null,
          updatedAt: new Date("2026-09-18T12:00:00.000Z"),
        },
      ],
    });
    expect(proposal).not.toBeNull();
    if (!proposal) return;
    expect(scheduleDiffMatchesApproval(proposal, proposal)).toBe(true);
    const shifted = {
      ...proposal,
      moves: proposal.moves.map((move, index) =>
        index === 0
          ? { ...move, plannedStartAt: "2026-09-30T12:00:00.000Z" }
          : move,
      ),
    };
    expect(scheduleDiffMatchesApproval(proposal, shifted)).toBe(false);
  });

  it("restores earlier moves when a later move fails", async () => {
    const proposal = proposeScheduleDiff({
      note: { id: "note-1", kind: "quantity", taskId: "prep" },
      calendar,
      edges: [
        { predecessorTaskId: "prep", successorTaskId: "install", lagDays: 1 },
      ],
      tasks: [
        {
          id: "prep",
          jobId: "job-1",
          title: "Prepare deck",
          plannedStartAt: new Date("2026-09-21T12:00:00.000Z"),
          plannedEndAt: new Date("2026-09-22T12:00:00.000Z"),
          dueAt: null,
          updatedAt: new Date("2026-09-18T12:00:00.000Z"),
        },
        {
          id: "install",
          jobId: "job-1",
          title: "Install foam",
          plannedStartAt: new Date("2026-09-23T12:00:00.000Z"),
          plannedEndAt: new Date("2026-09-24T12:00:00.000Z"),
          dueAt: null,
          updatedAt: new Date("2026-09-18T12:00:00.000Z"),
        },
      ],
    });
    expect(proposal).not.toBeNull();
    if (!proposal) return;
    const calls: string[] = [];
    const result = await applyApprovedScheduleMoves(proposal.moves, async (move, dates) => {
      calls.push(`${move.taskId}:${dates.plannedStartAt.slice(0, 10)}`);
      if (calls.length === 2) {
        return { ok: false, error: "This schedule changed. Refresh and try again." };
      }
      return { ok: true, updatedAt: "2026-09-21T23:00:00.000Z" };
    });
    expect(result).toEqual({
      ok: false,
      error: "This schedule changed. Refresh and try again.",
    });
    expect(calls).toEqual([
      `install:2026-09-24`,
      `prep:2026-09-22`,
      `install:2026-09-23`,
    ]);
  });

  it("does not propose a note that is not a blocker or quantity", () => {
    expect(
      proposeScheduleDiff({
        note: { id: "note-1", kind: "note", taskId: "prep" },
        calendar,
        edges: [],
        tasks: [],
      }),
    ).toBeNull();
  });
});