import { pollStore } from './services/pollStore.js';

/**
 * Stop Poll feature - clear all active polls and cancel their timeouts
 */
export function stop(): void {
  pollStore.clearAll();
}
