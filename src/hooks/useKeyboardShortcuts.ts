import { useEffect, useCallback, useRef } from 'react';

type KeyHandler = (event: KeyboardEvent) => void;

interface ShortcutConfig {
  key: string;
  ctrl?: boolean;
  meta?: boolean;
  shift?: boolean;
  alt?: boolean;
  handler: KeyHandler;
  preventDefault?: boolean;
}

export function useKeyboardShortcuts(shortcuts: ShortcutConfig[]) {
  const handlersRef = useRef(shortcuts);
  handlersRef.current = shortcuts;

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Skip if user is typing in an input
      const target = event.target as HTMLElement;
      if (
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.isContentEditable
      ) {
        // Allow Escape to work in inputs
        if (event.key !== 'Escape') {
          return;
        }
      }

      for (const shortcut of handlersRef.current) {
        const modMatch =
          (shortcut.ctrl === undefined || shortcut.ctrl === event.ctrlKey) &&
          (shortcut.meta === undefined || shortcut.meta === event.metaKey) &&
          (shortcut.shift === undefined || shortcut.shift === event.shiftKey) &&
          (shortcut.alt === undefined || shortcut.alt === event.altKey);

        const keyMatch = event.key.toLowerCase() === shortcut.key.toLowerCase();

        if (modMatch && keyMatch) {
          if (shortcut.preventDefault !== false) {
            event.preventDefault();
          }
          shortcut.handler(event);
          break;
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);
}

// Pre-configured hook for CRM agent shortcuts
export function useCrmAgentShortcuts({
  onCommandPalette,
  onLogCall,
  onAddNote,
  onShowShortcuts,
  onEscape,
}: {
  onCommandPalette?: () => void;
  onLogCall?: () => void;
  onAddNote?: () => void;
  onShowShortcuts?: () => void;
  onEscape?: () => void;
}) {
  const isMac = typeof navigator !== 'undefined' && navigator.platform.toUpperCase().includes('MAC');

  const shortcuts: ShortcutConfig[] = [];

  if (onCommandPalette) {
    shortcuts.push({
      key: 'k',
      meta: isMac,
      ctrl: !isMac,
      handler: onCommandPalette,
    });
  }

  if (onLogCall) {
    shortcuts.push({
      key: 'l',
      meta: isMac,
      ctrl: !isMac,
      handler: onLogCall,
    });
  }

  if (onAddNote) {
    shortcuts.push({
      key: 'n',
      meta: isMac,
      ctrl: !isMac,
      handler: onAddNote,
    });
  }

  if (onShowShortcuts) {
    shortcuts.push({
      key: '/',
      meta: isMac,
      ctrl: !isMac,
      handler: onShowShortcuts,
    });
  }

  if (onEscape) {
    shortcuts.push({
      key: 'Escape',
      handler: onEscape,
    });
  }

  useKeyboardShortcuts(shortcuts);
}

// Table navigation shortcuts
export function useTableNavigation({
  onMoveDown,
  onMoveUp,
  onSelect,
  onToggle,
  enabled = true,
}: {
  onMoveDown?: () => void;
  onMoveUp?: () => void;
  onSelect?: () => void;
  onToggle?: () => void;
  enabled?: boolean;
}) {
  const shortcuts: ShortcutConfig[] = enabled
    ? [
        ...(onMoveDown ? [{ key: 'j', handler: onMoveDown }] : []),
        ...(onMoveUp ? [{ key: 'k', handler: onMoveUp }] : []),
        ...(onSelect ? [{ key: 'Enter', handler: onSelect }] : []),
        ...(onToggle ? [{ key: ' ', handler: onToggle }] : []),
      ]
    : [];

  useKeyboardShortcuts(shortcuts);
}

// Get keyboard shortcut display string
export function getShortcutDisplay(key: string, modifiers?: { ctrl?: boolean; meta?: boolean; shift?: boolean; alt?: boolean }): string {
  const isMac = typeof navigator !== 'undefined' && navigator.platform.toUpperCase().includes('MAC');
  const parts: string[] = [];

  if (modifiers?.ctrl || modifiers?.meta) {
    parts.push(isMac ? '⌘' : 'Ctrl');
  }
  if (modifiers?.shift) {
    parts.push(isMac ? '⇧' : 'Shift');
  }
  if (modifiers?.alt) {
    parts.push(isMac ? '⌥' : 'Alt');
  }

  parts.push(key.toUpperCase());

  return parts.join(isMac ? '' : '+');
}
