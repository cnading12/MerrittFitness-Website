'use client';

import { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import type { Faq } from '@/lib/venue-schema';

interface FaqSectionProps {
  faqs: Faq[];
  heading?: string;
}

// Accordion UI only. The matching FAQPage JSON-LD is rendered server-side by
// the page via faqJsonLd() so schema stays in the initial HTML.
export default function FaqSection({ faqs, heading = 'Questions, Answered' }: FaqSectionProps) {
  const [open, setOpen] = useState<number | null>(0);

  return (
    <div>
      <h2 className="text-3xl md:text-4xl font-light text-[#4a3f3c] font-serif mb-10">{heading}</h2>
      <div className="space-y-3 max-w-3xl">
        {faqs.map((faq, i) => (
          <div key={faq.question} className="bg-white rounded-2xl border border-[#735e59]/10 overflow-hidden">
            <button
              className="flex w-full items-center justify-between gap-4 text-left px-6 py-5 hover:bg-[#735e59]/5 transition-colors duration-200"
              aria-expanded={open === i}
              onClick={() => setOpen((v) => (v === i ? null : i))}
            >
              <span className="font-semibold text-[#4a3f3c]">{faq.question}</span>
              <ChevronDown
                size={20}
                className={`shrink-0 text-[#735e59] transition-transform duration-200 ${open === i ? 'rotate-180' : ''}`}
              />
            </button>
            <div className={`grid transition-all duration-300 ${open === i ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'}`}>
              <div className="overflow-hidden">
                <p className="px-6 pb-5 text-[#6b5f5b] leading-relaxed">{faq.answer}</p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
