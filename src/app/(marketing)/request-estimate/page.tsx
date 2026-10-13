import type { Metadata } from "next";
import Link from "next/link";
import { EstimateSurvey } from "@/components/estimate-survey/estimate-survey";
import { InteriorHero } from "@/components/marketing/interior-hero";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { assertMarketingClaimsSafe } from "@/content/claims";
import { site } from "@/content/site";

export const metadata: Metadata = {
  title: "Request an Estimate or Ask a Question",
  description:
    "Start a project estimate with Strong Foam or use the public contact channels for a general inquiry about the company and its services.",
  alternates: { canonical: "/request-estimate" },
  openGraph: {
    title: "Request an Estimate or Ask a Question",
    description:
      "Start a project estimate or contact Strong Foam with a general inquiry.",
    url: "/request-estimate",
    type: "website",
  },
  twitter: {
    card: "summary",
    title: "Request an Estimate or Ask a Question",
    description:
      "Start a project estimate or contact Strong Foam with a general inquiry.",
  },
};

assertMarketingClaimsSafe(metadata, "metadata /request-estimate");

export default function RequestEstimatePage() {
  return (
    <main id="main-content" className="flex-1 bg-[color:var(--sf-ink)]">
      <InteriorHero
        eyebrow="Shared intake"
        title="Request an estimate or ask a question"
        description="Use the survey below for a project estimate. For a general inquiry, call or email the public team."
      />
      <section
        className="marketing-section page-rail"
        aria-labelledby="request-paths-title"
      >
        <div className="marketing-section__intro">
          <p className="section-kicker">Choose the current path</p>
          <h2 id="request-paths-title">Project details or a general question</h2>
        </div>
        <div className="marketing-card-grid">
          <Card className="marketing-card">
            <CardHeader>
              <CardTitle>
                <h3>Project estimate</h3>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p>
                Continue to the survey for project type, location, service
                scope, timing, drawings, and contact details.
              </p>
            </CardContent>
          </Card>
          <Card className="marketing-card">
            <CardHeader>
              <CardTitle>
                <h3>General inquiry</h3>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p>
                Call{" "}
                <Link href={`tel:${site.phoneE164}`}>{site.phoneDisplay}</Link>{" "}
                or email{" "}
                <Link href={`mailto:${site.emailEstimating}`}>
                  {site.emailEstimating}
                </Link>
                .
              </p>
            </CardContent>
          </Card>
        </div>
      </section>
      <EstimateSurvey />
    </main>
  );
}
