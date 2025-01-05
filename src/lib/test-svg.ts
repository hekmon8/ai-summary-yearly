import { mockGithubData } from './mock/github-data'
import { createSVG } from './svg-generator'
import fs from 'fs'
import path from 'path'
import { exec } from 'child_process'
import { promisify } from 'util'
import { fileURLToPath } from 'url'

const execAsync = promisify(exec)
const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

interface MonthStat {
  month: string
  commits: number
  topLanguages: string[]
  description: string
}

interface LanguageStat {
  language: string
  percentage: number
}

async function generateTestSVG() {
  const data = mockGithubData
  
  // Convert monthly stats to commits array
  const commitsByMonth = data.heatmapData.monthlyStats.map((stat: MonthStat) => stat.commits)
  
  // Calculate total stats
  const totalContributions = commitsByMonth.reduce((sum: number, count: number) => sum + count, 0)
  const repositories = data.selectedContent.yearHighlights
    .filter((h: { type: string }) => h.type === 'repo').length
  const stars = data.topContents.reduce((sum: number, content: { likeStarCnt: number }) => sum + content.likeStarCnt, 0)
  
  // Get languages from selectedContent
  const languages = data.selectedContent.mostUsedLanguages.reduce((acc: Record<string, number>, lang: LanguageStat) => {
    acc[lang.language] = lang.percentage
    return acc
  }, {} as Record<string, number>)

  // Generate SVG
  const svg = createSVG({
    stats: {
      contributions: totalContributions,
      repositories,
      stars,
      languages,
      commitsByMonth,
      dailyData: data.heatmapData.dailyData
    },
    style: 'note',
    content: '', // No longer needed as we're using structured data
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
    theme: {
      background: '#FAFAFA',
      textColor: '#333333',
      lineColor: '#E0E0E0',
      fontSize: {
        large: '32px',
        medium: '24px',
        small: '16px'
      }
    }
  })

  // Save SVG file
  const svgPath = path.join(__dirname, '../../public/test.svg')
  fs.writeFileSync(svgPath, svg)
  console.log('SVG saved to:', svgPath)

  // Convert to PNG using Inkscape (if available)
  try {
    const pngPath = path.join(__dirname, '../../public/test.png')
    await execAsync(`inkscape --export-type=png --export-filename=${pngPath} ${svgPath}`)
    console.log('PNG saved to:', pngPath)
  } catch (error) {
    console.error('Failed to convert to PNG. Make sure Inkscape is installed:', error)
  }
}

// Run the test
generateTestSVG().catch(console.error)
