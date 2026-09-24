'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Sparkles,
  Youtube,
  Instagram,
  CheckCircle2,
  CalendarCheck,
  Send,
  Save,
  RotateCcw,
  ArrowLeft,
  X,
  Plus,
  Clock,
  Eye,
  Lock,
} from 'lucide-react';
import Link from 'next/link';
import { AppLayout } from '@/components/layout/AppLayout';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { ApiClient } from '@/lib/api';
import { SocialPlatform, YouTubePrivacy } from '@muza/shared';

export default function ReviewStudioPage() {
  const params = useParams();
  const router = useRouter();
  const videoId = params.id as string;
  const queryClient = useQueryClient();

  const [activePlatform, setActivePlatform] = useState<'YOUTUBE' | 'INSTAGRAM'>('YOUTUBE');
  const [customInstructions, setCustomInstructions] = useState('');
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [scheduledDateTime, setScheduledDateTime] = useState('');
  const [selectedSocialAccountId, setSelectedSocialAccountId] = useState('');
  const [newTagInput, setNewTagInput] = useState('');
  const [newHashtagInput, setNewHashtagInput] = useState('');

  // Editable YouTube Form State
  const [ytTitle, setYtTitle] = useState('');
  const [ytDescription, setYtDescription] = useState('');
  const [ytTags, setYtTags] = useState<string[]>([]);
  const [ytPrivacy, setYtPrivacy] = useState<YouTubePrivacy>(YouTubePrivacy.PRIVATE);

  // Editable Instagram Form State
  const [igCaption, setIgCaption] = useState('');
  const [igHashtags, setIgHashtags] = useState<string[]>([]);
  const [igHook, setIgHook] = useState('');

  // Fetch Video details
  const { data: video, isLoading } = useQuery({
    queryKey: ['video', videoId],
    queryFn: () => ApiClient.get<any>(`/videos/${videoId}`),
  });

  // Fetch Social Accounts for publishing
  const { data: ytAccounts } = useQuery({
    queryKey: ['yt-accounts'],
    queryFn: () => ApiClient.get<any>('/youtube/accounts'),
  });

  const { data: igAccounts } = useQuery({
    queryKey: ['ig-accounts'],
    queryFn: () => ApiClient.get<any>('/instagram/accounts'),
  });

  // Populate state when video data loads
  useEffect(() => {
    if (video?.variants) {
      const yt = video.variants.find((v: any) => v.platform === 'YOUTUBE');
      if (yt) {
        setYtTitle(yt.title || '');
        setYtDescription(yt.description || '');
        setYtTags(Array.isArray(yt.tags) ? yt.tags : []);
        setYtPrivacy(yt.privacy || YouTubePrivacy.PRIVATE);
      }

      const ig = video.variants.find((v: any) => v.platform === 'INSTAGRAM');
      if (ig) {
        setIgCaption(ig.caption || '');
        setIgHashtags(Array.isArray(ig.hashtags) ? ig.hashtags : []);
        setIgHook(ig.hook || '');
      }
    }
  }, [video]);

  // Mutations
  const saveVariantMutation = useMutation({
    mutationFn: async () => {
      const ytVariant = video?.variants.find((v: any) => v.platform === 'YOUTUBE');
      const igVariant = video?.variants.find((v: any) => v.platform === 'INSTAGRAM');

      if (ytVariant) {
        await ApiClient.put(`/content/variants/${ytVariant.id}`, {
          title: ytTitle,
          description: ytDescription,
          tags: ytTags,
          privacy: ytPrivacy,
        });
      }

      if (igVariant) {
        await ApiClient.put(`/content/variants/${igVariant.id}`, {
          caption: igCaption,
          hashtags: igHashtags,
          hook: igHook,
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['video', videoId] });
      alert('Draft changes saved successfully.');
    },
  });

  const approveMutation = useMutation({
    mutationFn: async () => {
      const currentVariant = video?.variants.find((v: any) => v.platform === activePlatform);
      if (!currentVariant) return;

      // Save latest edits first
      if (activePlatform === 'YOUTUBE') {
        await ApiClient.put(`/content/variants/${currentVariant.id}`, {
          title: ytTitle,
          description: ytDescription,
          tags: ytTags,
          privacy: ytPrivacy,
        });
      } else {
        await ApiClient.put(`/content/variants/${currentVariant.id}`, {
          caption: igCaption,
          hashtags: igHashtags,
          hook: igHook,
        });
      }

      // Approve
      await ApiClient.post(`/content/variants/${currentVariant.id}/approve`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['video', videoId] });
      queryClient.invalidateQueries({ queryKey: ['review-queue'] });
      alert(`${activePlatform} content approved.`);
    },
    onError: (err: any) => {
      alert(`Approval error: ${err.message}`);
    },
  });

  const regenerateMutation = useMutation({
    mutationFn: () =>
      ApiClient.post(`/content/videos/${videoId}/regenerate`, {
        customInstructions,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['video', videoId] });
      alert('AI content regeneration started. Updates will appear shortly.');
      setCustomInstructions('');
    },
  });

  const publishMutation = useMutation({
    mutationFn: async ({ publishNow, scheduledAt }: { publishNow: boolean; scheduledAt?: string }) => {
      const currentVariant = video?.variants.find((v: any) => v.platform === activePlatform);
      if (!currentVariant) throw new Error('No content variant available');

      if (!selectedSocialAccountId) {
        throw new Error(`Please select a connected ${activePlatform} account`);
      }

      return ApiClient.post('/publishing/schedule', {
        contentVariantId: currentVariant.id,
        socialAccountId: selectedSocialAccountId,
        platform: activePlatform,
        publishNow,
        scheduledAt,
        timezone: 'Asia/Kolkata',
      });
    },
    onSuccess: (data: any) => {
      setShowScheduleModal(false);
      queryClient.invalidateQueries({ queryKey: ['video', videoId] });
      queryClient.invalidateQueries({ queryKey: ['overview'] });
      alert(data.message || 'Publishing job queued successfully.');
      router.push('/publishing');
    },
    onError: (err: any) => {
      alert(`Publishing failed: ${err.message}`);
    },
  });

  const ytVariant = video?.variants?.find((v: any) => v.platform === 'YOUTUBE');
  const igVariant = video?.variants?.find((v: any) => v.platform === 'INSTAGRAM');

  const addTag = () => {
    if (newTagInput.trim() && !ytTags.includes(newTagInput.trim())) {
      setYtTags([...ytTags, newTagInput.trim()]);
      setNewTagInput('');
    }
  };

  const removeTag = (tagToRemove: string) => {
    setYtTags(ytTags.filter((t) => t !== tagToRemove));
  };

  const addHashtag = () => {
    let tag = newHashtagInput.trim();
    if (!tag) return;
    if (!tag.startsWith('#')) tag = `#${tag}`;
    if (!igHashtags.includes(tag)) {
      setIgHashtags([...igHashtags, tag]);
      setNewHashtagInput('');
    }
  };

  const removeHashtag = (tagToRemove: string) => {
    setIgHashtags(igHashtags.filter((t) => t !== tagToRemove));
  };

  const connectedAccounts =
    activePlatform === 'YOUTUBE' ? ytAccounts?.accounts || [] : igAccounts?.accounts || [];

  return (
    <AppLayout
      title="AI Review Studio"
      subtitle={`Review, edit, and approve publication content for "${video?.filename || 'video'}"`}
    >
      <div className="space-y-6">
        {/* Top Navigation & Status Bar */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 glass-panel p-4 rounded-2xl border border-white/10">
          <div className="flex items-center gap-3">
            <Link href="/review">
              <Button variant="ghost" size="sm" className="p-2">
                <ArrowLeft className="w-4 h-4" />
              </Button>
            </Link>
            <div>
              <h3 className="text-sm font-bold text-white truncate max-w-md">{video?.filename}</h3>
              <p className="text-xs text-gray-400">
                Drive ID: {video?.driveFileId?.slice(0, 16)} • Status: {video?.status}
              </p>
            </div>
            {video?.status && <Badge status={video.status} />}
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              loading={saveVariantMutation.isPending}
              onClick={() => saveVariantMutation.mutate()}
              className="gap-1.5"
            >
              <Save className="w-3.5 h-3.5" />
              Save Draft
            </Button>

            <Button
              variant="secondary"
              size="sm"
              loading={approveMutation.isPending}
              onClick={() => approveMutation.mutate()}
              className="gap-1.5 text-emerald-400 border-emerald-500/30"
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              Approve
            </Button>

            <Button
              variant="primary"
              size="sm"
              onClick={() => {
                if (connectedAccounts.length > 0) {
                  setSelectedSocialAccountId(connectedAccounts[0].id);
                }
                setShowScheduleModal(true);
              }}
              className="gap-1.5"
            >
              <Send className="w-3.5 h-3.5" />
              Publish / Schedule
            </Button>
          </div>
        </div>

        {/* AI Prompt Instruction Bar */}
        <div className="glass-panel p-3.5 rounded-2xl border border-indigo-500/20 bg-indigo-500/5 flex items-center gap-3">
          <Sparkles className="w-5 h-5 text-indigo-400 flex-shrink-0" />
          <input
            type="text"
            placeholder="Instruct AI: e.g. 'Make YouTube title more controversial', 'Add technical tags', 'Change tone to casual'..."
            value={customInstructions}
            onChange={(e) => setCustomInstructions(e.target.value)}
            className="flex-1 bg-transparent text-xs text-white placeholder-gray-400 focus:outline-none"
            onKeyDown={(e) => {
              if (e.key === 'Enter') regenerateMutation.mutate();
            }}
          />
          <Button
            size="sm"
            variant="secondary"
            loading={regenerateMutation.isPending}
            onClick={() => regenerateMutation.mutate()}
            className="text-xs gap-1.5 bg-indigo-600/20 text-indigo-300 border-indigo-500/30"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Regenerate
          </Button>
        </div>

        {/* Two-Column Studio Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* LEFT: Video Preview & Transcript (5 cols) */}
          <div className="lg:col-span-5 space-y-6">
            {/* Player Preview */}
            <div className="glass-panel rounded-2xl p-4 border border-white/10 space-y-3">
              <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Video Source</span>
              <div className="aspect-video bg-black rounded-xl overflow-hidden border border-white/10 flex items-center justify-center">
                {video?.driveWebViewLink ? (
                  <iframe
                    src={video.driveWebViewLink.replace('/view', '/preview')}
                    className="w-full h-full"
                    allow="autoplay"
                    title={video.filename}
                  />
                ) : (
                  <div className="text-center p-4 text-gray-500">
                    <p className="text-xs">Drive preview unavailable</p>
                  </div>
                )}
              </div>
            </div>

            {/* AI Video Intelligence */}
            <div className="glass-panel rounded-2xl p-5 border border-white/10 space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">AI Intelligence</span>
                <span className="text-[11px] text-indigo-400 font-semibold">
                  Confidence: {Math.round((video?.analysis?.confidence || 0.9) * 100)}%
                </span>
              </div>

              <div className="space-y-2 text-xs">
                <div>
                  <span className="text-gray-400 block font-medium mb-1">Executive Summary:</span>
                  <p className="text-gray-200 bg-surface-elevated/70 p-3 rounded-xl border border-white/5 leading-relaxed">
                    {video?.analysis?.summary || 'Pending AI analysis...'}
                  </p>
                </div>

                <div>
                  <span className="text-gray-400 block font-medium mb-1">Key Topics & Keywords:</span>
                  <div className="flex flex-wrap gap-1.5">
                    {((video?.analysis?.topics as string[]) || []).map((t: string) => (
                      <span
                        key={t}
                        className="px-2 py-0.5 rounded-lg bg-indigo-500/10 text-indigo-300 border border-indigo-500/20 text-[11px]"
                      >
                        {t}
                      </span>
                    ))}
                    {((video?.analysis?.keywords as string[]) || []).map((k: string) => (
                      <span
                        key={k}
                        className="px-2 py-0.5 rounded-lg bg-white/5 text-gray-300 border border-white/5 text-[11px]"
                      >
                        {k}
                      </span>
                    ))}
                  </div>
                </div>

                {video?.analysis?.transcript && (
                  <div>
                    <span className="text-gray-400 block font-medium mb-1">Audio Transcript:</span>
                    <div className="max-h-40 overflow-y-auto bg-surface-elevated/50 p-3 rounded-xl border border-white/5 text-[11px] text-gray-300 leading-normal">
                      {video.analysis.transcript}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* RIGHT: Platform Content Editors (7 cols) */}
          <div className="lg:col-span-7 space-y-4">
            {/* Platform Selector Tabs */}
            <div className="flex items-center gap-2 p-1.5 rounded-2xl glass-panel border border-white/10">
              <button
                onClick={() => setActivePlatform('YOUTUBE')}
                className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-bold transition-all ${
                  activePlatform === 'YOUTUBE'
                    ? 'bg-red-600 text-white shadow-glow'
                    : 'text-gray-400 hover:text-white hover:bg-white/5'
                }`}
              >
                <Youtube className="w-4 h-4" />
                YouTube Video
                {ytVariant?.isApproved && <span className="text-[10px] text-emerald-300">✓</span>}
              </button>

              <button
                onClick={() => setActivePlatform('INSTAGRAM')}
                className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-bold transition-all ${
                  activePlatform === 'INSTAGRAM'
                    ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow-glow'
                    : 'text-gray-400 hover:text-white hover:bg-white/5'
                }`}
              >
                <Instagram className="w-4 h-4" />
                Instagram Reel
                {igVariant?.isApproved && <span className="text-[10px] text-emerald-300">✓</span>}
              </button>
            </div>

            {/* YouTube Editor */}
            {activePlatform === 'YOUTUBE' && (
              <div className="glass-panel rounded-2xl p-6 border border-white/10 space-y-5">
                {/* Title */}
                <div>
                  <div className="flex justify-between items-center mb-1.5">
                    <label className="text-xs font-bold text-gray-300 uppercase tracking-wider">
                      YouTube Video Title
                    </label>
                    <span
                      className={`text-[11px] font-semibold ${
                        ytTitle.length > 100 ? 'text-rose-400' : 'text-gray-400'
                      }`}
                    >
                      {ytTitle.length} / 100
                    </span>
                  </div>
                  <input
                    type="text"
                    value={ytTitle}
                    onChange={(e) => setYtTitle(e.target.value)}
                    maxLength={100}
                    className="w-full px-4 py-2.5 bg-surface-elevated rounded-xl border border-white/10 text-sm text-white focus:outline-none focus:border-red-500"
                    placeholder="Enter engaging title..."
                  />
                </div>

                {/* Description */}
                <div>
                  <div className="flex justify-between items-center mb-1.5">
                    <label className="text-xs font-bold text-gray-300 uppercase tracking-wider">
                      Description & Chapters
                    </label>
                    <span className="text-[11px] text-gray-400 font-semibold">{ytDescription.length} / 5000</span>
                  </div>
                  <textarea
                    rows={8}
                    value={ytDescription}
                    onChange={(e) => setYtDescription(e.target.value)}
                    maxLength={5000}
                    className="w-full px-4 py-3 bg-surface-elevated rounded-xl border border-white/10 text-xs text-white focus:outline-none focus:border-red-500 leading-relaxed font-mono"
                    placeholder="Video description, timestamps, and links..."
                  />
                </div>

                {/* Tags Editor */}
                <div>
                  <label className="text-xs font-bold text-gray-300 uppercase tracking-wider block mb-1.5">
                    Tags ({ytTags.length})
                  </label>
                  <div className="p-3 bg-surface-elevated rounded-xl border border-white/10 space-y-2">
                    <div className="flex flex-wrap gap-1.5">
                      {ytTags.map((tag) => (
                        <span
                          key={tag}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-red-500/10 text-red-300 border border-red-500/20 text-xs"
                        >
                          {tag}
                          <button onClick={() => removeTag(tag)} className="hover:text-white">
                            <X className="w-3 h-3" />
                          </button>
                        </span>
                      ))}
                    </div>
                    <div className="flex items-center gap-2 pt-1">
                      <input
                        type="text"
                        placeholder="Add tag and press Enter..."
                        value={newTagInput}
                        onChange={(e) => setNewTagInput(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            addTag();
                          }
                        }}
                        className="flex-1 bg-surface rounded-lg px-3 py-1.5 text-xs text-white border border-white/10 focus:outline-none"
                      />
                      <Button variant="secondary" size="sm" onClick={addTag} className="text-xs">
                        <Plus className="w-3 h-3" /> Add
                      </Button>
                    </div>
                  </div>
                </div>

                {/* Privacy */}
                <div>
                  <label className="text-xs font-bold text-gray-300 uppercase tracking-wider block mb-1.5">
                    Default Privacy
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {[YouTubePrivacy.PRIVATE, YouTubePrivacy.UNLISTED, YouTubePrivacy.PUBLIC].map((p) => (
                      <button
                        key={p}
                        onClick={() => setYtPrivacy(p)}
                        className={`py-2 rounded-xl text-xs font-semibold border transition-all ${
                          ytPrivacy === p
                            ? 'bg-red-500/20 text-red-400 border-red-500/40 shadow-sm'
                            : 'bg-surface-elevated text-gray-400 border-white/5 hover:text-white'
                        }`}
                      >
                        {p}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Instagram Editor */}
            {activePlatform === 'INSTAGRAM' && (
              <div className="glass-panel rounded-2xl p-6 border border-white/10 space-y-5">
                {/* Hook */}
                <div>
                  <label className="text-xs font-bold text-gray-300 uppercase tracking-wider block mb-1.5">
                    Opening Reel Hook
                  </label>
                  <input
                    type="text"
                    value={igHook}
                    onChange={(e) => setIgHook(e.target.value)}
                    className="w-full px-4 py-2.5 bg-surface-elevated rounded-xl border border-white/10 text-sm text-white focus:outline-none focus:border-pink-500"
                    placeholder="First 3 seconds hook sentence..."
                  />
                </div>

                {/* Caption */}
                <div>
                  <div className="flex justify-between items-center mb-1.5">
                    <label className="text-xs font-bold text-gray-300 uppercase tracking-wider">
                      Instagram Caption
                    </label>
                    <span className="text-[11px] text-gray-400 font-semibold">{igCaption.length} / 2200</span>
                  </div>
                  <textarea
                    rows={7}
                    value={igCaption}
                    onChange={(e) => setIgCaption(e.target.value)}
                    maxLength={2200}
                    className="w-full px-4 py-3 bg-surface-elevated rounded-xl border border-white/10 text-xs text-white focus:outline-none focus:border-pink-500 leading-relaxed font-sans"
                    placeholder="Write engaging caption..."
                  />
                </div>

                {/* Hashtag Engine */}
                <div>
                  <div className="flex justify-between items-center mb-1.5">
                    <label className="text-xs font-bold text-gray-300 uppercase tracking-wider">
                      Hashtags ({igHashtags.length} / 30)
                    </label>
                  </div>
                  <div className="p-3 bg-surface-elevated rounded-xl border border-white/10 space-y-2">
                    <div className="flex flex-wrap gap-1.5">
                      {igHashtags.map((tag) => (
                        <span
                          key={tag}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-pink-500/10 text-pink-300 border border-pink-500/20 text-xs"
                        >
                          {tag}
                          <button onClick={() => removeHashtag(tag)} className="hover:text-white">
                            <X className="w-3 h-3" />
                          </button>
                        </span>
                      ))}
                    </div>
                    <div className="flex items-center gap-2 pt-1">
                      <input
                        type="text"
                        placeholder="Add hashtag (e.g. #TechReels)..."
                        value={newHashtagInput}
                        onChange={(e) => setNewHashtagInput(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            addHashtag();
                          }
                        }}
                        className="flex-1 bg-surface rounded-lg px-3 py-1.5 text-xs text-white border border-white/10 focus:outline-none"
                      />
                      <Button variant="secondary" size="sm" onClick={addHashtag} className="text-xs">
                        <Plus className="w-3 h-3" /> Add
                      </Button>
                    </div>
                  </div>
                </div>

                {/* Reel Mobile Preview Simulation */}
                <div className="p-4 rounded-xl bg-surface-elevated/70 border border-white/5 flex items-start gap-4">
                  <div className="w-16 h-28 rounded-lg bg-black flex-shrink-0 flex items-center justify-center border border-white/10 relative overflow-hidden">
                    {video?.driveThumbnailLink ? (
                      <img src={video.driveThumbnailLink} alt="" className="w-full h-full object-cover opacity-60" />
                    ) : (
                      <div className="text-[10px] text-gray-500">Reel</div>
                    )}
                    <span className="absolute bottom-1 right-1 text-[8px] text-white bg-black/60 px-1 rounded">
                      9:16
                    </span>
                  </div>
                  <div className="flex-1 space-y-1">
                    <p className="text-xs font-semibold text-white">Live Feed Simulator</p>
                    <p className="text-[11px] text-gray-300 line-clamp-3">
                      {igCaption || 'Caption will appear here...'}
                    </p>
                    <p className="text-[10px] text-pink-400 font-medium">
                      {igHashtags.slice(0, 5).join(' ')}
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Schedule & Publish Modal */}
      <Modal
        isOpen={showScheduleModal}
        onClose={() => setShowScheduleModal(false)}
        title={`Publish to ${activePlatform}`}
        description="Choose immediate publishing or schedule for automated dispatch"
        maxWidth="md"
      >
        <div className="space-y-5">
          {/* Target Account Selector */}
          <div>
            <label className="text-xs font-bold text-gray-300 uppercase tracking-wider block mb-1.5">
              Select Connected Channel/Account
            </label>
            {connectedAccounts.length > 0 ? (
              <select
                value={selectedSocialAccountId}
                onChange={(e) => setSelectedSocialAccountId(e.target.value)}
                className="w-full px-3 py-2 bg-surface-elevated rounded-xl border border-white/10 text-xs text-white focus:outline-none"
              >
                {connectedAccounts.map((acc: any) => (
                  <option key={acc.id} value={acc.id}>
                    {acc.accountName} ({activePlatform})
                  </option>
                ))}
              </select>
            ) : (
              <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs">
                No connected {activePlatform} account found. Please link your account in the Integrations Hub first.
              </div>
            )}
          </div>

          {/* Schedule Date & Time */}
          <div>
            <label className="text-xs font-bold text-gray-300 uppercase tracking-wider block mb-1.5">
              Schedule Publication (Optional)
            </label>
            <input
              type="datetime-local"
              value={scheduledDateTime}
              onChange={(e) => setScheduledDateTime(e.target.value)}
              className="w-full px-3 py-2 bg-surface-elevated rounded-xl border border-white/10 text-xs text-white focus:outline-none"
            />
            <p className="text-[11px] text-gray-400 mt-1">
              Timezone: Asia/Kolkata (IST). Leave blank to publish immediately.
            </p>
          </div>

          {/* Action buttons */}
          <div className="flex items-center justify-end gap-2 pt-3 border-t border-white/10">
            <Button variant="ghost" size="sm" onClick={() => setShowScheduleModal(false)}>
              Cancel
            </Button>

            {scheduledDateTime ? (
              <Button
                variant="primary"
                size="sm"
                loading={publishMutation.isPending}
                disabled={!selectedSocialAccountId}
                onClick={() =>
                  publishMutation.mutate({
                    publishNow: false,
                    scheduledAt: new Date(scheduledDateTime).toISOString(),
                  })
                }
                className="gap-1.5"
              >
                <CalendarCheck className="w-3.5 h-3.5" /> Schedule Post
              </Button>
            ) : (
              <Button
                variant="primary"
                size="sm"
                loading={publishMutation.isPending}
                disabled={!selectedSocialAccountId}
                onClick={() => publishMutation.mutate({ publishNow: true })}
                className="gap-1.5 bg-emerald-600 hover:bg-emerald-500 text-white"
              >
                <Send className="w-3.5 h-3.5" /> Publish Now
              </Button>
            )}
          </div>
        </div>
      </Modal>
    </AppLayout>
  );
}
