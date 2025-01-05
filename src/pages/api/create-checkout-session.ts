import { NextApiRequest, NextApiResponse } from 'next'
import { stripe } from '@/lib/stripe'
import { prisma } from '@/lib/prisma'

// 定义套餐类型
interface Package {
  id: string
  credits: number
  price: number
  style: 'diss' | 'best diss' | 'appricate'
}

const PACKAGES: Record<string, Package> = {
  diss: { id: 'diss', credits: 5, price: 0, style: 'diss' },
  'best diss': { id: 'best diss', credits: 5, price: 0, style: 'best diss' },
  appricate: { id: 'appricate', credits: 8, price: 0, style: 'appricate' }
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' })
  }

  try {
    const { style, userId } = req.body

    // 验证风格是否存在
    const packageInfo = PACKAGES[style]
    if (!packageInfo) {
      return res.status(400).json({ message: 'Invalid style' })
    }

    try {
      // 检查用户积分是否足够
      const userCredits = await prisma.credits.findUnique({
        where: { userId }
      })

      if (!userCredits || userCredits.amount < packageInfo.credits) {
        return res.status(400).json({ message: 'insufficient_credits' })
      }

      // 扣除积分
      await prisma.credits.update({
        where: { userId },
        data: {
          amount: { decrement: packageInfo.credits },
          history: {
            create: {
              amount: -packageInfo.credits,
              type: 'use',
              description: `Used for ${style} style summary`
            }
          }
        }
      })

      return res.status(200).json({ success: true })
    } catch (error) {
      console.error('Database error:', error)
      return res.status(500).json({ message: 'Failed to process credits' })
    }
  } catch (err) {
    console.error('API error:', err)
    res.status(500).json({ message: 'Internal server error' })
  }
} 