'use client';

import { useState, useRef, useEffect } from 'react';
import { AnimatePresence } from 'framer-motion';
import { Brain } from 'lucide-react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api-client';
import { createPortal } from 'react-dom';
import { ChatSidebar } from './_components/chat-sidebar';
import { ChatMessageList, Message } from './_components/chat-message-list';
import { ChatInput } from './_components/chat-input';
import { DeleteSessionModal } from './_components/delete-session-modal';

export default function CoachPage() {
  const [activeSession, setActiveSession] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [sessionToDelete, setSessionToDelete] = useState<string | null>(null);
  const [chatError, setChatError] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const queryClient = useQueryClient();

  useEffect(() => {
    setMounted(true);
  }, []);

  const { data: sessions } = useQuery({
    queryKey: ['coaching-sessions'],
    queryFn: () => api.get<any[]>('/coaching/sessions'),
  });

  const { mutate: startSession, isPending: isStarting } = useMutation({
    mutationFn: (message: string) =>
      api.post<{ sessionId: string; response: string }>('/coaching/sessions', { message }),
    onMutate: (message) => {
      setChatError(null);
      setMessages([{ role: 'user', content: message, timestamp: new Date().toISOString() }]);
    },
    onSuccess: (data) => {
      setActiveSession(data.sessionId);
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', content: data.response, timestamp: new Date().toISOString() },
      ]);
      queryClient.invalidateQueries({ queryKey: ['coaching-sessions'] });
    },
    onError: (err: any) => {
      setChatError(err.message || 'Failed to start session');
      setMessages([]);
    }
  });

  const { mutate: continueSession, isPending: isContinuing } = useMutation({
    mutationFn: (message: string) =>
      api.post<{ response: string }>(`/coaching/sessions/${activeSession}/messages`, { message }),
    onMutate: (message) => {
      setChatError(null);
      setMessages((prev) => [
        ...prev,
        { role: 'user', content: message, timestamp: new Date().toISOString() },
      ]);
    },
    onSuccess: (data) => {
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', content: data.response, timestamp: new Date().toISOString() },
      ]);
    },
    onError: (err: any) => {
      setChatError(err.message || 'Failed to send message');
      setMessages((prev) => prev.filter(m => m.role !== 'user' || m.content !== err.variables));
    }
  });

  const { mutate: deleteSession } = useMutation({
    mutationFn: (sessionId: string) => api.delete(`/coaching/sessions/${sessionId}`),
    onSuccess: (_, deletedId) => {
      queryClient.invalidateQueries({ queryKey: ['coaching-sessions'] });
      if (activeSession === deletedId) {
        setActiveSession(null);
        setMessages([]);
      }
      setSessionToDelete(null);
    },
  });

  const { data: loadedSession } = useQuery({
    queryKey: ['coaching-session', activeSession],
    queryFn: () => api.get<any>(`/coaching/sessions/${activeSession}`),
    enabled: !!activeSession && messages.length === 0,
  });

  useEffect(() => {
    if (loadedSession?.messages) {
      setMessages(loadedSession.messages);
    }
  }, [loadedSession]);

  useEffect(() => {
    const lastMessage = messages[messages.length - 1];
    if (lastMessage?.role === 'user' || isStarting || isContinuing) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isStarting, isContinuing]);

  const isPending = isStarting || isContinuing;

  const sendMessage = (overrideText?: string) => {
    const textToSend = typeof overrideText === 'string' ? overrideText : input;
    const trimmed = textToSend.trim();
    if (!trimmed || isPending) return;
    setInput('');

    if (activeSession) {
      continueSession(trimmed);
    } else {
      startSession(trimmed);
    }
  };

  const loadSession = (sessionId: string) => {
    setActiveSession(sessionId);
    setMessages([]);
  };

  const newChat = () => {
    setActiveSession(null);
    setMessages([]);
  };

  return (
    <div className="flex h-[calc(100vh-8rem)] gap-4">
      {/* Session sidebar */}
      <ChatSidebar
        sessions={sessions || []}
        activeSession={activeSession}
        onNewChat={newChat}
        onLoadSession={loadSession}
        onDeleteRequest={setSessionToDelete}
      />

      {/* Chat area */}
      <div className="flex flex-1 flex-col glass-card overflow-hidden">
        {/* Header */}
        <div className="flex items-center gap-3 border-b border-foreground/[0.05] p-4">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-brand-500 to-violet-500">
            <Brain className="h-4.5 w-4.5 text-white" />
          </div>
          <div>
            <div className="font-semibold">CareerCoach AI</div>
            <div className="flex items-center gap-1.5 text-xs text-emerald-400">
              <div className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
              Online • Ready to help
            </div>
          </div>
        </div>

        {/* Messages */}
        <ChatMessageList
          messages={messages}
          isPending={isPending}
          chatError={chatError}
          messagesEndRef={messagesEndRef}
          onSendMessage={sendMessage}
        />

        {/* Input */}
        <ChatInput
          input={input}
          setInput={setInput}
          isPending={isPending}
          onSendMessage={sendMessage}
        />
      </div>

      {/* Delete Confirmation Modal */}
      {mounted && createPortal(
        <AnimatePresence>
          {sessionToDelete && (
            <DeleteSessionModal
              onClose={() => setSessionToDelete(null)}
              onConfirm={() => deleteSession(sessionToDelete)}
            />
          )}
        </AnimatePresence>,
        document.body
      )}
    </div>
  );
}
