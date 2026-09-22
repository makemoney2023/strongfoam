import { inflateRawSync } from "node:zlib";
import {
  IMPORT_MAX_FILE_BYTES,
  IMPORT_MAX_UNCOMPRESSED_BYTES,
  IMPORT_MAX_ZIP_ENTRIES,
} from "@/lib/ops/import-contract";

export type WorkbookCell = {
  value: string;
  formula: boolean;
};

export type WorkbookSheet = {
  name: string;
  rows: WorkbookCell[][];
};

export type ParsedWorkbook =
  | { ok: true; sheets: WorkbookSheet[] }
  | { ok: false; error: string };

const ZIP_LOCAL = 0x04034b50;
const ZIP_CENTRAL = 0x02014b50;
const ZIP_EOCD = 0x06054b50;

type ZipEntry = {
  name: string;
  method: number;
  compressedSize: number;
  uncompressedSize: number;
  localOffset: number;
};

export function parseImportWorkbook(
  bytes: Buffer,
  filename: string,
): ParsedWorkbook {
  if (bytes.length === 0 || bytes.length > IMPORT_MAX_FILE_BYTES) {
    return {
      ok: false,
      error:
        bytes.length === 0
          ? "Choose a CSV or XLSX file."
          : "Import files must be 25 MB or smaller.",
    };
  }
  const lower = filename.trim().toLowerCase();
  if (lower.endsWith(".xls") && !lower.endsWith(".xlsx")) {
    return { ok: false, error: "Legacy .xls workbooks are not accepted. Save the file as .xlsx or CSV." };
  }
  if (bytes.subarray(0, 4).equals(Buffer.from([0xd0, 0xcf, 0x11, 0xe0]))) {
    return { ok: false, error: "Legacy .xls workbooks are not accepted. Save the file as .xlsx or CSV." };
  }
  if (lower.endsWith(".xlsx") || bytes.subarray(0, 2).equals(Buffer.from("PK"))) {
    return parseXlsx(bytes);
  }
  if (lower.endsWith(".csv") || looksLikeText(bytes)) {
    return parseCsv(bytes, filename);
  }
  return { ok: false, error: "Upload a .xlsx workbook or a UTF-8 .csv file." };
}

function looksLikeText(bytes: Buffer): boolean {
  return decodeUtf8(bytes) !== null;
}

function decodeUtf8(bytes: Buffer): string | null {
  try {
    const text = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
    if (text.includes("\u0000")) return null;
    return text;
  } catch {
    return null;
  }
}

function parseCsv(bytes: Buffer, filename: string): ParsedWorkbook {
  const text = decodeUtf8(bytes);
  if (text === null) {
    return { ok: false, error: "CSV files must be UTF-8 text." };
  }
  const source = text.charCodeAt(0) === 0xfeff ? text.slice(1) : text;
  const grid = parseCsvGrid(source);
  const rows = grid.filter((row) => row.some((cell) => cell.value.trim()));
  if (rows.length < 2) {
    return { ok: false, error: "The file needs a header row and at least one data row." };
  }
  const name = filename.replace(/\.[^.]+$/, "") || "CSV";
  return { ok: true, sheets: [{ name, rows }] };
}

export function parseCsvGrid(source: string): WorkbookCell[][] {
  const rows: WorkbookCell[][] = [];
  let row: WorkbookCell[] = [];
  let current = "";
  let quoted = false;
  let formula = false;
  const pushCell = () => {
    row.push({ value: current, formula });
    current = "";
    formula = false;
  };
  for (let index = 0; index < source.length; index += 1) {
    const char = source[index];
    if (quoted) {
      if (char === '"') {
        if (source[index + 1] === '"') {
          current += '"';
          index += 1;
        } else {
          quoted = false;
        }
      } else {
        current += char;
      }
      continue;
    }
    if (char === '"' && current === "") {
      quoted = true;
      continue;
    }
    if (char === ",") {
      pushCell();
      continue;
    }
    if (char === "\n") {
      pushCell();
      rows.push(row);
      row = [];
      continue;
    }
    if (char === "\r") continue;
    if (current === "" && char === "=") {
      formula = true;
      continue;
    }
    if (formula) continue;
    current += char;
  }
  if (current.length > 0 || row.length > 0) {
    pushCell();
    rows.push(row);
  }
  return rows;
}

function parseXlsx(bytes: Buffer): ParsedWorkbook {
  let entries: Map<string, Buffer>;
  try {
    entries = readZip(bytes);
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "That workbook could not be read.",
    };
  }
  const names = [...entries.keys()].map((name) => name.replaceAll("\\", "/"));
  if (names.some((name) => name.endsWith("EncryptionInfo") || name.endsWith("EncryptedPackage"))) {
    return { ok: false, error: "Password-protected workbooks are not accepted." };
  }
  if (names.some((name) => name.toLowerCase().includes("vbaproject"))) {
    return { ok: false, error: "Workbooks with macros are not accepted." };
  }
  if (names.some((name) => /embeddings\/|oleobject/i.test(name))) {
    return { ok: false, error: "Workbooks with embedded objects are not accepted." };
  }
  const workbook = entries.get("xl/workbook.xml");
  const rels = entries.get("xl/_rels/workbook.xml.rels");
  if (!workbook || !rels) {
    return { ok: false, error: "That .xlsx file does not contain a workbook." };
  }
  const workbookXml = workbook.toString("utf8");
  const relsXml = rels.toString("utf8");
  const shared = entries.get("xl/sharedStrings.xml")?.toString("utf8");
  const strings = shared ? readSharedStrings(shared) : [];
  const sheets = [...workbookXml.matchAll(/<sheet\b([^>]*)\/>/g)];
  if (sheets.length === 0) {
    return { ok: false, error: "The workbook has no sheets." };
  }
  const parsed: WorkbookSheet[] = [];
  for (const sheet of sheets) {
    const attrs = sheet[1] ?? "";
    const name = decodeXml(attribute(attrs, "name") ?? "Sheet");
    const relId = attribute(attrs, "r:id") ?? attribute(attrs, "id");
    if (!relId) continue;
    const rel = new RegExp(`Id="${escapeRegExp(relId)}"[^>]*Target="([^"]+)"`).exec(relsXml)
      ?? new RegExp(`Target="([^"]+)"[^>]*Id="${escapeRegExp(relId)}"`).exec(relsXml);
    if (!rel?.[1]) {
      return { ok: false, error: `The sheet ${name} could not be found in the workbook.` };
    }
    const target = rel[1].replace(/^\//, "");
    const path = target.startsWith("xl/") ? target : `xl/${target}`;
    const xml = entries.get(path)?.toString("utf8");
    if (!xml) {
      return { ok: false, error: `The sheet ${name} could not be read.` };
    }
    parsed.push({ name, rows: readSheetRows(xml, strings) });
  }
  if (parsed.length === 0) {
    return { ok: false, error: "The workbook has no readable sheets." };
  }
  return { ok: true, sheets: parsed };
}

function readSheetRows(xml: string, strings: string[]): WorkbookCell[][] {
  const rows: WorkbookCell[][] = [];
  for (const match of xml.matchAll(/<row\b[^>]*>([\s\S]*?)<\/row>/g)) {
    const cells = new Map<number, WorkbookCell>();
    let max = -1;
    const inner = match[1] ?? "";
    for (const cell of inner.matchAll(/<c\b([^>]*?)(?:\/>|>([\s\S]*?)<\/c>)/g)) {
      const attrs = cell[1] ?? "";
      const body = cell[2] ?? "";
      const ref = attribute(attrs, "r") ?? "";
      const column = columnIndex(ref);
      const type = attribute(attrs, "t") ?? "";
      const formula = /<f\b/.test(body);
      const rawValue = /<v>([\s\S]*?)<\/v>/.exec(body)?.[1];
      const inline = [...body.matchAll(/<t\b[^>]*>([\s\S]*?)<\/t>/g)]
        .map((item) => decodeXml(item[1] ?? ""))
        .join("");
      let value = "";
      if (type === "s" && rawValue != null) {
        value = strings[Number(rawValue)] ?? "";
      } else if (type === "inlineStr") {
        value = inline;
      } else if (rawValue != null) {
        value = decodeXml(rawValue);
      } else if (inline) {
        value = inline;
      }
      cells.set(column, { value, formula });
      max = Math.max(max, column);
    }
    const row: WorkbookCell[] = [];
    for (let index = 0; index <= max; index += 1) {
      row.push(cells.get(index) ?? { value: "", formula: false });
    }
    if (row.some((cell) => cell.value.trim() || cell.formula)) rows.push(row);
  }
  return rows;
}

function readSharedStrings(xml: string): string[] {
  const values: string[] = [];
  for (const item of xml.matchAll(/<si\b[^>]*>([\s\S]*?)<\/si>/g)) {
    const parts = [...(item[1] ?? "").matchAll(/<t\b[^>]*>([\s\S]*?)<\/t>/g)].map(
      (match) => decodeXml(match[1] ?? ""),
    );
    values.push(parts.join(""));
  }
  return values;
}

function columnIndex(reference: string): number {
  const letters = /^[A-Z]+/i.exec(reference)?.[0].toUpperCase() ?? "A";
  let index = 0;
  for (const char of letters) index = index * 26 + (char.charCodeAt(0) - 64);
  return index - 1;
}

function attribute(source: string, name: string): string | null {
  const match = new RegExp(`${escapeRegExp(name)}="([^"]*)"`).exec(source);
  return match?.[1] ?? null;
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function decodeXml(value: string): string {
  return value
    .replaceAll("&lt;", "<")
    .replaceAll("&gt;", ">")
    .replaceAll("&quot;", '"')
    .replaceAll("&apos;", "'")
    .replaceAll("&amp;", "&");
}

function readZip(buffer: Buffer): Map<string, Buffer> {
  let eocd = -1;
  const scanFrom = Math.max(0, buffer.length - 22 - 65_535);
  for (let offset = buffer.length - 22; offset >= scanFrom; offset -= 1) {
    if (buffer.readUInt32LE(offset) === ZIP_EOCD) {
      eocd = offset;
      break;
    }
  }
  if (eocd < 0) throw new Error("That .xlsx file is not a valid workbook.");
  const entryCount = buffer.readUInt16LE(eocd + 10);
  const directoryOffset = buffer.readUInt32LE(eocd + 16);
  if (entryCount > IMPORT_MAX_ZIP_ENTRIES) {
    throw new Error("That workbook has too many files inside it.");
  }
  const entries: ZipEntry[] = [];
  let cursor = directoryOffset;
  for (let index = 0; index < entryCount; index += 1) {
    if (buffer.readUInt32LE(cursor) !== ZIP_CENTRAL) {
      throw new Error("That .xlsx file is not a valid workbook.");
    }
    const method = buffer.readUInt16LE(cursor + 10);
    const compressedSize = buffer.readUInt32LE(cursor + 20);
    const uncompressedSize = buffer.readUInt32LE(cursor + 24);
    const nameLength = buffer.readUInt16LE(cursor + 28);
    const extraLength = buffer.readUInt16LE(cursor + 30);
    const commentLength = buffer.readUInt16LE(cursor + 32);
    const localOffset = buffer.readUInt32LE(cursor + 42);
    const name = buffer.toString("utf8", cursor + 46, cursor + 46 + nameLength);
    if (name.includes("..") || name.startsWith("/") || name.includes("\\")) {
      throw new Error("That workbook contains an unsafe file path.");
    }
    entries.push({ name, method, compressedSize, uncompressedSize, localOffset });
    cursor += 46 + nameLength + extraLength + commentLength;
  }
  const uncompressedTotal = entries.reduce((sum, entry) => sum + entry.uncompressedSize, 0);
  if (uncompressedTotal > IMPORT_MAX_UNCOMPRESSED_BYTES) {
    throw new Error("That workbook expands beyond the allowed size.");
  }
  const files = new Map<string, Buffer>();
  for (const entry of entries) {
    if (entry.name.endsWith("/")) continue;
    if (buffer.readUInt32LE(entry.localOffset) !== ZIP_LOCAL) {
      throw new Error("That .xlsx file is not a valid workbook.");
    }
    const nameLength = buffer.readUInt16LE(entry.localOffset + 26);
    const extraLength = buffer.readUInt16LE(entry.localOffset + 28);
    const start = entry.localOffset + 30 + nameLength + extraLength;
    const compressed = buffer.subarray(start, start + entry.compressedSize);
    if (entry.method === 0) {
      files.set(entry.name.replaceAll("\\", "/"), Buffer.from(compressed));
    } else if (entry.method === 8) {
      const inflated = inflateRawSync(compressed);
      if (inflated.length !== entry.uncompressedSize && entry.uncompressedSize !== 0) {
        throw new Error("That workbook could not be expanded safely.");
      }
      files.set(entry.name.replaceAll("\\", "/"), inflated);
    } else {
      throw new Error("That workbook uses an unsupported compression method.");
    }
  }
  return files;
}
