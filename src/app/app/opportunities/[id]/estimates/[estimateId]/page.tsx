import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { EstimateApprovalPanel } from "@/components/ops/estimate-approval-panel";
import { ProposalPanel } from "@/components/ops/proposal-panel";
import { EstimateEditor } from "@/components/ops/estimate-editor";
import { EstimateJobPackages } from "@/components/ops/estimate-job-packages";
import { EstimateVersionDiff } from "@/components/ops/estimate-version-diff";
import { PageHeader } from "@/components/ops/page-header";
import { RecentVisit } from "@/components/ops/recent-visit";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getOpsSession } from "@/lib/ops/auth";
import { resolveCommercialAccess } from "@/lib/ops/commercial-authorization";
import { evaluateApprovalRules } from "@/lib/ops/estimate-approvals";
import { proposalLifecycleStatus } from "@/lib/ops/proposals";
import { compareEstimateVersions } from "@/lib/ops/estimates";
import { formatUnitPrice, priceBookUnitLabel } from "@/lib/ops/price-book";
import {
  getEstimate,
  listCommercialApprovalRules,
  listEstimateApprovals,
  listEstimateCitations,
  listEstimateGraphs,
  listPriceBookItems,
  listPriceBookVersions,
  listProposalEvents,
  listProposals,
} from "@/lib/ops/store";

export const dynamic = "force-dynamic";

const CATEGORY_LABELS: Record<string, string> = {
  labor: "Labor",
  material: "Material",
  equipment: "Equipment",
  subcontractor: "Subcontractor",
  allowance: "Allowance",
};

export default async function EstimateWorkspacePage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string; estimateId: string }>;
  searchParams: Promise<{ version?: string; compare?: string }>;
}) {
  const session = await getOpsSession();
  if (!session) redirect("/app/login");
  const readAccess = resolveCommercialAccess(session, "estimate.read");
  if (!readAccess.ok) {
    return (
      <p className="text-sm text-muted-foreground">You do not have access to estimates.</p>
    );
  }
  const { id, estimateId } = await params;
  const query = await searchParams;
  const estimate = await getEstimate(estimateId);
  if (!estimate || estimate.opportunityId !== id || estimate.organizationId !== readAccess.organizationId) {
    notFound();
  }
  const graphs = await listEstimateGraphs(estimate.id);
  if (!graphs.length) notFound();
  const requested = Number(query.version);
  const selected =
    graphs.find((graph) => graph.versionNumber === requested) ?? graphs[graphs.length - 1];
  const compareNumber = Number(query.compare);
  const compared = graphs.find((graph) => graph.versionNumber === compareNumber);
  const diff =
    compared && compared.versionId !== selected.versionId
      ? compareEstimateVersions(selected, compared)
      : null;
  const [items, versions, citations, rules, approvals] = await Promise.all([
    listPriceBookItems({ includeInactive: true }),
    listPriceBookVersions(),
    listEstimateCitations(readAccess.organizationId),
    listCommercialApprovalRules(readAccess.organizationId),
    listEstimateApprovals(estimate.id),
  ]);
  const now = new Date();
  const approval = evaluateApprovalRules({
    now,
    organizationId: estimate.organizationId,
    versionId: selected.versionId,
    contentHash: selected.contentHash,
    totalCents: selected.totalCents,
    rules,
    decisions: approvals,
  });
  const previous = graphs.find((graph) => graph.versionNumber === selected.versionNumber - 1);
  const approvalDiff = previous ? compareEstimateVersions(previous, selected) : null;
  const canApprove = resolveCommercialAccess(session, "estimate.approve").ok;
  const canDeliver = resolveCommercialAccess(session, "proposal.deliver").ok;
  const proposalRows = await listProposals(estimate.id);
  const proposalEvents = await Promise.all(
    proposalRows.map(async (proposal) => ({
      proposal,
      events: await listProposalEvents(proposal.id),
    })),
  );
  const proposalSummaries = proposalEvents.map(({ proposal, events }) => ({
    id: proposal.id,
    estimateVersionId: proposal.estimateVersionId,
    versionNumber: proposal.versionNumber,
    createdAt: proposal.createdAt.toISOString(),
    expiresAt: proposal.expiresAt.toISOString(),
    status: proposalLifecycleStatus(proposal, events, now),
    events: events.map((event) => ({
      id: event.id,
      kind: event.kind,
      createdAt: event.createdAt.toISOString(),
      actorEmail: event.actorEmail,
      recipientName: event.recipientName,
      recipientEmail: event.recipientEmail,
      channel: event.channel,
      externalMessageId: event.externalMessageId,
    })),
  }));
  const revisions = versions
    .filter((version) => version.status === "approved")
    .filter((version) => items.find((item) => item.id === version.itemId)?.active)
    .map((version) => ({
      id: version.id,
      label: `${version.description} · v${version.versionNumber} · ${formatUnitPrice(version.unitPriceCents)} / ${priceBookUnitLabel(version.unit)}`,
      trade: version.trade,
      unit: version.unit,
      description: version.description,
    }));
  const citationOptions = citations.map((citation) => ({
    ...citation,
    label: `${citation.sheetLabel ?? "Page"} ${citation.pageNumber}`,
    sheetLabel: citation.sheetLabel ?? null,
  }));
  const latest = graphs[graphs.length - 1];
  const canEdit = resolveCommercialAccess(session, "estimate.edit").ok;
  const grouped = new Map<string, typeof selected.lines>();
  for (const line of selected.lines) {
    const bucket = grouped.get(line.category) ?? [];
    bucket.push(line);
    grouped.set(line.category, bucket);
  }

  return (
    <div className="space-y-6">
      <RecentVisit title={`${estimate.number} · ${estimate.title}`} />
      <PageHeader
        crumbs={[
          { href: "/app/opportunities", label: "Opportunities" },
          { href: `/app/opportunities/${id}`, label: "Opportunity" },
          { label: estimate.number },
        ]}
        title={estimate.title}
        description={`${estimate.number} · version ${selected.versionNumber} · ${formatUnitPrice(selected.totalCents)}`}
      />

      <Card>
        <CardHeader>
          <CardTitle>Versions</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex flex-wrap gap-2">
            {graphs.map((graph) => (
              <Link
                key={graph.versionId}
                href={`/app/opportunities/${id}/estimates/${estimate.id}?version=${graph.versionNumber}`}
                className="rounded-md border px-3 py-2 text-sm font-medium"
                aria-current={graph.versionId === selected.versionId ? "page" : undefined}
              >
                Version {graph.versionNumber}
              </Link>
            ))}
          </div>
          <div className="flex flex-wrap gap-2 text-sm">
            <span className="text-muted-foreground">Compare with</span>
            {graphs
              .filter((graph) => graph.versionId !== selected.versionId)
              .map((graph) => (
                <Link
                  key={`compare-${graph.versionId}`}
                  href={`/app/opportunities/${id}/estimates/${estimate.id}?version=${selected.versionNumber}&compare=${graph.versionNumber}`}
                  className="underline underline-offset-4"
                >
                  Version {graph.versionNumber}
                </Link>
              ))}
          </div>
          {diff && compared ? (
            <EstimateVersionDiff
              fromVersion={selected.versionNumber}
              toVersion={compared.versionNumber}
              diff={diff}
            />
          ) : null}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Approval</CardTitle>
        </CardHeader>
        <CardContent>
          <EstimateApprovalPanel
            estimateId={estimate.id}
            versionId={selected.versionId}
            versionNumber={selected.versionNumber}
            contentHash={selected.contentHash}
            totalCents={selected.totalCents}
            latestVersionNumber={latest.versionNumber}
            ruleName={approval.rule.name}
            requiredApprovals={approval.requiredApprovals}
            thresholdCents={approval.rule.secondApproverTotalCents}
            status={approval.status}
            decisions={approvals.filter((item) => item.estimateVersionId === selected.versionId)}
            diff={approvalDiff}
            fromVersion={previous?.versionNumber ?? null}
            canDecide={canApprove}
            now={now}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Proposal</CardTitle>
        </CardHeader>
        <CardContent>
          <ProposalPanel
            estimateId={estimate.id}
            versionId={selected.versionId}
            approved={approval.status === "approved"}
            isLatest={selected.versionNumber === latest.versionNumber}
            canDeliver={canDeliver}
            proposals={proposalSummaries}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Lines</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {selected.lines.length === 0 ? (
            <p className="text-sm text-muted-foreground">This version has no lines.</p>
          ) : (
            [...grouped.entries()].map(([category, lines]) => (
              <section key={category}>
                <h2 className="text-sm font-medium">{CATEGORY_LABELS[category] ?? category}</h2>
                <ul className="mt-2 space-y-2">
                  {lines.map((line) => (
                    <li key={line.id} className="flex items-baseline justify-between gap-3 text-sm">
                      <span>
                        {line.description} · {line.method}
                        {line.quantity ? ` · ${line.quantity} ${line.unit ?? ""}` : ""}
                      </span>
                      <span>{formatUnitPrice(line.lineTotalCents)}</span>
                    </li>
                  ))}
                </ul>
              </section>
            ))
          )}
          <p className="text-sm">
            Base {formatUnitPrice(selected.baseSubtotalCents)} · Alternates{" "}
            {formatUnitPrice(selected.alternateTotalCents)} · Overhead{" "}
            {formatUnitPrice(selected.overheadCents)} · Markup {formatUnitPrice(selected.markupCents)} ·
            Tax {formatUnitPrice(selected.taxCents)}
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Clauses and alternates</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          {selected.clauses.length === 0 && selected.alternates.length === 0 ? (
            <p className="text-muted-foreground">No clauses or alternates on this version.</p>
          ) : null}
          {selected.clauses.map((clause) => (
            <p key={clause.id}>
              {clause.kind}: {clause.text}
            </p>
          ))}
          {selected.alternates.map((alternate) => (
            <p key={alternate.id}>
              Alternate {alternate.name}: {alternate.description} ·{" "}
              {alternate.included ? "Included" : "Excluded"}
            </p>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Job packages</CardTitle>
        </CardHeader>
        <CardContent>
          <EstimateJobPackages packages={selected.jobPackages} />
        </CardContent>
      </Card>

      {canEdit ? (
        <Card>
          <CardContent className="pt-6">
            <EstimateEditor
              key={latest.versionId}
              estimateId={estimate.id}
              baseVersionNumber={latest.versionNumber}
              revisions={revisions}
              citations={citationOptions}
              initial={{
                overhead: String(latest.overheadBasisPoints),
                markup: String(latest.markupBasisPoints),
                tax: String(latest.taxBasisPoints),
                clauses: latest.clauses.map((clause) => ({
                  key: clause.id,
                  kind: clause.kind,
                  text: clause.text,
                })),
                alternates: latest.alternates.map((alternate) => ({
                  key: alternate.key,
                  name: alternate.name,
                  description: alternate.description,
                  included: alternate.included,
                })),
                lines: latest.lines.map((line) => ({
                  key: line.id,
                  category: line.category,
                  description: line.description,
                  trade: line.trade,
                  location: line.location ?? "",
                  method: line.method,
                  quantity: line.quantity ?? "1.0000",
                  unit: line.unit ?? "bags",
                  fixedDollars:
                    line.method === "fixed" && line.unitPriceCents != null
                      ? (line.unitPriceCents / 100).toFixed(2)
                      : "",
                  basisPoints: String(line.basisPoints ?? 0),
                  basisCategory: line.basisCategories[0] ?? "material",
                  taxable: line.taxable,
                  alternateKey: line.alternateKey ?? "",
                  priceBookVersionId: line.priceBookVersionId ?? "",
                  citationId:
                    latest.sources.find((source) => source.lineId === line.id)?.chunkId ?? "",
                })),
                packages: latest.jobPackages.map((pkg) => ({
                  key: pkg.key,
                  name: pkg.name,
                  trade: pkg.trade,
                  scope: pkg.scope,
                  workAreaName: pkg.workAreas[0]?.name ?? "",
                  taskTitle: pkg.tasks[0]?.title ?? "",
                })),
              }}
            />
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
