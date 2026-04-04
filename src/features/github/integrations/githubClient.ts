import { Octokit } from 'octokit';
import { env } from '../../../config/index.js';

let octokitInstance: Octokit | null = null;

/**
 * Get Octokit instance. Returns null if GITHUB_TOKEN is not configured.
 */
export function getGitHubClient(): Octokit | null {
  if (!env.GITHUB_TOKEN) return null;
  if (!octokitInstance) {
    octokitInstance = new Octokit({ auth: env.GITHUB_TOKEN });
  }
  return octokitInstance;
}

/**
 * Parse owner/name from repo string (e.g. "iam74k4/DiscordBot")
 */
export function parseRepo(
  repo: string
): { owner: string; repo: string } | null {
  const parts = repo.trim().split('/');
  if (parts.length !== 2 || !parts[0] || !parts[1]) return null;
  return { owner: parts[0], repo: parts[1] };
}
