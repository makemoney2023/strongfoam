import type { Metadata } from "next";
import { EstimateSurvey } from "@/components/estimate-survey/estimate-survey";
import { site } from "@/content/site";

export const metadata: Metadata = {
  title: "Request an estimate",
  description:
    "Tell Strong Foam about your Ontario ICI or multi-unit envelope and fire-protection scope. Estimating reviews drawings and follows up.",
  alternates: { canonical: "/request-estimate" },
};

export default function RequestEstimatePage() {
  return (
    <main className="flex-1 bg-[color:var(--sf-ink)]">
      <EstimateSurvey />
      <p className="sr-only">
        You can also call {site.phoneDisplay} or email {site.emailEstimating}.
      </p>
    </main>
  );
}
