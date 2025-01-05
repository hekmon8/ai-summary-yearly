import { NextApiRequest, NextApiResponse } from 'next'
import { prisma } from '@/lib/prisma'
import { AvatarGenerationService } from '@/lib/avatar-generation'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // 验证请求来源
  const authHeader = req.headers.authorization;
  console.log("[api/avatar/process] Recv API_TOKEN: ", authHeader);
  if (authHeader !== `Bearer ${process.env.API_TOKEN}`) {
    console.log("[api/avatar/process] API_TOKEN not match, expected: ", process.env.API_TOKEN);
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {

    // 获取所有处理中的任务，如果更新时间超过5min，则更新为failed状态
    const processingTasks = await prisma.avatarTask.findMany({
      where: { 
        status: 'processing',
        updatedAt: { lt: new Date(Date.now() - 5 * 60 * 1000) }
      }
    })

    if (processingTasks.length > 0) {
        console.log("[api/avatar/process] Processing tasks found: ", processingTasks);  
        for (const task of processingTasks) {
            await prisma.avatarTask.update({
                where: { id: task.id },
                data: { 
                    status: 'failed',
                    updatedAt: new Date()
                }
            })
        }
    }

    // 获取所有待处理的头像任务
    const pendingTasks = await prisma.avatarTask.findMany({
      where: { 
        status: 'pending'
      },
      take: 3,
      include: {
        summary: true
      },
      orderBy: { createdAt: 'desc' },
    })

    if (pendingTasks.length === 0) {
      console.log("[api/avatar/process] No pending tasks found");
      return res.status(200).json({ 
        success: true,
        message: 'No pending tasks found'
      })
    }

    console.log("[api/avatar/process] Pending tasks found: ", pendingTasks);

    // 处理每个任务
    const service = new AvatarGenerationService()
    const results = []

    for (const task of pendingTasks) {
      try {
        const result = await service.processAvatarTask(task.id)
        console.log("[api/avatar/process] Processed avatar task: ", task.id);
        results.push({
          taskId: task.id,
          success: result.success,
          imageUrl: result.imageUrl,
          error: result.error
        })
      } catch (error) {
        results.push({
          taskId: task.id,
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        })
      }
    }

    console.log("[api/avatar/process] Processed avatar tasks: ", results);
    
    return res.status(200).json({ 
      success: true,
      processed: results.length,
      results 
    })

  } catch (error) {
    console.error('Failed to process avatar tasks:', error)
    return res.status(500).json({
      error: error instanceof Error ? error.message : 'Internal server error'
    })
  }
} 