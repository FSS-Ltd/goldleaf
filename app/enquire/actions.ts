"use server";

import { Resend } from "resend";
import { site } from "@/content/site";
import { enquirySchema, fieldErrors, formDataToObject, type FieldErrors } from "@/lib/enquiry-schema";

export type EnquiryState =
  | { status: "idle" }
  | { status: "success" }
  | { status: "error"; errors: FieldErrors; message?: string; values: Record<string, string> };

const whereLabel = { home: "At our home", church: "At the church", unsure: "Not sure yet" } as const;

export async function sendEnquiry(_prev: EnquiryState, formData: FormData): Promise<EnquiryState> {
  const raw = formDataToObject(formData);

  // Honeypot: bots fill this. Pretend it worked, send nothing.
  if (raw.company) return { status: "success" };

  const parsed = enquirySchema.safeParse(raw);
  if (!parsed.success) {
    const { consent, ...values } = raw;
    void consent;
    return { status: "error", errors: fieldErrors(parsed.error), values };
  }
  const d = parsed.data;

  const key = process.env.RESEND_API_KEY;
  if (!key) {
    if (process.env.NODE_ENV !== "production") return { status: "success" }; // dev and e2e dry run
    return { status: "error", errors: {}, values: raw, message: "send-failed" };
  }

  const text = [
    `New enquiry from ${d.name}`,
    `Email: ${d.email}`,
    `Phone: ${d.phone || "not given"}`,
    `Child's age: ${d.childAge}`,
    `Days a week: ${d.days}`,
    `Where: ${whereLabel[d.where]}`,
    `Area: ${d.area}`,
    "",
    d.message || "(no message)",
  ].join("\n");

  try {
    const resend = new Resend(key);
    const { error } = await resend.emails.send({
      from: process.env.ENQUIRY_FROM_EMAIL ?? "Goldleaf Enquiries <onboarding@resend.dev>",
      to: process.env.ENQUIRY_TO_EMAIL ?? site.contactEmail,
      replyTo: d.email,
      subject: `Goldleaf enquiry: age ${d.childAge}, ${d.days} days a week`,
      text,
    });
    if (error) return { status: "error", errors: {}, values: raw, message: "send-failed" };
  } catch {
    return { status: "error", errors: {}, values: raw, message: "send-failed" };
  }
  return { status: "success" };
}
