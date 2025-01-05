/** @type {import('next').NextConfig} */
const nextI18nConfig = require('./next-i18next.config')

const nextConfig = {
  reactStrictMode: true,
  i18n: nextI18nConfig.i18n,
  publicRuntimeConfig: {
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL,
    PUBLIC_URL: process.env.PUBLIC_URL,
  },
  experimental: {
    forceSwcTransforms: true,
  }
}

module.exports = nextConfig 