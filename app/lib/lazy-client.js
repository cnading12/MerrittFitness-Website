// app/lib/lazy-client.js
// Defers SDK client construction until first use. Constructors like
// new Stripe(key), new Resend(key), and createClient(url, key) throw when
// their env vars are undefined, and `next build` evaluates every route
// module during page-data collection — so building in an environment
// without runtime secrets (e.g. Vercel preview without env vars, CI)
// crashes the whole build. Wrapping the constructor keeps call sites
// unchanged (`supabase.from(...)`, `stripe.customers.create(...)`) while
// only constructing the real client on first property access at runtime.
export function lazyClient(create) {
  let client;
  return new Proxy({}, {
    get(_, prop) {
      client ??= create();
      const value = client[prop];
      return typeof value === 'function' ? value.bind(client) : value;
    },
  });
}
