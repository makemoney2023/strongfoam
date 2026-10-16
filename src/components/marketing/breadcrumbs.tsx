import Link from "next/link";
import { breadcrumbGraph } from "@/lib/site-schema";

export type BreadcrumbItem = {
  label: string;
  href?: string;
};

export function Breadcrumbs({
  items,
}: {
  items: readonly BreadcrumbItem[];
}) {
  return (
    <>
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbGraph(items)).replace(/</g, "\\u003c") }}
    />
    <nav className="marketing-breadcrumbs page-rail" aria-label="Breadcrumb">
      <ol>
        {items.map((item, index) => {
          const isCurrent = index === items.length - 1;
          return (
            <li key={`${item.label}-${item.href ?? "current"}`}>
              {!isCurrent && item.href ? (
                <Link href={item.href}>{item.label}</Link>
              ) : (
                <span aria-current={isCurrent ? "page" : undefined}>
                  {item.label}
                </span>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
    </>
  );
}
