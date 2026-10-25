'use client';

import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Bell, CheckCircle2, AlertCircle, Info, X, ExternalLink } from 'lucide-react';
import { useNotifications } from '@/hooks/use-notifications';
import { formatRelativeTime } from '@/lib/utils';
import Link from 'next/link';

export function NotificationsDropdown() {
  const [isOpen, setIsOpen] = useState(false);
  const { data: notifications, isLoading, markAsRead, markAllAsRead } = useNotifications();
  const dropdownRef = useRef<HTMLDivElement>(null);

  const unreadCount = Array.isArray(notifications) ? notifications.filter(n => !n.isRead).length : 0;

  // Close when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const getIcon = (type: string) => {
    switch (type) {
      case 'SUCCESS': return <CheckCircle2 className="h-5 w-5 text-emerald-500" />;
      case 'ERROR': return <AlertCircle className="h-5 w-5 text-red-500" />;
      case 'WARNING': return <AlertCircle className="h-5 w-5 text-amber-500" />;
      default: return <Info className="h-5 w-5 text-brand-500" />;
    }
  };

  const handleNotificationClick = (id: string, isRead: boolean) => {
    if (!isRead) {
      markAsRead.mutate(id);
    }
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground hover:bg-foreground/5 hover:text-foreground transition-colors"
      >
        <Bell className="h-4 w-4" />
        {unreadCount > 0 && (
          <span
            aria-label={`${unreadCount} unread notifications`}
            className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-brand-500 px-1 text-[10px] font-semibold leading-none text-white"
          >
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.95 }}
            transition={{ duration: 0.15 }}
            className="absolute right-0 top-full mt-2 w-[380px] z-50 overflow-hidden rounded-2xl border border-foreground/[0.06] bg-background shadow-[0_8px_40px_rgba(0,0,0,0.12)] dark:shadow-[0_8px_40px_rgba(0,0,0,0.5)]"
          >
            <div className="flex items-center justify-between border-b border-foreground/[0.06] bg-foreground/[0.02] px-5 py-4">
              <h3 className="font-display font-semibold tracking-tight">Notifications</h3>
              {unreadCount > 0 && (
                <button
                  onClick={() => markAllAsRead.mutate()}
                  className="text-xs text-brand-400 hover:text-brand-300 font-medium transition-colors"
                >
                  Mark all as read
                </button>
              )}
            </div>

            <div className="max-h-[400px] overflow-y-auto">
              {isLoading ? (
                <div className="flex flex-col items-center justify-center p-8 text-center text-sm text-muted-foreground">
                  <div className="h-6 w-6 animate-spin rounded-full border-2 border-brand-500 border-t-transparent mb-2" />
                  Loading notifications...
                </div>
              ) : !Array.isArray(notifications) || notifications.length === 0 ? (
                <div className="flex flex-col items-center justify-center p-12 text-center text-sm text-muted-foreground">
                  <Bell className="mb-3 h-8 w-8 opacity-20" />
                  No notifications yet
                </div>
              ) : (
                <div className="flex flex-col">
                  {notifications?.map((notification) => (
                    <div
                      key={notification.id}
                      onClick={() => handleNotificationClick(notification.id, notification.isRead)}
                      className={`relative flex cursor-pointer items-start gap-4 border-b border-foreground/[0.02] p-5 transition-colors hover:bg-foreground/[0.04] ${
                        !notification.isRead ? 'bg-brand-500/[0.02]' : ''
                      }`}
                    >
                      {!notification.isRead && (
                        <div className="absolute left-2 top-1/2 -translate-y-1/2 h-1.5 w-1.5 rounded-full bg-brand-500 shadow-[0_0_8px_rgba(59,130,246,0.8)]" />
                      )}
                      
                      <div className={`mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-foreground/[0.03]`}>
                        {getIcon(notification.type)}
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium leading-tight">{notification.title}</div>
                        <p className="mt-1.5 text-xs text-muted-foreground/80 break-words leading-relaxed">
                          {notification.message}
                        </p>
                        
                        <div className="mt-2.5 flex items-center justify-between">
                          <span className="text-[10px] font-medium text-muted-foreground/50">
                            {formatRelativeTime(notification.createdAt)}
                          </span>
                          
                          {notification.link && (
                            <Link 
                              href={notification.link}
                              onClick={() => setIsOpen(false)}
                              className="inline-flex items-center gap-1 text-[10px] font-medium text-brand-400 hover:text-brand-300 transition-colors"
                            >
                              View details <ExternalLink className="h-3 w-3" />
                            </Link>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
