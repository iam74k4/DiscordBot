import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock fetch
const mockFetch = vi.fn();
global.fetch = mockFetch;

// Mock env with webhook URL to test rate limiting properly
vi.mock('../../../config/index.js', () => ({
  env: {
    ALERT_WEBHOOK_URL: 'https://discord.com/api/webhooks/123/abc',
  },
}));

// Mock logger
vi.mock('../../../utils/logger.js', () => ({
  logger: {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

import {
  sendAlert,
  alertInfo,
  alertWarn,
  alertError,
  alertCritical,
  clearRateLimits,
} from '../../../services/alert/index.js';

describe('Alert Service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    clearRateLimits();
    mockFetch.mockReset();
    // Mock successful webhook response
    mockFetch.mockResolvedValue({ ok: true });
  });

  describe('sendAlert', () => {
    it('should send alerts via webhook', async () => {
      const result = await sendAlert('info', 'Test Title', 'Test Description');

      expect(result).toBe(true);
      expect(mockFetch).toHaveBeenCalledTimes(1);
    });

    it('should rate limit duplicate alerts', async () => {
      // Send first alert
      await sendAlert('error', 'Same Title', 'Description 1');

      // Send second identical alert immediately
      const result = await sendAlert('error', 'Same Title', 'Description 2');

      expect(result).toBe(false);
      // Fetch should only be called once (for the first alert)
      expect(mockFetch).toHaveBeenCalledTimes(1);
    });

    it('should allow different alerts', async () => {
      await sendAlert('error', 'Title 1', 'Description');
      const result = await sendAlert('error', 'Title 2', 'Description');

      expect(result).toBe(true);
      expect(mockFetch).toHaveBeenCalledTimes(2);
    });

    it('should allow same alert after rate limit expires', async () => {
      vi.useFakeTimers();

      await sendAlert('error', 'Unique Title', 'Description');
      expect(mockFetch).toHaveBeenCalledTimes(1);

      // Advance time past rate limit (5 minutes)
      vi.advanceTimersByTime(6 * 60 * 1000);

      const result = await sendAlert('error', 'Unique Title', 'Description');

      expect(result).toBe(true);
      expect(mockFetch).toHaveBeenCalledTimes(2);

      vi.useRealTimers();
    });
  });

  describe('Alert level shortcuts', () => {
    it('should send info alerts', async () => {
      const result = await alertInfo('Info Title', 'Info Description');
      expect(result).toBe(true);
    });

    it('should send warning alerts', async () => {
      const result = await alertWarn('Warn Title', 'Warn Description');
      expect(result).toBe(true);
    });

    it('should send error alerts', async () => {
      const result = await alertError('Error Title', 'Error Description');
      expect(result).toBe(true);
    });

    it('should send critical alerts', async () => {
      const result = await alertCritical(
        'Critical Title',
        'Critical Description'
      );
      expect(result).toBe(true);
    });
  });

  describe('Webhook error handling', () => {
    it('should handle webhook errors gracefully', async () => {
      mockFetch.mockResolvedValueOnce({ ok: false, status: 500 });

      const result = await sendAlert('error', 'Error Test', 'Description');

      expect(result).toBe(false);
    });

    it('should handle network errors gracefully', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      const result = await sendAlert('error', 'Network Test', 'Description');

      expect(result).toBe(false);
    });
  });

  describe('clearRateLimits', () => {
    it('should clear all rate limits', async () => {
      // Send an alert
      await sendAlert('error', 'Clear Test', 'Description');
      expect(mockFetch).toHaveBeenCalledTimes(1);

      // Should be rate limited
      let result = await sendAlert('error', 'Clear Test', 'Description');
      expect(result).toBe(false);
      expect(mockFetch).toHaveBeenCalledTimes(1); // Still 1

      // Clear rate limits
      clearRateLimits();

      // Should now be allowed
      result = await sendAlert('error', 'Clear Test', 'Description');
      expect(result).toBe(true);
      expect(mockFetch).toHaveBeenCalledTimes(2);
    });
  });
});
