import { SlashCommandBuilder } from 'discord.js';
import { Command } from '../../../types/index.js';
import { executeGitHubCommand } from '../application/index.js';

export const command: Command = {
  data: new SlashCommandBuilder()
    .setName('github')
    .setDescription('GitHub PR, Issue, and repository operations')
    .setDescriptionLocalizations({
      ja: 'GitHubのPR・Issue・リポジトリ操作',
    })
    .addSubcommandGroup((group) =>
      group
        .setName('pr')
        .setDescription('Pull request operations')
        .setDescriptionLocalizations({ ja: 'PR操作' })
        .addSubcommand((sub) =>
          sub
            .setName('list')
            .setDescription('List pull requests')
            .setDescriptionLocalizations({ ja: 'PR一覧を表示' })
            .addStringOption((o) =>
              o
                .setName('repo')
                .setDescription('Repository (owner/name)')
                .setDescriptionLocalizations({ ja: 'リポジトリ (owner/name)' })
                .setRequired(true)
            )
            .addStringOption((o) =>
              o
                .setName('state')
                .setDescription('Filter by state')
                .setDescriptionLocalizations({ ja: '状態でフィルタ' })
                .addChoices(
                  { name: 'Open', value: 'open' },
                  { name: 'Closed', value: 'closed' },
                  { name: 'All', value: 'all' }
                )
            )
        )
        .addSubcommand((sub) =>
          sub
            .setName('view')
            .setDescription('View a pull request')
            .setDescriptionLocalizations({ ja: 'PRの詳細を表示' })
            .addStringOption((o) =>
              o
                .setName('repo')
                .setDescription('Repository (owner/name)')
                .setDescriptionLocalizations({ ja: 'リポジトリ (owner/name)' })
                .setRequired(true)
            )
            .addIntegerOption((o) =>
              o
                .setName('number')
                .setDescription('PR number')
                .setDescriptionLocalizations({ ja: 'PR番号' })
                .setRequired(true)
            )
        )
        .addSubcommand((sub) =>
          sub
            .setName('create')
            .setDescription('Create a pull request')
            .setDescriptionLocalizations({ ja: 'PRを作成' })
            .addStringOption((o) =>
              o
                .setName('repo')
                .setDescription('Repository (owner/name)')
                .setDescriptionLocalizations({ ja: 'リポジトリ (owner/name)' })
                .setRequired(true)
            )
            .addStringOption((o) =>
              o
                .setName('title')
                .setDescription('PR title')
                .setDescriptionLocalizations({ ja: 'PRタイトル' })
                .setRequired(true)
                .setMaxLength(256)
            )
            .addStringOption((o) =>
              o
                .setName('body')
                .setDescription('PR description (summary only, add details on GitHub)')
                .setDescriptionLocalizations({ ja: 'PR説明（概要のみ、詳細はGitHubで追記）' })
                .setMaxLength(300)
            )
            .addStringOption((o) =>
              o
                .setName('head')
                .setDescription('Head branch (source)')
                .setDescriptionLocalizations({ ja: 'マージ元ブランチ' })
                .setRequired(true)
            )
            .addStringOption((o) =>
              o
                .setName('base')
                .setDescription('Base branch (target)')
                .setDescriptionLocalizations({ ja: 'マージ先ブランチ' })
            )
        )
        .addSubcommand((sub) =>
          sub
            .setName('merge')
            .setDescription('Merge a pull request')
            .setDescriptionLocalizations({ ja: 'PRをマージ' })
            .addStringOption((o) =>
              o
                .setName('repo')
                .setDescription('Repository (owner/name)')
                .setDescriptionLocalizations({ ja: 'リポジトリ (owner/name)' })
                .setRequired(true)
            )
            .addIntegerOption((o) =>
              o
                .setName('number')
                .setDescription('PR number')
                .setDescriptionLocalizations({ ja: 'PR番号' })
                .setRequired(true)
            )
            .addStringOption((o) =>
              o
                .setName('method')
                .setDescription('Merge method')
                .setDescriptionLocalizations({ ja: 'マージ方法' })
                .addChoices(
                  { name: 'Merge commit', value: 'merge' },
                  { name: 'Squash', value: 'squash' },
                  { name: 'Rebase', value: 'rebase' }
                )
            )
        )
    )
    .addSubcommandGroup((group) =>
      group
        .setName('issue')
        .setDescription('Issue operations')
        .setDescriptionLocalizations({ ja: 'Issue操作' })
        .addSubcommand((sub) =>
          sub
            .setName('list')
            .setDescription('List issues')
            .setDescriptionLocalizations({ ja: 'Issue一覧を表示' })
            .addStringOption((o) =>
              o
                .setName('repo')
                .setDescription('Repository (owner/name)')
                .setDescriptionLocalizations({ ja: 'リポジトリ (owner/name)' })
                .setRequired(true)
            )
            .addStringOption((o) =>
              o
                .setName('state')
                .setDescription('Filter by state')
                .setDescriptionLocalizations({ ja: '状態でフィルタ' })
                .addChoices(
                  { name: 'Open', value: 'open' },
                  { name: 'Closed', value: 'closed' },
                  { name: 'All', value: 'all' }
                )
            )
        )
        .addSubcommand((sub) =>
          sub
            .setName('view')
            .setDescription('View an issue')
            .setDescriptionLocalizations({ ja: 'Issueの詳細を表示' })
            .addStringOption((o) =>
              o
                .setName('repo')
                .setDescription('Repository (owner/name)')
                .setDescriptionLocalizations({ ja: 'リポジトリ (owner/name)' })
                .setRequired(true)
            )
            .addIntegerOption((o) =>
              o
                .setName('number')
                .setDescription('Issue number')
                .setDescriptionLocalizations({ ja: 'Issue番号' })
                .setRequired(true)
            )
        )
        .addSubcommand((sub) =>
          sub
            .setName('create')
            .setDescription('Create an issue')
            .setDescriptionLocalizations({ ja: 'Issueを作成' })
            .addStringOption((o) =>
              o
                .setName('repo')
                .setDescription('Repository (owner/name)')
                .setDescriptionLocalizations({ ja: 'リポジトリ (owner/name)' })
                .setRequired(true)
            )
            .addStringOption((o) =>
              o
                .setName('title')
                .setDescription('Issue title')
                .setDescriptionLocalizations({ ja: 'Issueタイトル' })
                .setRequired(true)
                .setMaxLength(256)
            )
            .addStringOption((o) =>
              o
                .setName('body')
                .setDescription('Issue description (summary only, add details on GitHub)')
                .setDescriptionLocalizations({ ja: 'Issue説明（概要のみ、詳細はGitHubで追記）' })
                .setMaxLength(300)
            )
        )
    )
    .addSubcommandGroup((group) =>
      group
        .setName('repo')
        .setDescription('Repository operations')
        .setDescriptionLocalizations({ ja: 'リポジトリ操作' })
        .addSubcommand((sub) =>
          sub
            .setName('info')
            .setDescription('Show repository info')
            .setDescriptionLocalizations({ ja: 'リポジトリ情報を表示' })
            .addStringOption((o) =>
              o
                .setName('repo')
                .setDescription('Repository (owner/name)')
                .setDescriptionLocalizations({ ja: 'リポジトリ (owner/name)' })
                .setRequired(true)
            )
        )
    ),

  middleware: ['cooldown'],

  options: {
    cooldown: 10000,
  },

  async execute(interaction) {
    await executeGitHubCommand(interaction);
  },
};

export default command;
