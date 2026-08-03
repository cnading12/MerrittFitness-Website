import Link from 'next/link';
import { VENUE } from '@/app/data/venue';

// Closing call to action. Invites a tour without publishing specific tour
// days or hours — scheduling happens over phone or email.
export default function TourCTA({
  heading = 'Come see it in person',
  copy = 'Photos get you part of the way; the light through the stained glass does the rest. Reach out and we will set up a time to walk the building together.',
  showBookingLink = true,
}: {
  heading?: string;
  copy?: string;
  showBookingLink?: boolean;
}) {
  return (
    <section className="py-20 bg-[#faf8f5]">
      <div className="max-w-2xl mx-auto px-6 text-center">
        <h2 className="text-3xl md:text-4xl font-light text-[#4a3f3c] font-serif mb-4">{heading}</h2>
        <p className="text-[#6b5f5b] leading-relaxed mb-8">{copy}</p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
          <a
            href={`tel:${VENUE.phone}`}
            className="bg-[#735e59] text-[#f2eee9] font-semibold px-8 py-4 rounded-full shadow-lg hover:bg-[#5a4a46] hover:shadow-xl transition-all duration-300"
          >
            Call {VENUE.phoneDisplay}
          </a>
          <a
            href={`mailto:${VENUE.email}?subject=Tour%20request`}
            className="border-2 border-[#735e59]/40 text-[#735e59] font-semibold px-8 py-4 rounded-full hover:bg-[#735e59] hover:text-[#f2eee9] transition-all duration-300"
          >
            Email us to schedule a tour
          </a>
        </div>
        {showBookingLink && (
          <p className="text-sm text-[#a08b84] mt-6">
            Know your date already?{' '}
            <Link href="/booking" className="underline underline-offset-4 hover:text-[#735e59]">
              Check availability and book
            </Link>
            .
          </p>
        )}
      </div>
    </section>
  );
}
