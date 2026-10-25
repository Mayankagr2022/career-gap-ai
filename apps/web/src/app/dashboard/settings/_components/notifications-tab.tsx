'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Bell } from 'lucide-react';

function Switch({ checked, onChange, label }: { checked: boolean; onChange: () => void; label: string }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={onChange}
      className="flex h-11 w-14 shrink-0 cursor-pointer items-center justify-center"
    >
      <span
        className={`relative flex h-7 w-12 items-center rounded-full border transition-colors duration-300 ${
          checked
            ? 'border-brand-400/50 bg-gradient-to-r from-brand-500 to-violet-500 shadow-glow'
            : 'border-white/10 bg-white/[0.08]'
        }`}
      >
        <motion.span
          animate={{ x: checked ? 22 : 3 }}
          transition={{ type: 'spring', stiffness: 600, damping: 32 }}
          className="block h-5 w-5 rounded-full bg-white shadow-md"
        />
      </span>
    </button>
  );
}

export function NotificationsTab() {
  const [inAppNotifs, setInAppNotifs] = useState(true);
  const [emailNotifs, setEmailNotifs] = useState(true);
  const [marketingNotifs, setMarketingNotifs] = useState(false);

  const rows = [
    {
      title: 'In-App Notifications',
      desc: 'Receive notifications within the dashboard when your resume analyses are complete.',
      value: inAppNotifs,
      toggle: () => setInAppNotifs(!inAppNotifs),
      muted: false,
    },
    {
      title: 'Email Notifications',
      desc: 'Get an email summarizing your analysis results and job match scores.',
      value: emailNotifs,
      toggle: () => setEmailNotifs(!emailNotifs),
      muted: false,
    },
    {
      title: 'Marketing & Tips (Coming Soon)',
      desc: 'Occasional emails with resume tips, career advice, and new feature announcements.',
      value: marketingNotifs,
      toggle: () => setMarketingNotifs(!marketingNotifs),
      muted: true,
    },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="glass-card overflow-hidden"
    >
      <div className="border-b border-white/[0.06] bg-white/[0.02] px-5 py-5 sm:px-8">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-500/15 text-brand-300 ring-1 ring-brand-400/20">
            <Bell className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <h2 className="font-display text-lg font-semibold tracking-tight">Notification Preferences</h2>
            <p className="text-sm text-muted-foreground">Manage how and when you receive updates.</p>
          </div>
        </div>
      </div>

      <div className="divide-y divide-white/[0.06] px-5 sm:px-8">
        {rows.map((row, i) => (
          <motion.div
            key={row.title}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.25, delay: 0.08 + i * 0.06 }}
            className="flex items-center justify-between gap-4 py-5"
          >
            <div className="min-w-0 space-y-1">
              <h4 className={`text-sm font-medium ${row.muted ? 'text-muted-foreground' : ''}`}>{row.title}</h4>
              <p className={`text-xs leading-relaxed ${row.muted ? 'text-muted-foreground/60' : 'text-muted-foreground'}`}>
                {row.desc}
              </p>
            </div>
            <Switch checked={row.value} onChange={row.toggle} label={row.title} />
          </motion.div>
        ))}
      </div>
    </motion.div>
  );
}
