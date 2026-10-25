import { Send, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

export function ChatInput({
  input,
  setInput,
  isPending,
  onSendMessage,
}: {
  input: string;
  setInput: (value: string) => void;
  isPending: boolean;
  onSendMessage: () => void;
}) {
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      onSendMessage();
    }
  };

  const canSend = !!input.trim() && !isPending;

  return (
    <div className="shrink-0 border-t border-white/10 bg-card/70 p-3 backdrop-blur-md sm:p-4">
      <div className="flex items-end gap-2 rounded-2xl border border-white/10 bg-white/[0.04] p-1.5 transition-all focus-within:border-primary/60 focus-within:shadow-glow sm:gap-3">
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Ask your career coach..."
          rows={1}
          className="max-h-32 min-h-[44px] min-w-0 flex-1 resize-none bg-transparent px-3 py-3 text-sm text-foreground outline-none placeholder:text-muted-foreground/70"
          style={{ height: 'auto' }}
          onInput={(e) => {
            const target = e.target as HTMLTextAreaElement;
            target.style.height = 'auto';
            target.style.height = Math.min(target.scrollHeight, 128) + 'px';
          }}
        />
        <button
          onClick={() => onSendMessage()}
          disabled={!canSend}
          aria-label="Send message"
          className={cn(
            'btn-primary h-11 w-11 shrink-0 rounded-xl p-0',
            !canSend && 'opacity-50',
          )}
        >
          {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
        </button>
      </div>
      <p className="mt-2 hidden text-center text-xs text-muted-foreground sm:block">
        Press Enter to send • Shift+Enter for new line
      </p>
    </div>
  );
}
