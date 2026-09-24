import React from 'react';
import { cn } from '@/lib/utils';
import { VideoStatus } from '@muza/shared';

interface BadgeProps {
  status: string;
  className?: string;
}

export function Badge({ status, className }: BadgeProps) {
  const getBadgeStyle = (s: string) => {
    switch (s) {
      case VideoStatus.PUBLISHED:
      case 'SUCCESS':
      case 'CONNECTED':
        return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30';
      case VideoStatus.READY_FOR_REVIEW:
      case VideoStatus.APPROVED:
        return 'bg-indigo-500/10 text-indigo-400 border-indigo-500/30';
      case VideoStatus.SCHEDULED:
        return 'bg-blue-500/10 text-blue-400 border-blue-500/30';
      case VideoStatus.PROCESSING:
      case VideoStatus.ANALYZING:
      case VideoStatus.GENERATING_CONTENT:
      case VideoStatus.DOWNLOADING:
      case VideoStatus.PUBLISHING:
      case 'RUNNING':
        return 'bg-amber-500/10 text-amber-400 border-amber-500/30 animate-pulse';
      case VideoStatus.FAILED:
      case 'ERROR':
      case 'EXPIRED':
        return 'bg-rose-500/10 text-rose-400 border-rose-500/30';
      default:
        return 'bg-gray-500/10 text-gray-400 border-gray-500/30';
    }
  };

  const formatText = (s: string) => {
    return s.replace(/_/g, ' ');
  };

  return (
    <span
      className={cn(
        'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border uppercase tracking-wider',
        getBadgeStyle(status),
        className
      )}
    >
      {formatText(status)}
    </span>
  );
}
