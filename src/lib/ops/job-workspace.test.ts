import { describe, expect, it } from "vitest";
import {
  formatFileSize,
  hasAllowedJobDocumentSignature,
  isOwnedJobUploadPath,
  jobDocumentHref,
  listJobUploadFiles,
  MAX_JOB_UPLOAD_FILES,
  parseJobDocumentInput,
  parseJobDocumentMeta,
  parseJobTaskInput,
  parseWorkAreaInput,
  sortJobTaskRows,
} from "@/lib/ops/job-workspace";

describe("job workspace parsers", () => {
  it("requires a work area name and rejects unknown kinds", () => {
    expect(parseWorkAreaInput({ name: "  " }).ok).toBe(false);
    expect(parseWorkAreaInput({ name: "Unit 4", kind: "hallway" }).ok).toBe(
      false,
    );
    expect(
      parseWorkAreaInput({
        name: "Level 2 podium",
        kind: "floor",
        notes: "North elevation",
      }),
    ).toEqual({
      ok: true,
      value: {
        name: "Level 2 podium",
        kind: "floor",
        notes: "North elevation",
      },
    });
  });

  it("reuses task title rules and accepts an optional work area", () => {
    expect(parseJobTaskInput({ title: "" }).ok).toBe(false);
    const parsed = parseJobTaskInput({
      title: "Install closed-cell",
      assignee: "Morgan Cole",
      workAreaId: "cccccccc-cccc-4ccc-8ccc-cccccccccccc",
    });
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;
    expect(parsed.value.workAreaId).toBe(
      "cccccccc-cccc-4ccc-8ccc-cccccccccccc",
    );
    expect(parsed.value.assignee).toBe("Morgan Cole");
  });

  it("collects every non-empty file from a multi-file upload", () => {
    const formData = new FormData();
    formData.append("file", new File([new Uint8Array([1, 2, 3])], "a.jpg", { type: "image/jpeg" }));
    formData.append("file", new File([], "empty.jpg", { type: "image/jpeg" }));
    formData.append("file", new File([new Uint8Array([4, 5])], "b.png", { type: "image/png" }));
    expect(listJobUploadFiles(formData).map((file) => file.name)).toEqual(["a.jpg", "b.png"]);
    expect(MAX_JOB_UPLOAD_FILES).toBe(30);
  });

  it("accepts only allowed plan and photo uploads", () => {
    expect(
      parseJobDocumentInput({
        filename: "plan.pdf",
        contentType: "application/zip",
        sizeBytes: 1200,
      }).ok,
    ).toBe(false);
    expect(
      parseJobDocumentInput({
        filename: "../secret.pdf",
        contentType: "application/pdf",
        sizeBytes: 1200,
      }).ok,
    ).toBe(false);
    expect(
      parseJobDocumentInput({
        filename: "plan.pdf",
        contentType: "application/pdf",
        sizeBytes: 0,
      }).ok,
    ).toBe(false);
    const parsed = parseJobDocumentInput({
      filename: "north-elevation.pdf",
      contentType: "application/pdf",
      sizeBytes: 2048,
      kind: "plan",
      workAreaId: "cccccccc-cccc-4ccc-8ccc-cccccccccccc",
    });
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;
    expect(parsed.value.filename).toBe("north-elevation.pdf");
    expect(parsed.value.kind).toBe("plan");
    expect(jobDocumentHref("job-1", "doc-1")).toBe(
      "/api/ops/jobs/job-1/documents/doc-1",
    );
    expect(formatFileSize(2048)).toBe("2.0 KB");
  });

  it("updates document kind and work area without a file", () => {
    expect(parseJobDocumentMeta({ kind: "drawing" }).ok).toBe(false);
    expect(
      parseJobDocumentMeta({
        kind: "photo",
        workAreaId: "cccccccc-cccc-4ccc-8ccc-cccccccccccc",
      }),
    ).toEqual({
      ok: true,
      value: {
        kind: "photo",
        workAreaId: "cccccccc-cccc-4ccc-8ccc-cccccccccccc",
      },
    });
  });

  it("rejects mismatched extensions, unsafe paths, and spoofed file bytes", () => {
    expect(
      parseJobDocumentInput({
        filename: "plan.png",
        contentType: "application/pdf",
        sizeBytes: 100,
      }).ok,
    ).toBe(false);
    expect(
      isOwnedJobUploadPath(
        "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
        "jobs/bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb/plan.pdf",
      ),
    ).toBe(true);
    expect(
      isOwnedJobUploadPath(
        "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
        "jobs/aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa/plan.pdf",
      ),
    ).toBe(false);
    expect(
      hasAllowedJobDocumentSignature(
        new Uint8Array([37, 80, 68, 70, 45]),
        "application/pdf",
      ),
    ).toBe(true);
    expect(
      hasAllowedJobDocumentSignature(
        new TextEncoder().encode("<script>"),
        "application/pdf",
      ),
    ).toBe(false);
  });

  it("orders open tasks by due date before completed tasks", () => {
    const createdAt = new Date("2026-09-19T00:00:00Z");
    const rows = sortJobTaskRows([
      {
        id: "done",
        status: "done",
        dueAt: null,
        createdAt,
      },
      {
        id: "later",
        status: "open",
        dueAt: new Date("2026-09-21T00:00:00Z"),
        createdAt,
      },
      {
        id: "sooner",
        status: "open",
        dueAt: new Date("2026-09-20T00:00:00Z"),
        createdAt,
      },
    ]);
    expect(rows.map((row) => row.id)).toEqual(["sooner", "later", "done"]);
  });
});
