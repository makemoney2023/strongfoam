import Link from "next/link";

type CtaLink = {
  label: string;
  href: string;
};

export function CtaBand({
  heading,
  description,
  primary,
  secondary,
}: {
  heading: string;
  description: string;
  primary: CtaLink;
  secondary?: CtaLink;
}) {
  return (
    <section className="marketing-cta-band" aria-labelledby="marketing-cta-title">
      <div className="page-rail marketing-cta-band__inner">
        <div>
          <p className="section-kicker">Start a conversation</p>
          <h2 id="marketing-cta-title">{heading}</h2>
          <p>{description}</p>
        </div>
        <div className="marketing-cta-band__actions">
          <Link className="marketing-link-button marketing-link-button--primary" href={primary.href}>
            {primary.label}
          </Link>
          {secondary ? (
            <Link
              className="marketing-link-button marketing-link-button--outline"
              href={secondary.href}
            >
              {secondary.label}
            </Link>
          ) : null}
        </div>
      </div>
    </section>
  );
}
