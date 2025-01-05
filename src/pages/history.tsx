import { useEffect, useState } from 'react'
import { useTranslation } from 'next-i18next'
import { serverSideTranslations } from 'next-i18next/serverSideTranslations'
import { useRouter } from 'next/router'
import Layout from '@/components/Layout'
import type { GetStaticProps } from 'next'
import { useUser, useAuth } from '@clerk/nextjs'

interface HistoryItem {
  id: string
  created_at: string
  platform: string
  username: string
  style: string
  status: string
  message?: string
  error?: string
  content?: string
  imageUrl?: string
  data?: any
  creditHistory?: {
    amount: number
    type: string
    description: string
  }
  user?: {
    id: string
    email: string
    credits: {
      amount: number
      isAdmin: boolean
    }
  }
  summaryId?: string
  avatarTasks?: HistoryItem[]
}

export default function History() {
  const { t } = useTranslation('common')
  const router = useRouter()
  const [history, setHistory] = useState<HistoryItem[]>([])
  const [loading, setLoading] = useState(true)
  const [isAdmin, setIsAdmin] = useState(false)
  const { user } = useUser()
  const { getToken } = useAuth()

  useEffect(() => {
    const fetchHistory = async () => {
      try {
        if (!user) {
          router.push('/')
          return
        }

        const token = await getToken()
        const response = await fetch('/api/tasks', {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        })
        if (response.ok) {
          const data = await response.json()
          
          const organizedData = data.reduce((acc: HistoryItem[], item: HistoryItem) => {
            if (item.summaryId) {
              const summaryTask = acc.find(t => t.id === item.summaryId)
              if (summaryTask) {
                if (!summaryTask.avatarTasks) {
                  summaryTask.avatarTasks = []
                }
                summaryTask.avatarTasks.push(item)
              }
              return acc
            } else {
              acc.push({
                ...item,
                avatarTasks: []
              })
              return acc
            }
          }, [])

          setHistory(organizedData)
          if (data.length > 0 && data[0].user) {
            setIsAdmin(true)
          }
        }
      } catch (error) {
        console.error('Failed to fetch history:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchHistory()
  }, [router, user, getToken])

  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString)
      if (isNaN(date.getTime())) {
        return '无效日期'
      }
      return date.toLocaleString(router.locale === 'zh' ? 'zh-CN' : 'en-US', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false
      })
    } catch (error) {
      return '无效日期'
    }
  }

  const getStatusDisplay = (status: string) => {
    switch (status) {
      case 'completed':
        return '已完成'
      case 'failed':
        return '失败'
      case 'pending':
        return '等待中'
      case 'processing':
        return '处理中'
      case 'avatar_pending':
        return '等待生成头像'
      case 'avatar_processing':
        return '生成头像中'
      default:
        return status
    }
  }

  const getStatusStyle = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-500/20 text-green-400'
      case 'failed':
        return 'bg-red-500/20 text-red-400'
      case 'pending':
      case 'avatar_pending':
        return 'bg-yellow-500/20 text-yellow-400'
      case 'processing':
      case 'avatar_processing':
        return 'bg-blue-500/20 text-blue-400'
      default:
        return 'bg-gray-500/20 text-gray-400'
    }
  }

  const renderTaskCard = (item: HistoryItem) => (
    <div
      key={item.id}
      className="bg-gray-800/50 rounded-lg p-6 backdrop-blur-lg border border-gray-700"
    >
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <span className="text-gray-400">{item.platform || 'github'}:</span>
          <span className="font-medium">{item.username}</span>
          {item.creditHistory && (
            <span className="text-sm px-2 py-1 bg-[#ffddb0]/10 rounded text-[#ffddb0]">
              {item.creditHistory.amount} {t('credits.balance')}
            </span>
          )}
          {isAdmin && item.user && (
            <div className="flex items-center gap-2 ml-4">
              <span className="text-sm text-gray-400">用户:</span>
              <span className="text-sm text-blue-400">{item.user.email}</span>
              <span className="text-sm px-2 py-1 bg-purple-500/10 rounded text-purple-400">
                积分: {item.user.credits.amount}
              </span>
              {item.user.credits.isAdmin && (
                <span className="text-sm px-2 py-1 bg-red-500/10 rounded text-red-400">
                  管理员
                </span>
              )}
            </div>
          )}
        </div>
        <span className="text-sm text-gray-400">
          {formatDate(item.created_at)}
        </span>
      </div>

      <div className="flex items-center gap-4 mb-4">
        <span className="px-3 py-1 bg-gray-700/50 rounded text-sm">
          {item.style}
        </span>
        <span className={`px-3 py-1 rounded text-sm ${getStatusStyle(item.status)}`}>
          {getStatusDisplay(item.status)}
        </span>
      </div>

      {item.status !== 'failed' && (
        <div className="mt-6 space-y-6">
          {item.content && (
            <div className="bg-gray-900/50 rounded-lg p-4">
              <h3 className="text-lg font-medium mb-2 text-gray-300">生成的总结</h3>
              <p className="text-gray-400 whitespace-pre-wrap">{item.content}</p>
            </div>
          )}

          {(item.imageUrl || (item.avatarTasks && item.avatarTasks.length > 0)) && (
            <div>
              <div className="grid grid-cols-2 gap-4">
                {item.imageUrl && (
                  <div>
                    <h3 className="text-lg font-medium mb-2 text-gray-300">总结图片</h3>
                    <div className="relative aspect-[3/2] rounded-lg overflow-hidden">
                      <img
                        src={item.imageUrl}
                        alt="Generated Summary"
                        className="w-full h-full object-contain bg-gray-900/50"
                      />
                      <button
                        onClick={() => {
                          const link = document.createElement('a')
                          link.href = item.imageUrl!
                          link.download = `github-summary-${item.username}.png`
                          link.click()
                        }}
                        className="absolute bottom-4 right-4 px-4 py-2 bg-gray-900/80 hover:bg-gray-900 text-white rounded-lg transition"
                      >
                        下载图片
                      </button>
                    </div>
                  </div>
                )}

                {item.avatarTasks && item.avatarTasks.map(avatarTask => (
                  avatarTask.imageUrl && (
                    <div key={avatarTask.id}>
                      <h3 className="text-lg font-medium mb-2 text-gray-300">头像图片</h3>
                      <div className="relative aspect-square rounded-lg overflow-hidden">
                        <img
                          src={avatarTask.imageUrl}
                          alt="Generated Avatar"
                          className="w-full h-full object-contain bg-gray-900/50"
                        />
                        <div className="absolute top-4 left-4 flex gap-2">
                          <span className={`px-3 py-1 rounded text-sm ${getStatusStyle(avatarTask.status)}`}>
                            {getStatusDisplay(avatarTask.status)}
                          </span>
                          {avatarTask.creditHistory && (
                            <span className="px-3 py-1 bg-[#ffddb0]/10 rounded text-[#ffddb0] text-sm">
                              {avatarTask.creditHistory.amount} {t('credits.balance')}
                            </span>
                          )}
                        </div>
                        <button
                          onClick={() => {
                            const link = document.createElement('a')
                            link.href = avatarTask.imageUrl!
                            link.download = `github-avatar-${item.username}.png`
                            link.click()
                          }}
                          className="absolute bottom-4 right-4 px-4 py-2 bg-gray-900/80 hover:bg-gray-900 text-white rounded-lg transition"
                        >
                          下载头像
                        </button>
                      </div>
                    </div>
                  )
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {item.status === 'failed' && item.error && (
        <div className="mt-4 text-red-400">
          错误信息: {item.error}
        </div>
      )}
    </div>
  )

  return (
    <Layout hideFooter={true}>
      <div className="container mx-auto px-4 pt-24 pb-12">
        <h1 className="text-3xl font-bold mb-8">{t('nav.history')}</h1>
        {loading ? (
          <div className="flex justify-center">
            <div className="w-8 h-8 border-4 border-gray-600 border-t-white rounded-full animate-spin"></div>
          </div>
        ) : (
          <div className="space-y-8">
            {history.map(item => renderTaskCard(item))}
            {history.length === 0 && (
              <div className="text-center text-gray-400 py-12">
                暂无历史记录
              </div>
            )}
          </div>
        )}
      </div>
    </Layout>
  );
}

export const getStaticProps: GetStaticProps = async ({ locale }) => {
  return {
    props: {
      ...(await serverSideTranslations(locale ?? 'en', ['common']))
    }
  }
} 