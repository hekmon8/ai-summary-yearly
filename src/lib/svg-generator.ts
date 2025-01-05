interface SVGStats {
  contributions: number;
  repositories: number;
  stars: number;
  languages: Record<string, number>;
  commitsByMonth: number[];
  dailyData: {
    dates: string[];
    counts: number[];
  };
}

interface SVGUserData {
  avatarUrl: string;
  userName: string;
  topKey: string;
  createDate: string;
  powerBy: string;
  bestSentence: string;
  topTags: string[];
  topContents: Array<{
    content: string;
    likeStarCnt: number;
    dissContent: string;
  }>;
  finalDiss: {
    title: string;
    content: string;
  };
  bestWish: string;
  priData: Record<string, any>;
}

interface SVGTheme {
  background: string;
  textColor: string;
  lineColor: string;
  fontSize: {
    large: string;
    medium: string;
    small: string;
  };
}

interface SVGOptions {
  stats: SVGStats;
  style: string;
  content: string;
  imageId: string;
  userData: SVGUserData;
  theme: SVGTheme;
}

// Define color palette for GitHub dark theme
const colors = {
  primary: '#58a6ff',
  secondary: '#1f6feb',
  accent: '#238636',
  gradient: {
    start: '#0d1117',
    end: '#161b22',
    secondary: {
      start: '#21262d',
      end: '#30363d'
    }
  },
  text: {
    primary: '#c9d1d9',
    secondary: '#8b949e',
    light: '#6e7681'
  },
  tag: {
    bg: ['#21262d', '#21262d', '#21262d', '#21262d', '#21262d'],
    glow: ['#58a6ff', '#1f6feb', '#238636', '#58a6ff', '#1f6feb']
  },
  heatmap: {
    empty: '#161b22',
    levels: [
      '#0e4429', // Level 1 (lowest)
      '#006d32', // Level 2
      '#26a641', // Level 3
      '#39d353'  // Level 4 (highest)
    ],
    glow: 'rgba(63, 185, 80, 0.3)'
  }
};

// Define decorative elements
const decorations = {
  corner: `
    <path d="M 0 0 L 150 0 L 150 30 Q 140 30 140 40 L 140 150 Q 140 160 130 160 L 30 160 Q 20 160 20 150 L 20 30 Q 20 20 10 20 L 0 20 Z" 
          fill="url(#headerGradient)" opacity="0.15"/>
    <path d="M 0 0 L 100 0 L 100 20 Q 90 20 90 30 L 90 100 Q 90 110 80 110 L 20 110 Q 10 110 10 100 L 10 20 Q 10 10 0 10 Z" 
          fill="url(#headerGradient)" opacity="0.3"/>
  `,
  divider: (x1: number, y1: number, x2: number, y2: number) => `
    <path d="M ${x1} ${y1} C ${(x1+x2)/2-50} ${y1-5}, ${(x1+x2)/2+50} ${y1+5}, ${x2} ${y1}"
          stroke="${colors.accent}" stroke-width="2" stroke-dasharray="1 3" fill="none"/>
    <circle cx="${(x1+x2)/2}" cy="${y1}" r="4" fill="${colors.accent}"/>
    <circle cx="${(x1+x2)/2}" cy="${y1}" r="2" fill="${colors.gradient.start}"/>
  `
};

function generateHeatmap(data: { dates: string[]; counts: number[] }): string {
  const cellSize = 12;
  const gap = 2;
  const rows = 7;
  const weeksInYear = 53;
  const cols = weeksInYear;
  const totalDays = cols * rows;
  const maxCount = Math.max(...data.counts);
  const totalWidth = cols * (cellSize + gap) - gap;
  const leftPadding = 30; // Space for day labels
  
  let heatmapSvg = '';

  // Day labels (only show Mon, Wed)
  const days = ['', 'M', '', 'W', '', '', ''];
  days.forEach((day, i) => {
      heatmapSvg += `
        <text x="${-leftPadding/2}" y="${i * (cellSize + gap) + cellSize/2}" 
              fill="${colors.text.secondary}" 
              font-size="8px"
              text-anchor="end"
              dominant-baseline="middle">${day}</text>
      `;
  });

  // Month labels aligned with weeks
  const monthPositions = [0, 4, 8, 13, 17, 22, 26, 30, 35, 39, 43, 48];
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  
  months.forEach((month, i) => {
    const weekX = monthPositions[i] * (cellSize + gap);
    heatmapSvg += `
      <text x="${weekX}" y="-8" 
            fill="${colors.text.secondary}" 
            font-size="8px"
            text-anchor="start">${month}</text>
    `;
  });

  // Create all cells (both background and activity) in one pass
  for (let col = 0; col < cols; col++) {
    for (let row = 0; row < rows; row++) {
      const weekOffset = col * 7;
      const dayIndex = weekOffset + row;
      const count = dayIndex < data.counts.length ? (data.counts[dayIndex] || 0) : 0;
      const x = col * (cellSize + gap);
      const y = row * (cellSize + gap);
      const intensity = count / maxCount;
      const getColorLevel = (intensity: number) => {
        if (intensity === 0) return colors.heatmap.empty;
        if (intensity <= 0.15) return colors.heatmap.levels[0];
        if (intensity <= 0.35) return colors.heatmap.levels[1];
        if (intensity <= 0.65) return colors.heatmap.levels[2];
        return colors.heatmap.levels[3];
      };
      const cellColor = getColorLevel(intensity);
      
      heatmapSvg += `
        <rect x="${x}" y="${y}" width="${cellSize}" height="${cellSize}" 
              fill="${cellColor}" 
              rx="2"/>
      `;
    }
  }
  
  return `
    <g transform="translate(${-totalWidth/2 + leftPadding}, 0)">
      ${heatmapSvg}
    </g>
  `;
}

export function createSVG(options: SVGOptions): string {
  const {
    stats,
    userData,
    theme
  } = options;

  const width = 800;
  const height = width / 3 * 4 + 350;
  const padding = 40;

  // Define gradients and patterns
  const defs = `
    <linearGradient id="headerGradient" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" style="stop-color:${colors.gradient.start};stop-opacity:1" />
      <stop offset="100%" style="stop-color:${colors.gradient.end};stop-opacity:1" />
    </linearGradient>

    <linearGradient id="secondaryGradient" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" style="stop-color:${colors.gradient.secondary.start};stop-opacity:1" />
      <stop offset="100%" style="stop-color:${colors.gradient.secondary.end};stop-opacity:1" />
    </linearGradient>

    <linearGradient id="bgGradient" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:${colors.gradient.start};stop-opacity:1" />
      <stop offset="100%" style="stop-color:${colors.gradient.end};stop-opacity:1" />
    </linearGradient>

    <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
      <path d="M 40 0 L 0 0 0 40" fill="none" stroke="${colors.text.light}" stroke-width="0.5" stroke-dasharray="4 4"/>
    </pattern>

    <filter id="paper-shadow">
      <feDropShadow dx="2" dy="2" stdDeviation="3" flood-opacity="0.3"/>
    </filter>

    <filter id="soft-shadow">
      <feGaussianBlur in="SourceAlpha" stdDeviation="1"/>
      <feOffset dx="0" dy="1" result="offsetblur"/>
      <feComponentTransfer>
        <feFuncA type="linear" slope="0.2"/>
      </feComponentTransfer>
      <feMerge> 
        <feMergeNode/>
        <feMergeNode in="SourceGraphic"/> 
      </feMerge>
    </filter>

    <filter id="glow">
      <feGaussianBlur in="SourceAlpha" stdDeviation="3"/>
      <feOffset dx="0" dy="0" result="offsetblur"/>
      <feFlood flood-color="${colors.primary}" flood-opacity="0.7"/>
      <feComposite in2="offsetblur" operator="in"/>
      <feMerge>
        <feMergeNode/>
        <feMergeNode in="SourceGraphic"/>
      </feMerge>
    </filter>

    <pattern id="dots" width="20" height="20" patternUnits="userSpaceOnUse">
      <circle cx="2" cy="2" r="1" fill="${colors.text.light}"/>
    </pattern>
  `;

  // Create SVG content
  return `
    <svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
      <defs>
        ${defs}
        <style>
          @import url('https://fonts.googleapis.com/css2?family=Noto+Sans+SC:wght@400;700&amp;display=swap');
          text { font-family: 'Noto Sans SC', sans-serif; }
          .section-title { font-weight: 500; letter-spacing: 1px; }
          .highlight-text { font-weight: bold; letter-spacing: 0.5px; }
          .stat-value { font-weight: bold; font-size: 1.2em; }
        </style>
      </defs>
      
      <!-- Background with enhanced visual effects -->
      <rect width="100%" height="100%" fill="${colors.gradient.start}"/>
      <rect width="100%" height="100%" fill="url(#grid)" opacity="0.1"/>
      <rect width="100%" height="100%" fill="url(#dots)" opacity="0.1"/>
      
      <!-- Enhanced background year decoration -->
      <g transform="translate(${width/2}, ${height/2}) rotate(-15)">
        <!-- Background glow effect -->
        <defs>
          <filter id="year-glow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur in="SourceGraphic" stdDeviation="5"/>
            <feComponentTransfer>
              <feFuncA type="linear" slope="0.3"/>
            </feComponentTransfer>
          </filter>
        </defs>

        <!-- Main year text with enhanced styling -->
        <text x="0" y="0" 
              text-anchor="middle"
              font-family="monospace"
              font-size="280"
              font-weight="900"
              fill="${colors.text.primary}"
              opacity="0.03"
              style="letter-spacing: -10px;">
          2024
          <animate attributeName="opacity"
                   values="0.02;0.04;0.02"
                   dur="3s"
                   repeatCount="indefinite"/>
        </text>

        <!-- Decorative elements around the year -->
        <g opacity="0.02">
          <circle cx="0" cy="0" r="200" 
                  fill="none" 
                  stroke="${colors.text.primary}" 
                  stroke-width="0.5"
                  stroke-dasharray="4 4">
            <animate attributeName="r"
                     values="200;220;200"
                     dur="4s"
                     repeatCount="indefinite"/>
          </circle>
        </g>
      </g>
      
      <!-- Decorative keywords with better positioning -->
      <g transform="translate(${width/4}, ${height/3}) rotate(-10)" opacity="0.05">
        <text x="0" y="0"
              font-family="monospace"
              font-size="50"
              font-weight="bold"
              fill="${colors.text.secondary}"
              style="letter-spacing: 2px;">
          CODING
          <animate attributeName="opacity"
                   values="0.03;0.08;0.03"
                   dur="4s"
                   repeatCount="indefinite"/>
        </text>
      </g>
      <g transform="translate(${width*3/4}, ${height*2/3}) rotate(-10)" opacity="0.05">
        <text x="0" y="0"
              font-family="monospace"
              font-size="50"
              font-weight="bold"
              fill="${colors.text.secondary}"
              style="letter-spacing: 2px;">
          MASTER
          <animate attributeName="opacity"
                   values="0.03;0.08;0.03"
                   dur="5s"
                   repeatCount="indefinite"/>
        </text>
      </g>
      
      <!-- Background decorative shapes -->
      <circle cx="100" cy="100" r="150" fill="url(#headerGradient)" opacity="0.05"/>
      <circle cx="${width-100}" cy="${height-100}" r="150" fill="url(#secondaryGradient)" opacity="0.05"/>
      
      <!-- Decorative corners -->
      ${decorations.corner}
      <g transform="translate(${width}, 0) scale(-1, 1)">
        ${decorations.corner}
      </g>
      
      <!-- Header with gradient background -->
      <rect x="${width / 2}" y="${padding - 10}" width="${width - 2 * padding + 20}" height="60" 
            fill="url(#headerGradient)" rx="10" filter="url(#paper-shadow)"/>
             x="${padding}" y="${padding}" width="40" height="40"/>
      <text x="${width / 3}" y="${padding + 30}" 
            fill="${colors.text.primary}" font-size="${theme.fontSize.large}"
            font-weight="bold">${userData.powerBy}</text>
      
      <!-- Decorative Divider -->
      <path d="M ${padding} ${padding + 70} 
               C ${width/4} ${padding + 65}, ${width*3/4} ${padding + 75}, ${width - padding} ${padding + 70}" 
            stroke="${colors.accent}" stroke-width="2" fill="none"/>
      <circle cx="${width/2}" cy="${padding + 70}" r="3" fill="${colors.accent}"/>
      
      <!-- User Info -->
      <image href="${userData.avatarUrl}" 
             x="${padding}" y="${padding + 100}" 
             width="60" height="60" rx="30"/>
      <text x="${padding + 80}" y="${padding + 140}" 
            fill="${colors.text.primary}" font-size="${theme.fontSize.medium}">
        @${userData.userName}
      </text>

      <!-- Stats with GitHub-style layout -->
      <g transform="translate(${padding}, ${padding + 200})">
        <!-- Stats Container with tech-style border -->
        <rect width="${width - 2 * padding}" height="100" rx="8"
              fill="none" 
              stroke="${colors.text.secondary}"
              stroke-width="1"
              stroke-dasharray="1 3"
              filter="url(#glow)"/>
        
        <!-- Animated tech border overlay -->
        <rect width="${width - 2 * padding}" height="100" rx="8"
              fill="none" 
              stroke="${colors.primary}"
              stroke-width="0.5"
              stroke-dasharray="10 10"
              opacity="0.3"
              filter="url(#glow)">
        </rect>

        <!-- Tech-style decorative corners -->
        <path d="M 0 0 L 20 0 M 0 0 L 0 20 M 5 5 L 15 5 M 5 5 L 5 15" 
              stroke="${colors.text.secondary}" 
              stroke-width="1"
              stroke-linecap="round"/>
        <circle cx="5" cy="5" r="1" fill="${colors.primary}" filter="url(#glow)"/>

        <path d="M ${width - 2 * padding - 20} 0 L ${width - 2 * padding} 0 M ${width - 2 * padding} 0 L ${width - 2 * padding} 20" 
              stroke="${colors.text.secondary}" 
              stroke-width="1"
              stroke-linecap="round"/>
        <circle cx="${width - 2 * padding - 5}" cy="5" r="1" fill="${colors.primary}" filter="url(#glow)"/>

        <path d="M 0 100 L 20 100 M 0 100 L 0 80 M 5 95 L 15 95 M 5 85 L 5 95" 
              stroke="${colors.text.secondary}" 
              stroke-width="1"
              stroke-linecap="round"/>
        <circle cx="5" cy="95" r="1" fill="${colors.primary}" filter="url(#glow)"/>

        <path d="M ${width - 2 * padding - 20} 100 L ${width - 2 * padding} 100 M ${width - 2 * padding} 100 L ${width - 2 * padding} 80" 
              stroke="${colors.text.secondary}" 
              stroke-width="1"
              stroke-linecap="round"/>
        <circle cx="${width - 2 * padding - 5}" cy="95" r="1" fill="${colors.primary}" filter="url(#glow)"/>

        <!-- Decorative side markers -->
        <line x1="0" y1="50" x2="8" y2="50"
              stroke="${colors.text.secondary}"
              stroke-width="1"
              stroke-dasharray="1 2"/>
        <circle cx="8" cy="50" r="1" fill="${colors.primary}" filter="url(#glow)"/>

        <line x1="${width - 2 * padding - 8}" y1="50" x2="${width - 2 * padding}" y2="50"
              stroke="${colors.text.secondary}"
              stroke-width="1"
              stroke-dasharray="1 2"/>
        <circle cx="${width - 2 * padding - 8}" cy="50" r="1" fill="${colors.primary}" filter="url(#glow)"/>

        <!-- Stats Grid -->
        <g transform="translate(50, 30)">
          <!-- Stars -->
          <g>
            <path d="M8 .25a.75.75 0 01.673.418l1.882 3.815 4.21.612a.75.75 0 01.416 1.279l-3.046 2.97.719 4.192a.75.75 0 01-1.088.791L8 12.347l-3.766 1.98a.75.75 0 01-1.088-.79l.72-4.194L.818 6.374a.75.75 0 01.416-1.28l4.21-.611L7.327.668A.75.75 0 018 .25z" 
                  fill="${colors.accent}" transform="scale(1.5) translate(-4, -4)"/>
            <text x="30" y="14" fill="${colors.text.primary}" font-size="24" font-weight="bold">
              ${stats.stars}
            </text>
            <text x="30" y="35" fill="${colors.text.secondary}" font-size="13">
              Stars Earned
            </text>
          </g>

          <!-- Total Forks -->
          <g transform="translate(170, 0)">
            <path d="M5 5.372v.878c0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75v-.878a2.25 2.25 0 111.5 0v.878a2.25 2.25 0 01-2.25 2.25h-1.5v2.128a2.251 2.251 0 11-1.5 0V8.5h-1.5A2.25 2.25 0 013 6.25v-.878a2.25 2.25 0 111.5 0zM5 3.25a.75.75 0 10-1.5 0 .75.75 0 001.5 0zm6.75.75a.75.75 0 100-1.5.75.75 0 000 1.5zm-3 8.75a.75.75 0 100-1.5.75.75 0 000 1.5z"
                  fill="${colors.text.primary}" transform="scale(1.5) translate(-4, -4)"/>
            <text x="30" y="14" fill="${colors.text.primary}" font-size="24" font-weight="bold">
              ${stats.repositories}
            </text>
            <text x="30" y="35" fill="${colors.text.secondary}" font-size="13">
              Total Forks
            </text>
          </g>

          <!-- Followers -->
          <g transform="translate(340, 0)">
            <path d="M2 5.5a3.5 3.5 0 115.898 2.549 5.507 5.507 0 013.034 4.084.75.75 0 11-1.482.235 4.001 4.001 0 00-7.9 0 .75.75 0 01-1.482-.236A5.507 5.507 0 013.102 8.05 3.49 3.49 0 012 5.5zM11 4a3.001 3.001 0 012.22 5.018 5.01 5.01 0 012.56 3.012.749.749 0 01-.885.954.752.752 0 01-.549-.514 3.507 3.507 0 00-2.522-2.372.75.75 0 01-.574-.73v-.352a.75.75 0 01.416-.672A1.5 1.5 0 0011 5.5.75.75 0 0111 4zm-5.5-.5a2 2 0 10-.001 3.999A2 2 0 005.5 3.5z"
                  fill="${colors.text.primary}" transform="scale(1.5) translate(-4, -4)"/>
            <text x="30" y="14" fill="${colors.text.primary}" font-size="24" font-weight="bold">
              44
            </text>
            <text x="30" y="35" fill="${colors.text.secondary}" font-size="13">
              Followers
            </text>
          </g>

          <!-- Total Commits -->
          <g transform="translate(510, 0)">
            <path d="M1 2.5A2.5 2.5 0 013.5 0h8.75a.75.75 0 01.75.75v3.5a.75.75 0 01-1.5 0V1.5h-8a1 1 0 00-1 1v6.708A2.492 2.492 0 013.5 9h3.25a.75.75 0 010 1.5H3.5a1 1 0 100 2h5.75a.75.75 0 010 1.5H3.5A2.5 2.5 0 011 11.5v-9zm13.23 7.79a.75.75 0 001.06-1.06l-2.505-2.505a.75.75 0 00-1.06 0L9.22 9.229a.75.75 0 001.06 1.061l1.225-1.224v6.184a.75.75 0 001.5 0V9.066l1.224 1.224z"
                  fill="${colors.text.primary}" transform="scale(1.5) translate(-4, -4)"/>
            <text x="30" y="14" fill="${colors.text.primary}" font-size="24" font-weight="bold">
              ${stats.contributions}
            </text>
            <text x="30" y="35" fill="${colors.text.secondary}" font-size="13">
              Total Commits
            </text>
          </g>
        </g>
      </g>
      
      <!-- Top Key with enhanced styling -->

      <g transform="translate(0, ${padding + 400})">
        <!-- Background glow -->
          <text x="${width/2}" y="4"
              fill="${colors.primary}" font-size="64px"
              font-weight="900" opacity="0.2"
              filter="url(#glow)"
              text-anchor="middle"
              style="letter-spacing: 4px;">
          ${userData.topKey}
        </text>
        <!-- Main text with gradient -->
        <text x="${width/2}" y="0" 
              text-anchor="middle"
              fill="${colors.primary}" font-size="64px"
              font-weight="900"
              style="letter-spacing: 4px;"
              filter="url(#glow)">
          "${userData.topKey}"
        </text>
      </g>
  
      
      <!-- Heatmap -->
      <g transform="translate(${width/2 - 20}, ${padding + 500})">
        ${generateHeatmap(stats.dailyData)}
      </g>
      
      <!-- Tags with enhanced styling -->
      <g transform="translate(${width/2 + 50}, ${padding + 670})">
        ${userData.topTags.slice(0, 6).map((tag, i) => {
          const row = Math.floor(i / 3);
          const col = i % 3;
          const tagsPerRow = 3;
          const tagWidth = 220;
          const totalRowWidth = tagsPerRow * tagWidth;
          const x = (col * tagWidth) - (totalRowWidth / 2);
          const y = row * 45;
          const color = colors.tag.glow[i % colors.tag.glow.length];
          return `
            <g transform="translate(${x}, ${y})">
              <text class="tag-text" 
                    fill="${color}"
                    font-size="24px"
                    font-weight="bold"
                    style="font-family: 'Noto Sans SC', sans-serif">
                #${tag}
              </text>
            </g>
          `;
        }).join('')}
      </g>
      
      
      <!-- Git-style Contributions -->
      <g transform="translate(${padding}, ${padding + 800})">
        <!-- Terminal window styling -->
        <rect width="${width - 2 * padding}" height="${userData.topContents.length * 100 + 80}" rx="8"
              fill="#0d1117" 
              stroke="${colors.gradient.secondary.start}"
              stroke-width="2"/>
        <!-- Terminal header -->
        <rect x="0" y="0" width="${width - 2 * padding}" height="35" rx="8"
              fill="${colors.gradient.secondary.start}"/>
        <text x="15" y="23" fill="${colors.text.secondary}" font-size="14" font-family="monospace">
          $ git log --oneline --oneyear --head 2
        </text>
        
        ${userData.topContents.slice(0, 2).map((content, i) => {
          // Generate git-like hash (7 characters, using content to make it deterministic)
          const hash = Array.from(content.content)
            .reduce((acc, char) => acc + char.charCodeAt(0), 0)
            .toString(16)
            .substring(0, 7);
          
          // 根据style选择颜色
          const hookColor = options.style === 'sarcasm' ? '#f85149' : '#7ee787';
          const hookText = options.style === 'sarcasm' ? 'husky > pre-commit hook failed' : 'husky > commit message';
          
          return `
            <g transform="translate(20, ${55 + i * 100})">
              <!-- Git commit line -->
              <text font-size="16" font-family="monospace">
                <tspan fill="${colors.accent}">${hash}</tspan>
                <tspan x="100" fill="${colors.text.primary}">${content.content}</tspan>
                <tspan x="${width - 6 * padding}" fill="${colors.text.secondary}">(${content.likeStarCnt} refs)</tspan>
              </text>
              
              <!-- Pre-commit hook style message -->
              <g transform="translate(20, 30)">
                <text fill="${hookColor}" font-size="14" font-family="monospace">
                  <tspan>${hookText}</tspan>
                  ${content.dissContent.split('\n').flatMap((line, lineIndex) => {
                    // 每行最多显示35个字符
                    const maxCharsPerLine = 50;
                    const wrappedLines = [];
                    for (let i = 0; i < line.length; i += maxCharsPerLine) {
                      wrappedLines.push(line.slice(i, i + maxCharsPerLine));
                    }
                    return wrappedLines.map((wrappedLine, wrapIndex) => {
                      const isFirstLine = lineIndex === 0 && wrapIndex === 0;
                      const lineNumber = lineIndex + 1;
                      return `
                        <tspan x="0" dy="${isFirstLine ? 25 : 20}" fill="#6e7681">${lineNumber.toString().padStart(2, ' ')} │ </tspan>
                        <tspan fill="${hookColor}">${wrappedLine}</tspan>
                      `;
                    });
                  }).join('')}
                  <tspan x="0" dy="25" fill="${colors.text.secondary}">hint: use --no-verify to bypass</tspan>
                </text>
              </g>
            </g>
          `;
        }).join('')}
      </g>
      
      <!-- Final Diss with code editor styling -->
      <g transform="translate(${padding}, ${padding + 1060})">
        <!-- Editor window background -->
        <rect width="${width - 2 * padding}" height="160" rx="8"
              fill="#0d1117" 
              stroke="${colors.gradient.secondary.start}"
              stroke-width="2"/>
        
        <!-- Editor header -->
        <rect x="0" y="0" width="${width - 2 * padding}" height="30" rx="8"
              fill="${colors.gradient.secondary.start}"/>
        
        <!-- File tabs -->
        <rect x="10" y="5" width="140" height="25" rx="4"
              fill="${colors.gradient.secondary.end}"/>
        <text x="35" y="22" 
              fill="${colors.text.primary}" 
              font-size="12"
              font-family="monospace">
          cat diss.log
        </text>
        <circle cx="20" cy="17" r="3" fill="#f85149"/>
        
        <!-- Content area with line numbers -->
        ${(() => {
          const text = userData.finalDiss.content;
          const lines: string[] = [];
          const maxCharsPerLine = 35; // Adjusted for monospace font
          
          let start = 0;
          while (start < text.length) {
            const end = Math.min(start + maxCharsPerLine, text.length);
            lines.push(text.slice(start, end));
            start = end;
          }

          return lines.map((line, index) => `
            <!-- Line number -->
            <text x="20" y="${50 + index * 25}" 
                  fill="${colors.text.secondary}"
                  font-size="14"
                  font-family="monospace">
              ${(index + 1).toString().padStart(2, '0')}
            </text>
            <!-- Code content -->
            <text x="60" y="${50 + index * 25}" 
                  fill="${colors.text.primary}"
                  font-size="14"
                  font-family="monospace">
              <tspan fill="${colors.primary}">console.error</tspan>
              <tspan fill="${colors.text.primary}">(</tspan>
              <tspan fill="#e3b341">'${line}'</tspan>
              <tspan fill="${colors.text.primary}">);</tspan>
            </text>
          `).join('');
        })()}
      </g>
      
      <!-- Best Wish with code editor styling -->
      <g transform="translate(${padding}, ${padding + 1200})">
        <!-- Editor window background -->
        <rect width="${width - 2 * padding}" height="120" rx="8"
              fill="#0d1117" 
              stroke="${colors.gradient.secondary.start}"
              stroke-width="2"/>
        
        <!-- Editor header -->
        <rect x="0" y="0" width="${width - 2 * padding}" height="30" rx="8"
              fill="${colors.gradient.secondary.start}"/>
        
        <!-- File tabs -->
        <rect x="10" y="5" width="140" height="25" rx="4"
              fill="${colors.gradient.secondary.end}"/>
        <text x="35" y="22" 
              fill="${colors.text.primary}" 
              font-size="12"
              font-family="monospace">
          cat wish.log
        </text>
        <circle cx="20" cy="17" r="3" fill="#238636"/>
        
        <!-- Content area with line numbers -->
        ${(() => {
          const text = userData.bestWish;
          const lines: string[] = [];
          const maxCharsPerLine = 35; // Adjusted for monospace font
          
          let start = 0;
          while (start < text.length) {
            const end = Math.min(start + maxCharsPerLine, text.length);
            lines.push(text.slice(start, end));
            start = end;
          }

          return lines.map((line, index) => `
            <!-- Line number -->
            <text x="20" y="${50 + index * 25}" 
                  fill="${colors.text.secondary}"
                  font-size="14"
                  font-family="monospace">
              ${(index + 1).toString().padStart(2, '0')}
            </text>
            <!-- Code content -->
            <text x="60" y="${50 + index * 25}" 
                  fill="${colors.text.primary}"
                  font-size="14"
                  font-family="monospace">
              <tspan fill="${colors.accent}">console.log</tspan>
              <tspan fill="${colors.text.primary}">(</tspan>
              <tspan fill="#7ee787">'${line}'</tspan>
              <tspan fill="${colors.text.primary}">);</tspan>
            </text>
          `).join('');
        })()}
      </g>

      <!-- Copyright-style footer -->
      <g transform="translate(${width/2}, ${padding + 1350})">
        <!-- Decorative line with gradient -->
        <linearGradient id="footerLineGradient" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" style="stop-color:${colors.text.secondary};stop-opacity:0" />
          <stop offset="50%" style="stop-color:${colors.text.secondary};stop-opacity:1" />
          <stop offset="100%" style="stop-color:${colors.text.secondary};stop-opacity:0" />
        </linearGradient>
        <line x1="-150" y1="0" x2="150" y2="0"
              stroke="url(#footerLineGradient)"
              stroke-width="1"
              stroke-dasharray="1 3"/>
        
        <!-- Copyright text with enhanced styling -->
        <text text-anchor="middle" 
              font-family="monospace"
              font-size="12"
              class="copyright">
          <tspan fill="${colors.text.secondary}">© </tspan>
          <tspan fill="${colors.primary}">aiyear.my</tspan>
          <tspan fill="${colors.text.secondary}"> All rights reserved.</tspan>
        </text>
      </g>
    </svg>
  `;
}
