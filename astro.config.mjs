import { defineConfig } from 'astro/config';
import react from '@astrojs/react';

export default defineConfig({
  site: 'https://cars24.com.ua',
  integrations: [react()],
  output: 'static',
  build: { format: 'directory' },
});
