"use client";

import Image from "next/image";
import { useLayoutEffect, useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { PhoneIcon } from "lucide-react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { buttonVariants } from "@/components/ui/button";
import {
  faqItems,
  productBrands,
  scrollSections,
  services,
  site,
} from "@/content/site";
import { cn } from "@/lib/utils";

const processSteps = [
  {
    number: "01",
    title: "Read the assembly",
    copy: "Drawings, specifications, elevations, and package scope give estimating the complete picture.",
  },
  {
    number: "02",
    title: "Align the system",
    copy: "Material family, substrate, fire design, and envelope transitions are checked against the specified assembly.",
  },
  {
    number: "03",
    title: "Plan the field",
    copy: "Access, sequencing, protection, and schedule constraints are carried into mobilization.",
  },
  {
    number: "04",
    title: "Execute the detail",
    copy: "Qualified applicators install the scope with safety, communication, and field conditions in view.",
  },
] as const;

const projects = [
  {
    name: "Multi-unit residential",
    scope: "Envelope execution",
    image: "/media/projects/SFI1007.jpg",
  },
  {
    name: "Spray foam application",
    scope: "Wall assembly",
    image: "/media/projects/SFI1006.jpeg",
  },
  {
    name: "Commercial / ICI",
    scope: "Building envelope",
    image: "/media/projects/IMG_7880.jpeg",
  },
] as const;

function sectionCopy(id: string) {
  const section = scrollSections.find((item) => item.id === id);
  if (!section) throw new Error(`Missing section copy: ${id}`);
  return section;
}

function SplitHeadline({
  children,
  className,
}: {
  children: string;
  className?: string;
}) {
  return (
    <span className={className} aria-label={children}>
      {children.split(" ").map((word, index) => (
        <span
          className="hero-word-mask"
          aria-hidden="true"
          key={`${word}-${index}`}
        >
          <span data-hero-word className="hero-word">
            {word}&nbsp;
          </span>
        </span>
      ))}
    </span>
  );
}

function SectionIntro({
  id,
  align = "lead",
}: {
  id: string;
  align?: "lead" | "trail";
}) {
  const section = sectionCopy(id);
  return (
    <div
      className={cn(
        "section-intro max-w-3xl",
        align === "trail" && "ml-auto text-right",
      )}
    >
      {section.eyebrow ? (
        <p data-reveal-item className="section-kicker">
          {section.eyebrow}
        </p>
      ) : null}
      <h2 data-reveal-heading className="section-heading">
        {section.headline}
      </h2>
      {section.support ? (
        <p
          data-reveal-item
          className={cn(
            "section-support",
            align === "trail" && "ml-auto",
          )}
        >
          {section.support}
        </p>
      ) : null}
    </div>
  );
}

export function ScrollWorldPage() {
  const root = useRef<HTMLDivElement>(null);
  const hero = sectionCopy("hero");

  useLayoutEffect(() => {
    gsap.registerPlugin(ScrollTrigger);

    const context = gsap.context(() => {
      const reduced = window.matchMedia(
        "(prefers-reduced-motion: reduce)",
      ).matches;

      if (reduced) {
        gsap.set(
          "[data-hero-word], [data-hero-meta], [data-reveal-heading], [data-reveal-item], [data-project]",
          { clearProps: "all" },
        );
        return;
      }

      const heroIntro = gsap.timeline({ defaults: { ease: "power4.out" } });
      heroIntro
        .from("[data-hero-word]", {
          yPercent: 115,
          rotate: 2,
          duration: 1.05,
          stagger: 0.055,
        })
        .from(
          "[data-hero-meta]",
          { y: 22, autoAlpha: 0, duration: 0.7, stagger: 0.08 },
          "-=0.5",
        );

      gsap.to("[data-hero-media]", {
        scale: 1.1,
        yPercent: 3,
        ease: "none",
        scrollTrigger: {
          trigger: "[data-hero]",
          start: "top top",
          end: "bottom top",
          scrub: 0.7,
        },
      });

      gsap.to("[data-hero-copy]", {
        yPercent: -18,
        autoAlpha: 0,
        ease: "none",
        scrollTrigger: {
          trigger: "[data-hero]",
          start: "55% top",
          end: "bottom top",
          scrub: 0.45,
        },
      });

      const trustLines = gsap.utils.toArray<HTMLElement>("[data-trust-line]");
      gsap.set(trustLines.slice(1), { autoAlpha: 0, y: 34 });
      const trustTimeline = gsap.timeline({
        scrollTrigger: {
          trigger: "[data-trust]",
          start: "top top",
          end: "bottom bottom",
          scrub: 0.6,
        },
      });
      trustLines.forEach((line, index) => {
        if (index > 0) {
          trustTimeline.to(trustLines[index - 1], {
            autoAlpha: 0,
            y: -34,
            duration: 0.22,
          });
          trustTimeline.to(
            line,
            { autoAlpha: 1, y: 0, duration: 0.3 },
            "<0.08",
          );
        }
      });

      const servicesTrack =
        root.current?.querySelector<HTMLElement>("[data-services-track]");
      const servicesFrame =
        root.current?.querySelector<HTMLElement>("[data-services-frame]");
      if (servicesTrack && servicesFrame && window.innerWidth >= 900) {
        const distance = () =>
          Math.max(0, servicesTrack.scrollWidth - window.innerWidth + 96);
        gsap.to(servicesTrack, {
          x: () => -distance(),
          ease: "none",
          scrollTrigger: {
            trigger: "[data-services]",
            start: "top top",
            end: () => `+=${distance() + window.innerHeight * 1.2}`,
            pin: servicesFrame,
            scrub: 0.6,
            invalidateOnRefresh: true,
          },
        });
      }

      gsap.from("[data-process-image]", {
        clipPath: "inset(100% 0 0 0)",
        scale: 1.06,
        ease: "none",
        scrollTrigger: {
          trigger: "[data-process]",
          start: "top 75%",
          end: "45% 45%",
          scrub: 0.5,
        },
      });

      gsap.from("[data-process-step]", {
        y: 36,
        autoAlpha: 0,
        duration: 0.65,
        stagger: 0.11,
        ease: "power3.out",
        scrollTrigger: {
          trigger: "[data-process-list]",
          start: "top 78%",
          once: true,
        },
      });

      gsap.to("[data-sector-media]", {
        yPercent: 10,
        scale: 1.08,
        ease: "none",
        scrollTrigger: {
          trigger: "[data-sectors]",
          start: "top bottom",
          end: "bottom top",
          scrub: 0.55,
        },
      });

      gsap.from("[data-sector-line]", {
        xPercent: 18,
        autoAlpha: 0,
        stagger: 0.12,
        ease: "power3.out",
        scrollTrigger: {
          trigger: "[data-sectors-copy]",
          start: "top 72%",
          end: "bottom 45%",
          scrub: 0.4,
        },
      });

      gsap.from("[data-project]", {
        y: 80,
        autoAlpha: 0,
        rotate: 1.5,
        duration: 0.9,
        stagger: 0.14,
        ease: "power4.out",
        scrollTrigger: {
          trigger: "[data-projects-grid]",
          start: "top 72%",
          once: true,
        },
      });

      gsap.fromTo(
        "[data-route-line]",
        { scaleY: 0 },
        {
          scaleY: 1,
          ease: "none",
          scrollTrigger: {
            trigger: "[data-coverage]",
            start: "top 70%",
            end: "bottom 65%",
            scrub: 0.45,
          },
        },
      );

      gsap.utils
        .toArray<HTMLElement>("[data-reveal-section]")
        .forEach((section) => {
          const heading = section.querySelector("[data-reveal-heading]");
          const items = section.querySelectorAll("[data-reveal-item]");
          const timeline = gsap.timeline({
            scrollTrigger: {
              trigger: section,
              start: "top 78%",
              once: true,
            },
          });
          if (heading) {
            timeline.from(heading, {
              yPercent: 38,
              autoAlpha: 0,
              duration: 0.8,
              ease: "power4.out",
            });
          }
          if (items.length) {
            timeline.from(
              items,
              {
                y: 22,
                autoAlpha: 0,
                duration: 0.55,
                stagger: 0.07,
                ease: "power3.out",
              },
              "-=0.45",
            );
          }
        });
    }, root);

    return () => context.revert();
  }, []);

  return (
    <div ref={root} className="scroll-world">
      <div className="page-grain" aria-hidden="true" />

      <section data-hero id="hero" className="hero-act">
        <div className="hero-stage">
          <video
            data-hero-media
            className="hero-media"
            autoPlay
            muted
            loop
            playsInline
            preload="metadata"
            poster="/media/backgrounds/02-SFI1004_00.jpg"
            aria-hidden="true"
          >
            <source
              src="/media/animated/16x9/sf-bg-02-sfi-hero-spray_omni.mp4"
              type="video/mp4"
            />
          </video>
          <div className="hero-corner-scrim" aria-hidden="true" />
          <div data-hero-copy className="hero-copy">
            <p data-hero-meta className="hero-label">
              Commercial envelope + fire protection
            </p>
            <h1 className="hero-title">
              <SplitHeadline>{hero.headline}</SplitHeadline>
            </h1>
            <p data-hero-meta className="hero-support">
              {hero.support}
            </p>
            <div data-hero-meta className="hero-actions">
              <a
                href={hero.cta?.href ?? "#contact"}
                className={cn(
                  buttonVariants({ size: "lg" }),
                  "brand-button brand-button--primary",
                )}
              >
                {hero.cta?.label}
              </a>
              <a
                href="#services"
                className={cn(
                  buttonVariants({ size: "lg", variant: "outline" }),
                  "brand-button brand-button--outline",
                )}
              >
                Explore capabilities
              </a>
            </div>
          </div>
          <p className="hero-edge-note">
            Kitchener · London · GTA
          </p>
        </div>
      </section>

      <section data-trust id="trust" className="trust-act">
        <div className="trust-stage">
          <div className="trust-lines">
            <p data-trust-line>
              Trade-grade specialty for <strong>ICI</strong> and multi-unit
              residential.
            </p>
            <p data-trust-line>
              One coordinated package across <strong>envelope</strong> and fire.
            </p>
            <p data-trust-line>
              Drawings understood. Details carried into the{" "}
              <strong>field</strong>.
            </p>
          </div>
          <p className="trust-footnote">
            Creating Strong Relationships
          </p>
        </div>
      </section>

      <section data-services id="services" className="services-act">
        <div data-services-frame className="services-frame">
          <div data-services-track className="services-track">
            <div className="services-lead">
              <p className="section-kicker">Capabilities</p>
              <h2>Five scopes.<br />One field mindset.</h2>
              <p>
                Vertical scrolling opens the full trade package.
              </p>
            </div>
            {services.map((service, index) => (
              <article
                key={service.id}
                className={cn(
                  "service-panel",
                  index % 2 === 1 && "service-panel--lower",
                )}
              >
                <span>0{index + 1}</span>
                <h3>{service.title}</h3>
                <p>{service.overlay}</p>
                <div className="service-rule" aria-hidden="true" />
              </article>
            ))}
            <div className="services-close">
              <p>Specified systems.</p>
              <p>Coordinated execution.</p>
              <a href="/request-estimate">Send the package →</a>
            </div>
          </div>
        </div>
      </section>

      <section
        data-process
        data-reveal-section
        id="process"
        className="process-act"
      >
        <div className="process-grid">
          <div className="process-copy">
            <SectionIntro id="process" />
            <ol data-process-list className="process-list">
              {processSteps.map((step) => (
                <li data-process-step key={step.number}>
                  <span>{step.number}</span>
                  <div>
                    <h3>{step.title}</h3>
                    <p>{step.copy}</p>
                  </div>
                </li>
              ))}
            </ol>
          </div>
          <figure data-process-image className="process-image">
            <Image
              src="/media/projects/SFI1006.jpeg"
              alt="Strong Foam applicator installing spray foam in a wall assembly"
              fill
              sizes="(max-width: 900px) 100vw, 48vw"
              className="object-cover"
            />
            <figcaption>SPF application · wall assembly</figcaption>
          </figure>
        </div>
      </section>

      <section data-sectors id="sectors" className="sectors-act">
        <video
          data-sector-media
          className="sectors-media"
          autoPlay
          muted
          loop
          playsInline
          preload="metadata"
          poster="/media/backgrounds/07-SFI1007.jpg"
          aria-hidden="true"
        >
          <source
            src="/media/animated/16x9/sf-bg-07-sfi-fireproofing_omni.mp4"
            type="video/mp4"
          />
        </video>
        <div className="sectors-column-scrim" aria-hidden="true" />
        <div data-sectors-copy className="sectors-copy">
          <p data-sector-line className="section-kicker">
            Built for scale
          </p>
          <h2 data-sector-line>
            Commercial.<br />
            Industrial.<br />
            Multi-unit.
          </h2>
          <p data-sector-line>
            High-rise envelopes and ICI packages. Industrial fire protection.
            Multi-unit residential execution.
          </p>
        </div>
      </section>

      <section
        data-reveal-section
        id="projects"
        className="projects-act"
      >
        <SectionIntro id="projects" />
        <div data-projects-grid className="projects-grid">
          {projects.map((project, index) => (
            <figure
              data-project
              key={project.image}
              className={cn(
                "project-frame",
                index === 0 && "project-frame--tall",
                index === 2 && "project-frame--wide",
              )}
            >
              <Image
                src={project.image}
                alt={`${project.name}: ${project.scope}`}
                fill
                sizes={
                  index === 2
                    ? "(max-width: 900px) 100vw, 66vw"
                    : "(max-width: 900px) 100vw, 40vw"
                }
                className="object-cover transition-transform duration-500 hover:scale-[1.025]"
              />
              <figcaption>
                <span>{project.name}</span>
                <span>{project.scope}</span>
              </figcaption>
            </figure>
          ))}
        </div>
        <p className="projects-note">
          Public project names and scopes will be attached once client
          permissions are confirmed.
        </p>
      </section>

      <section
        data-coverage
        data-reveal-section
        id="coverage"
        className="coverage-act"
      >
        <div className="coverage-intro">
          <SectionIntro id="coverage" />
        </div>
        <div className="coverage-route">
          <div data-route-line className="route-line" aria-hidden="true" />
          {[
            {
              place: "Kitchener–Waterloo",
              detail: "Primary operations · Breithaupt Street",
            },
            {
              place: "London / Dorchester",
              detail: "Southwestern Ontario project reach",
            },
            {
              place: "Greater Toronto Area",
              detail: "Commercial and multi-unit coverage",
            },
          ].map((stop) => (
            <div data-reveal-item className="route-stop" key={stop.place}>
              <span aria-hidden="true" />
              <div>
                <h3>{stop.place}</h3>
                <p>{stop.detail}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section
        data-reveal-section
        id="faq"
        className="faq-act"
      >
        <SectionIntro id="faq" />
        <Accordion className="faq-list">
          {faqItems.map((item, index) => (
            <AccordionItem
              data-reveal-item
              key={item.question}
              value={`faq-${index}`}
            >
              <AccordionTrigger>{item.question}</AccordionTrigger>
              <AccordionContent>{item.answer}</AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </section>

      <section id="contact" className="contact-act">
        <div className="contact-inner">
          <Image
            src="/media/brand/SFI-Logo-Jpeg-EDIT_00-removebg-preview.png"
            width={280}
            height={67}
            alt="Strong Foam Insulation"
            className="contact-logo"
          />
          <p className="section-kicker">Ready for estimating</p>
          <h2>Put the drawings<br />in strong hands.</h2>
          <p>
            Send the package scope, specifications, elevations, and schedule
            constraints. We will take it from there.
          </p>
          <div className="contact-actions">
            <a
              href="/request-estimate"
              className={cn(
                buttonVariants({ size: "lg" }),
                "brand-button brand-button--red",
              )}
            >
              Start the project survey
            </a>
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
          </div>
          <p className="mt-4 text-sm text-white/70">
            <a
              href={`mailto:${site.emailEstimating}`}
              className="text-[color:var(--sf-cyan)] underline-offset-4 hover:underline"
            >
              {site.emailEstimating}
            </a>
          </p>
          <div className="contact-footer">
            <span>Strong Foam Insulation Inc.</span>
            <span>{productBrands.slice(0, 4).join(" · ")}</span>
          </div>
        </div>
      </section>
    </div>
  );
}
