import { prisma } from './prisma'

export async function getUserCredits(userId: string) {
  const credits = await prisma.credits.findUnique({
    where: { userId },
    select: { amount: true }
  })
  return credits?.amount ?? 0
}

export async function useCredits(userId: string, creditsToUse: number) {
  try {
    await prisma.$transaction(async (tx) => {
      const user = await tx.credits.findUnique({
        where: { userId }
      })

      if (!user || user.amount < creditsToUse) {
        throw new Error('Insufficient credits')
      }

      await tx.credits.update({
        where: { userId },
        data: { amount: { decrement: creditsToUse } }
      })
    })
    return true
  } catch (error) {
    return false
  }
}

export async function recordGeneration(
  userId: string,
  imageUrl: string,
  style: string,
  platform: string,
  username: string
) {
  const task = await prisma.task.create({
    data: {
      userId,
      imageUrl,
      style,
      username,
      status: 'completed'
    }
  })
  return task.id
}

export async function getUserHistory(
  userId: string,
  limit: number = 10,
  offset: number = 0
) {
  return await prisma.task.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
    take: limit,
    skip: offset
  })
}

export type UserHistory = Awaited<ReturnType<typeof getUserHistory>>[number] 