import { Collection } from 'discord.js';
import { BoundedMap } from '../../utils/lruCache.js';

const MAX_USERS_PER_COMMAND = 10000;
const MAX_COMMANDS = 100;

class CooldownStore {
  private cooldowns = new BoundedMap<string, Collection<string, number>>(
    MAX_COMMANDS
  );

  private getTimestamps(commandName: string): Collection<string, number> {
    let timestamps = this.cooldowns.get(commandName);
    if (!timestamps) {
      timestamps = new Collection<string, number>();
      this.cooldowns.set(commandName, timestamps);
    }
    return timestamps;
  }

  checkCooldown(commandName: string, userId: string): number {
    const timestamps = this.cooldowns.get(commandName);
    if (!timestamps) return 0;

    const timestamp = timestamps.get(userId);
    if (!timestamp) return 0;

    return timestamp;
  }

  setCooldown(commandName: string, userId: string, cooldownMs: number): void {
    const timestamps = this.getTimestamps(commandName);

    if (timestamps.size >= MAX_USERS_PER_COMMAND && !timestamps.has(userId)) {
      const firstKey = timestamps.keys().next().value;
      if (firstKey) timestamps.delete(firstKey);
    }

    const expirationTime = Date.now() + cooldownMs;
    timestamps.set(userId, expirationTime);

    setTimeout(() => {
      this.removeCooldown(commandName, userId, expirationTime);
    }, cooldownMs);
  }

  private removeCooldown(
    commandName: string,
    userId: string,
    expectedExpiration?: number
  ): void {
    const timestamps = this.cooldowns.get(commandName);
    if (!timestamps) return;

    if (expectedExpiration !== undefined) {
      const current = timestamps.get(userId);
      if (current !== expectedExpiration) return;
    }

    timestamps.delete(userId);
  }

  clearCooldown(commandName: string, userId: string): void {
    const timestamps = this.cooldowns.get(commandName);
    if (timestamps) {
      timestamps.delete(userId);
    }
  }

  clearCommandCooldowns(commandName: string): void {
    this.cooldowns.delete(commandName);
  }

  clearAll(): void {
    this.cooldowns.clear();
  }

  getRemainingCooldown(commandName: string, userId: string): number {
    const timestamps = this.cooldowns.get(commandName);
    if (!timestamps) return 0;

    const expirationTime = timestamps.get(userId);
    if (!expirationTime) return 0;

    const remaining = expirationTime - Date.now();
    return remaining > 0 ? remaining : 0;
  }

  isOnCooldown(commandName: string, userId: string): boolean {
    return this.getRemainingCooldown(commandName, userId) > 0;
  }
}

export const cooldownStore = new CooldownStore();
