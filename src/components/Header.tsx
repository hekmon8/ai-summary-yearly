import { useTranslation, TFunction } from 'next-i18next'
import Link from 'next/link'
import { useRouter } from 'next/router'
import { useState, useEffect } from 'react'
import { useUser, useAuth, useClerk } from '@clerk/nextjs'

export const Header = () => {
  const { t } = useTranslation('common') as { t: TFunction }
  const { user } = useUser()
  const { getToken } = useAuth()
  const { signOut } = useClerk()
  const router = useRouter()
  const [credits, setCredits] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  const toggleLocale = () => {
    const newLocale = router.locale === 'zh' ? 'en' : 'zh'
    router.push(router.pathname, router.asPath, { locale: newLocale })
  }

  useEffect(() => {
    const fetchCredits = async () => {
      if (!user) {
        setCredits(null)
        setLoading(false)
        return
      }

      // 检查是否需要刷新
      const lastFetch = sessionStorage.getItem('last_credits_fetch')
      const now = Date.now()
      if (lastFetch && now - parseInt(lastFetch) < 60000) {
        setLoading(false)
        return
      }

      try {
        setLoading(true)
        const token = await getToken()
        if (!token) {
          setCredits(null)
          setLoading(false)
          return
        }

        const response = await fetch('/api/credits', {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        })
        
        if (!response.ok) {
          console.error('Failed to fetch credits:', response.statusText)
          setCredits(null)
          setLoading(false)
          return
        }
        
        const data = await response.json()
        setCredits(data)
        // 记录最后一次获取时间
        sessionStorage.setItem('last_credits_fetch', now.toString())
      } catch (error) {
        console.error('Failed to fetch credits:', error)
        setCredits(null)
      } finally {
        setLoading(false)
      }
    }

    fetchCredits()

    // 每60秒刷新一次余额，但只在用户登录时启动定时器
    let interval: NodeJS.Timeout | null = null
    if (user) {
      interval = setInterval(fetchCredits, 60000)
    }

    return () => {
      if (interval) {
        clearInterval(interval)
      }
    }
  }, [user?.id, getToken]) // 只在用户 ID 变化时重新设置

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-[#0f1117]/95 backdrop-blur-lg border-b border-gray-800/50">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          <Link href="/" className="text-xl font-bold text-white">
            {t('title')}
          </Link>

          <nav className="flex items-center gap-4">
            <Link href="/pricing" className="text-gray-400 hover:text-white transition" title={t('nav.pricing') || 'Pricing'}>
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M20.59 13.41L13.42 20.58C13.2343 20.766 13.0137 20.9135 12.7709 21.0141C12.5281 21.1148 12.2678 21.1666 12.005 21.1666C11.7422 21.1666 11.4819 21.1148 11.2391 21.0141C10.9963 20.9135 10.7757 20.766 10.59 20.58L2 12V2H12L20.59 10.59C20.9625 10.9647 21.1716 11.4716 21.1716 12C21.1716 12.5284 20.9625 13.0353 20.59 13.41Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M7 7H7.01" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </Link>
            {user ? (
              <div className="flex items-center gap-4">
                <Link href="/history" className="text-gray-400 hover:text-white transition" title={t('nav.history') || 'History'}>
                  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M12 8V12L15 15" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    <path d="M3.05493 11.0549C2.67439 12.2409 2.67439 13.5091 3.05493 14.6951C3.43547 15.8811 4.17822 16.9357 5.1967 17.7235C6.21517 18.5114 7.46402 18.9947 8.77736 19.1161C10.0907 19.2374 11.4121 18.991 12.5796 18.4059C13.7471 17.8209 14.7112 16.9227 15.3567 15.8119C16.0022 14.7011 16.3033 13.4297 16.2244 12.1539C16.1456 10.8781 15.69 9.65149 14.9109 8.62767C14.1318 7.60386 13.0647 6.82978 11.8449 6.39806" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </Link>
                <div className="flex items-center gap-1 px-3 py-1 bg-gray-800/50 rounded-lg" title={t('credits.balance') || 'Credit Balance'}>
                  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M12 2L2 7L12 12L22 7L12 2Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2"/>
                  </svg>
                  <span className="text-sm font-medium text-[#ffddb0] min-w-[1.5rem] text-center">
                    {loading ? (
                      <span className="inline-block w-3 h-3 border-2 border-[#ffddb0] border-t-transparent rounded-full animate-spin" />
                    ) : credits === null ? (
                      <span className="text-red-400">!</span>
                    ) : (
                      credits.credits
                    )}
                  </span>
                </div>
                {credits?.isAdmin && (
                  <span className="text-sm px-2 py-1 bg-red-500/10 rounded text-red-400">
                    管理员
                  </span>
                )}
                <span className="text-gray-400 truncate max-w-[160px]" title={user.emailAddresses[0]?.emailAddress}>
                  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M20 21V19C20 17.9391 19.5786 16.9217 18.8284 16.1716C18.0783 15.4214 17.0609 15 16 15H8C6.93913 15 5.92172 15.4214 5.17157 16.1716C4.42143 16.9217 4 17.9391 4 19V21" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    <path d="M12 11C14.2091 11 16 9.20914 16 7C16 4.79086 14.2091 3 12 3C9.79086 3 8 4.79086 8 7C8 9.20914 9.79086 11 12 11Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </span>
                <button
                  onClick={() => signOut()}
                  className="text-gray-400 hover:text-white transition"
                  title={t('nav.logout') || 'Logout'}
                >
                  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M9 21H5C4.46957 21 3.96086 20.7893 3.58579 20.4142C3.21071 20.0391 3 19.5304 3 19V5C3 4.46957 3.21071 3.96086 3.58579 3.58579C3.96086 3.21071 4.46957 3 5 3H9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    <path d="M16 17L21 12L16 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    <path d="M21 12H9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </button>
              </div>
            ) : (
              <Link
                href="/sign-in"
                className="bg-[#ffddb0] text-black p-2 rounded-lg hover:bg-[#ffd093] transition"
                title={t('nav.login') || 'Login'}
              >
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M15 3H19C19.5304 3 20.0391 3.21071 20.4142 3.58579C20.7893 3.96086 21 4.46957 21 5V19C21 19.5304 20.7893 20.0391 20.4142 20.4142C20.0391 20.7893 19.5304 21 19 21H15" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M10 17L15 12L10 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M15 12H3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </Link>
            )}
            <button
              onClick={toggleLocale}
              className="text-gray-400 hover:text-white transition"
              title={router.locale === 'zh' ? 'Switch to English' : '切换到中文'}
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M12 22C17.5228 22 22 17.5228 22 12C22 6.47715 17.5228 2 12 2C6.47715 2 2 6.47715 2 12C2 17.5228 6.47715 22 12 22Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M2 12H22" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M12 2C14.5013 4.73835 15.9228 8.29203 16 12C15.9228 15.708 14.5013 19.2616 12 22C9.49872 19.2616 8.07725 15.708 8 12C8.07725 8.29203 9.49872 4.73835 12 2Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </button>
          </nav>
        </div>
      </div>
    </header>
  )
} 