export type SearchHitKind =
  | "company"
  | "contact"
  | "request"
  | "opportunity"
  | "project"
  | "job"
  | "price_book";

export type SearchHit = {
  kind: SearchHitKind;
  id: string;
  href: string;
  title: string;
  subtitle: string;
};

export const SEARCH_KIND_LABELS: Record<SearchHitKind, string> = {
  company: "Company",
  contact: "Contact",
  request: "Request",
  opportunity: "Opportunity",
  project: "Project",
  job: "Job",
  price_book: "Price book",
};
