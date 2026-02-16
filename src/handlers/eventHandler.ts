import { readdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { Event } from '../types/index.js';
import { ExtendedClient } from '../client.js';
import { logger } from '../utils/logger.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * Load all events from the events directory
 */
export async function loadEvents(client: ExtendedClient): Promise<void> {
  const eventsPath = join(__dirname, '..', 'events');
  const categoryFolders = readdirSync(eventsPath, { withFileTypes: true })
    .filter((dirent) => dirent.isDirectory())
    .map((dirent) => dirent.name);

  let eventCount = 0;

  for (const category of categoryFolders) {
    const categoryPath = join(eventsPath, category);
    const eventFiles = readdirSync(categoryPath).filter(
      (file) => file.endsWith('.ts') || file.endsWith('.js')
    );

    for (const file of eventFiles) {
      const filePath = join(categoryPath, file);
      try {
        const eventModule = await import(
          `file://${filePath.replace(/\\/g, '/')}`
        );
        const event: Event = eventModule.default ?? eventModule.event;

        if (event?.name && typeof event.execute === 'function') {
          if (event.once) {
            client.once(event.name, (...args) =>
              event.execute(client, ...args)
            );
          } else {
            client.on(event.name, (...args) =>
              event.execute(client, ...args)
            );
          }

          logger.debug(`Loaded event: ${event.name} (${category})`);
          eventCount++;
        } else {
          logger.warn(
            `Invalid event file: ${filePath} - missing name or execute`
          );
        }
      } catch (error) {
        logger.error(
          `Failed to load event from ${filePath}:`,
          error instanceof Error ? error.message : error
        );
      }
    }
  }

  logger.info(`Loaded ${eventCount} events`);
}
