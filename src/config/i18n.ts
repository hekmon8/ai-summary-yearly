import type { Resource } from 'i18next'
import common_en from '../../public/locales/en/common.json'
import common_zh from '../../public/locales/zh/common.json'

export const resources: Resource = {
  en: {
    common: common_en,
  },
  zh: {
    common: common_zh,
  },
} as const 