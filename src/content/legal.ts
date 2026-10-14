import { site } from "@/content/site";

export type LegalSection = {
  id: string;
  heading: string;
  paragraphs?: string[];
  bullets?: string[];
  after?: string[];
};

export type LegalDocument = {
  title: string;
  effectiveDate: string;
  intro: string[];
  sections: LegalSection[];
};

export const LEGAL_EFFECTIVE_DATE = "October 14, 2026";

/** Placeholder the client must replace with the named Privacy Officer. */
export const PRIVACY_OFFICER_NAME = "[Privacy Officer name — to be confirmed]";

const address = `${site.primaryOps.street}, ${site.primaryOps.locality}, ${site.primaryOps.region} ${site.primaryOps.postal}, Canada`;
const email = site.emailEstimating;

export const privacyPolicy: LegalDocument = {
  title: "Privacy Policy",
  effectiveDate: LEGAL_EFFECTIVE_DATE,
  intro: [
    `${site.legalName} ("Strong Foam", "we", "us") is an insulation, fire protection and building envelope contractor based in Ontario, Canada. This Privacy Policy explains how we collect, use, disclose and protect personal information through strongfoam.com and related forms, emails and project tools.`,
    "We handle personal information in line with the Personal Information Protection and Electronic Documents Act (PIPEDA) and its ten fair information principles. Where other Canadian privacy laws apply, such as Quebec's Act respecting the protection of personal information in the private sector (as amended by Law 25), we follow them as well.",
  ],
  sections: [
    {
      id: "accountability",
      heading: "1. Accountability and our Privacy Officer",
      paragraphs: [
        `Strong Foam is responsible for personal information under its control, including information handled for us by service providers. We have designated a Privacy Officer who is accountable for our compliance with this policy: ${PRIVACY_OFFICER_NAME}, ${site.legalName}, ${address}. Email: ${email}. Phone: ${site.phoneDisplay}.`,
      ],
    },
    {
      id: "what-we-collect",
      heading: "2. Information we collect",
      paragraphs: ["We collect only the information we need for the purposes described below."],
      bullets: [
        "Estimate request survey: first and last name, email address, phone number, company name, your role on the project, project type, building type, project city and province, services of interest, timeline, whether drawings are ready, and any notes you add.",
        "Project files: if you choose to attach them to an estimate request, up to five drawings, specifications or photos (PDF, JPEG, PNG or WebP, up to 25 MB each). Photos and documents may contain information about a property or the people shown in them.",
        "Contact form: first and last name, email address, phone number, company name (optional) and your message.",
        "Consent record: your confirmation that we may use the information to respond to you, and the time the form was started and submitted.",
        "Booking a call: if you are offered and use the scheduling widget on our thank-you page, the scheduling provider collects the details you enter there, and we receive the booking details (such as your name, email and the time booked).",
        "Emails and correspondence: information you send us by email or include in replies to our messages, including replies to proposals.",
        "Proposal acceptance: if we send you a proposal link, the name, email address and decision you enter when you accept or decline it.",
        "Technical information: your IP address is used to limit repeated form submissions and protect against spam and abuse; our hosting provider also processes standard request data (such as IP address, browser type and pages requested) to deliver and secure the site.",
        "Staff and field crew accounts: for our own staff and subcontractors who use our internal tools, sign-in details, job activity, job-site photos and, where the user allows it in their browser, location at the time of a job-site arrival check-in.",
      ],
      after: [
        "Please do not include sensitive information (such as health or financial information) in forms, messages or uploaded files unless we specifically ask for it.",
      ],
    },
    {
      id: "purposes",
      heading: "3. Why we collect it (identifying purposes)",
      bullets: [
        "To respond to your inquiry or estimate request, assess whether the project fits our services and service area, prepare estimates and proposals, and arrange calls or site assessments.",
        "To send you a confirmation that we received your request and to follow up about it.",
        "To deliver, manage and invoice projects we are engaged for, including scheduling, crew coordination, job-site records and photo documentation.",
        "To operate, secure and improve the website, prevent spam and fraud, and keep our systems working.",
        "To meet legal, contractual, insurance, safety and record-keeping obligations.",
      ],
      after: [
        "We will identify any new purpose and ask for your consent before using your information for it, unless the law allows otherwise.",
      ],
    },
    {
      id: "consent",
      heading: "4. Consent",
      paragraphs: [
        "We collect personal information with your knowledge and consent. When you submit the estimate survey or the contact form, you confirm that we may use the information to respond to your request. Consent may also be implied where the purpose is obvious, for example when you email us or call us about a project.",
        "You can withdraw consent at any time, subject to legal or contractual restrictions and reasonable notice, by contacting our Privacy Officer. If you withdraw consent, we may be unable to provide an estimate or continue a project, and we will explain the consequences.",
      ],
    },
    {
      id: "email",
      heading: "5. How lead notifications and emails work (including CASL)",
      paragraphs: [
        `When you submit the survey or contact form, the details you provide (and links to any files you attach, which are accessible only to signed-in Strong Foam staff) are emailed internally to our estimating team at ${email} and saved in our customer records system so the right person can respond.`,
        "We also send you one automatic confirmation email. This is a transactional message about the request you made; it is not a marketing message.",
        "We do not currently send newsletters or promotional emails from this website. If we do in the future, we will only send commercial electronic messages in accordance with Canada's Anti-Spam Legislation (CASL): with your express or implied consent, identifying Strong Foam and our contact details, and with an unsubscribe mechanism that we honour within 10 business days.",
      ],
    },
    {
      id: "limiting-use",
      heading: "6. Limiting collection, use, disclosure and retention",
      paragraphs: [
        "We do not sell or rent personal information. We use and disclose it only for the purposes above, with your consent, or as required or permitted by law.",
        "We may share information with: our employees and subcontractors who need it to work on your project; general contractors, consultants, property managers, inspectors or other parties involved in the project, where needed for the work you asked us about; professional advisers, insurers and financing partners; and authorities where required by law. If Strong Foam is involved in a sale, merger or financing of all or part of its business, information may be disclosed to the parties involved, subject to confidentiality obligations.",
      ],
    },
    {
      id: "service-providers",
      heading: "7. Service providers and storage outside Canada",
      paragraphs: [
        "We use trusted service providers to run the website and our systems. They process personal information on our behalf, under contract, and only for the services they provide to us.",
      ],
      bullets: [
        "Cloudflare, Inc.: website hosting and content delivery, databases, file storage for uploaded documents and photos, email delivery, security and bot protection (including Cloudflare Turnstile, where enabled), and AI tools that help our staff summarise, classify or draft internal content such as photo captions and replies.",
        "Calendly LLC: the optional call-scheduling widget shown after some estimate requests.",
        "Microsoft (Microsoft 365): our business email, including the estimating mailbox.",
      ],
      after: [
        "These providers may store or process information in the United States or other countries outside Canada. While it is there, it is subject to the laws of that jurisdiction, and authorities there may be able to access it under those laws. We choose providers with appropriate safeguards and use contracts to protect the information. Residents of Quebec should note that information may be communicated outside Quebec.",
      ],
    },
    {
      id: "retention",
      heading: "8. Retention",
      paragraphs: [
        "We keep personal information only as long as needed for the purposes above, including to answer questions about a past estimate or project and to meet legal, tax, warranty, insurance and limitation-period requirements. Estimate requests and contact inquiries that do not lead to a project are kept for a reasonable period for follow-up and record-keeping. When information is no longer required, we delete or anonymise it, or securely destroy it.",
        "If you would like us to delete your information sooner, contact our Privacy Officer and we will do so unless we are required or permitted to keep it.",
      ],
    },
    {
      id: "accuracy",
      heading: "9. Accuracy",
      paragraphs: [
        "We rely on you to give us accurate and complete information, and we will correct information that you tell us is inaccurate or out of date.",
      ],
    },
    {
      id: "safeguards",
      heading: "10. Safeguards",
      paragraphs: [
        "We protect personal information with security measures appropriate to its sensitivity, including encrypted connections (HTTPS), access controls and sign-in requirements for our internal tools, private storage for uploaded files, file-type and size limits and scanning of uploads, and limits on repeated submissions. Only staff who need the information for their work can access it. No method of transmission or storage is completely secure, so we cannot promise absolute security.",
        "If a breach of security safeguards involving personal information creates a real risk of significant harm, we will notify affected individuals and the Office of the Privacy Commissioner of Canada as required by law, and keep a record of the breach.",
      ],
    },
    {
      id: "cookies",
      heading: "11. Cookies, local storage and tracking",
      bullets: [
        "The public website does not use advertising cookies, and we do not currently use third-party analytics or advertising trackers on it.",
        "The estimate survey saves your in-progress answers in your browser's local storage so you do not lose them if you leave the page. They are removed when you submit, and you can clear them at any time through your browser settings.",
        "Our hosting and security provider (Cloudflare) and, where enabled, its Turnstile bot check may set or read strictly necessary cookies or similar technologies to protect the site from abuse.",
        "The Calendly scheduling widget, when displayed, is provided by Calendly and may set its own cookies under Calendly's privacy policy.",
        "Our internal staff and field tools use essential sign-in cookies and local storage for session and device preferences.",
      ],
      after: [
        "You can block or delete cookies in your browser, but some features (such as scheduling or staff sign-in) may then not work.",
      ],
    },
    {
      id: "third-party-sites",
      heading: "12. Third-party sites",
      paragraphs: [
        "Our site links to other websites, such as our social media pages and partner or manufacturer sites. Their privacy practices are their own, and we encourage you to read their policies.",
      ],
    },
    {
      id: "children",
      heading: "13. Children",
      paragraphs: [
        "Our website and services are intended for adults and businesses. We do not knowingly collect personal information from children under 16. If you believe a child has provided us with personal information, please contact us and we will delete it.",
      ],
    },
    {
      id: "openness",
      heading: "14. Openness",
      paragraphs: [
        "This policy is available on our website at all times, and you can ask our Privacy Officer for more information about our practices.",
      ],
    },
    {
      id: "access",
      heading: "15. Your rights: access, correction and withdrawal",
      paragraphs: [
        "You may ask to access the personal information we hold about you, ask how it has been used and to whom it has been disclosed, ask us to correct it, or withdraw your consent. Quebec residents also have rights under Law 25, including the right to have information de-indexed or communicated in a structured technological format where applicable.",
        "Send your request in writing to our Privacy Officer. We may need to verify your identity. We will respond within 30 days, or tell you if we need more time as permitted by law. Access is generally free of charge; if a fee applies we will tell you in advance. If we refuse a request, we will explain why, subject to legal limits, and tell you about your options.",
      ],
    },
    {
      id: "challenging",
      heading: "16. Questions and complaints",
      paragraphs: [
        `Please contact our Privacy Officer first at ${email} or by mail at ${site.legalName}, Attn: Privacy Officer, ${address}. We will investigate and respond, and take appropriate measures if a complaint is justified.`,
        "If you are not satisfied with our response, you may contact the Office of the Privacy Commissioner of Canada (priv.gc.ca, 1-800-282-1376). Quebec residents may also contact the Commission d'accès à l'information du Québec (cai.gouv.qc.ca).",
      ],
    },
    {
      id: "changes",
      heading: "17. Changes to this policy",
      paragraphs: [
        "We may update this policy from time to time. The updated version will be posted on this page with a new effective date. If we make significant changes to how we use personal information, we will seek any consent required by law.",
      ],
    },
  ],
};

export const termsOfService: LegalDocument = {
  title: "Terms of Service",
  effectiveDate: LEGAL_EFFECTIVE_DATE,
  intro: [
    `These Terms of Service ("Terms") govern your use of strongfoam.com and its forms and content (the "Site"), operated by ${site.legalName} ("Strong Foam", "we", "us"), ${address}. By using the Site, you agree to these Terms. If you do not agree, please do not use the Site.`,
  ],
  sections: [
    {
      id: "use",
      heading: "1. Using the Site",
      paragraphs: [
        "You may use the Site to learn about our services and to contact us or request an estimate. You must provide accurate information in any form you submit, and you must be at least the age of majority in your province or territory, or use the Site with the involvement of a parent or guardian. If you submit information on behalf of a company or project owner, you confirm that you are authorised to do so.",
      ],
    },
    {
      id: "estimates",
      heading: "2. Estimates and quotes are not binding",
      paragraphs: [
        "Submitting the estimate survey or contact form does not create a contract and does not book a site visit or reserve a schedule. Any estimate, price range, budget figure or timeline we provide through the Site, by email or by phone is a preliminary, non-binding estimate based on the information available at the time.",
        "Final pricing, scope, schedule and terms depend on an on-site assessment where required, review of drawings and specifications, site conditions, code and permit requirements, and material availability. Work is performed only under a written proposal or contract signed or accepted by both parties, and that written agreement governs the work.",
      ],
    },
    {
      id: "content",
      heading: "3. Website content is general information",
      paragraphs: [
        "Content on the Site, including descriptions of products, systems, performance, energy savings, fire ratings, certifications, building-code topics and project examples, is general information only. It is not engineering, design, code-compliance, legal or professional advice for your specific building. Product performance depends on design, site conditions and installation, and you should consult a qualified design professional for your project.",
        'The Site and its content are provided "as is" and "as available". To the fullest extent permitted by law, we make no warranties or representations of any kind about the Site or its content, express or implied, including accuracy, completeness, fitness for a particular purpose or uninterrupted availability. Any warranty for our services or installed materials is provided only in a written contract or written warranty document issued by Strong Foam or the manufacturer, and not by the Site.',
      ],
    },
    {
      id: "ip",
      heading: "4. Intellectual property",
      paragraphs: [
        "The Site and its content, including text, photographs, videos, graphics, logos and the Strong Foam name and marks, are owned by Strong Foam or its licensors and are protected by Canadian and international copyright and trademark laws. Manufacturer, partner and client names and logos belong to their respective owners and are shown for identification only.",
        "You may view and print pages for your own information in connection with a potential or current project. You may not copy, reproduce, republish, modify, distribute, or create derivative works from Site content, or use our marks, without our prior written permission.",
        "When you upload drawings, specifications or photos, you confirm you have the right to share them, and you allow us to use them to prepare estimates, proposals and project work for you. You keep any rights you have in them.",
      ],
    },
    {
      id: "acceptable-use",
      heading: "5. Acceptable use",
      paragraphs: ["You agree not to:"],
      bullets: [
        "submit false, misleading or someone else's information, or impersonate any person or company;",
        "upload malware or files you do not have the right to share;",
        "send spam, automated submissions or bulk messages through our forms;",
        "attempt to gain unauthorised access to the Site, our internal tools or other users' information, or probe, scan or test their security;",
        "interfere with or overload the Site, or scrape or harvest its content or data by automated means; or",
        "use the Site for any unlawful purpose.",
      ],
      after: [
        "We may block access, remove submissions or take other action if we believe these Terms have been breached.",
      ],
    },
    {
      id: "privacy",
      heading: "6. Privacy",
      paragraphs: [
        "Our Privacy Policy explains how we handle personal information submitted through the Site and forms part of these Terms.",
      ],
    },
    {
      id: "third-party",
      heading: "7. Third-party links and services",
      paragraphs: [
        "The Site may link to or embed third-party websites and services, such as social media pages, manufacturer and partner sites, and a scheduling tool. We do not control and are not responsible for their content, availability or practices, and their own terms and privacy policies apply.",
      ],
    },
    {
      id: "liability",
      heading: "8. Limitation of liability",
      paragraphs: [
        "To the fullest extent permitted by applicable law, Strong Foam and its directors, officers, employees and agents will not be liable for any indirect, incidental, special, consequential or punitive damages, or for loss of profits, revenue, data or business opportunity, arising from or related to your use of, or inability to use, the Site or its content, even if advised of the possibility of such damages. Our total liability for any claim arising from the Site will not exceed one hundred Canadian dollars (CAD $100).",
        "These limits apply to use of the Site only. Liability for services we perform is governed by the written contract for those services. Nothing in these Terms excludes or limits liability that cannot be excluded or limited under applicable law, including any rights you have under Ontario consumer protection legislation.",
      ],
    },
    {
      id: "indemnity",
      heading: "9. Indemnity",
      paragraphs: [
        "To the extent permitted by law, you agree to indemnify and hold harmless Strong Foam and its directors, officers, employees and agents from claims, losses and reasonable legal costs arising from your breach of these Terms, your misuse of the Site, or content you submit that infringes someone else's rights.",
      ],
    },
    {
      id: "law",
      heading: "10. Governing law and jurisdiction",
      paragraphs: [
        "These Terms are governed by the laws of the Province of Ontario and the federal laws of Canada that apply there, without regard to conflict-of-law rules. You agree that the courts of Ontario have exclusive jurisdiction over any dispute arising from these Terms or the Site, except where applicable consumer protection law gives you the right to bring a claim elsewhere.",
      ],
    },
    {
      id: "general",
      heading: "11. Severability and general terms",
      paragraphs: [
        "If any part of these Terms is found invalid or unenforceable, that part will be limited or removed to the minimum extent necessary and the rest will remain in effect. Our failure to enforce any provision is not a waiver. These Terms, together with our Privacy Policy, are the entire agreement between you and us about the Site, and do not replace any written contract for services. Les parties ont exigé que ces conditions soient rédigées en anglais; the parties have required that these Terms be drawn up in English.",
      ],
    },
    {
      id: "changes",
      heading: "12. Changes to these Terms",
      paragraphs: [
        "We may update these Terms from time to time by posting a new version on this page with a new effective date. Changes apply from that date. Your continued use of the Site after a change means you accept the updated Terms.",
      ],
    },
    {
      id: "contact",
      heading: "13. Contact",
      paragraphs: [
        `Questions about these Terms can be sent to ${email}, by phone at ${site.phoneDisplay}, or by mail to ${site.legalName}, ${address}.`,
      ],
    },
  ],
};
