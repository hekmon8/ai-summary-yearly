import { getAuth } from "@clerk/nextjs/server"
import { NextApiRequest, NextApiResponse } from 'next'
import { prisma } from '@/lib/prisma'

// 免费赠送的 credit 数量
const FREE_CREDITS = process.env.NODE_ENV === 'development' ? 300 : 30

async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { userId } = getAuth(req)

  if (!userId) {
    return res.status(401).json({ error: 'Unauthorized' })
  }

  if (req.method === 'GET') {
    try {
      // 获取用户的 credits
      const credits = await prisma.credits.findUnique({
        where: { userId },
        select: {
          amount: true
        }
      })

      // 如果用户没有 credits 记录，自动创建一个
      if (!credits) {
        const newCredits = await prisma.credits.create({
          data: {
            userId,
            amount: FREE_CREDITS,
            history: {
              create: {
                amount: FREE_CREDITS,
                type: 'INIT',
                description: process.env.NODE_ENV === 'development'
                  ? 'Development mode initial credits'
                  : 'Welcome bonus credits'
              }
            }
          },
          select: {
            amount: true
          }
        })

        return res.json({
          credits: newCredits.amount
        })
      }

      return res.json({
        credits: credits.amount
      })
    } catch (error) {
      console.error('Error fetching credits:', error)
      return res.status(500).json({ error: 'Failed to fetch credits' })
    }
  }

  if (req.method === 'POST') {
    try {
      // 使用 upsert 来减少查询次数
      const credits = await prisma.credits.upsert({
        where: { userId },
        update: {}, // 如果存在则不更新
        create: {
          userId,
          amount: FREE_CREDITS,
          history: {
            create: {
              amount: FREE_CREDITS,
              type: 'INIT',
              description: process.env.NODE_ENV === 'development'
                ? 'Development mode initial credits'
                : 'Welcome bonus credits'
            }
          }
        },
        select: {
          amount: true
        }
      })

      return res.json({
        credits: credits.amount
      })
    } catch (error) {
      console.error('Error managing credits:', error)
      return res.status(500).json({ error: 'Failed to manage credits' })
    }
  }

  return res.status(405).json({ error: 'Method not allowed' })
}

export default handler 