/** @jsxImportSource react */
import { useTranslation } from 'next-i18next'
import { motion } from 'framer-motion'

const FAQ = () => {
  const { t } = useTranslation('common')

  const questions = [
    'what',
    'how',
    'privacy',
    'credits'
  ]

  return (
    <section className="py-24 bg-gray-900/50">
      <div className="container mx-auto px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="max-w-3xl mx-auto"
        >
          <h2 className="text-4xl font-bold text-center mb-16 bg-gradient-to-r from-purple-500 via-pink-500 to-red-500 text-transparent bg-clip-text">
            {t('faq.title')}
          </h2>

          <div className="space-y-6">
            {questions.map((q, index) => {
              const question = t(`faq.items.${q}.q`)
              const answer = t(`faq.items.${q}.a`)
              
              return (
                <motion.div
                  key={q}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: index * 0.1 }}
                  className="bg-gray-800/30 backdrop-blur-sm rounded-2xl p-8 border border-gray-800/50 hover:border-gray-700/50 transition-colors"
                >
                  <h3 className="text-xl font-semibold mb-4 bg-gradient-to-r from-purple-400 to-pink-400 text-transparent bg-clip-text">
                    {question}
                  </h3>
                  <p className="text-gray-400 leading-relaxed">
                    {answer}
                  </p>
                </motion.div>
              )
            })}
          </div>
        </motion.div>
      </div>
    </section>
  )
}

export default FAQ 