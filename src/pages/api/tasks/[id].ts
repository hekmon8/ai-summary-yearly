import { NextApiRequest, NextApiResponse } from 'next'
import { prisma } from '@/lib/prisma'
import { getAuth } from '@clerk/nextjs/server'

// 预计每个步骤的时间（毫秒）
const ESTIMATED_TIMES = {
  GITHUB_DATA: 3000,    // GitHub 数据获取
  OPENAI_GENERATION: 15000,  // OpenAI 内容生成
  IMAGE_GENERATION: 2000,    // 图片生成
  TOTAL: 20000  // 总时间
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const { userId } = getAuth(req)
  if (!userId) {
    return res.status(401).json({ error: 'Unauthorized' })
  }

  const taskId = req.query.id as string

  if (req.method === 'GET') {
    try {
      const task = await prisma.task.findUnique({
        where: { id: taskId }
      })

      if (!task) {
        return res.status(404).json({ error: 'Task not found' })
      }

      // 验证用户是否有权限访问该任务
      const credits = await prisma.credits.findUnique({
        where: { userId }
      })

      const isAdmin = (credits as any)?.isAdmin || false
      if (!isAdmin && task.userId !== userId) {
        return res.status(403).json({ error: 'Forbidden' })
      }

      // 根据任务状态和消息确定当前步骤
      let currentStep = 'pending'
      if (task.message?.includes('GitHub')) {
        currentStep = 'github_data'
      } else if (task.message?.includes('总结')) {
        currentStep = 'content_generation'
      } else if (task.message?.includes('图片')) {
        currentStep = 'image_generation'
      }

      // 根据任务状态和当前步骤确定步骤状态
      const steps = [
        {
          name: 'github_data',
          status: currentStep === 'github_data' ? 'processing' :
                  currentStep === 'content_generation' || currentStep === 'image_generation' ? 'completed' :
                  'pending',
          time: ESTIMATED_TIMES.GITHUB_DATA
        },
        {
          name: 'content_generation',
          status: currentStep === 'content_generation' ? 'processing' :
                  currentStep === 'image_generation' ? 'completed' :
                  currentStep === 'github_data' ? 'pending' :
                  'pending',
          time: ESTIMATED_TIMES.OPENAI_GENERATION
        },
        {
          name: 'image_generation',
          status: currentStep === 'image_generation' ? 'processing' :
                  task.status === 'completed' ? 'completed' :
                  currentStep === 'content_generation' || currentStep === 'github_data' ? 'pending' :
                  'pending',
          time: ESTIMATED_TIMES.IMAGE_GENERATION
        }
      ]

      // 计算总进度
      let progress = 0
      if (task.status === 'completed') {
        progress = 100
      } else if (task.status === 'failed') {
        progress = 0
      } else if (task.status === 'pending') {
        progress = 0
      } else {
        // 根据当前步骤计算进度
        const stepWeights = {
          github_data: 0.2,      // 20%
          content_generation: 0.5, // 50%
          image_generation: 0.3   // 30%
        }

        const stepProgress = {
          github_data: currentStep === 'github_data' ? 50 : 
                      (currentStep === 'content_generation' || currentStep === 'image_generation') ? 100 : 0,
          content_generation: currentStep === 'content_generation' ? 50 :
                            currentStep === 'image_generation' ? 100 : 0,
          image_generation: currentStep === 'image_generation' ? 50 :
                          task.status === 'completed' ? 100 : 0
        }

        // 计算总进度（每个步骤权重不同）
        progress = (
          (stepProgress.github_data * stepWeights.github_data) +
          (stepProgress.content_generation * stepWeights.content_generation) +
          (stepProgress.image_generation * stepWeights.image_generation)
        )
      }

      return res.status(200).json({
        id: task.id,
        status: task.status,
        message: task.message || undefined,
        error: task.error || undefined,
        imageUrl: task.imageUrl || undefined,
        shareUrl: task.shareUrl || undefined,
        estimatedTime: ESTIMATED_TIMES.TOTAL,
        progress: Math.round(progress),
        steps
      })
    } catch (error) {
      console.error('Error fetching task:', error)
      return res.status(500).json({ error: 'Internal server error' })
    }
  } else if (req.method === 'PATCH') {
    try {
      const updates = req.body
      const task = await prisma.task.findUnique({
        where: { id: taskId }
      })

      if (!task) {
        return res.status(404).json({ error: 'Task not found' })
      }

      // 验证用户是否有权限更新该任务
      const credits = await prisma.credits.findUnique({
        where: { userId }
      })

      const isAdmin = (credits as any)?.isAdmin || false
      if (!isAdmin && task.userId !== userId) {
        return res.status(403).json({ error: 'Forbidden' })
      }

      const updatedTask = await prisma.task.update({
        where: { id: taskId },
        data: {
          status: updates.status,
          content: updates.content,
          imageUrl: updates.imageUrl,
          error: updates.error,
          message: updates.message
        }
      })

      return res.status(200).json(updatedTask)
    } catch (error) {
      console.error('Error updating task:', error)
      return res.status(500).json({ error: 'Internal server error' })
    }
  }

  return res.status(405).json({ error: 'Method not allowed' })
} 