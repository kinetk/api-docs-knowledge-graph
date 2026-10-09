import {
  SITE_URL,
  MAIN_SITE_URL,
  BRAND_NAME,
  SITE_NAME,
  SITE_LEGAL_NAME,
  SITE_DESCRIPTION,
  DOCS_URL,
  SOCIAL_URLS,
} from "@/lib/constants/site";

/** Renders a single JSON-LD <script> (no user input -> safe to stringify). */
function JsonLd({ data }: { data: Record<string, unknown> }) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  );
}

// The org is the parent brand, identified against the main site.
const ORG_ID = `${MAIN_SITE_URL}/#organization`;

const organization = {
  "@context": "https://schema.org",
  "@type": "Organization",
  "@id": ORG_ID,
  name: BRAND_NAME,
  legalName: SITE_LEGAL_NAME,
  url: MAIN_SITE_URL,
  logo: `${MAIN_SITE_URL}/favicon.ico`,
  sameAs: [...SOCIAL_URLS],
};

// The demo itself as a WebApplication.
const webApp = {
  "@context": "https://schema.org",
  "@type": "WebApplication",
  "@id": `${SITE_URL}/#webapp`,
  url: SITE_URL,
  name: SITE_NAME,
  description: SITE_DESCRIPTION,
  applicationCategory: "BusinessApplication",
  operatingSystem: "Any",
  isAccessibleForFree: true,
  offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
  publisher: { "@id": ORG_ID },
};

// The underlying product the demo showcases.
const apiProduct = {
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  "@id": `${MAIN_SITE_URL}/#api`,
  name: "KINETK API & MCP",
  applicationCategory: "DeveloperApplication",
  operatingSystem: "Any",
  url: DOCS_URL,
  description:
    "Query the real-time IP Graph of the social web through the KINETK API, or " +
    "connect AI agents directly via the KINETK MCP (Model Context Protocol).",
  offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
  publisher: { "@id": ORG_ID },
};

/** Site-wide structured data, rendered once from the root layout. */
export default function StructuredData() {
  return (
    <>
      <JsonLd data={organization} />
      <JsonLd data={webApp} />
      <JsonLd data={apiProduct} />
    </>
  );
}
