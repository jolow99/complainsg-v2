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

// Streaming complaint function - handles new complaint processing endpoints
export async function streamChatMessage(
  request: StreamingChatRequest,
  onChunk: (content: string) => void,
  onComplete: (fullResponse: string, conversationId?: string) => void,
  onError: (error: string) => void
): Promise<void> {
  try {
    // Step 1: Create complaint task
    const taskResponse = await fetch(`${API_BASE_URL}/api/complaint`, {
      method: 'POST',
      headers: await getAuthHeaders(),
      body: JSON.stringify({
        message: request.message,
        user_answers: [], // Can be extended later for multi-turn conversations
        user_contact: null // Can be extended later for user contact info
      })
    })

    if (!taskResponse.ok) {
      throw new Error(`Failed to create complaint task: ${taskResponse.status}`)
    }

    const { task_id } = await taskResponse.json()

    // Step 2: Stream the results using Server-Sent Events
    const streamResponse = await fetch(`${API_BASE_URL}/api/complaint/stream/${task_id}`, {
      headers: await getAuthHeaders()
    })

    if (!streamResponse.ok) {
      throw new Error(`Failed to stream complaint processing: ${streamResponse.status}`)
    }

    const reader = streamResponse.body?.getReader()
    if (!reader) {
      throw new Error('No response body available')
    }

    const decoder = new TextDecoder()
    let fullResponse = ''

    while (true) {
      const { done, value } = await reader.read()
      if (done) break

      const chunk = decoder.decode(value, { stream: true })
      const lines = chunk.split('\n')

      for (const line of lines) {
        if (line.startsWith('data: ')) {
          try {
            const data = JSON.parse(line.slice(6))

            if (data.done) {
              // Streaming complete
              onComplete(fullResponse, request.conversation_id?.toString())
              return
            }

            if (data.content) {
              fullResponse += data.content
              onChunk(data.content)
            }
          } catch (parseError) {
            // Skip malformed JSON lines
            continue
          }
        }
      }
    }

    // If we get here without seeing done:true, still complete
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