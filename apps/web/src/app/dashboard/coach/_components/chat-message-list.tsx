import { RefObject } from 'react';
import { motion } from 'framer-motion';
import { Brain, User, Sparkles } from 'lucide-react';
import { formatRelativeTime, cn } from '@/lib/utils';

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
    <div className="flex-1 overflow-y-auto p-4 space-y-4">
      {messages.length === 0 ? (
        <div className="flex flex-col items-center justify-start py-8 md:py-12 text-center h-fit min-h-full">
          <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-brand-500 to-violet-500">
            <Sparkles className="h-8 w-8 text-white" />
          </div>
          <h2 className="font-display text-xl font-semibold mb-2">How can I help your career today?</h2>
          <p className="text-sm text-muted-foreground mb-8 max-w-md">
            Ask me anything about career transitions, interview prep, salary negotiation, resume tips, or skill development.
          </p>
          <div className="grid gap-2 w-full max-w-lg">
            {STARTER_PROMPTS.map((prompt) => (
              <button
                key={prompt}
                onClick={() => onSendMessage(prompt)}
                className="rounded-xl border border-border bg-muted/30 px-4 py-2.5 text-left text-sm text-muted-foreground hover:border-brand-500/30 hover:bg-brand-500/5 hover:text-foreground transition-all"
              >
                {prompt}
              </button>
            ))}
          </div>
        </div>
      ) : (
        messages.map((message, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className={cn('flex gap-3', message.role === 'user' ? 'flex-row-reverse' : '')}
          >
            <div className={cn(
              'flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold',
              message.role === 'user'
                ? 'bg-brand-500 text-white'
                : 'bg-gradient-to-br from-violet-500 to-brand-500 text-white',
            )}>
              {message.role === 'user' ? <User className="h-4 w-4" /> : <Brain className="h-4 w-4" />}
            </div>
            <div className={cn(
              'max-w-[75%] rounded-2xl px-4 py-3 text-sm leading-relaxed',
              message.role === 'user'
                ? 'bg-brand-500/20 text-foreground rounded-tr-sm'
                : 'bg-foreground/5 text-foreground rounded-tl-sm',
            )}>
              <div className="whitespace-pre-wrap">{message.content}</div>
              <div className="mt-1 text-[10px] text-muted-foreground/60">
                {formatRelativeTime(message.timestamp)}
              </div>
            </div>
          </motion.div>
        ))
      )}

      {isPending && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex gap-3">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-violet-500 to-brand-500">
            <Brain className="h-4 w-4 text-white" />
          </div>
          <div className="rounded-2xl rounded-tl-sm bg-foreground/5 px-4 py-3">
            <div className="flex gap-1">
              {[0, 0.2, 0.4].map((delay) => (
                <div
                  key={delay}
                  className="h-2 w-2 rounded-full bg-muted-foreground animate-bounce"
                  style={{ animationDelay: `${delay}s` }}
                />
              ))}
            </div>
          </div>
        </motion.div>
      )}

      {chatError && (
        <div className="mx-4 mb-4 rounded-xl bg-destructive/10 p-4 text-sm text-destructive border border-destructive/20">
          Error: {chatError}
        </div>
      )}

      <div ref={messagesEndRef} />
    </div>
  );
}
