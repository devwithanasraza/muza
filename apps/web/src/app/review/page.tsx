'use client';

import React from 'react';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { Sparkles, ArrowRight, Video as VideoIcon, CheckCircle2 } from 'lucide-react';
import { AppLayout } from '@/components/layout/AppLayout';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { ApiClient } from '@/lib/api';

export default function ReviewQueuePage() {
  const { data: queueVideos, isLoading } = useQuery({
    queryKey: ['review-queue'],
    queryFn: () => ApiClient.get<any[]>('/content/review-queue'),
    refetchInterval: 10000,
  });

  return (
    <AppLayout
      title="Content Review Queue"
      subtitle="Verify, edit, and approve AI-generated social copy and metadata before multi-platform publishing"
    >
      <div className="space-y-6">
        {queueVideos && queueVideos.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {queueVideos.map((video) => {
              const ytVariant = (video.variants || []).find((v: any) => v.platform === 'YOUTUBE');
              const igVariant = (video.variants || []).find((v: any) => v.platform === 'INSTAGRAM');

              return (
                <div
                  key={video.id}
                  className="glass-panel rounded-2xl p-5 border border-white/10 flex flex-col justify-between hover:border-indigo-500/40 transition-all shadow-glass"
                >
                  <div className="space-y-4">
                    {/* Header */}
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-2.5">
                        <div className="w-10 h-10 rounded-xl bg-surface-elevated flex items-center justify-center flex-shrink-0 text-gray-400 overflow-hidden border border-white/10">
                          {video.driveThumbnailLink ? (
                            <img src={video.driveThumbnailLink} alt="" className="w-full h-full object-cover" />
                          ) : (
                            <VideoIcon className="w-5 h-5 text-gray-500" />
                          )}
                        </div>
                        <div>
                          <h4 className="text-sm font-bold text-white truncate max-w-[180px]">{video.filename}</h4>
                          <span className="text-[11px] text-gray-400">
                            {new Date(video.createdAt).toLocaleDateString()}
                          </span>
                        </div>
                      </div>
                      <Badge status={video.status} />
                    </div>

                    {/* YouTube Metadata Preview */}
                    <div className="p-3 rounded-xl bg-surface-elevated/60 border border-white/5 space-y-1.5">
                      <div className="flex items-center justify-between text-[11px] font-semibold text-red-400">
                        <span>YOUTUBE METADATA</span>
                        {ytVariant?.isApproved && (
                          <span className="text-emerald-400 flex items-center gap-1">
                            <CheckCircle2 className="w-3 h-3" /> Approved
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-white font-medium line-clamp-1">
                        {ytVariant?.title || 'Pending title generation...'}
                      </p>
                      <p className="text-[11px] text-gray-400 line-clamp-2">
                        {ytVariant?.description || 'No description yet.'}
                      </p>
                    </div>

                    {/* Instagram Metadata Preview */}
                    <div className="p-3 rounded-xl bg-surface-elevated/60 border border-white/5 space-y-1.5">
                      <div className="flex items-center justify-between text-[11px] font-semibold text-pink-400">
                        <span>INSTAGRAM REEL</span>
                        {igVariant?.isApproved && (
                          <span className="text-emerald-400 flex items-center gap-1">
                            <CheckCircle2 className="w-3 h-3" /> Approved
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-gray-200 line-clamp-2">
                        {igVariant?.caption || 'Pending caption generation...'}
                      </p>
                      <div className="flex items-center gap-1 flex-wrap pt-1">
                        {(igVariant?.hashtags || []).slice(0, 3).map((tag: string) => (
                          <span key={tag} className="text-[10px] text-indigo-400">
                            {tag}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="mt-5 pt-3 border-t border-white/5 flex items-center justify-end">
                    <Link href={`/review/${video.id}`} className="w-full">
                      <Button variant="primary" size="sm" className="w-full gap-2 text-xs">
                        <Sparkles className="w-3.5 h-3.5" />
                        Open Review Studio
                        <ArrowRight className="w-3.5 h-3.5" />
                      </Button>
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="glass-panel rounded-2xl p-12 text-center border border-white/10 max-w-lg mx-auto">
            <CheckCircle2 className="w-12 h-12 text-emerald-400 mx-auto mb-3" />
            <h3 className="text-base font-bold text-white">Review Queue is Clear</h3>
            <p className="text-xs text-gray-400 mt-1">
              All imported videos have been reviewed and approved, or are currently being processed by the worker.
            </p>
            <div className="mt-5">
              <Link href="/videos">
                <Button variant="secondary" size="sm">
                  Go to Video Library
                </Button>
              </Link>
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
