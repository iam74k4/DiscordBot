import { beforeEach, describe, expect, it, vi } from 'vitest';
import { sendAlert } from '../alert.js';

vi.mock('../../../config/index.js', () => ({
  env: {
    ALERT_WEBHOOK_URL: 'https://discord.com/api/webhooks/test/id',
  },
}));

vi.mock('../logger.js', () => ({
  logger: {
    warn: vi.fn(),
  },
  getErrorMessage: (e: unknown) => (e instanceof Error ? e.message : String(e)),
}));

describe('sendAlert', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    global.fetch = vi.fn();
  });

  it('sends webhook request with correct payload', async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({ ok: true });

    await sendAlert('Test Title', 'Test description', [
      { name: 'Field', value: 'Value' },
    ]);

    expect(global.fetch).toHaveBeenCalledTimes(1);
    const [url, options] = (global.fetch as ReturnType<typeof vi.fn>).mock
      .calls[0];
    expect(url).toBe('https://discord.com/api/webhooks/test/id');
    expect(options.method).toBe('POST');
    expect(options.headers).toEqual({ 'Content-Type': 'application/json' });

    const body = JSON.parse(options.body);
    expect(body.embeds).toHaveLength(1);
    expect(body.embeds[0].title).toBe('Test Title');
    expect(body.embeds[0].description).toBe('Test description');
    expect(body.embeds[0].fields).toEqual([{ name: 'Field', value: 'Value' }]);
    expect(body.embeds[0].color).toBe(0xe74c3c);
  });

  it('sends without fields when fields undefined', async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({ ok: true });

    await sendAlert('Title', 'Desc');

    const body = JSON.parse(
      (global.fetch as ReturnType<typeof vi.fn>).mock.calls[0][1].body
    );
    expect(body.embeds[0].fields).toEqual([]);
  });

  it('does not throw when fetch fails', async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockRejectedValue(
      new Error('Network error')
    );

    await expect(sendAlert('Title', 'Desc')).resolves.toBeUndefined();
  });

  it('does not throw when response is not ok', async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: false,
      status: 500,
      statusText: 'Internal Server Error',
    });

    await expect(sendAlert('Title', 'Desc')).resolves.toBeUndefined();
  });
});
