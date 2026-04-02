export interface Workspace {
  id: string
  name: string
  owner_id: string
  slug: string
  plan: 'free' | 'pro' | 'enterprise'
  // Billing fields (added by migration 003)
  messages_used_this_month?: number
  message_limit?: number
  subscription_status?: 'inactive' | 'active' | 'past_due' | 'canceled'
  billing_period_end?: string
  stripe_customer_id?: string
  created_at: string
}

export interface Bot {
  id: string
  workspace_id: string
  name: string
  avatar: string
  status: 'active' | 'inactive'
  llm_provider: 'anthropic' | 'openai' | 'gemini' | 'groq' | 'grok'
  llm_api_key_enc?: string
  llm_model?: string
  mode: 'kb' | 'agentic' | 'hybrid'
  touchpoints: string[]
  system_instructions: string
  knowledge_base: string
  primary_color: string
  bubble_color: string
  text_color: string
  position: 'bottom-right' | 'bottom-left' | 'top-right' | 'top-left'
  welcome_message: string
  widget_token: string
  allowed_origins: string[]
  created_at: string
  updated_at: string
  // Client-side only (decrypted, never persisted)
  llm_api_key?: string
}

export interface BotFormData extends Omit<Bot, 'id' | 'workspace_id' | 'widget_token' | 'created_at' | 'updated_at' | 'llm_api_key_enc'> {
  llm_api_key?: string
}

export interface Conversation {
  id: string
  bot_id: string
  session_id: string
  visitor_id?: string
  resolved: boolean
  started_at: string
  last_message_at: string
}

export interface Message {
  id: string
  conversation_id: string
  bot_id: string
  role: 'user' | 'assistant' | 'system'
  content: string
  tokens_used: number
  created_at: string
}

export interface AnalyticsDay {
  date: string
  total_messages: number
  total_conversations: number
  resolved_count: number
  unique_visitors: number
}
