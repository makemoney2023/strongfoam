"use client";

import { useMemo, useState } from "react";
import { ActionForm } from "@/components/ops/action-form";
import { NativeSelect } from "@/components/ops/native-select";
import { SubmitButton } from "@/components/ops/submit-button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  discardEstimateDraft,
  saveEstimateVersion,
} from "@/app/app/opportunities/[id]/estimates/actions";

const CATEGORIES = ["labor", "material", "equipment", "subcontractor", "allowance"] as const;

type LineDraft = {
  key: string;
  category: (typeof CATEGORIES)[number];
  description: string;
  trade: string;
  location: string;
  method: "unit" | "fixed" | "percent";
  quantity: string;
  unit: string;
  fixedDollars: string;
  basisPoints: string;
  basisCategory: (typeof CATEGORIES)[number];
  taxable: boolean;
  alternateKey: string;
  priceBookVersionId: string;
  citationId: string;
};

type ClauseDraft = {
  key: string;
  kind: "inclusion" | "exclusion" | "assumption";
  text: string;
};

type AlternateDraft = {
  key: string;
  name: string;
  description: string;
  included: boolean;
};

type PackageDraft = {
  key: string;
  name: string;
  trade: string;
  scope: string;
  workAreaName: string;
  taskTitle: string;
};

export type EstimateEditorRevision = {
  id: string;
  label: string;
  trade: string;
  unit: string;
  description: string;
};

export type EstimateEditorCitation = {
  id: string;
  label: string;
  documentVersionId: string;
  pageNumber: number;
  sheetLabel: string | null;
  contentHash: string;
  startOffset: number;
  endOffset: number;
};

function centsFromDollars(raw: string): number | null {
  const cleaned = raw.trim();
  if (!/^\d+(\.\d{1,2})?$/.test(cleaned)) return null;
  const [whole, fraction = ""] = cleaned.split(".");
  return Number(whole) * 100 + Number(fraction.padEnd(2, "0"));
}

function blankLine(revision?: EstimateEditorRevision): LineDraft {
  return {
    key: crypto.randomUUID(),
    category: "material",
    description: revision?.description ?? "",
    trade: revision?.trade || "spray-foam",
    location: "",
    method: "unit",
    quantity: "1.0000",
    unit: revision?.unit || "bags",
    fixedDollars: "",
    basisPoints: "0",
    basisCategory: "material",
    taxable: true,
    alternateKey: "",
    priceBookVersionId: revision?.id ?? "",
    citationId: "",
  };
}

function blankPackage(index: number): PackageDraft {
  return {
    key: crypto.randomUUID(),
    name: index === 0 ? "Podium closed-cell" : "North elevation AVB",
    trade: index === 0 ? "spray-foam" : "avb",
    scope: index === 0 ? "Podium" : "North elevation",
    workAreaName: index === 0 ? "Podium" : "North elevation",
    taskTitle: index === 0 ? "Mask podium" : "Install AVB",
  };
}

export function EstimateEditor({
  estimateId,
  baseVersionNumber,
  revisions,
  citations,
  initial,
}: {
  estimateId: string;
  baseVersionNumber: number;
  revisions: EstimateEditorRevision[];
  citations: EstimateEditorCitation[];
  initial?: {
    lines: LineDraft[];
    clauses: ClauseDraft[];
    alternates: AlternateDraft[];
    packages: PackageDraft[];
    overhead: string;
    markup: string;
    tax: string;
  };
}) {
  const [lines, setLines] = useState<LineDraft[]>(initial?.lines ?? []);
  const [clauses, setClauses] = useState<ClauseDraft[]>(initial?.clauses ?? []);
  const [alternates, setAlternates] = useState<AlternateDraft[]>(initial?.alternates ?? []);
  const [packages, setPackages] = useState<PackageDraft[]>(initial?.packages ?? []);
  const [overhead, setOverhead] = useState(initial?.overhead ?? "0");
  const [markup, setMarkup] = useState(initial?.markup ?? "0");
  const [tax, setTax] = useState(initial?.tax ?? "0");
  const nextVersion = baseVersionNumber + 1;

  const payload = useMemo(() => {
    return JSON.stringify({
      overheadBasisPoints: Number(overhead) || 0,
      markupBasisPoints: Number(markup) || 0,
      taxBasisPoints: Number(tax) || 0,
      clauses: clauses.map((clause, index) => ({
        kind: clause.kind,
        text: clause.text,
        sortOrder: index,
      })),
      alternates: alternates.map((alternate, index) => ({
        key: alternate.key,
        name: alternate.name,
        description: alternate.description,
        included: alternate.included,
        sortOrder: index,
      })),
      lines: lines.map((line, index) => {
        const citation = citations.find((item) => item.id === line.citationId);
        return {
          sortOrder: index,
          category: line.category,
          description: line.description,
          trade: line.trade,
          location: line.location || null,
          method: line.method,
          quantity: line.method === "unit" ? line.quantity : null,
          unit: line.method === "unit" ? line.unit : null,
          unitPriceCents: line.method === "fixed" ? centsFromDollars(line.fixedDollars) : null,
          basisPoints: line.method === "percent" ? Number(line.basisPoints) || 0 : null,
          basisCategories: line.method === "percent" ? [line.basisCategory] : [],
          taxable: line.taxable,
          alternateKey: line.alternateKey || null,
          priceBookItemId: null,
          priceBookVersionId: line.method === "unit" ? line.priceBookVersionId : null,
          sources: citation
            ? [
                {
                  documentVersionId: citation.documentVersionId,
                  pageNumber: citation.pageNumber,
                  sheetLabel: citation.sheetLabel,
                  chunkId: citation.id,
                  contentHash: citation.contentHash,
                  startOffset: citation.startOffset,
                  endOffset: citation.endOffset,
                },
              ]
            : [],
        };
      }),
      jobPackages: packages.map((pkg, index) => ({
        key: pkg.key,
        name: pkg.name,
        trade: pkg.trade,
        scope: pkg.scope,
        sortOrder: index,
        workAreas: [
          { key: `${pkg.key}-area`, name: pkg.workAreaName, kind: "area", sortOrder: 0 },
        ],
        tasks: [
          { title: pkg.taskTitle, workAreaKey: `${pkg.key}-area`, sortOrder: 0 },
        ],
      })),
    });
  }, [alternates, citations, clauses, lines, markup, overhead, packages, tax]);

  return (
    <div className="space-y-4">
      <div>
        <h2 className="font-medium">Create version {nextVersion}</h2>
        <p className="text-sm text-muted-foreground">
          Saving writes a new immutable version. Version {baseVersionNumber} stays unchanged.
        </p>
      </div>
      <div className="grid gap-3 sm:grid-cols-3">
        <label className="space-y-2 text-sm">
          Overhead basis points
          <Input className="h-11" value={overhead} onChange={(event) => setOverhead(event.target.value)} />
        </label>
        <label className="space-y-2 text-sm">
          Markup basis points
          <Input className="h-11" value={markup} onChange={(event) => setMarkup(event.target.value)} />
        </label>
        <label className="space-y-2 text-sm">
          Tax basis points
          <Input className="h-11" value={tax} onChange={(event) => setTax(event.target.value)} />
        </label>
      </div>

      <div className="space-y-3">
        <div className="flex items-center justify-between gap-3">
          <h3 className="text-sm font-medium">Lines</h3>
          <button
            type="button"
            className="text-sm font-medium underline underline-offset-4"
            onClick={() => setLines((current) => [...current, blankLine(revisions[0])])}
          >
            Add line
          </button>
        </div>
        {lines.map((line) => (
          <div key={line.key} className="grid gap-3 rounded-lg border p-3">
            <Label htmlFor={`${line.key}-description`}>Description</Label>
            <Input
              id={`${line.key}-description`}
              className="h-11"
              value={line.description}
              onChange={(event) =>
                setLines((current) =>
                  current.map((item) =>
                    item.key === line.key ? { ...item, description: event.target.value } : item,
                  ),
                )
              }
            />
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="space-y-2 text-sm">
                Category
                <NativeSelect
                  className="h-11"
                  value={line.category}
                  onChange={(event) =>
                    setLines((current) =>
                      current.map((item) =>
                        item.key === line.key
                          ? { ...item, category: event.target.value as LineDraft["category"] }
                          : item,
                      ),
                    )
                  }
                >
                  {CATEGORIES.map((category) => (
                    <option key={category} value={category}>
                      {category}
                    </option>
                  ))}
                </NativeSelect>
              </label>
              <label className="space-y-2 text-sm">
                Method
                <NativeSelect
                  className="h-11"
                  value={line.method}
                  onChange={(event) =>
                    setLines((current) =>
                      current.map((item) =>
                        item.key === line.key
                          ? { ...item, method: event.target.value as LineDraft["method"] }
                          : item,
                      ),
                    )
                  }
                >
                  <option value="unit">Unit price</option>
                  <option value="fixed">Fixed amount</option>
                  <option value="percent">Percentage</option>
                </NativeSelect>
              </label>
            </div>
            {line.method === "unit" ? (
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="space-y-2 text-sm">
                  Price revision
                  <NativeSelect
                    className="h-11"
                    aria-label="Price revision"
                    value={line.priceBookVersionId}
                    onChange={(event) => {
                      const revision = revisions.find((item) => item.id === event.target.value);
                      setLines((current) =>
                        current.map((item) => {
                          if (item.key !== line.key) return item;
                          const previous = revisions.find(
                            (candidate) => candidate.id === item.priceBookVersionId,
                          );
                          const descriptionUntouched =
                            item.description.length === 0 ||
                            item.description === previous?.description;
                          return {
                            ...item,
                            priceBookVersionId: event.target.value,
                            description: descriptionUntouched
                              ? revision?.description || ""
                              : item.description,
                            trade: revision?.trade || item.trade,
                            unit: revision?.unit || item.unit,
                          };
                        }),
                      );
                    }}
                  >
                    <option value="">Choose a revision</option>
                    {revisions.map((revision) => (
                      <option key={revision.id} value={revision.id}>
                        {revision.label}
                      </option>
                    ))}
                  </NativeSelect>
                </label>
                <label className="space-y-2 text-sm">
                  Quantity
                  <Input
                    className="h-11"
                    value={line.quantity}
                    onChange={(event) =>
                      setLines((current) =>
                        current.map((item) =>
                          item.key === line.key ? { ...item, quantity: event.target.value } : item,
                        ),
                      )
                    }
                  />
                </label>
              </div>
            ) : null}
            {line.method === "fixed" ? (
              <label className="space-y-2 text-sm">
                Fixed amount (CAD)
                <Input
                  className="h-11"
                  value={line.fixedDollars}
                  onChange={(event) =>
                    setLines((current) =>
                      current.map((item) =>
                        item.key === line.key ? { ...item, fixedDollars: event.target.value } : item,
                      ),
                    )
                  }
                />
              </label>
            ) : null}
            {line.method === "percent" ? (
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="space-y-2 text-sm">
                  Basis points
                  <Input
                    className="h-11"
                    value={line.basisPoints}
                    onChange={(event) =>
                      setLines((current) =>
                        current.map((item) =>
                          item.key === line.key ? { ...item, basisPoints: event.target.value } : item,
                        ),
                      )
                    }
                  />
                </label>
                <label className="space-y-2 text-sm">
                  Applies to
                  <NativeSelect
                    className="h-11"
                    value={line.basisCategory}
                    onChange={(event) =>
                      setLines((current) =>
                        current.map((item) =>
                          item.key === line.key
                            ? { ...item, basisCategory: event.target.value as LineDraft["basisCategory"] }
                            : item,
                        ),
                      )
                    }
                  >
                    {CATEGORIES.map((category) => (
                      <option key={category} value={category}>
                        {category}
                      </option>
                    ))}
                  </NativeSelect>
                </label>
              </div>
            ) : null}
            <label className="space-y-2 text-sm">
              Source citation
              <NativeSelect
                className="h-11"
                value={line.citationId}
                onChange={(event) =>
                  setLines((current) =>
                    current.map((item) =>
                      item.key === line.key ? { ...item, citationId: event.target.value } : item,
                    ),
                  )
                }
              >
                <option value="">No citation</option>
                {citations.map((citation) => (
                  <option key={citation.id} value={citation.id}>
                    {citation.label}
                  </option>
                ))}
              </NativeSelect>
            </label>
            {alternates.length ? (
              <label className="space-y-2 text-sm">
                Alternate
                <NativeSelect
                  className="h-11"
                  value={line.alternateKey}
                  onChange={(event) =>
                    setLines((current) =>
                      current.map((item) =>
                        item.key === line.key ? { ...item, alternateKey: event.target.value } : item,
                      ),
                    )
                  }
                >
                  <option value="">Base scope</option>
                  {alternates.map((alternate) => (
                    <option key={alternate.key} value={alternate.key}>
                      {alternate.name || "Untitled alternate"}
                    </option>
                  ))}
                </NativeSelect>
              </label>
            ) : null}
            <label className="flex min-h-11 items-center gap-2 text-sm">
              <input
                type="checkbox"
                className="size-4 accent-primary"
                checked={line.taxable}
                onChange={(event) =>
                  setLines((current) =>
                    current.map((item) =>
                      item.key === line.key ? { ...item, taxable: event.target.checked } : item,
                    ),
                  )
                }
              />
              Taxable
            </label>
          </div>
        ))}
      </div>

      <div className="space-y-3">
        <div className="flex items-center justify-between gap-3">
          <h3 className="text-sm font-medium">Clauses</h3>
          <button
            type="button"
            className="text-sm font-medium underline underline-offset-4"
            onClick={() =>
              setClauses((current) => [
                ...current,
                { key: crypto.randomUUID(), kind: "inclusion", text: "" },
              ])
            }
          >
            Add clause
          </button>
        </div>
        {clauses.map((clause) => (
          <div key={clause.key} className="grid gap-3 sm:grid-cols-[10rem_1fr]">
            <NativeSelect
              className="h-11"
              aria-label="Clause type"
              value={clause.kind}
              onChange={(event) =>
                setClauses((current) =>
                  current.map((item) =>
                    item.key === clause.key
                      ? { ...item, kind: event.target.value as ClauseDraft["kind"] }
                      : item,
                  ),
                )
              }
            >
              <option value="inclusion">Inclusion</option>
              <option value="exclusion">Exclusion</option>
              <option value="assumption">Assumption</option>
            </NativeSelect>
            <Input
              className="h-11"
              aria-label="Clause text"
              value={clause.text}
              onChange={(event) =>
                setClauses((current) =>
                  current.map((item) =>
                    item.key === clause.key ? { ...item, text: event.target.value } : item,
                  ),
                )
              }
            />
          </div>
        ))}
      </div>

      <div className="space-y-3">
        <div className="flex items-center justify-between gap-3">
          <h3 className="text-sm font-medium">Alternates</h3>
          <button
            type="button"
            className="text-sm font-medium underline underline-offset-4"
            onClick={() =>
              setAlternates((current) => [
                ...current,
                { key: crypto.randomUUID(), name: "", description: "", included: false },
              ])
            }
          >
            Add alternate
          </button>
        </div>
        {alternates.map((alternate) => (
          <div key={alternate.key} className="grid gap-3 rounded-lg border p-3">
            <Input
              className="h-11"
              aria-label="Alternate name"
              placeholder="Alternate name"
              value={alternate.name}
              onChange={(event) =>
                setAlternates((current) =>
                  current.map((item) =>
                    item.key === alternate.key ? { ...item, name: event.target.value } : item,
                  ),
                )
              }
            />
            <Input
              className="h-11"
              aria-label="Alternate description"
              placeholder="Description"
              value={alternate.description}
              onChange={(event) =>
                setAlternates((current) =>
                  current.map((item) =>
                    item.key === alternate.key ? { ...item, description: event.target.value } : item,
                  ),
                )
              }
            />
            <label className="flex min-h-11 items-center gap-2 text-sm">
              <input
                type="checkbox"
                className="size-4 accent-primary"
                checked={alternate.included}
                onChange={(event) =>
                  setAlternates((current) =>
                    current.map((item) =>
                      item.key === alternate.key ? { ...item, included: event.target.checked } : item,
                    ),
                  )
                }
              />
              Include in the base total
            </label>
          </div>
        ))}
      </div>

      <div className="space-y-3">
        <div className="flex items-center justify-between gap-3">
          <h3 className="text-sm font-medium">Job packages</h3>
          <button
            type="button"
            className="text-sm font-medium underline underline-offset-4"
            onClick={() => setPackages((current) => [...current, blankPackage(current.length)])}
          >
            Add job package
          </button>
        </div>
        {packages.map((pkg) => (
          <div key={pkg.key} className="grid gap-3 rounded-lg border p-3 sm:grid-cols-2">
            <Input
              className="h-11"
              aria-label="Job package name"
              value={pkg.name}
              onChange={(event) =>
                setPackages((current) =>
                  current.map((item) =>
                    item.key === pkg.key ? { ...item, name: event.target.value } : item,
                  ),
                )
              }
            />
            <Input
              className="h-11"
              aria-label="Job package trade"
              value={pkg.trade}
              onChange={(event) =>
                setPackages((current) =>
                  current.map((item) =>
                    item.key === pkg.key ? { ...item, trade: event.target.value } : item,
                  ),
                )
              }
            />
            <Input
              className="h-11 sm:col-span-2"
              aria-label="Job package scope"
              value={pkg.scope}
              onChange={(event) =>
                setPackages((current) =>
                  current.map((item) =>
                    item.key === pkg.key ? { ...item, scope: event.target.value } : item,
                  ),
                )
              }
            />
            <Input
              className="h-11"
              aria-label="Work area"
              value={pkg.workAreaName}
              onChange={(event) =>
                setPackages((current) =>
                  current.map((item) =>
                    item.key === pkg.key ? { ...item, workAreaName: event.target.value } : item,
                  ),
                )
              }
            />
            <Input
              className="h-11"
              aria-label="Starter task"
              value={pkg.taskTitle}
              onChange={(event) =>
                setPackages((current) =>
                  current.map((item) =>
                    item.key === pkg.key ? { ...item, taskTitle: event.target.value } : item,
                  ),
                )
              }
            />
          </div>
        ))}
      </div>

      <ActionForm action={saveEstimateVersion} className="flex flex-wrap gap-2">
        <input type="hidden" name="estimateId" value={estimateId} />
        <input type="hidden" name="baseVersionNumber" value={String(baseVersionNumber)} />
        <input type="hidden" name="payload" value={payload} />
        <input type="hidden" name="intent" value="save" />
        <SubmitButton variant="default" className="min-h-11" pendingLabel="Creating…">
          Create version {nextVersion}
        </SubmitButton>
      </ActionForm>
      <ActionForm action={saveEstimateVersion} className="flex flex-wrap gap-2">
        <input type="hidden" name="estimateId" value={estimateId} />
        <input type="hidden" name="baseVersionNumber" value={String(baseVersionNumber)} />
        <input type="hidden" name="payload" value={payload} />
        <input type="hidden" name="intent" value="preview" />
        <SubmitButton className="min-h-11" pendingLabel="Previewing…">
          Preview totals
        </SubmitButton>
      </ActionForm>
      <ActionForm action={discardEstimateDraft}>
        <input type="hidden" name="estimateId" value={estimateId} />
        <SubmitButton className="min-h-11" pendingLabel="Discarding…">
          Discard
        </SubmitButton>
      </ActionForm>
    </div>
  );
}
