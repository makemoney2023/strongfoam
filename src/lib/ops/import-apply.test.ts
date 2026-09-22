import { randomUUID } from "node:crypto";
import { describe, expect, it } from "vitest";
import { applyImportRows, emptyImportDomain } from "@/lib/ops/import-apply";
import { createMemoryImportStore } from "@/lib/ops/import-store";
import { stageImportFile } from "@/lib/ops/import-validation";
import { STRONG_FOAM_ORGANIZATION_ID } from "@/lib/ops/identity";

const ORG = STRONG_FOAM_ORGANIZATION_ID;
const OTHER = "11111111-1111-4111-8111-111111111199";

describe("import apply", () => {
  it("matches an exact company name and leaves a different name alone", () => {
    const domain = emptyImportDomain();
    domain.companies.push({
      id: "company-1",
      name: "Acme",
      email: null,
      phone: null,
      city: null,
      province: null,
    });
    const staged = stageImportFile({
      bytes: Buffer.from("source_key,name,email\nCUST-1,Acme,office@acme.test\nCUST-2,Acme Insulation,office@insulation.test\n"),
      filename: "companies.csv",
    });
    expect(staged.ok).toBe(true);
    if (!staged.ok) return;
    const applied = applyImportRows({
      domain,
      rows: staged.value.rows,
      createId: () => randomUUID(),
      actor: "admin@strongfoam.demo",
      passwordHash: "import-unusable",
    });
    expect(applied.ok).toBe(true);
    if (!applied.ok) return;
    expect(applied.writes.companies).toHaveLength(1);
    expect(applied.writes.companies[0]?.name).toBe("Acme Insulation");
    expect(applied.domain.companies.find((company) => company.id === "company-1")?.email).toBe(
      "office@acme.test",
    );
    expect(applied.domain.companies).toHaveLength(2);
  });

  it("does not delete a company that the sheet omits", () => {
    const domain = emptyImportDomain();
    domain.companies.push({
      id: "kept",
      name: "Kept Company",
      email: "kept@example.com",
      phone: null,
      city: null,
      province: null,
    });
    const staged = stageImportFile({
      bytes: Buffer.from("name\nNew Company\n"),
      filename: "companies.csv",
    });
    expect(staged.ok).toBe(true);
    if (!staged.ok) return;
    const applied = applyImportRows({
      domain,
      rows: staged.value.rows,
      createId: () => "created",
      actor: "admin@strongfoam.demo",
      passwordHash: "import-unusable",
    });
    expect(applied.ok).toBe(true);
    if (!applied.ok) return;
    expect(applied.domain.companies.some((company) => company.id === "kept")).toBe(true);
  });

  it("creates inactive workforce users and does not deactivate someone missing from the sheet", () => {
    const domain = emptyImportDomain();
    domain.users.push({
      id: "existing",
      email: "kept@strongfoam.demo",
      displayName: "Kept",
      active: true,
      passwordHash: "existing-hash",
    });
    const staged = stageImportFile({
      bytes: Buffer.from("display_name,email,role,active\nNew Worker,new@strongfoam.demo,field_worker,yes\n"),
      filename: "workforce.csv",
    });
    expect(staged.ok).toBe(true);
    if (!staged.ok) return;
    const applied = applyImportRows({
      domain,
      rows: staged.value.rows,
      createId: () => "user-new",
      actor: "admin@strongfoam.demo",
      passwordHash: "import-unusable",
    });
    expect(applied.ok).toBe(true);
    if (!applied.ok) return;
    const created = applied.writes.users[0];
    expect(created?.active).toBe(false);
    expect(created?.passwordHash).toBe("import-unusable");
    expect(applied.writes.memberships[0]?.active).toBe(false);
    expect(applied.domain.users.find((user) => user.id === "existing")?.active).toBe(true);
  });

  it("keeps an approved selling price and records a draft instead", () => {
    const domain = emptyImportDomain();
    domain.priceItems.push({
      id: "item-1",
      name: "Closed cell",
      trade: "spray-foam",
      unit: "bags",
      unitPriceCents: 18500,
      itemCode: "FOAM-1",
      itemKind: "material",
      supplier: null,
      unitCostCents: 9000,
      active: true,
    });
    domain.priceVersions.push({
      id: "version-1",
      itemId: "item-1",
      versionNumber: 1,
      status: "approved",
      trade: "spray-foam",
      description: "Closed cell",
      unit: "bags",
      unitPriceCents: 18500,
      unitCostCents: 9000,
      contentHash: "approved",
      createdBy: "admin@strongfoam.demo",
    });
    domain.crosswalk.push({
      entityType: "price_book_item",
      sourceKey: "FOAM-1",
      targetId: "item-1",
    });
    const staged = stageImportFile({
      bytes: Buffer.from("source_key,name,trade,unit,unit_price\nFOAM-1,Closed cell,spray-foam,bags,20.00\n"),
      filename: "price-book.csv",
    });
    expect(staged.ok).toBe(true);
    if (!staged.ok) return;
    const applied = applyImportRows({
      domain,
      rows: staged.value.rows,
      createId: () => "version-2",
      actor: "admin@strongfoam.demo",
      passwordHash: "import-unusable",
    });
    expect(applied.ok).toBe(true);
    if (!applied.ok) return;
    expect(applied.domain.priceItems[0]?.unitPriceCents).toBe(18500);
    expect(applied.writes.priceVersions[0]?.status).toBe("draft");
    expect(applied.writes.priceVersions[0]?.unitPriceCents).toBe(2000);
    expect(applied.domain.priceVersions.some((version) => version.status === "approved")).toBe(true);
  });

  it("refuses a commit when two companies share the exact name", () => {
    const domain = emptyImportDomain();
    domain.companies.push(
      { id: "a", name: "Acme", email: null, phone: null, city: null, province: null },
      { id: "b", name: "Acme", email: null, phone: null, city: null, province: null },
    );
    const staged = stageImportFile({
      bytes: Buffer.from("name,email\nAcme,office@acme.test\n"),
      filename: "companies.csv",
    });
    expect(staged.ok).toBe(true);
    if (!staged.ok) return;
    const applied = applyImportRows({
      domain,
      rows: staged.value.rows,
      createId: () => "nope",
      actor: "admin@strongfoam.demo",
      passwordHash: "import-unusable",
    });
    expect(applied.ok).toBe(false);
  });
});

describe("import store", () => {
  it("hides a batch from another organization and does not write on a demo commit", async () => {
    const store = createMemoryImportStore();
    const saved = await store.saveUpload({
      organizationId: ORG,
      actor: "admin@strongfoam.demo",
      filename: "companies.csv",
      contentType: "text/csv",
      bytes: Buffer.from("name,city,province\nHarbour,Winnipeg,MB\n"),
    });
    expect(saved.ok).toBe(true);
    if (!saved.ok) return;
    expect(await store.getBatch(OTHER, saved.batch.id)).toBeNull();
    expect(await store.listBatches(OTHER)).toEqual([]);
    const committed = await store.commit({
      organizationId: ORG,
      batchId: saved.batch.id,
      actor: "admin@strongfoam.demo",
      durable: false,
    });
    expect(committed.ok).toBe(true);
    if (!committed.ok) return;
    expect(committed.batch.durable).toBe(false);
    expect(committed.batch.status).toBe("completed");
    expect(store.domain.companies).toEqual([]);
    const replay = await store.commit({
      organizationId: ORG,
      batchId: saved.batch.id,
      actor: "admin@strongfoam.demo",
      durable: false,
    });
    expect(replay.ok).toBe(true);
    if (!replay.ok) return;
    expect(replay.already).toBe(true);
  });
});
