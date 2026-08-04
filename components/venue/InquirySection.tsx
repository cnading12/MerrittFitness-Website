'use client';

import { useState } from 'react';
import { CheckCircle, AlertCircle, Send } from 'lucide-react';
import { VENUE } from '@/app/data/venue';

// Inquiry form shown at the bottom of every event-type page, plus a
// "waitlist" variant used by the studio page. Submissions go to
// /api/inquiry, which emails the venue manager — never client services.
export default function InquirySection({
  variant = 'inquiry',
  eventType = '',
  heading,
  intro,
  tourInvite = false,
}: {
  variant?: 'inquiry' | 'waitlist';
  eventType?: string;
  heading?: string;
  intro?: string;
  // Folds the schedule-a-tour invitation into this section so pages don't
  // need a separate tour CTA block. No tour days are published.
  tourInvite?: boolean;
}) {
  const isWaitlist = variant === 'waitlist';
  const [status, setStatus] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle');
  const [form, setForm] = useState({
    name: '',
    email: '',
    phone: '',
    eventDate: '',
    startWindow: '',
    message: '',
  });

  const update = (field: string) => (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => setForm((prev) => ({ ...prev, [field]: e.target.value }));

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (status === 'sending') return;
    setStatus('sending');
    try {
      const res = await fetch('/api/inquiry', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: variant,
          eventType,
          submissionId: crypto.randomUUID(),
          ...form,
        }),
      });
      setStatus(res.ok ? 'sent' : 'error');
    } catch {
      setStatus('error');
    }
  }

  const defaultHeading = isWaitlist ? 'Join the waitlist' : 'Tell us about your event';
  const defaultIntro = isWaitlist
    ? 'Leave your details and you will be first in line when a studio slot opens.'
    : 'Share a few details and our manager will get back to you, usually within a business day.';

  return (
    <section id="inquiry" className="py-16 bg-[#735e59]">
      <div className="max-w-2xl mx-auto px-6">
        <h2 className="text-3xl md:text-4xl font-light text-[#f2eee9] font-serif text-center mb-3">
          {heading ?? defaultHeading}
        </h2>
        <p className="text-[#f2eee9]/80 text-center mb-6 leading-relaxed">{intro ?? defaultIntro}</p>

        {tourInvite && (
          <div className="flex flex-col sm:flex-row gap-3 justify-center items-center mb-10">
            <a
              href={`tel:${VENUE.phone}`}
              className="bg-[#f2eee9] text-[#735e59] font-semibold px-6 py-3 rounded-full hover:bg-white transition-colors duration-200"
            >
              Call {VENUE.phoneDisplay} for a tour
            </a>
            <a
              href={`mailto:${VENUE.email}?subject=Tour%20request`}
              className="border-2 border-[#f2eee9]/60 text-[#f2eee9] font-semibold px-6 py-3 rounded-full hover:bg-[#f2eee9] hover:text-[#735e59] transition-all duration-200"
            >
              Email to schedule a walkthrough
            </a>
          </div>
        )}

        {status === 'sent' ? (
          <div className="bg-[#f2eee9] rounded-3xl p-8 text-center">
            <CheckCircle className="mx-auto text-[#735e59] mb-4" size={40} />
            <p className="text-lg font-semibold text-[#4a3f3c] mb-2">
              {isWaitlist ? "You're on the list." : 'Thanks, we have your inquiry.'}
            </p>
            <p className="text-[#6b5f5b]">
              {isWaitlist
                ? 'We will reach out as soon as a slot opens up.'
                : `We'll be in touch soon. Need us sooner? Call ${VENUE.phoneDisplay}.`}
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="bg-[#f2eee9] rounded-3xl p-6 sm:p-8 space-y-4">
            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <label htmlFor="inq-name" className="block text-sm font-semibold text-[#4a3f3c] mb-1">
                  Name *
                </label>
                <input
                  id="inq-name"
                  type="text"
                  required
                  autoComplete="name"
                  value={form.name}
                  onChange={update('name')}
                  className="w-full rounded-xl border border-[#735e59]/20 bg-white px-4 py-3 text-[#4a3f3c] focus:outline-none focus:ring-2 focus:ring-[#735e59]"
                />
              </div>
              <div>
                <label htmlFor="inq-email" className="block text-sm font-semibold text-[#4a3f3c] mb-1">
                  Email *
                </label>
                <input
                  id="inq-email"
                  type="email"
                  required
                  autoComplete="email"
                  value={form.email}
                  onChange={update('email')}
                  className="w-full rounded-xl border border-[#735e59]/20 bg-white px-4 py-3 text-[#4a3f3c] focus:outline-none focus:ring-2 focus:ring-[#735e59]"
                />
              </div>
            </div>

            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <label htmlFor="inq-phone" className="block text-sm font-semibold text-[#4a3f3c] mb-1">
                  Phone
                </label>
                <input
                  id="inq-phone"
                  type="tel"
                  autoComplete="tel"
                  value={form.phone}
                  onChange={update('phone')}
                  className="w-full rounded-xl border border-[#735e59]/20 bg-white px-4 py-3 text-[#4a3f3c] focus:outline-none focus:ring-2 focus:ring-[#735e59]"
                />
              </div>
              {isWaitlist ? (
                <div>
                  <label htmlFor="inq-window" className="block text-sm font-semibold text-[#4a3f3c] mb-1">
                    Desired start window *
                  </label>
                  <input
                    id="inq-window"
                    type="text"
                    required
                    placeholder="e.g. early 2027, flexible"
                    value={form.startWindow}
                    onChange={update('startWindow')}
                    className="w-full rounded-xl border border-[#735e59]/20 bg-white px-4 py-3 text-[#4a3f3c] placeholder:text-[#a08b84] focus:outline-none focus:ring-2 focus:ring-[#735e59]"
                  />
                </div>
              ) : (
                <div>
                  <label htmlFor="inq-date" className="block text-sm font-semibold text-[#4a3f3c] mb-1">
                    Event date, if you have one
                  </label>
                  <input
                    id="inq-date"
                    type="date"
                    value={form.eventDate}
                    onChange={update('eventDate')}
                    className="w-full rounded-xl border border-[#735e59]/20 bg-white px-4 py-3 text-[#4a3f3c] focus:outline-none focus:ring-2 focus:ring-[#735e59]"
                  />
                </div>
              )}
            </div>

            <div>
              <label htmlFor="inq-message" className="block text-sm font-semibold text-[#4a3f3c] mb-1">
                {isWaitlist ? 'Anything else we should know?' : 'What are you planning? *'}
              </label>
              <textarea
                id="inq-message"
                required={!isWaitlist}
                rows={4}
                value={form.message}
                onChange={update('message')}
                className="w-full rounded-xl border border-[#735e59]/20 bg-white px-4 py-3 text-[#4a3f3c] focus:outline-none focus:ring-2 focus:ring-[#735e59]"
              />
            </div>

            {status === 'error' && (
              <div className="flex items-start gap-2 text-sm text-red-700 bg-red-50 border border-red-200 rounded-xl p-4" role="alert">
                <AlertCircle size={18} className="mt-0.5 flex-shrink-0" />
                <span>
                  Something went wrong sending your message. Please try again, or reach us directly
                  at{' '}
                  <a href={`tel:${VENUE.phone}`} className="font-semibold underline">
                    {VENUE.phoneDisplay}
                  </a>{' '}
                  or{' '}
                  <a href={`mailto:${VENUE.email}`} className="font-semibold underline">
                    {VENUE.email}
                  </a>
                  .
                </span>
              </div>
            )}

            <button
              type="submit"
              disabled={status === 'sending'}
              className="w-full flex items-center justify-center gap-2 bg-[#735e59] text-[#f2eee9] font-semibold py-4 rounded-xl hover:bg-[#5a4a46] transition-colors duration-200 disabled:opacity-60"
            >
              <Send size={18} />
              {status === 'sending' ? 'Sending…' : isWaitlist ? 'Join the waitlist' : 'Send inquiry'}
            </button>

            <p className="text-xs text-[#a08b84] text-center">
              Prefer to talk? Call{' '}
              <a href={`tel:${VENUE.phone}`} className="underline">
                {VENUE.phoneDisplay}
              </a>{' '}
              or email{' '}
              <a href={`mailto:${VENUE.email}`} className="underline">
                {VENUE.email}
              </a>
              .
            </p>
          </form>
        )}
      </div>
    </section>
  );
}
