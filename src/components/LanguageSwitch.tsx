import React from 'react'
import { useRouter } from 'next/router'
import { useTranslation } from 'next-i18next'

export const LanguageSwitch: React.FC = () => {
  const router = useRouter()
  const { i18n } = useTranslation()

  const toggleLanguage = () => {
    const newLocale = router.locale === 'en' ? 'zh' : 'en'
    router.push(router.pathname, router.asPath, { locale: newLocale })
  }

  return (
    <button
      onClick={toggleLanguage}
      className="text-gray-300 hover:text-white transition"
    >
      {router.locale === 'en' ? '中文' : 'EN'}
    </button>
  )
} 