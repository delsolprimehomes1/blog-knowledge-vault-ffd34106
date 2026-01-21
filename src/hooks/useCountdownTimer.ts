import { useState, useEffect, useCallback } from 'react';
import { differenceInSeconds } from 'date-fns';
import { getCallbackUrgency, URGENCY_STYLES, type UrgencyLevel } from '@/lib/crm-conditional-styles';

interface CountdownResult {
  display: string;
  isOverdue: boolean;
  urgency: UrgencyLevel;
  colorClass: string;
  seconds: number;
}

export function useCountdownTimer(
  targetDate: Date | string | null,
  onExpire?: () => void
): CountdownResult {
  const [countdown, setCountdown] = useState<CountdownResult>(() => 
    calculateCountdown(targetDate)
  );
  
  const hasExpired = countdown.isOverdue;
  
  useEffect(() => {
    if (!targetDate) return;
    
    const interval = setInterval(() => {
      const newCountdown = calculateCountdown(targetDate);
      setCountdown(newCountdown);
      
      // Call onExpire when transitioning from not overdue to overdue
      if (newCountdown.isOverdue && !hasExpired && onExpire) {
        onExpire();
      }
    }, 1000);
    
    return () => clearInterval(interval);
  }, [targetDate, hasExpired, onExpire]);
  
  return countdown;
}

function calculateCountdown(targetDate: Date | string | null): CountdownResult {
  if (!targetDate) {
    return {
      display: '--:--:--',
      isOverdue: false,
      urgency: 'normal',
      colorClass: 'text-gray-400',
      seconds: 0,
    };
  }
  
  const target = typeof targetDate === 'string' ? new Date(targetDate) : targetDate;
  const now = new Date();
  const totalSeconds = differenceInSeconds(target, now);
  const urgency = getCallbackUrgency(target);
  const isOverdue = totalSeconds < 0;
  
  const absSeconds = Math.abs(totalSeconds);
  const hours = Math.floor(absSeconds / 3600);
  const minutes = Math.floor((absSeconds % 3600) / 60);
  const seconds = absSeconds % 60;
  
  let display: string;
  if (isOverdue) {
    if (hours > 0) {
      display = `-${hours}h ${minutes}m overdue`;
    } else if (minutes > 0) {
      display = `-${minutes}m ${seconds}s overdue`;
    } else {
      display = `-${seconds}s overdue`;
    }
  } else {
    if (hours > 24) {
      const days = Math.floor(hours / 24);
      display = `${days}d ${hours % 24}h`;
    } else if (hours > 0) {
      display = `${hours}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
    } else {
      display = `${minutes}:${String(seconds).padStart(2, '0')}`;
    }
  }
  
  return {
    display,
    isOverdue,
    urgency,
    colorClass: URGENCY_STYLES[urgency].text,
    seconds: totalSeconds,
  };
}

// Hook for multiple countdowns (batch optimization)
export function useMultipleCountdowns(
  targets: Array<{ id: string; date: Date | string | null }>
): Map<string, CountdownResult> {
  const [countdowns, setCountdowns] = useState<Map<string, CountdownResult>>(() => {
    const map = new Map();
    targets.forEach(({ id, date }) => {
      map.set(id, calculateCountdown(date));
    });
    return map;
  });
  
  useEffect(() => {
    const interval = setInterval(() => {
      setCountdowns(prev => {
        const newMap = new Map();
        targets.forEach(({ id, date }) => {
          newMap.set(id, calculateCountdown(date));
        });
        return newMap;
      });
    }, 1000);
    
    return () => clearInterval(interval);
  }, [targets]);
  
  return countdowns;
}
