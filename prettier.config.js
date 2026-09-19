/** @type {import("prettier").Config} */
const config = {
	useTabs: true,
	singleQuote: true,
	trailingComma: 'none',
	printWidth: 100,
	// Accept both CRLF (Windows local checkout) and LF (CI/Linux) so `prettier --check`
	// is green cross-platform. Preserve the current checkout line endings.
	endOfLine: 'auto',
	plugins: ['prettier-plugin-svelte', 'prettier-plugin-tailwindcss'],
	overrides: [{ files: '*.svelte', options: { parser: 'svelte' } }],
	tailwindStylesheet: './src/routes/layout.css'
};

export default config;
