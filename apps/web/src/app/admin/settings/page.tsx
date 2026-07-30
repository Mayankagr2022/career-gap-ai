'use client';

import { Settings, Shield, Bell, Key } from 'lucide-react';

export default function AdminSettingsPage() {
  return (
    <div>
      <div className="mb-6">
        <h1 className="text-3xl font-bold font-display">System Settings</h1>
        <p className="text-muted-foreground mt-1">Manage global application configurations and admin access.</p>
      </div>

      <div className="grid gap-6">
        {/* General Settings */}
        <div className="glass-card overflow-hidden">
          <div className="border-b border-border p-6 flex items-center gap-3">
            <div className="h-8 w-8 rounded-full bg-brand-500/10 flex items-center justify-center text-brand-500">
              <Settings className="h-4 w-4" />
            </div>
            <h2 className="text-lg font-semibold">General</h2>
          </div>
          <div className="p-6">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-medium">Maintenance Mode</h3>
                  <p className="text-sm text-muted-foreground">Temporarily disable access for non-admin users.</p>
                </div>
                <div className="h-6 w-11 rounded-full bg-border flex items-center px-1 cursor-not-allowed opacity-50">
                  <div className="h-4 w-4 rounded-full bg-background" />
                </div>
              </div>
              <div className="flex items-center justify-between pt-4 border-t border-border">
                <div>
                  <h3 className="font-medium">New User Registration</h3>
                  <p className="text-sm text-muted-foreground">Allow new users to sign up.</p>
                </div>
                <div className="h-6 w-11 rounded-full bg-green-500 flex items-center justify-end px-1 cursor-not-allowed opacity-50">
                  <div className="h-4 w-4 rounded-full bg-background" />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Security Settings */}
        <div className="glass-card overflow-hidden">
          <div className="border-b border-border p-6 flex items-center gap-3">
            <div className="h-8 w-8 rounded-full bg-purple-500/10 flex items-center justify-center text-purple-500">
              <Shield className="h-4 w-4" />
            </div>
            <h2 className="text-lg font-semibold">Security & API Keys</h2>
          </div>
          <div className="p-6">
            <div className="space-y-4">
               <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-medium">Gemini API Key</h3>
                  <p className="text-sm text-muted-foreground">Used for resume parsing and gap analysis.</p>
                </div>
                <button disabled className="btn-secondary py-1.5 px-4 text-xs opacity-50 cursor-not-allowed">Configure</button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
