import { NextApiRequest, NextApiResponse } from 'next'
import { prisma } from '@/lib/prisma'
import { getAuth } from '@clerk/nextjs/server'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const { userId } = getAuth(req)
    if (!userId) {
      console.log("[api/avatar/create-task] Unauthorized");
      return res.status(401).json({ error: 'Unauthorized' })
    }

    const { summaryId, credits } = req.body

    if (!summaryId || !credits) {
      console.log("[api/avatar/create-task] Missing required fields");
      return res.status(400).json({ error: 'Missing required fields' })
    }

    // First verify the summary task exists and belongs to the user
    const summary = await prisma.task.findFirst({
      where: { 
        id: summaryId,
        userId
      }
    })

    if (!summary) {
      console.log("[api/avatar/create-task] Summary task not found");
      return res.status(404).json({ error: 'Summary task not found' })
    }

    // Create avatar task and update task status in a transaction
    const result = await prisma.$transaction(async (prisma) => {
      // Create avatar task
      const avatarTask = await prisma.avatarTask.create({
        data: {
          userId,
          summaryId,
          status: 'pending',
          credits
        },
        select: {
          id: true
        }
      })

      console.log("[api/avatar/create-task] Avatar task created: ", avatarTask);

      return avatarTask
    })

    return res.status(200).json({ taskId: result.id })
  } catch (error) {
    console.error('Error creating avatar task:', error)
    return res.status(500).json({ error: 'Internal server error' })
  }
} 