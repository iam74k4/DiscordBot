import {
  AttachmentBuilder,
  ChannelType,
  ChatInputCommandInteraction,
  GuildMember,
  MessageFlags,
  PermissionFlagsBits,
} from 'discord.js';
import { createEmbed, createErrorEmbed } from '../../../shared/utils/embed.js';
import { COLORS } from '../../../shared/utils/constants/index.js';
import { getErrorMessage, logger } from '../../../shared/utils/logger.js';
import { t, mapDiscordLocale } from '../../../locales/index.js';
import { env, RETRY } from '../../../config/index.js';
import { connectionManager } from '../recording/connectionManager.js';
import {
  parseDurationString,
  recordAudio,
  RecordingNoAudibleAudioError,
} from '../recording/recordingService.js';

export async function executeRecordCommand(
  interaction: ChatInputCommandInteraction
): Promise<void> {
  const locale = mapDiscordLocale(interaction.locale);
  const durationStr = interaction.options.getString('duration', true);

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

  await interaction.deferReply({ flags: MessageFlags.Ephemeral });

  const connection = connectionManager.getConnection(voiceChannel.id);
  if (!connection) {
    await interaction.editReply({
      embeds: [
        createErrorEmbed(
          t('record.errors.botNotInVoice', locale),
          t('record.errors.botNotInVoiceDesc', locale)
        ),
      ],
    });
    return;
  }

  const channel = interaction.channel;
  const botMember = interaction.guild.members.me;
  if (!botMember) {
    await interaction.editReply({
      embeds: [
        createErrorEmbed(
          t('record.errors.botNotInVoice', locale),
          t('record.errors.botNotInVoiceDesc', locale)
        ),
      ],
    });
    return;
  }
  if (channel && 'permissionsFor' in channel) {
    const permissions = channel.permissionsFor(botMember);
    if (
      !permissions ||
      !permissions.has(PermissionFlagsBits.AttachFiles) ||
      !permissions.has(PermissionFlagsBits.ViewChannel)
    ) {
      await interaction.editReply({
        embeds: [
          createErrorEmbed(
            t('record.errors.noPermission', locale),
            t('record.errors.noPermissionDesc', locale)
          ),
        ],
      });
      return;
    }
  }

  let duration: number;
  try {
    duration = parseDurationString(durationStr);
  } catch {
    await interaction.editReply({
      embeds: [
        createErrorEmbed(
          t('record.errors.invalidDuration', locale),
          t('record.errors.invalidDurationDesc', locale)
        ),
      ],
    });
    return;
  }

  if (duration > env.MAX_RECORDING_DURATION) {
    await interaction.editReply({
      embeds: [
        createErrorEmbed(
          t('record.errors.durationTooLong', locale),
          t('record.errors.durationTooLongDesc', locale, {
            max: env.MAX_RECORDING_DURATION,
          })
        ),
      ],
    });
    return;
  }

  if (duration > env.AUDIO_BUFFER_DURATION) {
    await interaction.editReply({
      embeds: [
        createErrorEmbed(
          t('record.errors.durationExceedsBuffer', locale),
          t('record.errors.durationExceedsBufferDesc', locale, {
            buffer: env.AUDIO_BUFFER_DURATION,
          })
        ),
      ],
    });
    return;
  }

  await interaction.editReply({
    embeds: [
      createEmbed({
        title: t('record.recording', locale),
        description:
          t('record.recordingDesc', locale, {
            duration: durationStr,
          }) + `\n\n${t('record.durationNote', locale)}`,
        color: COLORS.WARNING,
      }),
    ],
  });

  try {
    const result = await recordAudio({
      duration,
      channelId: voiceChannel.id,
      userId: interaction.user.id,
      guildId: interaction.guild.id,
    });

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
    const maxRetries = RETRY.RECORDING_RETRY_MAX;

    let retryCount = 0;
    let success = false;

    while (retryCount <= maxRetries && !success) {
      try {
        await interaction.followUp({
          embeds: [
            createEmbed({
              title: t('record.success', locale),
              description:
                t('record.successDesc', locale, {
                  duration: durationStr,
                }) + `\n\n${t('record.successNextStep', locale)}`,
              color: COLORS.SUCCESS,
              footer: result.isSplit
                ? `File size: ${(result.fileSize / (1024 * 1024)).toFixed(2)}MB (split into ${totalFiles} files)`
                : `File size: ${(result.fileSize / (1024 * 1024)).toFixed(2)}MB`,
              timestamp: true,
            }),
          ],
          files: [mainFile],
          flags: MessageFlags.Ephemeral,
        });
        success = true;
      } catch (error) {
        retryCount++;
        if (retryCount > maxRetries) {
          throw error;
        }

        const delay = Math.min(1000 * Math.pow(2, retryCount - 1), 10000);
        logger.warn(
          `Failed to send recording file (attempt ${retryCount}/${maxRetries}), retrying in ${delay}ms...`
        );
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }

    const failedParts: number[] = [];

    for (let i = 0; i < additionalFiles.length; i++) {
      retryCount = 0;
      success = false;
      const partNumber = i + 2;

      while (retryCount <= maxRetries && !success) {
        try {
          await interaction.followUp({
            content: `Part ${partNumber}/${totalFiles}`,
            files: [additionalFiles[i]],
            flags: MessageFlags.Ephemeral,
          });
          success = true;
        } catch {
          retryCount++;
          if (retryCount > maxRetries) {
            logger.error(
              `Failed to send split file part ${partNumber} after ${maxRetries} attempts`
            );
            failedParts.push(partNumber);
            break;
          }

          const delay = Math.min(1000 * Math.pow(2, retryCount - 1), 10000);
          await new Promise((resolve) => setTimeout(resolve, delay));
        }
      }
    }

    if (failedParts.length > 0) {
      const partsLabel = failedParts.join(', ');
      logger.error(
        `Recording delivery incomplete for channel ${voiceChannel.id}: failed parts ${partsLabel}`
      );
      await interaction.followUp({
        embeds: [
          createErrorEmbed(
            t('record.errors.deliveryIncomplete', locale),
            t('record.errors.deliveryIncompleteDesc', locale, {
              parts: partsLabel,
              total: totalFiles,
            })
          ),
        ],
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    logger.info(
      `Recording completed: ${duration}s from channel ${voiceChannel.name} (${voiceChannel.id}) by ${interaction.user.tag}`
    );
  } catch (error) {
    if (error instanceof RecordingNoAudibleAudioError) {
      logger.warn(
        `Recording had no audible audio for channel ${voiceChannel.id}`
      );
      await interaction.editReply({
        embeds: [
          createErrorEmbed(
            t('record.errors.noAudibleAudio', locale),
            t('record.errors.noAudibleAudioDesc', locale)
          ),
        ],
      });
      return;
    }

    const rawMessage = getErrorMessage(error);
    logger.error(
      `Recording failed for channel ${voiceChannel.id}:`,
      rawMessage
    );

    const safeMessage = rawMessage
      .replace(/\/[\w/.=-]+/g, '[path]')
      .replace(/\\[\w\\.=-]+/g, '[path]');

    await interaction.editReply({
      embeds: [
        createErrorEmbed(
          t('record.errors.failed', locale),
          t('record.errors.failedDesc', locale, {
            error: safeMessage,
          })
        ),
      ],
    });
  }
}
