export interface ChatMessage {
  user: string;
  assistant: string;
}

export interface ChatRequest {
  message: string;
  conversation_id?: string;
  conversation_history?: ChatMessage[];
}

export interface ChatResponse {
  response: string;
  conversation_id: string;
  conversation_history: ChatMessage[];
}