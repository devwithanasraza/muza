'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Video as VideoIcon,
  Search,
  RefreshCw,
  ExternalLink,
  Sparkles,
  Play,
  RotateCcw,
} from 'lucide-react';
import { AppLayout } from '@/components/layout/AppLayout';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { ApiClient } from '@/lib/api';
import { formatBytes, formatDuration } from '@/lib/utils';
import { VideoStatus } from '@muza/shared';

const statusFilters = [
  { label: 'All', value: '' },
  { label: 'Ready for Review', value: VideoStatus.READY_FOR_REVIEW },
  { label: 'Processing', value: VideoStatus.PROCESSING },
  { label: 'Scheduled', value: VideoStatus.SCHEDULED },
  { label: 'Published', value: VideoStatus.PUBLISHED },
  { label: 'Failed', value: VideoStatus.FAILED },
];

export default function VideosPage() {
  const [selectedStatus, setSelectedStatus] = useState<string>('');
  const [search, setSearch] = useState<string>('');
  const [previewVideo, setPreviewVideo] = useState<any | null>(null);

  const queryClient = useQueryClient();

  const { data: videos, isLoading } = useQuery({
    queryKey: ['videos', selectedStatus, search],
    queryFn: () => {
      const params = new URLSearchParams();
      if (selectedStatus) params.append('status', selectedStatus);
      if (search) params.append('search', search);
      return ApiClient.get<any[]>(`/videos?${params.toString()}`);
    },
    refetchInterval: 10000,
  });

  const reprocessMutation = useMutation({
    mutationFn: (videoId: string) => ApiClient.post(`/videos/${videoId}/reprocess`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['videos'] });
      queryClient.invalidateQueries({ queryKey: ['overview'] });
    },
  });

  return (
    <AppLayout
      title="Video Library"
      subtitle="All Google Drive imported videos, processing states, and multi-platform publishing status"
    >
      <div className="space-y-6">
        {/* Filters and Search Bar */}
        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
          {/* Status Tabs */}
          <div className="flex items-center gap-1.5 overflow-x-auto w-full md:w-auto pb-1">
            {statusFilters.map((tab) => (
              <button
                key={tab.value}
                onClick={() => setSelectedStatus(tab.value)}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
                  selectedStatus === tab.value
                    ? 'bg-indigo-600 text-white shadow-glow'
                    : 'bg-surface-elevated text-gray-400 hover:text-white hover:bg-gray-700'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Search Box */}
          <div className="relative w-full md:w-72">
            <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search videos by filename..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-surface-elevated rounded-xl border border-white/10 text-xs text-white placeholder-gray-400 focus:outline-none focus:border-indigo-500"
            />
          </div>
        </div>

        {/* Video Table */}
        <div className="glass-panel rounded-2xl border border-white/10 overflow-hidden shadow-glass">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-white/10 text-gray-400 text-xs uppercase tracking-wider bg-white/[0.02]">
                  <th className="py-3.5 px-6 font-semibold">Video</th>
                  <th className="py-3.5 px-4 font-semibold">Size</th>
                  <th className="py-3.5 px-4 font-semibold">Status</th>
                  <th className="py-3.5 px-4 font-semibold">AI Analysis</th>
                  <th className="py-3.5 px-4 font-semibold">Published</th>
                  <th className="py-3.5 px-6 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {videos && videos.length > 0 ? (
                  videos.map((video) => (
                    <tr key={video.id} className="hover:bg-white/[0.02] transition-colors">
                      {/* Video info */}
                      <td className="py-4 px-6">
                        <div className="flex items-center gap-3">
                          <div
                            onClick={() => setPreviewVideo(video)}
                            className="w-12 h-12 rounded-xl bg-surface-elevated flex items-center justify-center text-gray-400 overflow-hidden flex-shrink-0 border border-white/10 cursor-pointer relative group"
                          >
                            {video.driveThumbnailLink ? (
                              <img
                                src={video.driveThumbnailLink}
                                alt={video.filename}
                                className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                              />
                            ) : (
                              <VideoIcon className="w-6 h-6 text-gray-500" />
                            )}
                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                              <Play className="w-4 h-4 text-white fill-white" />
                            </div>
                          </div>
                          <div>
                            <p className="font-semibold text-white truncate max-w-sm">{video.filename}</p>
                            <p className="text-[11px] text-gray-400 mt-0.5">
                              ID: {video.driveFileId.slice(0, 16)}... • {new Date(video.createdAt).toLocaleString()}
                            </p>
                          </div>
                        </div>
                      </td>

                      {/* Size */}
                      <td className="py-4 px-4 text-xs text-gray-400">
                        {formatBytes(video.fileSize)}
                      </td>

                      {/* Status */}
                      <td className="py-4 px-4">
                        <Badge status={video.status} />
                      </td>

                      {/* AI Analysis */}
                      <td className="py-4 px-4 max-w-xs">
                        {video.analysis ? (
                          <div className="space-y-1">
                            <p className="text-xs text-gray-300 truncate font-medium">
                              {video.analysis.summary}
                            </p>
                            <div className="flex items-center gap-1.5 flex-wrap">
                              {(video.analysis.topics || []).slice(0, 2).map((t: string) => (
                                <span
                                  key={t}
                                  className="px-1.5 py-0.5 rounded bg-white/5 text-[10px] text-gray-400 border border-white/5"
                                >
                                  {t}
                                </span>
                              ))}
                            </div>
                          </div>
                        ) : (
                          <span className="text-xs text-gray-500 italic">No analysis data yet</span>
                        )}
                      </td>

                      {/* Published details */}
                      <td className="py-4 px-4">
                        {video.publishedPosts && video.publishedPosts.length > 0 ? (
                          <div className="flex items-center gap-1.5">
                            {video.publishedPosts.map((p: any) => (
                              <a
                                key={p.id}
                                href={p.externalUrl || '#'}
                                target="_blank"
                                rel="noreferrer"
                                className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-400 hover:underline"
                              >
                                {p.platform} <ExternalLink className="w-3 h-3" />
                              </a>
                            ))}
                          </div>
                        ) : (
                          <span className="text-xs text-gray-500">—</span>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="py-4 px-6 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            title="Re-process video"
                            onClick={() => reprocessMutation.mutate(video.id)}
                            loading={reprocessMutation.isPending}
                          >
                            <RotateCcw className="w-3.5 h-3.5 text-gray-400 hover:text-white" />
                          </Button>

                          <Link href={`/review/${video.id}`}>
                            <Button variant="secondary" size="sm" className="gap-1.5 text-xs">
                              <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
                              Studio
                            </Button>
                          </Link>
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-gray-400 text-xs">
                      {isLoading ? 'Loading videos...' : 'No videos found matching filter.'}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Preview Modal */}
      <Modal
        isOpen={Boolean(previewVideo)}
        onClose={() => setPreviewVideo(null)}
        title={previewVideo?.filename}
        description="Google Drive Video Preview"
        maxWidth="2xl"
      >
        <div className="space-y-4">
          <div className="aspect-video bg-black rounded-xl overflow-hidden flex items-center justify-center border border-white/10">
            {previewVideo?.driveWebViewLink ? (
              <iframe
                src={previewVideo.driveWebViewLink.replace('/view', '/preview')}
                className="w-full h-full"
                allow="autoplay"
                title={previewVideo.filename}
              />
            ) : (
              <div className="text-center p-6">
                <VideoIcon className="w-12 h-12 text-gray-600 mx-auto mb-2" />
                <p className="text-xs text-gray-400">Direct embed preview unavailable for this Drive file.</p>
              </div>
            )}
          </div>

          <div className="flex justify-between items-center pt-2">
            <span className="text-xs text-gray-400">
              Format: {previewVideo?.mimeType} • Size: {formatBytes(previewVideo?.fileSize || 0)}
            </span>
            <Link href={`/review/${previewVideo?.id}`}>
              <Button size="sm">Open in AI Review Studio</Button>
            </Link>
          </div>
        </div>
      </Modal>
    </AppLayout>
  );
}
