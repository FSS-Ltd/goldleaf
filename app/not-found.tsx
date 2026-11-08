import { ButtonLink } from "@/components/Button";

export default function NotFound() {
  return (
    <section className="section">
      <div className="wrap max-w-2xl text-center">
        <h1>We could not find that page</h1>
        <p className="mt-4 text-ink-soft">It may have moved. Try the home page or send us an enquiry.</p>
        <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
          <ButtonLink href="/">Back to home</ButtonLink>
          <ButtonLink href="/enquire" variant="ghost">Enquire</ButtonLink>
        </div>
      </div>
    </section>
  );
}
