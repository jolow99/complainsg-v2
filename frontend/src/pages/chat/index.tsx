import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ChatMessage } from './components/ChatMessage';
import { useChat } from '@/hooks/useChat';
import { Send, RotateCcw } from 'lucide-react';

interface ChatPageProps {
  // No props needed now since layout handles user info
}

export function ChatPage({}: ChatPageProps) {
  const [input, setInput] = useState('');
  const {
    conversationHistory,
    sendChatMessage,
    clearConversation,
    isLoading,
    error
  } = useChat();
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [conversationHistory]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    sendChatMessage(input.trim());
    setInput('');
  };

  return (
    <div className="flex h-full flex-col">
      {/* Chat Header */}
      <div className="flex items-center justify-between border-b px-6 py-4">
        <div>
          <h1 className="text-lg font-semibold">Chat Assistant</h1>
          <p className="text-sm text-muted-foreground">
            Ask me anything. I'm here to help!
          </p>
        </div>
        <Button
          onClick={clearConversation}
          variant="outline"
          size="sm"
          disabled={conversationHistory.length === 0}
        >
          <RotateCcw className="h-4 w-4 mr-2" />
          Clear Chat
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
                {isLoading && (
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