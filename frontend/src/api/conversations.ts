import type {
  Conversation,
  ConversationListItem,
  ChatRequest,
  ChatResponse,
  StreamingChatRequest
} from '@/types/conversation'

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000'

async function getAuthHeaders() {
  const token = localStorage.getItem('access_token')
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {})
  }
}

export async function getConversations(): Promise<ConversationListItem[]> {
  const response = await fetch(`${API_BASE_URL}/conversations`, {
    headers: await getAuthHeaders()
  })

  if (!response.ok) {
    throw new Error('Failed to fetch conversations')
  }

  return response.json()
}

export async function getConversation(conversationId: string): Promise<Conversation> {
  const response = await fetch(`${API_BASE_URL}/conversations/${conversationId}`, {
    headers: await getAuthHeaders()
  })

  if (!response.ok) {
    throw new Error('Failed to fetch conversation')
  }

  return response.json()
}

export async function createConversation(title: string): Promise<Conversation> {
  const response = await fetch(`${API_BASE_URL}/conversations`, {
    method: 'POST',
    headers: await getAuthHeaders(),
    body: JSON.stringify({ title })
  })

  if (!response.ok) {
    throw new Error('Failed to create conversation')
  }

  return response.json()
}

export async function updateConversationTitle(
  conversationId: string,
  title: string
): Promise<Conversation> {
  const response = await fetch(`${API_BASE_URL}/conversations/${conversationId}`, {
    method: 'PUT',
    headers: await getAuthHeaders(),
    body: JSON.stringify({ title })
  })

  if (!response.ok) {
    throw new Error('Failed to update conversation')
  }

  return response.json()
}

export async function deleteConversation(conversationId: string): Promise<void> {
  const response = await fetch(`${API_BASE_URL}/conversations/${conversationId}`, {
    method: 'DELETE',
    headers: await getAuthHeaders()
  })

  if (!response.ok) {
    throw new Error('Failed to delete conversation')
  }
}

export async function sendChatMessage(request: ChatRequest): Promise<ChatResponse> {
  const response = await fetch(`${API_BASE_URL}/chat`, {
    method: 'POST',
    headers: await getAuthHeaders(),
    body: JSON.stringify(request)
  })

  if (!response.ok) {
    throw new Error('Failed to send chat message')
  }

  return response.json()
}

// Streaming chat function - handles streaming response body
export async function streamChatMessage(
  request: StreamingChatRequest,
  onChunk: (content: string) => void,
  onComplete: (fullResponse: string, conversationId?: string) => void,
  onError: (error: string) => void
): Promise<void> {
  try {
    const response = await fetch(`${API_BASE_URL}/chat/stream`, {
      method: 'POST',
      headers: await getAuthHeaders(),
      body: JSON.stringify(request)
    })

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }

    const reader = response.body?.getReader()
    if (!reader) {
      throw new Error('No response body available')
    }

    const decoder = new TextDecoder()
    let fullResponse = ''

    while (true) {
      const { done, value } = await reader.read()
      if (done) break

      const chunk = decoder.decode(value, { stream: true })

      // Check for end marker
      if (chunk.includes('[STREAM_END]')) {
        const beforeEnd = chunk.split('[STREAM_END]')[0]
        if (beforeEnd) {
          fullResponse += beforeEnd
          onChunk(beforeEnd)
        }
        // Streaming complete
        onComplete(fullResponse, request.conversation_id?.toString())
        return
      }

      // Check for error marker
      if (chunk.includes('[ERROR]:')) {
        const errorMsg = chunk.split('[ERROR]:')[1]?.trim() || 'Unknown error'
        onError(errorMsg)
        return
      }

      // Regular chunk - send to UI immediately
      fullResponse += chunk
      onChunk(chunk)
    }

    // If we get here without seeing [STREAM_END], still complete
    onComplete(fullResponse, request.conversation_id?.toString())

  } catch (error) {
    onError((error as Error).message)
  }
}

// Function to save conversation after streaming
export async function saveChatMessage(data: {
  message: string
  response: string
  conversation_id?: string
}): Promise<{ conversation_id: string }> {
  const response = await fetch(`${API_BASE_URL}/chat/save`, {
    method: 'POST',
    headers: await getAuthHeaders(),
    body: JSON.stringify(data)
  })

  if (!response.ok) {
    throw new Error('Failed to save chat message')
  }

  return response.json()
}