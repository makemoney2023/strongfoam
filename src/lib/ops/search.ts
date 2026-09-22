import { formatJobNumber, JOB_STATUS_LABELS } from "@/lib/ops/jobs";
import { matchesQuery } from "@/lib/ops/filters";
import {
  listCompanies,
  listContacts,
  listEstimateRequests,
  listJobs,
  listOpportunities,
  listPriceBookItems,
  listProjects,
} from "@/lib/ops/store";
import { formatUnitPrice, priceBookTradeLabel, priceBookUnitLabel } from "@/lib/ops/price-book";
import {
  SEARCH_KIND_LABELS,
  type SearchHit,
  type SearchHitKind,
} from "@/lib/ops/search-hits";
import {
  formatCompany,
  formatFullName,
  formatRequestNumber,
  WORKFLOW_LABELS,
} from "@/lib/ops/workflow";

export { SEARCH_KIND_LABELS, type SearchHit, type SearchHitKind };

export async function searchOps(query: string, limit = 8): Promise<SearchHit[]> {
  const q = query.trim();
  if (q.length < 1) return [];

  const [companies, contacts, requests, opportunities, projects, jobs, priceBook] =
    await Promise.all([
      listCompanies({ q }),
      listContacts(),
      listEstimateRequests({ q }),
      listOpportunities({ q }),
      listProjects({ q }),
      listJobs({ q }),
      listPriceBookItems({ q, includeInactive: true }),
    ]);

  const hits: SearchHit[] = [];

  for (const company of companies) {
    hits.push({
      kind: "company",
      id: company.id,
      href: `/app/companies/${company.id}`,
      title: company.name,
      subtitle: [company.city, company.province].filter(Boolean).join(", ") || "Company",
    });
  }

  for (const contact of contacts) {
    if (
      !matchesQuery(q, [
        contact.firstName,
        contact.lastName,
        contact.email,
        contact.phone,
        contact.role,
      ])
    ) {
      continue;
    }
    hits.push({
      kind: "contact",
      id: contact.id,
      href: `/app/companies/${contact.companyId}`,
      title: formatFullName(contact.firstName, contact.lastName),
      subtitle: contact.email || contact.role || "Contact",
    });
  }

  for (const request of requests) {
    hits.push({
      kind: "request",
      id: request.id,
      href: `/app/requests/${request.id}`,
      title: formatCompany(
        request.company,
        formatFullName(request.firstName, request.lastName),
      ),
      subtitle: `${formatRequestNumber(request.id)} · ${
        WORKFLOW_LABELS[request.workflowStatus as keyof typeof WORKFLOW_LABELS] ??
        request.workflowStatus
      }`,
    });
  }

  for (const opportunity of opportunities) {
    hits.push({
      kind: "opportunity",
      id: opportunity.id,
      href: `/app/opportunities/${opportunity.id}`,
      title: opportunity.name,
      subtitle: opportunity.stage,
    });
  }

  for (const project of projects) {
    hits.push({
      kind: "project",
      id: project.id,
      href: `/app/projects/${project.id}`,
      title: project.name,
      subtitle: project.status,
    });
  }

  for (const job of jobs) {
    hits.push({
      kind: "job",
      id: job.id,
      href: `/app/jobs/${job.id}`,
      title: job.name,
      subtitle: `${formatJobNumber(job.id)} · ${
        JOB_STATUS_LABELS[job.status as keyof typeof JOB_STATUS_LABELS] ?? job.status
      }`,
    });
  }

  for (const item of priceBook) {
    hits.push({
      kind: "price_book",
      id: item.id,
      href: `/app/price-book#item-${item.id}`,
      title: item.name,
      subtitle: `${priceBookTradeLabel(item.trade)} · ${priceBookUnitLabel(item.unit)} · ${formatUnitPrice(item.unitPriceCents)}`,
    });
  }

  return hits.slice(0, limit);
}
