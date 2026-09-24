'use client';

import React from 'react';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import {
  Video as VideoIcon,
  Clock,
  CalendarCheck,
  CheckCircle2,
  AlertCircle,
  HardDrive,
  Youtube,
  Instagram,
  ArrowRight,
  Sparkles,
  ExternalLink,
} from 'lucide-react';
import { AppLayout } from '@/components/layout/AppLayout';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { ApiClient } from '@/lib/api';

export default function DashboardPage() {
  const { data: metrics, isLoading } = useQuery({
    queryKey: ['overview'],
    queryFn: () => ApiClient.get<any>('/analytics/overview'),
    refetchInterval: 10000,
  });

  const { data: recentVideos } = useQuery({
    queryKey: ['recent-videos'],
    queryFn: () => ApiClient.get<any[]>('/videos?limit=5'),
  });

  const cards = metrics?.cards || {
    totalVideos: 0,
    pendingReview: 0,
    scheduled: 0,
    published: 0,
    failed: 0,
  };

  const integrations = metrics?.integrations || {
    googleDrive: { configured: false, connected: false },
    youtube: { configured: false, connected: false },
    instagram: { configured: false, connected: false },
  };

  return (
    <AppLayout
      title="Dashboard Overview"
      subtitle="Autonomous AI video publishing pipeline and real-time operations"
    >
      <div className="space-y-8">
        {/* Metric Cards Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          <div className="glass-card rounded-2xl p-5 border border-white/10">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Total Videos</span>
              <div className="w-8 h-8 rounded-lg bg-indigo-500/10 text-indigo-400 flex items-center justify-center">
                <VideoIcon className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-3 flex items-baseline gap-2">
              <span className="text-3xl font-extrabold text-white">{cards.totalVideos}</span>
              <span className="text-xs text-gray-400">imported</span>
            </div>
          </div>

          <div className="glass-card rounded-2xl p-5 border border-white/10">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Pending Review</span>
              <div className="w-8 h-8 rounded-lg bg-amber-500/10 text-amber-400 flex items-center justify-center">
                <Clock className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-3 flex items-baseline gap-2">
              <span className="text-3xl font-extrabold text-amber-400">{cards.pendingReview}</span>
              <span className="text-xs text-gray-400">ready</span>
            </div>
          </div>

          <div className="glass-card rounded-2xl p-5 border border-white/10">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Scheduled</span>
              <div className="w-8 h-8 rounded-lg bg-blue-500/10 text-blue-400 flex items-center justify-center">
                <CalendarCheck className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-3 flex items-baseline gap-2">
              <span className="text-3xl font-extrabold text-blue-400">{cards.scheduled}</span>
              <span className="text-xs text-gray-400">queued</span>
            </div>
          </div>

          <div className="glass-card rounded-2xl p-5 border border-white/10">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Published</span>
              <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
                <CheckCircle2 className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-3 flex items-baseline gap-2">
              <span className="text-3xl font-extrabold text-emerald-400">{cards.published}</span>
              <span className="text-xs text-gray-400">live</span>
            </div>
          </div>

          <div className="glass-card rounded-2xl p-5 border border-white/10">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Failed</span>
              <div className="w-8 h-8 rounded-lg bg-rose-500/10 text-rose-400 flex items-center justify-center">
                <AlertCircle className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-3 flex items-baseline gap-2">
              <span className="text-3xl font-extrabold text-rose-400">{cards.failed}</span>
              <span className="text-xs text-gray-400">action required</span>
            </div>
          </div>
        </div>

        {/* Integration Status Cards */}
        <div>
          <h3 className="text-sm font-bold text-gray-300 uppercase tracking-wider mb-3">Integrations Status</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Google Drive Card */}
            <div className="glass-card rounded-2xl p-5 border border-white/10 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="w-9 h-9 rounded-xl bg-blue-500/10 text-blue-400 flex items-center justify-center">
                      <HardDrive className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-white">Google Drive</h4>
                      <p className="text-[11px] text-gray-400">Video Folder Source</p>
                    </div>
                  </div>
                  {integrations.googleDrive.connected ? (
                    <Badge status="CONNECTED" />
                  ) : integrations.googleDrive.configured ? (
                    <Badge status="DISCONNECTED" />
                  ) : (
                    <Badge status="ERROR" />
                  )}
                </div>
                <div className="mt-4 text-xs text-gray-300">
                  {integrations.googleDrive.connected ? (
                    <p className="text-emerald-400 font-medium">✓ Syncing: {integrations.googleDrive.email}</p>
                  ) : integrations.googleDrive.configured ? (
                    <p className="text-gray-400">Ready to connect and select folder.</p>
                  ) : (
                    <p className="text-rose-400 font-medium">Integration not configured (Missing Client ID)</p>
                  )}
                </div>
              </div>
              <div className="mt-5 pt-3 border-t border-white/5 flex justify-end">
                <Link href="/integrations">
                  <Button variant="ghost" size="sm" className="text-xs gap-1">
                    Manage Drive <ArrowRight className="w-3.5 h-3.5" />
                  </Button>
                </Link>
              </div>
            </div>

            {/* YouTube Card */}
            <div className="glass-card rounded-2xl p-5 border border-white/10 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="w-9 h-9 rounded-xl bg-red-500/10 text-red-400 flex items-center justify-center">
                      <Youtube className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-white">YouTube Data API</h4>
                      <p className="text-[11px] text-gray-400">Official Channel Uploads</p>
                    </div>
                  </div>
                  {integrations.youtube.connected ? (
                    <Badge status="CONNECTED" />
                  ) : integrations.youtube.configured ? (
                    <Badge status="DISCONNECTED" />
                  ) : (
                    <Badge status="ERROR" />
                  )}
                </div>
                <div className="mt-4 text-xs text-gray-300">
                  {integrations.youtube.connected ? (
                    <p className="text-emerald-400 font-medium">✓ Linked: {integrations.youtube.channelName}</p>
                  ) : integrations.youtube.configured ? (
                    <p className="text-gray-400">OAuth channel authorization ready.</p>
                  ) : (
                    <p className="text-rose-400 font-medium">Integration not configured (Missing YouTube credentials)</p>
                  )}
                </div>
              </div>
              <div className="mt-5 pt-3 border-t border-white/5 flex justify-end">
                <Link href="/integrations">
                  <Button variant="ghost" size="sm" className="text-xs gap-1">
                    Manage YouTube <ArrowRight className="w-3.5 h-3.5" />
                  </Button>
                </Link>
              </div>
            </div>

            {/* Instagram Card */}
            <div className="glass-card rounded-2xl p-5 border border-white/10 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="w-9 h-9 rounded-xl bg-pink-500/10 text-pink-400 flex items-center justify-center">
                      <Instagram className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-white">Meta Graph API</h4>
                      <p className="text-[11px] text-gray-400">Instagram Reels Publishing</p>
                    </div>
                  </div>
                  {integrations.instagram.connected ? (
                    <Badge status="CONNECTED" />
                  ) : integrations.instagram.configured ? (
                    <Badge status="DISCONNECTED" />
                  ) : (
                    <Badge status="ERROR" />
                  )}
                </div>
                <div className="mt-4 text-xs text-gray-300">
                  {integrations.instagram.connected ? (
                    <p className="text-emerald-400 font-medium">✓ Linked: @{integrations.instagram.accountName}</p>
                  ) : integrations.instagram.configured ? (
                    <p className="text-gray-400">OAuth Business login ready.</p>
                  ) : (
                    <p className="text-rose-400 font-medium">Integration not configured (Missing Meta App credentials)</p>
                  )}
                </div>
              </div>
              <div className="mt-5 pt-3 border-t border-white/5 flex justify-end">
                <Link href="/integrations">
                  <Button variant="ghost" size="sm" className="text-xs gap-1">
                    Manage Instagram <ArrowRight className="w-3.5 h-3.5" />
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </div>

        {/* Recent Pipeline Videos */}
        <div className="glass-panel rounded-2xl p-6 border border-white/10">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h3 className="text-base font-bold text-white">Recent Pipeline Videos</h3>
              <p className="text-xs text-gray-400">Autonomous processing and ready for review status</p>
            </div>
            <Link href="/videos">
              <Button variant="outline" size="sm" className="text-xs">
                View Video Library
              </Button>
            </Link>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-white/10 text-gray-400 text-xs uppercase tracking-wider">
                  <th className="pb-3 font-semibold">Video</th>
                  <th className="pb-3 font-semibold">Status</th>
                  <th className="pb-3 font-semibold">AI Summary / Hook</th>
                  <th className="pb-3 font-semibold">Platforms</th>
                  <th className="pb-3 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {recentVideos && recentVideos.length > 0 ? (
                  recentVideos.map((video) => (
                    <tr key={video.id} className="hover:bg-white/[0.02] transition-colors">
                      <td className="py-3.5 pr-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-lg bg-surface-elevated flex items-center justify-center text-gray-400 overflow-hidden flex-shrink-0 border border-white/10">
                            {video.driveThumbnailLink ? (
                              <img
                                src={video.driveThumbnailLink}
                                alt={video.filename}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <VideoIcon className="w-5 h-5 text-gray-500" />
                            )}
                          </div>
                          <div>
                            <p className="font-semibold text-white truncate max-w-xs">{video.filename}</p>
                            <p className="text-[11px] text-gray-400">
                              {new Date(video.createdAt).toLocaleDateString()}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="py-3.5 pr-4">
                        <Badge status={video.status} />
                      </td>
                      <td className="py-3.5 pr-4 max-w-sm">
                        <p className="text-xs text-gray-300 truncate">
                          {video.analysis?.summary || 'Pending AI analysis...'}
                        </p>
                      </td>
                      <td className="py-3.5 pr-4">
                        <div className="flex items-center gap-2">
                          <span className="p-1 rounded bg-red-500/10 text-red-400 text-[10px] font-bold">YT</span>
                          <span className="p-1 rounded bg-pink-500/10 text-pink-400 text-[10px] font-bold">IG</span>
                        </div>
                      </td>
                      <td className="py-3.5 text-right">
                        <Link href={`/review/${video.id}`}>
                          <Button variant="secondary" size="sm" className="text-xs gap-1">
                            <Sparkles className="w-3 h-3 text-indigo-400" />
                            Review
                          </Button>
                        </Link>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-gray-400 text-xs">
                      No videos detected yet. Connect Google Drive to begin autonomous importing.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
