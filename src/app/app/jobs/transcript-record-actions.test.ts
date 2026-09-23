import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { getOpsSession } = vi.hoisted(() => ({
  getOpsSession: vi.fn(),
}));

vi.mock("@/lib/ops/auth", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/ops/auth")>();
  return { ...actual, getOpsSession };
});

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  redirect: (path: string) => {
    throw new Error(`REDIRECT:${path}`);
  },
}));

import { confirmTranscriptRecord } from "@/app/app/jobs/ai-follow-actions";
import { DEMO_JOB_ID, DEMO_VOICE_NOTE_ID } from "@/lib/ops/demo-data";
import { getDemoJob, listDemoJobFieldNotes } from "@/lib/ops/demo-store";
import {
  listTranscriptRecords,
  proposeTranscriptRecord,
} from "@/lib/ops/transcript-record";

const officeSession = {
  userId: "20202020-2020-4020-8020-202020202020",
  organizationId: "00000000-0000-4000-8000-000000000001",
  email: "office.only@example.com",
  role: "office" as const,
  sessionVersion: 1,
  issuedAt: 1,
  expiresAt: 2,
  displayName: "Office Only",
  legacy: false,
};

type DemoSlice = {
  jobFieldNotes: Array<{ id: string }>;
  jobEvents: Array<{ id: string }>;
  jobsList: Array<{ id: string; status: string; blockerNote: string | null }>;
};

function demoSlice(): DemoSlice | undefined {
  return (
    globalThis as typeof globalThis & { __strongfoamDemoOps?: DemoSlice }
  ).__strongfoamDemoOps;
}

describe("transcript record actions", () => {
  let snapshot: DemoSlice | null = null;

  beforeEach(() => {
    getOpsSession.mockReset();
    process.env.OPS_DEMO = "1";
    getOpsSession.mockResolvedValue(officeSession);
    getDemoJob(DEMO_JOB_ID);
    const current = demoSlice();
    snapshot = current
      ? {
          jobFieldNotes: current.jobFieldNotes.map((row) => ({ ...row })),
          jobEvents: current.jobEvents.map((row) => ({ ...row })),
          jobsList: current.jobsList.map((row) => ({
            id: row.id,
            status: row.status,
            blockerNote: row.blockerNote,
          })),
        }
      : null;
  });

  afterEach(() => {
    const current = demoSlice();
    if (!current || !snapshot) return;
    current.jobFieldNotes.splice(
      0,
      current.jobFieldNotes.length,
      ...snapshot.jobFieldNotes,
    );
    current.jobEvents.splice(0, current.jobEvents.length, ...snapshot.jobEvents);
    for (const saved of snapshot.jobsList) {
      const job = current.jobsList.find((row) => row.id === saved.id);
      if (!job) continue;
      job.status = saved.status;
      job.blockerNote = saved.blockerNote;
    }
  });

  it("rejects a field session", async () => {
    getOpsSession.mockResolvedValue({ ...officeSession, role: "field_worker" });
    await expect(
      confirmTranscriptRecord(DEMO_JOB_ID, {
        voiceNoteId: DEMO_VOICE_NOTE_ID,
        filename: "podium-deck.wav",
        kind: "blocker",
        selectedText: "unused",
        effect: "unused",
      }),
    ).rejects.toThrow("REDIRECT:/app/login");
  });

  it("saves the proposed blocker and refuses a second save", async () => {
    const note = (
      globalThis as typeof globalThis & {
        __strongfoamDemoOps?: {
          jobVoiceNotes: Array<{ id: string; filename: string; transcript: string | null }>;
        };
      }
    ).__strongfoamDemoOps?.jobVoiceNotes.find((row) => row.id === DEMO_VOICE_NOTE_ID);
    const proposal = proposeTranscriptRecord({
      voiceNoteId: DEMO_VOICE_NOTE_ID,
      filename: note?.filename ?? "",
      transcript: note?.transcript ?? "",
      tasks: [{ title: "Install closed-cell at podium deck", status: "open" }],
    });
    expect(proposal?.kind).toBe("blocker");
    if (!proposal) return;
    const before = listDemoJobFieldNotes(DEMO_JOB_ID).length;
    const stale = await confirmTranscriptRecord(DEMO_JOB_ID, {
      ...proposal,
      selectedText: "A different sentence.",
    });
    expect(stale).toEqual({
      ok: false,
      error: "That transcript changed. Refresh and try again.",
    });
    expect(listDemoJobFieldNotes(DEMO_JOB_ID)).toHaveLength(before);
    const saved = await confirmTranscriptRecord(DEMO_JOB_ID, proposal);
    expect(saved).toEqual({ ok: true, effect: proposal.effect });
    const notes = listDemoJobFieldNotes(DEMO_JOB_ID);
    expect(notes).toHaveLength(before + 1);
    expect(notes.some((row) => row.kind === "blocker" && row.body === proposal.selectedText)).toBe(
      true,
    );
    expect(getDemoJob(DEMO_JOB_ID)?.status).toBe("blocked");
    expect(getDemoJob(DEMO_JOB_ID)?.blockerNote).toBe(proposal.selectedText);
    const again = await confirmTranscriptRecord(DEMO_JOB_ID, proposal);
    expect(again).toEqual({
      ok: false,
      error: "That transcript was already turned into a record.",
    });
    expect(listDemoJobFieldNotes(DEMO_JOB_ID)).toHaveLength(before + 1);
  });

  it("saves a later sentence without saving the earlier one", async () => {
    const note = (
      globalThis as typeof globalThis & {
        __strongfoamDemoOps?: {
          jobVoiceNotes: Array<{ id: string; filename: string; transcript: string | null }>;
        };
      }
    ).__strongfoamDemoOps?.jobVoiceNotes.find((row) => row.id === DEMO_VOICE_NOTE_ID);
    expect(note).toBeTruthy();
    if (!note) return;
    const original = note.transcript;
    note.transcript =
      "Hold the south wall. Request more closed-cell for the afternoon lift.";
    try {
      const material = listTranscriptRecords({
        voiceNoteId: DEMO_VOICE_NOTE_ID,
        filename: note.filename,
        transcript: note.transcript,
      }).find((record) => record.kind === "material_request");
      expect(material).toBeTruthy();
      if (!material) return;
      expect(await confirmTranscriptRecord(DEMO_JOB_ID, material)).toEqual({
        ok: true,
        effect: material.effect,
      });
      const notes = listDemoJobFieldNotes(DEMO_JOB_ID);
      expect(
        notes.some(
          (row) => row.kind === "material_request" && row.body === material.selectedText,
        ),
      ).toBe(true);
      expect(notes.some((row) => row.kind === "blocker" && row.body.includes("Hold the south wall"))).toBe(false);
      expect(getDemoJob(DEMO_JOB_ID)?.status).not.toBe("blocked");
    } finally {
      note.transcript = original;
    }
  });

  it("saves a later sentence after the first record", async () => {
    const note = (
      globalThis as typeof globalThis & {
        __strongfoamDemoOps?: {
          jobVoiceNotes: Array<{ id: string; filename: string; transcript: string | null }>;
        };
      }
    ).__strongfoamDemoOps?.jobVoiceNotes.find((row) => row.id === DEMO_VOICE_NOTE_ID);
    expect(note).toBeTruthy();
    if (!note) return;
    const original = note.transcript;
    note.transcript =
      "Hold the south wall. Request more closed-cell for the afternoon lift.";
    try {
      const blocker = proposeTranscriptRecord({
        voiceNoteId: DEMO_VOICE_NOTE_ID,
        filename: note.filename,
        transcript: note.transcript,
      });
      expect(blocker?.kind).toBe("blocker");
      if (!blocker) return;
      expect(await confirmTranscriptRecord(DEMO_JOB_ID, blocker)).toEqual({
        ok: true,
        effect: blocker.effect,
      });
      const material = proposeTranscriptRecord({
        voiceNoteId: DEMO_VOICE_NOTE_ID,
        filename: note.filename,
        transcript: note.transcript,
        savedTexts: [blocker.selectedText],
      });
      expect(material?.kind).toBe("material_request");
      if (!material) return;
      expect(await confirmTranscriptRecord(DEMO_JOB_ID, material)).toEqual({
        ok: true,
        effect: material.effect,
      });
      const notes = listDemoJobFieldNotes(DEMO_JOB_ID);
      expect(notes.some((row) => row.kind === "blocker" && row.body === blocker.selectedText)).toBe(
        true,
      );
      expect(
        notes.some((row) => row.kind === "material_request" && row.body === material.selectedText),
      ).toBe(true);
    } finally {
      note.transcript = original;
    }
  });
});
