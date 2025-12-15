import { describe, it, expect } from 'vitest';
import {
  createEmbed,
  createSuccessEmbed,
  createErrorEmbed,
  createWarningEmbed,
  createInfoEmbed,
} from '../../utils/embed.js';
import { COLORS } from '../../utils/constants.js';

describe('createEmbed', () => {
  it('should create embed with default color', () => {
    const embed = createEmbed({});
    expect(embed.data.color).toBe(COLORS.PRIMARY);
  });

  it('should create embed with custom color', () => {
    const embed = createEmbed({ color: COLORS.SUCCESS });
    expect(embed.data.color).toBe(COLORS.SUCCESS);
  });

  it('should set title', () => {
    const embed = createEmbed({ title: 'Test Title' });
    expect(embed.data.title).toBe('Test Title');
  });

  it('should set description', () => {
    const embed = createEmbed({ description: 'Test Description' });
    expect(embed.data.description).toBe('Test Description');
  });

  it('should add fields', () => {
    const embed = createEmbed({
      fields: [
        { name: 'Field 1', value: 'Value 1', inline: true },
        { name: 'Field 2', value: 'Value 2' },
      ],
    });
    expect(embed.data.fields).toHaveLength(2);
    expect(embed.data.fields?.[0].name).toBe('Field 1');
    expect(embed.data.fields?.[0].inline).toBe(true);
  });

  it('should set footer', () => {
    const embed = createEmbed({ footer: 'Test Footer' });
    expect(embed.data.footer?.text).toBe('Test Footer');
  });

  it('should set timestamp', () => {
    const embed = createEmbed({ timestamp: true });
    expect(embed.data.timestamp).toBeDefined();
  });

  it('should set thumbnail', () => {
    const embed = createEmbed({ thumbnail: 'https://example.com/image.png' });
    expect(embed.data.thumbnail?.url).toBe('https://example.com/image.png');
  });

  it('should set image', () => {
    const embed = createEmbed({ image: 'https://example.com/image.png' });
    expect(embed.data.image?.url).toBe('https://example.com/image.png');
  });
});

describe('createSuccessEmbed', () => {
  it('should create embed with success color', () => {
    const embed = createSuccessEmbed('Success', 'Operation completed');
    expect(embed.data.color).toBe(COLORS.SUCCESS);
    expect(embed.data.title).toBe('Success');
    expect(embed.data.description).toBe('Operation completed');
  });

  it('should work without description', () => {
    const embed = createSuccessEmbed('Success');
    expect(embed.data.title).toBe('Success');
    expect(embed.data.description).toBeUndefined();
  });
});

describe('createErrorEmbed', () => {
  it('should create embed with error color', () => {
    const embed = createErrorEmbed('Error', 'Something went wrong');
    expect(embed.data.color).toBe(COLORS.ERROR);
    expect(embed.data.title).toBe('Error');
    expect(embed.data.description).toBe('Something went wrong');
  });
});

describe('createWarningEmbed', () => {
  it('should create embed with warning color', () => {
    const embed = createWarningEmbed('Warning', 'Be careful');
    expect(embed.data.color).toBe(COLORS.WARNING);
    expect(embed.data.title).toBe('Warning');
  });
});

describe('createInfoEmbed', () => {
  it('should create embed with info color', () => {
    const embed = createInfoEmbed('Info', 'Here is some information');
    expect(embed.data.color).toBe(COLORS.INFO);
    expect(embed.data.title).toBe('Info');
  });
});
