import { useTranslation } from 'next-i18next'
import { serverSideTranslations } from 'next-i18next/serverSideTranslations'
import { useAuth } from '@/contexts/AuthContext'
import { getStripeJs } from '@/lib/stripe'
import Link from 'next/link'
import { useRouter } from 'next/router'
import { IoArrowBack } from 'react-icons/io5'
import { PRICING_TIERS } from '@/config/pricing'
import { motion } from 'framer-motion'

export default function PricingPage() {
  const { t } = useTranslation('common')
  const { user } = useAuth()
  const router = useRouter()

  const handlePurchase = async (packageId: string) => {
    if (!user) {
      // 提示登录
      return
    }

    try {
      // 处理付费套餐
      const response = await fetch('/api/create-checkout-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ packageId, userId: user.id }),
      })

      const { sessionId } = await response.json()
      const stripe = await getStripeJs()
      await stripe?.redirectToCheckout({ sessionId })
    } catch (error) {
      console.error('Purchase error:', error)
    }
  }

  return (
    <div className="min-h-screen bg-[#18191B] text-white">
      <div className="container mx-auto px-4 py-24 relative">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="text-center mb-16"
        >
          <h1 className="text-5xl md:text-6xl font-bold mb-6">
            {t('pricing.title')}
          </h1>
        </motion.div>

        <div className="grid md:grid-cols-3 gap-6 max-w-6xl mx-auto">
          {PRICING_TIERS.map((tier, index) => (
            <motion.div
              key={tier.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
              className={`relative bg-[#1E1F21] rounded-2xl p-8`}
            >
              {tier.isPopular && (
                <span className="absolute -top-3 right-4 bg-pink-500 text-white text-xs font-medium px-2.5 py-1 rounded-full">
                  Popular
                </span>
              )}

              <div className="mb-8">
                <h3 className={`text-xl font-semibold mb-2 ${
                  tier.id === 'free' ? 'text-white' :
                  tier.id === 'basic' ? 'text-blue-400' :
                  'text-green-400'
                }`}>
                  {tier.id === 'free' ? t('pricing.free') : tier.id}
                </h3>
                <div className="flex items-baseline gap-1">
                  <span className="text-4xl font-bold">
                    {tier.price === 0 ? t('pricing.free') : `$${(tier.price / 100).toFixed(2)}`}
                  </span>
                </div>
                <div className="space-y-1 mt-4">
                  <p className="text-gray-400">
                    {t('pricing.credits', { count: tier.credits })}
                  </p>
                  <p className="text-gray-400">
                    {t('pricing.generations', { count: tier.summariesCount })}
                  </p>
                </div>
              </div>

              <div className="space-y-4 mb-8">
                <div className="flex items-center gap-2 text-gray-300">
                  <svg className={`w-5 h-5 ${
                    tier.id === 'free' ? 'text-gray-400' :
                    tier.id === 'basic' ? 'text-blue-400' :
                    'text-green-400'
                  }`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  {t('pricing.credits', { count: tier.credits })} {t('credits.balance')}
                </div>
                <div className="flex items-center gap-2 text-gray-300">
                  <svg className={`w-5 h-5 ${
                    tier.id === 'free' ? 'text-gray-400' :
                    tier.id === 'basic' ? 'text-blue-400' :
                    'text-green-400'
                  }`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  {t('pricing.generations', { count: tier.summariesCount })}
                </div>
                <div className="flex items-center gap-2 text-gray-300">
                  <svg className={`w-5 h-5 ${
                    tier.id === 'free' ? 'text-gray-400' :
                    tier.id === 'basic' ? 'text-blue-400' :
                    'text-green-400'
                  }`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  {tier.id === 'free' ? 'Limited AI styles' : 'All AI styles'}
                </div>
              </div>

              {tier.id === 'free' ? (
                <Link 
                  href="/"
                  className="block w-full py-3 px-4 rounded-lg font-medium bg-gray-700 text-center text-gray-300 hover:bg-gray-600 transition-all duration-200"
                >
                  {t('pricing.try')}
                </Link>
              ) : (
                <button
                  disabled
                  className="w-full py-3 px-4 rounded-lg font-medium bg-gray-700/50 text-gray-400 cursor-not-allowed"
                >
                  {t('pricing.coming_soon')}
                </button>
              )}
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  )
}

export async function getStaticProps({ locale }: { locale: string }) {
  return {
    props: {
      ...(await serverSideTranslations(locale, ['common'])),
    },
  }
} 