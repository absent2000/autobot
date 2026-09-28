import { defineConfig } from 'astro/config';
const previewBase = process.env.CARS24_PREVIEW_BASE || '/';
export default defineConfig({ site:'https://cars24.com.ua', base:previewBase, output:'static', build:{format:'directory'} });
