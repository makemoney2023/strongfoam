"use client";

import { useState } from "react";
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
import { navLinks } from "@/content/nav";
import { site } from "@/content/site";
import { cn } from "@/lib/utils";

export function SiteHeader() {
  const [open, setOpen] = useState(false);

  return (
    <header className="fixed inset-x-0 top-0 z-50 border-b border-white/10 bg-[color:var(--sf-ink)]/92 backdrop-blur-xl">
      <div className="page-rail flex h-20 items-center justify-between gap-6">
        <Link
          href="/"
          className="relative block h-11 w-[184px] shrink-0"
          aria-label={`${site.brand} home`}
        >
          <Image
            src="/media/brand/SFI-Logo-Jpeg-EDIT_00-removebg-preview.png"
            alt="Strong Foam Insulation"
            fill
            priority
            sizes="184px"
            className="object-contain object-left"
          />
        </Link>
        <nav
          className="hidden flex-1 items-center justify-center gap-7 md:flex lg:gap-10"
          aria-label="Primary"
        >
          {navLinks.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className="font-[family-name:var(--font-display)] text-[0.95rem] font-semibold tracking-[0.04em] text-white/90 transition-colors hover:text-[color:var(--sf-cyan)] lg:text-lg"
            >
              {link.label}
            </a>
          ))}
        </nav>
        <div className="flex items-center gap-3">
          <a
            href={`tel:${site.phoneE164}`}
            className="hidden items-center gap-1.5 text-sm font-semibold text-white/70 hover:text-[color:var(--sf-cyan)] sm:inline-flex"
          >
            <PhoneIcon aria-hidden="true" className="size-4" />
            {site.phoneDisplay}
          </a>
          <a
            href="/request-estimate"
            className={cn(
              buttonVariants({ size: "lg" }),
              "h-11 rounded-md px-4 text-base font-semibold bg-[color:var(--sf-red,#e8043d)] text-white hover:bg-[color:var(--sf-red,#e8043d)]/90",
            )}
          >
            Request estimate
          </a>
          <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger
              aria-label="Open menu"
              className={cn(
                buttonVariants({ variant: "outline", size: "icon-lg" }),
                "md:hidden border-white/20 bg-white/5 text-white hover:bg-white/10 hover:text-white",
              )}
            >
              <Menu />
            </SheetTrigger>
            <SheetContent
              side="right"
              className="border-white/10 bg-[color:var(--sf-ink)] text-white"
            >
              <SheetHeader>
                <SheetTitle className="font-[family-name:var(--font-display)] text-xl text-white">
                  Strong Foam
                </SheetTitle>
              </SheetHeader>
              <nav className="flex flex-col gap-1 px-4" aria-label="Mobile">
                {navLinks.map((link) => (
                  <a
                    key={link.href}
                    href={link.href}
                    onClick={() => setOpen(false)}
                    className="rounded-md px-2 py-3 font-[family-name:var(--font-display)] text-2xl font-semibold tracking-tight text-white/90 hover:text-[color:var(--sf-cyan)]"
                  >
                    {link.label}
                  </a>
                ))}
                <a
                  href="/request-estimate"
                  onClick={() => setOpen(false)}
                  className="rounded-md px-2 py-3 font-[family-name:var(--font-display)] text-2xl font-semibold tracking-tight text-[color:var(--sf-red,#e8043d)]"
                >
                  Request estimate
                </a>
                <a
                  href={`tel:${site.phoneE164}`}
                  className="mt-2 inline-flex items-center gap-2 rounded-md px-2 py-3 text-lg text-white/80"
                >
                  <PhoneIcon aria-hidden="true" className="size-5" />
                  {site.phoneDisplay}
                </a>
              </nav>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  );
}
