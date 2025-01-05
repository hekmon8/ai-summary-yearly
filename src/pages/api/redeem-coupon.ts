import { NextApiRequest, NextApiResponse } from 'next'
import { prisma } from '@/lib/prisma'

const COUPON_CREDITS = 10

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' })
  }

  try {
    const { code, userId } = req.body

    if (!code || !userId) {
      return res.status(400).json({ message: 'Missing required fields' })
    }

    // 检查优惠码是否已被使用
    const existingRedeem = await prisma.couponRedeem.findFirst({
      where: {
        OR: [
          { code, userId }, // 同一用户使用过该优惠码
          { userId, type: 'welcome' } // 同一用户使用过任何欢迎优惠码
        ]
      }
    })

    if (existingRedeem) {
      return res.status(400).json({ message: 'coupon_already_used' })
    }

    // 添加积分并记录优惠码使用
    await prisma.$transaction([
      // 更新或创建用户积分
      prisma.credits.upsert({
        where: { userId },
        create: {
          userId,
          amount: COUPON_CREDITS,
          history: {
            create: {
              amount: COUPON_CREDITS,
              type: 'coupon',
              description: `Welcome coupon: ${code}`
            }
          }
        },
        update: {
          amount: { increment: COUPON_CREDITS },
          history: {
            create: {
              amount: COUPON_CREDITS,
              type: 'coupon',
              description: `Welcome coupon: ${code}`
            }
          }
        }
      }),
      // 记录优惠码使用
      prisma.couponRedeem.create({
        data: {
          code,
          userId,
          type: 'welcome',
          credits: COUPON_CREDITS
        }
      })
    ])

    return res.status(200).json({ 
      success: true,
      credits: COUPON_CREDITS
    })
  } catch (error) {
    console.error('Coupon redemption error:', error)
    return res.status(500).json({ message: 'Internal server error' })
  }
} 