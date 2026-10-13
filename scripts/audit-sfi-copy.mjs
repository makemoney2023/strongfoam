#!/usr/bin/env node

import { createHash } from "node:crypto";
import {
  mkdir,
  readFile,
  readdir,
  stat,
  writeFile,
} from "node:fs/promises";
import { dirname, relative, resolve, sep } from "node:path";
import { pathToFileURL } from "node:url";
import mammoth from "mammoth";
import { assertMarketingClaimsSafe } from "../src/content/claims.ts";

export const COPY_PRECEDENCE = [
  "Website revision dec. 15, 2020.docx",
  "STRONG FOAM MISSION STATEMENT CK EDITS.docx",
  "Website Text 2.docx",
  "older DOCX sources (supporting evidence)",
];

const COPY_PUBLIC_ROUTES = new Set([
  "/",
  "/about",
  "/services",
  "/services/spray-foam-insulation",
  "/services/fire-protection",
  "/services/air-vapour-barriers",
  "/services/spf-roofing",
  "/projects",
  "/partners",
  "/locations",
  "/contact",
  "/request-estimate",
]);

const COPY_TYPED_FIELD_PATTERNS = [
  /^site\.(?:legalName|brand|phoneDisplay|emailEstimating|emailAdmin|primaryOps\.(?:label|street|locality|region|postal|country))$/,
  /^publicRoutes\[(?:[0-9]|1[01])]\.path$/,
  /^companyContent\.(?:story|focus|culture|safety|mission|vision|purpose|promise|objective|slogans\[[0-2]\])$/,
  /^serviceContent\[[0-3]\]\.(?:title|summary|technicalSections\[[0-2]\]\.(?:title|body)|cautions\[[0-1]\])$/,
  /^projectRecords\[[0-9]+\]\.(?:category|permissionSafeCaption|media\.(?:alt|sourcePath))$/,
  /^partnerRecords\[[0-9]+\]\.(?:displayName|category)$/,
  /^locationRecords\[[0-3]\]\.(?:label|serviceAreaWording|address\.(?:street|locality|region|postal|country))$/,
];

const PRIMARY_PRECEDENCE = new Map(
  COPY_PRECEDENCE.slice(0, 3).map((path, index) => [path, index + 1]),
);

function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}

function normalizePath(path) {
  return path.split(sep).join("/");
}

function normalizeRequirement(value) {
  return value.replace(/\s+/g, " ").trim().toLowerCase();
}

function precedenceRank(path) {
  return PRIMARY_PRECEDENCE.get(path) ?? 4;
}

function classifyTopic(value) {
  const normalized = normalizeRequirement(value);
  if (/\b(?:2016|2020|year|founded|history|experience)\b/.test(normalized)) {
    return "company-history";
  }
  if (/\b(?:mission|vision|purpose|promise|objective|relationship)\b/.test(normalized)) {
    return "company-principles";
  }
  if (/\b(?:spray foam|insulation|fireproof|intumescent|vapou?r|roof)\b/.test(normalized)) {
    return "services";
  }
  if (/\b(?:kitchener|dorchester|london|woodbridge|gta|ontario|address)\b/.test(normalized)) {
    return "locations";
  }
  if (/\b(?:client|supplier|partner|applicator|manufacturer|product)\b/.test(normalized)) {
    return "relationships";
  }
  if (/\b(?:phone|email|contact|estimate)\b/.test(normalized)) {
    return "contact";
  }
  return "general";
}

function conflictGroup(topic, normalized) {
  if (topic === "company-history") {
    return "company-history-and-experience";
  }
  if (topic === "locations") {
    return "operating-locations";
  }
  if (topic === "relationships") {
    return "supplier-client-applicator-relationships";
  }
  if (topic === "services" && /\b(?:service|offer|provide|install)\b/.test(normalized)) {
    return "service-scope";
  }
  return null;
}

async function discoverDocxFiles(root) {
  const files = [];

  async function visit(directory) {
    const entries = await readdir(directory, { withFileTypes: true });
    entries.sort((left, right) =>
      left.name.localeCompare(right.name, "en", { sensitivity: "base" }),
    );

    for (const entry of entries) {
      const path = resolve(directory, entry.name);
      if (entry.isDirectory()) {
        await visit(path);
      } else if (entry.isFile() && entry.name.toLowerCase().endsWith(".docx")) {
        files.push(path);
      }
    }
  }

  await visit(root);
  return files.sort((left, right) =>
    normalizePath(relative(root, left)).localeCompare(
      normalizePath(relative(root, right)),
      "en",
      { sensitivity: "base" },
    ),
  );
}

function rawParagraphs(rawText) {
  const normalized = rawText.replace(/\r\n?/g, "\n");
  const paragraphs = normalized.split(/\n{2}/);
  while (paragraphs.at(-1) === "") {
    paragraphs.pop();
  }
  return paragraphs;
}

export async function extractCopyInventory(sourceRoot) {
  const root = resolve(sourceRoot);
  const rootStats = await stat(root);
  if (!rootStats.isDirectory()) {
    throw new Error(`Copy source is not a directory: ${root}`);
  }

  const docxFiles = await discoverDocxFiles(root);
  if (docxFiles.length === 0) {
    throw new Error(`No DOCX source documents found beneath ${root}`);
  }

  const documents = [];
  const requirements = [];

  for (const absolutePath of docxFiles) {
    const sourcePath = normalizePath(relative(root, absolutePath));
    let extracted;
    try {
      extracted = await mammoth.extractRawText({ path: absolutePath });
    } catch (error) {
      throw new Error(
        `Failed to extract DOCX source ${sourcePath}: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
    }
    const paragraphs = rawParagraphs(extracted.value);
    const rank = precedenceRank(sourcePath);
    let requirementCount = 0;

    paragraphs.forEach((paragraph, index) => {
      const excerpt = paragraph.replace(/\n+/g, " ").replace(/\s+/g, " ").trim();
      if (!excerpt) {
        return;
      }
      requirementCount += 1;
      const paragraphLocator = `paragraph:${String(index + 1).padStart(4, "0")}`;
      const paragraphHash = sha256(excerpt);
      const normalizedRequirement = normalizeRequirement(excerpt);
      const topic = classifyTopic(excerpt);
      requirements.push({
        id: `copy-${sha256(
          `${sourcePath}\0${paragraphLocator}\0${paragraphHash}`,
        ).slice(0, 16)}`,
        sourcePath,
        paragraphLocator,
        paragraphHash,
        excerpt,
        precedenceRank: rank,
        normalizedRequirement,
        topic,
        conflictGroupId: conflictGroup(topic, normalizedRequirement),
      });
    });

    documents.push({
      path: sourcePath,
      precedenceRank: rank,
      paragraphCount: paragraphs.length,
      requirementCount,
      extractionMessages: extracted.messages.map((message) => ({
        type: message.type,
        message: message.message,
      })),
    });
  }

  requirements.sort(
    (left, right) =>
      left.precedenceRank - right.precedenceRank ||
      left.sourcePath.localeCompare(right.sourcePath, "en", {
        sensitivity: "base",
      }) ||
      left.paragraphLocator.localeCompare(right.paragraphLocator),
  );
  documents.sort(
    (left, right) =>
      left.precedenceRank - right.precedenceRank ||
      left.path.localeCompare(right.path, "en", { sensitivity: "base" }),
  );

  return {
    artifactType: "sfi-source-copy-inventory",
    schemaVersion: 1,
    extractor: "mammoth.extractRawText",
    precedenceOrder: COPY_PRECEDENCE,
    summary: {
      totalDocuments: documents.length,
      totalRequirements: requirements.length,
    },
    documents,
    requirements,
  };
}

function nonempty(value) {
  return typeof value === "string" && value.trim().length > 0;
}

function isKnownTypedField(value) {
  return (
    nonempty(value) &&
    COPY_TYPED_FIELD_PATTERNS.some((pattern) => pattern.test(value))
  );
}

export function validateCopyDecisions(inventory, decisionsArtifact) {
  if (
    !decisionsArtifact ||
    decisionsArtifact.artifactType !== "sfi-source-copy-decisions" ||
    decisionsArtifact.schemaVersion !== 1 ||
    !Array.isArray(decisionsArtifact.decisions)
  ) {
    throw new Error("Invalid source-copy decisions artifact");
  }

  const requirementsById = new Map(
    inventory.requirements.map((requirement) => [requirement.id, requirement]),
  );
  const decisionsById = new Map();

  for (const decision of decisionsArtifact.decisions) {
    if (!requirementsById.has(decision.id)) {
      throw new Error(`Stale decision references unknown requirement ${decision.id}`);
    }
    if (decisionsById.has(decision.id)) {
      throw new Error(`Duplicate decision for requirement ${decision.id}`);
    }
    decisionsById.set(decision.id, decision);
  }

  decisionsById.clear();
  for (const decision of decisionsArtifact.decisions) {
    if (!["published", "held", "rejected"].includes(decision.outcome)) {
      throw new Error(`Invalid final outcome for requirement ${decision.id}`);
    }
    if (!nonempty(decision.reason)) {
      throw new Error(`Decision ${decision.id} requires a nonempty reason`);
    }

    if (decision.outcome === "published") {
      if (!isKnownTypedField(decision.typedField)) {
        throw new Error(
          `Published decision ${decision.id} requires a known typed field`,
        );
      }
      if (
        !Array.isArray(decision.routes) ||
        decision.routes.length === 0 ||
        decision.routes.some((route) => !COPY_PUBLIC_ROUTES.has(route))
      ) {
        throw new Error(`Published decision ${decision.id} requires public routes`);
      }
      assertMarketingClaimsSafe(
        requirementsById.get(decision.id).excerpt,
        `source-copy decision ${decision.id}`,
      );
    } else if (decision.outcome === "held") {
      if (!nonempty(decision.missingApproval)) {
        throw new Error(`Held decision ${decision.id} requires missing approval`);
      }
    } else if (!nonempty(decision.rejectedBy)) {
      throw new Error(`Rejected decision ${decision.id} requires a controlling source or claims guard`);
    }

    decisionsById.set(decision.id, decision);
  }

  for (const requirement of inventory.requirements) {
    if (!decisionsById.has(requirement.id)) {
      throw new Error(`Missing decision for requirement ${requirement.id}`);
    }
  }

  return decisionsById;
}

export function compileCopyAudit(inventory, decisionsArtifact) {
  const decisionsById = validateCopyDecisions(inventory, decisionsArtifact);
  const outcomes = { published: 0, held: 0, rejected: 0 };
  const records = inventory.requirements.map((requirement) => {
    const decision = decisionsById.get(requirement.id);
    outcomes[decision.outcome] += 1;
    const finalDecision =
      decision.outcome === "published"
        ? {
            id: decision.id,
            outcome: decision.outcome,
            reason: decision.reason,
            typedField: decision.typedField,
            routes: decision.routes,
          }
        : decision.outcome === "held"
          ? {
              id: decision.id,
              outcome: decision.outcome,
              reason: decision.reason,
              missingApproval: decision.missingApproval,
            }
          : {
              id: decision.id,
              outcome: decision.outcome,
              reason: decision.reason,
              rejectedBy: decision.rejectedBy,
            };
    return { ...requirement, ...finalDecision };
  });

  const audit = {
    artifactType: "sfi-source-copy-audit",
    schemaVersion: 1,
    inventoryAuthority: "sfi-source-copy-inventory.json",
    reviewAuthority: "sfi-source-copy-decisions.json",
    generatedContentIsNotAReviewDecision: true,
    precedenceOrder: inventory.precedenceOrder,
    summary: {
      totalRequirements: records.length,
      outcomes,
    },
    documents: inventory.documents,
    records,
  };

  const report = [
    "# SFI source-copy audit",
    "",
    "This report is compiled from generated DOCX extraction evidence and the separate human-reviewed decision record.",
    "",
    "## Summary",
    "",
    `- Source documents: ${inventory.documents.length}`,
    `- Requirements: ${records.length}`,
    `- Published: ${outcomes.published}`,
    `- Held: ${outcomes.held}`,
    `- Rejected: ${outcomes.rejected}`,
    "",
    "## Source precedence",
    "",
    ...inventory.precedenceOrder.map((source, index) => `${index + 1}. \`${source}\``),
    "",
    "## Published requirements",
    "",
    ...reportRecords(records.filter((record) => record.outcome === "published")),
    "",
    "## Held requirements",
    "",
    ...reportRecords(records.filter((record) => record.outcome === "held")),
    "",
    "## Rejected requirements",
    "",
    ...reportRecords(records.filter((record) => record.outcome === "rejected")),
    "",
  ].join("\n");

  return { audit, report };
}

function reportRecords(records) {
  if (records.length === 0) {
    return ["- None"];
  }
  return records.map((record) => {
    const missingApproval =
      record.outcome === "held"
        ? record.missingApproval.replace(/[.\s]+$/, "")
        : "";
    const destination =
      record.outcome === "published"
        ? ` → \`${record.typedField}\` on ${record.routes.map((route) => `\`${route}\``).join(", ")}`
        : record.outcome === "held"
          ? ` → needs ${missingApproval}`
          : ` → controlled by ${record.rejectedBy}`;
    return `- \`${record.id}\` — \`${record.sourcePath}\` ${record.paragraphLocator}${destination}. ${record.reason}`;
  });
}

function serializeJson(value) {
  return `${JSON.stringify(value, null, 2)}\n`;
}

async function readJson(path) {
  return JSON.parse(await readFile(path, "utf8"));
}

async function ensureParent(path) {
  await mkdir(dirname(resolve(path)), { recursive: true });
}

export async function writeCopyInventory(source, inventoryPath) {
  const inventory = await extractCopyInventory(source);
  await ensureParent(inventoryPath);
  await writeFile(inventoryPath, serializeJson(inventory));
  return inventory;
}

export async function writeCompiledCopyAudit(
  inventoryPath,
  decisionsPath,
  auditPath,
  reportPath,
) {
  const inventory = await readJson(inventoryPath);
  const decisions = await readJson(decisionsPath);
  const compiled = compileCopyAudit(inventory, decisions);
  await ensureParent(auditPath);
  await ensureParent(reportPath);
  await writeFile(auditPath, serializeJson(compiled.audit));
  await writeFile(reportPath, compiled.report);
  return compiled;
}

export async function checkCopyAudit({
  source,
  inventoryPath,
  decisionsPath,
  auditPath,
  reportPath,
}) {
  const checkedInventory = await readJson(inventoryPath);
  const decisions = await readJson(decisionsPath);
  const checkedAudit = await readJson(auditPath);
  const checkedReport = await readFile(reportPath, "utf8");
  const freshInventory = await extractCopyInventory(source);

  if (serializeJson(freshInventory) !== serializeJson(checkedInventory)) {
    throw new Error("Source-copy inventory is stale; run the inventory command");
  }

  const freshCompiled = compileCopyAudit(freshInventory, decisions);
  if (serializeJson(freshCompiled.audit) !== serializeJson(checkedAudit)) {
    throw new Error("Compiled source-copy audit is stale; run the compile command");
  }
  if (freshCompiled.report !== checkedReport) {
    throw new Error("Compiled source-copy report is stale; run the compile command");
  }

  return freshCompiled.audit.summary;
}

function parseArgs(argv) {
  const command = argv[0];
  const options = {};
  for (let index = 1; index < argv.length; index += 2) {
    const flag = argv[index];
    const value = argv[index + 1];
    if (!flag?.startsWith("--") || value === undefined) {
      throw new Error(`Invalid argument sequence near ${flag ?? "<end>"}`);
    }
    options[flag.slice(2)] = value;
  }
  return { command, options };
}

function requireOptions(options, names) {
  for (const name of names) {
    if (!options[name]) {
      throw new Error(`Missing required option --${name}`);
    }
  }
}

async function main(argv) {
  const { command, options } = parseArgs(argv);
  if (command === "inventory") {
    requireOptions(options, ["source", "inventory"]);
    const inventory = await writeCopyInventory(options.source, options.inventory);
    console.log(
      `Inventoried ${inventory.summary.totalRequirements} requirements from ${inventory.summary.totalDocuments} DOCX files.`,
    );
    return;
  }
  if (command === "compile") {
    requireOptions(options, ["inventory", "decisions", "audit", "report"]);
    const compiled = await writeCompiledCopyAudit(
      options.inventory,
      options.decisions,
      options.audit,
      options.report,
    );
    console.log(
      `Compiled ${compiled.audit.summary.totalRequirements} source-copy decisions.`,
    );
    return;
  }
  if (command === "check") {
    requireOptions(options, [
      "source",
      "inventory",
      "decisions",
      "audit",
      "report",
    ]);
    const summary = await checkCopyAudit({
      source: options.source,
      inventoryPath: options.inventory,
      decisionsPath: options.decisions,
      auditPath: options.audit,
      reportPath: options.report,
    });
    console.log(
      `Source-copy audit check passed: ${summary.totalRequirements} requirements.`,
    );
    return;
  }
  throw new Error(`Unknown command: ${command ?? "<none>"}`);
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) {
  main(process.argv.slice(2)).catch((error) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  });
}
