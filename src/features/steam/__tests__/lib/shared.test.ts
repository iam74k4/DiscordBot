import { describe, it, expect } from 'vitest';
import { formatHoursShort } from '../../lib/shared.js';

describe('formatHoursShort', () => {
  it('formats minutes as hours', () => {
    expect(formatHoursShort(60)).toBe('1h');
    expect(formatHoursShort(120)).toBe('2h');
    expect(formatHoursShort(360)).toBe('6h');
  });

  it('formats 1000+ hours with k suffix', () => {
    expect(formatHoursShort(60 * 1000)).toBe('1.0k h');
    expect(formatHoursShort(60 * 1500)).toBe('1.5k h');
  });
});
