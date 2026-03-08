import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../../utils/logger.js', () => ({
  logger: {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

const setServiceStatus = vi.fn();
vi.mock('../../services/health/index.js', () => ({
  setServiceStatus,
}));

describe('feature registry', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('exports loadFeatures, getFeatureModules, startAllFeatures, stopAllFeatures', async () => {
    const mod = await import('../index.js');
    expect(typeof mod.loadFeatures).toBe('function');
    expect(typeof mod.getFeatureModules).toBe('function');
    expect(typeof mod.startAllFeatures).toBe('function');
    expect(typeof mod.stopAllFeatures).toBe('function');
  });

  it('getFeatureModules returns an array', async () => {
    const { getFeatureModules } = await import('../index.js');
    const modules = getFeatureModules();
    expect(Array.isArray(modules)).toBe(true);
  });
});
