"use client";

import { useReducer } from "react";
import Image from "next/image";
import Link from "next/link";
import { Menu, PhoneIcon } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { BrandLogo } from "@/components/brand-logo";
import { navLinks } from "@/content/nav";
import { site } from "@/content/site";
import { cn } from "@/lib/utils";
import {
  initialSiteHeaderState,
  siteHeaderReducer,
} from "@/components/site-header-model";

function getEstimateLink() {
  const link = navLinks.find((item) => item.href === "/request-estimate");
  if (!link) {
    throw new Error("Site navigation requires the Request Estimate route.");
  }
  return link;
}

const estimateLink = getEstimateLink();

const sectionLinks = navLinks.filter(
  (link) => link.href !== estimateLink.href,
);

export function SiteHeaderHomeLink() {
  return (
    <Link
      href="/"
      className="relative block h-11 w-[184px] shrink-0"
      aria-label={`${site.brand} home`}
    >
      <Image
        src={site.brandLogos.onDark}
        alt="Strong Foam Insulation"
        fill
        priority
        sizes="184px"
        className="object-contain object-left"
      />
    </Link>
  );
}

export function SiteHeaderNavigation({
  variant,
  onNavigate,
}: {
  variant: "desktop" | "mobile";
  onNavigate?: () => void;
}) {
  return (
    <nav
      className={cn(
        variant === "desktop"
          ? "hidden flex-1 items-center justify-center gap-5 xl:flex 2xl:gap-7"
          : "flex flex-col gap-1 px-4",
      )}
      aria-label={variant === "desktop" ? "Primary" : "Mobile"}
    >
      {sectionLinks.map((link) => (
        <Link
          key={link.href}
          href={link.href}
          onClick={onNavigate}
          className={cn(
            variant === "desktop"
              ? "font-[family-name:var(--font-display)] text-[0.9rem] font-semibold tracking-[0.03em] text-white/90 transition-colors hover:text-[color:var(--sf-cyan)] lg:text-base"
              : "rounded-md px-2 py-3 font-[family-name:var(--font-display)] text-2xl font-semibold tracking-tight text-white/90 hover:text-[color:var(--sf-cyan)]",
          )}
        >
          {link.label}
        </Link>
      ))}
      <Link
        href={estimateLink.href}
        onClick={onNavigate}
        className={cn(
          variant === "desktop"
            ? buttonVariants({ size: "lg" })
            : "rounded-md px-2 py-3 font-[family-name:var(--font-display)] text-2xl font-semibold tracking-tight",
          variant === "desktop"
            ? "h-11 rounded-md bg-[color:var(--sf-red)] px-4 text-base font-semibold text-white hover:bg-[color:var(--sf-red)]/90"
            : "text-[color:var(--sf-red)]",
        )}
      >
        {estimateLink.label}
      </Link>
    </nav>
  );
}

export function SiteHeader() {
  const [state, dispatch] = useReducer(
    siteHeaderReducer,
    initialSiteHeaderState,
  );

  return (
    <header className="fixed inset-x-0 top-0 z-50 border-b border-white/10 bg-[color:var(--sf-ink)]/92 backdrop-blur-xl">
      <div className="page-rail flex h-20 items-center justify-between gap-6">
        <SiteHeaderHomeLink />
        <SiteHeaderNavigation variant="desktop" />
        <div className="flex items-center gap-3">
          <a
            href={`tel:${site.phoneE164}`}
            className="hidden items-center gap-1.5 text-sm font-semibold text-white/70 hover:text-[color:var(--sf-cyan)] sm:inline-flex"
          >
            <PhoneIcon aria-hidden="true" className="size-4" />
            {site.phoneDisplay}
          </a>
          <Sheet
            open={state.mobileOpen}
            onOpenChange={(mobileOpen) =>
              dispatch({ type: mobileOpen ? "open" : "close" })
            }
          >
            <SheetTrigger
              aria-label="Open menu"
              className={cn(
                buttonVariants({ variant: "outline", size: "icon-lg" }),
                "border-white/20 bg-white/5 text-white hover:bg-white/10 hover:text-white xl:hidden",
              )}
            >
              <Menu />
            </SheetTrigger>
            <SheetContent
              side="right"
              className="border-white/10 bg-[color:var(--sf-ink)] text-white"
            >
              <SheetHeader>
                <SheetTitle className="sr-only">{site.brand}</SheetTitle>
                <BrandLogo variant="onDark" className="h-9" />
              </SheetHeader>
              <SiteHeaderNavigation
                variant="mobile"
                onNavigate={() => dispatch({ type: "navigate" })}
              />
              <div className="px-4">
                <a
                  href={`tel:${site.phoneE164}`}
                  className="mt-2 inline-flex items-center gap-2 rounded-md px-2 py-3 text-lg text-white/80"
                >
                  <PhoneIcon aria-hidden="true" className="size-5" />
                  {site.phoneDisplay}
                </a>
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  );
}
