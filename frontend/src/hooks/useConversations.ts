import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  getConversations,
  getConversation,
  createConversation,
  updateConversationTitle,
  deleteConversation,
  sendChatMessage
} from '@/api/conversations'

export function useConversations() {
  return useQuery({
    queryKey: ['conversations'],
    queryFn: getConversations,
  })
}

export function useConversation(conversationId: string | undefined) {
  return useQuery({
    queryKey: ['conversations', conversationId],
    queryFn: () => conversationId ? getConversation(conversationId) : null,
    enabled: !!conversationId,
  })
}

export function useCreateConversation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: createConversation,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['conversations'] })
    },
  })
}

export function useUpdateConversationTitle() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ conversationId, title }: { conversationId: string; title: string }) =>
      updateConversationTitle(conversationId, title),
    onSuccess: (_, { conversationId }) => {
      queryClient.invalidateQueries({ queryKey: ['conversations'] })
      queryClient.invalidateQueries({ queryKey: ['conversations', conversationId] })
    },
  })
}

export function useDeleteConversation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: deleteConversation,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['conversations'] })
    },
  })
}

export function useSendChatMessage() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (request: Parameters<typeof sendChatMessage>[0]) => sendChatMessage(request),
    onSuccess: (data) => {
      // Invalidate conversations list to update last message
      queryClient.invalidateQueries({ queryKey: ['conversations'] })
      // Invalidate the specific conversation to refresh messages
      queryClient.invalidateQueries({ queryKey: ['conversations', data.conversation_id] })
    },
  })
}