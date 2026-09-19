// Local-only browser acceptance test. Uses a synthetic account; never user credentials.
import { createRequire } from 'node:module';
import { mkdir } from 'node:fs/promises';
import { resolve } from 'node:path';
import { randomUUID } from 'node:crypto';
import assert from 'node:assert/strict';
const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PLAYWRIGHT_MODULE_PATH || 'playwright');
const base = process.env.SHIPPING_TEST_URL || 'http://127.0.0.1:5173';
assert(['127.0.0.1', 'localhost'].includes(new URL(base).hostname), 'Test must target localhost');
const artifacts = resolve(process.env.SHIPPING_TEST_ARTIFACTS || '.shipping-test-artifacts');
await mkdir(artifacts, { recursive: true });
assert(process.env.DATABASE_URL, 'DATABASE_URL is required for synthetic-account cleanup');
assert(['127.0.0.1', 'localhost'].includes(new URL(process.env.DATABASE_URL).hostname));
const browser = await chromium.launch({ headless: true, channel: 'msedge' });
const context = await browser.newContext({
	baseURL: base,
	viewport: { width: 1440, height: 1100 }
});
let testUser;
let page;
const email = `shipping-smoke-${randomUUID()}@example.test`;
try {
	page = await context.newPage();
	const errors = [];
	page.on('pageerror', (error) => errors.push(error.message));
	await page.goto('/shipping');
	await page.waitForURL('**/demo/better-auth/login');
	const unauth = await context.request.get(
		'/shipping/email_001/attachment?path=attachments/email_001_SI.txt'
	);
	assert.equal(unauth.status(), 401);
	const signup = await context.request.post('/api/auth/sign-up/email', {
		headers: { origin: base },
		data: { name: 'Shipping browser test', email, password: randomUUID() + 'aA1!' }
	});
	assert.equal(signup.status(), 200, await signup.text());
	testUser = (await signup.json()).user.id;

	await page.goto('/');
	await page.waitForURL('**/shipping/overview');
	await page.getByRole('heading', { name: 'Evidence Map', exact: true }).waitFor();
	const summaries = page.locator('.evidence-summary');
	const total = await summaries.evaluateAll((nodes) =>
		nodes.reduce((n, node) => n + Number(node.querySelector('span').textContent), 0)
	);
	assert.equal(total, 520);
	await page.getByRole('button', { name: 'Next', exact: true }).click();
	await page.getByRole('status').filter({ hasText: 'Page 2 of' }).waitFor();
	await page.getByRole('textbox', { name: 'Search evidence' }).fill('email_001');
	await page.getByRole('status').filter({ hasText: '1 results · Page 1 of 1' }).waitFor();
	const mapWeight = page.getByRole('link', {
		name: 'email_001: Gross weight (kg) — Match',
		exact: true
	});
	await mapWeight.click();
	await page.waitForURL('**/shipping/email_001#field-gross_weight_kg');
	assert(
		(await page.locator('#field-gross_weight_kg details').first().getAttribute('open')) !== null
	);
	await page.goto('/shipping');
	await page.getByRole('heading', { name: 'Shipping Review', exact: true }).waitFor();
	await page.goto('/shipping/email_001');
	await page.getByText(/View email body/).click();
	await page.locator('pre').filter({ hasText: 'Attached are the SI and draft BL' }).waitFor();
	const confirm = page.getByRole('button', { name: 'Confirm saved result', exact: true });
	assert(await confirm.isDisabled());
	await page
		.locator('textarea[name="reason"]')
		.fill('Initial review of source documents and classification');
	await page.getByRole('button', { name: 'Save corrections and recheck', exact: true }).click();
	await page.getByRole('status').filter({ hasText: 'Saved and rechecked' }).waitFor();
	assert(await confirm.isEnabled());
	await page
		.locator('textarea[name="reason"]')
		.fill('Confirm the saved result against the originals');
	await confirm.click();
	await page
		.getByRole('status')
		.filter({ hasText: 'The current revision has been confirmed' })
		.waitFor();
	await page.getByText('Edit SI Gross weight (kg)', { exact: true }).click();
	const originalWeight = await page
		.locator('textarea[name="value.si.gross_weight_kg"]')
		.inputValue();
	await page.getByText('Edit BL Gross weight (kg)', { exact: true }).click();
	await page.locator('input[name="edit.bl.gross_weight_kg"]').check();
	await page.locator('textarea[name="value.bl.gross_weight_kg"]').fill('TBA');
	assert(await confirm.isDisabled());
	await page
		.locator('input[name="source.bl.gross_weight_kg"]')
		.fill('Page 1: gross weight awaiting confirmation');
	await page
		.locator('textarea[name="reason"]')
		.fill('Check that unknown values require further review');
	await page.getByRole('button', { name: 'Save corrections and recheck', exact: true }).click();
	await page.getByText('Needs evidence', { exact: true }).waitFor();

	assert(await confirm.isDisabled());
	await page.goto('/shipping/overview');
	await page.getByRole('textbox', { name: 'Search evidence' }).fill('email_001');
	await page.getByRole('button', { name: '1 Missing evidence', exact: true }).click();
	await page
		.getByRole('link', { name: 'email_001: Gross weight (kg) — Unknown', exact: true })
		.click();
	await page.waitForURL('**/shipping/email_001#field-gross_weight_kg');
	await page.locator('textarea[name="value.bl.gross_weight_kg"]').fill(originalWeight);
	await page
		.locator('input[name="source.bl.gross_weight_kg"]')
		.fill('Page 1: verified gross weight');
	await page.locator('textarea[name="reason"]').fill('Restore the original value and recheck');
	await page.getByRole('button', { name: 'Save corrections and recheck', exact: true }).click();
	await page.getByRole('status').filter({ hasText: 'Saved and rechecked' }).waitFor();
	await page.getByText('email_001 · Revision 4', { exact: true }).waitFor();
	assert(await confirm.isEnabled());
	await page.reload();
	await page.getByRole('heading', { name: 'Revision and confirmation history' }).waitFor();
	assert.match(await page.locator('body').innerText(), /V4/);
	assert.match(await page.locator('body').innerText(), /Match confirmed/);
	const original = await context.request.get(
		'/shipping/email_001/attachment?path=attachments/email_001_SI.txt'
	);
	assert.equal(original.status(), 200);
	assert.match(await original.text(), /SHIPPING INSTRUCTION/);
	const traversal = await context.request.get('/shipping/email_001/attachment?path=../../.env');
	assert.equal(traversal.status(), 404);
	await page.evaluate(() => window.scrollTo(0, 0));
	await page.screenshot({
		path: resolve(artifacts, 'shipping-review-overview.png'),
		fullPage: false
	});
	await page.screenshot({
		path: resolve(artifacts, 'shipping-review-desktop.png'),
		fullPage: true
	});
	await page.setViewportSize({ width: 390, height: 844 });
	await page.goto('/shipping');
	await page.getByRole('heading', { name: 'Shipping Review', exact: true }).waitFor();
	await page.evaluate(() => window.scrollTo(0, 0));
	assert(
		await page.locator('.review-queue-head').isHidden(),
		'Mobile queue must hide desktop column headings'
	);
	await page.screenshot({ path: resolve(artifacts, 'shipping-queue-mobile.png'), fullPage: false });
	assert(
		await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
		'Mobile queue must not overflow'
	);
	await page.goto('/shipping/email_001');
	assert(
		await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
		'Mobile review must not overflow'
	);
	await page.screenshot({ path: resolve(artifacts, 'shipping-review-mobile.png'), fullPage: true });

	await page.goto('/shipping/overview');
	await page.getByRole('heading', { name: 'Evidence Map', exact: true }).waitFor();
	assert(
		await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
		'Mobile dashboard must not overflow'
	);
	await page.screenshot({ path: resolve(artifacts, 'evidence-map-mobile.png'), fullPage: false });
	await page.setViewportSize({ width: 1440, height: 1100 });
	await page
		.getByRole('combobox', { name: 'Email category', exact: true })
		.selectOption('BL_COMPARISON');
	await page.screenshot({ path: resolve(artifacts, 'evidence-map-desktop.png'), fullPage: false });
	assert.equal(errors.length, 0, errors.join('\n'));
	console.log(
		'PASS: homepage, dashboard counts/filters/pagination, field drill-down, live correction projection, login gate, review workflow, persisted history, attachment checks and mobile overflow; no browser page errors.'
	);
} catch (error) {
	if (page) {
		console.error((await page.locator('main').innerText()).slice(0, 2500));
		await page.evaluate(() => window.scrollTo(0, 0));
		await page.screenshot({ path: resolve(artifacts, 'shipping-failure.png'), fullPage: true });
	}
	throw error;
} finally {
	await browser.close();
	// Only remove this run's synthetic account and its cascading review records.
	if (testUser && process.env.DATABASE_URL) {
		const { Client } = require('pg');
		const url = new URL(process.env.DATABASE_URL);
		assert(['127.0.0.1', 'localhost'].includes(url.hostname));
		const client = new Client({ connectionString: url.toString() });
		await client.connect();
		try {
			await client.query('DELETE FROM "user" WHERE id=$1 AND email=$2', [testUser, email]);
		} finally {
			await client.end();
		}
	}
}
