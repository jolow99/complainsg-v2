import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type { ChatMessage } from '@/types/chat';

export function useChat() {
  const [conversationHistory, setConversationHistory] = useState<ChatMessage[]>([]);

  const sendMessage = useMutation({
    mutationFn: api.sendChatMessage,
    onSuccess: (data) => {
      setConversationHistory(data.conversation_history);
    },
  });

  const sendChatMessage = (message: string) => {
    sendMessage.mutate({
      message,
      conversation_history: conversationHistory,
    });
  };

  const clearConversation = () => {
    setConversationHistory([]);
  };

  return {
    conversationHistory,
    sendChatMessage,
    clearConversation,
    isLoading: sendMessage.isPending,
    error: sendMessage.error,
    lastResponse: sendMessage.data?.response,
  };
}