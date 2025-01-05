import { NextApiRequest, NextApiResponse } from 'next'
import { prisma } from '@/lib/prisma'
import { getAuth } from '@clerk/nextjs/server'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const { userId } = getAuth(req)
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' })
    }

    const { taskId } = req.query
    if (!taskId || typeof taskId !== 'string') {
      return res.status(400).json({ error: 'Invalid task ID' })
    }

    console.log("[api/avatar/status] Task ID: ", taskId);

    // 获取任务状态
    const task = await prisma.avatarTask.findFirst({
      where: {
        id: taskId,
        userId
      },
      select: {
        id: true,
        status: true,
        imageUrl: true,
        error: true
      }
    })

    if (!task) {
      return res.status(404).json({ error: 'Task not found' })
    }

    console.log("[api/avatar/status] Task found: ", task);

    return res.json(task)
  } catch (error) {
    console.error('Error fetching task status:', error)
    return res.status(500).json({ error: 'Internal server error' })
  }
} 