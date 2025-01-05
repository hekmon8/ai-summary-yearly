import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import Head from 'next/head'
import Image from 'next/image'
import { useTranslation } from 'next-i18next'
import { serverSideTranslations } from 'next-i18next/serverSideTranslations'
import type { GetStaticProps } from 'next'
import FAQ from '@/components/FAQ'
import { useRouter } from 'next/router'
import { toast } from 'react-hot-toast'
import { Header } from '@/components/Header'
import { Footer } from '@/components/Footer'
import { STYLE_PRICES, StyleType } from '@/config/pricing'
import { useUser, useAuth } from '@clerk/nextjs'

interface TaskResult {
  id?: string
  imageUrl?: string
  shareUrl?: string
  error?: string
  status?: 'pending' | 'processing' | 'completed' | 'failed'
  message?: string
  estimatedTime?: number
  steps?: Array<{
    name: string
    status: 'pending' | 'processing' | 'completed'
    time: number
  }>
  progress?: number
  avatarUrl?: string
  avatarGenerating?: boolean
}

export default function Home() {
  const { t } = useTranslation('common')
  const router = useRouter()
  const { user } = useUser()
  const { getToken } = useAuth()
  const [platform, setPlatform] = useState<'github' | 'twitter' | 'jike'>('github')
  const [username, setUsername] = useState('')
  const [style, setStyle] = useState<'sarcasm' | 'best diss' | 'classical' | 'praise'>('sarcasm')
  const [result, setResult] = useState<TaskResult>({})
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [pollInterval, setPollInterval] = useState<NodeJS.Timeout>()
  const [progress, setProgress] = useState(0)
  const [generatingAvatar, setGeneratingAvatar] = useState(false)
  const [avatarTaskId, setAvatarTaskId] = useState<string>('')

  // 初始化 credits
  useEffect(() => {
    const initializeCredits = async () => {
      if (!user?.id) {
        return
      }

      // 避免重复初始化
      const initialized = sessionStorage.getItem(`credits_initialized_${user.id}`)
      if (initialized) {
        return
      }

      try {
        const token = await getToken()
        if (!token) {
          return
        }

        const response = await fetch('/api/credits', {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          }
        })
        const credits = await response.json()
        console.log('Credits initialized:', credits)
        
        // 标记已初始化
        sessionStorage.setItem(`credits_initialized_${user.id}`, 'true')
      } catch (error) {
        console.error('Failed to initialize credits:', error)
      }
    }

    initializeCredits()
  }, [user?.id, getToken]) // 只在 user.id 改变时触发

  // 清理轮询
  useEffect(() => {
    return () => {
      if (pollInterval) {
        clearInterval(pollInterval)
      }
    }
  }, [pollInterval])

  // 更新进度
  useEffect(() => {
    if (!result.status || result.status === 'failed') {
      setProgress(0)
      return
    }

    if (result.status === 'completed') {
      if (!result.avatarUrl) {
        setProgress(100) // 普通完成时到100%
      }
      return
    }

    // 使用服务器返回的进度
    if (typeof result.progress === 'number') {
      setProgress(result.progress)
    }
  }, [result.status, result.progress, result.avatarUrl])

  // 处理优惠码
  useEffect(() => {
    const handleCoupon = async () => {
      const { code } = router.query
      
      // 如果没有优惠码或者用户未登录，直接返回
      if (!code || !user?.id) {
        return
      }

      // 避免重复处理同一个优惠码
      const processedCode = sessionStorage.getItem(`coupon_processed_${code}`)
      if (processedCode) {
        return
      }

      try {
        const token = await getToken()
        if (!token) {
          return
        }

        const response = await fetch('/api/redeem-coupon', {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({ 
            code: String(code),
            userId: user.id 
          })
        })

        const data = await response.json()
        
        if (response.ok) {
          toast.success(t('coupon.success', { credits: data.credits }))
          // 移除 URL 中的优惠码参数
          router.replace('/', undefined, { shallow: true })
        } else if (data.message === 'coupon_already_used') {
          toast.error(t('coupon.already_used'))
          router.replace('/', undefined, { shallow: true })
        } else {
          toast.error(t('coupon.invalid'))
        }

        // 标记优惠码已处理
        sessionStorage.setItem(`coupon_processed_${code}`, 'true')
      } catch (error) {
        console.error('Failed to redeem coupon:', error)
        toast.error(t('coupon.error'))
      }
    }

    handleCoupon()
  }, [router.query.code, user?.id]) // 只在优惠码和用户 ID 变化时触发

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    console.log('Form submitted')
    setIsLoading(true)
    setResult({})
    setProgress(0)

    try {
      if (!user) {
        console.log('No session found')
        setResult({ 
          status: 'failed',
          error: t('error.login_required') as string
        })
        setIsLoading(false)
        return
      }

      console.log('Creating task with user:', user.id)
      try {
        const token = await getToken()
        const createRes = await fetch('/api/tasks', {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({ username, style, platform }),
          credentials: 'include'
        })
        console.log('Create task response:', { status: createRes.status, ok: createRes.ok })

        if (!createRes.ok) {
          const error = await createRes.json()
          console.error('Task creation failed:', error)
          throw new Error(error.error || 'Failed to create task')
        }

        const task = await createRes.json()
        console.log('[index]Task created successfully:', task)

        setResult({ 
          status: task.status, 
          message: task.message,
          steps: task.steps,
          progress: 0
        })

        const interval = setInterval(async () => {
          const token = await getToken()
          if (!token) {
            throw new Error('No valid session')
          }

          const statusRes = await fetch(`/api/tasks/${task.id}`, {
            headers: {
              'Authorization': `Bearer ${token}`
            },
            credentials: 'include'
          })
          if (!statusRes.ok) {
            throw new Error('Failed to fetch task status')
          }
          const updatedTask = await statusRes.json()
          console.log("[index]Task status updated:", updatedTask);
          setResult(prev => ({
            ...updatedTask,
            steps: updatedTask.steps,
            progress: updatedTask.progress
          }))

          if (updatedTask.status === 'completed' || updatedTask.status === 'failed') {
            clearInterval(interval)
            setIsLoading(false)
          }
        }, 5000)

        setPollInterval(interval)
      } catch (error) {
        console.error('Task creation error:', error)
        setResult({ 
          status: 'failed',
          error: error instanceof Error ? error.message : 'Unknown error'
        })
        setIsLoading(false)
      }
    } catch (error) {
      console.error('Task creation error:', error)
      setResult({ 
        status: 'failed',
        error: error instanceof Error ? error.message : 'Unknown error'
      })
      setIsLoading(false)
    }
  }

  const handleGenerateAvatar = async () => {
    if (!result.id || result.avatarGenerating) return

    try {
      if (!user) {
        toast.error(t('error.login_required') as string)
        return
      }

      setGeneratingAvatar(true)
      setResult(prev => ({ ...prev, avatarGenerating: true }))

      const token = await getToken()
      const response = await fetch(`/api/avatar/create-task`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          summaryId: result.id,
          credits: 20
        })
      })

      if (!response.ok) {
        throw new Error('Failed to generate avatar')
      }

      const data = await response.json()
      setAvatarTaskId(data.taskId)

      // 开始轮询头像生成状态
      const interval = setInterval(async () => {
        const token = await getToken()
        const statusRes = await fetch(`/api/avatar/status/${data.taskId}`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        })
        
        if (!statusRes.ok) {
          throw new Error('Failed to fetch avatar status')
        }

        const status = await statusRes.json()
        console.log("[index]Avatar status updated:", status);

        if (status.status === 'completed' && status.imageUrl) {
          setResult(prev => ({ 
            ...prev, 
            avatarUrl: status.imageUrl,
            avatarGenerating: false,
            status: 'completed'  // 确保主任务状态也更新
          }))
          setGeneratingAvatar(false)
          clearInterval(interval)
          toast.success(t('result.avatar.success'))  // 显示成功提示
        } else if (status.status === 'failed') {
          setResult(prev => ({ 
            ...prev, 
            avatarGenerating: false,
            error: status.error || 'Avatar generation failed'
          }))
          setGeneratingAvatar(false)
          clearInterval(interval)
          throw new Error(status.error || 'Avatar generation failed')
        } else if (status.message) {
          // 更新生成进度消息
          setResult(prev => ({ 
            ...prev,
            message: status.message
          }))
        }
      }, 5000)

      setPollInterval(interval)
    } catch (error) {
      console.error('Avatar generation error:', error)
      toast.error(t('error.avatar_generation_failed'))
      setGeneratingAvatar(false)
      setResult(prev => ({ ...prev, avatarGenerating: false }))
    }
  }

  const renderProgress = () => {
    if (!result.status || result.status === 'failed') return null

    const maxProgress = result.avatarGenerating ? 200 : (result.avatarUrl ? 200 : 100)
    const currentProgress = Math.min(progress, maxProgress)

    // 获取当前阶段的状态文本
    const getPhaseText = () => {
      if (result.avatarUrl) return t('result.progress.phase3')
      if (result.avatarGenerating) return t('result.progress.phase2')
      if (progress >= 100) return t('result.progress.phase1')
      return result.message || String(t(`result.status.${result.status}.${platform}`))
    }

    return (
      <div className="mt-8">
        <div className="flex justify-between text-sm text-gray-400 mb-2">
          <span>{getPhaseText()}</span>
          <span>{Math.round(currentProgress)}%</span>
        </div>
        <div className="w-full h-2 bg-gray-700 rounded-full overflow-hidden">
          <div 
            className="h-full bg-gradient-to-r from-purple-500 to-pink-500 transition-all duration-1000"
            style={{ width: `${currentProgress}%` }}
          />
        </div>
        {result.steps && (
          <div className="mt-4 space-y-2">
            {result.steps.map((step: { name: string, status: 'pending' | 'processing' | 'completed', time: number }) => (
              <div key={step.name} className="flex items-center text-sm">
                <div className={`w-2 h-2 rounded-full mr-2 ${
                  step.status === 'completed' ? 'bg-green-500' :
                  step.status === 'processing' ? 'bg-yellow-500' :
                  'bg-gray-500'
                }`} />
                <span className={`text-gray-400 ${
                  step.status === 'processing' ? 'text-yellow-400' :
                  step.status === 'completed' ? 'text-green-400' : ''
                }`}>
                  {String(t(`result.steps.${step.name}.${platform}`))}
                </span>
                {step.status === 'processing' && (
                  <span className="ml-2 text-yellow-400">
                    <span className="inline-block animate-pulse">...</span>
                  </span>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Avatar Generation Button */}
        {result.status === 'completed' && !result.avatarUrl && !result.avatarGenerating && progress >= 100 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="mt-6"
          >
            <button
              onClick={handleGenerateAvatar}
              className="w-full py-3 px-4 bg-gradient-to-r from-purple-500 to-pink-600 hover:from-purple-600 hover:to-pink-700 
                       rounded-lg transition-all duration-300 flex items-center justify-center space-x-3 group"
            >
              <span className="text-lg">✨ {String(t('result.avatar.generate'))}</span>
              <span className="bg-white/20 px-3 py-1 rounded-full text-sm flex items-center space-x-1">
                <span>20</span>
                <span>{String(t('credits.balance'))}</span>
              </span>
              <motion.span
                className="inline-block"
                animate={{ rotate: [0, 360] }}
                transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
              >
                ✨
              </motion.span>
            </button>
          </motion.div>
        )}

        {/* Avatar Generation Status */}
        {result.avatarGenerating && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="mt-6 text-center"
          >
            <div className="inline-flex items-center space-x-2 text-purple-400">
              <motion.span
                animate={{ rotate: [0, 360] }}
                transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
              >
                ✨
              </motion.span>
              <span>{String(t('result.avatar.generating'))}</span>
            </div>
          </motion.div>
        )}
      </div>
    )
  }

  const renderStatus = () => {
    if (!result.status) return null

    switch (result.status) {
      case 'failed':
        return (
          <div className="mt-8 p-4 bg-red-500/20 border border-red-500 rounded-lg">
            <p className="text-red-300">
              {result.error || String(t(`result.error.failed.${platform}`))}
            </p>
          </div>
        )
      default:
        return renderProgress()
    }
  }

  const title = String(t('title')).split('|')
  const mainTitle = title[0] || 'AI Diss Annual Summary'
  const subTitle = title[1] || 'Your 2024 Digital Memoir'

  const sarcasmLabel = String(t('form.style.sarcasm')).split('(')[0]
  const praiseLabel = String(t('form.style.praise')).split('(')[0]
  const creditsLabel = String(t('credits.balance'))

  const placeholderText = String(t('form.username.placeholder'))

  return (
    <>
      <Head>
        <title>{String(t('title'))}</title>
        <meta 
          name="description" 
          content={String(t('description')).replace(
            'GitHub',
            String(t(`form.platform.${platform}`))
          )}
        />
      </Head>

      <div className="min-h-screen bg-gray-900 text-white relative overflow-hidden">
        {/* Background gradient effect */}
        <div className="absolute inset-0 bg-gradient-to-b from-purple-900/20 via-transparent to-transparent" />
        <div className="absolute inset-0 bg-[url('/grid.svg')] bg-center [mask-image:linear-gradient(180deg,white,rgba(255,255,255,0))]" />

        <div className="container mx-auto px-4 sm:px-6 md:px-8 pt-16 sm:pt-20 md:pt-32 pb-16 relative">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="text-center max-w-4xl mx-auto"
          >
            <motion.div 
              className="text-4xl sm:text-5xl md:text-7xl font-bold mb-6 sm:mb-8 leading-tight"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.2 }}
            >
              <h1>
                <span className="inline-block bg-gradient-to-r from-purple-500 via-pink-500 to-red-500 text-transparent bg-clip-text pb-2">
                  {mainTitle}
                </span>
                <br />
                <span className="inline-block bg-gradient-to-r from-red-500 via-pink-500 to-purple-500 text-transparent bg-clip-text">
                  {subTitle}
                </span>
              </h1>
            </motion.div>
            
            <motion.p 
              className="text-xl sm:text-2xl md:text-3xl text-gray-300 mb-6 sm:mb-8 font-medium"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.4 }}
            >
              {String(t('subtitle')).replace('GitHub', String(t(`form.platform.${platform}`)))}
            </motion.p>
            
            <motion.p 
              className="text-base sm:text-lg md:text-xl text-gray-400 max-w-3xl mx-auto leading-relaxed"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.6 }}
            >
              {String(t('description')).replace('GitHub', String(t(`form.platform.${platform}`)))}
            </motion.p>

            <motion.div
              className="mt-8 sm:mt-12"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.8 }}
            >
              <div className="inline-flex items-center space-x-2 text-xs sm:text-sm text-gray-400 bg-gray-800/50 px-3 sm:px-4 py-2 rounded-full backdrop-blur-sm">
                <span className="flex h-2 w-2 relative">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-purple-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-purple-500"></span>
                </span>
                <span>AI Powered · Real-time Analysis · Multiple Platforms</span>
              </div>
            </motion.div>
          </motion.div>

          <div className="max-w-4xl mx-auto mt-12 sm:mt-16">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.2 }}
              className="bg-gray-800/50 backdrop-blur-sm rounded-2xl sm:rounded-3xl p-4 sm:p-8 md:p-10 shadow-xl border border-gray-700/50"
            >
              <form onSubmit={handleSubmit} className="space-y-6 sm:space-y-8">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-4">
                    {t('form.platform.label')}
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
                    {['github', 'twitter', 'jike'].map((p) => (
                      <button
                        key={p}
                        type="button"
                        onClick={() => p === 'github' && setPlatform(p as typeof platform)}
                        className={`px-3 sm:px-4 py-4 sm:py-5 rounded-xl border ${
                          platform === p
                            ? 'bg-purple-500/10 border-purple-500'
                            : p === 'github'
                              ? 'border-gray-700 hover:border-purple-500'
                              : 'border-gray-700 opacity-50 cursor-not-allowed'
                        } transition relative min-h-[60px] sm:min-h-[70px] flex flex-col items-center justify-center`}
                        disabled={p !== 'github'}
                      >
                        <span className="text-center text-base sm:text-lg font-medium">
                          {String(t(`form.platform.${p}`))}
                        </span>
                        {p !== 'github' && (
                          <span className="absolute -top-2 -right-2 bg-yellow-500 text-black text-xs px-2 py-0.5 rounded-full">
                            {String(t('form.platform.coming_soon'))}
                          </span>
                        )}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <div className="space-y-4">
                    <label className="block text-lg font-medium text-gray-300">
                      {t(`form.username.label.${platform}`)}
                    </label>
                    <div className="relative">
                      <input
                        type="text"
                        className="w-full px-4 py-2 bg-gray-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-lg"
                        placeholder={t(`form.username.placeholder.${platform}`) || ''}
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        required
                      />
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-lg font-medium text-gray-300 mb-4">
                    {t(`form.style.label.${platform}`)}
                  </label>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
                    {/* Diss Style */}
                    <button
                      type="button"
                      onClick={() => setStyle('sarcasm')}
                      className={`group relative p-3 sm:p-4 rounded-xl border transition-all duration-300 ${
                        style === 'sarcasm'
                          ? 'border-red-500 bg-gradient-to-b from-red-500/20 to-red-500/5'
                          : 'border-gray-600 hover:border-red-500/50 hover:bg-red-500/5'
                      }`}
                    >
                      <div className="absolute -top-3 right-2 bg-gradient-to-r from-red-500 to-orange-500 text-xs font-medium px-2 sm:px-3 py-1 rounded-full shadow-lg">
                        5 {t('credits.balance')}
                      </div>
                      <div className="flex flex-col items-center">
                        <span className="font-medium text-center text-sm sm:text-base">
                        🔥{String(t(`form.style.sarcasm.${platform}`)).replace('\n', ' ')}
                        </span>
                      </div>
                    </button>

                    {/* Best Diss Style */}
                    <button
                      type="button"
                      onClick={() => setStyle('best diss')}
                      className={`group relative p-3 sm:p-4 rounded-xl border transition-all duration-300 ${
                        style === 'best diss'
                          ? 'border-purple-500 bg-gradient-to-b from-purple-500/20 to-purple-500/5'
                          : 'border-gray-600 hover:border-purple-500/50 hover:bg-purple-500/5'
                      }`}
                    >
                      <div className="absolute -top-3 right-2 bg-gradient-to-r from-purple-500 to-pink-500 text-xs font-medium px-2 sm:px-3 py-1 rounded-full shadow-lg">
                        8 {t('credits.balance')}
                      </div>
                      <div className="flex flex-col items-center">
                        <span className="font-medium text-center text-sm sm:text-base">
                        💥{String(t(`form.style.best_diss.${platform}`)).replace('\n', ' ')}
                        </span>
                      </div>
                    </button>

                    {/* Classical Style */}
                    <button
                      type="button"
                      onClick={() => setStyle('classical')}
                      className={`group relative p-3 sm:p-4 rounded-xl border transition-all duration-300 ${
                        style === 'classical'
                          ? 'border-gray-400 bg-gradient-to-b from-gray-500/20 to-gray-500/5'
                          : 'border-gray-600 hover:border-gray-400/50 hover:bg-gray-500/5'
                      }`}
                    >
                      <div className="absolute -top-3 right-2 bg-gradient-to-r from-gray-400 to-gray-500 text-xs font-medium px-2 sm:px-3 py-1 rounded-full shadow-lg">
                        8 {t('credits.balance')}
                      </div>
                      <div className="flex flex-col items-center">
                        <span className="font-medium text-center text-sm sm:text-base">
                        📜{String(t(`form.style.classical.${platform}`)).replace('\n', ' ')}
                        </span>
                      </div>
                    </button>

                    {/* Praise Style */}
                    <button
                      type="button"
                      onClick={() => setStyle('praise')}
                      className={`group relative p-3 sm:p-4 rounded-xl border transition-all duration-300 ${
                        style === 'praise'
                          ? 'border-green-500 bg-gradient-to-b from-green-500/20 to-green-500/5'
                          : 'border-gray-600 hover:border-green-500/50 hover:bg-green-500/5'
                      }`}
                    >
                      <div className="absolute -top-3 right-2 bg-gradient-to-r from-green-500 to-emerald-500 text-xs font-medium px-2 sm:px-3 py-1 rounded-full shadow-lg">
                        8 {t('credits.balance')}
                      </div>
                      <div className="flex flex-col items-center">
                        <span className="font-medium text-center text-sm sm:text-base">
                        💝{String(t(`form.style.praise.${platform}`)).replace('\n', ' ')}
                        </span>
                      </div>
                    </button>
                  </div>
                </div>

                <div className="max-w-xl mx-auto">
                  <button
                    type="submit"
                    disabled={isLoading}
                    className={`w-full py-5 px-8 rounded-xl text-xl font-medium transition-all duration-300 ${
                      isLoading
                        ? 'bg-gray-600 cursor-not-allowed'
                        : style === 'sarcasm'
                          ? 'bg-gradient-to-r from-red-600 to-orange-600 hover:from-red-700 hover:to-orange-700 shadow-lg hover:shadow-red-500/25'
                          : 'bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 shadow-lg hover:shadow-green-500/25'
                    }`}
                  >
                    {isLoading ? (
                      <div className="flex items-center justify-center space-x-2">
                        <div className="w-6 h-6 border-t-2 border-b-2 border-white rounded-full animate-spin"></div>
                        <span>{t(`form.generating.${platform}`)}</span>
                      </div>
                    ) : (
                      <div className="flex items-center justify-center space-x-2">
                        {style === 'sarcasm' ? '🔥' : '💝'} {t(`form.submit.${platform}`)}
                      </div>
                    )}
                  </button>
                </div>
              </form>

              {renderStatus()}

              {/* Result Display Section */}
              {result.imageUrl && (
                <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 gap-6 sm:gap-8">
                  {/* Left Column - Generated Image */}
                  <div className="flex flex-col items-center">
                    <img
                      src={result.imageUrl}
                      alt="Generated Summary"
                      className="w-full rounded-lg shadow-2xl"
                    />
                    <div className="mt-4 flex flex-wrap justify-center gap-3">
                      {result.shareUrl && (
                        <>
                          <button
                            onClick={() => window.open(result.shareUrl, '_blank')}
                            className="px-4 py-2 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 rounded-lg transition text-sm w-full sm:w-auto"
                          >
                            {t(`result.share.${platform}`)}
                          </button>
                          <button
                            onClick={() => {
                              const link = document.createElement('a')
                              link.href = result.imageUrl!
                              link.download = 'annual-summary.png'
                              link.click()
                            }}
                            className="px-4 py-2 bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 rounded-lg transition text-sm w-full sm:w-auto"
                          >
                            {t(`result.download.${platform}`)}
                          </button>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Right Column - Avatar */}
                  <div className="flex flex-col items-center justify-center">
                    {result.avatarUrl ? (
                      <div className="w-full">
                        <h3 className="text-xl font-medium text-center mb-4">
                          {String(t('result.avatar.title'))}
                        </h3>
                        <img
                          src={result.avatarUrl}
                          alt={String(t('result.avatar.alt'))}
                          className="w-full aspect-square object-cover rounded-lg shadow-2xl"
                        />
                      </div>
                    ) : (
                      <div className="w-full aspect-square bg-gray-800/50 rounded-lg flex flex-col items-center justify-center border-2 border-dashed border-gray-700">
                        <div className="text-gray-400 text-center p-8">
                          <div className="text-6xl mb-4">✨</div>
                          <p className="text-lg">{String(t('result.avatar.title'))}</p>
                          <p className="text-sm text-gray-500 mt-2">{String(t('result.avatar.alt'))}</p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </motion.div>
          </div>
        </div>

        <FAQ />
      </div>
    </>
  )
}

export const getStaticProps: GetStaticProps = async ({ locale }) => {
  return {
    props: {
      ...(await serverSideTranslations(locale ?? 'en', ['common']))
    }
  }
} 