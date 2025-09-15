import { Card } from '@/components/ui/card';

interface ChatMessageProps {
  message: string;
  isUser: boolean;
}

export function ChatMessage({ message, isUser }: ChatMessageProps) {
  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'} mb-4`}>
      <Card className={`max-w-[80%] p-3 ${
        isUser
          ? 'bg-blue-500 text-white'
          : 'bg-muted'
      }`}>
        <div className="flex items-start gap-2">
          <div className="text-sm font-medium">
            {isUser ? '👤 You' : '🤖 Assistant'}
          </div>
        </div>
        <div className="mt-1 text-sm whitespace-pre-wrap">
          {message}
        </div>
      </Card>
    </div>
  );
}