import { useSyncExternalStore } from 'react'

/**
 * A typed value in `sessionStorage`, exposed as an external store
 * (`useSyncExternalStore`), for client state that should survive a reload
 * within the tab: the quiz's progress, the "Plan my visit" answers.
 *
 * - The server snapshot is `null` ("not restored yet"), so hydration matches
 *   and the browser value takes over without a setState-in-effect.
 * - Snapshots are cached per key on the raw string, so they are
 *   referentially stable while the stored value doesn't change.
 * - When storage is unavailable (private mode, blocked site data) an
 *   in-memory copy keeps the page working; it just does not survive a reload.
 *
 * `parse` turns the stored JSON (or `null` when nothing, or something
 * unreadable, is stored) into a value, filling defaults.
 */
export function createSessionStore<T>(parse: (stored: unknown) => T) {
  const listeners = new Set<() => void>()
  const snapshots = new Map<string, { raw: string | null; value: T }>()
  const memory = new Map<string, string | null>()

  const readRaw = (key: string) => {
    try {
      return window.sessionStorage.getItem(key)
    } catch {
      return memory.get(key) ?? null
    }
  }

  /** The current value (browser only): also usable outside React, e.g. in updaters. */
  const get = (key: string): T => {
    const raw = readRaw(key)
    const cached = snapshots.get(key)
    if (cached && cached.raw === raw) return cached.value
    let stored: unknown = null
    try {
      stored = raw ? JSON.parse(raw) : null
    } catch {
      // Corrupt entry: start over.
    }
    const value = parse(stored)
    snapshots.set(key, { raw, value })
    return value
  }

  const subscribe = (listener: () => void) => {
    listeners.add(listener)
    return () => listeners.delete(listener)
  }

  /** Replaces (or with `null`, clears) the value and notifies every reader. */
  const save = (key: string, value: T | null) => {
    const raw = value === null ? null : JSON.stringify(value)
    try {
      if (raw === null) window.sessionStorage.removeItem(key)
      else window.sessionStorage.setItem(key, raw)
    } catch {
      memory.set(key, raw)
    }
    listeners.forEach((listener) => listener())
  }

  /** The stored value, or `null` during SSR/hydration before storage can be read. */
  const useValue = (key: string): T | null =>
    useSyncExternalStore(
      subscribe,
      () => get(key),
      () => null,
    )

  return { get, save, useValue }
}
