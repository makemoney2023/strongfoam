# Strong Foam — Recommended JSON-LD (+ example payloads)

**Schema project basis:** `Desktop/Projects/PIRX/.cursor/skills/schema-markup-generator/` (`references/schema-templates.md`) + PIRX `pirx-frontend/src/lib/site-schema.ts` `@graph` pattern.  
**NAP source:** `/workspace/strongfoam-research-dossier.md` (2026-09-16).  
**Rules:** Schema must match visible page content. ≥3 types per important URL. Keep FAQPage for AI extraction (Google FAQ rich results deprecated May 2026). Do **not** invent `aggregateRating`, opening hours, geo coordinates, or certifications. Confirm primary address with client before freeze.

**Preferred primary ops NAP (certificates / SprayFoamMagazine):**  
`1-399 Breithaupt Street, Kitchener, ON N2H 5H8`  
**Published head office:** `322-72 St. Leger Street, Kitchener, ON N2H 6R4`  
**Phone:** `+1-519-900-6000` · **Estimate email:** `estimating@strongfoam.com`

Use `@type` `LocalBusiness` until a more specific Schema.org subtype is validated for Canadian specialty trades; optional additional type annotation noted below.

---

## 1. Site-wide `@graph` (root layout — every page)

Stable `@id`s so page-level graphs can `$ref` the same Organization / WebSite nodes (PIRX pattern).

```json
{
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Organization",
      "@id": "https://strongfoam.com/#organization",
      "name": "Strong Foam Insulation Inc.",
      "alternateName": ["Strong Foam", "StrongFoam"],
      "url": "https://strongfoam.com/",
      "logo": "https://strongfoam.com/path-to-vector-logo.svg",
      "description": "Ontario specialty contractor for spray foam insulation, cementitious fireproofing, intumescent coatings, and air-vapour barriers on ICI and multi-unit residential projects.",
      "email": "estimating@strongfoam.com",
      "telephone": "+1-519-900-6000",
      "address": {
        "@type": "PostalAddress",
        "streetAddress": "1-399 Breithaupt Street",
        "addressLocality": "Kitchener",
        "addressRegion": "ON",
        "postalCode": "N2H 5H8",
        "addressCountry": "CA"
      },
      "sameAs": [
        "https://www.facebook.com/STRONGFOAMINSULATION",
        "https://www.instagram.com/strongfoaminsulation/",
        "https://www.linkedin.com/company/strong-foam-insulation-inc",
        "https://twitter.com/and_foam"
      ],
      "contactPoint": [
        {
          "@type": "ContactPoint",
          "telephone": "+1-519-900-6000",
          "contactType": "sales",
          "email": "estimating@strongfoam.com",
          "areaServed": "CA-ON",
          "availableLanguage": ["English"]
        }
      ],
      "parentOrganization": {
        "@type": "Organization",
        "name": "LioCorr Holdings Inc.",
        "url": "https://liocorr.com/"
      }
    },
    {
      "@type": "WebSite",
      "@id": "https://strongfoam.com/#website",
      "name": "Strong Foam",
      "url": "https://strongfoam.com/",
      "inLanguage": "en-CA",
      "publisher": { "@id": "https://strongfoam.com/#organization" }
    }
  ]
}
```

**Notes**
- Omit `parentOrganization` if client does not want LioCorr on the public graph.  
- Add YouTube `sameAs` only with the full channel URL confirmed.  
- Do not add `SearchAction` unless site search exists.  
- Replace logo URL with the rebuild’s vector asset (dossier: current WP logo is low-res JPEG).

---

## 2. LocalBusiness (Contact + primary location page)

Emit only after client confirms this is the GBP primary. No fake hours/geo/ratings.

```json
{
  "@context": "https://schema.org",
  "@type": "LocalBusiness",
  "@id": "https://strongfoam.com/#localbusiness-kitchener",
  "name": "Strong Foam Insulation Inc.",
  "image": "https://strongfoam.com/path-to-logo-or-job-photo.jpg",
  "url": "https://strongfoam.com/contact/",
  "telephone": "+1-519-900-6000",
  "email": "estimating@strongfoam.com",
  "address": {
    "@type": "PostalAddress",
    "streetAddress": "1-399 Breithaupt Street",
    "addressLocality": "Kitchener",
    "addressRegion": "ON",
    "postalCode": "N2H 5H8",
    "addressCountry": "CA"
  },
  "areaServed": [
    { "@type": "AdministrativeArea", "name": "Ontario" },
    { "@type": "City", "name": "Kitchener" },
    { "@type": "City", "name": "Waterloo" },
    { "@type": "City", "name": "Cambridge" },
    { "@type": "City", "name": "London" },
    { "@type": "City", "name": "Guelph" },
    { "@type": "City", "name": "Toronto" }
  ],
  "parentOrganization": { "@id": "https://strongfoam.com/#organization" },
  "priceRange": "$$"
}
```

**Multi-location:** If Dorchester / Woodbridge / St. Leger stay active, add separate `LocalBusiness` nodes with distinct `@id`s and `department`/`branch` relationship — **do not** invent inactive yards into schema. Confirm each address first.

Optional: `"@type": ["LocalBusiness", "HomeAndConstructionBusiness"]` only if it matches Google’s understanding and visible category; prefer honest LocalBusiness over a forced subtype.

---

## 3. Service page example (Spray foam)

```json
{
  "@context": "https://schema.org",
  "@graph": [
    { "@id": "https://strongfoam.com/#organization" },
    {
      "@type": "Service",
      "@id": "https://strongfoam.com/services/spray-foam-insulation/#service",
      "name": "Commercial spray foam insulation",
      "serviceType": "Spray foam insulation (SPF)",
      "provider": { "@id": "https://strongfoam.com/#organization" },
      "areaServed": "CA-ON",
      "url": "https://strongfoam.com/services/spray-foam-insulation/",
      "description": "Spray foam insulation for ICI and multi-unit residential building envelopes in Ontario."
    },
    {
      "@type": "BreadcrumbList",
      "itemListElement": [
        {
          "@type": "ListItem",
          "position": 1,
          "name": "Home",
          "item": "https://strongfoam.com/"
        },
        {
          "@type": "ListItem",
          "position": 2,
          "name": "Services",
          "item": "https://strongfoam.com/services/"
        },
        {
          "@type": "ListItem",
          "position": 3,
          "name": "Spray foam insulation",
          "item": "https://strongfoam.com/services/spray-foam-insulation/"
        }
      ]
    },
    {
      "@type": "FAQPage",
      "mainEntity": [
        {
          "@type": "Question",
          "name": "Do you install commercial spray foam on multi-unit residential projects?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "Yes. Strong Foam Insulation Inc. focuses on ICI and multi-unit residential spray foam as part of the building envelope, often alongside air-vapour barrier and fire-protection scopes when specified."
          }
        },
        {
          "@type": "Question",
          "name": "How do I request an estimate?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "Email estimating@strongfoam.com or call +1 519-900-6000 with drawings and the specification package. Use the contact form on strongfoam.com/contact/."
          }
        },
        {
          "@type": "Question",
          "name": "Is residential attic foam your main business?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "Public positioning is ICI and multi-unit residential. Some custom residential work occurs; send the scope to estimating for fit."
          }
        }
      ]
    }
  ]
}
```

Repeat the Service + FAQ + Breadcrumb pattern for `/fireproofing/`, `/intumescent-coatings/`, `/air-vapour-barriers/`, `/spf-roofing/`.

---

## 4. BlogPosting + FAQ (resources article)

```json
{
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "BlogPosting",
      "@id": "https://strongfoam.com/resources/cementitious-vs-intumescent/#article",
      "headline": "Cementitious vs intumescent fireproofing for commercial steel",
      "datePublished": "2026-10-01",
      "dateModified": "2026-10-01",
      "author": {
        "@type": "Organization",
        "@id": "https://strongfoam.com/#organization"
      },
      "publisher": { "@id": "https://strongfoam.com/#organization" },
      "image": "https://strongfoam.com/og/cementitious-vs-intumescent.jpg",
      "mainEntityOfPage": {
        "@type": "WebPage",
        "@id": "https://strongfoam.com/resources/cementitious-vs-intumescent/"
      },
      "description": "A GC-facing guide to when cementitious PFP and intumescent coatings are typically specified on Ontario commercial projects."
    },
    {
      "@type": "BreadcrumbList",
      "itemListElement": [
        {
          "@type": "ListItem",
          "position": 1,
          "name": "Home",
          "item": "https://strongfoam.com/"
        },
        {
          "@type": "ListItem",
          "position": 2,
          "name": "Resources",
          "item": "https://strongfoam.com/resources/"
        },
        {
          "@type": "ListItem",
          "position": 3,
          "name": "Cementitious vs intumescent",
          "item": "https://strongfoam.com/resources/cementitious-vs-intumescent/"
        }
      ]
    },
    {
      "@type": "FAQPage",
      "mainEntity": [
        {
          "@type": "Question",
          "name": "Can intumescent replace cementitious on every steel member?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "Not automatically. Changes must align with the listed fire-protection design and be accepted by the design professional and authority having jurisdiction."
          }
        },
        {
          "@type": "Question",
          "name": "Who decides between cementitious and intumescent?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "Usually the specification and fire-protection engineer, based on member type, required rating, exposure, and architectural finish—not the applicator alone."
          }
        }
      ]
    }
  ]
}
```

When a real employee byline exists, switch `author` to `Person` with `jobTitle` + `url` (E-E-A-T). Until then Organization author is safer than a fake Person.

---

## 5. Type → page mapping (build checklist)

| Page type | JSON-LD types (≥3 where possible) |
|-----------|-----------------------------------|
| Global layout | Organization, WebSite |
| Home | WebPage + Organization + WebSite (+ FAQ if visible FAQ block) |
| Contact / location | LocalBusiness, Organization, BreadcrumbList |
| Service | Service, BreadcrumbList, FAQPage |
| Sector | WebPage/Service, BreadcrumbList, FAQPage |
| Project case study | Article or CreativeWork, BreadcrumbList, Organization |
| Resource / blog | BlogPosting, BreadcrumbList, FAQPage |
| Products/systems | WebPage, ItemList (optional), BreadcrumbList |

---

## 6. Implementation notes for Next.js

1. Mirror PIRX: `buildSiteGraph()` in root layout; page helpers merge additional `@graph` nodes.  
2. FAQ answers in CMS frontmatter must equal visible FAQ text.  
3. Validate with Google Rich Results Test + Schema Markup Validator before launch.  
4. After spam cleanup, ensure no leftover casino URLs remain in sitemap.  
5. Do not ship `aggregateRating` until a real, owned review source exists.

---

## 7. Client confirm before freeze

- [ ] Primary NAP for GBP + schema  
- [ ] Opening hours (if any public)  
- [ ] Geo coordinates (optional)  
- [ ] LioCorr `parentOrganization` yes/no  
- [ ] Active branch list for multi-location nodes  
