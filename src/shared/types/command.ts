import {
  ChatInputCommandInteraction,
  AutocompleteInteraction,
  SlashCommandBuilder,
  SlashCommandSubcommandsOnlyBuilder,
  SlashCommandOptionsOnlyBuilder,
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
 * Autocomplete handler function type
 */
export type AutocompleteHandler = (
  interaction: AutocompleteInteraction
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
 * Slash command data type
 */
export type SlashCommandData =
  | SlashCommandBuilder
  | SlashCommandSubcommandsOnlyBuilder
  | SlashCommandOptionsOnlyBuilder
  | Omit<SlashCommandBuilder, 'addSubcommand' | 'addSubcommandGroup'>;

/**
 * Command structure
 */
export interface Command {
  /** Slash command builder data */
  data: SlashCommandData;
  /** Middleware to run before execution */
  middleware?: MiddlewareName[];
  /** Options for middleware */
  options?: CommandOptions;
  /** Command execution function */
  execute: CommandExecute;
  /** Autocomplete handler (optional) */
  autocomplete?: AutocompleteHandler;
}
