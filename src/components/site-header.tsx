"use client";

import Image from "next/image";
import Link from "next/link";
import { PhoneIcon } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { site } from "@/content/site";
import { cn } from "@/lib/utils";

const links = [
  { href: "/#services", label: "Services" },
  { href: "/#sectors", label: "Sectors" },
  { href: "/#projects", label: "Projects" },
  { href: "/#coverage", label: "Coverage" },
  { href: "/#faq", label: "FAQ" },
  { href: "/#contact", label: "Contact" },
];

export function SiteHeader() {
  return (
    <header className="fixed inset-x-0 top-0 z-50 border-b border-white/10 bg-[color:var(--sf-ink)]/88 backdrop-blur-xl">
      <div className="mx-auto flex h-[4.5rem] max-w-[88rem] items-center justify-between gap-4 px-4 sm:px-6 lg:px-10">
        <Link
          href="/"
          className="relative block h-10 w-[166px] shrink-0"
          aria-label={`${site.brand} home`}
        >
          <Image
            src="/media/brand/SFI-Logo-Jpeg-EDIT_00-removebg-preview.png"
            alt="Strong Foam Insulation"
            fill
            priority
            sizes="166px"
            className="object-contain object-left"
          />
        </Link>
        <nav className="hidden items-center gap-6 md:flex" aria-label="Primary">
          {links.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className="text-sm text-white/70 transition-colors hover:text-[color:var(--sf-cyan)]"
            >
              {link.label}
            </a>
          ))}
        </nav>
        <div className="flex items-center gap-3">
          <a
            href={`tel:${site.phoneE164}`}
            className="hidden items-center gap-1.5 text-sm text-white/70 hover:text-[color:var(--sf-cyan)] sm:inline-flex"
          >
            <PhoneIcon aria-hidden="true" className="size-4" />
            {site.phoneDisplay}
          </a>
          <a
            href="/request-estimate"
            className={cn(
              buttonVariants({ size: "default" }),
              "bg-[color:var(--sf-red,#e8043d)] text-white hover:bg-[color:var(--sf-red,#e8043d)]/90",
            )}
          >
            Request estimate
          </a>
        </div>
      </div>
    </header>
  );
}
