import { prisma } from '@/lib/prisma'
import { Octokit } from '@octokit/rest'
import type { Prisma, PrismaClient } from '@prisma/client'
import { getGitHubStats } from '@/lib/github'
import { getTwitterStats } from '@/lib/twitter'
import { getJikeStats } from '@/lib/jike'
import OpenAI from 'openai'
import { createSVG } from '@/lib/svg-generator'
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3'
import type { S3ClientConfig } from '@aws-sdk/client-s3'
import type { RetryStrategy } from '@aws-sdk/types'
import { env } from '@/env.mjs'

// Initialize OpenAI client
const openai = new (OpenAI as any)({
  apiKey: process.env.OPENAI_API_KEY || '',
  baseURL: process.env.OPENAI_API_BASE_URL
})

// Initialize S3 client
function getS3Client() {
  if (!process.env.R2_ACCESS_KEY_ID || !process.env.R2_SECRET_KEY) {
    throw new Error('R2 credentials not configured');
  }

  const config: S3ClientConfig = {
    region: 'auto',
    endpoint: 'https://65d778bd01d280395c661484c5e2b681.r2.cloudflarestorage.com',
    credentials: {
      accessKeyId: process.env.R2_ACCESS_KEY_ID,
      secretAccessKey: process.env.R2_SECRET_KEY
    },
    maxAttempts: 5
  };

  return new S3Client(config);
}

interface TaskData {
  platform: 'github' | 'twitter' | 'jike';
  username: string;
  style: 'diss' | 'best diss' | 'appricate' | 'classical';
}

interface Task {
  id: string;
  status: string;
  style: string;
  username: string;
  data: Prisma.JsonValue & TaskData;
  content: string | null;
  error: string | null;
  message: string | null;
  imageUrl: string | null;
  shareUrl: string | null;
  userId: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface PlatformData {
  status: 'ok' | 'processing' | 'failed';
  avatarUrl: string;
  userSlogan: string;
  platform: 'github' | 'twitter' | 'jike';
  userName: string;
  style: 'diss' | 'best diss' | 'appricate' | 'classical';
  lang: 'zh' | 'en';
  topKey: string;
  createDate: string;
  powerBy: string;
  basicStats: {
    follower: number;
    following: number;
    contentCnt: number;
  };
  bestSentence: string;
  heatmapData: {
    title: string;
    dates: string[];
    counts: number[];
    intensity: 'low' | 'medium' | 'high';
    monthlyStats: Array<{
      month: string;
      commits: number;
      topLanguages: string[];
      description: string;
    }>;
    dailyData: {
      dates: string[];
      counts: number[];
    };
  };
  topTags: string[];
  topContents: Array<{
    content: string;
    likeStarCnt: number;
    timestamp: string;
    dissContent: string;
  }>;
  selectedContent: {
    yearHighlights: Array<{
      type: 'commit' | 'repo' | 'contribution';
      content: string;
      timestamp: string;
      significance: string;
    }>;
    mostUsedLanguages: Array<{
      language: string;
      percentage: number;
      context: string;
    }>;
    activityPatterns: {
      mostActiveMonth: string;
      leastActiveMonth: string;
      weekdayPattern: string;
      timePattern: string;
    };
    collaborations: Array<{
      type: 'fork' | 'pr' | 'issue';
      project: string;
      description: string;
    }>;
  };
  FinalDiss: {
    title: string;
    content: string;
  };
  BestWish: string;
  priData: Record<string, any>;
  tokensUsed?: number;
}

interface TaskResult {
  success: boolean;
  error?: string;
  data?: PlatformData;
  summary?: string;
  imageUrl?: string;
  tokensUsed?: number;
}

async function uploadSvgToR2(svg: string, imageId: string): Promise<string> {
  let retryCount = 0;
  const maxRetries = 3;
  const baseDelay = 1000; // 1 second

  while (retryCount <= maxRetries) {
    try {
      if (!process.env.R2_PUBLIC_DOMAIN) {
        throw new Error('R2_PUBLIC_DOMAIN not configured');
      }

      const s3Client = getS3Client();
      const bucketName = process.env.R2_BUCKET_NAME || 'ai-img';
      const randomId = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
      const objectKey = `${randomId}.svg`;

      console.log('Making request to R2:', {
        bucket: bucketName,
        key: objectKey,
        contentType: 'image/svg+xml',
        attempt: retryCount + 1
      });

      const command = new PutObjectCommand({
        Bucket: bucketName,
        Key: objectKey,
        Body: svg,
        ContentType: 'image/svg+xml',
        ACL: 'public-read',
        Metadata: {
          'upload-attempt': String(retryCount + 1),
          'image-id': imageId,
          'timestamp': new Date().toISOString()
        }
      });

      await s3Client.send(command);

      const url = `${process.env.R2_PUBLIC_DOMAIN}/${objectKey}`;
      console.log('Successfully uploaded to R2:', url);
      return url;

    } catch (error) {
      console.error(`R2 upload error (attempt ${retryCount + 1}/${maxRetries + 1}):`, error);
      
      if (retryCount === maxRetries) {
        if (error instanceof Error) {
          throw new Error(`Failed to upload to R2 after ${maxRetries + 1} attempts: ${error.message}`);
        }
        throw new Error(`Failed to upload to R2 after ${maxRetries + 1} attempts: Unknown error`);
      }

      const delay = Math.min(baseDelay * Math.pow(2, retryCount), 5000);
      await new Promise(resolve => setTimeout(resolve, delay));
      retryCount++;
    }
  }

  throw new Error('Unexpected end of upload function');
}

export async function uploadImageToR2(buffer: Buffer, imageId: string, contentType: string): Promise<string> {
  let retryCount = 0;
  const maxRetries = 3;
  const baseDelay = 1000; // 1 second

  while (retryCount <= maxRetries) {
    try {
      if (!process.env.R2_PUBLIC_DOMAIN) {
        throw new Error('R2_PUBLIC_DOMAIN not configured');
      }

      const s3Client = getS3Client();
      const bucketName = process.env.R2_BUCKET_NAME || 'ai-img';
      const randomId = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
      const objectKey = `${imageId}-${randomId}.png`;

      console.log('Making request to R2:', {
        bucket: bucketName,
        key: objectKey,
        contentType,
        attempt: retryCount + 1,
        bufferSize: buffer.length
      });

      const command = new PutObjectCommand({
        Bucket: bucketName,
        Key: objectKey,
        Body: buffer,
        ContentType: contentType,
        ACL: 'public-read',
        Metadata: {
          'upload-attempt': String(retryCount + 1),
          'image-id': imageId,
          'timestamp': new Date().toISOString(),
          'content-length': String(buffer.length)
        }
      });

      await s3Client.send(command);

      const url = `${process.env.R2_PUBLIC_DOMAIN}/${objectKey}`;
      console.log('Successfully uploaded to R2:', url);
      return url;

    } catch (error) {
      console.error(`R2 upload error (attempt ${retryCount + 1}/${maxRetries + 1}):`, {
        error,
        imageId,
        contentType,
        bufferSize: buffer.length,
        timestamp: new Date().toISOString()
      });
      
      if (retryCount === maxRetries) {
        if (error instanceof Error) {
          throw new Error(`Failed to upload to R2 after ${maxRetries + 1} attempts: ${error.message}`);
        }
        throw new Error(`Failed to upload to R2 after ${maxRetries + 1} attempts: Unknown error`);
      }

      const delay = Math.min(baseDelay * Math.pow(2, retryCount), 5000);
      await new Promise(resolve => setTimeout(resolve, delay));
      retryCount++;
    }
  }

  throw new Error('Unexpected end of upload function');
}

// 添加内存缓存
const creditsCache = new Map<string, { amount: number; timestamp: number }>();
const CACHE_TTL = 60 * 1000; // 1分钟缓存

// 添加日志函数
function logOperation(operation: string, details: any) {
  console.log(`[${new Date().toISOString()}] ${operation}:`, JSON.stringify(details, null, 2));
}

async function checkUserCredits(userId: string, tx?: Prisma.TransactionClient): Promise<number> {
  logOperation('CHECK_CREDITS_START', { userId });

  // 检查缓存
  const cached = creditsCache.get(userId);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    logOperation('CHECK_CREDITS_CACHE_HIT', { userId, credits: cached.amount });
    return cached.amount;
  }

  logOperation('CHECK_CREDITS_CACHE_MISS', { userId });

  // 使用传入的事务或直接使用 prisma
  const db = tx || prisma;
  
  // 如果缓存不存在或已过期，查询数据库
  const credits = await db.credits.findUnique({
    where: { userId },
    select: { amount: true }
  });

  logOperation('CHECK_CREDITS_DB_RESULT', { userId, credits });

  // 更新缓存
  if (!tx) { // 只在非事务中更新缓存
    creditsCache.set(userId, {
      amount: credits?.amount || 0,
      timestamp: Date.now()
    });
  }

  return credits?.amount || 0;
}

async function updateUserCredits(userId: string, amount: number, tx?: Prisma.TransactionClient): Promise<void> {
  logOperation('UPDATE_CREDITS_START', { userId, amount });

  // 使用传入的事务或直接使用 prisma
  const db = tx || prisma;

  await db.credits.upsert({
    where: { userId },
    update: { amount },
    create: { userId, amount }
  });

  logOperation('UPDATE_CREDITS_COMPLETE', { userId, newAmount: amount });

  // 只在非事务中更新缓存
  if (!tx) {
    creditsCache.set(userId, {
      amount,
      timestamp: Date.now()
    });
  }
}

// 事务配置
const TRANSACTION_TIMEOUT = 60000;    // 事务超时时间60秒
const TRANSACTION_MAX_WAIT = 30000;   // 事务最大等待时间30秒

export class GenerationService {
  private async generateAllContent(data: PlatformData, topContents: Array<{ content: string; likeStarCnt: number; timestamp: string }>): Promise<{
    dissContents: string[];
    topKey: string;
    topTags: string[];
    bestSentence: string;
    finalDiss: { title: string; content: string };
    bestWish: string;
    tokens: number;
  }> {
    let stylePrompt = '';
    if (data.style === 'diss') {
      stylePrompt = `
        请以幽默讽刺的风格生成内容：
        1. 针对热门内容的评论要尖锐有趣，突出用户的特点和行为中的矛盾之处
        2. 年度关键词要带有调侃意味
        3. 年度标签要突出用户的特征，可以适当夸张
        4. 年度金句要机智幽默，可以用反讽的方式
        5. 年度总结要用轻松调侃的语气指出用户的特点
        6. 新年祝福要在温暖中带着一丝调侃
      `;
    } else if (data.style === 'best diss') {
      stylePrompt = `
        请以犀利讽刺的风格生成内容：
        1. 针对热门内容的评论要一针见血，直指核心问题，但要保持幽默感
        2. 年度关键词要突出用户最显著的特点，可以用反讽的方式
        3. 年度标签要大胆直接，突出用户的行为特征
        4. 年度金句要辛辣有趣，让人印象深刻
        5. 年度总结要用巧妙的方式揭示用户的特点，可以用夸张的手法
        6. 新年祝福要在温暖中带着明显的调侃意味
      `;
    } else if (data.style === 'classical') {
      stylePrompt = `
        请以文言文的风格生成内容，要求：
        1. 针对热门内容的评论要用典雅的文言文，模仿古代评书批注的风格
        2. 年度关键词要用文言文概括，如"好事者"、"闲云野鹤"之类
        3. 年度标签要用文言词汇，如"耕读传家"、"诗酒自适"等
        4. 年度金句要模仿古语格式，如"子曰"、"诗曰"等开头
        5. 年度总结要用文言文格式，标题如"某某传"，内容要模仿史书笔法
        6. 新年祝福要用古风雅韵，如"愿君"、"祝君"等开头

        注意：
        - 所有内容都要用文言文表达，但要让现代人基本能看懂
        - 可以适当引用古诗文，但要契合用户特点
        - 保持文言文的简洁凝练特点
      `;
    } else {
      stylePrompt = `
        请以温暖正能量的风格生成内容：
        1. 针对热门内容的评论要充满鼓励和赞赏，突出用户的进步和努力
        2. 年度关键词要体现用户的积极特质
        3. 年度标签要突出用户的成就和潜力
        4. 年度金句要富有激励性，传递正能量
        5. 年度总结要用温暖的语气肯定用户的贡献和成长
        6. 新年祝福要充满希望和鼓励
      `;
    }

    const prompt = `
      请根据以下用户数据，生成一系列内容。

      基础数据：
      - 平台：${data.platform}
      - 用户名：${data.userName}
      - 用户头像：${data.avatarUrl}
      - 用户slogan：${data.userSlogan}
      - 内容数：${data.basicStats.contentCnt}
      - 关注者：${data.basicStats.follower}
      - 关注中：${data.basicStats.following}

      活跃数据：
      月度统计：${JSON.stringify(data.heatmapData.monthlyStats, null, 2)}

      热门内容：
      ${topContents.map((c, i) => `内容${i + 1}：${c.content}`).join('\n')}

      精选内容：
      ${JSON.stringify(data.selectedContent, null, 2)}

      私密数据：
      ${JSON.stringify(data.priData, null, 2)}

      ${stylePrompt}

      请生成以下内容，并以JSON格式返回：
      1. 针对每条热门内容的评论（每条30字以内）
      2. 一个年度关键词（简短有力，能概括用户特点）
      3. 5个年度标签（多样化，覆盖不同维度，简短即可）
      4. 一句年度金句（可以是改编或新句子，简短有力，30字以内）
      5. 年度总结（包含标题和内容，50字以内）
      6. 一句新年祝福（30字以内）

      返回格式：
      {
        "dissContents": ["针对内容1的评论", "针对内容2的评论", ...],
        "topKey": "年度关键词",
        "topTags": ["标签1", "标签2", "标签3", "标签4", "标签5"],
        "bestSentence": "年度金句",
        "FinalDiss": {
          "title": "总结标题",
          "content": "总结内容"
        },
        "BestWish": "新年祝福"
      }
    `;

    const completion = await openai.chat.completions.create({
      model: process.env.OPENAI_API_MODEL,
      messages: [{ role: "user", content: prompt }],
      temperature: 0.8,
      max_tokens: 1000
    });

    const result = JSON.parse(completion.choices[0].message?.content || "{}");
    const tokens = completion.usage?.total_tokens || 0;

    return {
      dissContents: result.dissContents || topContents.map(() => ""),
      topKey: result.topKey || "",
      topTags: result.topTags || [],
      bestSentence: result.bestSentence || "",
      finalDiss: result.FinalDiss || { title: "", content: "" },
      bestWish: result.BestWish || "",
      tokens
    };
  }

  private async generateImage(data: PlatformData): Promise<string> {
    // Calculate total contributions from daily data
    const totalContributions = data.heatmapData.dailyData.counts.reduce((sum, count) => sum + count, 0)
    
    // Get other stats
    const repositories = data.selectedContent.yearHighlights
      .filter(h => h.type === 'repo').length
    const stars = data.topContents.reduce((sum, content) => sum + content.likeStarCnt, 0)
    
    // Get languages from selectedContent
    const languages = data.selectedContent.mostUsedLanguages.reduce((acc, lang) => {
      acc[lang.language] = lang.percentage
      return acc
    }, {} as Record<string, number>)

    // Define theme based on style
    let theme = {
      background: '#FAFAFA',
      textColor: '#333333',
      lineColor: '#E0E0E0',
      fontSize: {
        large: '32px',
        medium: '24px',
        small: '16px'
      }
    };

    // Adjust theme based on style
    if (data.style === 'diss' || data.style === 'best diss') {
      theme = {
        ...theme,
        background: '#FFE4E1', // Misty Rose
        textColor: '#8B0000', // Dark Red
        lineColor: '#FF6B6B' // Light Red
      };
    } else if (data.style === 'classical') {
      theme = {
        ...theme,
        background: '#F5F5F5', // Light Gray
        textColor: '#2F4F4F', // Dark Slate Gray
        lineColor: '#696969' // Dim Gray
      };
    } else {
      // For 'appricate' style, keep the warm theme
      theme = {
        ...theme,
        background: '#FFF8DC', // Cornsilk
        textColor: '#4A4A4A', // Dark Gray
        lineColor: '#DEB887' // Burlywood
      };
    }

    // Generate SVG using only daily data for the heatmap
    const svg = createSVG({
      stats: {
        contributions: totalContributions,
        repositories,
        stars,
        languages,
        commitsByMonth: data.heatmapData.dailyData.counts,
        dailyData: data.heatmapData.dailyData
      },
      style: 'note',
      content: '',
      imageId: data.userName,
      userData: {
        avatarUrl: data.avatarUrl,
        userName: data.userName,
        topKey: data.topKey,
        createDate: '2024',
        powerBy: 'AI DISS x GITHUB',
        bestSentence: data.bestSentence,
        topTags: data.topTags,
        topContents: data.topContents.map(content => ({
          ...content,
          content: content.content.length > 20 ? content.content.substring(0, 20) + '...' : content.content
        })),
        finalDiss: data.FinalDiss,
        bestWish: data.BestWish,
        priData: data.priData
      },
      theme
    })

    // Upload SVG to R2 and get the URL
    const imageUrl = await uploadSvgToR2(svg, '');
    return imageUrl;
  }

  async processTask(taskId: string) {
    logOperation('PROCESS_TASK_START', { taskId });

    try {
      // 使用单个事务处理所有数据库操作
      return await prisma.$transaction(async (tx) => {
        // 使用单个查询获取所有需要的数据
        const task = await tx.task.findUnique({
          where: { id: taskId },
          select: {
            id: true,
            status: true,
            style: true,
            username: true,
            data: true,
            userId: true
          }
        });

        logOperation('TASK_FETCH_RESULT', { 
          taskId,
          taskFound: !!task,
          userId: task?.userId,
          style: task?.style
        });

        const taskData = task?.data as TaskData | undefined;
        if (!task || !taskData?.platform || !task.username || !task.style) {
          logOperation('TASK_VALIDATION_FAILED', { 
            taskId,
            hasPlatform: !!taskData?.platform,
            hasUsername: !!task?.username,
            hasStyle: !!task?.style
          });
          throw new Error('Task not found or invalid');
        }

        // 如果有 userId，检查和更新积分
        if (task.userId) {
          logOperation('CREDITS_CHECK_START', { taskId, userId: task.userId });

          const credits = await checkUserCredits(task.userId, tx);
          const requiredCredits = task.style === 'diss' ? 5 : 8;
          
          logOperation('CREDITS_STATUS', { 
            taskId,
            userId: task.userId,
            currentCredits: credits,
            requiredCredits,
            sufficient: credits >= requiredCredits
          });

          if (credits < requiredCredits) {
            throw new Error('Insufficient credits');
          }

          // 扣除积分
          await updateUserCredits(task.userId, credits - requiredCredits, tx);
        }

        // 更新任务状态
        await tx.task.update({
          where: { id: taskId },
          data: { message: '正在获取数据...' }
        });

        // 1. 获取平台数据
        logOperation('FETCH_PLATFORM_DATA_START', { 
          taskId, 
          platform: taskData.platform,
          username: task.username 
        });

        let rawData;
        if (taskData.platform === "github") {
          rawData = await getGitHubStats(task.username, process.env.GITHUB_TOKEN, {
            style: task.style as 'diss' | 'best diss' | 'appricate',
            lang: 'zh'
          });
        } else if (taskData.platform === "twitter") {
          rawData = await getTwitterStats(task.username);
        } else if (taskData.platform === "jike") {
          rawData = await getJikeStats(task.username);
        } else {
          logOperation('UNSUPPORTED_PLATFORM', { taskId, platform: taskData.platform });
          throw new Error('Unsupported platform');
        }

        logOperation('FETCH_PLATFORM_DATA_COMPLETE', { 
          taskId, 
          dataStatus: rawData?.status,
          hasData: !!rawData
        });

        if (!rawData || rawData.status !== 'ok') {
          await tx.task.update({
            where: { id: taskId },
            data: { 
              status: 'failed',
              error: `${taskData.platform} data not ready yet, please wait for backend service to fetch data`
            }
          });
          throw new Error(`${taskData.platform} data not ready yet`);
        }

        // 2. 生成内容
        const { dissContents, topKey, topTags, bestSentence, finalDiss, bestWish, tokens } = await this.generateAllContent(
          rawData as unknown as PlatformData,
          rawData.topContents
        );

        // 3. 组装平台数据
        const platformData: PlatformData = {
          status: rawData.status,
          avatarUrl: rawData.avatarUrl,
          userSlogan: rawData.userSlogan,
          platform: rawData.platform,
          userName: rawData.userName,
          style: rawData.style,
          lang: rawData.lang,
          topKey,
          createDate: rawData.createDate,
          powerBy: rawData.powerBy,
          basicStats: rawData.basicStats,
          bestSentence,
          topTags,
          FinalDiss: finalDiss,
          BestWish: bestWish,
          tokensUsed: tokens,
          selectedContent: {
            yearHighlights: [],
            mostUsedLanguages: [],
            activityPatterns: {
              mostActiveMonth: '',
              leastActiveMonth: '',
              weekdayPattern: '',
              timePattern: ''
            },
            collaborations: []
          },
          heatmapData: {
            title: rawData.heatmapData.title,
            dates: rawData.heatmapData.dates,
            counts: rawData.heatmapData.counts,
            intensity: rawData.heatmapData.intensity,
            monthlyStats: rawData.heatmapData.dates.reduce((acc: Array<{
              month: string;
              commits: number;
              topLanguages: string[];
              description: string;
            }>, date: string) => {
              const month = date.substring(0, 7);
              const monthData = acc.find(m => m.month === month);
              if (monthData) {
                monthData.commits += 1;
              } else {
                acc.push({
                  month,
                  commits: 1,
                  topLanguages: [],
                  description: taskData.platform === 'twitter' ? '发推文频率分析' : 
                             taskData.platform === 'jike' ? '发帖频率分析' : 
                             '贡献频率分析'
                });
              }
              return acc;
            }, []),
            dailyData: {
              dates: rawData.heatmapData.dates,
              counts: rawData.heatmapData.counts
            }
          },
          topContents: rawData.topContents.map((content, index) => ({
            ...content,
            dissContent: dissContents[index] || ''
          })),
          priData: rawData.priData
        };

        // 4. 生成图片
        await tx.task.update({
          where: { id: taskId },
          data: { message: '正在生成图片...' }
        });

        const imageUrl = await this.generateImage(platformData);

        // 5. 更新任务状态
        await tx.task.update({
          where: { id: taskId },
          data: {
            status: 'completed',
            message: '生成完成',
            data: platformData as unknown as Prisma.InputJsonValue,
            imageUrl
          }
        });

        return {
          success: true,
          data: platformData,
          tokensUsed: platformData.tokensUsed || 0,
          imageUrl,
        };
      }, {
        maxWait: TRANSACTION_MAX_WAIT,
        timeout: TRANSACTION_TIMEOUT
      });

    } catch (error) {
      logOperation('TASK_PROCESSING_ERROR', {
        taskId,
        error: error instanceof Error ? error.message : 'Unknown error',
        errorStack: error instanceof Error ? error.stack : undefined
      });

      // 更新任务状态为失败
      await prisma.task.update({
        where: { id: taskId },
        data: {
          status: 'failed',
          error: error instanceof Error ? error.message : 'Unknown error',
          message: '生成失败',
        },
      });

      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }
}

// Export only the uploadSvgToR2 function for testing
export { uploadSvgToR2 }
