import type { LegalDocument } from "@/content/legal";

export function LegalDocumentView({ doc }: { doc: LegalDocument }) {
  return (
    <section className="marketing-section page-rail marketing-legal" aria-label={doc.title}>
      <p className="section-kicker">Effective {doc.effectiveDate}</p>
      {doc.intro.map((p) => (
        <p key={p}>{p}</p>
      ))}
      <nav aria-label={`${doc.title} contents`} className="marketing-legal__toc">
        <h2>Contents</h2>
        <ol>
          {doc.sections.map((s) => (
            <li key={s.id}>
              <a href={`#${s.id}`}>{s.heading.replace(/^\d+\.\s*/, "")}</a>
            </li>
          ))}
        </ol>
      </nav>
      {doc.sections.map((s) => (
        <section key={s.id} id={s.id} aria-labelledby={`${s.id}-title`}>
          <h2 id={`${s.id}-title`}>{s.heading}</h2>
          {s.paragraphs?.map((p) => <p key={p}>{p}</p>)}
          {s.bullets ? (
            <ul>
              {s.bullets.map((b) => (
                <li key={b}>{b}</li>
              ))}
            </ul>
          ) : null}
          {s.after?.map((p) => <p key={p}>{p}</p>)}
        </section>
      ))}
    </section>
  );
}
