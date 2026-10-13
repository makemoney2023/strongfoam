import { execFileSync } from "node:child_process";
import {
  mkdtemp,
  mkdir,
  readFile,
  rm,
  stat,
  writeFile,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import {
  COPY_PRECEDENCE,
  checkCopyAudit,
  compileCopyAudit,
  extractCopyInventory,
  validateCopyDecisions,
} from "./audit-sfi-copy.mjs";

const roots: string[] = [];

function xmlEscape(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

async function writeDocx(
  sourceRoot: string,
  relativePath: string,
  paragraphs: string[],
): Promise<void> {
  const staging = await mkdtemp(join(tmpdir(), "sfi-copy-docx-"));
  const word = join(staging, "word");
  const rels = join(staging, "_rels");
  await mkdir(word, { recursive: true });
  await mkdir(rels, { recursive: true });
  await writeFile(
    join(staging, "[Content_Types].xml"),
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
</Types>`,
  );
  await writeFile(
    join(rels, ".rels"),
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>
</Relationships>`,
  );
  const body = paragraphs
    .map((paragraph) =>
      paragraph
        ? `<w:p><w:r><w:t>${xmlEscape(paragraph)}</w:t></w:r></w:p>`
        : "<w:p/>",
    )
    .join("");
  await writeFile(
    join(word, "document.xml"),
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body>${body}<w:sectPr/></w:body></w:document>`,
  );
  const destination = join(sourceRoot, relativePath);
  await mkdir(join(destination, ".."), { recursive: true });
  execFileSync("zip", ["-q", "-r", destination, "."], { cwd: staging });
  await rm(staging, { recursive: true, force: true });
}

afterEach(async () => {
  await Promise.all(
    roots.splice(0).map((root) => rm(root, { recursive: true, force: true })),
  );
});

describe("SFI source-copy audit", () => {
  it("extracts deterministic paragraph requirements from every DOCX", async () => {
    const root = await mkdtemp(join(tmpdir(), "sfi-copy-"));
    roots.push(root);
    await writeDocx(root, "Website revision dec. 15, 2020.docx", [
      "Current safe company statement.",
      "",
      "A second requirement.",
    ]);
    await writeDocx(root, "nested/Older Source.DOCX", [
      "Older supporting statement.",
    ]);

    const first = await extractCopyInventory(root);
    const second = await extractCopyInventory(root);

    expect(first).toEqual(second);
    expect(first.precedenceOrder).toEqual(COPY_PRECEDENCE);
    expect(first.documents.map((document) => document.path)).toEqual([
      "Website revision dec. 15, 2020.docx",
      "nested/Older Source.DOCX",
    ]);
    expect(first.requirements).toHaveLength(3);
    expect(first.requirements[1]).toMatchObject({
      sourcePath: "Website revision dec. 15, 2020.docx",
      paragraphLocator: "paragraph:0003",
      excerpt: "A second requirement.",
      precedenceRank: 1,
      normalizedRequirement: "a second requirement.",
    });
    expect(first.requirements[1].id).toMatch(/^copy-[a-f0-9]{16}$/);
    expect(first.requirements[1].paragraphHash).toMatch(/^[a-f0-9]{64}$/);
    expect(first.documents[1]).toMatchObject({
      precedenceRank: 4,
      paragraphCount: 1,
      requirementCount: 1,
    });
  });

  it("validates separate human outcomes and compiles precedence evidence", async () => {
    const root = await mkdtemp(join(tmpdir(), "sfi-copy-"));
    roots.push(root);
    await writeDocx(root, "Website revision dec. 15, 2020.docx", [
      "Strong Foam serves commercial building-envelope projects.",
      "The company began in 2016.",
      "Strong Foam is always the best choice.",
    ]);
    await writeDocx(root, "Website Text.docx", [
      "Strong Foam serves every residential project.",
    ]);
    const inventory = await extractCopyInventory(root);
    const [safe, dateClaim, guarded, older] = inventory.requirements;
    const decisions = {
      artifactType: "sfi-source-copy-decisions",
      schemaVersion: 1,
      decisions: [
        {
          id: safe.id,
          outcome: "published",
          reason: "Current high-priority statement is safe for publication.",
          typedField: "companyContent.focus",
          routes: ["/about", "/"],
          sourcePath: "forged-source.docx",
          excerpt: "Forged source evidence.",
        },
        {
          id: dateClaim.id,
          outcome: "held",
          reason: "Founding date needs explicit client approval.",
          missingApproval: "Approval of the 2016 founding date.",
        },
        {
          id: guarded.id,
          outcome: "rejected",
          reason: "Shared claims guard rejects absolute marketing language.",
          rejectedBy: "claims-guard",
        },
        {
          id: older.id,
          outcome: "rejected",
          reason: "Higher-priority positioning controls the service focus.",
          rejectedBy: safe.id,
        },
      ],
    };

    expect(() => validateCopyDecisions(inventory, decisions)).not.toThrow();
    const compiled = compileCopyAudit(inventory, decisions);
    expect(compiled.audit.summary).toEqual({
      totalRequirements: 4,
      outcomes: { published: 1, held: 1, rejected: 2 },
    });
    expect(
      compiled.audit.records.map(
        (record: { outcome: string }) => record.outcome,
      ),
    ).toEqual(["published", "held", "rejected", "rejected"]);
    expect(compiled.audit.records[0].sourcePath).toBe(
      "Website revision dec. 15, 2020.docx",
    );
    expect(compiled.audit.records[0].excerpt).toBe(
      "Strong Foam serves commercial building-envelope projects.",
    );
    expect(compiled.report).toContain("Published: 1");
    expect(compiled.report).toContain("Held: 1");
    expect(compiled.report).toContain("Rejected: 2");
  });

  it("rejects incomplete, stale, or unsafe publication decisions", async () => {
    const root = await mkdtemp(join(tmpdir(), "sfi-copy-"));
    roots.push(root);
    await writeDocx(root, "Website Text 2.docx", [
      "Strong Foam is guaranteed to outperform alternatives.",
    ]);
    const inventory = await extractCopyInventory(root);
    const requirement = inventory.requirements[0];

    expect(() =>
      validateCopyDecisions(inventory, {
        artifactType: "sfi-source-copy-decisions",
        schemaVersion: 1,
        decisions: [],
      }),
    ).toThrow(/missing decision/i);

    expect(() =>
      validateCopyDecisions(inventory, {
        artifactType: "sfi-source-copy-decisions",
        schemaVersion: 1,
        decisions: [
          {
            id: requirement.id,
            outcome: "published",
            reason: "Publish source copy.",
            typedField: "companyContent.promise",
            routes: ["/about"],
          },
          {
            id: "copy-stale",
            outcome: "rejected",
            reason: "Stale fixture.",
            rejectedBy: "claims-guard",
          },
        ],
      }),
    ).toThrow(/stale decision/i);

    expect(() =>
      validateCopyDecisions(inventory, {
        artifactType: "sfi-source-copy-decisions",
        schemaVersion: 1,
        decisions: [
          {
            id: requirement.id,
            outcome: "published",
            reason: "Publish source copy.",
            typedField: "companyContent.promise",
            routes: ["/about"],
          },
        ],
      }),
    ).toThrow(/unsafe marketing claim/i);

    expect(() =>
      validateCopyDecisions(inventory, {
        artifactType: "sfi-source-copy-decisions",
        schemaVersion: 1,
        decisions: [
          {
            id: requirement.id,
            outcome: "published",
            reason: "Publish source copy.",
            typedField: "missingContent.nonexistent",
            routes: ["/about"],
          },
        ],
      }),
    ).toThrow(/typed field/i);

    expect(() =>
      validateCopyDecisions(inventory, {
        artifactType: "sfi-source-copy-decisions",
        schemaVersion: 1,
        decisions: [
          {
            id: requirement.id,
            outcome: "published",
            reason: "Publish source copy.",
            typedField: "companyContent.promise",
            routes: ["/not-a-public-route"],
          },
        ],
      }),
    ).toThrow(/public routes/i);
  });

  it.runIf(Boolean(process.env.SFI_COPY_SOURCE))(
    "matches fresh repository extraction and leaves every artifact unchanged",
    async () => {
      const paths = {
        inventoryPath: "docs/sfi-source-copy-inventory.json",
        decisionsPath: "docs/sfi-source-copy-decisions.json",
        auditPath: "docs/sfi-source-copy-audit.json",
        reportPath: "docs/sfi-source-copy-audit.md",
      };
      const artifactPaths = Object.values(paths);
      const before = await Promise.all(
        artifactPaths.map(async (path) => ({
          path,
          bytes: await readFile(path),
          stats: await stat(path),
        })),
      );

      await expect(
        checkCopyAudit({
          source: process.env.SFI_COPY_SOURCE!,
          ...paths,
        }),
      ).resolves.toEqual({
        totalRequirements: 138,
        outcomes: { published: 29, held: 31, rejected: 78 },
      });

      const after = await Promise.all(
        artifactPaths.map(async (path) => ({
          path,
          bytes: await readFile(path),
          stats: await stat(path),
        })),
      );
      for (let index = 0; index < before.length; index += 1) {
        expect(after[index].bytes).toEqual(before[index].bytes);
        expect(after[index].stats.mtimeMs).toBe(before[index].stats.mtimeMs);
      }
    },
  );
});
