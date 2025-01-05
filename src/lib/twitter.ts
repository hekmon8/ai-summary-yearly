interface Tweet {
  id: string
  content: string
  createdAt: string
  likeCount: number
  retweetCount: number
  replyCount: number
  mediaUrls: string[]
  isRetweet: boolean
  quotedTweet?: {
    content: string
    author: string
  }
}

interface TwitterUserStats {
  followersCount: number
  followingCount: number
  totalTweets: number
}

interface TwitterApiResponse {
  tweets: Tweet[]
  userStats: TwitterUserStats
}

interface ProcessedTwitterData {
  status: 'ok' | 'processing' | 'failed'
  avatarUrl: string
  userSlogan: string
  platform: 'twitter'
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
    hashtags?: { [key: string]: number }
    topTweets?: Array<{
      id: string
      content: string
      likes: number
      retweets: number
      replies: number
    }>
  }
}

export async function getTwitterStats(
  username: string,
  accessToken: string = '',
  options: {
    style?: 'diss' | 'best diss' | 'appricate'
    lang?: 'zh' | 'en'
  } = {}
): Promise<ProcessedTwitterData> {
  // 获取用户数据
  const response = await fetch(`https://api.twitter.com/2/users/${username}/tweets`, {
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
  })

  if (!response.ok) {
    throw new Error(`Failed to fetch Twitter data: ${response.statusText}`)
  }

  const data: TwitterApiResponse = await response.json()

  // 统计hashtags
  const hashtags: { [key: string]: number } = {}
  data.tweets.forEach(tweet => {
    const tags = tweet.content.match(/#\w+/g) || []
    tags.forEach(tag => {
      hashtags[tag] = (hashtags[tag] || 0) + 1
    })
  })

  // 获取top内容
  const topTweets = data.tweets
    .sort((a: Tweet, b: Tweet) => b.likeCount - a.likeCount)
    .slice(0, 3)
    .map((tweet: Tweet) => ({
      id: tweet.id,
      content: tweet.content,
      likes: tweet.likeCount,
      retweets: tweet.retweetCount,
      replies: tweet.replyCount,
    }))

  // 生成热力图数据
  const tweetsByDate = new Map<string, number>()
  data.tweets.forEach((tweet: Tweet) => {
    const date = tweet.createdAt.split('T')[0]
    tweetsByDate.set(date, (tweetsByDate.get(date) || 0) + 1)
  })

  const dates = Array.from(tweetsByDate.keys()).sort()
  const counts = dates.map(date => tweetsByDate.get(date) || 0)
  const maxCount = Math.max(...counts)
  let intensity: 'low' | 'medium' | 'high' = 'medium'
  if (maxCount <= 3) intensity = 'low'
  if (maxCount >= 10) intensity = 'high'

  // 生成topContents
  const topContents = topTweets.map((tweet) => ({
    content: tweet.content,
    likeStarCnt: tweet.likes,
    timestamp: new Date().toISOString() // TODO: 使用实际的tweet.createdAt
  }))

  // 生成标签
  const topTags = Object.entries(hashtags)
    .sort((a: [string, number], b: [string, number]) => b[1] - a[1])
    .slice(0, 5)
    .map(([tag]) => tag.slice(1)) // 移除#前缀

  return {
    status: 'ok',
    avatarUrl: '',
    userSlogan: '',
    platform: 'twitter',
    userName: username,
    style: options.style || 'diss',
    lang: options.lang || 'en',
    topKey: topTags[0] || 'Tweet',
    createDate: new Date().toISOString().split('T')[0],
    powerBy: 'AI Diss Summary',
    basicStats: {
      follower: data.userStats.followersCount,
      following: data.userStats.followingCount,
      contentCnt: data.userStats.totalTweets
    },
    bestSentence: topTweets[0]?.content || 'This person is too quiet',
    heatmapData: {
      title: "Twitter Activity",
      dates,
      counts,
      intensity
    },
    topTags,
    topContents,
    priData: {
      hashtags,
      topTweets
    }
  }
}
