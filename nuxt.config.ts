import tailwindcss from '@tailwindcss/vite'

// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',
  devtools: { enabled: true },

  modules: [
    '@pinia/nuxt',
    '@vueuse/nuxt',
    '@nuxt/icon',
    '@nuxt/image',
    '@nuxt/fonts',
    'nuxt-gtag',
    '@nuxtjs/color-mode',
  ],

  vite: {
    plugins: [tailwindcss()],
    esbuild: {
      drop: process.env.NODE_ENV === 'production' ? ['console', 'debugger'] : [],
    },
  },

  css: ['~/assets/css/tailwind.css'],

  app: {
    head: {
      title: 'TerraWorld',
      meta: [
        { charset: 'utf-8' },
        { name: 'viewport', content: 'width=device-width, initial-scale=1' },
        { name: 'description', content: '일상을 기록하고, 나만의 테라리움을 꾸며보세요' },
      ],
      link: [
        { rel: 'icon', type: 'image/x-icon', href: '/favicon.ico' },
      ],
    },
  },

  runtimeConfig: {
    public: {
      apiBaseUrl: process.env.NUXT_PUBLIC_API_BASE_URL || 'http://localhost:8080/api/v1',
    },
  },

  pinia: {
    storesDirs: ['./app/stores'],
  },

  fonts: {
    families: [
      { name: 'Pretendard', provider: 'local' },
    ],
  },

  gtag: {
    id: process.env.NUXT_PUBLIC_GA_ID || '',
    enabled: process.env.NODE_ENV === 'production',
  },

  colorMode: {
    preference: 'light',
    fallback: 'light',
  },

  typescript: {
    strict: true,
  },

  // The generated openapi client ships as raw .ts and must be transpiled by Nuxt.
  build: {
    transpile: ['@terraworld-it/openapi-frontend'],
  },
})
