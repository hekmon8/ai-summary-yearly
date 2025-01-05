export interface User {
  id: string
  email: string
  name: string | null
  avatarUrl: string | null
  githubId: string | null
  createdAt: Date
  updatedAt: Date
}

export interface Session {
  user: User
  expires: Date
} 