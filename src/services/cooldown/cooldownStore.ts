import { Collection } from 'discord.js';
import { BoundedMap } from '../../utils/lruCache.js';

// Maximum users to track per command to prevent memory issues
const MAX_USERS_PER_COMMAND = 10000;

// Maximum commands to track
const MAX_COMMANDS = 100;

/**
 * Cooldown store - manages cooldown timestamps
 */
class CooldownStore {
  private cooldowns = new BoundedMap<string, Collection<string, number>>(
    MAX_COMMANDS
  );

  /**
   * Get the timestamp collection for a command, creating if needed
   */
  private getTimestamps(commandName: string): Collection<string, number> {
    let timestamps = this.cooldowns.get(commandName);
    if (!timestamps) {
      timestamps = new Collection<string, number>();
      this.cooldowns.set(commandName, timestamps);
    }
    return timestamps;
  }

  /**
   * Check if a user is on cooldown for a command
   * @returns Remaining time in ms, or 0 if not on cooldown
   */
  checkCooldown(commandName: string, userId: string): number {
    const timestamps = this.cooldowns.get(commandName);
    if (!timestamps) return 0;

    const timestamp = timestamps.get(userId);
    if (!timestamp) return 0;

    return timestamp;
  }

  /**
   * Set cooldown for a user on a command
   */
  setCooldown(commandName: string, userId: string, cooldownMs: number): void {
    const timestamps = this.getTimestamps(commandName);

    // Limit users per command to prevent memory issues
    if (timestamps.size >= MAX_USERS_PER_COMMAND && !timestamps.has(userId)) {
      // Remove oldest entry (first in collection)
      const firstKey = timestamps.keys().next().value;
      if (firstKey) timestamps.delete(firstKey);
    }

    const expirationTime = Date.now() + cooldownMs;
    timestamps.set(userId, expirationTime);

    // Auto-remove cooldown after expiration
    setTimeout(() => {
      this.removeCooldown(commandName, userId, expirationTime);
    }, cooldownMs);
  }

  /**
   * Remove cooldown for a user on a command
   * @param expectedExpiration Only remove if expiration matches (to avoid removing newer cooldowns)
   */
  private removeCooldown(
    commandName: string,
    userId: string,
    expectedExpiration?: number
  ): void {
    const timestamps = this.cooldowns.get(commandName);
    if (!timestamps) return;

    // If expectedExpiration provided, only remove if it matches
    if (expectedExpiration !== undefined) {
      const current = timestamps.get(userId);
      if (current !== expectedExpiration) return;
    }

    timestamps.delete(userId);
  }

  /**
   * Clear cooldown for a specific user and command
   */
  clearCooldown(commandName: string, userId: string): void {
    const timestamps = this.cooldowns.get(commandName);
    if (timestamps) {
      timestamps.delete(userId);
    }
  }

  /**
   * Clear all cooldowns for a command
   */
  clearCommandCooldowns(commandName: string): void {
    this.cooldowns.delete(commandName);
  }

  /**
   * Clear all cooldowns (for testing)
   */
  clearAll(): void {
    this.cooldowns.clear();
  }

  /**
   * Get cooldown info for a user on a command
   * @returns Remaining time in ms, or 0 if not on cooldown
   */
  getRemainingCooldown(commandName: string, userId: string): number {
    const timestamps = this.cooldowns.get(commandName);
    if (!timestamps) return 0;

    const expirationTime = timestamps.get(userId);
    if (!expirationTime) return 0;

    const remaining = expirationTime - Date.now();
    return remaining > 0 ? remaining : 0;
  }

  /**
   * Check if user is currently on cooldown
   */
  isOnCooldown(commandName: string, userId: string): boolean {
    return this.getRemainingCooldown(commandName, userId) > 0;
  }
}

// Export singleton instance
export const cooldownStore = new CooldownStore();
