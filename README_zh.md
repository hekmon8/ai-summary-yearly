# AI Summary yearly - 你的年度数字足迹分析

> 🌐 **[访问 AI Summary yearly](https://aiyear.my)** - 使用 AI 生成你的个性化年度数字足迹总结

[English](README.md) | [中文](README_zh.md)

[![访问网站](https://img.shields.io/badge/访问-aiyear.my-blue)](https://aiyear.my)
[![GitHub 许可证](https://img.shields.io/github/license/your-username/ai-diss-summary)](LICENSE)

## 🌟 项目概述

AI Summary Yearly 是一个创新的平台，使用 AI 技术生成个性化的年度数字足迹总结。目前支持 GitHub 数据分析，Twitter 和即刻集成即将推出。

## ✨ 主要功能

### 已实现功能
- **GitHub 集成**
  - 仓库和贡献分析
  - 代码活动热力图
  - 编程语言使用统计
  - 基于 OpenAI 的个性化总结
  - 自定义头像生成

- **AI 驱动功能**
  - OpenAI 驱动的内容生成
  - 多种总结风格：
    - 吐槽模式
    - 终极吐槽模式
    - 经典模式
    - 赞美模式
  - AI 个性化头像生成
  - 活动热力图和统计

- **交互式界面**
  - 实时进度跟踪
  - 结果分享功能
  - 总结下载
  - 国际化支持：
    - 英文 (en)
    - 中文 (zh)
    - 基于 next-i18next 的国际化

### 即将推出
- **Twitter 集成**
  - 社交活动分析
  - 互动指标统计
  - 内容亮点展示

- **即刻集成**
  - 动态分析
  - 互动模式统计
  - 社区参与度指标

## 🛠 技术栈

- **前端**
  - Next.js 13
  - React 18
  - TailwindCSS
  - Framer Motion
  - TypeScript

- **后端**
  - Next.js API Routes
  - Prisma ORM
  - Neon Database (PostgreSQL)
  - Cloudflare Workers

- **认证**
  - Clerk
  - Next-Auth

- **AI/ML**
  - OpenRouter API (兼容 OpenAI)
  - Cloudflare AI

- **存储**
  - Cloudflare R2
  - Supabase

## 🗃 数据结构

### 核心模型 (Prisma Schema)
```prisma
// 任务处理和用户管理的关键数据模型
Task {
  id          String
  status      String
  style       String
  username    String
  data        Json
  content     String?
  imageUrl    String?
  shareUrl    String?
  userId      String?
  createdAt   DateTime
  updatedAt   DateTime
}

User {
  id          String
  credits     Int
  tasks       Task[]
}
```

### 平台数据结构
```typescript
interface PlatformData {
  status: 'ok' | 'processing' | 'failed'
  platform: 'github' | 'twitter' | 'jike'
  basicStats: {
    follower: number
    following: number
    contentCnt: number
  }
  heatmapData: {
    dates: string[]
    counts: number[]
    monthlyStats: Array<{...}>
  }
  selectedContent: {
    yearHighlights: Array<{...}>
    mostUsedLanguages: Array<{...}>
    activityPatterns: {...}
  }
}
```

## ⚙️ 安装部署

1. **环境要求**
   ```bash
   node >= 18.0.0
   npm >= 8.0.0
   ```

2. **环境变量**
   ```bash
   # 创建 .env 文件
   cp .env.example .env

   # 环境变量
   DATABASE_URL=                    # PostgreSQL 连接 URL
   CLERK_SECRET_KEY=               # Clerk 认证密钥
   OPENROUTER_API_KEY=             # OpenRouter API 密钥
   CLOUDFLARE_R2_ACCESS_KEY_ID=    # Cloudflare R2 访问密钥
   CLOUDFLARE_R2_SECRET_KEY=       # Cloudflare R2 密钥
   CLOUDFLARE_R2_BUCKET=           # R2 存储桶名称
   CLOUDFLARE_ACCOUNT_ID=          # Cloudflare 账户 ID
   ```

3. **数据库设置**
   ```bash
   # 创建数据库架构
   npx prisma db push

   # 生成 Prisma 客户端
   npm run prisma:generate

   # 初始化数据库（首次运行）
   npm run prisma:init-migration

   # 创建新的迁移（当架构变更时）
   npm run prisma:update "migration_name"

   # 在 Prisma Studio 中查看数据库
   npm run prisma:studio
   ```

4. **安装依赖**
   ```bash
   # 安装项目依赖
   npm install

   # 安装开发依赖
   npm install -D @types/node @types/react typescript
   ```

5. **开发环境**
   ```bash
   # 启动开发服务器
   npm run dev
   ```

6. **生产环境**
   ```bash
   # 构建应用
   npm run build

   # 启动生产服务器
   npm run start
   ```

7. **可用脚本**
   ```bash
   # NPM 脚本列表
   "dev": "next dev"                    # 启动开发服务器
   "build": "next build"                # 生产环境构建
   "start": "next start"                # 启动生产服务器
   "lint": "next lint"                  # 运行代码检查
   "prisma:generate": "prisma generate"
   "prisma:update": "npx prisma migrate dev --name"
   "prisma:studio": "prisma studio"
   ```

## 🔄 定时任务

系统使用 [Cronicle](https://github.com/jhuckaby/Cronicle) 进行定时任务管理：

1. **任务处理**
   - 调度：每 1 分钟
   - API：
     - `/api/tasks/process`: 处理任务队列中的任务
        - 请求方法：`POST`
        - 请求头：`Content-Type: application/json`
        - 请求头：`Authorization: Bearer {API_TOKEN}`
     - `/api/avatar/process`: 处理头像队列中的任务
        - 请求方法：`POST`
        - 请求头：`Content-Type: application/json`
        - 请求头：`Authorization: Bearer {API_TOKEN}`
   - 功能：处理队列中的待处理任务
   - 类别：数据处理

### Cronicle 配置

1. **安装**
   ```bash
   # 安装 Cronicle
   docker run -d --name cron \
        --hostname manager1 \
        -p 3012:3012 --restart always  \
        -v ./data:/opt/cronicle/data  \
        -e CRONICLE_secret_key={API_TOKEN}  \
        cronicle/edge:latest manager
   ```

2. **配置**
   - 访问 Web 界面：`http://localhost:3012`
   - 默认凭据：admin/admin
   - 从 `schedule/` 目录添加任务插件
   - 在 Cronicle 仪表板中配置调度

3. **监控**
   - 在 Cronicle 仪表板查看任务日志
   - 监控任务执行历史
   - 设置任务失败邮件通知

## 🤝 参与贡献

1. Fork 本仓库
2. 创建特性分支 (`git checkout -b feature/amazing-feature`)
3. 提交更改 (`git commit -m '添加精彩特性'`)
4. 推送到分支 (`git push origin feature/amazing-feature`)
5. 提交 Pull Request

## 📄 许可证

本项目采用 MIT 许可证 - 查看 [LICENSE](LICENSE) 文件了解详情。

## 🙏 致谢

- OpenAI 提供 AI 能力支持
- Cloudflare 提供边缘计算支持
- 所有项目贡献者和用户 