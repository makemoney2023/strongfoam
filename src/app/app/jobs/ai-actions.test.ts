import { beforeEach, describe, expect, it, vi } from "vitest";

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

import {
  discardJobAiDraft,
  draftJobDailyReport,
  saveJobDailyReport,
  summarizeJob,
} from "@/app/app/jobs/ai-actions";
import { DEMO_JOB_ID } from "@/lib/ops/demo-data";
import { listDemoJobEvents, listDemoJobFieldNotes } from "@/lib/ops/demo-store";

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

describe("job AI actions", () => {
  beforeEach(() => {
    getOpsSession.mockReset();
    process.env.OPS_DEMO = "1";
    delete process.env.AI_GATEWAY_API_KEY;
    delete process.env.AI_GATEWAY_MODEL;
  });

  it("rejects a caller without an office session", async () => {
    getOpsSession.mockResolvedValue(null);
    await expect(summarizeJob(DEMO_JOB_ID)).rejects.toThrow("REDIRECT:/app/login");
  });

  it("rejects a field session", async () => {
    getOpsSession.mockResolvedValue({
      ...officeSession,
      role: "field_worker",
    });
    await expect(draftJobDailyReport(DEMO_JOB_ID)).rejects.toThrow(
      "REDIRECT:/app/login",
    );
  });

  it("returns disabled and writes no field note when the gateway is unset", async () => {
    delete process.env.OPS_DEMO;
    getOpsSession.mockResolvedValue(officeSession);
    const before = listDemoJobFieldNotes(DEMO_JOB_ID).length;
    const eventsBefore = listDemoJobEvents(DEMO_JOB_ID).length;
    const result = await summarizeJob(DEMO_JOB_ID);
    expect(result).toEqual({ status: "disabled" });
    expect(listDemoJobFieldNotes(DEMO_JOB_ID)).toHaveLength(before);
    expect(listDemoJobEvents(DEMO_JOB_ID)).toHaveLength(eventsBefore);
  });

  it("saves one daily report and leaves a discard unsaved", async () => {
    getOpsSession.mockResolvedValue(officeSession);
    const before = listDemoJobFieldNotes(DEMO_JOB_ID).filter(
      (note) => note.kind === "daily_report",
    ).length;
    await discardJobAiDraft();
    expect(
      listDemoJobFieldNotes(DEMO_JOB_ID).filter((note) => note.kind === "daily_report"),
    ).toHaveLength(before);
    const saved = await saveJobDailyReport(DEMO_JOB_ID, "Completed\nClosed-cell at the podium.");
    expect(saved).toEqual({ ok: true });
    const reports = listDemoJobFieldNotes(DEMO_JOB_ID).filter(
      (note) => note.kind === "daily_report",
    );
    expect(reports).toHaveLength(before + 1);
    expect(reports[0]?.body).toContain("Closed-cell at the podium.");
    expect(reports[0]?.createdBy).toBe(officeSession.email);
  });
});
