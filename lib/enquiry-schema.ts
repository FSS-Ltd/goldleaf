import { z } from "zod";

export const enquirySchema = z.object({
  name: z.string().trim().min(2, "Please enter your name").max(100),
  email: z.string().trim().email("Please enter a valid email address").max(200),
  phone: z.string().trim().max(30).optional().or(z.literal("")),
  childAge: z.enum(["2", "3", "4"], { message: "Please choose your child's age" }),
  days: z.enum(["1", "2", "3", "4", "5"], { message: "Please choose the days a week you would like" }),
  where: z.enum(["home", "church", "unsure"], { message: "Please choose where you would like sessions" }),
  area: z.string().trim().min(2, "Please tell us your area or postcode district").max(100),
  message: z.string().trim().max(1500).optional().or(z.literal("")),
  consent: z.literal("on", { message: "Please tick the box so we can reply to you" }),
  company: z.string().max(0).optional().or(z.literal("")), // honeypot, must stay empty
});

export type Enquiry = z.infer<typeof enquirySchema>;

export type FieldErrors = Partial<Record<keyof Enquiry, string>>;

export function formDataToObject(fd: FormData): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [k, v] of fd.entries()) if (typeof v === "string") out[k] = v;
  return out;
}

export function fieldErrors(error: z.ZodError): FieldErrors {
  const out: FieldErrors = {};
  for (const issue of error.issues) {
    const key = issue.path[0] as keyof Enquiry;
    if (key && !out[key]) out[key] = issue.message;
  }
  return out;
}
