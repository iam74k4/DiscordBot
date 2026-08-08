import { SlashCommandBuilder } from 'discord.js';
import { Command } from '../../../shared/types/index.js';
import {
  executePollCommand,
  executeRouletteCommand,
} from '../application/index.js';

export const command: Command = {
  data: new SlashCommandBuilder()
    .setName('community')
    .setDescription('Polls and VC roulette for quick community events')
    .setDescriptionLocalizations({
      ja: '投票とVCルーレットのコミュニティ機能',
    })
    .addSubcommandGroup((group) =>
      group
        .setName('poll')
        .setDescription('Create and manage polls')
        .setDescriptionLocalizations({
          ja: '投票の作成と管理',
        })
        .addSubcommand((subcommand) =>
          subcommand
            .setName('create')
            .setDescription('Create a new poll')
            .setDescriptionLocalizations({
              ja: '新しい投票を作成',
            })
            .addStringOption((option) =>
              option
                .setName('question')
                .setDescription('The poll question')
                .setDescriptionLocalizations({
                  ja: '投票の質問',
                })
                .setRequired(true)
                .setMaxLength(256)
            )
            .addStringOption((option) =>
              option
                .setName('option1')
                .setDescription('First option')
                .setDescriptionLocalizations({ ja: '選択肢1' })
                .setRequired(true)
                .setMaxLength(100)
            )
            .addStringOption((option) =>
              option
                .setName('option2')
                .setDescription('Second option')
                .setDescriptionLocalizations({ ja: '選択肢2' })
                .setRequired(true)
                .setMaxLength(100)
            )
            .addStringOption((option) =>
              option
                .setName('option3')
                .setDescription('Third option')
                .setDescriptionLocalizations({ ja: '選択肢3' })
                .setMaxLength(100)
            )
            .addStringOption((option) =>
              option
                .setName('option4')
                .setDescription('Fourth option')
                .setDescriptionLocalizations({ ja: '選択肢4' })
                .setMaxLength(100)
            )
            .addStringOption((option) =>
              option
                .setName('option5')
                .setDescription('Fifth option')
                .setDescriptionLocalizations({ ja: '選択肢5' })
                .setMaxLength(100)
            )
            .addStringOption((option) =>
              option
                .setName('option6')
                .setDescription('Sixth option')
                .setDescriptionLocalizations({ ja: '選択肢6' })
                .setMaxLength(100)
            )
            .addStringOption((option) =>
              option
                .setName('option7')
                .setDescription('Seventh option')
                .setDescriptionLocalizations({ ja: '選択肢7' })
                .setMaxLength(100)
            )
            .addStringOption((option) =>
              option
                .setName('option8')
                .setDescription('Eighth option')
                .setDescriptionLocalizations({ ja: '選択肢8' })
                .setMaxLength(100)
            )
            .addStringOption((option) =>
              option
                .setName('option9')
                .setDescription('Ninth option')
                .setDescriptionLocalizations({ ja: '選択肢9' })
                .setMaxLength(100)
            )
            .addStringOption((option) =>
              option
                .setName('option10')
                .setDescription('Tenth option')
                .setDescriptionLocalizations({ ja: '選択肢10' })
                .setMaxLength(100)
            )
            .addIntegerOption((option) =>
              option
                .setName('duration')
                .setDescription('Poll duration in minutes')
                .setDescriptionLocalizations({
                  ja: '投票の期間（分）',
                })
                .addChoices(
                  {
                    name: '5 minutes',
                    name_localizations: { ja: '5分' },
                    value: 5,
                  },
                  {
                    name: '10 minutes',
                    name_localizations: { ja: '10分' },
                    value: 10,
                  },
                  {
                    name: '30 minutes',
                    name_localizations: { ja: '30分' },
                    value: 30,
                  },
                  {
                    name: '1 hour',
                    name_localizations: { ja: '1時間' },
                    value: 60,
                  },
                  {
                    name: '3 hours',
                    name_localizations: { ja: '3時間' },
                    value: 180,
                  },
                  {
                    name: '24 hours',
                    name_localizations: { ja: '24時間' },
                    value: 1440,
                  }
                )
            )
            .addBooleanOption((option) =>
              option
                .setName('anonymous')
                .setDescription('Make the poll anonymous (default: false)')
                .setDescriptionLocalizations({
                  ja: '匿名投票にする（デフォルト: false）',
                })
            )
        )
        .addSubcommand((subcommand) =>
          subcommand
            .setName('end')
            .setDescription('End your active poll')
            .setDescriptionLocalizations({
              ja: '有効な投票を終了',
            })
        )
    )
    .addSubcommandGroup((group) =>
      group
        .setName('roulette')
        .setDescription('Pick members or split teams from your current VC')
        .setDescriptionLocalizations({
          ja: '現在のVCからメンバー抽選やチーム分け',
        })
        .addSubcommand((subcommand) =>
          subcommand
            .setName('member')
            .setDescription('Randomly select one member from voice channel')
            .setDescriptionLocalizations({
              ja: 'ボイスチャンネルからランダムに1人選択',
            })
        )
        .addSubcommand((subcommand) =>
          subcommand
            .setName('team')
            .setDescription('Divide voice channel members into teams')
            .setDescriptionLocalizations({
              ja: 'ボイスチャンネルのメンバーをチーム分け',
            })
            .addIntegerOption((option) =>
              option
                .setName('count')
                .setDescription('Number of teams')
                .setDescriptionLocalizations({
                  ja: '作成するチーム数',
                })
                .setRequired(true)
                .addChoices(
                  {
                    name: '2 teams',
                    name_localizations: { ja: '2チーム' },
                    value: 2,
                  },
                  {
                    name: '3 teams',
                    name_localizations: { ja: '3チーム' },
                    value: 3,
                  },
                  {
                    name: '4 teams',
                    name_localizations: { ja: '4チーム' },
                    value: 4,
                  },
                  {
                    name: '5 teams',
                    name_localizations: { ja: '5チーム' },
                    value: 5,
                  },
                  {
                    name: '6 teams',
                    name_localizations: { ja: '6チーム' },
                    value: 6,
                  }
                )
            )
        )
    ),

  middleware: ['cooldown'],

  options: {
    cooldown: 10000, // 10 seconds cooldown (animation takes time)
  },

  async execute(interaction) {
    const group = interaction.options.getSubcommandGroup(true);
    if (group === 'poll') {
      await executePollCommand(interaction);
      return;
    }
    await executeRouletteCommand(interaction);
  },
};

export default command;
