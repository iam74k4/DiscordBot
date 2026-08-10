import {
  ChatInputCommandInteraction,
  InteractionReplyOptions,
  MessageComponentInteraction,
  MessageComponentType,
  MessageFlags,
} from 'discord.js';
import { getErrorMessage, logger } from './logger.js';
import { t, type Locale } from '../../locales/index.js';

/** How long a panel stays interactive before its components are disabled. */
const DEFAULT_PANEL_TIMEOUT = 120_000;

/** What a panel renders: the same shape a reply takes. */
export type PanelPayload = Required<
  Pick<InteractionReplyOptions, 'embeds' | 'components'>
>;

/**
 * What the panel should do after a component was handled.
 * - `update`: re-render from current state (the common case)
 * - `handled`: the callback already responded, leave the message alone
 */
export type PanelOutcome = 'update' | 'handled';

export interface ComponentPanelOptions {
  interaction: ChatInputCommandInteraction;
  locale: Locale;
  /** Used in log messages so failures name the panel that produced them. */
  label: string;
  /** Current view of the panel; called for the first reply and each update. */
  render: () => PanelPayload | Promise<PanelPayload>;
  /** Same components, disabled, for when the panel expires. */
  renderDisabled: () => PanelPayload['components'];
  onComponent: (
    interaction: MessageComponentInteraction
  ) => PanelOutcome | Promise<PanelOutcome>;
  timeout?: number;
  /** Panels are ephemeral unless a caller opts out (e.g. `/general help`). */
  ephemeral?: boolean;
  componentType?: MessageComponentType;
}

/**
 * Reply with an interactive panel and keep it in sync until it expires.
 *
 * Every panel in the bot needs the same scaffolding - reply, collect, ignore
 * other users, re-render, disable on timeout - and each one had grown its own
 * copy. Panels now describe their state (`render`) and their reaction to a
 * component (`onComponent`); this owns the lifecycle around them.
 */
export async function runComponentPanel(
  options: ComponentPanelOptions
): Promise<void> {
  const { interaction, locale, label, render, renderDisabled, onComponent } =
    options;
  const ephemeral = options.ephemeral ?? true;

  const initial = await render();
  const response = await interaction.reply({
    embeds: initial.embeds,
    components: initial.components,
    ...(ephemeral ? { flags: MessageFlags.Ephemeral } : {}),
    withResponse: true,
  });

  // Some transports (and test doubles) hand back no message to collect on;
  // there is nothing to keep in sync then.
  const message = response.resource?.message;
  if (typeof message?.createMessageComponentCollector !== 'function') {
    return;
  }

  const collector = message.createMessageComponentCollector({
    ...(options.componentType === undefined
      ? {}
      : { componentType: options.componentType }),
    time: options.timeout ?? DEFAULT_PANEL_TIMEOUT,
  });

  collector.on('collect', async (componentInteraction) => {
    if (componentInteraction.user.id !== interaction.user.id) {
      await componentInteraction
        .reply({
          content: t('help.onlyCommandUser', locale),
          flags: MessageFlags.Ephemeral,
        })
        .catch((error: unknown) => {
          logger.debug(
            `Failed to reject other user on ${label}: ${getErrorMessage(error)}`
          );
        });
      return;
    }

    try {
      if ((await onComponent(componentInteraction)) === 'handled') {
        return;
      }

      const next = await render();
      await componentInteraction.update({
        embeds: next.embeds,
        components: next.components,
      });
    } catch (error) {
      logger.warn(`Failed to update ${label}: ${getErrorMessage(error)}`);
      await componentInteraction.deferUpdate().catch(() => undefined);
    }
  });

  collector.on('end', async () => {
    await interaction
      .editReply({ components: renderDisabled() })
      .catch((error: unknown) => {
        logger.debug(
          `Failed to disable ${label} components: ${getErrorMessage(error)}`
        );
      });
  });
}
