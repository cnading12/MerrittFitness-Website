import Link from 'next/link';
import { buildPricing } from '@/app/data/venue';

// Real rates, mirrored from the booking engine's constants (see
// app/data/venue.ts). Never hardcode a dollar figure in a page — pass flags
// here instead so the numbers stay in lockstep with what renters are billed.
export default function PricingBlock({
  heading = 'Pricing',
  intro,
  showRecurring = false,
  showEquipment = true,
  showStaffing = true,
  showMat = false,
}: {
  heading?: string;
  intro?: string;
  showRecurring?: boolean;
  showEquipment?: boolean;
  showStaffing?: boolean;
  // The full-hall roll-out mat only matters to movement and wellness renters;
  // leave it off event pages like weddings where it is just noise.
  showMat?: boolean;
}) {
  const pricing = buildPricing();

  return (
    <section className="py-16 bg-white">
      <div className="max-w-4xl mx-auto px-6">
        <h2 className="text-3xl md:text-4xl font-light text-[#4a3f3c] font-serif text-center mb-4">
          {heading}
        </h2>
        {intro && (
          <p className="text-[#6b5f5b] text-center max-w-2xl mx-auto mb-8 leading-relaxed">{intro}</p>
        )}

        <div className="overflow-x-auto rounded-2xl border border-[#735e59]/15 shadow-sm mb-8">
          <table className="w-full text-left text-sm sm:text-base">
            <thead>
              <tr className="bg-[#f2eee9] text-[#4a3f3c]">
                <th className="px-4 py-3 font-semibold">Guests</th>
                <th className="px-4 py-3 font-semibold">Sunday – Friday</th>
                <th className="px-4 py-3 font-semibold">Saturday</th>
                {showRecurring && (
                  <th className="px-4 py-3 font-semibold">
                    Recurring partner rate ({pricing.recurring.pct}% off)
                  </th>
                )}
              </tr>
            </thead>
            <tbody className="text-[#6b5f5b]">
              {pricing.tiers.map((tier) => (
                <tr key={tier.guests} className="border-t border-[#735e59]/10">
                  <td className="px-4 py-3 font-medium text-[#4a3f3c]">{tier.guests}</td>
                  <td className="px-4 py-3">{tier.weekday}/hour</td>
                  <td className="px-4 py-3">{tier.saturday}/hour</td>
                  {showRecurring && (
                    <td className="px-4 py-3">
                      {tier.weekdayRecurring}/hour weekday, {tier.saturdayRecurring}/hour Saturday
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <ul className="space-y-3 text-[#6b5f5b] leading-relaxed">
          <li>
            <strong className="text-[#4a3f3c]">{pricing.minimumHours}-hour minimum</strong> on all
            single-event rentals, and your rental window includes your setup and breakdown time.
          </li>
          <li>
            <strong className="text-[#4a3f3c]">
              Book {pricing.extended.minHours}+ hours and save {pricing.extended.pct}%
            </strong>{' '}
            automatically; for example, {pricing.extended.example}.
          </li>
          {showRecurring && (
            <li>
              <strong className="text-[#4a3f3c]">
                Recurring schedules of {pricing.recurring.minMonthlyHours}+ hours per month get{' '}
                {pricing.recurring.pct}% off
              </strong>{' '}
              the hourly rate automatically, so {pricing.recurring.exampleWeekday}.
            </li>
          )}
          {showStaffing && (
            <li>
              <strong className="text-[#4a3f3c]">On-site staffing:</strong> events under{' '}
              {pricing.staffing.supervisionThreshold} guests include a one-time{' '}
              {pricing.staffing.onboardingFee} first-visit onboarding hour; events of{' '}
              {pricing.staffing.supervisionThreshold}+ guests have a facility host at{' '}
              {pricing.staffing.supervisionRate}/hour for the duration of the event.
            </li>
          )}
          {showEquipment && (
            <li>
              <strong className="text-[#4a3f3c]">Add-ons:</strong> tables and chairs can be added at{' '}
              {pricing.equipment.tablesChairsSmall} per item type (
              {pricing.equipment.tablesChairsLarge} for {pricing.equipment.tablesChairsThreshold}+
              guests){showMat ? (
                <>
                  , the full-hall roll-out floor mat is {pricing.equipment.mat} per booking,
                </>
              ) : null}{' '}
              and opening the cafe lounge into the main hall by removing the glass-and-wood
              dividers is {pricing.equipment.dividerRemoval} per booking.
            </li>
          )}
        </ul>

        <p className="text-[#6b5f5b] mt-8 text-center">
          Exact totals for your date and guest count are calculated on the{' '}
          <Link href="/booking" className="text-[#735e59] font-semibold underline underline-offset-4 hover:text-[#5a4a46]">
            booking page
          </Link>
          .
        </p>
      </div>
    </section>
  );
}
