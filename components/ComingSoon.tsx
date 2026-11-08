import { Eyebrow } from "./Eyebrow";

export function ComingSoon() {
  return (
    <section className="section" aria-labelledby="soon-title">
      <div className="wrap">
        <Eyebrow left>Coming soon</Eyebrow>
        <h2 id="soon-title" className="mt-3">More from Goldleaf</h2>
        <div className="mt-8 grid gap-6 md:grid-cols-2">
          <div className="rounded-card border border-line p-6">
            <h3>Goldleaf Readers</h3>
            <p className="mt-2 text-ink-soft">Decodable phonics books in box sets, with interactive little readers for age 2.</p>
          </div>
          <div className="rounded-card border border-line p-6">
            <h3>Goldleaf Curriculum</h3>
            <p className="mt-2 text-ink-soft">A home learning programme for ages 2, 3 and 4.</p>
          </div>
        </div>
        <p className="mt-6 text-ink-soft">Both follow the same reading path your child learns in a tutoring session.</p>
      </div>
    </section>
  );
}
