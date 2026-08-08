import { existsSync, readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { beforeAll, describe, expect, it } from 'vitest';
import type {
  APIApplicationCommandOption,
  RESTPostAPIChatInputApplicationCommandsJSONBody,
} from 'discord.js';
import { discoverFeatureCommands } from '../../../app/interactions/commandRegistry.js';
import { getHelpCategories } from '../catalog.js';

/**
 * `/general help` reads a hand-written catalog while Discord reads the
 * SlashCommandBuilder definitions. Nothing kept the two in step, which is how
 * the poll command came to advertise more options than it accepted. This
 * fails the build when an entry names a command that does not exist.
 */

const FEATURES_PATH = join(
  dirname(fileURLToPath(import.meta.url)),
  '..',
  '..',
  '..',
  'features'
);

const SUBCOMMAND = 1;
const SUBCOMMAND_GROUP = 2;

/** Every invocable path of a command, e.g. "voice autojoin exclude". */
function commandPaths(
  command: RESTPostAPIChatInputApplicationCommandsJSONBody
): string[] {
  const paths: string[] = [command.name];

  const walk = (options: APIApplicationCommandOption[], prefix: string) => {
    for (const option of options) {
      if (option.type === SUBCOMMAND_GROUP) {
        paths.push(`${prefix} ${option.name}`);
        walk(
          (option.options ?? []) as APIApplicationCommandOption[],
          `${prefix} ${option.name}`
        );
        continue;
      }

      if (option.type === SUBCOMMAND) {
        paths.push(`${prefix} ${option.name}`);
      }
    }
  };

  walk((command.options ?? []) as APIApplicationCommandOption[], command.name);
  return paths;
}

describe('help catalog matches the deployed commands', () => {
  let known: Set<string>;

  beforeAll(async () => {
    // Catalog entries register as a side effect of importing each feature's
    // helpCatalog module, the same way the running bot picks them up.
    for (const feature of readdirSync(FEATURES_PATH, { withFileTypes: true })) {
      if (!feature.isDirectory()) continue;
      const catalog = join(FEATURES_PATH, feature.name, 'helpCatalog.ts');
      if (!existsSync(catalog)) continue;
      await import(pathToFileURL(catalog).href);
    }

    const discovered = await discoverFeatureCommands(FEATURES_PATH);

    known = new Set(
      discovered.flatMap((item) =>
        commandPaths(
          item.command.data.toJSON() as RESTPostAPIChatInputApplicationCommandsJSONBody
        )
      )
    );
  });

  it('discovers commands and catalog entries to compare', () => {
    expect(known.size).toBeGreaterThan(0);
    expect(getHelpCategories().length).toBeGreaterThan(0);
  });

  it('every catalog entry names a real command path', () => {
    const unknown = getHelpCategories()
      .flatMap((category) => category.commands)
      .map((command) => command.name)
      .filter((name) => !known.has(name));

    expect(unknown).toEqual([]);
  });

  it('every usage string starts with its own command path', () => {
    const mismatched = getHelpCategories()
      .flatMap((category) => category.commands)
      .filter((command) => command.usage)
      .filter((command) => !command.usage!.startsWith(`/${command.name}`))
      .map((command) => `${command.name}: ${command.usage}`);

    expect(mismatched).toEqual([]);
  });
});
