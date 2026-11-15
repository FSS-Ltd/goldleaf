import { site } from "@/content/site";
import { faqs } from "@/content/faq";

const url = (path = "") => new URL(path, site.siteUrl).toString();

const areaServed = {
  "@type": "City",
  name: site.area.town,
  containedInPlace: { "@type": "AdministrativeArea", name: site.area.county },
};

export function organisationSchema() {
  return [
    {
      "@context": "https://schema.org",
      "@type": ["EducationalOrganization", "LocalBusiness"],
      "@id": url("/#org"),
      name: site.name,
      url: url("/"),
      logo: url("/brand/goldleaf-stacked-trim.webp"),
      image: url("/opengraph-image.png"),
      ...(site.contactEmail ? { email: site.contactEmail } : {}),
      areaServed,
      founder: { "@type": "Person", name: site.tutor.name },
      description:
        "Small-group and one-to-one, play-based phonics, maths and music tutoring for 2 to 4 year olds in Ashford, Kent.",
    },
    {
      "@context": "https://schema.org",
      "@type": "Service",
      name: "Early years tutoring",
      serviceType: "Early reading, phonics and maths tutoring for ages 2 to 4",
      provider: { "@id": url("/#org") },
      areaServed,
      audience: { "@type": "PeopleAudience", suggestedMinAge: 2, suggestedMaxAge: 4 },
      offers: {
        "@type": "Offer",
        priceCurrency: "GBP",
        priceSpecification: {
          "@type": "UnitPriceSpecification",
          price: site.standardSessionFee,
          priceCurrency: "GBP",
          unitText: "session",
        },
      },
    },
  ];
}

export function faqSchema() {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqs.map((f) => ({
      "@type": "Question",
      name: f.q,
      acceptedAnswer: { "@type": "Answer", text: f.a },
    })),
  };
}

export function breadcrumbSchema(trail: { name: string; path: string }[]) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [{ name: "Home", path: "/" }, ...trail].map((t, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: t.name,
      item: url(t.path),
    })),
  };
}
