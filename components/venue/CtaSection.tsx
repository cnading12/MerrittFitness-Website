import Link from 'next/link';
import { contact } from '@/app/data/site';

interface CtaSectionProps {
  heading?: string;
  body?: string;
  primaryLabel?: string;
  primaryHref?: string;
  /** Show the "schedule a tour" contact line. Never lists specific tour days. */
  showTourLine?: boolean;
}

export default function CtaSection({
  heading = 'Come See It in Person',
  body = 'Photos get you partway; the room does the rest. Reach out and we will set up a time to walk the space together.',
  primaryLabel = 'Check Availability & Book',
  primaryHref = '/book',
  showTourLine = true,
}: CtaSectionProps) {
  return (
    <section className="py-24 bg-[#735e59] relative overflow-hidden">
      <div className="absolute top-10 left-10 w-2 h-2 bg-[#f2eee9]/30 rounded-full animate-float blur-sm" />
      <div className="absolute bottom-12 right-16 w-1.5 h-1.5 bg-[#f2eee9]/20 rounded-full animate-float-delay blur-sm" />
      <div className="max-w-4xl mx-auto px-6 text-center relative z-10">
        <h2 className="text-3xl md:text-5xl font-light text-[#f2eee9] font-serif mb-6">{heading}</h2>
        <p className="text-[#f2eee9]/85 text-lg leading-relaxed max-w-2xl mx-auto mb-10">{body}</p>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <Link
            href={primaryHref}
            className="inline-flex items-center justify-center bg-[#f2eee9] text-[#735e59] font-bold px-10 py-5 rounded-full shadow-lg hover:bg-white hover:-translate-y-1 transition-all duration-300"
          >
            {primaryLabel}
          </Link>
          {showTourLine && (
            <a
              href={`mailto:${contact.inquiries.email}?subject=Tour%20request`}
              className="inline-flex items-center justify-center border-2 border-[#f2eee9]/70 text-[#f2eee9] font-bold px-10 py-5 rounded-full backdrop-blur-sm hover:bg-[#f2eee9]/10 hover:-translate-y-1 transition-all duration-300"
            >
              Schedule a Tour
            </a>
          )}
        </div>
        {showTourLine && (
          <p className="text-[#f2eee9]/60 text-sm mt-6">
            Or call {contact.inquiries.phone}. We will find a time that works.
          </p>
        )}
      </div>
    </section>
  );
}
