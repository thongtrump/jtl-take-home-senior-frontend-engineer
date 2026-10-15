import { atom } from 'jotai';

/**
 * Cross-cutting state: currently selected user across the application.
 * Used for:
 * 1. Filtering ToDo items by selected user on the ToDos page.
 * 2. Pre-filling the assignee when creating a new ToDo item.
 * 3. Highlighting active context in the global navigation bar.
 */
export const selectedUserIdAtom = atom<string | null>(null);

/**
 * Development & review state: toggle simulated network/API failures.
 * Used to test TanStack Query optimistic update rollback handling interactively.
 */
export const simulateApiErrorAtom = atom<boolean>(false);

/**
 * Artificial network latency in milliseconds to clearly observe optimistic UI states.
 * Defaults to 600ms.
 */
export const apiLatencyAtom = atom<number>(600);
