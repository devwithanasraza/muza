'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Video,
  Sparkles,
  CalendarCheck,
  Share2,
  BookmarkCheck,
  BarChart3,
  ShieldCheck,
  Settings,
  HardDrive,
  LogOut,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { ApiClient } from '@/lib/api';

const navigation = [
  { name: 'Dashboard', href: '/', icon: LayoutDashboard },
  { name: 'Video Library', href: '/videos', icon: Video },
  { name: 'Review Queue', href: '/review', icon: Sparkles },
  { name: 'Publishing & Schedule', href: '/publishing', icon: CalendarCheck },
  { name: 'Integrations Hub', href: '/integrations', icon: HardDrive },
  { name: 'Brand Profiles', href: '/brand', icon: BookmarkCheck },
  { name: 'Analytics', href: '/analytics', icon: BarChart3 },
  { name: 'Audit Logs', href: '/audit', icon: ShieldCheck },
  { name: 'Settings', href: '/settings', icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();

  const handleLogout = async () => {
    try {
      await ApiClient.post('/auth/logout');
    } catch {
      // ignore
    } finally {
      ApiClient.setToken(null);
      window.location.href = '/login';
    }
  };

  return (
    <aside className="w-64 min-h-screen border-r border-white/10 glass-panel flex flex-col justify-between p-4 sticky top-0 h-screen select-none">
      <div>
        {/* Brand Logo */}
        <div className="flex items-center gap-3 px-3 py-4 mb-4">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-purple-500 flex items-center justify-center shadow-glow">
            <span className="text-white font-extrabold tracking-widest text-lg">M</span>
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight text-white flex items-center gap-1.5">
              MUZA
              <span className="text-[10px] uppercase font-semibold px-1.5 py-0.5 rounded bg-indigo-500/20 text-indigo-400 border border-indigo-500/30">
                AI
              </span>
            </h1>
            <p className="text-xs text-gray-400 font-medium">Publishing Agent</p>
          </div>
        </div>

        {/* Navigation Menu */}
        <nav className="space-y-1">
          {navigation.map((item) => {
            const isActive =
              item.href === '/'
                ? pathname === '/'
                : pathname === item.href || pathname.startsWith(`${item.href}/`);
            const Icon = item.icon;

            return (
              <Link
                key={item.name}
                href={item.href}
                className={cn(
                  'flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150',
                  isActive
                    ? 'bg-indigo-600/15 text-indigo-400 border border-indigo-500/30 shadow-sm'
                    : 'text-gray-400 hover:text-white hover:bg-white/5'
                )}
              >
                <Icon className={cn('w-4 h-4', isActive ? 'text-indigo-400' : 'text-gray-400')} />
                {item.name}
              </Link>
            );
          })}
        </nav>
      </div>

      {/* User Info & Logout */}
      <div className="pt-4 border-t border-white/10">
        <div className="flex items-center justify-between px-3 py-2">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 flex items-center justify-center font-bold text-xs">
              AD
            </div>
            <div className="overflow-hidden">
              <p className="text-xs font-semibold text-white truncate">Administrator</p>
              <p className="text-[11px] text-gray-400 truncate">admin@muza.ai</p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            title="Sign out"
            className="p-1.5 rounded-lg text-gray-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </aside>
  );
}
