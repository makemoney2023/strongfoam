import { deflateRawSync } from "node:zlib";
import { describe, expect, it } from "vitest";
import { parseCsvGrid, parseImportWorkbook } from "@/lib/ops/import-workbook";
import { stageImportFile } from "@/lib/ops/import-validation";

describe("import workbook", () => {
  it("reads a UTF-8 CSV without evaluating a formula", () => {
    const csv = Buffer.from("name,email\nAcme,=1+1\n");
    const parsed = parseImportWorkbook(csv, "companies.csv");
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;
    expect(parsed.sheets[0]?.rows[1]?.[1]).toEqual({ value: "", formula: true });
    const staged = stageImportFile({ bytes: csv, filename: "companies.csv" });
    expect(staged.ok).toBe(true);
    if (!staged.ok) return;
    expect(staged.value.rows[0]?.status).toBe("error");
    expect(staged.value.rows[0]?.values.email).toBeUndefined();
    expect(staged.value.rows[0]?.messages.join(" ")).toMatch(/formula/i);
  });

  it("rejects a password column and a legacy xls file", () => {
    const password = stageImportFile({
      bytes: Buffer.from("name,password\nAcme,secret\n"),
      filename: "companies.csv",
    });
    expect(password.ok).toBe(false);
    const legacy = parseImportWorkbook(Buffer.from([0xd0, 0xcf, 0x11, 0xe0, 0, 0]), "book.xls");
    expect(legacy.ok).toBe(false);
  });

  it("uses a cached xlsx value and rejects a formula without one", () => {
    const cached = parseImportWorkbook(xlsx({
      rows: `<row><c r="A1" t="inlineStr"><is><t>name</t></is></c></row><row><c r="A2"><f>1+1</f><v>Harbour</v></c></row>`,
    }), "companies.xlsx");
    expect(cached.ok).toBe(true);
    if (!cached.ok) return;
    expect(cached.sheets[0]?.rows[1]?.[0]).toEqual({ value: "Harbour", formula: true });

    const bare = parseImportWorkbook(xlsx({
      rows: `<row><c r="A1" t="inlineStr"><is><t>name</t></is></c></row><row><c r="A2"><f>1+1</f></c></row>`,
    }), "companies.xlsx");
    expect(bare.ok).toBe(true);
    if (!bare.ok) return;
    const staged = stageImportFile({
      bytes: xlsx({
        rows: `<row><c r="A1" t="inlineStr"><is><t>name</t></is></c></row><row><c r="A2"><f>1+1</f></c></row>`,
      }),
      filename: "companies.xlsx",
    });
    expect(staged.ok).toBe(true);
    if (!staged.ok) return;
    expect(staged.value.status).toBe("invalid");
  });

  it("rejects macros", () => {
    const parsed = parseImportWorkbook(xlsx({
      extra: { "xl/vbaProject.bin": Buffer.from("macro") },
      rows: `<row><c r="A1" t="inlineStr"><is><t>name</t></is></c></row>`,
    }), "companies.xlsx");
    expect(parsed.ok).toBe(false);
  });
});

describe("csv grid", () => {
  it("keeps quoted commas", () => {
    expect(parseCsvGrid('name\n"Acme, Inc"\n')[1]?.[0]?.value).toBe("Acme, Inc");
  });
});

function xlsx(input: { rows: string; extra?: Record<string, Buffer> }): Buffer {
  const files: Record<string, string | Buffer> = {
    "[Content_Types].xml": "<Types></Types>",
    "xl/workbook.xml": '<workbook><sheets><sheet name="Companies" sheetId="1" r:id="rId1"/></sheets></workbook>',
    "xl/_rels/workbook.xml.rels": '<Relationships><Relationship Id="rId1" Target="worksheets/sheet1.xml"/></Relationships>',
    "xl/worksheets/sheet1.xml": `<worksheet><sheetData>${input.rows}</sheetData></worksheet>`,
    ...input.extra,
  };
  return zipStore(files);
}

function zipStore(files: Record<string, string | Buffer>): Buffer {
  const locals: Buffer[] = [];
  const centrals: Buffer[] = [];
  let offset = 0;
  for (const [name, contents] of Object.entries(files)) {
    const data = Buffer.isBuffer(contents) ? contents : Buffer.from(contents);
    const compressed = deflateRawSync(data);
    const nameBuf = Buffer.from(name);
    const local = Buffer.alloc(30);
    local.writeUInt32LE(0x04034b50, 0);
    local.writeUInt16LE(20, 4);
    local.writeUInt16LE(8, 8);
    local.writeUInt32LE(compressed.length, 18);
    local.writeUInt32LE(data.length, 22);
    local.writeUInt16LE(nameBuf.length, 26);
    const localHeader = Buffer.concat([local, nameBuf, compressed]);
    const central = Buffer.alloc(46);
    central.writeUInt32LE(0x02014b50, 0);
    central.writeUInt16LE(20, 4);
    central.writeUInt16LE(20, 6);
    central.writeUInt16LE(8, 10);
    central.writeUInt32LE(compressed.length, 20);
    central.writeUInt32LE(data.length, 24);
    central.writeUInt16LE(nameBuf.length, 28);
    central.writeUInt32LE(offset, 42);
    locals.push(localHeader);
    centrals.push(Buffer.concat([central, nameBuf]));
    offset += localHeader.length;
  }
  const directory = Buffer.concat(centrals);
  const eocd = Buffer.alloc(22);
  eocd.writeUInt32LE(0x06054b50, 0);
  eocd.writeUInt16LE(Object.keys(files).length, 8);
  eocd.writeUInt16LE(Object.keys(files).length, 10);
  eocd.writeUInt32LE(directory.length, 12);
  eocd.writeUInt32LE(offset, 16);
  return Buffer.concat([...locals, directory, eocd]);
}
