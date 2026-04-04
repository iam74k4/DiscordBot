import {
  registerHelpCategory,
  type CommandCategory,
} from '../../shared/help/catalog.js';

export const githubHelpCategory: CommandCategory = {
  name: { en: 'GitHub', ja: 'GitHub' },
  commands: [
    {
      name: 'github',
      description: {
        en: 'GitHub PR, Issue, and repository operations',
        ja: 'GitHubのPR・Issue・リポジトリ操作',
      },
      usage:
        '/github pr list, /github pr view, /github pr create, /github pr merge, /github issue list, /github issue view, /github issue create, /github repo info',
      requiredPermission: ['manageGuild', 'owner'],
    },
  ],
};

registerHelpCategory(githubHelpCategory);
