import { faqItems, site } from "@/content/site";
import { serviceContent } from "@/content/services";

const ops = site.primaryOps;

const header = () => `# ${site.brand}

> ${site.legalName} is a commercial specialty trade contractor based in Cambridge, Ontario, serving ICI (industrial, commercial, institutional) and multi-unit residential projects across all of Ontario, Canada. Scopes: spray foam insulation, passive fire protection (cementitious fireproofing and intumescent coatings), air-vapour barriers, waterproofing, and firestopping.

- Based in: ${ops.street}, ${ops.locality}, ${ops.region} ${ops.postal}, Canada
- Service area: all of Ontario, Canada
- Phone: ${site.phoneDisplay} (${site.phoneE164})
- Email: ${site.emailEstimating}
- Website: ${site.url}
`;

export function llmsTxt() {
  return `${header()}
## Services
${serviceContent.map((s) => `- [${s.title}](${site.url}${s.canonicalPath}): ${s.metadata.description}`).join("\n")}

## Company
- [About](${site.url}/about)
- [Projects](${site.url}/projects)
- [Partners](${site.url}/partners)
- [Locations](${site.url}/locations)
- [Contact](${site.url}/contact)
- [Request an estimate](${site.url}/request-estimate)

## Optional
- [Full summary for AI assistants](${site.url}/llms-full.txt)
- [Sitemap](${site.url}/sitemap.xml)
`;
}

export function llmsFullTxt() {
  return `${header()}- Parent company: ${site.parent}

## Services
${serviceContent
  .map((s) => `### ${s.title}\nURL: ${site.url}${s.canonicalPath}\nService area: Ontario, Canada\n\n${s.summary}\n\n${s.metadata.description}`)
  .join("\n\n")}

## Frequently asked questions
${faqItems.map((f) => `### ${f.question}\n${f.answer}`).join("\n\n")}

## Contact
- Address: ${ops.street}, ${ops.locality}, ${ops.region} ${ops.postal}, Canada
- Phone: ${site.phoneDisplay}
- Email: ${site.emailEstimating}
- Estimate requests: ${site.url}/request-estimate
`;
}
