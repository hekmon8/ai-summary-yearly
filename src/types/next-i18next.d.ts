import 'react-i18next'
import { resources } from '../config/i18n'

declare module 'react-i18next' {
  interface CustomTypeOptions {
    defaultNS: 'common'
    resources: {
      common: typeof resources.en.common
    }
  }
} 