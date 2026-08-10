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
                .setMaxLength(300)
            )
            .addStringOption((option) =>
              option
                .setName('option1')
                .setDescription('First option')
                .setDescriptionLocalizations({ ja: '選択肢1' })
                .setRequired(true)
                .setMaxLength(55)
            )
            .addStringOption((option) =>
              option
                .setName('option2')
                .setDescription('Second option')
                .setDescriptionLocalizations({ ja: '選択肢2' })
                .setRequired(true)
                .setMaxLength(55)
            )
            .addStringOption((option) =>
              option
                .setName('option3')
                .setDescription('Third option')
                .setDescriptionLocalizations({ ja: '選択肢3' })
                .setMaxLength(55)
            )
            .addStringOption((option) =>
              option
                .setName('option4')
                .setDescription('Fourth option')
                .setDescriptionLocalizations({ ja: '選択肢4' })
                .setMaxLength(55)
            )
            .addStringOption((option) =>
              option
                .setName('option5')
                .setDescription('Fifth option')
                .setDescriptionLocalizations({ ja: '選択肢5' })
                .setMaxLength(55)
            )
            .addStringOption((option) =>
              option
                .setName('option6')
                .setDescription('Sixth option')
                .setDescriptionLocalizations({ ja: '選択肢6' })
                .setMaxLength(55)
            )
            .addStringOption((option) =>
              option
                .setName('option7')
                .setDescription('Seventh option')
                .setDescriptionLocalizations({ ja: '選択肢7' })
                .setMaxLength(55)
            )
            .addStringOption((option) =>
              option
                .setName('option8')
                .setDescription('Eighth option')
                .setDescriptionLocalizations({ ja: '選択肢8' })
                .setMaxLength(55)
            )
            .addStringOption((option) =>
              option
                .setName('option9')
                .setDescription('Ninth option')
                .setDescriptionLocalizations({ ja: '選択肢9' })
                .setMaxLength(55)
            )
            .addStringOption((option) =>
              option
                .setName('option10')
                .setDescription('Tenth option')
                .setDescriptionLocalizations({ ja: '選択肢10' })
                .setMaxLength(55)
            )
            .addIntegerOption((option) =>
              option
                .setName('duration')
                .setDescription('How long the poll stays open (default: 24h)')
                .setDescriptionLocalizations({
                  ja: '投票を開けておく期間（既定: 24時間）',
                })
                .addChoices(
                  {
                    name: '1 hour',
                    name_localizations: { ja: '1時間' },
                    value: 1,
                  },
                  {
                    name: '4 hours',
                    name_localizations: { ja: '4時間' },
                    value: 4,
                  },
                  {
                    name: '8 hours',
                    name_localizations: { ja: '8時間' },
                    value: 8,
                  },
                  {
                    name: '24 hours',
                    name_localizations: { ja: '24時間' },
                    value: 24,
                  },
                  {
                    name: '3 days',
                    name_localizations: { ja: '3日' },
                    value: 72,
                  },
                  {
                    name: '7 days',
                    name_localizations: { ja: '7日' },
                    value: 168,
                  }
                )
            )
            .addBooleanOption((option) =>
              option
                .setName('multi')
                .setDescription('Let people pick more than one option')
                .setDescriptionLocalizations({
                  ja: '複数の選択肢に投票できるようにする',
                })
            )
        )
        .addSubcommand((subcommand) =>
          subcommand
            .setName('end')
            .setDescription('Close your poll early')
            .setDescriptionLocalizations({
              ja: '自分の投票を早めに締め切る',
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

  help: {
    category: { en: 'Community', ja: 'コミュニティ' },
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
