import { Octokit } from '@octokit/rest'
import { graphql } from '@octokit/graphql'
import type { PlatformData } from '@/lib/generation'

interface ProcessedGitHubData {
  status: 'ok' | 'processing' | 'failed'
  avatarUrl: string
  userSlogan: string
  platform: 'github'
  userName: string
  style: 'diss' | 'best diss' | 'appricate'
  lang: 'zh' | 'en'
  topKey: string
  createDate: string
  powerBy: string
  basicStats: {
    follower: number
    following: number
    contentCnt: number
  }
  bestSentence: string
  heatmapData: {
    title: string
    dates: string[]
    counts: number[]
    intensity: 'low' | 'medium' | 'high'
    monthlyStats: Array<{
      month: string
      commits: number
      topLanguages: string[]
      description: string
    }>
    dailyData: {
      dates: string[]
      counts: number[]
    }
  }
  topTags: string[]
  topContents: Array<{
    content: string
    likeStarCnt: number
    timestamp: string
    dissContent: string
  }>
  selectedContent: {
    yearHighlights: Array<{
      type: 'commit' | 'repo' | 'contribution'
      content: string
      timestamp: string
      significance: string
    }>
    mostUsedLanguages: Array<{
      language: string
      percentage: number
      context: string
    }>
    activityPatterns: {
      mostActiveMonth: string
      leastActiveMonth: string
      weekdayPattern: string
      timePattern: string
    }
    collaborations: Array<{
      type: 'fork' | 'pr' | 'issue'
      project: string
      description: string
    }>
  }
  FinalDiss: {
    title: string
    content: string
  }
  BestWish: string
  priData: {
    total_private_commits?: number
    languages?: { [key: string]: number }
    topRepos?: Array<{
      name: string
      stars: number
      language: string
      description: string
    }>
    errorMessage?: string
  }
}

interface ContributionDay {
  contributionCount: number
  date: string
}

interface ContributionWeek {
  contributionDays: ContributionDay[]
}

interface ContributionCalendar {
  totalContributions: number
  weeks: ContributionWeek[]
}

interface ContributionCollection {
  contributionCalendar: ContributionCalendar
}

interface GitHubGraphQLResponse {
  user: {
    contributionsCollection: ContributionCollection
  }
}

interface GitHubRepo {
  name: string
  description: string | null
  language: string | null
  stargazers_count: number
  created_at: string
}

interface GitHubUser {
  login: string
  id: number
  avatar_url: string
  gravatar_id: string
  url: string
  html_url: string
  followers_url: string
  following_url: string
  gists_url: string
  starred_url: string
  subscriptions_url: string
  organizations_url: string
  repos_url: string
  events_url: string
  received_events_url: string
  type: string
  site_admin: boolean
  name: string | null
  company: string | null
  blog: string | null
  location: string | null
  email: string | null
  hireable: boolean | null
  bio: string | null
  twitter_username: string | null
  public_repos: number
  public_gists: number
  followers: number
  following: number
  created_at: string
  updated_at: string
}

interface TopRepo {
  name: string
  description: string
  stars: number
  language: string
}

export async function getGitHubStats(
  username: string, 
  accessToken: string = '',
  options: {
    style?: 'diss' | 'best diss' | 'appricate'
    lang?: 'zh' | 'en'
  } = {}
): Promise<ProcessedGitHubData> {
  try {
    const octokit = new Octokit({
      auth: accessToken,
    })

    // 获取用户信息
    const { data: user } = await octokit.users.getByUsername({
      username,
    }) as { data: GitHubUser }

    // 获取仓库列表
    const { data: repos } = await octokit.repos.listForUser({
      username,
      sort: 'stars',
      per_page: 100,
    }) as { data: GitHubRepo[] }

    // 统计语言使用情况
    const languages: { [key: string]: number } = {}
    for (const repo of repos) {
      if (repo.language) {
        languages[repo.language] = (languages[repo.language] || 0) + 1
      }
    }

    // 获取贡献数据
    const contributionsQuery = `
      query($username: String!) {
        user(login: $username) {
          contributionsCollection {
            contributionCalendar {
              totalContributions
              weeks {
                contributionDays {
                  contributionCount
                  date
                }
              }
            }
          }
        }
      }
    `

    const graphqlWithAuth = graphql.defaults({
      headers: {
        authorization: `token ${accessToken}`,
      },
    })

    const response = await graphqlWithAuth<GitHubGraphQLResponse>(
      contributionsQuery,
      { username }
    )

    const contributionDays = response.user.contributionsCollection.contributionCalendar.weeks
      .flatMap((week: ContributionWeek) => week.contributionDays)
      .sort((a: ContributionDay, b: ContributionDay) => 
        new Date(a.date).getTime() - new Date(b.date).getTime()
      )

    // 生成热力图数据
    const dates = contributionDays.map((day: ContributionDay) => day.date)
    const counts = contributionDays.map((day: ContributionDay) => day.contributionCount)
    const maxCount = Math.max(...counts)
    let intensity: 'low' | 'medium' | 'high' = 'medium'
    if (maxCount <= 3) intensity = 'low'
    if (maxCount >= 10) intensity = 'high'

    // 生成月度统计数据
    const monthlyData = contributionDays.reduce((acc: Record<string, number>, day: ContributionDay) => {
      const month = day.date.substring(0, 7)
      acc[month] = (acc[month] || 0) + day.contributionCount
      return acc
    }, {})

    const monthlyStats = Object.entries(monthlyData)
      .map(([month, commits]) => ({
        month,
        commits,
        topLanguages: Object.entries(languages)
          .sort(([,a], [,b]) => b - a)
          .slice(0, 2)
          .map(([lang]) => lang),
        description: `${month}月贡献了${commits}次代码`
      }))
      .sort((a, b) => a.month.localeCompare(b.month))

    // 获取top仓库
    const topRepos = repos
      .sort((a: GitHubRepo, b: GitHubRepo) => b.stargazers_count - a.stargazers_count)
      .slice(0, 3)
      .map((repo: GitHubRepo) => ({
        name: repo.name,
        stars: repo.stargazers_count,
        language: repo.language || 'Unknown',
        description: repo.description || '',
      }))

    // 生成topContents
    const topContents = topRepos.map((repo) => ({
      content: `Repository ${repo.name}: ${repo.description}`,
      likeStarCnt: repo.stars,
      timestamp: new Date().toISOString() // 由于API限制，这里使用当前时间
    }))

    // 从语言和仓库描述生成标签
    const topLanguages = Object.entries(languages)
      .sort((a: [string, number], b: [string, number]) => b[1] - a[1])
      .slice(0, 3)
      .map(([lang]) => lang)

    const topTags = [
      ...topLanguages,
      `${response.user.contributionsCollection.contributionCalendar.totalContributions}+ Contributions`,
      `${repos.length} Repositories`
    ]

    // Generate diss content for each top repo
    const topContentsWithDiss = topContents.map(content => ({
      ...content,
      dissContent: `Another repo that won't make you famous: ${content.content}`
    }));

    // 生成精选内容
    const selectedContent = {
      yearHighlights: [
        // 最受欢迎的仓库
        ...topRepos.map(repo => ({
          type: 'repo' as const,
          content: `创建了 ${repo.name} 项目`,
          timestamp: new Date().toISOString(),
          significance: `获得了 ${repo.stars} 个星标，是你最受欢迎的项目`
        })),
        // 贡献最多的月份
        {
          type: 'contribution' as const,
          content: `在 ${monthlyStats.reduce((max, curr) => curr.commits > max.commits ? curr : max).month} 贡献最为活跃`,
          timestamp: new Date().toISOString(),
          significance: '这个月的代码贡献量最大'
        }
      ],
      mostUsedLanguages: Object.entries(languages)
        .sort(([,a], [,b]) => b - a)
        .slice(0, 3)
        .map(([lang, count]) => ({
          language: lang,
          percentage: count / Object.values(languages).reduce((a, b) => a + b, 0) * 100,
          context: `在 ${topRepos.filter(r => r.language === lang).map(r => r.name).join(', ')} 等项目中使用`
        })),
      activityPatterns: {
        mostActiveMonth: monthlyStats.reduce((max, curr) => curr.commits > max.commits ? curr : max).month,
        leastActiveMonth: monthlyStats.reduce((min, curr) => curr.commits < min.commits ? curr : min).month,
        weekdayPattern: '数据待补充',
        timePattern: '数据待补充'
      },
      collaborations: topRepos.map(repo => ({
        type: 'pr' as const,
        project: repo.name,
        description: `为 ${repo.name} 项目贡献代码`
      }))
    };

    return {
      status: 'ok',
      avatarUrl: user.avatar_url,
      userSlogan: user.bio || '',
      platform: 'github',
      userName: username,
      style: options.style || 'diss',
      lang: options.lang || 'en',
      topKey: topLanguages[0] || 'Coding',
      createDate: new Date().toISOString().split('T')[0],
      powerBy: 'AI Diss Summary',
      basicStats: {
        follower: user.followers,
        following: user.following,
        contentCnt: response.user.contributionsCollection.contributionCalendar.totalContributions
      },
      bestSentence: `${topLanguages[0] || 'Code'} Developer with ${repos.length} repositories`,
      heatmapData: {
        title: "GitHub Contributions",
        dates: dates,
        counts: counts,
        intensity,
        monthlyStats,
        dailyData: {
          dates,
          counts
        }
      },
      topTags,
      topContents: topContentsWithDiss,
      selectedContent,
      FinalDiss: {
        title: "One more thing...",
        content: `Another year of ${response.user.contributionsCollection.contributionCalendar.totalContributions} commits. Quantity over quality, I see.`
      },
      BestWish: "May your PRs be merged and your bugs be shallow in the coming year.",
      priData: {
        languages,
        topRepos
      }
    };
  } catch (err) {
    const error = err as { status?: number, message?: string };
    // 如果是 404 错误，说明用户不存在或者数据还在获取中
    if (error.status === 404) {
      return {
        status: 'processing',
        platform: 'github',
        userName: username,
        avatarUrl: '',
        userSlogan: '',
        style: options.style || 'diss',
        lang: options.lang || 'en',
        topKey: 'Coding',
        createDate: new Date().toISOString().split('T')[0],
        powerBy: 'AI Diss Summary',
        basicStats: {
          follower: 0,
          following: 0,
          contentCnt: 0
        },
        bestSentence: 'Data is being fetched...',
        heatmapData: {
          title: "GitHub Contributions",
          dates: [],
          counts: [],
          intensity: 'low',
          monthlyStats: [],
          dailyData: {
            dates: [],
            counts: []
          }
        },
        topTags: [],
        topContents: [],
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
        FinalDiss: {
          title: "Processing...",
          content: "Data is being fetched..."
        },
        BestWish: "Data is being fetched...",
        priData: {}
      };
    }
    
    // 其他错误则返回失败状态
    return {
      status: 'failed',
      platform: 'github',
      userName: username,
      avatarUrl: '',
      userSlogan: '',
      style: options.style || 'diss',
      lang: options.lang || 'en',
      topKey: 'Coding',
      createDate: new Date().toISOString().split('T')[0],
      powerBy: 'AI Diss Summary',
      basicStats: {
        follower: 0,
        following: 0,
        contentCnt: 0
      },
      bestSentence: 'Failed to fetch data',
        heatmapData: {
          title: "GitHub Contributions",
          dates: [],
          counts: [],
          intensity: 'low',
          monthlyStats: [],
          dailyData: {
            dates: [],
            counts: []
          }
        },
      topTags: [],
      topContents: [],
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
      FinalDiss: {
        title: "Error",
        content: "Failed to fetch data"
      },
      BestWish: "Failed to fetch data",
      priData: {
        errorMessage: error.message || 'Unknown error'
      }
    };
  }
}
