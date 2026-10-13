"use client";

import Image from "next/image";
import { useLayoutEffect, useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { PhoneIcon } from "lucide-react";
import { PartnerMarquee } from "@/components/marketing/partner-marquee";
import { ResponsivePicture } from "@/components/marketing/responsive-picture";
import { brandLockups } from "@/content/page-media";
import type { MarketingPageModel } from "@/components/marketing/marketing-page-model";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { buttonVariants } from "@/components/ui/button";
import {
  scrollSections,
  site,
} from "@/content/site";
import {
  getServicesPinDistance,
  getServicesScrollTrigger,
  shouldPinServicesRail,
} from "@/lib/scroll-triggers";
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
    copy: "The crew installs the scope with safety, communication, and field conditions in view.",
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

export function ScrollWorldPage({ model }: { model: MarketingPageModel }) {
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
      if (servicesTrack && shouldPinServicesRail(window.innerWidth)) {
        const distance = () =>
          getServicesPinDistance(servicesTrack.scrollWidth, window.innerWidth);
        const railTween = gsap.to(servicesTrack, {
          x: () => -distance(),
          ease: "none",
          scrollTrigger: {
            trigger: "[data-services]",
            ...getServicesScrollTrigger(distance()),
            end: () => `+=${distance()}`,
          },
        });

        // Rail imagery: wipe-in reveal, then slow zoom + counter-pan while
        // the panel crosses the viewport. Transforms only, all scrubbed to
        // the horizontal tween so motion tracks the reader's scroll.
        servicesTrack
          .querySelectorAll<HTMLElement>(".service-panel")
          .forEach((panel) => {
            const mask = panel.querySelector("[data-rail-mask]");
            const unmask = panel.querySelector("[data-rail-unmask]");
            const img = panel.querySelector(".service-panel__img");
            if (!mask || !unmask || !img) return;
            const across = {
              trigger: panel,
              containerAnimation: railTween,
              start: "left right",
              end: "right left",
              scrub: 0.6,
            };
            gsap
              .timeline({
                scrollTrigger: { ...across, end: "left 45%" },
                defaults: { ease: "power2.out" },
              })
              .fromTo(mask, { xPercent: 100 }, { xPercent: 0 }, 0)
              .fromTo(unmask, { xPercent: -100 }, { xPercent: 0 }, 0);
            gsap.fromTo(
              img,
              { scale: 1.22, xPercent: -6 },
              { scale: 1.08, xPercent: 6, ease: "none", scrollTrigger: across },
            );
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
    <div
      ref={root}
      className="scroll-world"
      data-motion-fallback={model.motion.videoFallback}
      data-essential-content-visible={
        model.motion.essentialContentVisible
      }
    >
      <div className="page-grain" aria-hidden="true" />

      <section data-home-section="hero" data-hero id="hero" className="hero-act">
        <div className="hero-stage">
          <video
            data-hero-media
            className="hero-media"
            autoPlay
            muted
            loop
            playsInline
            preload="metadata"
            poster={model.cinematicMedia.heroPoster}
            aria-hidden="true"
          >
            <source src={model.cinematicMedia.heroVideo} type="video/mp4" />
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
            {model.locations[0]?.serviceAreaWording ??
              "Ontario project inquiries"}
          </p>
        </div>
      </section>

      <section data-home-section="trust" data-trust id="trust" className="trust-act">
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
            {model.slogans[0]}
          </p>
        </div>
      </section>

      <section data-home-section="services" data-services id="services" className="services-act">
        <div data-services-frame className="services-frame">
          <div data-services-track className="services-track">
            <div className="services-lead">
              <p className="section-kicker">Capabilities</p>
              <h2>Four service paths.<br />One field mindset.</h2>
              <p>
                Insulation, fire protection, air barriers, and roofing, delivered by one Ontario crew.
              </p>
            </div>
            {model.serviceLinks.map((service, index) => (
              <article
                key={service.id}
                className={cn(
                  "service-panel",
                  index % 2 === 1 && "service-panel--lower",
                )}
              >
                <div className="service-panel__media" aria-hidden="true">
                  <div data-rail-mask className="service-panel__mask">
                    <div data-rail-unmask className="service-panel__mask">
                      <ResponsivePicture
                        image={service.image}
                        sizes="(max-width: 900px) 80vw, 32vw"
                        className="service-panel__img"
                      />
                    </div>
                  </div>
                </div>
                <span>0{index + 1}</span>
                <h3>{service.label}</h3>
                <p>{service.summary}</p>
                <a className="service-panel__link" href={service.href}>
                  Explore service
                </a>
                <div className="service-rule" aria-hidden="true" />
              </article>
            ))}
            <div className="services-close">
              {/* eslint-disable-next-line @next/next/no-img-element -- static SVG lockup */}
              <img
                src={brandLockups.strongFireOnDark.src}
                width={brandLockups.strongFireOnDark.width}
                height={brandLockups.strongFireOnDark.height}
                alt="Strong Fire Protection"
                className="services-close__lockup"
              />
              <p>{model.strongFire.endorsement}</p>
              <a href={model.strongFire.canonicalPath}>
                Explore Strong Fire →
              </a>
            </div>
          </div>
        </div>
      </section>

      <section data-home-section="mission" id="mission" className="mission-strip" aria-labelledby="mission-title">
        <div className="page-rail">
          <p className="section-kicker">Our mission</p>
          <h2 id="mission-title">{model.mission}</h2>
          <div className="mission-strip__slogans">
            {model.slogans.map((slogan) => (
              <p key={slogan}>{slogan}</p>
            ))}
          </div>
        </div>
      </section>

      <section
        data-process
        data-reveal-section
        data-home-section="process"
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
              src={model.cinematicMedia.process}
              alt={model.cinematicMedia.processAlt}
              fill
              sizes="(max-width: 900px) 100vw, 48vw"
              className="object-cover"
            />
            <figcaption>SPF application · wall assembly</figcaption>
          </figure>
        </div>
      </section>

      <section data-home-section="sectors" data-sectors id="sectors" className="sectors-act">
        <video
          data-sector-media
          className="sectors-media"
          autoPlay
          muted
          loop
          playsInline
          preload="metadata"
          poster={model.cinematicMedia.sectorPoster}
          aria-hidden="true"
        >
          <source src={model.cinematicMedia.sectorVideo} type="video/mp4" />
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
        data-home-section="projects"
        id="projects"
        className="projects-act"
      >
        <SectionIntro id="projects" />
        <div data-projects-grid className="projects-grid">
          {model.homeProjects.map((project, index) => (
            <figure
              data-project
              key={project.id}
              className={cn(
                "project-frame",
                index === 0 && "project-frame--tall",
                index === 2 && "project-frame--wide",
              )}
            >
              <Image
                src={project.publicImagePath}
                alt={project.media.alt}
                fill
                sizes={
                  index === 2
                    ? "(max-width: 900px) 100vw, 66vw"
                    : "(max-width: 900px) 100vw, 40vw"
                }
                className="object-cover transition-transform duration-500 hover:scale-[1.025]"
              />
              <figcaption>
                <span>{project.permissionSafeCaption}</span>
                <span>{project.category.replaceAll("-", " ")}</span>
              </figcaption>
            </figure>
          ))}
        </div>
        <a className="projects-note" href="/projects">
          Explore our project work →
        </a>
      </section>

      <section
        data-reveal-section
        data-home-section="partners"
        id="partners"
        className="partners-act"
      >
        <div className="page-rail">
          <p className="section-kicker">Partners</p>
          <h2 className="section-heading">Trusted by builders across Ontario.</h2>
          <p className="section-support">
            We work with leading manufacturers and general contractors to deliver
            envelope and fire-protection scopes on ICI and multi-unit projects.
          </p>
        </div>
        <PartnerMarquee partners={model.partners} />
        <div className="page-rail">
          <a className="projects-note" href="/partners">
            See every partner →
          </a>
        </div>
      </section>

      <section
        data-coverage
        data-reveal-section
        data-home-section="coverage"
        id="coverage"
        className="coverage-act"
      >
        <div className="coverage-intro">
          <SectionIntro id="coverage" />
        </div>
        <div className="coverage-route">
          <div data-route-line className="route-line" aria-hidden="true" />
          {model.locations.map((location) => (
            <div data-reveal-item className="route-stop" key={location.id}>
              <span aria-hidden="true" />
              <div>
                <h3>{location.label}</h3>
                <p>{location.serviceAreaWording}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section
        data-reveal-section
        data-home-section="faq"
        id="faq"
        className="faq-act"
      >
        <SectionIntro id="faq" />
        <Accordion className="faq-list">
          {model.faq.map((item, index) => (
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

      <section data-home-section="contact" id="contact" className="contact-act">
        <div className="contact-inner">
          <Image
            src={site.brandLogos.onDark}
            width={252}
            height={52}
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
              href={model.estimateCta.href}
              className={cn(
                buttonVariants({ size: "lg" }),
                "brand-button brand-button--red",
              )}
            >
              {model.estimateCta.label}
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
            <span>{model.slogans[2]}</span>
          </div>
        </div>
      </section>
    </div>
  );
}
