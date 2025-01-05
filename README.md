# AI Summary Yearly - Your Annual Digital Footprint Analysis

> 🌐 **[Visit AI Summary Yearly](https://aiyear.my)** - Generate your personalized annual digital footprint summary with AI

[English](README.md) | [中文](README_zh.md)

[![Visit Website](https://img.shields.io/badge/Visit-aiyear.my-blue)](https://aiyear.my)
[![GitHub License](https://img.shields.io/github/license/your-username/ai-diss-summary)](LICENSE)

## 🌟 Overview

AI Summary Yearly is an innovative platform that generates personalized annual summaries of your digital footprint using AI. Currently supporting GitHub data analysis, with Twitter and Jike integration coming soon.

## ✨ Features

### Currently Implemented
- **GitHub Integration**
  - Repository and contribution analysis
  - Code activity heatmaps
  - Language usage statistics
  - Personalized AI summaries using OpenAI
  - Custom avatar generation

- **AI-Powered Features**
  - OpenAI-driven content generation
  - Multiple summary styles:
    - Sarcastic mode
    - Best Diss mode
    - Classical mode
    - Praise mode
  - AI avatar generation with personality traits
  - Activity heatmaps and statistics

- **Interactive UI**
  - Real-time progress tracking
  - Shareable results
  - Downloadable summaries
  - Internationalization support:
    - English (en)
    - Chinese (zh)
    - Auto-language detection
    - Dynamic content translation
    - i18n with next-i18next

### Coming Soon
- **Twitter Integration**
  - Social activity analysis
  - Engagement metrics
  - Content highlights

- **Jike Integration**
  - Post analysis
  - Interaction patterns
  - Community engagement metrics

## 🛠 Tech Stack

- **Frontend**
  - Next.js 13
  - React 18
  - TailwindCSS
  - Framer Motion
  - TypeScript

- **Backend**
  - Next.js API Routes
  - Prisma ORM
  - Neon Database (PostgreSQL)
  - Cloudflare Workers

- **Authentication**
  - Clerk
  - Next-Auth

- **AI/ML**
  - OpenRouter API (OpenAI compatible)
  - Cloudflare AI

- **Storage**
  - Cloudflare R2
  - Supabase

## 🗃 Data Structure

### Core Models (Prisma Schema)
```prisma
// Key data models for task processing and user management
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

### Platform Data Structure
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

## ⚙️ Setup & Deployment

1. **Prerequisites**
   ```bash
   node >= 18.0.0
   npm >= 8.0.0
   ```

2. **Environment Variables**
   ```bash
   # Create .env file
   cp .env.example .env

   # Required variables
   DATABASE_URL=                    # PostgreSQL connection URL
   CLERK_SECRET_KEY=               # Clerk authentication key
   OPENROUTER_API_KEY=             # OpenRouter API key
   CLOUDFLARE_R2_ACCESS_KEY_ID=    # Cloudflare R2 access key
   CLOUDFLARE_R2_SECRET_KEY=       # Cloudflare R2 secret
   CLOUDFLARE_R2_BUCKET=           # R2 bucket name
   CLOUDFLARE_ACCOUNT_ID=          # Cloudflare account ID
   ```

3. **Database Setup**
   ```bash
   # Create database schema
   npx prisma db push

   # Generate Prisma client
   npm run prisma:generate

   # Initialize database (first time)
   npm run prisma:init-migration

   # Create new migration (when schema changes)
   npm run prisma:update "migration_name"

   # View database in Prisma Studio
   npm run prisma:studio
   ```

4. **Installation**
   ```bash
   # Install dependencies
   npm install

   # Install development dependencies
   npm install -D @types/node @types/react typescript
   ```

5. **Development**
   ```bash
   # Start development server
   npm run dev

   # Start worker development
   npm run worker:dev

   # Run tests
   npm run test
   npm run test:worker
   ```

6. **Production**
   ```bash
   # Build application
   npm run build:prod

   # Start production server
   npm run start:prod

   # Deploy worker
   npm run worker:deploy
   ```

7. **Scripts**
   ```bash
   # Available npm scripts
   "dev": "next dev"                    # Start development server
   "dev:local": "NODE_ENV=development next dev"
   "build": "next build"                # Build for production
   "build:prod": "NODE_ENV=production next build"
   "start": "next start"                # Start production server
   "start:prod": "NODE_ENV=production next start"
   "lint": "next lint"                  # Run linter
   "test": "vitest"                     # Run tests
   "test:worker": "cd workers && vitest test/worker.test.ts"
   "worker:dev": "cd workers && npm run dev"
   "worker:deploy": "cd workers && npm run deploy"
   "prisma:init-migration": "tsx scripts/init-migration.ts"
   "prisma:generate": "prisma generate"
   "prisma:update": "npx prisma migrate dev --name"
   "prisma:studio": "prisma studio"
   ```

## 🔄 CRON Jobs

The system uses [Cronicle](https://github.com/jhuckaby/Cronicle) for scheduled task management:

1. **Task Processing**
   - Schedule: Every 1 minute
   - APIs:
     - `/api/tasks/process`: Process tasks in the task queue
        - Method: `POST`
        - Headers: `Content-Type: application/json`
        - Headers: `Authorization: Bearer {API_TOKEN}`
     - `/api/avatar/process`: Process tasks in the avatar queue
        - Method: `POST`
        - Headers: `Content-Type: application/json`
        - Headers: `Authorization: Bearer {API_TOKEN}`
   - Function: Process pending tasks in the queue
   - Category: Data Processing

### Cronicle Setup

1. **Installation**
   ```bash
   # Install Cronicle
   docker run -d --name cron \
        --hostname manager1 \
        -p 3012:3012 --restart always  \
        -v ./data:/opt/cronicle/data  \
        -e CRONICLE_secret_key={API_TOKEN}  \
        cronicle/edge:latest manager
   ```

2. **Configuration**
   - Access the web interface at `http://localhost:3012`
   - Default credentials: admin/admin
   - Add the task plugins from the `schedule/` directory
   - Configure schedules in the Cronicle dashboard

3. **Monitoring**
   - View task logs in Cronicle dashboard
   - Monitor task execution history
   - Set up email notifications for task failures

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- OpenAI for AI capabilities
- Cloudflare for edge computing
- All contributors and users of the platform

## 🌐 Internationalization

The project uses `next-i18next` for internationalization support:

1. **Supported Languages**
   - English (en) - Default
   - Chinese (zh)

2. **Translation Files**
   ```
   /public/locales/
   ├── en/
   │   └── common.json
   └── zh/
       └── common.json
   ```

3. **Language Detection**
   - Automatic browser language detection
   - Manual language switching
   - Persistent language preference

4. **Content Types**
   - UI elements
   - Generated summaries
   - Error messages
   - System notifications
