import { describe, expect, it } from "vitest";
import {
  assembleDailyReportBody,
  buildJobEvidencePack,
  filterCitations,
  workingDayLabel,
  type EvidenceEvent,
  type EvidenceFieldNote,
  type EvidenceTask,
  type EvidenceVoiceNote,
} from "@/lib/ops/ai-evidence";

const NOW = new Date("2026-09-19T16:00:00.000Z");

function task(id: string, status = "open"): EvidenceTask {
  return {
    id,
    title: id,
    status,
    dueAt: null,
    plannedEndAt: null,
    createdAt: NOW,
  };
}

function note(index: number): EvidenceFieldNote {
  return {
    id: `note-${index}`,
    kind: "note",
    body: `Note ${index}`,
    quantity: null,
    unit: null,
    taskId: null,
    workAreaId: null,
    createdAt: new Date(NOW.getTime() - index * 60_000),
  };
}

function voice(index: number): EvidenceVoiceNote {
  return {
    id: `voice-${index}`,
    status: "completed",
    transcript: `Voice ${index}`,
    source: "job",
    taskId: null,
    filename: `voice-${index}.webm`,
    createdAt: new Date(NOW.getTime() - index * 60_000),
  };
}

function event(index: number): EvidenceEvent {
  return {
    id: `event-${index}`,
    kind: "note",
    summary: `Event ${index}`,
    createdAt: new Date(NOW.getTime() - index * 60_000),
  };
}

describe("job evidence pack", () => {
  it("keeps every open task and caps notes, transcripts, and events", () => {
    const pack = buildJobEvidencePack({
      job: { id: "job-1", name: "Podium", status: "in_progress" },
      tasks: [task("open-1"), task("done-1", "done"), task("open-2"), task("open-3")],
      fieldNotes: Array.from({ length: 45 }, (_, index) => note(index)),
      voiceNotes: Array.from({ length: 25 }, (_, index) => voice(index)),
      planMarks: [
        {
          id: "mark-live",
          title: "South",
          status: "completed",
          pageNumber: 1,
          documentId: "doc-1",
          taskId: null,
          voidedAt: null,
          createdAt: NOW,
        },
        {
          id: "mark-void",
          title: "Void",
          status: "planned",
          pageNumber: 1,
          documentId: "doc-1",
          taskId: null,
          voidedAt: NOW,
          createdAt: NOW,
        },
      ],
      events: Array.from({ length: 25 }, (_, index) => event(index)),
      now: NOW,
    });

    expect(pack.tasks.map((item) => item.id)).toEqual(["open-1", "open-2", "open-3"]);
    expect(pack.fieldNotes).toHaveLength(40);
    expect(pack.fieldNotes[0]?.id).toBe("note-0");
    expect(pack.voiceNotes).toHaveLength(20);
    expect(pack.events).toHaveLength(20);
    expect(pack.planMarks.map((mark) => mark.id)).toEqual(["mark-live"]);
    expect(pack.timeZone).toBe("America/Toronto");
    expect(pack.workingDay).toBe("2026-09-19");
  });

  it("drops citations that are not in the pack", () => {
    const pack = buildJobEvidencePack({
      job: { id: "job-1", name: "Podium", status: "in_progress" },
      tasks: [task("open-1")],
      fieldNotes: [],
      voiceNotes: [],
      planMarks: [],
      events: [],
      now: NOW,
    });
    expect(
      filterCitations(
        [
          { kind: "task", id: "open-1" },
          { kind: "task", id: "missing" },
          { kind: "field_note", id: "open-1" },
        ],
        pack,
      ),
    ).toEqual([{ kind: "task", id: "open-1" }]);
  });

  it("labels the working day in America/Toronto", () => {
    expect(workingDayLabel(new Date("2026-09-19T03:30:00.000Z"))).toBe("2026-09-18");
    expect(workingDayLabel(new Date("2026-09-19T12:00:00.000Z"))).toBe("2026-09-19");
  });

  it("assembles a daily report within the field-note limit", () => {
    const body = assembleDailyReportBody({
      completed: "Closed-cell at the podium.",
      held: "",
      material: "More bags.",
      next: "x".repeat(5_000),
    });
    expect(body.startsWith("Completed\nClosed-cell at the podium.")).toBe(true);
    expect(body).toContain("Held\nNone.");
    expect(body.length).toBeLessThanOrEqual(4_000);
  });
});
