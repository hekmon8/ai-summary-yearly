interface JikePost {
  id: string
  content: string
  createdAt: string
  likeCount: number
  repostCount: number
  commentCount: number
  pictures: string[]
  topic: string
  isRepost: boolean
  originalPost?: {
    content: string
    author: string
  }
}

interface JikeUserStats {
  followersCount: number
  followingCount: number
  totalPosts: number
}

interface JikeApiResponse {
  posts: JikePost[]
  userStats: JikeUserStats
}

interface ProcessedJikeData {
  status: 'ok' | 'processing' | 'failed'
  avatarUrl: string
  userSlogan: string
  platform: 'jike'
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
  }
  topTags: string[]
  topContents: Array<{
    content: string
    likeStarCnt: number
    timestamp: string
  }>
  priData: {
    topics?: { [key: string]: number }
    topPosts?: Array<{
      id: string
      content: string
      likes: number
      reposts: number
      comments: number
    }>
  }
}

export async function getJikeStats(
  username: string,
  options: {
    style?: 'diss' | 'best diss' | 'appricate'
    lang?: 'zh' | 'en'
  } = {}
): Promise<ProcessedJikeData> {
  // 从API获取数据
  const response = await fetch('https://api.example.com/jike/user-data', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ username }),
  })

  if (!response.ok) {
    throw new Error(`Failed to fetch Jike data: ${response.statusText}`)
  }

  const data: JikeApiResponse = await response.json()

  // 统计话题
  const topics: { [key: string]: number } = {}
  data.posts.forEach(post => {
    if (post.topic) {
      topics[post.topic] = (topics[post.topic] || 0) + 1
    }
  })

  // 获取top内容
  const topPosts = data.posts
    .sort((a, b) => b.likeCount - a.likeCount)
    .slice(0, 3)
    .map(post => ({
      id: post.id,
      content: post.content,
      likes: post.likeCount,
      reposts: post.repostCount,
      comments: post.commentCount,
    }))

  // 生成热力图数据
  const postsByDate = new Map<string, number>()
  data.posts.forEach(post => {
    const date = post.createdAt.split('T')[0]
    postsByDate.set(date, (postsByDate.get(date) || 0) + 1)
  })

  const dates = Array.from(postsByDate.keys()).sort()
  const counts = dates.map(date => postsByDate.get(date) || 0)
  const maxCount = Math.max(...counts)
  let intensity: 'low' | 'medium' | 'high' = 'medium'
  if (maxCount <= 3) intensity = 'low'
  if (maxCount >= 10) intensity = 'high'

  // 生成topContents
  const topContents = topPosts.map(post => ({
    content: post.content,
    likeStarCnt: post.likes,
    timestamp: new Date().toISOString(), // 使用实际的post.createdAt
  }))

  // 生成标签
  const topTags = Object.entries(topics)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([topic]) => topic)

  return {
    status: 'ok',
    platform: 'jike',
    avatarUrl: '',
    userSlogan: '',
    userName: username,
    style: options.style || 'diss',
    lang: options.lang || 'zh',
    topKey: topTags[0] || '摸鱼',
    createDate: new Date().toISOString().split('T')[0],
    powerBy: 'AI Diss Summary',
    basicStats: {
      follower: data.userStats.followersCount,
      following: data.userStats.followingCount,
      contentCnt: data.userStats.totalPosts
    },
    bestSentence: topPosts[0]?.content || '这个人很懒，什么都没说',
    heatmapData: {
      title: "即刻动态频率",
      dates,
      counts,
      intensity
    },
    topTags,
    topContents,
    priData: {
      topics,
      topPosts
    }
  }
}