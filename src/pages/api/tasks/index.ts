import { type NextApiRequest, type NextApiResponse } from 'next'
import { prisma } from '@/lib/prisma'
import { Task, Credits } from '@prisma/client'
import { Octokit } from '@octokit/rest'
import { getAuth } from '@clerk/nextjs/server'

interface SimpleCreditHistory {
  amount: number
  type: string
  description: string
  createdAt: Date
}

interface SimpleUser {
  id: string
  email: string
  credits: {
    amount: number
    isAdmin?: boolean
  }
}

interface TaskWithCreditHistory extends Task {
  creditHistory: SimpleCreditHistory[]
  user?: SimpleUser
}

async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const { userId } = getAuth(req)
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' })
    }

    console.log('Tasks API - Request received:', { method: req.method, userId })
    
    // 确保用户有足够的积分
    console.log('Tasks API - Checking credits for user:', userId)
    
    const credits = await prisma.credits.findUnique({
      where: { userId }
    })
    console.log('Tasks API - User credits:', credits)

    if (!credits) {
      console.log('Tasks API - No credits found')
      return res.status(403).json({ error: 'No credits found' })
    }

    if (req.method === 'POST') {
      const { username, style, platform } = req.body
      console.log('Tasks API - Creating task:', { username, style, platform })

      if (!username || !style) {
        console.log('Tasks API - Missing required fields')
        return res.status(400).json({ error: 'Missing required fields' })
      }

      // 根据模式确定所需积分
      const requiredCredits = style === 'sarcasm' ? 5 : 8
      
      if (credits.amount < requiredCredits) {
        console.log('Tasks API - Insufficient credits:', { credits, required: requiredCredits })
        return res.status(403).json({ error: 'Insufficient credits' })
      }

      // 验证平台
      if (platform !== 'github') {
        console.log('Tasks API - Platform not available:', platform)
        return res.status(400).json({ error: 'Platform not available yet' })
      }

      // 确保github等平台存在该用户名对应的用户
      if (platform === 'github') {
        try {
          if (!process.env.GITHUB_TOKEN) {
            console.log('Tasks API - GitHub token not configured')
            throw new Error('GitHub access token not configured')
          }
          console.log('Tasks API - Verifying GitHub username:', username)
          const octokit = new Octokit({
            auth: process.env.GITHUB_TOKEN
          })
          await octokit.users.getByUsername({ username })
          console.log('Tasks API - GitHub username verified')
        } catch (error) {
          console.log('Tasks API - GitHub verification error:', error)
          if (error instanceof Error && error.message === 'GitHub access token not configured') {
            return res.status(500).json({ error: 'Server configuration error' })
          }
          return res.status(404).json({ error: 'User not found' })
        }
      }

      // 创建任务
      console.log('Tasks API - Creating task in database')
      const task = await prisma.task.create({
        data: {
          username,
          style,
          userId,
          status: 'pending',
          data: {
            platform,
            username,
            style
          }
        }
      })
      console.log('Tasks API - Task created:', task)

      // 扣除积分
      console.log('Tasks API - Updating credits')
      const updatedCredits = await prisma.credits.update({
        where: { userId },
        data: { amount: credits.amount - requiredCredits }
      })
      console.log('Tasks API - Credits updated:', updatedCredits)

      // 记录积分历史
      console.log('Tasks API - Recording credit history')
      await prisma.creditHistory.create({
        data: {
          amount: -requiredCredits,
          type: 'task_creation',
          description: `Created ${style} task for ${username}`,
          taskId: task.id,
          creditsId: updatedCredits.id
        }
      })
      console.log('Tasks API - Credit history recorded')

      return res.status(200).json(task)
    }

    if (req.method === 'GET') {
      // 检查是否是管理员（尝试读取 isAdmin 字段，如果不存在则为 false）
      const isAdmin = (credits as any).isAdmin || false;

      // 根据是否是管理员决定查询条件
      const whereCondition = isAdmin ? {} : { userId };

      const tasks = await prisma.task.findMany({
        where: whereCondition,
        orderBy: { createdAt: 'desc' },
        include: {
          creditHistory: {
            select: {
              amount: true,
              type: true,
              description: true,
              createdAt: true
            }
          }
        }
      }) as unknown as TaskWithCreditHistory[];

      // 如果是管理员，获取用户信息
      let usersInfo = new Map();
      if (isAdmin) {
        const userIds = [...new Set(tasks.map(task => task.userId).filter(Boolean))];
        const users = await prisma.credits.findMany({
          where: {
            userId: {
              in: userIds as string[]
            }
          },
          select: {
            userId: true,
            amount: true
          }
        });
        
        for (const user of users) {
          usersInfo.set(user.userId, {
            id: user.userId,
            credits: {
              amount: user.amount,
              isAdmin: (credits as any).isAdmin || false
            }
          });
        }
      }

      // Transform the response
      const transformedTasks = tasks.map((task) => ({
        ...task,
        creditHistory: task.creditHistory[0] || null,
        ...(isAdmin && task.userId && {
          user: usersInfo.get(task.userId)
        })
      }));

      return res.status(200).json(transformedTasks)
    }

    return res.status(405).json({ error: 'Method not allowed' })
  } catch (error: any) {
    console.error('API error:', error)
    return res.status(500).json({ 
      error: 'Internal server error',
      message: error.message
    })
  }
}

export default handler 