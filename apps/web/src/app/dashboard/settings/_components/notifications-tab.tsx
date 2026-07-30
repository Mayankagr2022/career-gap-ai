'use client';

import { useState } from 'react';
import { Bell } from 'lucide-react';

export function NotificationsTab() {
  const [inAppNotifs, setInAppNotifs] = useState(true);
  const [emailNotifs, setEmailNotifs] = useState(true);
  const [marketingNotifs, setMarketingNotifs] = useState(false);

  return (
    <div className="glass-card overflow-hidden">
      <div className="border-b border-foreground/[0.05] bg-foreground/[0.02] px-6 py-5">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-500/10 text-brand-500">
            <Bell className="h-5 w-5" />
          </div>
          <div>
            <h2 className="font-display text-lg font-semibold tracking-tight">Notification Preferences</h2>
            <p className="text-sm text-muted-foreground">Manage how and when you receive updates.</p>
          </div>
        </div>
      </div>
      
      <div className="divide-y divide-foreground/[0.05] p-6">
        <div className="flex items-center justify-between py-4 first:pt-0 last:pb-0">
          <div className="space-y-1 max-w-[280px] sm:max-w-md">
            <h4 className="text-sm font-medium">In-App Notifications</h4>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Receive notifications within the dashboard when your resume analyses are complete.
            </p>
          </div>
          <button 
            role="switch" 
            aria-checked={inAppNotifs}
            onClick={() => setInAppNotifs(!inAppNotifs)}
            className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full transition-colors shadow-inner ${inAppNotifs ? 'bg-brand-500' : 'bg-foreground/[0.15]'}`}
          >
            <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform shadow-sm ${inAppNotifs ? 'translate-x-6' : 'translate-x-1'}`} />
          </button>
        </div>

        <div className="flex items-center justify-between py-4 first:pt-0 last:pb-0">
          <div className="space-y-1 max-w-[280px] sm:max-w-md">
            <h4 className="text-sm font-medium">Email Notifications</h4>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Get an email summarizing your analysis results and job match scores.
            </p>
          </div>
          <button 
            role="switch" 
            aria-checked={emailNotifs}
            onClick={() => setEmailNotifs(!emailNotifs)}
            className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full transition-colors shadow-inner ${emailNotifs ? 'bg-brand-500' : 'bg-foreground/[0.15]'}`}
          >
            <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform shadow-sm ${emailNotifs ? 'translate-x-6' : 'translate-x-1'}`} />
          </button>
        </div>

        <div className="flex items-center justify-between py-4 first:pt-0 last:pb-0">
          <div className="space-y-1 max-w-[280px] sm:max-w-md">
            <h4 className="text-sm font-medium text-muted-foreground">Marketing & Tips (Coming Soon)</h4>
            <p className="text-xs text-muted-foreground/60 leading-relaxed">
              Occasional emails with resume tips, career advice, and new feature announcements.
            </p>
          </div>
          <button 
            role="switch" 
            aria-checked={marketingNotifs}
            onClick={() => setMarketingNotifs(!marketingNotifs)}
            className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full transition-colors shadow-inner ${marketingNotifs ? 'bg-brand-500' : 'bg-foreground/[0.15]'}`}
          >
            <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform shadow-sm ${marketingNotifs ? 'translate-x-6' : 'translate-x-1'}`} />
          </button>
        </div>
      </div>
    </div>
  );
}
