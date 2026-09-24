'use client';

import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Settings as SettingsIcon, Save, AlertTriangle, ShieldAlert } from 'lucide-react';
import { AppLayout } from '@/components/layout/AppLayout';
import { Button } from '@/components/ui/Button';
import { ApiClient } from '@/lib/api';

export default function SettingsPage() {
  const queryClient = useQueryClient();

  const [aiProvider, setAiProvider] = useState('openai');
  const [aiModel, setAiModel] = useState('gpt-4o');
  const [defaultLanguage, setDefaultLanguage] = useState('English');
  const [defaultTimezone, setDefaultTimezone] = useState('Asia/Kolkata');
  const [defaultYouTubePrivacy, setDefaultYouTubePrivacy] = useState('PRIVATE');
  const [autoProcessing, setAutoProcessing] = useState(true);
  const [autoGenerateContent, setAutoGenerateContent] = useState(true);
  const [requireApproval, setRequireApproval] = useState(true);
  const [autoPublish, setAutoPublish] = useState(false);
  const [maxRetryLimits, setMaxRetryLimits] = useState(4);

  const { data: settings } = useQuery({
    queryKey: ['system-settings'],
    queryFn: () => ApiClient.get<Record<string, string>>('/settings'),
  });

  useEffect(() => {
    if (settings) {
      if (settings.ai_provider) setAiProvider(settings.ai_provider);
      if (settings.ai_model) setAiModel(settings.ai_model);
      if (settings.default_language) setDefaultLanguage(settings.default_language);
      if (settings.default_timezone) setDefaultTimezone(settings.default_timezone);
      if (settings.default_youtube_privacy) setDefaultYouTubePrivacy(settings.default_youtube_privacy);
      if (settings.auto_processing) setAutoProcessing(settings.auto_processing === 'true');
      if (settings.auto_generate_content) setAutoGenerateContent(settings.auto_generate_content === 'true');
      if (settings.require_approval) setRequireApproval(settings.require_approval === 'true');
      if (settings.auto_publish) setAutoPublish(settings.auto_publish === 'true');
      if (settings.max_retry_limits) setMaxRetryLimits(Number(settings.max_retry_limits));
    }
  }, [settings]);

  const updateMutation = useMutation({
    mutationFn: () =>
      ApiClient.put('/settings', {
        aiProvider,
        aiModel,
        defaultLanguage,
        defaultTimezone,
        defaultYouTubePrivacy,
        autoProcessing,
        autoGenerateContent,
        requireApproval,
        autoPublish,
        maxRetryLimits,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['system-settings'] });
      alert('System settings updated successfully.');
    },
    onError: (err: any) => {
      alert(`Settings update failed: ${err.message}`);
    },
  });

  return (
    <AppLayout
      title="System Settings & Auto-Publish Rules"
      subtitle="Configure AI models, pipeline automation thresholds, retry limits, and approval safety checks"
    >
      <div className="max-w-4xl space-y-6">
        <div className="glass-panel rounded-2xl p-6 border border-white/10 space-y-6 shadow-glass">
          <div className="flex items-center justify-between pb-4 border-b border-white/10">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 flex items-center justify-center">
                <SettingsIcon className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">Global Configuration</h3>
                <p className="text-xs text-gray-400">Production pipeline controls</p>
              </div>
            </div>

            <Button
              size="sm"
              loading={updateMutation.isPending}
              onClick={() => updateMutation.mutate()}
              className="gap-2"
            >
              <Save className="w-4 h-4" /> Save Settings
            </Button>
          </div>

          <div className="space-y-6">
            {/* AI Provider & Model */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-bold text-gray-300 uppercase tracking-wider block mb-1.5">
                  AI Provider Engine
                </label>
                <select
                  value={aiProvider}
                  onChange={(e) => setAiProvider(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-surface-elevated rounded-xl border border-white/10 text-xs text-white focus:outline-none"
                >
                  <option value="openai">OpenAI (GPT-4o & Whisper)</option>
                  <option value="anthropic" disabled>
                    Anthropic Claude (Available in upcoming release)
                  </option>
                </select>
              </div>

              <div>
                <label className="text-xs font-bold text-gray-300 uppercase tracking-wider block mb-1.5">
                  Default AI Model
                </label>
                <select
                  value={aiModel}
                  onChange={(e) => setAiModel(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-surface-elevated rounded-xl border border-white/10 text-xs text-white focus:outline-none"
                >
                  <option value="gpt-4o">gpt-4o (State-of-the-art multimodal reasoning)</option>
                  <option value="gpt-4o-mini">gpt-4o-mini (Fast and cost-optimized)</option>
                </select>
              </div>
            </div>

            {/* Timezone & Language */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-bold text-gray-300 uppercase tracking-wider block mb-1.5">
                  System Scheduling Timezone
                </label>
                <input
                  type="text"
                  value={defaultTimezone}
                  onChange={(e) => setDefaultTimezone(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-surface-elevated rounded-xl border border-white/10 text-xs text-white focus:outline-none"
                  placeholder="Asia/Kolkata"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-gray-300 uppercase tracking-wider block mb-1.5">
                  Default YouTube Upload Privacy
                </label>
                <select
                  value={defaultYouTubePrivacy}
                  onChange={(e) => setDefaultYouTubePrivacy(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-surface-elevated rounded-xl border border-white/10 text-xs text-white focus:outline-none"
                >
                  <option value="PRIVATE">PRIVATE (Safest default)</option>
                  <option value="UNLISTED">UNLISTED</option>
                  <option value="PUBLIC">PUBLIC</option>
                </select>
              </div>
            </div>

            {/* Automation Rules */}
            <div className="space-y-4 pt-4 border-t border-white/10">
              <span className="text-xs font-bold text-gray-300 uppercase tracking-wider block">
                Automation Pipeline Controls
              </span>

              {/* Auto Process */}
              <div className="flex items-center justify-between p-3.5 rounded-xl bg-surface-elevated/70 border border-white/5">
                <div>
                  <p className="text-xs font-semibold text-white">Auto-Process Discovered Videos</p>
                  <p className="text-[11px] text-gray-400">
                    Immediately trigger download, audio transcription, and analysis upon Drive discovery.
                  </p>
                </div>
                <input
                  type="checkbox"
                  checked={autoProcessing}
                  onChange={(e) => setAutoProcessing(e.target.checked)}
                  className="w-4 h-4 accent-indigo-600 rounded cursor-pointer"
                />
              </div>

              {/* Auto Generate */}
              <div className="flex items-center justify-between p-3.5 rounded-xl bg-surface-elevated/70 border border-white/5">
                <div>
                  <p className="text-xs font-semibold text-white">Auto-Generate Social Copy</p>
                  <p className="text-[11px] text-gray-400">
                    Generate YouTube & Instagram metadata adhering to Brand Profile once video analysis is complete.
                  </p>
                </div>
                <input
                  type="checkbox"
                  checked={autoGenerateContent}
                  onChange={(e) => setAutoGenerateContent(e.target.checked)}
                  className="w-4 h-4 accent-indigo-600 rounded cursor-pointer"
                />
              </div>

              {/* Require Approval */}
              <div className="flex items-center justify-between p-3.5 rounded-xl bg-surface-elevated/70 border border-white/5">
                <div>
                  <p className="text-xs font-semibold text-white">Require Manual Approval Before Publishing</p>
                  <p className="text-[11px] text-gray-400">
                    Keep posts in the review queue until a team member explicitly reviews and approves content.
                  </p>
                </div>
                <input
                  type="checkbox"
                  checked={requireApproval}
                  onChange={(e) => setRequireApproval(e.target.checked)}
                  className="w-4 h-4 accent-indigo-600 rounded cursor-pointer"
                />
              </div>

              {/* Auto Publish */}
              <div className="flex items-center justify-between p-3.5 rounded-xl bg-rose-500/5 border border-rose-500/20">
                <div className="space-y-0.5">
                  <div className="flex items-center gap-1.5">
                    <p className="text-xs font-bold text-rose-300">Auto-Publish to Channels</p>
                    <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-rose-500/20 text-rose-400">
                      OFF BY DEFAULT
                    </span>
                  </div>
                  <p className="text-[11px] text-gray-400">
                    When enabled, posts will be automatically published without manual human review.
                  </p>
                </div>
                <input
                  type="checkbox"
                  checked={autoPublish}
                  onChange={(e) => setAutoPublish(e.target.checked)}
                  className="w-4 h-4 accent-rose-600 rounded cursor-pointer"
                />
              </div>
            </div>

            {/* Retry Limits */}
            <div className="pt-4 border-t border-white/10">
              <div className="flex justify-between items-center mb-1.5">
                <label className="text-xs font-bold text-gray-300 uppercase tracking-wider">
                  Exponential Backoff Retry Limit
                </label>
                <span className="text-xs font-bold text-indigo-400">{maxRetryLimits} attempts</span>
              </div>
              <input
                type="range"
                min={1}
                max={8}
                value={maxRetryLimits}
                onChange={(e) => setMaxRetryLimits(Number(e.target.value))}
                className="w-full accent-indigo-600"
              />
              <p className="text-[11px] text-gray-400 mt-1">
                Exponential backoff: Attempt 1: 30s • Attempt 2: 2m • Attempt 3: 5m • Attempt 4: 15m. Permanent OAuth errors will abort immediately.
              </p>
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
