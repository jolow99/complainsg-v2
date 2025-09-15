import { useState, useEffect } from 'react'
import { useConversation } from './useConversations'
import { streamChatMessage, saveChatMessage } from '@/api/conversations'
import type { ChatMessage } from '@/types/chat'

export function useChatWithConversations(conversationId?: string) {
  const [conversationHistory, setConversationHistory] = useState<ChatMessage[]>([])
  const [currentConversationId, setCurrentConversationId] = useState<string | undefined>(conversationId)

  // Streaming states
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [streamingMessage, setStreamingMessage] = useState<string>('')
  const [isStreaming, setIsStreaming] = useState(false)

  // Load existing conversation if conversationId is provided
  const { data: conversation, isLoading: loadingConversation } = useConversation(conversationId)

  // Update conversation history when conversation data loads
  useEffect(() => {
    if (conversation?.messages) {
      const history: ChatMessage[] = []
      for (let i = 0; i < conversation.messages.length; i += 2) {
        const userMessage = conversation.messages[i]
        const assistantMessage = conversation.messages[i + 1]

        if (userMessage?.role === 'user' && assistantMessage?.role === 'assistant') {
          history.push({
            user: userMessage.content,
            assistant: assistantMessage.content
          })
        }
      }
      setConversationHistory(history)
      setCurrentConversationId(conversation.id)
    } else if (!conversationId) {
      // If no conversationId provided, start with empty history
      setConversationHistory([])
      setCurrentConversationId(undefined)
    }
  }, [conversation, conversationId])

  // Update conversation ID when starting a new conversation
  useEffect(() => {
    setCurrentConversationId(conversationId)
  }, [conversationId])

  const sendChatMessage = async (message: string) => {
    try {
      setIsLoading(true)
      setIsStreaming(true)
      setError(null)
      setStreamingMessage('')

      // Add user message to history immediately
      const userMessage: ChatMessage = { user: message, assistant: '' }
      setConversationHistory(prev => [...prev, userMessage])

      return new Promise((resolve, reject) => {
        streamChatMessage(
          {
            message,
            conversation_id: currentConversationId
          },
          // onChunk - update streaming message
          (content: string) => {
            setStreamingMessage(prev => prev + content)
          },
          // onComplete - finalize and save
          async (fullResponse: string, conversationId?: string) => {
            try {
              setIsStreaming(false)
              setStreamingMessage('')

              // Update the last message with the complete response
              setConversationHistory(prev => {
                const updated = [...prev]
                const lastIndex = updated.length - 1
                if (lastIndex >= 0) {
                  updated[lastIndex] = { ...updated[lastIndex], assistant: fullResponse }
                }
                return updated
              })

              // Save to database
              const saveResult = await saveChatMessage({
                message,
                response: fullResponse,
                conversation_id: currentConversationId
              })

              setCurrentConversationId(saveResult.conversation_id)

              resolve({
                response: fullResponse,
                conversation_id: saveResult.conversation_id,
                conversation_history: [...conversationHistory, { user: message, assistant: fullResponse }]
              })
            } catch (saveError) {
              console.error('Error saving message:', saveError)
              // Don't fail the whole operation if saving fails
              resolve({
                response: fullResponse,
                conversation_id: currentConversationId,
                conversation_history: [...conversationHistory, { user: message, assistant: fullResponse }]
              })
            }
          },
          // onError
          (errorMessage: string) => {
            setError(errorMessage)
            setIsStreaming(false)
            setStreamingMessage('')
            reject(new Error(errorMessage))
          }
        )
      })
    } catch (error) {
      const errorMessage = (error as Error).message
      setError(errorMessage)
      setIsStreaming(false)
      setStreamingMessage('')
      throw error
    } finally {
      setIsLoading(false)
    }
  }

  const clearConversation = () => {
    setConversationHistory([])
    setCurrentConversationId(undefined)
    setError(null)
    setStreamingMessage('')
    setIsStreaming(false)

    // Navigate to new chat
    window.history.pushState({}, '', '/chat')
  }

  return {
    conversationHistory,
    currentConversationId,
    sendChatMessage,
    clearConversation,
    isLoading: isLoading || isStreaming,
    loadingConversation,
    error: error ? { message: error } : null,
    lastResponse: null,
    // Streaming-specific properties
    streamingMessage,
    isStreaming,
  }
}