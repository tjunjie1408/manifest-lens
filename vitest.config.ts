import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

/**
 * Integration tests run against a REAL, isolated PostgreSQL database (never a
 * mock or SQLite fallback — readiness plan §6E / S7). Values from `.env.test`
 * are defaults; anything already set in the environment (e.g. CI's DATABASE_URL)
 * wins, so the same suite runs locally and against a CI PostgreSQL service.
 */
function loadTestEnv(): Record<string, string> {
	const out: Record<string, string> = {};
	try {
		const raw = readFileSync(new URL('./.env.test', import.meta.url), 'utf8');
		for (const line of raw.split('\n')) {
			const trimmed = line.trim();
			if (!trimmed || trimmed.startsWith('#')) continue;
			const eq = trimmed.indexOf('=');
			if (eq === -1) continue;
			const key = trimmed.slice(0, eq).trim();
			const value = trimmed.slice(eq + 1).trim();
			out[key] = process.env[key] ?? value;
		}
	} catch {
		// no .env.test — rely entirely on process.env
	}
	return out;
}

export default defineConfig({
	test: {
		include: ['tests/**/*.test.ts'],
		globalSetup: ['tests/global-setup.ts'],
		setupFiles: ['tests/setup.ts'],
		env: loadTestEnv(),
		// One shared test database: keep files serial to avoid cross-file races.
		fileParallelism: false,
		testTimeout: 30000,
		hookTimeout: 30000
	},
	resolve: {
		alias: {
			$lib: fileURLToPath(new URL('./src/lib', import.meta.url)),
			'$env/dynamic/private': fileURLToPath(
				new URL('./tests/shims/env-dynamic-private.ts', import.meta.url)
			)
		}
	}
});
