import { Send, Loader2 } from 'lucide-react';

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

  return (
    <div className="border-t border-foreground/[0.05] p-4">
      <div className="flex gap-3 items-end">
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Ask your career coach..."
          rows={1}
          className="flex-1 resize-none input-field min-h-[44px] max-h-32"
          style={{ height: 'auto' }}
          onInput={(e) => {
            const target = e.target as HTMLTextAreaElement;
            target.style.height = 'auto';
            target.style.height = Math.min(target.scrollHeight, 128) + 'px';
          }}
        />
        <button
          onClick={onSendMessage}
          disabled={!input.trim() || isPending}
          className="btn-primary h-11 w-11 rounded-xl p-0 shrink-0 disabled:opacity-50"
        >
          {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
        </button>
      </div>
      <p className="mt-2 text-center text-xs text-muted-foreground">
        Press Enter to send • Shift+Enter for new line
      </p>
    </div>
  );
}
