// Single source of business facts. Change values here, not in components.
export const site = {
  name: "Goldleaf Learning",
  service: "Goldleaf Tutoring",
  tutor: {
    name: "Deborah Ntagengwa",
    firstName: "Deborah",
    initials: "DN",
    // TODO(client): replace with the tutor's own words and add a photo. No invented qualifications.
    bio: "Deborah teaches one child at a time, building every session around play, songs and stories, and following one clear reading path from first sounds to first books.",
  },
  area: { town: "Ashford", county: "Kent", region: "GB" },
  // Enquiries go here, and the address is shown as the fallback contact. Override with NEXT_PUBLIC_CONTACT_EMAIL.
  contactEmail: process.env.NEXT_PUBLIC_CONTACT_EMAIL || "admin@goldleaf.education",
  siteUrl: process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000",
  standardRate: 30,
  sessionMinutes: 105,
  founding: {
    total: 5,
    taken: 0, // update as places fill
    rate: 25,
    rateAfter: 28,
    endsLabel: "Easter 2027",
  },
  // Trust lines render only when true. Flip each one once the client has it in place.
  trust: {
    dbsEnhanced: false,
    insured: false,
    safeguardingPolicy: false,
  },
} as const;

export const foundingPlacesLeft = Math.max(0, site.founding.total - site.founding.taken);
export const foundingOpen = foundingPlacesLeft > 0;
export const areaLabel = `${site.area.town}, ${site.area.county}`;
