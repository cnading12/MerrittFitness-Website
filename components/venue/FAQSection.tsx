export interface Faq {
  question: string;
  answer: string;
}

// FAQ section with its own FAQPage JSON-LD block (kept separate from the
// page's venue schema, per SEO guidance).
export default function FAQSection({
  heading = 'Questions couples ask',
  faqs,
}: {
  heading?: string;
  faqs: Faq[];
}) {
  const schema = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faqs.map((faq) => ({
      '@type': 'Question',
      name: faq.question,
      acceptedAnswer: { '@type': 'Answer', text: faq.answer },
    })),
  };

  return (
    <section className="py-16 bg-white">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
      />
      <div className="max-w-3xl mx-auto px-6">
        <h2 className="text-3xl md:text-4xl font-light text-[#4a3f3c] font-serif text-center mb-10">
          {heading}
        </h2>
        <div className="space-y-4">
          {faqs.map((faq) => (
            <details
              key={faq.question}
              className="group bg-[#faf8f5] rounded-2xl border border-[#735e59]/10 p-6"
            >
              <summary className="cursor-pointer list-none flex items-start justify-between gap-4 font-semibold text-[#4a3f3c]">
                <span>{faq.question}</span>
                <span className="text-[#735e59] transition-transform duration-200 group-open:rotate-45 text-xl leading-none" aria-hidden="true">+</span>
              </summary>
              <p className="text-[#6b5f5b] leading-relaxed mt-4">{faq.answer}</p>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}
