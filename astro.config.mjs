import { defineConfig } from 'astro/config';
import cloudflare from '@astrojs/cloudflare';

import tailwind from '@astrojs/tailwind';
import sitemap from '@astrojs/sitemap';

export default defineConfig({
  output: 'server',
  site: 'https://onlinecopypaste.com',
  i18n: {
    locales: ['en', 'es', 'ja', 'fr', 'de', 'pt', 'ko', 'it'],
    defaultLocale: 'en',
    routing: {
      prefixDefaultLocale: false
    }
  },

  adapter: cloudflare({ imageService: 'passthrough' }),
  session: false,

  integrations: [
    tailwind({ applyBaseStyles: false }),
    sitemap({
      customPages: [
        'https://onlinecopypaste.com/es/',
        'https://onlinecopypaste.com/ja/',
        'https://onlinecopypaste.com/fr/',
        'https://onlinecopypaste.com/de/',
        'https://onlinecopypaste.com/pt/',
        'https://onlinecopypaste.com/ko/',
        'https://onlinecopypaste.com/it/',
        'https://onlinecopypaste.com/privacy',
        'https://onlinecopypaste.com/terms',
        'https://onlinecopypaste.com/contact'
      ]
    })
  ]
});