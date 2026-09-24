'use client';

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  CalendarCheck,
  CheckCircle2,
  AlertCircle,
  Clock,
  RotateCcw,
  ExternalLink,
  Trash2,
  Youtube,
  Instagram,
} from 'lucide-react';
import { AppLayout } from '@/components/layout/AppLayout';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { ApiClient } from '@/lib/api';

export default function PublishingPage() {
  const [activeTab, setActiveTab] = useState<'ALL' | 'SCHEDULED' | 'PUBLISHED' | 'FAILED'>('ALL');
  const queryClient = useQueryClient();

  const { data: jobs, isLoading } = useQuery({
    queryKey: ['publish-jobs', activeTab],
    queryFn: () => {
      let statusParam = '';
      if (activeTab === 'SCHEDULED') statusParam = 'PENDING';
      if (activeTab === 'PUBLISHED') statusParam = 'SUCCESS';
      if (activeTab === 'FAILED') statusParam = 'FAILED';

      const query = statusParam ? `?status=${statusParam}` : '';
      return ApiClient.get<any[]>(`/publishing/history${query}`);
    },
    refetchInterval: 10000,
  });

  const retryMutation = useMutation({
    mutationFn: (jobId: string) => ApiClient.post(`/publishing/jobs/${jobId}/retry`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['publish-jobs'] });
      alert('Job queued for retry.');
    },
    onError: (err: any) => {
      alert(`Retry failed: ${err.message}`);
    },
  });

  const cancelMutation = useMutation({
    mutationFn: (jobId: string) => ApiClient.delete(`/publishing/jobs/${jobId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['publish-jobs'] });
      alert('Scheduled job cancelled.');
    },
  });

  return (
    <AppLayout
      title="Publishing & Scheduling Hub"
      subtitle="Complete ledger of multi-platform post dispatches, retries, and live social links"
    >
      <div className="space-y-6">
        {/* Filter Tabs */}
        <div className="flex items-center gap-2">
          {(['ALL', 'SCHEDULED', 'PUBLISHED', 'FAILED'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                activeTab === tab
                  ? 'bg-indigo-600 text-white shadow-glow'
                  : 'bg-surface-elevated text-gray-400 hover:text-white'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        {/* History Table */}
        <div className="glass-panel rounded-2xl border border-white/10 overflow-hidden shadow-glass">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-white/10 text-gray-400 text-xs uppercase tracking-wider bg-white/[0.02]">
                  <th className="py-3.5 px-6 font-semibold">Video</th>
                  <th className="py-3.5 px-4 font-semibold">Platform & Channel</th>
                  <th className="py-3.5 px-4 font-semibold">Status</th>
                  <th className="py-3.5 px-4 font-semibold">Scheduled / Published</th>
                  <th className="py-3.5 px-4 font-semibold">External Link</th>
                  <th className="py-3.5 px-6 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {jobs && jobs.length > 0 ? (
                  jobs.map((job) => (
                    <tr key={job.id} className="hover:bg-white/[0.02] transition-colors">
                      {/* Video */}
                      <td className="py-4 px-6">
                        <div>
                          <p className="font-semibold text-white truncate max-w-xs">
                            {job.video?.filename || 'Video'}
                          </p>
                          <p className="text-[11px] text-gray-400">
                            {job.contentVariant?.title || job.contentVariant?.caption?.slice(0, 40) || 'Post'}
                          </p>
                        </div>
                      </td>

                      {/* Platform & Account */}
                      <td className="py-4 px-4">
                        <div className="flex items-center gap-2">
                          {job.platform === 'YOUTUBE' ? (
                            <Youtube className="w-4 h-4 text-red-400" />
                          ) : (
                            <Instagram className="w-4 h-4 text-pink-400" />
                          )}
                          <div>
                            <p className="text-xs font-semibold text-white">
                              {job.socialAccount?.accountName || job.platform}
                            </p>
                            <span className="text-[10px] text-gray-400 uppercase font-medium">
                              {job.platform}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* Status */}
                      <td className="py-4 px-4">
                        <div className="space-y-1">
                          <Badge status={job.status} />
                          {job.lastError && (
                            <p className="text-[11px] text-rose-400 max-w-xs truncate" title={job.lastError}>
                              {job.lastError}
                            </p>
                          )}
                        </div>
                      </td>

                      {/* Date */}
                      <td className="py-4 px-4 text-xs text-gray-300">
                        {job.scheduledAt ? (
                          <div className="flex items-center gap-1.5 text-blue-400">
                            <Clock className="w-3.5 h-3.5" />
                            <span>{new Date(job.scheduledAt).toLocaleString()}</span>
                          </div>
                        ) : job.publishedPost ? (
                          <div className="flex items-center gap-1.5 text-emerald-400">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>{new Date(job.publishedPost.publishedAt).toLocaleString()}</span>
                          </div>
                        ) : (
                          <span>{new Date(job.createdAt).toLocaleString()}</span>
                        )}
                      </td>

                      {/* External Link */}
                      <td className="py-4 px-4">
                        {job.publishedPost?.externalUrl ? (
                          <a
                            href={job.publishedPost.externalUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1.5 text-xs font-semibold text-indigo-400 hover:text-indigo-300 hover:underline"
                          >
                            View Post <ExternalLink className="w-3.5 h-3.5" />
                          </a>
                        ) : (
                          <span className="text-xs text-gray-500">—</span>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="py-4 px-6 text-right">
                        <div className="flex items-center justify-end gap-2">
                          {job.status === 'FAILED' && (
                            <Button
                              variant="secondary"
                              size="sm"
                              loading={retryMutation.isPending}
                              onClick={() => retryMutation.mutate(job.id)}
                              className="text-xs gap-1 text-amber-400 border-amber-500/30"
                            >
                              <RotateCcw className="w-3 h-3" /> Retry
                            </Button>
                          )}

                          {job.status === 'PENDING' && (
                            <Button
                              variant="danger"
                              size="sm"
                              loading={cancelMutation.isPending}
                              onClick={() => cancelMutation.mutate(job.id)}
                              className="text-xs gap-1"
                            >
                              <Trash2 className="w-3 h-3" /> Cancel
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-gray-400 text-xs">
                      {isLoading ? 'Loading publishing history...' : 'No post dispatches found.'}
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
