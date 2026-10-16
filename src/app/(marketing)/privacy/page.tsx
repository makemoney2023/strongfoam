import { pageMetadata } from "@/lib/page-metadata";
import type { Metadata } from "next";
import { LegalDocumentView } from "@/components/legal/legal-document";
import { Breadcrumbs } from "@/components/marketing/breadcrumbs";
import { InteriorHero } from "@/components/marketing/interior-hero";
import { assertMarketingClaimsSafe } from "@/content/claims";
import { privacyPolicy } from "@/content/legal";

export const metadata: Metadata = pageMetadata({
  title: "Privacy Policy",
  description:
    "How Strong Foam Insulation Inc. collects, uses and protects personal information under PIPEDA, including estimate requests, contact forms and uploaded files.",
  alternates: { canonical: "/privacy" },
});

assertMarketingClaimsSafe(metadata, "metadata /privacy");

export default function PrivacyPage() {
  return (
    <main id="main-content" className="flex-1">
      <Breadcrumbs items={[{ label: "Home", href: "/" }, { label: "Privacy Policy" }]} />
      <InteriorHero
        eyebrow="Legal"
        title="Privacy Policy"
        description="How we collect, use, share and protect the information you give us."
      />
      <LegalDocumentView doc={privacyPolicy} />
    </main>
  );
}
