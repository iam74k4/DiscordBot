import { ChatInputCommandInteraction } from 'discord.js';
import { executeHelpCommand } from './help.js';
import { executePingCommand } from './ping.js';
import { createEmbed } from '../../../shared/utils/embed.js';
import { COLORS } from '../../../shared/utils/constants/index.js';
import { env } from '../../../config/index.js';
import { mapDiscordLocale } from '../../../locales/index.js';
import type { ExtendedClient } from '../../../client.js';

export async function executeGeneralCommand(
  interaction: ChatInputCommandInteraction
): Promise<void> {
  const subcommand = interaction.options.getSubcommand();

  switch (subcommand) {
    case 'help':
      await executeHelpCommand(interaction);
      break;
    case 'ping':
      await executePingCommand(interaction);
      break;
    case 'about': {
      const locale = mapDiscordLocale(interaction.locale);
      const embed = createEmbed({
        title: locale === 'ja' ? 'Botについて' : 'About this bot',
        description:
          locale === 'ja'
            ? 'このBotは feature ベースのアーキテクチャで動作しています。'
            : 'This bot runs on a feature-based architecture.',
        color: COLORS.INFO,
        fields: [
          {
            name: locale === 'ja' ? '環境' : 'Environment',
            value: env.NODE_ENV,
            inline: true,
          },
          {
            name: locale === 'ja' ? 'コマンド数' : 'Commands',
            value: String((interaction.client as ExtendedClient).commands.size),
            inline: true,
          },
        ],
      });
      await interaction.reply({ embeds: [embed] });
      break;
    }
  }
}
