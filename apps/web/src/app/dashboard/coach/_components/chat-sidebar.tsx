import { Plus, Trash2 } from 'lucide-react';
import { formatRelativeTime, cn } from '@/lib/utils';

export function ChatSidebar({
  sessions,
  activeSession,
  onNewChat,
  onLoadSession,
  onDeleteRequest,
}: {
  sessions: any[];
  activeSession: string | null;
  onNewChat: () => void;
  onLoadSession: (id: string) => void;
  onDeleteRequest: (id: string) => void;
}) {
  return (
    <div className="hidden w-56 flex-col gap-2 lg:flex">
      <button onClick={onNewChat} className="btn-primary py-2 px-4 text-sm w-full">
        <Plus className="h-4 w-4" /> New Chat
      </button>

      <div className="flex-1 overflow-y-auto space-y-1">
        {sessions?.map((session: any) => (
          <div
            key={session.id}
            className={cn(
              'group flex items-center justify-between w-full rounded-xl px-2 py-2 text-left text-sm transition-colors',
              activeSession === session.id ? 'bg-brand-500/10 text-brand-300' : 'text-muted-foreground hover:bg-foreground/5 hover:text-foreground',
            )}
          >
            <button
              onClick={() => onLoadSession(session.id)}
              className="flex-1 overflow-hidden text-left pl-1"
            >
              <div className="truncate font-medium">{session.title || 'Untitled'}</div>
              <div className="text-xs opacity-60">{formatRelativeTime(session.updatedAt)}</div>
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onDeleteRequest(session.id);
              }}
              className="opacity-0 group-hover:opacity-100 p-1.5 hover:bg-destructive/10 hover:text-destructive text-muted-foreground rounded-md transition-all shrink-0"
              title="Delete chat"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
