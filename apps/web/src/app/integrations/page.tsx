'use client';

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  HardDrive,
  Youtube,
  Instagram,
  CheckCircle2,
  AlertTriangle,
  FolderSync,
  ExternalLink,
  Trash2,
  RefreshCw,
  Folder,
} from 'lucide-react';
import { AppLayout } from '@/components/layout/AppLayout';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { ApiClient } from '@/lib/api';

export default function IntegrationsPage() {
  const queryClient = useQueryClient();
  const [showFolderModal, setShowFolderModal] = useState(false);
  const [selectedFolderId, setSelectedFolderId] = useState('');

  // 1. Google Drive Connection Query
  const { data: driveData, isLoading: driveLoading } = useQuery({
    queryKey: ['drive-connection'],
    queryFn: () => ApiClient.get<any>('/drive/connections'),
  });

  // 2. YouTube Accounts Query
  const { data: ytData, isLoading: ytLoading } = useQuery({
    queryKey: ['youtube-accounts'],
    queryFn: () => ApiClient.get<any>('/youtube/accounts'),
  });

  // 3. Instagram Accounts Query
  const { data: igData, isLoading: igLoading } = useQuery({
    queryKey: ['instagram-accounts'],
    queryFn: () => ApiClient.get<any>('/instagram/accounts'),
  });

  // 4. Drive Folders for Picker
  const { data: driveFolders } = useQuery({
    queryKey: ['drive-folders'],
    queryFn: () => ApiClient.get<Array<{ id: string; name: string }>>('/drive/folders'),
    enabled: Boolean(driveData?.connected),
  });

  // OAuth Connect Mutations
  const connectDriveMutation = useMutation({
    mutationFn: async () => {
      const res = await ApiClient.get<{ url: string }>('/drive/auth-url');
      window.location.href = res.url;
    },
    onError: (err: any) => alert(err.message),
  });

  const connectYouTubeMutation = useMutation({
    mutationFn: async () => {
      const res = await ApiClient.get<{ url: string }>('/youtube/auth-url');
      window.location.href = res.url;
    },
    onError: (err: any) => alert(err.message),
  });

  const connectInstagramMutation = useMutation({
    mutationFn: async () => {
      const res = await ApiClient.get<{ url: string }>('/instagram/auth-url');
      window.location.href = res.url;
    },
    onError: (err: any) => alert(err.message),
  });

  // Select Folder Mutation
  const selectFolderMutation = useMutation({
    mutationFn: async (folder: { id: string; name: string }) => {
      return ApiClient.post('/drive/folders/select', {
        folderId: folder.id,
        folderName: folder.name,
      });
    },
    onSuccess: () => {
      setShowFolderModal(false);
      queryClient.invalidateQueries({ queryKey: ['drive-connection'] });
      alert('Drive folder selected for automated video syncing.');
    },
  });

  // Disconnect Mutations
  const disconnectYtMutation = useMutation({
    mutationFn: (id: string) => ApiClient.delete(`/youtube/accounts/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['youtube-accounts'] }),
  });

  const disconnectIgMutation = useMutation({
    mutationFn: (id: string) => ApiClient.delete(`/instagram/accounts/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['instagram-accounts'] }),
  });

  return (
    <AppLayout
      title="Integrations & OAuth Connections"
      subtitle="Connect official platform APIs to automate video imports, AI generation, and multi-network publishing"
    >
      <div className="space-y-8 max-w-5xl">
        {/* Google Drive Integration */}
        <div className="glass-panel rounded-2xl p-6 border border-white/10 shadow-glass">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-blue-500/10 text-blue-400 border border-blue-500/20 flex items-center justify-center">
                <HardDrive className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">Google Drive</h3>
                <p className="text-xs text-gray-400">
                  Primary automated ingestion source for raw video assets (MP4, MOV, WEBM)
                </p>
              </div>
            </div>

            <div>
              {driveData?.connected ? (
                <Badge status="CONNECTED" />
              ) : driveData?.isConfigured ? (
                <Badge status="DISCONNECTED" />
              ) : (
                <Badge status="ERROR" />
              )}
            </div>
          </div>

          <div className="mt-6 pt-5 border-t border-white/5 space-y-4">
            {driveData?.connected ? (
              <div className="space-y-4">
                <div className="flex items-center justify-between p-3.5 rounded-xl bg-surface-elevated/70 border border-white/5">
                  <div className="space-y-0.5">
                    <span className="text-[11px] text-gray-400 uppercase font-semibold">Authorized Account</span>
                    <p className="text-xs font-semibold text-emerald-400">
                      ✓ {driveData.accountEmail || 'Connected'}
                    </p>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowFolderModal(true)}
                    className="text-xs gap-1.5"
                  >
                    <Folder className="w-3.5 h-3.5" /> Choose Monitored Folder
                  </Button>
                </div>

                {driveData.folders && driveData.folders.length > 0 && (
                  <div>
                    <span className="text-xs font-bold text-gray-300 uppercase tracking-wider block mb-2">
                      Active Sync Folders
                    </span>
                    <div className="space-y-2">
                      {driveData.folders.map((f: any) => (
                        <div
                          key={f.id}
                          className="flex items-center justify-between p-3 rounded-xl bg-surface-elevated border border-white/5 text-xs"
                        >
                          <div className="flex items-center gap-2">
                            <FolderSync className="w-4 h-4 text-indigo-400" />
                            <span className="font-semibold text-white">{f.folderName}</span>
                            <span className="text-[11px] text-gray-400">({f.folderId})</span>
                          </div>
                          <span className="text-[11px] text-gray-400">
                            Last synced: {f.lastSyncedAt ? new Date(f.lastSyncedAt).toLocaleTimeString() : 'Never'}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : driveData?.isConfigured ? (
              <div className="flex items-center justify-between">
                <p className="text-xs text-gray-400">
                  Click connect to complete Google OAuth and authorize read-only folder access.
                </p>
                <Button
                  size="sm"
                  loading={connectDriveMutation.isPending}
                  onClick={() => connectDriveMutation.mutate()}
                  className="gap-2"
                >
                  <HardDrive className="w-4 h-4" /> Connect Google Drive
                </Button>
              </div>
            ) : (
              <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs flex items-center justify-between">
                <span>Integration not configured: Add GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET to .env</span>
              </div>
            )}
          </div>
        </div>

        {/* YouTube Integration */}
        <div className="glass-panel rounded-2xl p-6 border border-white/10 shadow-glass">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-red-500/10 text-red-400 border border-red-500/20 flex items-center justify-center">
                <Youtube className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">YouTube Data API v3</h3>
                <p className="text-xs text-gray-400">
                  Direct resumable video uploads, metadata formatting, and channel metrics
                </p>
              </div>
            </div>

            <div>
              {ytData?.connected ? (
                <Badge status="CONNECTED" />
              ) : ytData?.isConfigured ? (
                <Badge status="DISCONNECTED" />
              ) : (
                <Badge status="ERROR" />
              )}
            </div>
          </div>

          <div className="mt-6 pt-5 border-t border-white/5">
            {ytData?.connected ? (
              <div className="space-y-3">
                {ytData.accounts.map((acc: any) => (
                  <div
                    key={acc.id}
                    className="flex items-center justify-between p-3.5 rounded-xl bg-surface-elevated/70 border border-white/5"
                  >
                    <div>
                      <p className="text-xs font-bold text-white">{acc.accountName}</p>
                      <p className="text-[11px] text-gray-400">Channel ID: {acc.externalAccountId}</p>
                    </div>
                    <Button
                      variant="danger"
                      size="sm"
                      onClick={() => disconnectYtMutation.mutate(acc.id)}
                      loading={disconnectYtMutation.isPending}
                      className="text-xs"
                    >
                      Disconnect
                    </Button>
                  </div>
                ))}
              </div>
            ) : ytData?.isConfigured ? (
              <div className="flex items-center justify-between">
                <p className="text-xs text-gray-400">
                  Authorize your YouTube channel for automated video publication.
                </p>
                <Button
                  size="sm"
                  loading={connectYouTubeMutation.isPending}
                  onClick={() => connectYouTubeMutation.mutate()}
                  className="gap-2 bg-red-600 hover:bg-red-500 text-white"
                >
                  <Youtube className="w-4 h-4" /> Link YouTube Channel
                </Button>
              </div>
            ) : (
              <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs">
                Integration not configured: Add YOUTUBE_CLIENT_ID and YOUTUBE_CLIENT_SECRET to .env
              </div>
            )}
          </div>
        </div>

        {/* Instagram Integration */}
        <div className="glass-panel rounded-2xl p-6 border border-white/10 shadow-glass">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-pink-500/10 text-pink-400 border border-pink-500/20 flex items-center justify-center">
                <Instagram className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">Meta Graph API (Instagram Reels)</h3>
                <p className="text-xs text-gray-400">
                  Official Meta API for publishing 9:16 short-form videos to Instagram Professional Accounts
                </p>
              </div>
            </div>

            <div>
              {igData?.connected ? (
                <Badge status="CONNECTED" />
              ) : igData?.isConfigured ? (
                <Badge status="DISCONNECTED" />
              ) : (
                <Badge status="ERROR" />
              )}
            </div>
          </div>

          <div className="mt-6 pt-5 border-t border-white/5">
            {igData?.connected ? (
              <div className="space-y-3">
                {igData.accounts.map((acc: any) => (
                  <div
                    key={acc.id}
                    className="flex items-center justify-between p-3.5 rounded-xl bg-surface-elevated/70 border border-white/5"
                  >
                    <div>
                      <p className="text-xs font-bold text-white">@{acc.accountName}</p>
                      <p className="text-[11px] text-gray-400">Instagram Account ID: {acc.externalAccountId}</p>
                    </div>
                    <Button
                      variant="danger"
                      size="sm"
                      onClick={() => disconnectIgMutation.mutate(acc.id)}
                      loading={disconnectIgMutation.isPending}
                      className="text-xs"
                    >
                      Disconnect
                    </Button>
                  </div>
                ))}
              </div>
            ) : igData?.isConfigured ? (
              <div className="flex items-center justify-between">
                <p className="text-xs text-gray-400">
                  Connect via official Meta OAuth to link your Instagram Creator or Business account.
                </p>
                <Button
                  size="sm"
                  loading={connectInstagramMutation.isPending}
                  onClick={() => connectInstagramMutation.mutate()}
                  className="gap-2 bg-gradient-to-r from-purple-600 to-pink-600 text-white"
                >
                  <Instagram className="w-4 h-4" /> Connect Instagram Business
                </Button>
              </div>
            ) : (
              <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs">
                Integration not configured: Add META_APP_ID and META_APP_SECRET to .env
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Drive Folder Selector Modal */}
      <Modal
        isOpen={showFolderModal}
        onClose={() => setShowFolderModal(false)}
        title="Select Google Drive Monitored Folder"
        description="Choose which folder MUZA should watch for new video uploads"
        maxWidth="md"
      >
        <div className="space-y-4">
          <div className="max-h-60 overflow-y-auto space-y-1.5 pr-1">
            {driveFolders && driveFolders.length > 0 ? (
              driveFolders.map((folder) => (
                <div
                  key={folder.id}
                  onClick={() => setSelectedFolderId(folder.id)}
                  className={`flex items-center gap-3 p-3 rounded-xl border text-xs cursor-pointer transition-all ${
                    selectedFolderId === folder.id
                      ? 'bg-indigo-600/20 border-indigo-500 text-white font-semibold'
                      : 'bg-surface-elevated border-white/5 text-gray-300 hover:border-white/20'
                  }`}
                >
                  <Folder className="w-4 h-4 text-indigo-400 flex-shrink-0" />
                  <span className="truncate flex-1">{folder.name}</span>
                  {selectedFolderId === folder.id && (
                    <CheckCircle2 className="w-4 h-4 text-indigo-400 flex-shrink-0" />
                  )}
                </div>
              ))
            ) : (
              <p className="text-xs text-gray-400 text-center py-6">No folders found in Google Drive.</p>
            )}
          </div>

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-white/10">
            <Button variant="ghost" size="sm" onClick={() => setShowFolderModal(false)}>
              Cancel
            </Button>
            <Button
              size="sm"
              disabled={!selectedFolderId}
              loading={selectFolderMutation.isPending}
              onClick={() => {
                const folder = driveFolders?.find((f) => f.id === selectedFolderId);
                if (folder) selectFolderMutation.mutate(folder);
              }}
            >
              Confirm Monitored Folder
            </Button>
          </div>
        </div>
      </Modal>
    </AppLayout>
  );
}
