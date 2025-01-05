import { NextApiRequest, NextApiResponse } from 'next';
import { prisma } from '@/lib/prisma';
import { GenerationService } from '@/lib/generation';
import { env } from '@/env.mjs';

// 配置
const CONCURRENT_TASKS = 2;           // 同时处理2个任务
const MAX_PROCESSING_TIME = 180000;   // 增加到180秒
const MIN_TASK_TIME = 30000;         // 预估单个任务最少需要30秒
const MAX_RETRIES = 5;               // 增加重试次数
const RETRY_DELAY = 2000;            // 增加重试延迟到2秒
const TRANSACTION_TIMEOUT = 30000;    // 事务超时时间30秒
const TRANSACTION_MAX_WAIT = 20000;   // 事务最大等待时间20秒

async function retryTransaction<T>(
  operation: () => Promise<T>,
  retries = MAX_RETRIES,
  delay = RETRY_DELAY
): Promise<T> {
  try {
    return await operation();
  } catch (error) {
    if (retries > 0 && error instanceof Error && 
       (error.message.includes('Unable to start a transaction') || 
        error.message.includes('deadlock') || 
        error.message.includes('connection pool'))) {
      console.log(`Retrying transaction, ${retries} attempts remaining. Error: ${error.message}`);
      await new Promise(resolve => setTimeout(resolve, delay * (MAX_RETRIES - retries + 1))); // 指数退避
      return retryTransaction(operation, retries - 1, delay);
    }
    throw error;
  }
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // 验证请求
  const authHeader = req.headers.authorization;
  console.log("[api/tasks/process]Recv API_TOKEN: ", authHeader);
  if (authHeader !== `Bearer ${env.API_TOKEN}`) {
    console.log("[api/tasks/process]API_TOKEN not match, expected: ", env.API_TOKEN);
    return res.status(401).json({ error: 'Unauthorized' });
  }

  // 获取所有处理中的任务，如果更新时间超过5min，则更新为failed状态
  const processingTasks = await prisma.task.findMany({
    where: { 
      status: 'processing',
      updatedAt: { lt: new Date(Date.now() - 5 * 60 * 1000) }
    }
  })

  if (processingTasks.length > 0) {
    console.log("[api/tasks/process] Processing tasks found, update to failed: ", processingTasks);  
    for (const task of processingTasks) {
      await prisma.task.update({
        where: { id: task.id },
        data: { status: 'failed', updatedAt: new Date(), message: '生成失败' }
      })
    }
  } 

  const startTime = Date.now();
  const service = new GenerationService();
  const results = {
    processed: 0,
    succeeded: 0,
    failed: 0,
    skipped: 0,
    details: [] as Array<{
      taskId: string;
      status: 'success' | 'failed' | 'skipped';
      error?: string;
    }>,
  };

  try {
    // 获取并锁定待处理任务
    const tasks = await retryTransaction(async () => {
      return await prisma.$transaction(async (tx) => {
        // 1. 获取待处理任务，并检查它们是否仍然存在
        const pendingTasks = await tx.task.findMany({
          where: { 
            status: 'pending',
            error: null // 只获取没有错误的任务
          },
          take: CONCURRENT_TASKS,
          orderBy: { createdAt: 'asc' },
        });

        if (pendingTasks.length === 0) {
          console.log("[api/tasks/process]No pending tasks found");
          return [];
        }

        // 2. 再次检查任务状态并标记为处理中
        const tasksToProcess = await tx.task.findMany({
          where: {
            id: {
              in: pendingTasks.map(t => t.id)
            },
            status: 'pending' // 确保任务仍然是待处理状态
          }
        });

        if (tasksToProcess.length === 0) {
          console.log("[api/tasks/process]No tasks to process");
          return [];
        }

        // 3. 标记这些任务为处理中
        await tx.task.updateMany({
          where: {
            id: {
              in: tasksToProcess.map(t => t.id)
            },
            status: 'pending' // 再次确认状态
          },
          data: {
            status: 'processing',
            message: '等待处理...',
            error: null
          }
        });

        console.log("[api/tasks/process]Tasks to process: ", tasksToProcess);
        return tasksToProcess;
      }, {
        maxWait: TRANSACTION_MAX_WAIT,    // 增加最大等待时间
        timeout: TRANSACTION_TIMEOUT      // 增加事务超时时间
      });
    });

    if (tasks.length === 0) {
      return res.json({ message: 'No pending tasks' });
    }

    console.log(`Found ${tasks.length} tasks to process`);

    // 分片处理任务
    for (const task of tasks) {
      const timeElapsed = Date.now() - startTime;
      const timeRemaining = MAX_PROCESSING_TIME - timeElapsed;

      // 如果剩余时间不足以处理新任务，跳过
      if (timeRemaining < MIN_TASK_TIME) {
        console.log(`Insufficient time remaining (${timeRemaining}ms) for task ${task.id}, skipping`);
        results.skipped++;
        results.details.push({
          taskId: task.id,
          status: 'skipped',
        });
        // 将跳过的任务重置为 pending 状态
        await prisma.task.update({
          where: { id: task.id },
          data: {
            status: 'pending',
            message: '等待处理',
          },
        });
        continue;
      }

      try {
        // 设置任务处理超时
        console.log(`Processing task ${task.id} with ${timeRemaining}ms remaining`)
        const processPromise = service.processTask(task.id);
        const timeoutPromise = new Promise((_, reject) => {
          setTimeout(() => {
            console.log(`Task ${task.id} processing timed out after ${timeRemaining}ms`)
            reject(new Error(`Task processing timed out after ${timeRemaining}ms`))
          }, timeRemaining);
        });

        // 等待任务完成或超时
        await Promise.race([processPromise, timeoutPromise]);
        
        results.succeeded++;
        results.processed++;
        results.details.push({
          taskId: task.id,
          status: 'success',
        });
        
        console.log(`Successfully processed task ${task.id}`);
      } catch (error) {
        console.error(`Failed to process task ${task.id}:`, error);
        
        try {
          // 使用重试机制更新任务状态
          await retryTransaction(async () => {
            if (error instanceof Error && error.message.includes('timed out')) {
              console.log(`Resetting timed out task ${task.id} to pending state`);
              await prisma.task.update({
                where: { id: task.id },
                data: {
                  status: 'pending',
                  message: '等待重试',
                  error: null
                },
              });
              
              results.skipped++;
              results.details.push({
                taskId: task.id,
                status: 'skipped',
                error: error.message,
              });
            } else {
              results.failed++;
              results.processed++;
              results.details.push({
                taskId: task.id,
                status: 'failed',
                error: error instanceof Error ? error.message : 'Unknown error',
              });
              
              // 更新任务状态为失败并退还积分
              await prisma.$transaction(async (tx) => {
                // 更新任务状态
                await tx.task.update({
                  where: { id: task.id },
                  data: {
                    status: 'failed',
                    error: error instanceof Error ? error.message : 'Unknown error',
                    message: '生成失败',
                  },
                });

                // 查找用户的积分记录
                const creditHistory = await tx.creditHistory.findFirst({
                  where: {
                    taskId: task.id,
                    type: 'task_creation'
                  },
                  include: {
                    credits: true
                  }
                });

                if (creditHistory) {
                  // 退还积分
                  await tx.credits.update({
                    where: { id: creditHistory.creditsId },
                    data: {
                      amount: { increment: Math.abs(creditHistory.amount) },
                      history: {
                        create: {
                          amount: Math.abs(creditHistory.amount),
                          type: 'refund',
                          description: `Refund for failed task ${task.id}`,
                          taskId: task.id
                        }
                      }
                    }
                  });
                }
              }, {
                maxWait: TRANSACTION_MAX_WAIT,    // 增加最大等待时间
                timeout: TRANSACTION_TIMEOUT      // 增加事务超时时间
              });
            }
          });
        } catch (updateError) {
          console.error(`Failed to update task ${task.id} status:`, updateError);
        }
      }
    }

    const processingTime = Date.now() - startTime;
    console.log(`Processing completed in ${processingTime}ms`);
    console.log('Results:', results);

    return res.json({
      message: 'Tasks processed',
      processingTime,
      results,
    });
  } catch (error) {
    console.error('Task processing error:', error);
    return res.status(500).json({
      error: error instanceof Error ? error.message : 'Unknown error',
      results,
    });
  }
} 