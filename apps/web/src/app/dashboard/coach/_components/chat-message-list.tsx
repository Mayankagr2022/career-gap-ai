import { RefObject } from 'react';
import { motion } from 'framer-motion';
import { Brain, User, Sparkles, ArrowUpRight } from 'lucide-react';
import { formatRelativeTime, cn } from '@/lib/utils';
import { ChatMarkdown } from './chat-markdown';

export interface Message {
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
}

const STARTER_PROMPTS = [
  'How do I negotiate a higher salary for a senior role?',
  'What are the most important skills for transitioning to ML engineering?',
  'Help me prepare for a behavioral interview at a FAANG company',
  'How can I explain a 2-year employment gap on my resume?',
  'What should I put in my LinkedIn headline to attract recruiters?',
];

export function ChatMessageList({
  messages,
  isPending,
  chatError,
  messagesEndRef,
  onSendMessage,
}: {
  messages: Message[];
  isPending: boolean;
  chatError: string | null;
  messagesEndRef: RefObject<HTMLDivElement | null>;
  onSendMessage: (prompt: string) => void;
}) {
  return (
    <div className="min-h-0 flex-1 space-y-5 overflow-y-auto overflow-x-hidden px-3 py-4 sm:px-5">
      {messages.length === 0 ? (
        <div className="flex min-h-full flex-col items-center justify-center py-6 text-center">
          <div className="relative mb-6 flex h-20 w-20 items-center justify-center">
            <span className="absolute inset-0 animate-pulse-ring rounded-full bg-brand-500/30" />
            <div className="relative flex h-16 w-16 animate-float items-center justify-center rounded-2xl bg-gradient-to-br from-brand-500 to-violet-500 shadow-glow">
              <Sparkles className="h-8 w-8 text-white" />
            </div>
          </div>
          <h2 className="mb-2 font-display text-xl font-semibold sm:text-2xl">
            How can I help your <span className="gradient-text">career</span> today?
          </h2>
          <p className="mb-8 max-w-md text-sm text-muted-foreground">
            Ask me anything about career transitions, interview prep, salary negotiation, resume tips, or skill development.
          </p>
          <div className="flex w-full max-w-2xl flex-wrap justify-center gap-2">
            {STARTER_PROMPTS.map((prompt, i) => (
              <motion.button
                key={prompt}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 + i * 0.06, duration: 0.3 }}
                onClick={() => onSendMessage(prompt)}
                className="group inline-flex min-h-[40px] max-w-full items-center gap-2 rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-2 text-left text-sm text-muted-foreground transition-all hover:-translate-y-0.5 hover:border-brand-400/50 hover:bg-brand-500/10 hover:text-foreground"
              >
                <span className="min-w-0">{prompt}</span>
                <ArrowUpRight className="h-3.5 w-3.5 shrink-0 opacity-0 transition-opacity group-hover:opacity-100" />
              </motion.button>
            ))}
          </div>
        </div>
      ) : (
        messages.map((message, i) => {
          const isUser = message.role === 'user';
          return (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.25 }}
              className={cn('flex gap-2.5 sm:gap-3', isUser && 'flex-row-reverse')}
            >
              <div
                className={cn(
                  'flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-white ring-1 ring-white/10',
                  isUser ? 'bg-gradient-to-br from-violet-500 to-brand-500' : 'bg-gradient-to-br from-brand-500 to-cyan-500 shadow-glow',
                )}
              >
                {isUser ? <User className="h-4 w-4" /> : <Brain className="h-4 w-4" />}
              </div>
              <div
                className={cn(
                  'min-w-0 max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-relaxed sm:max-w-[75%]',
                  isUser
                    ? 'rounded-tr-sm bg-gradient-to-br from-brand-500 to-violet-500 text-white shadow-glow'
                    : 'rounded-tl-sm border border-white/10 bg-white/[0.05] text-foreground',
                )}
              >
                {isUser ? (
                  <div className="whitespace-pre-wrap break-words">{message.content}</div>
                ) : (
                  <ChatMarkdown content={message.content} />
                )}
                <div className={cn('mt-1 text-[10px]', isUser ? 'text-white/70' : 'text-muted-foreground/70')}>
                  {formatRelativeTime(message.timestamp)}
                </div>
              </div>
            </motion.div>
          );
        })
      )}

      {isPending && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex gap-2.5 sm:gap-3">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-brand-500 to-cyan-500 shadow-glow ring-1 ring-white/10">
            <Brain className="h-4 w-4 text-white" />
          </div>
          <div className="rounded-2xl rounded-tl-sm border border-white/10 bg-white/[0.05] px-4 py-3.5">
            <div className="flex gap-1.5">
              {[0, 0.15, 0.3].map((delay) => (
                <div
                  key={delay}
                  className="h-2 w-2 animate-bounce rounded-full bg-gradient-to-br from-brand-400 to-violet-400"
                  style={{ animationDelay: `${delay}s` }}
                />
              ))}
            </div>
          </div>
        </motion.div>
      )}

      {chatError && (
        <div className="rounded-xl border border-destructive/30 bg-destructive/10 p-4 text-sm text-red-300">
          Error: {chatError}
        </div>
      )}

      <div ref={messagesEndRef} />
    </div>
  );
}
