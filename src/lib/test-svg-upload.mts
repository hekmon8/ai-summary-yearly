import { createSVG } from './svg-generator'
import { uploadSvgToR2 } from './generation'
import { config } from 'dotenv'
import path from 'path'
import { fileURLToPath } from 'url'
import fs from 'fs'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const rootDir = path.resolve(__dirname, '../../')

// 加载环境变量
const envPath = path.resolve(rootDir, '.env')
if (!fs.existsSync(envPath)) {
  console.error('Error: .env file not found at', envPath)
  process.exit(1)
}

const result = config({ path: envPath, override: true })
if (result.error) {
  console.error('Failed to load .env file:', result.error)
  process.exit(1)
}

// 检查必要的环境变量
const requiredEnvVars = {
  R2_ACCESS_KEY_ID: process.env.R2_ACCESS_KEY_ID,
  R2_SECRET_KEY: process.env.R2_SECRET_KEY
}

console.log('Environment variables:', {
  R2_ACCESS_KEY_ID: process.env.R2_ACCESS_KEY_ID ? '***' : undefined,
  R2_SECRET_KEY: process.env.R2_SECRET_KEY ? '***' : undefined
})

const missingEnvVars = Object.entries(requiredEnvVars)
  .filter(([, value]) => !value)
  .map(([key]) => key)

if (missingEnvVars.length > 0) {
  console.error('Missing required environment variables:', missingEnvVars.join(', '))
  process.exit(1)
}

async function main() {
  try {
    // 生成测试 SVG
    console.log('Generating test SVG...')
    const svg = createSVG({
      stats: {
        contributions: 1000,
        repositories: 10,
        stars: 100,
        languages: {
          TypeScript: 60,
          JavaScript: 30,
          Python: 10
        },
        commitsByMonth: [10, 20, 30, 40, 50, 60, 70, 80, 90, 100, 110, 120],
        dailyData: {
          dates: Array.from({ length: 365 }, (_, i) => {
            const date = new Date();
            date.setDate(date.getDate() - (364 - i));
            return date.toISOString().split('T')[0];
          }),
          counts: Array.from({ length: 365 }, () => Math.floor(Math.random() * 5))
        }
      },
      style: 'diss',
      content: 'Test SVG Upload\nThis is a test SVG for R2 upload\n\nBest wishes!',
      imageId: 'test-user',
      userData: {
        avatarUrl: 'https://github.com/identicons/test-user.png',
        userName: 'test-user',
        topKey: 'Testing',
        createDate: new Date().toISOString().split('T')[0],
        powerBy: 'AI DISS x GITHUB',
        bestSentence: 'This is a test sentence',
        topTags: ['test', 'demo', 'example'],
        topContents: [
          {
            content: 'Test content 1',
            likeStarCnt: 10,
            dissContent: 'Test diss 1'
          }
        ],
        finalDiss: {
          title: 'Final Thoughts',
          content: 'This is a test diss'
        },
        bestWish: 'Best wishes for testing!',
        priData: {}
      },
      theme: {
        background: '#0d1117',
        textColor: '#c9d1d9',
        lineColor: '#30363d',
        fontSize: {
          large: '24px',
          medium: '16px',
          small: '12px'
        }
      }
    })
    console.log('SVG generated successfully')

    // 上传到 R2
    console.log('Uploading SVG to R2...')
    const imageUrl = await uploadSvgToR2(svg, `test-${Date.now()}`)
    console.log('Upload successful!')
    console.log('Image URL:', imageUrl)
  } catch (error) {
    console.error('Operation failed:', error instanceof Error ? {
      name: error.name,
      message: error.message,
      stack: error.stack
    } : error)
    process.exit(1)
  }
}

console.log('Starting test...')
await main() 