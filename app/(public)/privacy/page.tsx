import type { Metadata } from "next";
import { site } from "@/content/site";

export const metadata: Metadata = {
  title: "Privacy notice",
  description: "How Goldleaf Learning uses the details you send in an enquiry.",
  alternates: { canonical: "/privacy" },
  openGraph: { title: "Privacy notice", url: "/privacy", images: ["/opengraph-image.png"] },
};

export default function Privacy() {
  return (
    <section className="section">
      <div className="wrap-3xl">
        <h1 className="!text-[clamp(2.2rem,5vw,3.5rem)]">Privacy notice</h1>
        <div className="mt-8 grid gap-8 [&_h2]:!text-2xl [&_p]:max-w-[65ch] [&_ul]:grid [&_ul]:max-w-[65ch] [&_ul]:list-disc [&_ul]:gap-1 [&_ul]:pl-6">
          <div>
            <h2>Who we are</h2>
            <p className="mt-2">
              {site.name} is the controller of the personal data you send through this website. {site.contactEmail ? (
                <>You can reach us at <a className="link-u" href={`mailto:${site.contactEmail}`}>{site.contactEmail}</a>.</>
              ) : (
                "You can reach us through the enquiry form."
              )}
            </p>
          </div>
          <div>
            <h2>What we collect, and why</h2>
            <p className="mt-2">When you send an enquiry we collect:</p>
            <ul className="mt-2">
              <li>your name and email address, so we can reply</li>
              <li>your phone number, if you choose to give it</li>
              <li>your child&rsquo;s age, the days a week you would like, where you would like sessions, and your area</li>
              <li>any message you write</li>
            </ul>
            <p className="mt-2">We do not ask for your child&rsquo;s name. We use these details only to reply to your enquiry. We do not sell them or use them for advertising.</p>
          </div>
          <div>
            <h2>Our legal basis</h2>
            <p className="mt-2">Your consent, which you give by ticking the box on the form. You can withdraw it at any time.</p>
          </div>
          <div>
            <h2>Who else sees it</h2>
            <p className="mt-2">
              Enquiries are delivered to us by email through Resend, our email delivery service. This site also uses Vercel
              Analytics to count visits. It does not use cookies and does not track you across other sites.
            </p>
          </div>
          <div>
            <h2>How long we keep it</h2>
            <p className="mt-2">If an enquiry does not become a booking, we delete it after 12 months.</p>
          </div>
          <div>
            <h2>Your rights</h2>
            <p className="mt-2">
              You can ask to see, correct or delete your data, or object to how we use it. Email us and we will respond.
              If you are unhappy with how we handle your data, you can complain to the Information Commissioner&rsquo;s
              Office at ico.org.uk.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
