import Link from "next/link";
import { BrandLogo } from "@/components/brand-logo";
import { navLinks } from "@/content/nav";
import {
  filterPublishableLocations,
  locationRecords,
} from "@/content/marketing-governance";
import { site } from "@/content/site";

export function SiteFooter() {
  const publicLocations = filterPublishableLocations(locationRecords);

  return (
    <footer className="marketing-footer">
      <div className="page-rail marketing-footer__grid">
        <div className="marketing-footer__brand">
          <BrandLogo variant="onDark" className="h-10" />
          <p>{site.legalName}</p>
          <p>{site.taglineLegacy}</p>
        </div>

        <nav aria-label="Footer">
          <h2>Explore</h2>
          <ul>
            {navLinks.map((link) => (
              <li key={link.href}>
                <Link href={link.href}>{link.label}</Link>
              </li>
            ))}
          </ul>
        </nav>

        <section aria-labelledby="footer-contact">
          <h2 id="footer-contact">Contact</h2>
          <ul>
            <li>
              <a href={`tel:${site.phoneE164}`}>{site.phoneDisplay}</a>
            </li>
            <li>
              <a href={`mailto:${site.emailEstimating}`}>
                {site.emailEstimating}
              </a>
            </li>
          </ul>
        </section>

        <section aria-labelledby="footer-locations">
          <h2 id="footer-locations">Location</h2>
          {publicLocations.map((location) =>
            location.address ? (
              <address key={location.id}>
                {location.address.street}
                <br />
                {location.address.locality}, {location.address.region}{" "}
                {location.address.postal}
              </address>
            ) : null,
          )}
        </section>
      </div>

      <div className="page-rail marketing-footer__base">
        <p>© {new Date().getUTCFullYear()} {site.legalName}</p>
        <ul aria-label="Social media">
          {Object.entries(site.social).map(([network, href]) => (
            <li key={network}>
              <a href={href} rel="noreferrer">
                {network}
              </a>
            </li>
          ))}
        </ul>
      </div>
    </footer>
  );
}
