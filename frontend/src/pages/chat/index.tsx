import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ChatMessage } from './components/ChatMessage';
import { useChatWithConversations } from '@/hooks/useChatWithConversations';
import { Send } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface ChatPageProps {
  conversationId?: string;
}

export function ChatPage({ conversationId }: ChatPageProps) {
  const [input, setInput] = useState('');
  const {
    conversationHistory,
    sendChatMessage,
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
      {/* Chat Messages */}
      <div className="flex-1 overflow-hidden">
        <div className="h-full flex flex-col">
          <div className="flex-1 overflow-y-auto scrollbar-hide">
            <div className="px-4 py-6 max-w-4xl mx-auto w-full">
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
                {conversationHistory.map((msg, index) => {
                  const isLastMessage = index === conversationHistory.length - 1;
                  const isStreamingThisMessage = isLastMessage && isStreaming && !msg.assistant;

                  return (
                    <div key={index}>
                      <ChatMessage message={msg.user} isUser={true} />
                      {/* Show assistant message or streaming content */}
                      {isStreamingThisMessage ? (
                        /* Streaming assistant message */
                        <div className="flex justify-start mb-4">
                          <Card className="max-w-[85%] p-4 bg-white dark:bg-gray-800 border shadow-sm">
                            <div className="flex items-center gap-2 mb-2">
                              <div className="w-6 h-6 bg-gradient-to-r from-purple-500 to-blue-500 rounded-full flex items-center justify-center text-white text-xs font-semibold">
                                AI
                              </div>
                              <div className="text-sm font-medium">Assistant</div>
                              <div className="text-xs text-blue-600 flex items-center gap-1">
                                <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
                                Streaming...
                              </div>
                            </div>
                            <div className="text-sm text-gray-900 dark:text-gray-100">
                              <div className="prose prose-sm max-w-none dark:prose-invert prose-pre:bg-transparent prose-pre:p-0 prose-pre:m-0 prose-p:my-4 prose-p:leading-relaxed">
                                <ReactMarkdown
                                  remarkPlugins={[remarkGfm]}
                                  components={{
                                    pre: ({ children, ...props }: any) => (
                                      <div className="relative group">
                                        <pre className="bg-gray-100 dark:bg-gray-800 p-3 rounded-md overflow-x-auto text-sm" {...props}>
                                          <code>{children}</code>
                                        </pre>
                                      </div>
                                    ),
                                    code: ({ node, ...props }: any) =>
                                      props.inline ? (
                                        <code className="bg-gray-100 dark:bg-gray-700 px-1 py-0.5 rounded text-xs font-mono" {...props} />
                                      ) : (
                                        <code {...props} />
                                      )
                                  }}
                                >
                                  {streamingMessage}
                                </ReactMarkdown>
                                <span className="inline-block w-0.5 h-4 ml-1 bg-blue-500 animate-pulse">|</span>
                              </div>
                            </div>
                          </Card>
                        </div>
                      ) : msg.assistant ? (
                        /* Completed assistant message */
                        <ChatMessage message={msg.assistant} isUser={false} />
                      ) : null}
                    </div>
                  );
                })}
                {/* Show loading state when not streaming */}
                {isLoading && !isStreaming && (
                  <div className="flex justify-start mb-4">
                    <Card className="max-w-[85%] p-4 bg-white dark:bg-gray-800 border shadow-sm">
                      <div className="flex items-center gap-2 mb-2">
                        <div className="w-6 h-6 bg-gradient-to-r from-purple-500 to-blue-500 rounded-full flex items-center justify-center text-white text-xs font-semibold">
                          AI
                        </div>
                        <div className="text-sm font-medium">Assistant</div>
                      </div>
                      <div className="text-sm">
                        <div className="flex items-center gap-1">
                          <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce [animation-delay:-0.3s]"></div>
                          <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce [animation-delay:-0.15s]"></div>
                          <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce"></div>
                        </div>
                      </div>
                    </Card>
                  </div>
                )}
                  <div ref={messagesEndRef} />
                </div>
              )}
            </div>
          </div>

          {/* Error Display */}
          {error && (
            <div className="px-4 pb-2">
              <div className="max-w-4xl mx-auto w-full">
                <div className="text-sm text-red-600 bg-red-50 dark:bg-red-950 p-3 rounded-md">
                  Error: {error.message}
                </div>
              </div>
            </div>
          )}

          {/* Input Form */}
          <div className="border-t bg-card/50 p-4">
            <div className="max-w-4xl mx-auto w-full">
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
    </div>
  );
}