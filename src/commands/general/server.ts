import {
  SlashCommandBuilder,
  ChatInputCommandInteraction,
  AttachmentBuilder,
  MessageFlags,
} from 'discord.js';
import { Command } from '../../types/index.js';
import { createEmbed, createErrorEmbed } from '../../utils/embed.js';
import { COLORS, TITLES } from '../../utils/constants.js';
import { createPieChart } from '../../utils/chart.js';
import { getSteamUsersByDiscordIds } from '../../services/database/index.js';
import { steamClient } from '../../services/steam/index.js';

/**
 * Handle /server stats command
 */
async function handleStats(
  interaction: ChatInputCommandInteraction
): Promise<void> {
  if (!interaction.guild) {
    const errorEmbed = createErrorEmbed(
      TITLES.ERROR,
      'This command can only be used in a server.'
    );
    await interaction.reply({
      embeds: [errorEmbed],
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  await interaction.deferReply();

  const guild = interaction.guild;
  await guild.members.fetch();

  // Member statistics
  const totalMembers = guild.memberCount;
  const bots = guild.members.cache.filter((m) => m.user.bot).size;
  const humans = totalMembers - bots;

  const online = guild.members.cache.filter(
    (m) =>
      !m.user.bot &&
      m.presence?.status !== undefined &&
      m.presence.status !== 'offline'
  ).size;
  const offline = humans - online;

  // Steam statistics
  const humanIds = guild.members.cache
    .filter((m) => !m.user.bot)
    .map((m) => m.id);
  const steamUsers = getSteamUsersByDiscordIds(humanIds);
  const steamRegistered = steamUsers.length;

  // Calculate total playtime for registered users
  let totalPlaytimeHours = 0;
  const topPlayers: { name: string; playtime: number }[] = [];

  for (const user of steamUsers.slice(0, 10)) {
    try {
      const playtime = await steamClient.getTotalPlaytime(user.steam_id);
      const hours = Math.floor(playtime / 60);
      totalPlaytimeHours += hours;
      topPlayers.push({
        name: user.steam_name || 'Unknown',
        playtime: hours,
      });
    } catch {
      continue;
    }
  }

  topPlayers.sort((a, b) => b.playtime - a.playtime);

  // Create member status pie chart
  const memberChartBuffer = await createPieChart(
    ['Online', 'Offline', 'Bots'],
    [online, offline, bots],
    'Member Status'
  );

  const memberAttachment = new AttachmentBuilder(memberChartBuffer, {
    name: 'members.png',
  });

  // Create description
  const description = [
    '**Members**',
    `Total: ${totalMembers.toLocaleString()}`,
    `Humans: ${humans.toLocaleString()} (Online: ${online.toLocaleString()})`,
    `Bots: ${bots.toLocaleString()}`,
    '',
    '**Steam Integration**',
    `Registered: ${steamRegistered.toLocaleString()} / ${humans.toLocaleString()} users`,
    `Combined Playtime: ${totalPlaytimeHours.toLocaleString()} hours`,
  ].join('\n');

  const fields = [];

  if (topPlayers.length > 0) {
    const topList = topPlayers
      .slice(0, 5)
      .map(
        (p, i) => `${i + 1}. **${p.name}** - ${p.playtime.toLocaleString()}h`
      )
      .join('\n');

    fields.push({
      name: 'Top Steam Players',
      value: topList,
      inline: false,
    });
  }

  const embed = createEmbed({
    title: `${guild.name} - ${TITLES.SERVER_STATS}`,
    description,
    color: COLORS.PRIMARY,
    fields,
    image: 'attachment://members.png',
    thumbnail: guild.iconURL() || undefined,
    timestamp: true,
  });

  await interaction.editReply({
    embeds: [embed],
    files: [memberAttachment],
  });
}

export const command: Command = {
  data: new SlashCommandBuilder()
    .setName('server')
    .setDescription('Server information commands')
    .addSubcommand((sub) =>
      sub.setName('stats').setDescription('View server statistics')
    ),

  middleware: ['cooldown'],

  options: {
    cooldown: 10000, // 10 seconds (heavier command)
  },

  async execute(interaction) {
    const subcommand = interaction.options.getSubcommand();

    switch (subcommand) {
      case 'stats':
        await handleStats(interaction);
        break;
    }
  },
};

export default command;

