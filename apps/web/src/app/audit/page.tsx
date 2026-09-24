'use client';

import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { ShieldCheck } from 'lucide-react';
import { AppLayout } from '@/components/layout/AppLayout';
import { Badge } from '@/components/ui/Badge';
import { ApiClient } from '@/lib/api';

export default function AuditPage() {
  const { data: logs, isLoading } = useQuery({
    queryKey: ['audit-logs'],
    queryFn: () => ApiClient.get<any[]>('/audit/logs?limit=50'),
  });

  return (
    <AppLayout
      title="Security & System Audit Logs"
      subtitle="Immutable event ledger recording user actions, OAuth connections, AI content generation, and publish dispatches"
    >
      <div className="space-y-6">
        <div className="glass-panel rounded-2xl border border-white/10 overflow-hidden shadow-glass">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-white/10 text-gray-400 text-xs uppercase tracking-wider bg-white/[0.02]">
                  <th className="py-3.5 px-6 font-semibold">Timestamp</th>
                  <th className="py-3.5 px-4 font-semibold">Action</th>
                  <th className="py-3.5 px-4 font-semibold">Entity</th>
                  <th className="py-3.5 px-4 font-semibold">Entity ID</th>
                  <th className="py-3.5 px-6 font-semibold">Metadata</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {logs && logs.length > 0 ? (
                  logs.map((log) => (
                    <tr key={log.id} className="hover:bg-white/[0.02] transition-colors text-xs">
                      <td className="py-3.5 px-6 text-gray-400 whitespace-nowrap">
                        {new Date(log.createdAt).toLocaleString()}
                      </td>
                      <td className="py-3.5 px-4 font-semibold text-white">
                        <span className="px-2 py-0.5 rounded-lg bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 font-mono text-[11px]">
                          {log.action}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-gray-300">{log.entity}</td>
                      <td className="py-3.5 px-4 text-gray-400 font-mono text-[11px] truncate max-w-[140px]">
                        {log.entityId || '—'}
                      </td>
                      <td className="py-3.5 px-6 max-w-sm">
                        <pre className="text-[11px] text-gray-300 bg-surface-elevated/70 p-2 rounded-lg border border-white/5 truncate max-w-md font-mono">
                          {JSON.stringify(log.metadata || {})}
                        </pre>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={5} className="py-12 text-center text-gray-400 text-xs">
                      {isLoading ? 'Loading audit logs...' : 'No audit records recorded yet.'}
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
