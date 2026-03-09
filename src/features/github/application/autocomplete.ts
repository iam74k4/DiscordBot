import { AutocompleteInteraction } from 'discord.js';
import { getGitHubClient } from '../services/githubClient.js';
import { getErrorMessage, logger } from '../../../utils/logger.js';

const recentRepos: string[] = [];
const MAX_RECENT = 10;

export function trackRepo(repo: string): void {
  const idx = recentRepos.indexOf(repo);
  if (idx !== -1) recentRepos.splice(idx, 1);
  recentRepos.unshift(repo);
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
    if (!query) {
      const choices = recentRepos.slice(0, 25).map((r) => ({
        name: r,
        value: r,
      }));
      await interaction.respond(choices);
      return;
    }

    const matching = recentRepos
      .filter((r) => r.toLowerCase().includes(query.toLowerCase()))
      .slice(0, 10);

    const octokit = getGitHubClient();
    let apiResults: string[] = [];

    if (octokit && query.length >= 2) {
      try {
        if (query.includes('/')) {
          const { data } = await octokit.rest.search.repos({
            q: query,
            per_page: 10,
          });
          apiResults = data.items.map((r) => r.full_name);
        } else {
          const { data } = await octokit.rest.search.repos({
            q: `${query} user:${query}`,
            per_page: 10,
          });
          apiResults = data.items.map((r) => r.full_name);
        }
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
