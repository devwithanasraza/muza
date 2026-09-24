'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useMutation } from '@tanstack/react-query';
import { Lock, Mail, User as UserIcon, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { ApiClient } from '@/lib/api';

export default function LoginPage() {
  const router = useRouter();
  const [isRegister, setIsRegister] = useState(false);
  const [email, setEmail] = useState('admin@muza.ai');
  const [password, setPassword] = useState('MuzaAdmin123!');
  const [name, setName] = useState('Administrator');
  const [errorMessage, setErrorMessage] = useState('');

  const authMutation = useMutation({
    mutationFn: async () => {
      setErrorMessage('');
      const endpoint = isRegister ? '/auth/register' : '/auth/login';
      const payload = isRegister ? { email, password, name } : { email, password };
      return ApiClient.post<{ token: string; user: any }>(endpoint, payload);
    },
    onSuccess: (data) => {
      ApiClient.setToken(data.token);
      router.push('/');
    },
    onError: (err: any) => {
      setErrorMessage(err.message || 'Authentication failed');
    },
  });

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4 relative overflow-hidden">
      {/* Background glow accents */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-indigo-600/15 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-purple-600/10 rounded-full blur-3xl pointer-events-none" />

      <div className="relative w-full max-w-md glass-panel p-8 rounded-3xl border border-white/10 shadow-2xl space-y-6">
        {/* Logo & Header */}
        <div className="text-center space-y-2">
          <div className="inline-flex w-12 h-12 rounded-2xl bg-gradient-to-tr from-indigo-600 to-purple-500 items-center justify-center shadow-glow mb-2">
            <span className="text-white font-extrabold text-xl">M</span>
          </div>
          <h2 className="text-2xl font-bold tracking-tight text-white flex items-center justify-center gap-2">
            MUZA
            <span className="text-xs uppercase font-semibold px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-400 border border-indigo-500/30">
              AI Agent
            </span>
          </h2>
          <p className="text-xs text-gray-400">Content Management & Social Media Publishing Platform</p>
        </div>

        {/* Tab switch */}
        <div className="flex p-1 bg-surface-elevated rounded-xl border border-white/5">
          <button
            onClick={() => {
              setIsRegister(false);
              setErrorMessage('');
            }}
            className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${
              !isRegister ? 'bg-indigo-600 text-white shadow-glow' : 'text-gray-400 hover:text-white'
            }`}
          >
            Sign In
          </button>
          <button
            onClick={() => {
              setIsRegister(true);
              setErrorMessage('');
            }}
            className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${
              isRegister ? 'bg-indigo-600 text-white shadow-glow' : 'text-gray-400 hover:text-white'
            }`}
          >
            Register Team
          </button>
        </div>

        {/* Error message */}
        {errorMessage && (
          <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs">
            {errorMessage}
          </div>
        )}

        {/* Form */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            authMutation.mutate();
          }}
          className="space-y-4"
        >
          {isRegister && (
            <div>
              <label className="text-xs font-semibold text-gray-300 block mb-1">Full Name</label>
              <div className="relative">
                <UserIcon className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 bg-surface-elevated rounded-xl border border-white/10 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500"
                  placeholder="e.g. Alex Mercer"
                />
              </div>
            </div>
          )}

          <div>
            <label className="text-xs font-semibold text-gray-300 block mb-1">Email Address</label>
            <div className="relative">
              <Mail className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-surface-elevated rounded-xl border border-white/10 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500"
                placeholder="admin@muza.ai"
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold text-gray-300 block mb-1">Password</label>
            <div className="relative">
              <Lock className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-surface-elevated rounded-xl border border-white/10 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500"
                placeholder="••••••••"
              />
            </div>
          </div>

          <Button
            type="submit"
            className="w-full mt-2"
            size="lg"
            loading={authMutation.isPending}
          >
            {isRegister ? 'Create Account' : 'Authenticate to MUZA'}
          </Button>
        </form>

        <div className="pt-2 text-center">
          <p className="text-[11px] text-gray-500">
            MySQL 8+ Persistence Engine • Encrypted Session JWT • RBAC Protection
          </p>
        </div>
      </div>
    </div>
  );
}
