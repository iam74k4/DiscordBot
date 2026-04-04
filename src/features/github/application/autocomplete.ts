import { AutocompleteInteraction } from 'discord.js';
import { getGitHubClient } from '../integrations/githubClient.js';
import { getErrorMessage, logger } from '../../../shared/utils/logger.js';
import {
  canSearchGitHubRepos,
  canUseGitHubRepo,
  filterAllowedGitHubRepos,
  getAllowedGitHubRepos,
  normalizeGitHubRepo,
} from './access.js';

const recentRepos: string[] = [];
const MAX_RECENT = 10;

export function buildGitHubAutocompleteChoices(
  query: string,
  recent: readonly string[],
  allowlist: readonly string[],
  canSearchAllRepos: boolean
): string[] {
  const recentMatches = recent.filter((repo) =>
    repo.toLowerCase().includes(query.toLowerCase())
  );

  if (canSearchAllRepos) {
    return recentMatches.slice(0, 10);
  }

  const allowedRecentMatches = filterAllowedGitHubRepos(recentMatches);
  const allowedMatches = allowlist.filter((repo) =>
    repo.toLowerCase().includes(query.toLowerCase())
  );

  return [...new Set([...allowedRecentMatches, ...allowedMatches])].slice(
    0,
    25
  );
}

export function trackRepo(repo: string): void {
  const normalized = normalizeGitHubRepo(repo);
  if (!normalized) return;
  const idx = recentRepos.indexOf(normalized);
  if (idx !== -1) recentRepos.splice(idx, 1);
  recentRepos.unshift(normalized);
  if (recentRepos.length > MAX_RECENT) recentRepos.pop();
}

export async function handleGitHubAutocomplete(
  interaction: AutocompleteInteraction
): Promise<void> {
  const focused = interaction.options.getFocused(true);
  if (focused.name !== 'repo') {
    await interaction.respond([]);
    return;
  }

  const query = focused.value.trim();

  try {
    if (!canUseGitHubRepo(interaction)) {
      await interaction.respond([]);
      return;
    }

    const allowlist = filterAllowedGitHubRepos(getAllowedGitHubRepos());
    const canSearchAllRepos = canSearchGitHubRepos(interaction);

    if (!canSearchAllRepos) {
      const combined = buildGitHubAutocompleteChoices(
        query,
        recentRepos,
        allowlist,
        false
      );
      await interaction.respond(
        combined.map((repo) => ({ name: repo, value: repo }))
      );
      return;
    }

    if (!query) {
      const choices = recentRepos.slice(0, 25).map((r) => ({
        name: r,
        value: r,
      }));
      await interaction.respond(choices);
      return;
    }

    const matching = buildGitHubAutocompleteChoices(
      query,
      recentRepos,
      allowlist,
      true
    );

    const octokit = getGitHubClient();
    let apiResults: string[] = [];

    if (octokit && query.length >= 2) {
      try {
        const { data } = await octokit.rest.search.repos({
          q: query,
          per_page: 10,
        });
        apiResults = data.items.map((r) => r.full_name);
      } catch {
        // API search failed; rely on recent repos only
      }
    }

    const combined = [...new Set([...matching, ...apiResults])].slice(0, 25);
    await interaction.respond(combined.map((r) => ({ name: r, value: r })));
  } catch (error) {
    logger.debug(`GitHub autocomplete error: ${getErrorMessage(error)}`);
    await interaction.respond([]).catch(() => {});
  }
}
