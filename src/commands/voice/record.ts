import {
  SlashCommandBuilder,
  GuildMember,
  MessageFlags,
  ChannelType,
  PermissionFlagsBits,
  AttachmentBuilder,
} from 'discord.js';
import { Command } from '../../types/index.js';
import { createEmbed, createErrorEmbed } from '../../utils/embed.js';
import { COLORS } from '../../utils/constants/index.js';
import { logger } from '../../utils/logger.js';
import { t, mapDiscordLocale } from '../../locales/index.js';
import { env } from '../../config/index.js';
import { connectionManager } from '../../services/voice/connectionManager.js';
import {
  recordAudio,
  parseDurationString,
} from '../../services/voice/recordingService.js';

/**
 * Record command - record past audio from voice channel
 */
export const command: Command = {
  data: new SlashCommandBuilder()
    .setName('record')
    .setDescription('Record past audio from voice channel')
    .setDescriptionLocalizations({
      ja: 'ボイスチャンネルの過去音声を録音',
    })
    .addStringOption((option) =>
      option
        .setName('duration')
        .setDescription('Recording duration')
        .setDescriptionLocalizations({
          ja: '録音時間',
        })
        .setRequired(true)
        .addChoices(
          { name: '30 seconds', value: '30s' },
          { name: '1 minute', value: '1m' },
          { name: '2 minutes', value: '2m' },
          { name: '3 minutes', value: '3m' },
          { name: '5 minutes (max)', value: '5m' }
        )
    ),

  middleware: ['cooldown'],

  options: {
    cooldown: 10000, // 10 seconds cooldown
  },

  async execute(interaction) {
    const locale = mapDiscordLocale(interaction.locale);
    const durationStr = interaction.options.getString('duration', true);

    // Check if command is used in a guild
    if (!interaction.guild || !interaction.member) {
      await interaction.reply({
        embeds: [
          createErrorEmbed(
            t('common.error', locale),
            t('common.guildOnly', locale)
          ),
        ],
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    // Check if user is in a voice channel
    const member = interaction.member as GuildMember;
    const voiceChannel = member.voice.channel;

    if (
      !voiceChannel ||
      (voiceChannel.type !== ChannelType.GuildVoice &&
        voiceChannel.type !== ChannelType.GuildStageVoice)
    ) {
      await interaction.reply({
        embeds: [
          createErrorEmbed(
            t('record.errors.notInVoice', locale),
            t('record.errors.notInVoiceDesc', locale)
          ),
        ],
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    // Check if bot is in the same voice channel
    const connection = connectionManager.getConnection(voiceChannel.id);
    if (!connection) {
      await interaction.reply({
        embeds: [
          createErrorEmbed(
            t('record.errors.botNotInVoice', locale),
            t('record.errors.botNotInVoiceDesc', locale)
          ),
        ],
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    // Check permissions
    const channel = interaction.channel;
    if (channel && 'permissionsFor' in channel) {
      const permissions = channel.permissionsFor(interaction.guild.members.me!);
      if (
        !permissions ||
        !permissions.has(PermissionFlagsBits.AttachFiles) ||
        !permissions.has(PermissionFlagsBits.ViewChannel)
      ) {
        await interaction.reply({
          embeds: [
            createErrorEmbed(
              t('record.errors.noPermission', locale),
              t('record.errors.noPermissionDesc', locale)
            ),
          ],
          flags: MessageFlags.Ephemeral,
        });
        return;
      }
    }

    // Parse duration
    let duration: number;
    try {
      duration = parseDurationString(durationStr);
    } catch {
      await interaction.reply({
        embeds: [
          createErrorEmbed(
            t('record.errors.invalidDuration', locale),
            t('record.errors.invalidDurationDesc', locale)
          ),
        ],
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    // Validate duration
    if (duration > env.MAX_RECORDING_DURATION) {
      await interaction.reply({
        embeds: [
          createErrorEmbed(
            t('record.errors.durationTooLong', locale),
            t('record.errors.durationTooLongDesc', locale, {
              max: env.MAX_RECORDING_DURATION,
            })
          ),
        ],
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    if (duration > env.AUDIO_BUFFER_DURATION) {
      await interaction.reply({
        embeds: [
          createErrorEmbed(
            t('record.errors.durationExceedsBuffer', locale),
            t('record.errors.durationExceedsBufferDesc', locale, {
              buffer: env.AUDIO_BUFFER_DURATION,
            })
          ),
        ],
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    // Defer reply
    await interaction.deferReply();

    // Send recording notification
    await interaction.editReply({
      embeds: [
        createEmbed({
          title: t('record.recording', locale),
          description: t('record.recordingDesc', locale, {
            duration: durationStr,
          }),
          color: COLORS.WARNING,
        }),
      ],
    });

    try {
      // Record audio
      const result = await recordAudio({
        duration,
        channelId: voiceChannel.id,
        userId: interaction.user.id,
        guildId: interaction.guild.id,
      });

      // Build file attachments
      const mainFile = new AttachmentBuilder(result.filePath, {
        name: result.filePath.split(/[/\\]/).pop() || 'recording.wav',
      });

      const additionalFiles: AttachmentBuilder[] = [];
      if (result.isSplit && result.additionalFiles) {
        for (const filePath of result.additionalFiles) {
          additionalFiles.push(
            new AttachmentBuilder(filePath, {
              name: filePath.split(/[/\\]/).pop() || 'recording_part.wav',
            })
          );
        }
      }

      const totalFiles = 1 + additionalFiles.length;
      const maxRetries = env.RECORDING_RETRY_MAX;

      // Send main file with retry logic
      let retryCount = 0;
      let success = false;

      while (retryCount <= maxRetries && !success) {
        try {
          await interaction.editReply({
            embeds: [
              createEmbed({
                title: t('record.success', locale),
                description: t('record.successDesc', locale, {
                  duration: durationStr,
                }),
                color: COLORS.SUCCESS,
                footer: result.isSplit
                  ? `File size: ${(result.fileSize / (1024 * 1024)).toFixed(2)}MB (split into ${totalFiles} files)`
                  : `File size: ${(result.fileSize / (1024 * 1024)).toFixed(2)}MB`,
                timestamp: true,
              }),
            ],
            files: [mainFile],
          });
          success = true;
        } catch (error) {
          retryCount++;
          if (retryCount > maxRetries) {
            throw error;
          }

          // Exponential backoff
          const delay = Math.min(1000 * Math.pow(2, retryCount - 1), 10000);
          logger.warn(
            `Failed to send recording file (attempt ${retryCount}/${maxRetries}), retrying in ${delay}ms...`
          );
          await new Promise((resolve) => setTimeout(resolve, delay));
        }
      }

      // Send additional files sequentially if split
      for (let i = 0; i < additionalFiles.length; i++) {
        retryCount = 0;
        success = false;

        while (retryCount <= maxRetries && !success) {
          try {
            await interaction.followUp({
              content: `Part ${i + 2}/${totalFiles}`,
              files: [additionalFiles[i]],
            });
            success = true;
          } catch {
            retryCount++;
            if (retryCount > maxRetries) {
              logger.error(
                `Failed to send split file part ${i + 2} after ${maxRetries} attempts`
              );
              break;
            }

            const delay = Math.min(1000 * Math.pow(2, retryCount - 1), 10000);
            await new Promise((resolve) => setTimeout(resolve, delay));
          }
        }
      }

      logger.info(
        `Recording completed: ${duration}s from channel ${voiceChannel.name} (${voiceChannel.id}) by ${interaction.user.tag}`
      );
    } catch (error) {
      logger.error(
        `Recording failed for channel ${voiceChannel.id}:`,
        error instanceof Error ? error.message : error
      );

      await interaction.editReply({
        embeds: [
          createErrorEmbed(
            t('record.errors.failed', locale),
            t('record.errors.failedDesc', locale, {
              error: error instanceof Error ? error.message : String(error),
            })
          ),
        ],
      });
    }
  },
};

export default command;
