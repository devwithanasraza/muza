'use client';

import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { BookmarkCheck, Save, Sparkles, AlertCircle } from 'lucide-react';
import { AppLayout } from '@/components/layout/AppLayout';
import { Button } from '@/components/ui/Button';
import { ApiClient } from '@/lib/api';

export default function BrandProfilePage() {
  const queryClient = useQueryClient();

  const [brandName, setBrandName] = useState('');
  const [niche, setNiche] = useState('');
  const [audience, setAudience] = useState('');
  const [language, setLanguage] = useState('English');
  const [tone, setTone] = useState('');
  const [descriptionStyle, setDescriptionStyle] = useState('');
  const [captionStyle, setCaptionStyle] = useState('');
  const [defaultCTA, setDefaultCTA] = useState('');
  const [defaultHashtags, setDefaultHashtags] = useState('');
  const [forbiddenWords, setForbiddenWords] = useState('');
  const [preferredWords, setPreferredWords] = useState('');
  const [emojiPolicy, setEmojiPolicy] = useState('STANDARD');

  const { data: profile, isLoading } = useQuery({
    queryKey: ['brand-profile'],
    queryFn: () => ApiClient.get<any>('/brand/profile'),
  });

  useEffect(() => {
    if (profile) {
      setBrandName(profile.brandName || '');
      setNiche(profile.niche || '');
      setAudience(profile.audience || '');
      setLanguage(profile.language || 'English');
      setTone(profile.tone || '');
      setDescriptionStyle(profile.descriptionStyle || '');
      setCaptionStyle(profile.captionStyle || '');
      setDefaultCTA(profile.defaultCTA || '');
      setDefaultHashtags(Array.isArray(profile.defaultHashtags) ? profile.defaultHashtags.join(', ') : '');
      setForbiddenWords(Array.isArray(profile.forbiddenWords) ? profile.forbiddenWords.join(', ') : '');
      setPreferredWords(Array.isArray(profile.preferredWords) ? profile.preferredWords.join(', ') : '');
      setEmojiPolicy(profile.emojiPolicy || 'STANDARD');
    }
  }, [profile]);

  const saveMutation = useMutation({
    mutationFn: () =>
      ApiClient.put('/brand/profile', {
        brandName,
        niche,
        audience,
        language,
        tone,
        descriptionStyle,
        captionStyle,
        defaultCTA,
        defaultHashtags: defaultHashtags
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean),
        forbiddenWords: forbiddenWords
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean),
        preferredWords: preferredWords
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean),
        emojiPolicy,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['brand-profile'] });
      alert('Brand Profile saved. AI generations will now respect these brand guidelines.');
    },
    onError: (err: any) => {
      alert(`Error saving brand profile: ${err.message}`);
    },
  });

  return (
    <AppLayout
      title="Brand Profiles & Style Guide"
      subtitle="Define brand voice, niche, rules, forbidden words, and CTAs for AI content generation"
    >
      <div className="max-w-4xl space-y-6">
        <div className="glass-panel rounded-2xl p-6 border border-white/10 space-y-6 shadow-glass">
          {/* Header */}
          <div className="flex items-center justify-between pb-4 border-b border-white/10">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 flex items-center justify-center">
                <BookmarkCheck className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">Active Brand Profile</h3>
                <p className="text-xs text-gray-400">Instruct the AI copywriter on voice, audience and constraints</p>
              </div>
            </div>

            <Button
              size="sm"
              loading={saveMutation.isPending}
              onClick={() => saveMutation.mutate()}
              className="gap-2"
            >
              <Save className="w-4 h-4" /> Save Profile
            </Button>
          </div>

          {/* Form Fields */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* Brand Name */}
            <div>
              <label className="text-xs font-bold text-gray-300 uppercase tracking-wider block mb-1.5">
                Brand / Channel Name *
              </label>
              <input
                type="text"
                value={brandName}
                onChange={(e) => setBrandName(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-surface-elevated rounded-xl border border-white/10 text-xs text-white focus:outline-none focus:border-indigo-500"
                placeholder="e.g. TechVision Studio"
              />
            </div>

            {/* Niche */}
            <div>
              <label className="text-xs font-bold text-gray-300 uppercase tracking-wider block mb-1.5">
                Primary Niche
              </label>
              <input
                type="text"
                value={niche}
                onChange={(e) => setNiche(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-surface-elevated rounded-xl border border-white/10 text-xs text-white focus:outline-none focus:border-indigo-500"
                placeholder="e.g. Artificial Intelligence, Software Engineering"
              />
            </div>

            {/* Language */}
            <div>
              <label className="text-xs font-bold text-gray-300 uppercase tracking-wider block mb-1.5">
                Output Language
              </label>
              <input
                type="text"
                value={language}
                onChange={(e) => setLanguage(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-surface-elevated rounded-xl border border-white/10 text-xs text-white focus:outline-none focus:border-indigo-500"
                placeholder="e.g. English, Hinglish, Spanish"
              />
            </div>

            {/* Tone of Voice */}
            <div>
              <label className="text-xs font-bold text-gray-300 uppercase tracking-wider block mb-1.5">
                Tone of Voice
              </label>
              <input
                type="text"
                value={tone}
                onChange={(e) => setTone(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-surface-elevated rounded-xl border border-white/10 text-xs text-white focus:outline-none focus:border-indigo-500"
                placeholder="e.g. Insightful, Authoritative, Energetic"
              />
            </div>

            {/* Target Audience */}
            <div className="md:col-span-2">
              <label className="text-xs font-bold text-gray-300 uppercase tracking-wider block mb-1.5">
                Target Audience Demographics & Interests
              </label>
              <textarea
                rows={3}
                value={audience}
                onChange={(e) => setAudience(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-surface-elevated rounded-xl border border-white/10 text-xs text-white focus:outline-none focus:border-indigo-500 leading-relaxed"
                placeholder="e.g. Senior engineers, tech startup founders, developers learning cloud systems"
              />
            </div>

            {/* Default Call to Action */}
            <div className="md:col-span-2">
              <label className="text-xs font-bold text-gray-300 uppercase tracking-wider block mb-1.5">
                Default Call to Action (CTA)
              </label>
              <input
                type="text"
                value={defaultCTA}
                onChange={(e) => setDefaultCTA(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-surface-elevated rounded-xl border border-white/10 text-xs text-white focus:outline-none focus:border-indigo-500"
                placeholder="e.g. Subscribe to our channel & drop your questions below!"
              />
            </div>

            {/* Default Hashtags */}
            <div className="md:col-span-2">
              <label className="text-xs font-bold text-gray-300 uppercase tracking-wider block mb-1.5">
                Default Brand Hashtags (Comma-separated)
              </label>
              <input
                type="text"
                value={defaultHashtags}
                onChange={(e) => setDefaultHashtags(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-surface-elevated rounded-xl border border-white/10 text-xs text-white focus:outline-none focus:border-indigo-500"
                placeholder="#AI, #TechTrends, #DevCommunity"
              />
            </div>

            {/* Forbidden Words */}
            <div>
              <label className="text-xs font-bold text-gray-300 uppercase tracking-wider block mb-1.5 text-rose-400">
                Forbidden Words (Comma-separated)
              </label>
              <input
                type="text"
                value={forbiddenWords}
                onChange={(e) => setForbiddenWords(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-surface-elevated rounded-xl border border-rose-500/20 text-xs text-white focus:outline-none focus:border-rose-500"
                placeholder="clickbait, cheap, scam, guaranteed"
              />
            </div>

            {/* Preferred Words */}
            <div>
              <label className="text-xs font-bold text-gray-300 uppercase tracking-wider block mb-1.5 text-emerald-400">
                Preferred Terminology (Comma-separated)
              </label>
              <input
                type="text"
                value={preferredWords}
                onChange={(e) => setPreferredWords(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-surface-elevated rounded-xl border border-emerald-500/20 text-xs text-white focus:outline-none focus:border-emerald-500"
                placeholder="production-grade, architecture, scalability"
              />
            </div>

            {/* Emoji Policy */}
            <div>
              <label className="text-xs font-bold text-gray-300 uppercase tracking-wider block mb-1.5">
                Emoji Usage Policy
              </label>
              <select
                value={emojiPolicy}
                onChange={(e) => setEmojiPolicy(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-surface-elevated rounded-xl border border-white/10 text-xs text-white focus:outline-none"
              >
                <option value="NONE">None (Strictly Plaintext)</option>
                <option value="MINIMAL">Minimal (1-2 Key Accents)</option>
                <option value="STANDARD">Standard (Engaging Bullet Accents)</option>
                <option value="EXPRESSIVE">Expressive (High Visual Energy)</option>
              </select>
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
