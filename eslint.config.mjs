// Flat config for ESLint 9 + eslint-config-next 16.
//
// eslint-config-next 16 ships native flat configs, so the old
// FlatCompat.extends("next/core-web-vitals") bridge is no longer needed — and
// no longer WORKS: running it threw "Converting circular structure to JSON"
// out of @eslint/eslintrc, which meant `npm run lint` failed before linting a
// single file. (`next lint` was removed in Next 16 too, so the npm script now
// calls eslint directly.)
import coreWebVitals from 'eslint-config-next/core-web-vitals';
import typescript from 'eslint-config-next/typescript';

export default [
  ...coreWebVitals,
  ...typescript,
  {
    ignores: ['.next/**', 'node_modules/**', 'public/**', 'next-env.d.ts'],
  },
];
