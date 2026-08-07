'use client';

import { useState } from 'react';
import { Send, CheckCircle2, AlertCircle } from 'lucide-react';
import { contact } from '@/app/data/site';

type InquiryKind = 'event' | 'tour' | 'waitlist' | 'congregation' | 'class-partnership';

interface InquiryFormProps {
  kind: InquiryKind;
  /** Path of the page hosting the form, e.g. "/weddings" */
  page: string;
  heading?: string;
  subheading?: string;
  /** Show event-specific fields (type, date, guest count) */
  showEventFields?: boolean;
  /** Waitlist variant: collects a desired start window instead */
  showStartWindow?: boolean;
  /** Preset value for the event type field */
  defaultEventType?: string;
  submitLabel?: string;
  successMessage?: string;
}

export default function InquiryForm({
  kind,
  page,
  heading = 'Tell Us About Your Event',
  subheading,
  showEventFields = true,
  showStartWindow = false,
  defaultEventType = '',
  submitLabel = 'Send Inquiry',
  successMessage = "Thanks for reaching out. We reply personally, usually within one business day.",
}: InquiryFormProps) {
  const [status, setStatus] = useState<'idle' | 'sending' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState('');

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (status === 'sending') return;
    setStatus('sending');
    setErrorMessage('');

    const form = e.currentTarget;
    const data = new FormData(form);
    const payload: Record<string, string> = { kind, page };
    for (const key of ['name', 'email', 'phone', 'eventType', 'eventDate', 'guestCount', 'startWindow', 'message', 'website']) {
      const value = data.get(key);
      if (typeof value === 'string' && value.trim()) payload[key] = value.trim();
    }

    try {
      const res = await fetch('/api/inquiry', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(body?.error || 'Something went wrong.');
      }
      setStatus('success');
      form.reset();
    } catch (err) {
      setStatus('error');
      setErrorMessage(err instanceof Error ? err.message : 'Something went wrong.');
    }
  }

  const inputClasses =
    'w-full rounded-xl border border-[#735e59]/20 bg-white px-4 py-3 text-[#4a3f3c] placeholder-[#a08b84] focus:outline-none focus:ring-2 focus:ring-[#735e59]/40 focus:border-[#735e59]/40 transition';

  if (status === 'success') {
    return (
      <div className="bg-white rounded-3xl p-10 border border-[#735e59]/10 shadow-lg text-center">
        <CheckCircle2 size={40} className="mx-auto text-[#735e59] mb-4" />
        <h3 className="text-2xl font-bold text-[#4a3f3c] font-serif mb-2">Inquiry sent</h3>
        <p className="text-[#6b5f5b] leading-relaxed">{successMessage}</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-3xl p-8 md:p-10 border border-[#735e59]/10 shadow-lg">
      <h3 className="text-2xl md:text-3xl font-light text-[#4a3f3c] font-serif mb-2">{heading}</h3>
      {subheading && <p className="text-[#6b5f5b] mb-6">{subheading}</p>}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label htmlFor={`${kind}-name`} className="block text-sm font-semibold text-[#4a3f3c] mb-1.5">
              Name
            </label>
            <input id={`${kind}-name`} name="name" required maxLength={120} autoComplete="name" className={inputClasses} />
          </div>
          <div>
            <label htmlFor={`${kind}-email`} className="block text-sm font-semibold text-[#4a3f3c] mb-1.5">
              Email
            </label>
            <input id={`${kind}-email`} name="email" type="email" required maxLength={200} autoComplete="email" className={inputClasses} />
          </div>
        </div>

        <div className={showEventFields ? 'grid sm:grid-cols-2 gap-4' : ''}>
          <div>
            <label htmlFor={`${kind}-phone`} className="block text-sm font-semibold text-[#4a3f3c] mb-1.5">
              Phone <span className="font-normal text-[#a08b84]">(optional)</span>
            </label>
            <input id={`${kind}-phone`} name="phone" type="tel" maxLength={40} autoComplete="tel" className={inputClasses} />
          </div>
          {showEventFields && (
            <div>
              <label htmlFor={`${kind}-eventType`} className="block text-sm font-semibold text-[#4a3f3c] mb-1.5">
                Type of event
              </label>
              <input
                id={`${kind}-eventType`}
                name="eventType"
                maxLength={100}
                defaultValue={defaultEventType}
                placeholder="Wedding, concert, memorial…"
                className={inputClasses}
              />
            </div>
          )}
        </div>

        {showEventFields && (
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor={`${kind}-eventDate`} className="block text-sm font-semibold text-[#4a3f3c] mb-1.5">
                Preferred date <span className="font-normal text-[#a08b84]">(optional)</span>
              </label>
              <input id={`${kind}-eventDate`} name="eventDate" maxLength={40} placeholder="June 2027, flexible…" className={inputClasses} />
            </div>
            <div>
              <label htmlFor={`${kind}-guestCount`} className="block text-sm font-semibold text-[#4a3f3c] mb-1.5">
                Guest count <span className="font-normal text-[#a08b84]">(optional)</span>
              </label>
              <input id={`${kind}-guestCount`} name="guestCount" maxLength={20} inputMode="numeric" className={inputClasses} />
            </div>
          </div>
        )}

        {showStartWindow && (
          <div>
            <label htmlFor={`${kind}-startWindow`} className="block text-sm font-semibold text-[#4a3f3c] mb-1.5">
              When would you like to start?
            </label>
            <input
              id={`${kind}-startWindow`}
              name="startWindow"
              maxLength={120}
              placeholder="January 2027, as soon as possible…"
              className={inputClasses}
            />
          </div>
        )}

        <div>
          <label htmlFor={`${kind}-message`} className="block text-sm font-semibold text-[#4a3f3c] mb-1.5">
            Anything else we should know? <span className="font-normal text-[#a08b84]">(optional)</span>
          </label>
          <textarea id={`${kind}-message`} name="message" rows={4} maxLength={2000} className={inputClasses} />
        </div>

        {/* Honeypot: hidden from real users, filled by bots */}
        <div className="hidden" aria-hidden="true">
          <label htmlFor={`${kind}-website`}>Website</label>
          <input id={`${kind}-website`} name="website" tabIndex={-1} autoComplete="off" />
        </div>

        {status === 'error' && (
          <p className="flex items-start gap-2 text-sm text-red-700 bg-red-50 rounded-xl px-4 py-3">
            <AlertCircle size={18} className="shrink-0 mt-0.5" />
            <span>{errorMessage}</span>
          </p>
        )}

        <button
          type="submit"
          disabled={status === 'sending'}
          className="inline-flex items-center gap-2 bg-[#735e59] text-[#f2eee9] font-bold px-8 py-4 rounded-full shadow-lg hover:bg-[#5a4a46] hover:-translate-y-0.5 transition-all duration-300 disabled:opacity-60 disabled:hover:translate-y-0"
        >
          <Send size={18} />
          {status === 'sending' ? 'Sending…' : submitLabel}
        </button>

        <p className="text-xs text-[#a08b84]">
          Prefer to talk? Call{' '}
          <a href={contact.inquiries.phoneHref} className="underline hover:text-[#735e59]">
            {contact.inquiries.phone}
          </a>{' '}
          or email{' '}
          <a href={`mailto:${contact.inquiries.email}`} className="underline hover:text-[#735e59]">
            {contact.inquiries.email}
          </a>
          .
        </p>
      </form>
    </div>
  );
}
