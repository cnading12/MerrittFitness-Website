import { policies } from '@/app/data/site';

interface Policy {
  title: string;
  body: string;
}

interface PoliciesBlockProps {
  heading?: string;
  /** Extra page-specific policies (e.g. the mixer note on /concerts) */
  extra?: Policy[];
  /** Replace the default site-wide policy list entirely */
  items?: ReadonlyArray<Policy>;
}

export default function PoliciesBlock({ heading = 'Good to Know', extra = [], items = policies }: PoliciesBlockProps) {
  const all = [...items, ...extra];
  return (
    <div>
      <h2 className="text-3xl md:text-4xl font-light text-[#4a3f3c] font-serif mb-10">{heading}</h2>
      <div className="grid md:grid-cols-3 gap-6">
        {all.map((policy) => (
          <div key={policy.title} className="bg-white rounded-3xl p-8 border border-[#735e59]/10 shadow-sm">
            <h3 className="text-lg font-bold text-[#735e59] font-serif mb-3">{policy.title}</h3>
            <p className="text-[#6b5f5b] leading-relaxed text-sm">{policy.body}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
