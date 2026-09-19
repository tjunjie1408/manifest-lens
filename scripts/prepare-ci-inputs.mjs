// CI-only email envelopes: not original messages, benchmark data, or deployment inputs.
import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

if (process.env.CI !== 'true') throw new Error('Run only in an isolated CI checkout.');
const audit = JSON.parse(await readFile('worker/reports/experiment-v2/audit.json', 'utf8'));
const records = Object.entries(audit).map(([id, item]) => {
	if (!/^email_\d+$/.test(id) || typeof item.subject !== 'string') {
		throw new Error('Invalid audit record');
	}
	return [
		id,
		{
			email_id: id,
			from: 'fixture@example.invalid',
			subject: item.subject,
			body: 'Synthetic CI envelope. Original email and attachment bytes are not included.',
			attachments: item.documents.map((document) => document.path)
		}
	];
});
const root = resolve('sdoc-hackathon-docker');
// Intentionally fail if a supplied dataset already exists. Never overwrite it.
await mkdir(root);
await mkdir(resolve(root, 'data_v2/inbox'), { recursive: true });
await mkdir(resolve(root, 'data_v2/attachments'), { recursive: true });
for (const [id, record] of records) {
	await writeFile(resolve(root, 'data_v2/inbox', `${id}.json`), JSON.stringify(record), {
		flag: 'wx'
	});
}
console.log(`Prepared ${records.length} CI envelopes; original attachment tests are not covered.`);
