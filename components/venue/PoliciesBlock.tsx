import { POLICIES } from '@/app/data/venue';

// House policies, stated once per page in their own section. `include` picks
// which policies a page shows (by label); by default the mixer note is left
// out since it only matters on pages that talk about live sound.
export default function PoliciesBlock({
  heading = 'Good to know',
  include,
  extra = [],
}: {
  heading?: string;
  include?: string[];
  extra?: { label: string; text: string }[];
}) {
  const defaults = POLICIES.filter((p) =>
    include ? include.includes(p.label) : p.label !== 'Live sound'
  );
  const policies = [...defaults, ...extra];

  return (
    <section className="py-16 bg-[#f2eee9]/60">
      <div className="max-w-4xl mx-auto px-6">
        <h2 className="text-3xl md:text-4xl font-light text-[#4a3f3c] font-serif text-center mb-10">
          {heading}
        </h2>
        <dl className="space-y-6">
          {policies.map((policy) => (
            <div key={policy.label} className="bg-white rounded-2xl p-6 shadow-sm border border-[#735e59]/10">
              <dt className="font-semibold text-[#4a3f3c] mb-1">{policy.label}</dt>
              <dd className="text-[#6b5f5b] leading-relaxed">{policy.text}</dd>
            </div>
          ))}
        </dl>
      </div>
    </section>
  );
}
