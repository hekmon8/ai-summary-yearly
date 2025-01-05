import type { PlatformData } from '../generation'

export const mockGithubData: PlatformData = {
  status: 'ok',
  avatarUrl: 'https://avatars.githubusercontent.com/u/12345678',
  userSlogan: '写代码是为了让世界变得更糟糕',
  platform: 'github',
  userName: 'codingmaster',
  style: 'diss',
  lang: 'zh',
  topKey: '代码艺术家',
  createDate: '2023-12-31',
  powerBy: 'AI Diss Summary',
  basicStats: {
    follower: 233,
    following: 666,
    contentCnt: 888
  },
  bestSentence: '写代码就像写诗，可惜你的都是打油诗',
  heatmapData: {
    title: '2023年代码贡献热力图',
    dates: [
      '2023-01-01', '2023-02-14', '2023-03-15', '2023-04-01', 
      '2023-05-20', '2023-06-18', '2023-07-01', '2023-08-15',
      '2023-09-10', '2023-10-31', '2023-11-11', '2023-12-25'
    ],
    counts: [5, 8, 12, 3, 7, 15, 9, 6, 11, 4, 13, 10],
    intensity: 'high',
    monthlyStats: [
      {
        month: '2023-01',
        commits: 89,
        topLanguages: ['TypeScript', 'Python'],
        description: '新年新气象，Bug照样多'
      },
      {
        month: '2023-04',
        commits: 120,
        topLanguages: ['JavaScript', 'Vue'],
        description: '春暖花开，代码绽放'
      },
      {
        month: '2023-07',
        commits: 156,
        topLanguages: ['React', 'Node.js'],
        description: '夏日炎炎，Bug相伴'
      },
      {
        month: '2023-10',
        commits: 134,
        topLanguages: ['Go', 'Rust'],
        description: '秋高气爽，重构正当时'
      }
    ],
    dailyData: {
      dates: ['2023-12-24', '2023-12-25', '2023-12-26', '2023-12-27', '2023-12-28'],
      counts: [8, 12, 5, 15, 7]
    }
  },
  topTags: ['代码艺术家', '调试大师', 'Bug制造者', '重构专家', '深夜码农', '摸鱼王者', '文档逃避者'],
  topContents: [
    {
      content: 'Finally fixed the memory leak issue after 3 months',
      likeStarCnt: 88,
      timestamp: '2023-03-15',
      dissContent: '修了三个月的内存泄漏，结果发现是忘了关数据库连接'
    },
    {
      content: 'Rewrote the entire frontend in React',
      likeStarCnt: 233,
      timestamp: '2023-06-20',
      dissContent: '换个框架就能解决所有问题？真是天真'
    },
    {
      content: 'Implemented microservices architecture',
      likeStarCnt: 166,
      timestamp: '2023-09-10',
      dissContent: '把一个大Bug拆分成多个小Bug，这很微服务'
    },
    {
      content: 'Added comprehensive unit tests',
      likeStarCnt: 120,
      timestamp: '2023-12-01',
      dissContent: '测试全过，程序照崩，这很单元测试'
    }
  ],
  selectedContent: {
    yearHighlights: [
      {
        type: 'commit',
        content: 'Complete system architecture redesign',
        timestamp: '2023-03-15',
        significance: '重新设计了整个系统架构，用更优雅的方式制造Bug'
      },
      {
        type: 'repo',
        content: 'Created ai-powered-todo-app',
        timestamp: '2023-06-01',
        significance: '获得1000+ stars，可能都是机器人点的'
      },
      {
        type: 'contribution',
        content: 'Major contribution to popular framework',
        timestamp: '2023-09-20',
        significance: '提交了一个巨大的PR，包含了无数潜在的Bug'
      },
      {
        type: 'commit',
        content: 'Optimized database queries',
        timestamp: '2023-12-10',
        significance: '优化后的查询速度提升了0.01%'
      }
    ],
    mostUsedLanguages: [
      {
        language: 'TypeScript',
        percentage: 40,
        context: '类型体操专家'
      },
      {
        language: 'Python',
        percentage: 25,
        context: '人工智能调包侠'
      },
      {
        language: 'Rust',
        percentage: 20,
        context: '内存安全卫士'
      },
      {
        language: 'Go',
        percentage: 15,
        context: '并发错误制造者'
      }
    ],
    activityPatterns: {
      mostActiveMonth: '2023-07',
      leastActiveMonth: '2023-02',
      weekdayPattern: '周一划水，周五爆肝',
      timePattern: '凌晨两点代码质量最高'
    },
    collaborations: [
      {
        type: 'pr',
        project: 'next-generation-framework',
        description: '提交了一个改变世界的PR，但是被无情拒绝'
      },
      {
        type: 'issue',
        project: 'popular-library',
        description: '提出了一个天马行空的功能建议，至今无人回应'
      },
      {
        type: 'fork',
        project: 'breakthrough-technology',
        description: 'Fork了一个项目，然后就再也没看过'
      },
      {
        type: 'pr',
        project: 'innovative-platform',
        description: '修复了一个拼写错误，成为项目贡献者'
      }
    ]
  },
  FinalDiss: {
    title: '2023年度代码进化史',
    content: '这一年，你用无数的commit记录了自己的成长，虽然大部分都是修复自己写的Bug。从"能跑就行"进化到"不崩就行"，这进步令人欣慰。你的代码就像一首现代诗，只有自己看得懂。'
  },
  BestWish: '愿你2024年的代码能有更多的注释，更少的Bug，不过以你的水平，这可能只是一个美好的愿望。',
  priData: {
    totalCommits: 1024,
    averageCommitsPerDay: 3.14,
    longestStreak: 21,
    favoriteCommitTime: '02:00',
    mostFrequentCommitMessage: 'fix: typo',
    debuggingHours: 789,
    coffeeConsumed: 385,
    stackOverflowVisits: 1567
  }
}
