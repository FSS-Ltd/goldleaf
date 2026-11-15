// Single source of business facts. Change values here, not in components.
export const site = {
  name: "Goldleaf Learning",
  service: "Goldleaf Tutoring",
  tutor: {
    name: "Deborah Ntagengwa",
    firstName: "Deborah",
    initials: "DN",
    // TODO(client): replace with the tutor's own words and add a photo. No invented qualifications.
    bio: "Deborah teaches in small groups of up to 4, or one to one, building every session around play, songs and stories. Alongside early maths, science, art and music, she follows one clear reading path from first sounds to first books.",
  },
  area: { town: "Ashford", county: "Kent", region: "GB" },
  // Enquiries go here, and the address is shown as the fallback contact. Override with NEXT_PUBLIC_CONTACT_EMAIL.
  contactEmail: process.env.NEXT_PUBLIC_CONTACT_EMAIL || "admin@goldleaf.education",
  siteUrl: process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000",
  standardSessionFee: 60,
  sessionMinutes: 105,
  sessionStartTime: "13:00",
  maxGroupSize: 4,
  founding: {
    sessionFee: 50,
    sessionFeeAfter: 56,
    endsLabel: "Easter 2027",
  },
  // Trust lines render only when true. Flip each one once the client has it in place.
  trust: {
    dbsEnhanced: false,
    insured: false,
    safeguardingPolicy: false,
  },
} as const;

export const areaLabel = `${site.area.town}, ${site.area.county}`;

const [startHour, startMinute] = site.sessionStartTime.split(":").map(Number);
const startMinutes = startHour * 60 + startMinute;
function timeLabel(minutes: number): string {
  const hour = Math.floor(minutes / 60) % 24;
  return `${hour % 12 || 12}:${String(minutes % 60).padStart(2, "0")}${hour < 12 ? "am" : "pm"}`;
}
export const sessionStartLabel = timeLabel(startMinutes);
export const sessionEndLabel = timeLabel(startMinutes + site.sessionMinutes);
export const sessionTimeLabel = `${sessionStartLabel}–${sessionEndLabel}`;
