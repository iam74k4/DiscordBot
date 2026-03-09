import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ChatInputCommandInteraction,
  ComponentType,
  MessageFlags,
} from 'discord.js';
import { createWarningEmbed } from './embed.js';
import { t, mapDiscordLocale } from '../locales/index.js';

const DEFAULT_TIMEOUT = 30_000;

interface ConfirmationOptions {
  timeout?: number;
  ephemeral?: boolean;
}

/**
 * Show a confirmation dialog with Confirm (Danger) and Cancel buttons.
 * Returns true if the user confirmed, false if cancelled or timed out.
 * The interaction must not have been replied to or deferred yet.
 */
export async function awaitConfirmation(
  interaction: ChatInputCommandInteraction,
  message: string,
  options?: ConfirmationOptions
): Promise<boolean> {
  const locale = mapDiscordLocale(interaction.locale);
  const timeout = options?.timeout ?? DEFAULT_TIMEOUT;
  const ephemeral = options?.ephemeral ?? true;

  const confirmId = `confirm_${interaction.id}`;
  const cancelId = `cancel_${interaction.id}`;

  const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setCustomId(confirmId)
      .setLabel(t('common.confirm', locale))
      .setStyle(ButtonStyle.Danger),
    new ButtonBuilder()
      .setCustomId(cancelId)
      .setLabel(t('common.cancel', locale))
      .setStyle(ButtonStyle.Secondary)
  );

  const embed = createWarningEmbed(t('common.confirmMessage', locale), message);

  const reply = await interaction.reply({
    embeds: [embed],
    components: [row],
    flags: ephemeral ? MessageFlags.Ephemeral : undefined,
    fetchReply: true,
  });

  try {
    const result = await reply.awaitMessageComponent({
      componentType: ComponentType.Button,
      filter: (i) => i.user.id === interaction.user.id,
      time: timeout,
    });

    const disabledRow = new ActionRowBuilder<ButtonBuilder>().addComponents(
      row.components.map((btn) =>
        ButtonBuilder.from(btn.toJSON()).setDisabled(true)
      )
    );

    await result.update({ components: [disabledRow] });

    return result.customId === confirmId;
  } catch {
    const disabledRow = new ActionRowBuilder<ButtonBuilder>().addComponents(
      row.components.map((btn) =>
        ButtonBuilder.from(btn.toJSON()).setDisabled(true)
      )
    );

    await interaction.editReply({ components: [disabledRow] }).catch(() => {});

    return false;
  }
}
