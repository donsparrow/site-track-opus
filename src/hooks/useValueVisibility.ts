import { useSyncExternalStore } from 'react';

const KEY = 'gp-hide-values';
const listeners = new Set<() => void>();

function read(): boolean {
  try {
    return localStorage.getItem(KEY) === '1';
  } catch {
    return false;
  }
}

let hidden = read();

function subscribe(cb: () => void) {
  listeners.add(cb);
  return () => { listeners.delete(cb); };
}

function getSnapshot() {
  return hidden;
}

export function toggleValueVisibility() {
  hidden = !hidden;
  try { localStorage.setItem(KEY, hidden ? '1' : '0'); } catch { /* ignore */ }
  listeners.forEach(l => l());
}

export function useValueVisibility() {
  const value = useSyncExternalStore(subscribe, getSnapshot, () => false);
  return { hidden: value, toggle: toggleValueVisibility };
}
