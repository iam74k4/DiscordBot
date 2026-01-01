import { ChatInputCommandInteraction } from 'discord.js';
import { Command } from './command.js';

/**
 * Available middleware names
 */
export type MiddlewareName = 'permissions' | 'cooldown';

/**
 * Middleware result
 */
export interface MiddlewareResult {
  /** Whether the middleware passed */
  success: boolean;
  /** Error message if failed */
  message?: string;
}

/**
 * Middleware function type
 */
export type MiddlewareFunction = (
  interaction: ChatInputCommandInteraction,
  command: Command
) => Promise<MiddlewareResult>;

/**
 * Middleware registry type
 */
export type MiddlewareRegistry = Record<MiddlewareName, MiddlewareFunction>;
