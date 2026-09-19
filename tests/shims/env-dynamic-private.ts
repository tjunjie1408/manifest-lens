// Test shim for SvelteKit's `$env/dynamic/private`. Server modules read env via
// this virtual module; under Vitest we alias it to plain process.env (populated
// from .env.test / the CI environment). Values are read live, matching the
// adapter-node runtime behaviour.
export const env: Record<string, string | undefined> = process.env;
