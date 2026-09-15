import { env } from '$env/dynamic/private';

/**
 * AI service seam.
 *
 * Callers (routes, other services) use THIS module — never an AI SDK directly.
 * When a competition needs AI, implement `complete()` here and nothing else
 * changes:
 *   - External API (OpenAI / Anthropic / hosted model): fetch below, keeping
 *     the key server-side via `env.AI_API_KEY`. Covers ~90% of cases.
 *   - Heavy local model / Python libs / GPU: run a separate Python service and
 *     fetch it here. SvelteKit stays a thin proxy.
 * Either way the signature is stable, so callers never care which it is.
 */

export interface CompletionRequest {
	prompt: string;
	system?: string;
}

export async function complete(req: CompletionRequest): Promise<string> {
	if (!env.AI_API_KEY) {
		throw new Error('AI service not configured: set AI_API_KEY in .env and implement complete().');
	}

	// TODO: call your provider using req.prompt / req.system and return the text.
	// Example (external API):
	//   const res = await fetch('https://api.provider.com/v1/messages', {
	//     method: 'POST',
	//     headers: { authorization: `Bearer ${env.AI_API_KEY}`, 'content-type': 'application/json' },
	//     body: JSON.stringify({ prompt: req.prompt, system: req.system })
	//   });
	//   if (!res.ok) throw new Error(`AI provider returned ${res.status}`);
	//   return (await res.json()).text;

	throw new Error(`AI service not implemented (received a ${req.prompt.length}-char prompt).`);
}
