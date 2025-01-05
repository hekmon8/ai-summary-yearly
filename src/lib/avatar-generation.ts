import { prisma } from '@/lib/prisma'
import OpenAI from 'openai'
import { uploadImageToR2 } from '@/lib/generation'

// Initialize OpenAI client
const openai = new (OpenAI as any)({
  apiKey: process.env.OPENAI_API_KEY || '',
  baseURL: process.env.OPENAI_API_BASE_URL
})

// 添加重试函数
async function fetchWithRetry(url: string, options: RequestInit = {}, retries = 3, timeout = 30000): Promise<Response> {
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), timeout)

  try {
    for (let i = 0; i < retries; i++) {
      try {
        const response = await fetch(url, {
          ...options,
          signal: controller.signal
        })
        if (response.ok) {
          return response
        }
        console.log(`Attempt ${i + 1} failed, retrying...`)
        // 在重试之前等待一段时间
        await new Promise(resolve => setTimeout(resolve, 1000 * (i + 1)))
      } catch (error) {
        if (i === retries - 1) throw error
        console.log(`Attempt ${i + 1} failed with error:`, error)
        // 在重试之前等待一段时间
        await new Promise(resolve => setTimeout(resolve, 1000 * (i + 1)))
      }
    }
    throw new Error(`Failed after ${retries} retries`)
  } finally {
    clearTimeout(timeoutId)
  }
}

export class AvatarGenerationService {
  async processAvatarTask(avatarTaskId: string) {
    try {
      // 获取头像任务
      const avatarTask = await prisma.avatarTask.findFirst({
        where: { id: avatarTaskId },
        include: {
          summary: {
            select: {
              data: true
            }
          }
        }
      })

      if (!avatarTask) {
        throw new Error('Avatar task not found')
      }

      // 更新状态为处理中
      await prisma.avatarTask.update({
        where: { id: avatarTaskId },
        data: { status: 'processing', updatedAt: new Date() }
      })

      // 根据 summaryId 获取到data，生成prompt提供给AI生成人物形象
      const summaryData = avatarTask.summary.data as Record<string, any>
      const platform = summaryData.platform
      const style = summaryData.style || 'diss'
      const selectedContent = summaryData.selectedContent || {}
      const basicStats = summaryData.basicStats || {}
      const topTags = summaryData.topTags || []
      const finalDiss = summaryData.FinalDiss || {}

      // 构建角色特征描述
      const traits = []
      const personality = []
      const appearance = []
      
      // 根据平台和活跃度添加特征
      if (platform === 'github') {
        if (basicStats.follower > 100) traits.push('popular developer')
        if (selectedContent.mostUsedLanguages?.length > 0) {
          const mainLang = selectedContent.mostUsedLanguages[0].language
          traits.push(`${mainLang} expert`)
        }
        if (selectedContent.activityPatterns?.weekdayPattern?.includes('weekend')) {
          traits.push('weekend coder')
        }
      } else if (platform === 'twitter') {
        if (basicStats.follower > 1000) traits.push('social media influencer')
        if (basicStats.contentCnt > 1000) traits.push('active tweeter')
      }

      // 添加用户标签特征
      if (topTags.length > 0) {
        traits.push(...topTags)
      }

      // 从 userSlogan 提取特征
      if (summaryData.userSlogan) {
        const slogan = summaryData.userSlogan.toLowerCase()
        if (slogan.includes('embedded')) {
          traits.push('embedded systems specialist')
          appearance.push('tech-savvy look')
        }
        if (slogan.includes('full-stack')) {
          traits.push('versatile developer')
          appearance.push('modern professional')
        }
        if (slogan.includes('ai')) {
          traits.push('AI enthusiast')
          appearance.push('forward-thinking expression')
        }
      }

      // 从 bestSentence 和 topKey 提取性格特征
      if (summaryData.bestSentence) {
        if (summaryData.bestSentence.includes('创新')) {
          personality.push('innovative mindset')
          appearance.push('creative spark in eyes')
        }
        if (summaryData.bestSentence.includes('未来')) {
          personality.push('visionary')
          appearance.push('confident posture')
        }
      }

      if (summaryData.topKey) {
        if (summaryData.topKey.includes('创新')) {
          personality.push('innovative')
          appearance.push('modern attire')
        }
        if (summaryData.topKey.includes('进取')) {
          personality.push('ambitious')
          appearance.push('determined expression')
        }
      }

      // 根据项目特点添加特征
      if (summaryData.priData?.topRepos) {
        const hasHomeAssistant = summaryData.priData.topRepos.some((repo: { name: string }) => 
          repo.name.toLowerCase().includes('homeassistant')
        )
        if (hasHomeAssistant) {
          traits.push('smart home innovator')
          appearance.push('tech-integrated appearance')
        }
      }

      // 根据风格调整特征
      if (style === 'diss') {
        personality.push('sarcastic', 'humorous')
        appearance.push('playful expression', 'witty smile')
      } else if (style === 'praise' || style === 'appricate') {
        personality.push('professional', 'friendly', 'approachable')
        appearance.push('warm smile', 'welcoming expression')
      }

      // 生成最终的prompt
      const gen_prompt = `Create a cartoon-style avatar with these characteristics:

Character Traits: ${traits.join(', ')}
Personality: ${personality.join(', ')}
Visual Features: ${appearance.join(', ')}

Style Requirements:
- Art Style: modern cartoon/anime style, clean and vibrant
- Character: a tech professional with ${style === 'diss' ? 'playful and witty' : 'friendly and professional'} expression
- Composition: headshot/bust portrait, front-facing or 3/4 view
- Background: simple, solid color or subtle gradient
- Colors: bright and cheerful palette

Visual Elements:
- Eyes: large, expressive, reflecting the character's ${summaryData.topKey || '创新'} nature
- Face: clean, simplified features with anime/cartoon aesthetics
- Hair: modern style with simple shading
- Clothing: minimal, tech-casual style hints
- Expression: ${style === 'diss' ? 'quirky and humorous' : 'warm and approachable'}

Additional Notes:
- Keep the style consistent with modern anime/cartoon aesthetics
- Focus on creating an instantly recognizable character
- Maintain a balance between professional and approachable look
- Avoid photorealism, aim for stylized cartoon look
- No text or complex symbols

negative prompt: photorealistic, 3d rendering, realistic, photograph, complex background, multiple views, body shot, full body, watermark, text, ugly, deformed, noisy, blurry, low quality`

      // 调用 Flux API 生成图片
      const api_url = process.env.SILICONFLOW_API_URL
      if (!api_url) {
        throw new Error('SILICONFLOW_API_URL is not configured')
      }

      const api_key = process.env.SILICONFLOW_API
      if (!api_key) {
        throw new Error('SILICONFLOW_API is not configured')
      }

      const model = process.env.SILICONFLOW_IMG_MODEL || 'stabilityai/stable-diffusion-3-5-large'

      console.log('Calling Flux API with URL:', api_url)
      const response = await fetchWithRetry(
        `${api_url}/images/generations`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${api_key}`
          },
          body: JSON.stringify({
            model: model,
            prompt: gen_prompt,
            negative_prompt: "",
            image_size: "1024x1024",
            batch_size: 1,
            seed: Math.floor(Math.random() * 4999999999),
            num_inference_steps: 20,
            guidance_scale: 7.5,
            prompt_enhancement: false
          })
        },
        3,  // 3次重试
        120000  // 120秒超时
      )

      if (!response.ok) {
        const errorText = await response.text()
        console.error('Flux API error response:', errorText)
        throw new Error(`Failed to generate image with Flux API: ${response.status} ${response.statusText}`)
      }

      const data = await response.json()
      if (!data.images?.[0]?.url) {
        console.error('Invalid response from Flux API:', data)
        throw new Error('Invalid response from Flux API: missing image URL')
      }

      const imageUrl = data.images[0].url

      // 下载图片并上传到 R2
      console.log('Downloading image from:', imageUrl)
      let r2Url: string
      try {
        const imageResponse = await fetchWithRetry(imageUrl, {}, 3, 60000) // 60秒超时，3次重试
        if (!imageResponse.ok) {
          throw new Error(`Failed to download image: ${imageResponse.status} ${imageResponse.statusText}`)
        }

        const imageBuffer = await imageResponse.arrayBuffer()
        console.log('Image downloaded successfully, size:', imageBuffer.byteLength)

        r2Url = await uploadImageToR2(
          Buffer.from(imageBuffer),
          avatarTaskId,
          'image/png'
        )
      } catch (error) {
        console.warn('Failed to download and upload image, using original URL:', error)
        r2Url = imageUrl
      }

      // 更新任务状态
      await prisma.avatarTask.update({
        where: { id: avatarTaskId },
        data: { 
          status: 'completed',
          imageUrl: r2Url
        }
      })

      // 更新主任务的头像URL
      const currentData = avatarTask.summary.data as Record<string, any>
      await prisma.task.update({
        where: { id: avatarTask.summaryId },
        data: {
          data: {
            platform: currentData.platform,
            style: currentData.style,
            selectedContent: currentData.selectedContent,
            basicStats: currentData.basicStats,
            topTags: currentData.topTags,
            FinalDiss: currentData.FinalDiss,
            userSlogan: currentData.userSlogan,
            bestSentence: currentData.bestSentence,
            topKey: currentData.topKey,
            priData: currentData.priData,
            avatarUrl: r2Url
          }
        }
      })

      return {
        success: true,
        imageUrl: r2Url
      }

    } catch (error) {
      console.error('Avatar generation error:', error)

      // 更新任务状态为失败
      await prisma.avatarTask.update({
        where: { id: avatarTaskId },
        data: { 
          status: 'failed',
          error: error instanceof Error ? error.message : 'Unknown error'
        }
      })

      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  }
} 