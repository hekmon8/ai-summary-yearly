interface ShareData {
  title?: string
  text?: string
  url?: string
}

interface Navigator {
  share?: (data?: ShareData) => Promise<void>
}

declare module '@octokit/rest' {
  export class Octokit {
    constructor(options: { auth: string })
    users: {
      getByUsername(params: { username: string }): Promise<any>
    }
    repos: {
      listForUser(params: { username: string; sort: string; per_page: number }): Promise<any>
      listCommits(params: { owner: string; repo: string; author: string; since: string }): Promise<any>
    }
    activity: {
      listPublicEventsForUser(params: { username: string; per_page: number }): Promise<any>
    }
  }
}

declare module 'openai' {
  export class Configuration {
    constructor(options: { apiKey: string })
  }
  export class OpenAIApi {
    constructor(configuration: Configuration)
    createChatCompletion(params: {
      model: string
      messages: Array<{ role: string; content: string }>
      temperature: number
      max_tokens: number
    }): Promise<any>
  }
}

declare module 'qrcode' {
  export function toString(
    text: string,
    options?: {
      type?: string
      margin?: number
      width?: number
    }
  ): Promise<string>
} 