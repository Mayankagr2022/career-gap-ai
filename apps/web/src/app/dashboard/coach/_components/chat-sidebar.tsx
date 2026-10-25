import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { Plus, Trash2, MessageSquare, X } from 'lucide-react';
import { formatRelativeTime, cn } from '@/lib/utils';

function SessionList({
  sessions,
  activeSession,
  onNewChat,
  onLoadSession,
  onDeleteRequest,
  alwaysShowDelete,
}: {
  sessions: any[];
  activeSession: string | null;
  onNewChat: () => void;
  onLoadSession: (id: string) => void;
  onDeleteRequest: (id: string) => void;
  alwaysShowDelete?: boolean;
}) {
  return (
    <>
      <button onClick={onNewChat} className="btn-primary w-full shrink-0 px-4 py-2.5 text-sm">
        <Plus className="h-4 w-4" /> New Chat
      </button>

      <div className="mt-1 flex-1 space-y-1 overflow-y-auto pr-0.5">
        {(!sessions || sessions.length === 0) && (
          <div className="flex flex-col items-center gap-2 px-3 py-8 text-center text-xs text-muted-foreground">
            <MessageSquare className="h-6 w-6 opacity-40" />
            Your conversations will show up here
          </div>
        )}
        {sessions?.map((session: any) => {
          const active = activeSession === session.id;
          return (
            <div
              key={session.id}
              className={cn(
                'group relative flex w-full items-center justify-between rounded-xl px-2 text-left text-sm transition-colors',
                active
                  ? 'bg-gradient-to-r from-brand-500/25 to-violet-500/10 text-white ring-1 ring-brand-400/30'
                  : 'text-muted-foreground hover:bg-white/[0.06] hover:text-foreground',
              )}
            >
              <button
                onClick={() => onLoadSession(session.id)}
                className="min-h-[48px] min-w-0 flex-1 overflow-hidden py-2 pl-1 text-left"
              >
                <div className="truncate font-medium">{session.title || 'Untitled'}</div>
                <div className="text-xs opacity-60">{formatRelativeTime(session.updatedAt)}</div>
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onDeleteRequest(session.id);
                }}
                className={cn(
                  'flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-muted-foreground transition-all hover:bg-red-500/10 hover:text-red-300',
                  alwaysShowDelete ? 'opacity-100' : 'opacity-0 focus-visible:opacity-100 group-hover:opacity-100',
                )}
                title="Delete chat"
                aria-label="Delete chat"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          );
        })}
      </div>
    </>
  );
}

export function ChatSidebar({
  sessions,
  activeSession,
  onNewChat,
  onLoadSession,
  onDeleteRequest,
  mobileOpen = false,
  onMobileClose,
}: {
  sessions: any[];
  activeSession: string | null;
  onNewChat: () => void;
  onLoadSession: (id: string) => void;
  onDeleteRequest: (id: string) => void;
  mobileOpen?: boolean;
  onMobileClose?: () => void;
}) {
  const close = () => onMobileClose?.();

  return (
    <>
      {/* Side panel on md+ */}
      <div className="glass-card hidden w-60 shrink-0 flex-col gap-2 p-3 md:flex lg:w-64">
        <SessionList
          sessions={sessions}
          activeSession={activeSession}
          onNewChat={onNewChat}
          onLoadSession={onLoadSession}
          onDeleteRequest={onDeleteRequest}
        />
      </div>

      {/* Drawer on phones (portaled so no ancestor transform/filter affects position: fixed) */}
      {typeof document !== 'undefined' &&
        createPortal(
          <AnimatePresence>
            {mobileOpen && (
              <motion.div
                key="coach-drawer"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.15 }}
                className="fixed inset-0 z-[60] bg-black/70 md:hidden"
                onClick={close}
              >
                <motion.aside
                  initial={{ x: '-100%' }}
                  animate={{ x: 0 }}
                  exit={{ x: '-100%' }}
                  transition={{ duration: 0.22, ease: 'easeOut' }}
                  className="flex h-full w-[86%] max-w-sm flex-col gap-2 border-r border-white/10 bg-card p-4 pt-5"
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className="mb-1 flex items-center justify-between">
                    <h3 className="font-display text-base font-semibold">Conversations</h3>
                    <button
                      onClick={close}
                      aria-label="Close conversations"
                      className="flex h-10 w-10 items-center justify-center rounded-xl text-muted-foreground hover:bg-white/[0.07] hover:text-foreground"
                    >
                      <X className="h-5 w-5" />
                    </button>
                  </div>
                  <SessionList
                    sessions={sessions}
                    activeSession={activeSession}
                    onNewChat={() => {
                      onNewChat();
                      close();
                    }}
                    onLoadSession={(id) => {
                      onLoadSession(id);
                      close();
                    }}
                    onDeleteRequest={(id) => {
                      close();
                      onDeleteRequest(id);
                    }}
                    alwaysShowDelete
                  />
                </motion.aside>
              </motion.div>
            )}
          </AnimatePresence>,
          document.body,
        )}
    </>
  );
}
