import { describe, it, expect } from 'vitest';
import {
  COLORS,
  TITLES,
  PROGRESS_BAR,
  CHART_COLORS,
} from '../constants/index.js';
import { BOT_INFO } from '../../../config/constants.js';

describe('COLORS', () => {
  it('should have all required color values', () => {
    expect(COLORS.PRIMARY).toBeDefined();
    expect(COLORS.SUCCESS).toBeDefined();
    expect(COLORS.ERROR).toBeDefined();
    expect(COLORS.WARNING).toBeDefined();
    expect(COLORS.INFO).toBeDefined();
    expect(COLORS.STEAM).toBeDefined();
    expect(COLORS.STEAM_ONLINE).toBeDefined();
    expect(COLORS.STEAM_OFFLINE).toBeDefined();
    expect(COLORS.STEAM_INGAME).toBeDefined();
  });

  it('should have valid color values (numbers)', () => {
    expect(typeof COLORS.PRIMARY).toBe('number');
    expect(typeof COLORS.SUCCESS).toBe('number');
    expect(typeof COLORS.ERROR).toBe('number');
  });
});

describe('BOT_INFO', () => {
  it('should have name and version', () => {
    expect(BOT_INFO.NAME).toBeDefined();
    expect(BOT_INFO.VERSION).toBeDefined();
  });

  it('should have valid version format', () => {
    expect(BOT_INFO.VERSION).toMatch(/^\d+\.\d+\.\d+$/);
  });
});

describe('TITLES', () => {
  it('should have all required titles', () => {
    expect(TITLES.PROFILE).toBeDefined();
    expect(TITLES.PLAYTIME).toBeDefined();
    expect(TITLES.GAMES).toBeDefined();
    expect(TITLES.RECENT).toBeDefined();
    expect(TITLES.RANKING).toBeDefined();
    expect(TITLES.HISTORY).toBeDefined();
    expect(TITLES.CHART).toBeDefined();
    expect(TITLES.HISTORY_GRAPH).toBeDefined();
    expect(TITLES.ERROR).toBeDefined();
    expect(TITLES.WARNING).toBeDefined();
  });
});

describe('PROGRESS_BAR', () => {
  it('should have filled and empty characters', () => {
    expect(PROGRESS_BAR.FILLED).toBeDefined();
    expect(PROGRESS_BAR.EMPTY).toBeDefined();
    expect(PROGRESS_BAR.LENGTH).toBeDefined();
  });

  it('should have single character for filled and empty', () => {
    expect(PROGRESS_BAR.FILLED.length).toBe(1);
    expect(PROGRESS_BAR.EMPTY.length).toBe(1);
  });

  it('should have reasonable default length', () => {
    expect(PROGRESS_BAR.LENGTH).toBeGreaterThanOrEqual(5);
    expect(PROGRESS_BAR.LENGTH).toBeLessThanOrEqual(20);
  });
});

describe('CHART_COLORS', () => {
  it('should have background and text colors', () => {
    expect(CHART_COLORS.BACKGROUND).toBeDefined();
    expect(CHART_COLORS.TEXT).toBeDefined();
    expect(CHART_COLORS.GRID).toBeDefined();
  });

  it('should have color palette', () => {
    expect(CHART_COLORS.PALETTE).toBeDefined();
    expect(Array.isArray(CHART_COLORS.PALETTE)).toBe(true);
    expect(CHART_COLORS.PALETTE.length).toBeGreaterThanOrEqual(6);
  });

  it('should have valid hex color format', () => {
    expect(CHART_COLORS.BACKGROUND).toMatch(/^#[0-9a-fA-F]{6}$/);
    expect(CHART_COLORS.TEXT).toMatch(/^#[0-9a-fA-F]{6}$/);
  });
});
