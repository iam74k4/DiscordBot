import {
  ChatInputCommandInteraction,
  SlashCommandBuilder,
  SlashCommandSubcommandsOnlyBuilder,
  PermissionResolvable,
} from 'discord.js';
import { MiddlewareName } from './middleware.js';

/**
 * Command execution function type
 */
export type CommandExecute = (
  interaction: ChatInputCommandInteraction
) => Promise<void>;

/**
 * Command options for middleware configuration
 */
export interface CommandOptions {
  /** Required permissions to execute the command */
  permissions?: PermissionResolvable[];
  /** Cooldown in milliseconds */
  cooldown?: number;
}

/**
 * Command structure
 */
export interface Command {
  /** Slash command builder data */
  data:
    | SlashCommandBuilder
    | SlashCommandSubcommandsOnlyBuilder
    | Omit<SlashCommandBuilder, 'addSubcommand' | 'addSubcommandGroup'>;
  /** Middleware to run before execution */
  middleware?: MiddlewareName[];
  /** Options for middleware */
  options?: CommandOptions;
  /** Command execution function */
  execute: CommandExecute;
}
