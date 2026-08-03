import { rateBands, money, minimumHours } from '@/app/lib/venue-rates';

interface RateTableProps {
  /** Include the recurring (20% volume discount) column, for partnership pages */
  showRecurring?: boolean;
  footnote?: string;
}

// The hourly rate table, straight from the booking engine's constants.
export default function RateTable({ showRecurring = false, footnote }: RateTableProps) {
  return (
    <div>
      <div className="overflow-x-auto rounded-3xl border border-[#735e59]/10 bg-white shadow-sm">
        <table className="w-full text-left min-w-[420px]">
          <thead>
            <tr className="border-b border-[#735e59]/10">
              <th className="px-6 py-4 text-sm font-semibold uppercase tracking-wide text-[#a08b84]">Guests</th>
              <th className="px-6 py-4 text-sm font-semibold uppercase tracking-wide text-[#a08b84]">Sunday to Friday</th>
              <th className="px-6 py-4 text-sm font-semibold uppercase tracking-wide text-[#a08b84]">Saturday</th>
              {showRecurring && (
                <th className="px-6 py-4 text-sm font-semibold uppercase tracking-wide text-[#a08b84]">Recurring partner</th>
              )}
            </tr>
          </thead>
          <tbody>
            {rateBands.map((band) => (
              <tr key={band.guests} className="border-b border-[#735e59]/5 last:border-0">
                <td className="px-6 py-4 font-semibold text-[#4a3f3c]">{band.guests}</td>
                <td className="px-6 py-4 text-[#6b5f5b]">{money(band.weekday)}/hour</td>
                <td className="px-6 py-4 text-[#6b5f5b]">{money(band.saturday)}/hour</td>
                {showRecurring && (
                  <td className="px-6 py-4 font-semibold text-[#735e59]">{money(band.weekdayRecurring)}/hour</td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="mt-3 text-sm text-[#a08b84]">
        {footnote || `${minimumHours}-hour minimum per booking. Setup and breakdown happen within your booked window.`}
      </p>
    </div>
  );
}
