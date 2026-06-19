// @ts-check
import { defineConfig } from 'astro/config';
import starlight from '@astrojs/starlight';

// https://astro.build/config
export default defineConfig({
	site: 'https://docs.teemtape.com',
	integrations: [
		starlight({
			title: 'teemtape docs',
			description:
				'Documentation for teemtape — an open-source ticker app for leaving anonymous notes next to stock symbols from the web, CLI, and (soon) mobile.',
			logo: {
				src: './public/favicon.svg',
				alt: 'teemtape',
			},
			social: [
				{
					icon: 'github',
					label: 'GitHub',
					href: 'https://github.com/kiwifellows/teemtape',
				},
			],
			editLink: {
				baseUrl: 'https://github.com/kiwifellows/teemtape/edit/main/apps/docs/',
			},
			lastUpdated: true,
			credits: false,
			components: {
				Footer: './src/components/Footer.astro',
			},
			sidebar: [
				{
					label: 'Start here',
					items: [
						{ label: 'What is teemtape?', slug: 'start/what-is-teemtape' },
						{ label: 'Quick start', slug: 'start/quick-start' },
						{ label: 'Key concepts', slug: 'start/concepts' },
					],
				},
				{
					label: 'For end users',
					items: [
						{ label: 'Using the web app', slug: 'users/web-app' },
						{ label: 'Watchlists & sharing', slug: 'users/watchlists' },
						{ label: 'Anonymous handles', slug: 'users/handles' },
						{ label: 'Using the CLI', slug: 'users/cli' },
						{ label: 'FAQ', slug: 'users/faq' },
					],
				},
				{
					label: 'For agents',
					items: [
						{ label: 'Agent collaboration', slug: 'agents/overview' },
						{ label: 'Driving the CLI', slug: 'agents/cli' },
						{ label: 'The teemtape skill', slug: 'agents/skill' },
						{ label: 'JSON output shapes', slug: 'agents/json-output' },
					],
				},
				{
					label: 'Reference',
					items: [
						{ label: 'Architecture', slug: 'reference/architecture' },
						{ label: 'HTTP API', slug: 'reference/api' },
						{ label: 'CLI commands', slug: 'reference/cli-commands' },
						{ label: 'Configuration', slug: 'reference/configuration' },
						{ label: 'Roadmap', slug: 'reference/roadmap' },
						{ label: 'Releases', slug: 'reference/releases' },
					],
				},
				{
					label: 'Contributing',
					items: [
						{ label: 'Contributing guide', slug: 'contributing/guide' },
						{ label: 'Local development', slug: 'contributing/local-development' },
						{ label: 'License', slug: 'contributing/license' },
					],
				},
			],
		}),
	],
});
