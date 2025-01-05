import { NextApiRequest, NextApiResponse } from 'next';
import { prisma } from '@/lib/prisma';

// 预计每个步骤的时间（秒）
const ESTIMATED_TIMES = {
  PENDING: 5,        // 等待处理
  GITHUB_DATA: 10,   // GitHub 数据获取
  GENERATION: 30,    // 内容生成
  IMAGE: 10,         // 图片生成
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { taskId } = req.query;

  if (!taskId || typeof taskId !== 'string') {
    return res.status(400).json({ error: 'Task ID is required' });
  }

  try {
    // 获取当前任务信息
    const currentTask = await prisma.task.findUnique({
      where: { id: taskId },
      select: { 
        createdAt: true,
        status: true,
        message: true
      },
    });

    if (!currentTask) {
      return res.status(404).json({ error: 'Task not found' });
    }

    // 获取队列中的任务
    const [pendingTasks, processingTasks] = await Promise.all([
      // 获取待处理的任务
      prisma.task.findMany({
        where: {
          status: 'pending',
          createdAt: {
            lt: currentTask.createdAt,
          },
        },
        orderBy: {
          createdAt: 'asc',
        },
      }),
      // 获取处理中的任务
      prisma.task.findMany({
        where: {
          status: 'processing',
        },
        orderBy: {
          createdAt: 'asc',
        },
      }),
    ]);

    // 计算预估等待时间
    let estimatedWaitTime = 0;

    // 1. 计算前面待处理任务的等待时间
    estimatedWaitTime += pendingTasks.length * ESTIMATED_TIMES.PENDING;

    // 2. 计算处理中任务的剩余时间
    for (const task of processingTasks) {
      let remainingTime = ESTIMATED_TIMES.PENDING;
      
      if (task.message?.includes('GitHub')) {
        remainingTime = ESTIMATED_TIMES.GITHUB_DATA;
      } else if (task.message?.includes('生成内容')) {
        remainingTime = ESTIMATED_TIMES.GENERATION;
      } else if (task.message?.includes('生成图片')) {
        remainingTime = ESTIMATED_TIMES.IMAGE;
      }
      
      estimatedWaitTime += remainingTime;
    }

    // 3. 如果当前任务正在处理中，返回当前步骤信息
    let currentStep = null;
    if (currentTask.status === 'processing') {
      if (currentTask.message?.includes('GitHub')) {
        currentStep = 'github_data';
      } else if (currentTask.message?.includes('生成内容')) {
        currentStep = 'content_generation';
      } else if (currentTask.message?.includes('生成图片')) {
        currentStep = 'image_generation';
      }
    }

    return res.json({
      status: currentTask.status,
      currentStep,
      queuePosition: pendingTasks.length + 1, // 位置从1开始计数
      processingCount: processingTasks.length,
      estimatedWaitTime: Math.ceil(estimatedWaitTime), // 向上取整
      message: currentTask.message || undefined,
    });
  } catch (error) {
    console.error('Failed to get queue info:', error);
    return res.status(500).json({
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
} 