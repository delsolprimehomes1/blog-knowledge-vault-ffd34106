import React from 'react';
import { useCountdownTimer } from '@/hooks/useCountdownTimer';
import { cn } from '@/lib/utils';
import { Clock, AlertTriangle } from 'lucide-react';

interface CountdownTimerProps {
  targetDate: Date | string | null;
  onExpire?: () => void;
  className?: string;
  showIcon?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

export function CountdownTimer({
  targetDate,
  onExpire,
  className,
  showIcon = true,
  size = 'md',
}: CountdownTimerProps) {
  const { display, isOverdue, urgency, colorClass } = useCountdownTimer(targetDate, onExpire);

  const sizeClasses = {
    sm: 'text-xs',
    md: 'text-sm',
    lg: 'text-base',
  };

  const iconSize = {
    sm: 'w-3 h-3',
    md: 'w-4 h-4',
    lg: 'w-5 h-5',
  };

  return (
    <div
      className={cn(
        'flex items-center gap-1.5 font-mono tabular-nums',
        sizeClasses[size],
        colorClass,
        isOverdue && 'animate-pulse',
        className
      )}
    >
      {showIcon && (
        isOverdue ? (
          <AlertTriangle className={cn(iconSize[size], 'text-red-500')} />
        ) : (
          <Clock className={iconSize[size]} />
        )
      )}
      <span>{display}</span>
    </div>
  );
}
