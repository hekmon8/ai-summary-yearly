import { PrismaClient } from '@prisma/client'
import { randomBytes } from 'crypto'

const prisma = new PrismaClient()

async function generateCouponCode(length: number = 8): Promise<string> {
  const bytes = randomBytes(Math.ceil(length / 2))
  return bytes.toString('hex').slice(0, length).toUpperCase()
}

async function createCoupon(type: string = 'welcome', credits: number = 10) {
  try {
    const code = await generateCouponCode()
    console.log(`Generated coupon code: ${code}`)
    console.log(`Type: ${type}`)
    console.log(`Credits: ${credits}`)
    
    // 这里我们不需要在 CouponRedeem 表中预先创建记录
    // 优惠码会在用户使用时被记录到 CouponRedeem 表中
    
    console.log('\nTo use this coupon:')
    console.log(`1. User needs to be logged in`)
    console.log(`2. Add to URL: ?code=${code}`)
    console.log(`3. Each user can use this code only once`)
    
  } catch (error) {
    console.error('Error creating coupon:', error)
  } finally {
    await prisma.$disconnect()
  }
}

// 从命令行参数获取类型和积分数量
const type = process.argv[2] || 'welcome'
const credits = parseInt(process.argv[3] || '10', 10)

createCoupon(type, credits) 