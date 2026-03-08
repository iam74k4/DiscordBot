import { SlashCommandBuilder } from 'discord.js';
import { Command } from '../../../types/index.js';
import { executePollCommand } from '../application/index.js';

/**
 * Poll command - create and manage polls
 */
export const command: Command = {
  data: new SlashCommandBuilder()
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
              { name: '5 minutes', value: 5 },
              { name: '10 minutes', value: 10 },
              { name: '30 minutes', value: 30 },
              { name: '1 hour', value: 60 },
              { name: '3 hours', value: 180 },
              { name: '24 hours', value: 1440 }
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
    ),

  middleware: ['cooldown'],

  options: {
    cooldown: 5000,
  },

  async execute(interaction) {
    await executePollCommand(interaction);
  },
};

export default command;
