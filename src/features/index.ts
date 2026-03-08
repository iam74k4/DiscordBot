import type { Client } from 'discord.js';
import * as admin from './admin/index.js';
import * as community from './community/index.js';
import * as general from './general/index.js';
import * as poll from './poll/index.js';
import * as steam from './steam/index.js';
import * as voice from './voice/index.js';

export interface FeatureModule {
  name: string;
  start(client: Client): void | Promise<void>;
  stop(): void | Promise<void>;
}

export const featureModules: FeatureModule[] = [
  admin,
  community,
  general,
  poll,
  steam,
  voice,
];
