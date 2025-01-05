# Content Fetch Specifications

## Raw Content

### Twitter Data

```json
{
  "tweets": [
    // 仅选择top400 like提供给AI，如果单条推文内容太长，则总结后提供，限制在160字
    {
      "id": "1234567890",
      "content": "推文内容",
      "createdAt": "2023-12-31T12:00:00Z",
      "likeCount": 42,
      "retweetCount": 12,
      "replyCount": 5,
      "mediaUrls": ["https://..."],
      "isRetweet": false,
      "quotedTweet": {
        "content": "被引用的推文内容",
        "author": "原作者"
      }
    }
  ],
  "userStats": {
    "followersCount": 1000, // 截止目前累计的被关注数量
    "followingCount": 500, // 截止目前累计的关注数量
    "totalTweets": 1200, // 当前的新增tweet数据
    "userAvatar": "https://...",
    "userSlogan": "xxx",
  }
}
```

### Jike Data

```json
{
  "posts": [
    {
      "id": "post123",
      "content": "即刻动态内容",
      "createdAt": "2023-12-31T12:00:00Z",
      "likeCount": 88,
      "repostCount": 15,
      "commentCount": 23,
      "pictures": ["https://..."],
      "topic": "摸鱼",
      "isRepost": false,
      "originalPost": {
        "content": "原始动态内容",
        "author": "原作者"
      }
    }
  ],
  "userStats": {
    "followersCount": 2000,
    "followingCount": 800,
    "totalPosts": 365,
    "userAvatar": "https://...",
    "userSlogan": "xxx",
  }
}
```

### GitHub Data

```json
{
  "repositories": [
    {
      "name": "project-name",
      "description": "项目描述",
      "stars": 150,
      "forks": 30,
      "language": "TypeScript",
      "createdAt": "2023-01-15T00:00:00Z",
      "updatedAt": "2023-12-31T23:59:59Z"
    }
  ],
  "commits": [
    {
      "repo": "project-name",
      "message": "feat: add new feature",
      "date": "2023-12-25T10:30:00Z",
      "additions": 120,
      "deletions": 50,
      "files": 3
    }
  ],
  "contributionCalendar": [
    {
      "date": "2023-12-31",
      "count": 5
    }
  ],
  "pullRequests": [
    {
      "title": "Feature: Add OAuth Support",
      "repo": "project-name",
      "state": "merged",
      "createdAt": "2023-11-20T08:15:00Z"
    }
  ],
  "issues": [
    {
      "title": "Bug: Login not working",
      "repo": "project-name",
      "state": "closed",
      "createdAt": "2023-10-01T14:20:00Z"
    }
  ],
  "userStats": {
    "followersCount": 2000,
    "followingCount": 800,
    "totalCommits": commits.length,
    "userAvatar": "https://...",
    "userSlogan": "xxx",
  }
}
```

## Processed Content

```json
{
  "platform": "jike | github | twitter",
  "userName": "xxx",
  // 影响图片风格的创建
  "style": "diss | best diss | appricate",
  "lang": "zh | en",
  // 用于生成年度关键词
  "topKey": "xxx",
  "createDate": "2025-01-01",
  "powerBy": "xxx",
  "basicStats": {
    // 关注数量、内容数量如commit/post
    "follower": 120,
    "following": 10,
    "contentCnt": 199
  }
  // 分析内容，提取金句，优先带有哲学含义的
  "bestSentence": "xxx",
  // 每一天的数据，用于生成热力图
  "heatmapData": {
    "title": "What you have done in this year",
    "dates": ["2023-01-01", "2023-12-31"],
    "counts": [1, 2, 5, 0, 3],
    "intensity": "medium"
  },
  // 用于生成词云
  "topTags": ["AI前沿哥", "熬夜大师"],
  // 针对top内容，每一条生成对应的diss语句
  "topContents": [
    // 热度top3的信息
    {
      "content": "xxxxx",
      "likeStarCnt": 150,
      "timestamp": "2023-06-15T10:30:00Z",
      // 对应diss或者夸夸内容
      "dissContent": "xxx"
    }
  ],
  "FinalDiss": {
    "title": "One more thing...",
    "content": "哎呀，这位国民CEO又下场亲自写代码"
  },
  // 针对下一年的祝福
  "BestWish": "xxx",
  // 私有数据，根据平台类型来区分
  "priData": {
  }
}
```

### Example

``` json
{
  "platform": "github",
  "userName": "octocat",
  "style": "best diss",
  "lang": "en",
  "topKey": "Open Source Contributions",
  "createDate": "2025-01-01",
  "powerBy": "AI Diss Summary Generator",
  "basicStats": {
    "follower": 120,
    "following": 100,
    "contentCnt": 532
  },
  "bestSentence": "The journey of a thousand miles begins with a single commit.",
  "heatmapData": {
    "title": "My GitHub Contributions in 2023",
    "dates": ["2023-01-01", "2023-01-15", "2023-02-10", "2023-03-01", "2023-03-15", "2023-04-01", "2023-05-01", "2023-06-01", "2023-07-01", "2023-08-01", "2023-09-01", "2023-10-01", "2023-11-01", "2023-12-01", "2023-12-31"],
    "counts": [5, 10, 3, 8, 12, 7, 9, 15, 6, 11, 4, 13, 2, 9, 6],
    "intensity": "medium"
  },
  "topTags": ["GitHub", "Open Source", "JavaScript", "Collaboration", "Community"],
  "topContents": [
    {
      "content": "Contributed to the 'awesome-list' repository with 50 new resources.",
      "likeStarCnt": 210,
      "timestamp": "2023-07-20T14:00:00Z",
      "dissContent": "Adding 50 resources to an 'awesome' list?  Still won't make your code awesome."
    },
    {
      "content": "Opened 30 pull requests, merging 25 successfully.",
      "likeStarCnt": 180,
      "timestamp": "2023-09-05T09:15:00Z",
      "dissContent": "Opening 30 pull requests, merging 25.  So you're saying 5 PRs are still lingering in the void?"
    },
    {
      "content": "Created a new GitHub Action for automating project deployments.",
      "likeStarCnt": 155,
      "timestamp": "2023-11-12T16:45:00Z",
      "dissContent": "Automating deployments with a new GitHub Action. Because clicking a button was just too much effort."
    }
  ],
  "FinalDiss": {
    "title": "One more thing...",
    "content": "Another year of contributions. Let's hope next year's summary has more substance than buzzwords."
  },
  "BestWish": "May your commits be frequent and your bugs be few in the coming year.",
  "priData": {
    "total_private_commits": 150
  }
}
```

## Image Prompt

## 数据说明

1. **原始数据 (Raw Content)**
   - 直接从平台 API 获取的原始数据
   - 保留平台特有的指标和结构
   - 包含后续处理所需的完整信息

2. **处理后数据 (Processed Content)**
   - 经过分析和转换的数据
   - 标准化的互动指标
   - 平台特定的洞察和统计

3. **用于生成图片 (Image Prompt)**
   - 统一的可视化格式
   - 平台特定部分（如 GitHub 热力图）
   - 保持一致的风格主题
