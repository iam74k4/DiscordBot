import { describe, it, expect, beforeEach } from 'vitest';
import { cooldownStore } from '../cooldownStore.js';

describe('CooldownStore', () => {
  beforeEach(() => {
    cooldownStore.clearAll();
  });

  describe('setCooldown', () => {
    it('should set a cooldown for a user', () => {
      cooldownStore.setCooldown('test-command', 'user1', 5000);
      expect(cooldownStore.isOnCooldown('test-command', 'user1')).toBe(true);
    });

    it('should allow different users to have separate cooldowns', () => {
      cooldownStore.setCooldown('test-command', 'user1', 5000);
      cooldownStore.setCooldown('test-command', 'user2', 5000);

      expect(cooldownStore.isOnCooldown('test-command', 'user1')).toBe(true);
      expect(cooldownStore.isOnCooldown('test-command', 'user2')).toBe(true);
    });

    it('should allow same user to have cooldowns on different commands', () => {
      cooldownStore.setCooldown('command1', 'user1', 5000);
      cooldownStore.setCooldown('command2', 'user1', 5000);

      expect(cooldownStore.isOnCooldown('command1', 'user1')).toBe(true);
      expect(cooldownStore.isOnCooldown('command2', 'user1')).toBe(true);
    });
  });

  describe('getRemainingCooldown', () => {
    it('should return remaining cooldown time', () => {
      cooldownStore.setCooldown('test-command', 'user1', 5000);
      const remaining = cooldownStore.getRemainingCooldown(
        'test-command',
        'user1'
      );

      expect(remaining).toBeGreaterThan(0);
      expect(remaining).toBeLessThanOrEqual(5000);
    });

    it('should return 0 for user not on cooldown', () => {
      expect(cooldownStore.getRemainingCooldown('test-command', 'user1')).toBe(
        0
      );
    });

    it('should return 0 for non-existent command', () => {
      expect(cooldownStore.getRemainingCooldown('non-existent', 'user1')).toBe(
        0
      );
    });
  });

  describe('isOnCooldown', () => {
    it('should return true when user is on cooldown', () => {
      cooldownStore.setCooldown('test-command', 'user1', 5000);
      expect(cooldownStore.isOnCooldown('test-command', 'user1')).toBe(true);
    });

    it('should return false when user is not on cooldown', () => {
      expect(cooldownStore.isOnCooldown('test-command', 'user1')).toBe(false);
    });
  });

  describe('clearCooldown', () => {
    it('should clear cooldown for a specific user', () => {
      cooldownStore.setCooldown('test-command', 'user1', 5000);
      cooldownStore.setCooldown('test-command', 'user2', 5000);

      cooldownStore.clearCooldown('test-command', 'user1');

      expect(cooldownStore.isOnCooldown('test-command', 'user1')).toBe(false);
      expect(cooldownStore.isOnCooldown('test-command', 'user2')).toBe(true);
    });
  });

  describe('clearAll', () => {
    it('should clear all cooldowns', () => {
      cooldownStore.setCooldown('command1', 'user1', 5000);
      cooldownStore.setCooldown('command2', 'user2', 5000);

      cooldownStore.clearAll();

      expect(cooldownStore.isOnCooldown('command1', 'user1')).toBe(false);
      expect(cooldownStore.isOnCooldown('command2', 'user2')).toBe(false);
    });
  });
});
