import type { Metadata } from "next";
import { PhoneIcon } from "lucide-react";
import { CalendlyEmbed } from "@/components/estimate-survey/calendly-embed";
import { buttonVariants } from "@/components/ui/button";
import { site } from "@/content/site";
import { getLeadById } from "@/lib/leads/adapters";
import { resolveThanksView } from "@/app/(marketing)/request-estimate/thanks/resolve-thanks-view";
import { cn } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Request received",
  robots: { index: false, follow: false },
};

async function thanksView(lid?: string, k?: string) {
  const secret = process.env.LEAD_THANKS_SECRET;
  if (!lid || !k || !secret) return { showCalendly: false as const };
  try {
    return await resolveThanksView({
      lid,
      k,
      secret,
      loadLead: getLeadById,
    });
  } catch {
    return { showCalendly: false as const };
  }
}

export default async function ThanksPage({
  searchParams,
}: {
  searchParams: Promise<{ lid?: string; k?: string }>;
}) {
  const params = await searchParams;
  const view = await thanksView(params.lid, params.k);
  const calendlyUrl = process.env.NEXT_PUBLIC_CALENDLY_URL;

  return (
    <main className="flex-1 bg-[color:var(--sf-ink)]">
      <div className="mx-auto w-full max-w-2xl px-4 py-28">
        <p className="section-kicker mb-3">Thank you</p>
        <h1 className="font-heading mb-4 text-3xl font-semibold tracking-tight text-white sm:text-4xl">
          We received your estimate request
        </h1>
        {view.showCalendly ? (
          <p className="text-white/75">Book a call with estimating.</p>
        ) : (
          <p className="text-white/75">
            Estimating will follow up. This form does not book a visit.
          </p>
        )}
        <div className="mt-8 flex flex-wrap items-center gap-3">
          <a
            href={`tel:${site.phoneE164}`}
            className={cn(
              buttonVariants({ size: "lg", variant: "outline" }),
              "brand-button brand-button--outline",
            )}
          >
            <PhoneIcon aria-hidden="true" />
            {site.phoneDisplay}
          </a>
          <a
            href={`mailto:${site.emailEstimating}`}
            className="text-sm text-[color:var(--sf-cyan)] underline-offset-4 hover:underline"
          >
            {site.emailEstimating}
          </a>
        </div>
        {view.showCalendly && view.email && calendlyUrl ? (
          <CalendlyEmbed
            name={view.name ?? ""}
            email={view.email}
            url={calendlyUrl}
          />
        ) : null}
      </div>
    </main>
  );
}
