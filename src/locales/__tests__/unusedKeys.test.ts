import { readdirSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { en } from '../en.js';

/**
 * Translation keys are only reachable through `t('some.key')`, so a key whose
 * caller is deleted leaves no compile error behind - it just sits in three
 * files forever. This is the drift check for that: every leaf in the
 * dictionary must be referenced somewhere in the source.
 *
 * A key built at runtime (`` t(`a.b.${period}`) ``) is credited to its whole
 * subtree, because the test cannot know which leaves the expression produces.
 * Tests are not counted: a key only a test mentions is still unreachable.
 */
const SRC = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const DICTIONARIES = ['en.ts', 'ja.ts', 'types.ts'];

function leafKeys(node: unknown, prefix = ''): string[] {
  if (typeof node !== 'object' || node === null) return [prefix];

  return Object.entries(node).flatMap(([key, value]) =>
    leafKeys(value, prefix ? `${prefix}.${key}` : key)
  );
}

function sourceFiles(dir: string): string[] {
  const files: string[] = [];

  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);

    if (entry.isDirectory()) {
      if (entry.name !== '__tests__') files.push(...sourceFiles(full));
      continue;
    }

    if (!entry.name.endsWith('.ts') || entry.name.endsWith('.test.ts')) {
      continue;
    }
    if (
      dir.endsWith(join('src', 'locales')) &&
      DICTIONARIES.includes(entry.name)
    ) {
      continue;
    }

    files.push(full);
  }

  return files;
}

describe('translation dictionary', () => {
  it('has no key the code never asks for', () => {
    const exact = new Set<string>();
    const subtrees: string[] = [];

    for (const file of sourceFiles(SRC)) {
      const source = readFileSync(file, 'utf-8');

      for (const match of source.matchAll(
        /['"`]([a-zA-Z0-9_]+(?:\.[a-zA-Z0-9_]+)+)['"`]/g
      )) {
        exact.add(match[1]);
      }

      for (const match of source.matchAll(/`([a-zA-Z0-9_.]+)\.\$\{/g)) {
        subtrees.push(match[1]);
      }
    }

    const unused = leafKeys(en).filter(
      (key) =>
        !exact.has(key) &&
        !subtrees.some((prefix) => key.startsWith(`${prefix}.`))
    );

    expect(unused).toEqual([]);
  });
});
