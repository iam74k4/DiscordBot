import { SlashCommandBuilder, SlashCommandStringOption } from 'discord.js';
import { Command } from '../../../types/index.js';
import { executeGitHubCommand } from '../application/index.js';
import { handleGitHubAutocomplete } from '../application/autocomplete.js';

const repoOption = (o: SlashCommandStringOption) =>
  o
    .setName('repo')
    .setDescription('Repository (owner/name)')
    .setDescriptionLocalizations({ ja: 'リポジトリ (owner/name)' })
    .setRequired(true)
    .setAutocomplete(true);

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
            .addStringOption(repoOption)
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
            .addStringOption(repoOption)
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
            .setDescription('Create a pull request (opens a form)')
            .setDescriptionLocalizations({
              ja: 'PRを作成（フォームが開きます）',
            })
            .addStringOption(repoOption)
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
                .setDescription('Base branch (target, default: main)')
                .setDescriptionLocalizations({
                  ja: 'マージ先ブランチ（デフォルト: main）',
                })
            )
        )
        .addSubcommand((sub) =>
          sub
            .setName('merge')
            .setDescription('Merge a pull request')
            .setDescriptionLocalizations({ ja: 'PRをマージ' })
            .addStringOption(repoOption)
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
            .addStringOption(repoOption)
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
            .addStringOption(repoOption)
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
            .setDescription('Create an issue (opens a form)')
            .setDescriptionLocalizations({
              ja: 'Issueを作成（フォームが開きます）',
            })
            .addStringOption(repoOption)
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
            .addStringOption(repoOption)
        )
    ),

  middleware: ['cooldown'],

  options: {
    cooldown: 10000,
  },

  async execute(interaction) {
    await executeGitHubCommand(interaction);
  },

  async autocomplete(interaction) {
    await handleGitHubAutocomplete(interaction);
  },
};

export default command;
