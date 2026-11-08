import { test } from "node:test";
import assert from "node:assert/strict";
import { enquirySchema } from "./enquiry-schema";

const valid = {
  name: "Sam Parent",
  email: "sam@example.com",
  phone: "",
  childAge: "3",
  days: "3",
  where: "home",
  area: "TN23",
  message: "",
  consent: "on",
  company: "",
};

test("valid enquiry passes", () => {
  assert.equal(enquirySchema.safeParse(valid).success, true);
});
test("bad email fails", () => {
  assert.equal(enquirySchema.safeParse({ ...valid, email: "nope" }).success, false);
});
test("missing consent fails", () => {
  const { consent, ...rest } = valid;
  void consent;
  assert.equal(enquirySchema.safeParse(rest).success, false);
});
test("child age 5 fails", () => {
  assert.equal(enquirySchema.safeParse({ ...valid, childAge: "5" }).success, false);
});
test("filled honeypot fails validation", () => {
  assert.equal(enquirySchema.safeParse({ ...valid, company: "spam" }).success, false);
});
