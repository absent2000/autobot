import { defineConfig } from 'astro/config';
import react from '@astrojs/react';

const previewBase = process.env.CARS24_PREVIEW_BASE || '/';

export default defineConfig({
  site: 'https://cars24.com.ua',
  base: previewBase,
  integrations: [react()],
  output: 'static',
  build: { format: 'directory' },
});
