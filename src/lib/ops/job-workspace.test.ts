import { describe, expect, it } from "vitest";
import {
  formatFileSize,
  hasAllowedJobDocumentSignature,
  isOwnedJobUploadPath,
  jobDocumentHref,
  listJobUploadFiles,
  MAX_JOB_UPLOAD_FILES,
  createCapturedPhotoFile,
  isJobImageContentType,
  normalizeJobPhotoFile,
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
      assigneeUserId: "12121212-1212-4121-8121-121212121212",
      workAreaId: "cccccccc-cccc-4ccc-8ccc-cccccccccccc",
    });
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;
    expect(parsed.value.workAreaId).toBe(
      "cccccccc-cccc-4ccc-8ccc-cccccccccccc",
    );
    expect(parsed.value.assignee).toBe("Morgan Cole");
    expect(parsed.value.assigneeUserId).toBe(
      "12121212-1212-4121-8121-121212121212",
    );
  });

  it("accepts a task planned range", () => {
    const parsed = parseJobTaskInput({
      title: "Install north wall",
      plannedStartAt: "2026-09-20T08:00",
      plannedEndAt: "2026-09-22T16:00",
    });
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;
    expect(parsed.value.plannedStartAt).toBeInstanceOf(Date);
    expect(parsed.value.plannedEndAt).toBeInstanceOf(Date);
    expect(parsed.value.statedQuantity).toBeNull();
    expect(parsed.value.statedUnit).toBeNull();
  });

  it("stores a stated quantity in bags or square feet", () => {
    const parsed = parseJobTaskInput({
      title: "Install closed-cell",
      statedQuantity: "40",
      statedUnit: "bags",
    });
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;
    expect(parsed.value.statedQuantity).toBe(40);
    expect(parsed.value.statedUnit).toBe("bags");
    expect(
      parseJobTaskInput({
        title: "Install closed-cell",
        statedQuantity: "40",
        statedUnit: "hours",
      }),
    ).toMatchObject({ ok: false, field: "statedUnit" });
  });

  it("rejects task planned completion before planned start", () => {
    expect(
      parseJobTaskInput({
        title: "Install north wall",
        plannedStartAt: "2026-09-22T16:00",
        plannedEndAt: "2026-09-20T08:00",
      }),
    ).toEqual({
      ok: false,
      error: "Planned completion must be on or after planned start.",
      field: "plannedEndAt",
    });
  });

  it("collects every non-empty file from a multi-file upload", () => {
    const formData = new FormData();
    formData.append("file", new File([new Uint8Array([1, 2, 3])], "a.jpg", { type: "image/jpeg" }));
    formData.append("file", new File([], "empty.jpg", { type: "image/jpeg" }));
    formData.append("file", new File([new Uint8Array([4, 5])], "b.png", { type: "image/png" }));
    expect(listJobUploadFiles(formData).map((file) => file.name)).toEqual(["a.jpg", "b.png"]);
    expect(MAX_JOB_UPLOAD_FILES).toBe(30);
  });

  it("names a captured camera still as a JPEG photo", () => {
    const file = createCapturedPhotoFile(
      new Blob([new Uint8Array([1, 2, 3])], { type: "image/jpeg" }),
      1_700_000_000_000,
    );
    expect(file.name).toBe("job-photo-1700000000000.jpg");
    expect(file.type).toBe("image/jpeg");
    expect(isJobImageContentType("image/jpeg")).toBe(true);
    expect(isJobImageContentType("application/pdf")).toBe(false);
    expect(
      normalizeJobPhotoFile(new File([new Uint8Array([1])], "site.jpg")).type,
    ).toBe("image/jpeg");
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
    expect(
      parseJobDocumentInput({
        filename: "closeout.png",
        contentType: "image/png",
        sizeBytes: 2048,
        kind: "photo",
        replacesDocumentId: "eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee",
      }),
    ).toMatchObject({
      ok: false,
      field: "kind",
    });
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
