// Rate-limited batch processor with pause/resume and checkpoint support
import type { MutableRefObject } from "react";
export interface ProgressState {
  currentIndex: number;
  totalCount: number;
  successCount: number;
  failCount: number;
  percentComplete: number;
  currentItem?: string;
  estimatedTimeRemaining?: string;
}

export interface BulkOperationResult {
  success: number;
  failed: number;
  errors: Array<{ index: number; id: string; error: string }>;
}

export interface BulkOperationCheckpoint {
  operationType: 'fix_images' | 'fix_citations' | 'regenerate_all_images' | 'refresh_all_citations';
  startedAt: string;
  articleIds: string[];
  completedIds: string[];
  failedIds: Array<{ id: string; error: string }>;
  pausedAt?: string;
}

const CHECKPOINT_KEY = 'bulkOperationCheckpoint';

export function saveCheckpoint(checkpoint: BulkOperationCheckpoint): void {
  localStorage.setItem(CHECKPOINT_KEY, JSON.stringify(checkpoint));
}

export function getCheckpoint(): BulkOperationCheckpoint | null {
  const stored = localStorage.getItem(CHECKPOINT_KEY);
  if (!stored) return null;
  try {
    return JSON.parse(stored);
  } catch {
    return null;
  }
}

export function clearCheckpoint(): void {
  localStorage.removeItem(CHECKPOINT_KEY);
}

export async function processWithRateLimit<T extends { id: string; headline?: string }>(
  items: T[],
  processor: (item: T, index: number) => Promise<void>,
  options: {
    delayMs: number;
    onProgress?: (state: ProgressState) => void;
    onCheckpoint?: (completed: number, checkpoint: BulkOperationCheckpoint) => void;
    checkpointInterval?: number;
    isPausedRef?: MutableRefObject<boolean>;
    operationType: BulkOperationCheckpoint['operationType'];
    startIndex?: number;
  }
): Promise<BulkOperationResult> {
  const { 
    delayMs, 
    onProgress, 
    onCheckpoint, 
    checkpointInterval = 10, 
    isPausedRef,
    operationType,
    startIndex = 0
  } = options;
  
  let success = 0;
  let failed = 0;
  const errors: Array<{ index: number; id: string; error: string }> = [];
  const completedIds: string[] = [];
  const failedIds: Array<{ id: string; error: string }> = [];
  const startTime = Date.now();

  // Initialize checkpoint
  const checkpoint: BulkOperationCheckpoint = {
    operationType,
    startedAt: new Date().toISOString(),
    articleIds: items.map(i => i.id),
    completedIds: [],
    failedIds: [],
  };
  saveCheckpoint(checkpoint);

  for (let i = startIndex; i < items.length; i++) {
    // Check for pause
    while (isPausedRef?.current) {
      checkpoint.pausedAt = new Date().toISOString();
      saveCheckpoint(checkpoint);
      await new Promise(r => setTimeout(r, 500));
    }
    
    // Clear pausedAt when resumed
    if (checkpoint.pausedAt) {
      delete checkpoint.pausedAt;
      saveCheckpoint(checkpoint);
    }

    const item = items[i];
    
    // Calculate estimated time remaining
    const elapsed = Date.now() - startTime;
    const avgTimePerItem = elapsed / Math.max(1, i - startIndex);
    const remainingItems = items.length - i - 1;
    const estimatedMs = avgTimePerItem * remainingItems;
    const estimatedMinutes = Math.ceil(estimatedMs / 60000);
    const estimatedTimeRemaining = estimatedMinutes > 0 
      ? `~${estimatedMinutes} min remaining` 
      : 'Almost done...';

    try {
      await processor(item, i);
      success++;
      completedIds.push(item.id);
      checkpoint.completedIds = completedIds;
    } catch (error) {
      failed++;
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      errors.push({ index: i, id: item.id, error: errorMsg });
      failedIds.push({ id: item.id, error: errorMsg });
      checkpoint.failedIds = failedIds;
    }

    // Save checkpoint
    saveCheckpoint(checkpoint);

    // Progress callback
    onProgress?.({
      currentIndex: i + 1,
      totalCount: items.length,
      successCount: success,
      failCount: failed,
      percentComplete: Math.round(((i + 1) / items.length) * 100),
      currentItem: item.headline || item.id,
      estimatedTimeRemaining,
    });

    // Checkpoint callback
    if ((i + 1) % checkpointInterval === 0) {
      onCheckpoint?.(i + 1, checkpoint);
    }

    // Rate limit delay (don't delay after last item)
    if (i < items.length - 1) {
      await new Promise(r => setTimeout(r, delayMs));
    }
  }

  // Clear checkpoint on completion
  clearCheckpoint();

  return { success, failed, errors };
}

// Utility to format duration
export function formatDuration(seconds: number): string {
  if (seconds < 60) return `${seconds}s`;
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}m ${secs}s`;
}

// Calculate rate limit delay from requests per minute
export function getDelayForRateLimit(requestsPerMinute: number): number {
  return Math.ceil(60000 / requestsPerMinute);
}

// API rate limits
export const API_RATE_LIMITS = {
  FAL_AI: { requestsPerMinute: 20, delayMs: 3000 },
  PERPLEXITY: { requestsPerMinute: 30, delayMs: 2000 },
  OPENAI: { requestsPerMinute: 50, delayMs: 1200 },
} as const;
