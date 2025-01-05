export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      user_credits: {
        Row: {
          user_id: string
          credits: number
          created_at: string
          updated_at: string
        }
        Insert: {
          user_id: string
          credits: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          credits?: number
          updated_at?: string
        }
      }
      generated_images: {
        Row: {
          id: string
          user_id: string
          image_url: string
          style: string
          platform: string
          username: string
          created_at: string
        }
        Insert: {
          user_id: string
          image_url: string
          style: string
          platform: string
          username: string
          created_at?: string
        }
        Update: {
          image_url?: string
          style?: string
          platform?: string
          username?: string
        }
      }
    }
    Functions: {
      add_user_credits: {
        Args: {
          p_user_id: string
          p_credits: number
        }
        Returns: void
      }
      use_credits: {
        Args: {
          p_user_id: string
          p_credits: number
        }
        Returns: boolean
      }
      record_generation: {
        Args: {
          p_user_id: string
          p_image_url: string
          p_style: string
          p_platform: string
          p_username: string
        }
        Returns: string
      }
      get_user_history: {
        Args: {
          p_user_id: string
          p_limit?: number
          p_offset?: number
        }
        Returns: {
          id: string
          image_url: string
          style: string
          platform: string
          username: string
          created_at: string
        }[]
      }
    }
  }
} 