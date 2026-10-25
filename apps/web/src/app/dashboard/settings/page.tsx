'use client';

import { useState } from 'react';
import dynamic from 'next/dynamic';
import { motion, AnimatePresence } from 'framer-motion';
import { User, Shield, Bell, Settings2 } from 'lucide-react';

const ProfileTab = dynamic(() => import('./_components/profile-tab').then(mod => mod.ProfileTab), {
  loading: () => <div className="glass-card p-6 h-[400px] shimmer rounded-2xl" />
});
const SecurityTab = dynamic(() => import('./_components/security-tab').then(mod => mod.SecurityTab), {
  loading: () => <div className="glass-card p-6 h-[300px] shimmer rounded-2xl" />
});
const NotificationsTab = dynamic(() => import('./_components/notifications-tab').then(mod => mod.NotificationsTab), {
  loading: () => <div className="glass-card p-6 h-[250px] shimmer rounded-2xl" />
});

const TABS = [
  { id: 'PROFILE', label: 'Profile', icon: User },
  { id: 'SECURITY', label: 'Security', icon: Shield },
  { id: 'NOTIFICATIONS', label: 'Notifications', icon: Bell },
] as const;

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState<'PROFILE' | 'SECURITY' | 'NOTIFICATIONS'>('PROFILE');

  return (
    <div className="mx-auto w-full max-w-4xl min-w-0 space-y-6">
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="flex items-center gap-3"
      >
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-brand-500/30 to-violet-500/20 text-brand-200 ring-1 ring-white/10">
          <Settings2 className="h-5 w-5" />
        </div>
        <p className="min-w-0 text-sm text-muted-foreground">Manage your account, security and preferences.</p>
      </motion.div>

      {/* Segmented pill tab bar */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.05 }}
        className="-mx-1 overflow-x-auto px-1 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        <div role="tablist" className="inline-flex min-w-full gap-1 rounded-2xl border border-white/10 bg-white/[0.04] p-1 sm:min-w-0">
          {TABS.map((tab) => {
            const active = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                role="tab"
                aria-selected={active}
                onClick={() => setActiveTab(tab.id)}
                className={`relative flex min-h-[44px] flex-1 shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-xl px-4 text-sm font-medium transition-colors sm:flex-none sm:px-5 ${
                  active ? 'text-white' : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                {active && (
                  <motion.span
                    layoutId="settings-tab-pill"
                    transition={{ type: 'spring', stiffness: 500, damping: 36 }}
                    className="absolute inset-0 rounded-xl bg-gradient-to-r from-brand-500/50 to-violet-500/30 shadow-glow ring-1 ring-brand-400/40"
                  />
                )}
                <tab.icon className="relative h-4 w-4 shrink-0" />
                <span className="relative">{tab.label}</span>
              </button>
            );
          })}
        </div>
      </motion.div>

      {/* Content area */}
      <div className="min-w-0">
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2 }}
            className="space-y-6"
          >
            {activeTab === 'PROFILE' && <ProfileTab />}
            {activeTab === 'SECURITY' && <SecurityTab />}
            {activeTab === 'NOTIFICATIONS' && <NotificationsTab />}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}
