import {
  PermissionFlagsBits,
  type AutocompleteInteraction,
  type ChatInputCommandInteraction,
  type ModalSubmitInteraction,
} from 'discord.js';
import { env, isBotOwner } from '../../../config/index.js';
import { hasPermission } from '../../../shared/utils/discord.js';
import { parseRepo } from '../integrations/githubClient.js';

type GitHubInteraction =
  | AutocompleteInteraction
  | ChatInputCommandInteraction
  | ModalSubmitInteraction;

export function normalizeGitHubRepo(repo: string): string | null {
  const parsed = parseRepo(repo);
  if (!parsed) return null;
  return `${parsed.owner.toLowerCase()}/${parsed.repo.toLowerCase()}`;
}

export function getAllowedGitHubRepos(): readonly string[] {
  return env.GITHUB_ALLOWED_REPOS;
}

export function isGitHubRepoAllowed(repo: string): boolean {
  const normalized = normalizeGitHubRepo(repo);
  if (!normalized) return false;
  return env.GITHUB_ALLOWED_REPOS.includes(normalized);
}

export function canUseGitHubRepo(
  interaction: GitHubInteraction,
  repo?: string
): boolean {
  if (isBotOwner(interaction.user.id)) {
    return true;
  }

  if (!hasPermission(interaction.member, PermissionFlagsBits.ManageGuild)) {
    return false;
  }

  if (!repo) {
    return env.GITHUB_ALLOWED_REPOS.length > 0;
  }

  return isGitHubRepoAllowed(repo);
}

export function canSearchGitHubRepos(interaction: GitHubInteraction): boolean {
  return isBotOwner(interaction.user.id);
}

export function filterAllowedGitHubRepos(repos: readonly string[]): string[] {
  const allowed = new Set(env.GITHUB_ALLOWED_REPOS);
  return repos.filter((repo) => {
    const normalized = normalizeGitHubRepo(repo);
    return normalized ? allowed.has(normalized) : false;
  });
}
