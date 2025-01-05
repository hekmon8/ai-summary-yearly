import { createContext, useContext, useEffect, useState } from 'react'
import { useRouter } from 'next/router'
import { useAuth as useClerkAuth, useUser } from '@clerk/nextjs'
import type { UserResource } from '@clerk/types'

interface UserCredits {
  credits: number
  isAdmin: boolean
}

interface AuthContextType {
  user: UserResource | null
  loading: boolean
  credits: UserCredits | null
  signInWithProvider: (provider: 'github' | 'google') => Promise<void>
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  credits: null,
  signInWithProvider: async () => {},
  signOut: async () => {}
})

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [loading, setLoading] = useState(true)
  const [credits, setCredits] = useState<UserCredits | null>(null)
  const { isLoaded, signOut: clerkSignOut, getToken } = useClerkAuth()
  const { user } = useUser()
  const router = useRouter()

  useEffect(() => {
    const fetchCredits = async () => {
      if (user?.id) {
        try {
          const token = await getToken()
          if (!token) {
            console.error('No token available')
            return
          }

          // 首先尝试初始化 credits
          console.log('Initializing credits for user:', user.id)
          const initResponse = await fetch('/api/credits', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
            }
          })
          
          if (initResponse.ok) {
            const data = await initResponse.json()
            console.log('Credits initialized:', data)
            setCredits({
              credits: data.credits,
              isAdmin: data.isAdmin || false
            })
            return
          }

          console.log('Initialization failed, fetching existing credits')
          // 如果初始化失败，尝试获取现有的 credits
          const getResponse = await fetch('/api/credits', {
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
            }
          })

          if (getResponse.ok) {
            const data = await getResponse.json()
            console.log('Existing credits fetched:', data)
            setCredits({
              credits: data.credits,
              isAdmin: data.isAdmin || false
            })
          } else {
            console.error('Failed to fetch credits:', await getResponse.text())
          }
        } catch (error) {
          console.error('Error managing credits:', error)
        }
      } else {
        setCredits(null)
      }
    }

    // 添加重试机制
    const retryFetchCredits = async (retries = 3, delay = 1000) => {
      for (let i = 0; i < retries; i++) {
        try {
          await fetchCredits()
          if (credits !== null) {
            break
          }
          console.log(`Retry ${i + 1}/${retries} for fetching credits`)
          await new Promise(resolve => setTimeout(resolve, delay))
        } catch (error) {
          console.error(`Retry ${i + 1}/${retries} failed:`, error)
          if (i === retries - 1) throw error
          await new Promise(resolve => setTimeout(resolve, delay))
        }
      }
    }

    retryFetchCredits()
    setLoading(!isLoaded)
  }, [user, isLoaded, getToken, credits])

  const signInWithProvider = async (provider: 'github' | 'google') => {
    try {
      router.push(`/sign-in?provider=${provider}`)
    } catch (error) {
      console.error('Error signing in:', error)
      throw error
    }
  }

  const signOut = async () => {
    try {
      await clerkSignOut()
      setCredits(null)
      router.push('/sign-in')
    } catch (error) {
      console.error('Error signing out:', error)
      throw error
    }
  }

  return (
    <AuthContext.Provider value={{
      user: user || null,
      loading: !isLoaded,
      credits,
      signInWithProvider,
      signOut
    }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext) 