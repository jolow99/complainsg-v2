import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ChatMessage } from './components/ChatMessage';
import { useChatWithConversations } from '@/hooks/useChatWithConversations';
import { Send, RotateCcw } from 'lucide-react';

interface ChatPageProps {
  conversationId?: string;
}

export function ChatPage({ conversationId }: ChatPageProps) {
  const [input, setInput] = useState('');
  const {
    conversationHistory,
    currentConversationId,
    sendChatMessage,
    clearConversation,
    isLoading,
    loadingConversation,
    error,
    streamingMessage,
    isStreaming
  } = useChatWithConversations(conversationId);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [conversationHistory, streamingMessage]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    sendChatMessage(input.trim());
    setInput('');
  };

  // Show loading state while loading conversation
  if (loadingConversation) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="mt-2 text-muted-foreground">Loading conversation...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex h-full flex-col">
      {/* Chat Header */}
      <div className="flex items-center justify-between border-b px-6 py-4">
        <div>
          <h1 className="text-lg font-semibold">
            {currentConversationId ? 'Chat Conversation' : 'New Chat'}
          </h1>
          <p className="text-sm text-muted-foreground">
            {currentConversationId
              ? 'Continue your conversation'
              : 'Ask me anything. I\'m here to help!'
            }
          </p>
        </div>
        <Button
          onClick={clearConversation}
          variant="outline"
          size="sm"
          disabled={conversationHistory.length === 0}
        >
          <RotateCcw className="h-4 w-4 mr-2" />
          {currentConversationId ? 'New Chat' : 'Clear Chat'}
        </Button>
      </div>

      {/* Chat Messages */}
      <div className="flex-1 overflow-hidden">
        <div className="h-full flex flex-col">
          <div className="flex-1 overflow-y-auto p-4">
            {conversationHistory.length === 0 ? (
              <div className="h-full flex items-center justify-center">
                <Card className="w-full max-w-md text-center">
                  <CardHeader>
                    <CardTitle className="text-xl">👋 Start a conversation!</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-muted-foreground">
                      Ask me anything. I'm here to help with questions, tasks, or just have a chat.
                    </p>
                  </CardContent>
                </Card>
              </div>
            ) : (
              <div className="space-y-4">
                {conversationHistory.map((msg, index) => (
                  <div key={index}>
                    <ChatMessage message={msg.user} isUser={true} />
                    <ChatMessage message={msg.assistant} isUser={false} />
                  </div>
                ))}
                {/* Show streaming message in real-time */}
                {isStreaming && streamingMessage && (
                  <div className="flex justify-start mb-4">
                    <Card className="max-w-[80%] p-3 bg-muted">
                      <div className="flex items-center gap-2">
                        <div className="text-sm font-medium">🤖 Assistant</div>
                        <div className="text-xs text-blue-600">✍️ Streaming...</div>
                      </div>
                      <div className="mt-1 text-sm whitespace-pre-wrap">
                        {streamingMessage}
                        <span className="inline-block w-2 h-4 ml-1 bg-current animate-pulse">|</span>
                      </div>
                    </Card>
                  </div>
                )}
                {/* Show loading state when not streaming */}
                {isLoading && !isStreaming && (
                  <div className="flex justify-start mb-4">
                    <Card className="max-w-[80%] p-3 bg-muted">
                      <div className="flex items-center gap-2">
                        <div className="text-sm font-medium">🤖 Assistant</div>
                      </div>
                      <div className="mt-1 text-sm">
                        <div className="flex items-center gap-1">
                          <div className="w-2 h-2 bg-current rounded-full animate-bounce [animation-delay:-0.3s]"></div>
                          <div className="w-2 h-2 bg-current rounded-full animate-bounce [animation-delay:-0.15s]"></div>
                          <div className="w-2 h-2 bg-current rounded-full animate-bounce"></div>
                        </div>
                      </div>
                    </Card>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>
            )}
          </div>

          {/* Error Display */}
          {error && (
            <div className="px-4 pb-2">
              <div className="text-sm text-red-600 bg-red-50 dark:bg-red-950 p-3 rounded-md">
                Error: {error.message}
              </div>
            </div>
          )}

          {/* Input Form */}
          <div className="border-t bg-card/50 p-4">
            <form onSubmit={handleSubmit} className="flex gap-2">
              <Input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Type your message..."
                disabled={isLoading}
                className="flex-1"
              />
              <Button type="submit" disabled={!input.trim() || isLoading}>
                <Send className="h-4 w-4" />
              </Button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}