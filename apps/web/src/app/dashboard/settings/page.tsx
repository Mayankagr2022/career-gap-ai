'use client';

import { useState } from 'react';
import dynamic from 'next/dynamic';
import { User, Shield, Bell } from 'lucide-react';

const ProfileTab = dynamic(() => import('./_components/profile-tab').then(mod => mod.ProfileTab), {
  loading: () => <div className="glass-card p-6 h-[400px] shimmer rounded-2xl" />
});
const SecurityTab = dynamic(() => import('./_components/security-tab').then(mod => mod.SecurityTab), {
  loading: () => <div className="glass-card p-6 h-[300px] shimmer rounded-2xl" />
});
const NotificationsTab = dynamic(() => import('./_components/notifications-tab').then(mod => mod.NotificationsTab), {
  loading: () => <div className="glass-card p-6 h-[250px] shimmer rounded-2xl" />
});

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState<'PROFILE' | 'SECURITY' | 'NOTIFICATIONS'>('PROFILE');

  return (
    <div className="max-w-4xl space-y-8">
      <div>
        <h1 className="font-display text-3xl font-bold">Settings</h1>
        <p className="mt-1 text-muted-foreground">Manage your account and preferences</p>
      </div>

      <div className="flex flex-col md:flex-row gap-8">
        {/* Sidebar tabs */}
        <div className="w-full md:w-64 shrink-0 flex flex-row md:flex-col overflow-x-auto gap-2 md:space-y-1 pb-2 md:pb-0">
          {[
            { id: 'PROFILE', label: 'Profile', icon: User },
            { id: 'SECURITY', label: 'Security', icon: Shield },
            { id: 'NOTIFICATIONS', label: 'Notifications', icon: Bell },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`shrink-0 flex items-center gap-2 md:gap-3 rounded-full md:rounded-xl px-4 py-2.5 md:py-3 text-sm font-medium transition-colors ${
                activeTab === tab.id 
                  ? 'bg-brand-500/10 text-brand-400' 
                  : 'text-muted-foreground hover:bg-foreground/5 hover:text-foreground'
              }`}
            >
              <tab.icon className="h-4 w-4 shrink-0" />
              {tab.label}
            </button>
          ))}
        </div>

        {/* Content area */}
        <div className="flex-1 space-y-6">
          {activeTab === 'PROFILE' && <ProfileTab />}
          {activeTab === 'SECURITY' && <SecurityTab />}
          {activeTab === 'NOTIFICATIONS' && <NotificationsTab />}
        </div>
      </div>
    </div>
  );
}
