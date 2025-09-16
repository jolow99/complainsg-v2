import { Card } from '@/components/ui/card';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Copy, Check } from 'lucide-react';
import { useState } from 'react';

interface ChatMessageProps {
  message: string;
  isUser: boolean;
}

// Simple code block component with copy functionality
const CodeBlock = ({ children, ...props }: any) => {
  const [copied, setCopied] = useState(false);
  const codeContent = children?.[0] || children;

  const handleCopy = async () => {
    await navigator.clipboard.writeText(codeContent);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="relative group">
      <button
        onClick={handleCopy}
        className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity bg-gray-700 hover:bg-gray-600 text-white p-1.5 rounded text-xs flex items-center gap-1 z-10"
      >
        {copied ? (
          <><Check className="h-3 w-3" /> Copied</>
        ) : (
          <><Copy className="h-3 w-3" /> Copy</>
        )}
      </button>
      <pre className="bg-gray-100 dark:bg-gray-800 p-3 rounded-md overflow-x-auto text-sm" {...props}>
        <code>{children}</code>
      </pre>
    </div>
  );
};

export function ChatMessage({ message, isUser }: ChatMessageProps) {
  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'} mb-4`}>
      <Card className={`max-w-[85%] p-4 ${
        isUser
          ? 'bg-blue-500 text-white'
          : 'bg-white dark:bg-gray-800 border shadow-sm'
      }`}>
        <div className="flex items-start gap-2 mb-2">
          <div className="text-sm font-medium flex items-center gap-2">
            {isUser ? (
              <>
                <div className="w-6 h-6 bg-blue-600 rounded-full flex items-center justify-center text-white text-xs font-semibold">
                  U
                </div>
                You
              </>
            ) : (
              <>
                <div className="w-6 h-6 bg-gradient-to-r from-purple-500 to-blue-500 rounded-full flex items-center justify-center text-white text-xs font-semibold">
                  AI
                </div>
                Assistant
              </>
            )}
          </div>
        </div>
        <div className={`text-sm ${
          isUser
            ? 'text-white'
            : 'text-gray-900 dark:text-gray-100'
        }`}>
          {isUser ? (
            <div className="whitespace-pre-wrap">{message}</div>
          ) : (
            <div className="prose prose-base max-w-none dark:prose-invert prose-pre:bg-transparent prose-pre:p-0 prose-pre:m-0 prose-p:my-6 prose-p:leading-relaxed prose-li:my-2 prose-ul:my-4 prose-ol:my-4">
              <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                breaks={true}
                components={{
                  pre: CodeBlock,
                  code: ({ node, ...props }: any) =>
                    props.inline ? (
                      <code className="bg-gray-100 dark:bg-gray-700 px-1 py-0.5 rounded text-xs font-mono" {...props} />
                    ) : (
                      <code {...props} />
                    )
                }}
              >
                {message}
              </ReactMarkdown>
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}