'use client';

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Bell, RefreshCw, CheckCircle2, AlertTriangle, AlertCircle, Info, Check } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { ApiClient } from '@/lib/api';

interface HeaderProps {
  title: string;
  subtitle?: string;
}

export function Header({ title, subtitle }: HeaderProps) {
  const [showNotifications, setShowNotifications] = useState(false);
  const queryClient = useQueryClient();

  // Fetch notifications
  const { data: notificationData } = useQuery({
    queryKey: ['notifications'],
    queryFn: () => ApiClient.get<{ unreadCount: number; notifications: any[] }>('/notifications'),
    refetchInterval: 15000,
  });

  // Sync Drive mutation
  const syncMutation = useMutation({
    mutationFn: () => ApiClient.post('/drive/sync'),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['videos'] });
      queryClient.invalidateQueries({ queryKey: ['overview'] });
    },
  });

  // Mark all notifications read
  const markReadMutation = useMutation({
    mutationFn: () => ApiClient.put('/notifications/read-all'),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });

  const unreadCount = notificationData?.unreadCount || 0;
  const notifications = notificationData?.notifications || [];

  return (
    <header className="border-b border-white/10 glass-panel px-8 py-5 flex items-center justify-between sticky top-0 z-30">
      <div>
        <h2 className="text-2xl font-bold tracking-tight text-white">{title}</h2>
        {subtitle && <p className="text-xs text-gray-400 mt-0.5">{subtitle}</p>}
      </div>

      <div className="flex items-center gap-3 relative">
        {/* Drive Sync Button */}
        <Button
          variant="secondary"
          size="sm"
          loading={syncMutation.isPending}
          onClick={() => syncMutation.mutate()}
          className="gap-2"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${syncMutation.isPending ? 'animate-spin' : ''}`} />
          Sync Drive
        </Button>

        {/* Notifications Popover */}
        <div className="relative">
          <button
            onClick={() => setShowNotifications(!showNotifications)}
            className="p-2 rounded-xl border border-white/10 text-gray-400 hover:text-white hover:bg-white/5 transition-colors relative"
          >
            <Bell className="w-4 h-4" />
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 w-4 h-4 bg-indigo-500 text-white rounded-full text-[10px] font-bold flex items-center justify-center animate-pulse">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </button>

          {showNotifications && (
            <div className="absolute right-0 mt-3 w-80 rounded-2xl glass-panel p-4 shadow-2xl border border-white/10 z-50 animate-in fade-in slide-in-from-top-2">
              <div className="flex items-center justify-between pb-3 border-b border-white/10 mb-2">
                <span className="text-xs font-bold text-white uppercase tracking-wider">Notifications</span>
                {unreadCount > 0 && (
                  <button
                    onClick={() => markReadMutation.mutate()}
                    className="text-[11px] text-indigo-400 hover:text-indigo-300 flex items-center gap-1 font-medium"
                  >
                    <Check className="w-3 h-3" /> Mark all read
                  </button>
                )}
              </div>

              <div className="max-h-72 overflow-y-auto space-y-2 pr-1">
                {notifications.length === 0 ? (
                  <p className="text-xs text-gray-400 text-center py-6">No notifications yet.</p>
                ) : (
                  notifications.map((n) => (
                    <div
                      key={n.id}
                      className={`p-2.5 rounded-xl border text-xs transition-colors ${
                        n.isRead
                          ? 'bg-white/[0.02] border-white/5 text-gray-400'
                          : 'bg-indigo-500/10 border-indigo-500/20 text-gray-200'
                      }`}
                    >
                      <div className="flex items-center gap-2 mb-1">
                        {n.type === 'SUCCESS' && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />}
                        {n.type === 'ERROR' && <AlertCircle className="w-3.5 h-3.5 text-rose-400" />}
                        {n.type === 'WARNING' && <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />}
                        {(!n.type || n.type === 'INFO') && <Info className="w-3.5 h-3.5 text-indigo-400" />}
                        <span className="font-semibold text-white">{n.title}</span>
                      </div>
                      <p className="text-[11px] text-gray-300 line-clamp-2">{n.message}</p>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
