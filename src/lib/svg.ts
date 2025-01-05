const QRCode = require('qrcode')

interface SVGOptions {
  stats: {
    contributions: number
    repositories: number
    stars: number
    languages: Record<string, number>
    commitsByMonth: number[]
  }
  style: string
  content: string
  imageId: string
}

export async function createSVG(options: SVGOptions): Promise<string> {
  const { stats, style, content, imageId } = options
  
  // Generate tracking URL and QR code
  const trackingUrl = `${process.env.NEXT_PUBLIC_APP_URL}/share/${imageId}`
  const qrCodeDataUrl = await QRCode.toDataURL(trackingUrl, {
    width: 100,
    margin: 1,
    color: {
      dark: '#FFFFFF',
      light: '#00000000'
    }
  })
  const qrCodeBase64 = qrCodeDataUrl.split(',')[1]

  // Generate SVG elements
  const svg = `
    <svg width="1200" height="630" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink">
      <!-- Background -->
      <defs>
        <linearGradient id="grad1" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" style="stop-color:#1a1b1e;stop-opacity:1" />
          <stop offset="100%" style="stop-color:#2d2e32;stop-opacity:1" />
        </linearGradient>
        <filter id="glow">
          <feGaussianBlur stdDeviation="2" result="coloredBlur"/>
          <feMerge>
            <feMergeNode in="coloredBlur"/>
            <feMergeNode in="SourceGraphic"/>
          </feMerge>
        </filter>
      </defs>
      <rect width="100%" height="100%" fill="url(#grad1)"/>
      
      <!-- Stats Section -->
      <g transform="translate(50, 50)">
        ${generateStatsSection(stats)}
      </g>
      
      <!-- Contribution Graph -->
      <g transform="translate(50, 180)">
        ${generateContributionGraph(stats.commitsByMonth)}
      </g>
      
      <!-- Language Stats -->
      <g transform="translate(50, 340)">
        ${generateLanguageStats(stats.languages)}
      </g>
      
      <!-- Content Section -->
      <g transform="translate(50, 460)">
        ${generateTextContent(content)}
      </g>
      
      <!-- Decorative Elements -->
      ${generateDecorations(style)}

      <!-- QR Code -->
      <g transform="translate(1050, 480)">
        <image
          href="data:image/png;base64,${qrCodeBase64}"
          width="100"
          height="100"
        />
        <text
          x="50"
          y="120"
          fill="#666"
          font-size="12"
          text-anchor="middle"
        >
          扫码查看更多
        </text>
      </g>
    </svg>
  `

  return svg.trim()
}

function generateStatsSection(stats: SVGOptions['stats']): string {
  return `
    <g class="stats" filter="url(#glow)">
      <text x="0" y="0" fill="#8BE9FD" font-size="24" font-weight="bold">
        ${stats.contributions} contributions
      </text>
      <text x="300" y="0" fill="#FF79C6" font-size="24" font-weight="bold">
        ${stats.repositories} repositories
      </text>
      <text x="600" y="0" fill="#50FA7B" font-size="24" font-weight="bold">
        ${stats.stars} stars
      </text>
    </g>
  `
}

function generateContributionGraph(commits: number[]): string {
  const maxCommits = Math.max(...commits)
  const width = 1000
  const height = 100
  const barWidth = width / commits.length - 4

  return `
    <g class="contribution-graph">
      <text x="0" y="-10" fill="#BD93F9" font-size="16">Contributions</text>
      ${commits.map((count, i) => {
        const barHeight = (count / maxCommits) * height
        const x = i * (barWidth + 4)
        const y = height - barHeight
        const opacity = 0.3 + (count / maxCommits) * 0.7
        return `
          <rect
            x="${x}"
            y="${y}"
            width="${barWidth}"
            height="${barHeight}"
            fill="#BD93F9"
            opacity="${opacity}"
          >
            <title>${count} contributions</title>
          </rect>
        `
      }).join('')}
    </g>
  `
}

function generateLanguageStats(languages: Record<string, number>): string {
  const total = Object.values(languages).reduce((sum, val) => sum + val, 0)
  let currentX = 0
  
  return `
    <g class="language-stats">
      <text x="0" y="-10" fill="#FFB86C" font-size="16">Languages</text>
      ${Object.entries(languages).map(([lang, percentage]) => {
        const width = (percentage / total) * 1000
        const x = currentX
        currentX += width
        return `
          <g>
            <rect
              x="${x}"
              y="0"
              width="${width}"
              height="30"
              fill="#FFB86C"
              opacity="${0.3 + (percentage / total) * 0.7}"
            />
            <text
              x="${x + width/2}"
              y="20"
              fill="#FFB86C"
              font-size="12"
              text-anchor="middle"
            >
              ${lang} (${percentage.toFixed(1)}%)
            </text>
          </g>
        `
      }).join('')}
    </g>
  `
}

function generateTextContent(content: string): string {
  const lines = content.split('\n').filter(line => line.trim())
  return `
    <g class="content">
      ${lines.map((line, i) => `
        <text
          x="0"
          y="${i * 30}"
          fill="#F8F8F2"
          font-size="${i === 0 ? '24' : '16'}"
          font-weight="${i === 0 ? 'bold' : 'normal'}"
        >
          ${line}
        </text>
      `).join('')}
    </g>
  `
}

function generateDecorations(style: string): string {
  // Add decorative elements based on style
  const decorations = []
  
  if (style === 'diss') {
    decorations.push(`
      <circle cx="1150" cy="50" r="20" fill="#FF5555" opacity="0.3" />
      <circle cx="1100" cy="80" r="15" fill="#FF79C6" opacity="0.2" />
      <circle cx="1130" cy="100" r="10" fill="#BD93F9" opacity="0.2" />
    `)
  } else if (style === 'best diss') {
    decorations.push(`
      <path d="M1100,30 L1150,80 M1100,80 L1150,30" stroke="#FF5555" stroke-width="2" opacity="0.3" />
      <path d="M1120,50 L1170,100 M1120,100 L1170,50" stroke="#FF79C6" stroke-width="2" opacity="0.2" />
    `)
  } else {
    decorations.push(`
      <circle cx="1150" cy="50" r="20" fill="#50FA7B" opacity="0.3" />
      <circle cx="1100" cy="80" r="15" fill="#8BE9FD" opacity="0.2" />
      <circle cx="1130" cy="100" r="10" fill="#F1FA8C" opacity="0.2" />
    `)
  }
  
  return decorations.join('')
} 