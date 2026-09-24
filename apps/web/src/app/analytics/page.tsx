'use client';

import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { BarChart3, Eye, Heart, MessageSquare, Share2, Youtube, Instagram, TrendingUp } from 'lucide-react';
import { AppLayout } from '@/components/layout/AppLayout';
import { ApiClient } from '@/lib/api';

export default function AnalyticsPage() {
  const { data: metrics, isLoading } = useQuery({
    queryKey: ['analytics-overview'],
    queryFn: () => ApiClient.get<any>('/analytics/overview'),
  });

  const engagement = metrics?.engagement || {
    totalViews: 0,
    totalLikes: 0,
    totalComments: 0,
    totalReach: 0,
  };

  return (
    <AppLayout
      title="Performance Analytics"
      subtitle="Real-time multi-platform reach, watch analytics, and viewer engagement derived directly from official APIs"
    >
      <div className="space-y-8 max-w-5xl">
        {/* Engagement KPI Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="glass-card rounded-2xl p-5 border border-white/10">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Total Views / Plays</span>
              <div className="w-8 h-8 rounded-lg bg-indigo-500/10 text-indigo-400 flex items-center justify-center">
                <Eye className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-3 flex items-baseline gap-2">
              <span className="text-3xl font-extrabold text-white">{engagement.totalViews.toLocaleString()}</span>
            </div>
          </div>

          <div className="glass-card rounded-2xl p-5 border border-white/10">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Total Likes</span>
              <div className="w-8 h-8 rounded-lg bg-rose-500/10 text-rose-400 flex items-center justify-center">
                <Heart className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-3 flex items-baseline gap-2">
              <span className="text-3xl font-extrabold text-rose-400">{engagement.totalLikes.toLocaleString()}</span>
            </div>
          </div>

          <div className="glass-card rounded-2xl p-5 border border-white/10">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Comments</span>
              <div className="w-8 h-8 rounded-lg bg-blue-500/10 text-blue-400 flex items-center justify-center">
                <MessageSquare className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-3 flex items-baseline gap-2">
              <span className="text-3xl font-extrabold text-blue-400">{engagement.totalComments.toLocaleString()}</span>
            </div>
          </div>

          <div className="glass-card rounded-2xl p-5 border border-white/10">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Estimated Reach</span>
              <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
                <TrendingUp className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-3 flex items-baseline gap-2">
              <span className="text-3xl font-extrabold text-emerald-400">{engagement.totalReach.toLocaleString()}</span>
            </div>
          </div>
        </div>

        {/* Platform Breakdown */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* YouTube Analytics */}
          <div className="glass-panel rounded-2xl p-6 border border-white/10 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-red-500/10 text-red-400 flex items-center justify-center">
                <Youtube className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-white">YouTube Channel Performance</h4>
                <p className="text-xs text-gray-400">Metrics synced via YouTube Data API v3</p>
              </div>
            </div>

            <div className="p-4 rounded-xl bg-surface-elevated/70 border border-white/5 space-y-3">
              <div className="flex justify-between items-center text-xs">
                <span className="text-gray-400">Published Videos</span>
                <span className="font-bold text-white">{metrics?.cards?.published || 0}</span>
              </div>
              <div className="flex justify-between items-center text-xs">
                <span className="text-gray-400">Video Views</span>
                <span className="font-bold text-white">{engagement.totalViews.toLocaleString()}</span>
              </div>
              <div className="flex justify-between items-center text-xs">
                <span className="text-gray-400">Audience Engagement</span>
                <span className="font-bold text-emerald-400">
                  {engagement.totalViews > 0
                    ? `${(((engagement.totalLikes + engagement.totalComments) / engagement.totalViews) * 100).toFixed(1)}%`
                    : '0%'}
                </span>
              </div>
            </div>
          </div>

          {/* Instagram Analytics */}
          <div className="glass-panel rounded-2xl p-6 border border-white/10 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-pink-500/10 text-pink-400 flex items-center justify-center">
                <Instagram className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-white">Instagram Reels Performance</h4>
                <p className="text-xs text-gray-400">Insights synced via Meta Graph API</p>
              </div>
            </div>

            <div className="p-4 rounded-xl bg-surface-elevated/70 border border-white/5 space-y-3">
              <div className="flex justify-between items-center text-xs">
                <span className="text-gray-400">Published Reels</span>
                <span className="font-bold text-white">{metrics?.cards?.published || 0}</span>
              </div>
              <div className="flex justify-between items-center text-xs">
                <span className="text-gray-400">Total Reach</span>
                <span className="font-bold text-white">{engagement.totalReach.toLocaleString()}</span>
              </div>
              <div className="flex justify-between items-center text-xs">
                <span className="text-gray-400">Average Engagement</span>
                <span className="font-bold text-pink-400">
                  {engagement.totalReach > 0
                    ? `${(((engagement.totalLikes + engagement.totalComments) / engagement.totalReach) * 100).toFixed(1)}%`
                    : '0%'}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
