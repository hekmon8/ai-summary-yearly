import { getAuth } from '@clerk/nextjs/server'
import { NextApiRequest, NextApiResponse } from 'next'

export interface AuthenticatedRequest extends NextApiRequest {
  auth: {
    userId: string
    sessionId: string | null
  }
}

export type AuthenticatedHandler = (
  req: AuthenticatedRequest,
  res: NextApiResponse
) => Promise<void> | void

export function withAuth(handler: AuthenticatedHandler) {
  return async (req: NextApiRequest, res: NextApiResponse) => {
    try {
      const { userId, sessionId } = getAuth(req)

      if (!userId) {
        return res.status(401).json({ error: 'Unauthorized' })
      }

      // 添加认证信息到请求对象
      const authenticatedReq = req as AuthenticatedRequest
      authenticatedReq.auth = {
        userId,
        sessionId
      }

      return handler(authenticatedReq, res)
    } catch (error) {
      console.error('Auth middleware error:', error)
      return res.status(401).json({ 
        error: 'Authentication failed',
        details: error instanceof Error ? error.message : 'Unknown error'
      })
    }
  }
} 