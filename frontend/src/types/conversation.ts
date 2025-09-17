export interface Message {
  id: string
  conversation_id: string
  role: 'user' | 'assistant'
  content: string
  created_at: string
}

export interface Conversation {
  id: string
  user_id: string
  title: string
  created_at: string
  updated_at: string
  messages: Message[]
}

export interface ConversationListItem {
  id: string
  title: string
  created_at: string
  updated_at: string
  last_message?: string
}

export interface ChatRequest {
  message: string
  conversation_id?: string
  conversation_history?: Array<{
    user: string
    assistant: string
  }>
}

export interface ChatResponse {
  response: string
  conversation_id: string
  conversation_history: Array<{
    user: string
    assistant: string
  }>
}

export interface StreamingChatRequest {
  message: string
  conversation_id?: string
  conversationHistory?: Array<{role: string, content: string}>
  threadMetadata?: {
    topic: string
    summary: string
    location: string
    quality: number
  }
}

export interface StreamingChatResponse {
  response: string
  conversation_history: Array<{
    user: string
    assistant: string
  }>
  conversation_id: string
}